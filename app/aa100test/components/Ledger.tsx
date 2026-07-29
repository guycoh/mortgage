"use client";

// The editing surface: ONE continuous financial table.
//
// Mortgages and consumer loans used to live in two separate tables with two
// saturated headers. They are the same kind of object with the same columns, so
// they now share one grid and one interaction model. What tells them apart is
// a 3px coloured spine on the row's start edge, a worded chip (משכנתא /
// הלוואה), an icon and a faint tint — never colour on its own. A slim divider
// row keeps the two families scannable without breaking the table in half.
//
// Every field the old grid had is still here. The four rarely-touched ones
// (עוגן, מרווח, גרייס, חודשי גרייס) open in a sheet off the row's settings icon,
// so reaching them never reflows the grid.
//
// תדירות שינוי is on the grid rather than in that sheet: both document types now
// fill it on import, and how often a rate resets belongs next to the rate it
// resets — it is the difference between a 3% tranche that stays 3% and one that
// reprices next spring.

import { Fragment, useMemo, useState } from "react";
import {
  Bank,
  HandCoins,
  Plus,
  Sliders,
  Table as TableIcon,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { schedules } from "@/app/data/amortization_schedules";
import type { LoanPath } from "@/app/data/hooks/useLoanPaths";
import { calculateLoan } from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import Select from "./Select";
import DateField from "./DateField";
import Money from "./Money";
import RowSettings from "./RowSettings";
import {
  FAMILY,
  PATH_SHORT,
  TRACK_HEX,
  rateHeat,
  type DebtGroup,
  type ImportedLoan,
} from "../lib/credit";
import { addMonths, monthsBetween, parseDate, startOfToday, toIso } from "../lib/dates";
import { FREQ_FIXED, FREQ_UNSTATED, freqMonths, freqOptionsFor } from "@/lib/rate-frequency";

const ORDER: DebtGroup[] = ["mortgage", "loan"];

const FAM_ICON = {
  mortgage: <Bank size={12} weight="fill" className="fin-fam-ico" />,
  loan: <HandCoins size={12} weight="fill" className="fin-fam-ico" />,
} as const;

/** Fields whose change we mark with the corner tick. */
const TRACKED = [
  "amount",
  "rate",
  "months",
  "path_id",
  "amortization_schedule_id",
  "loan_end_date",
  "grace_type_id",
  "grace_months",
  "anchor",
  "anchor_margin",
  "change_frequency",
  "source_anchor",
] as const;

type Baseline = Record<string, ImportedLoan>;

export default function Ledger({
  loans,
  paths,
  annualInflation,
  baseline,
  onChange,
  onSchedule,
}: {
  loans: ImportedLoan[];
  paths: LoanPath[];
  annualInflation: number;
  /** Row values as of the last load / import / save — drives the change marks. */
  baseline: Baseline;
  onChange: (loans: ImportedLoan[]) => void;
  onSchedule: (loan: ImportedLoan) => void;
}) {
  const [armed, setArmed] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ id: string; rect: DOMRect } | null>(null);
  const today = startOfToday();

  const patch = (id: string, next: Partial<ImportedLoan>) =>
    onChange(loans.map((l) => (l.id === id ? { ...l, ...next } : l)));

  const remove = (id: string) => {
    onChange(loans.filter((l) => l.id !== id));
    setArmed(null);
  };

  const add = (group: DebtGroup) =>
    onChange([
      ...loans,
      {
        id: crypto.randomUUID(),
        mix_id: loans[0]?.mix_id ?? "",
        path_id: paths[0]?.id ?? 1,
        amount: 0,
        rate: 0,
        months: 0,
        amortization_schedule_id: schedules[0]?.id ?? 1,
        grace_type_id: 1,
        grace_months: 0,
        loan_end_date: null,
        end_date: null,
        group,
      },
    ]);

  /* --- תאריך סיום and חודשים describe one fact, so they move together --- */
  const setTerm = (id: string, months: number) => {
    const m = Math.max(0, Math.round(months) || 0);
    const iso = m > 0 ? toIso(addMonths(today, m)) : null;
    patch(id, { months: m, loan_end_date: iso, end_date: iso });
  };
  const setEnd = (id: string, iso: string | null) => {
    const d = iso ? parseDate(iso) : null;
    patch(id, { loan_end_date: iso, end_date: iso, months: d ? monthsBetween(today, d) : 0 });
  };

  /* --- תדירות שינוי is words, anchor_interval is the same fact as a number --- */
  // Two columns describing one thing, so they are written together — a board
  // where the label says five years and the interval still says twelve months is
  // worse than one where only the label is filled in.
  //
  // But three of the answers carry no interval, and only one of them means the
  // interval is gone: "ללא שינוי" says there is no reset at all. "עם הפריים" and
  // "לא צוין" say the period is not a fixed number of months — while the lender
  // may still have printed one, and throwing that away to record an answer that
  // agrees with it would be a net loss of data.
  const setFreq = (id: string, label: string) => {
    const months = freqMonths(label);
    patch(id, {
      change_frequency: label,
      ...(months !== null || label === FREQ_FIXED ? { anchor_interval: months } : {}),
    } as Partial<ImportedLoan>);
  };

  /* --- עוגן: the name is the value, its margin is the note underneath --- */
  const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}%`;

  /** מרווח, and the anchor's own level where the lender printed it. */
  const anchorNote = (loan: ImportedLoan) => {
    const margin = Number(loan.anchor_margin);
    const base = Number(loan.anchor);
    const hasMargin = Number.isFinite(margin) && loan.anchor_margin !== null && margin !== 0;
    if (Number.isFinite(base) && loan.anchor !== null && base > 0)
      return hasMargin ? `${base.toFixed(2)}% ${signed(margin)}` : `${base.toFixed(2)}%`;
    return hasMargin ? signed(margin) : "";
  };

  const anchorTip = (loan: ImportedLoan) =>
    loan.source_anchor
      ? `${loan.source_anchor}${anchorNote(loan) ? ` · מרווח ${anchorNote(loan)}` : ""}`
      : "המסמך לא ציין עוגן לשורה הזו";

  /** Why the cell says what it says — the report's own wording, where there was one. */
  const freqTip = (loan: ImportedLoan) =>
    loan.change_frequency === FREQ_UNSTATED
      ? "הדוח מציין ריבית משתנה אך לא כל כמה זמן היא מתעדכנת"
      : loan.source_track
        ? `מהדוח: ${loan.source_track}`
        : undefined;

  /* ------------------------------------------------------------- grouping */
  // Rows with no family (hand-added before an import) sit with the mortgages,
  // which is what the base mix means by default.
  const famOf = (l: ImportedLoan): DebtGroup => (l.group === "loan" ? "loan" : "mortgage");

  const groups = useMemo(
    () =>
      ORDER.map((key) => {
        const rows = loans.filter((l) => famOf(l) === key);
        return {
          key,
          rows,
          amount: rows.reduce((s, l) => s + (Number(l.amount) || 0), 0),
          monthly: rows.reduce((s, l) => s + calculateLoan(l, annualInflation).monthlyPayment, 0),
        };
      }),
    [loans, annualInflation]
  );

  const grand = useMemo(
    () => ({
      amount: loans.reduce((s, l) => s + (Number(l.amount) || 0), 0),
      monthly: loans.reduce((s, l) => s + calculateLoan(l, annualInflation).monthlyPayment, 0),
    }),
    [loans, annualInflation]
  );

  const dirtyOf = (loan: ImportedLoan) => {
    const base = baseline[loan.id];
    if (!base) return new Set<string>(); // a row added after the snapshot
    const out = new Set<string>();
    for (const k of TRACKED) {
      const a = loan[k as keyof ImportedLoan] ?? null;
      const b = base[k as keyof ImportedLoan] ?? null;
      if (String(a) !== String(b)) out.add(k);
    }
    return out;
  };

  const addBtns = (size: "sm" | "md" = "sm") => (
    <div className="flex items-center gap-1.5">
      {ORDER.map((key) => (
        <button
          key={key}
          className={`fin-btn fin-btn-fam ${size === "sm" ? "fin-btn-sm" : ""}`}
          style={
            {
              "--fam": FAMILY[key].color,
              "--fam-tint": FAMILY[key].tint,
              "--fam-line": FAMILY[key].line,
            } as React.CSSProperties
          }
          onClick={() => add(key)}
        >
          <Plus size={13} weight="bold" />
          {FAMILY[key].label}
        </button>
      ))}
    </div>
  );

  const sheetLoan = sheet ? loans.find((l) => l.id === sheet.id) : null;

  /* ------------------------------------------------------------------- ui */
  return (
    // No clipping on this card on purpose: `overflow: hidden` would make it the
    // containing block for the table's sticky header and totals bar, and a box
    // that never scrolls pins them in place — they would slide away with the
    // page instead of holding. Visible overflow hands them the page as their
    // scroller, which is the point now that the list is not boxed.
    <section className="fin-card">
      <header className="fin-head">
        <h2 className="fin-title">התחייבויות בתמהיל</h2>
        <span className="fin-count">{loans.length}</span>
        <div className="ms-auto">{addBtns()}</div>
      </header>

      {loans.length === 0 ? (
        <div className="fin-empty">
          <span
            className="grid size-10 place-items-center rounded-lg border"
            style={{ borderColor: "var(--line-2)", color: "var(--ink-4)" }}
          >
            <Bank size={19} />
          </span>
          התמהיל ריק — גררו דוח אשראי למעלה, או הוסיפו שורה ידנית.
          <div className="mt-1">{addBtns("md")}</div>
        </div>
      ) : (
        // The board is as tall as the debts are many. A report with forty
        // liabilities used to become a small scrolling window inside a
        // full-height page — two scrollbars fighting, and no way to see the
        // list whole. The page is the only scroller now; the header and the
        // totals bar stay put on their own.
        <div>
          <table className="fin-table">
            <colgroup>
              {["10.5%", "11.5%", "9.5%", "9%", "6%", "11.5%", "10%", "6%", "9.5%", "10%", "6.5%"].map(
                (w, i) => (
                  <col key={i} style={{ width: w }} />
                )
              )}
            </colgroup>
            <thead>
              <tr>
                <th>סוג</th>
                <th>סכום</th>
                <th>מסלול</th>
                <th>לוח סילוקין</th>
                <th>ריבית %</th>
                <th>עוגן</th>
                <th>תדירות שינוי</th>
                <th>חודשים</th>
                <th>תאריך סיום</th>
                {/* the unit lives in the header, so it is stated once instead of
                    once per row — and the figures below keep a clean right edge */}
                <th>החזר חודשי</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {groups.map((g) => {
                if (!g.rows.length) return null;
                const fam = FAMILY[g.key];
                const famVars = {
                  "--fam": fam.color,
                  "--fam-tint": fam.tint,
                  "--fam-line": fam.line,
                } as React.CSSProperties;

                return (
                  <Fragment key={g.key}>
                    {/* Group divider — still one table, just legible. Its two
                        subtotals sit in the real סכום and החזר חודשי cells rather
                        than floating in a spanned row: hand-tuned widths could
                        never land on the same pixel as the rows beneath them,
                        and a ledger whose three levels of total each hang at a
                        different offset is unreadable at a glance. */}
                    <tr className="fin-groupbar" style={famVars}>
                      <td>
                        <div className="fin-groupbar-in">
                          <span className="fin-groupbar-title">
                            {FAM_ICON[g.key]}
                            {fam.plural}
                          </span>
                          <span className="fin-count">{g.rows.length}</span>
                        </div>
                      </td>
                      <td>
                        <Money value={g.amount} className="fin-groupbar-sum" />
                      </td>
                      <td colSpan={7} />
                      <td>
                        <Money value={g.monthly} className="fin-groupbar-sum" style={{ color: fam.color }} />
                      </td>
                      <td />
                    </tr>

                    {g.rows.map((loan) => {
                      const res = calculateLoan(loan, annualInflation);
                      const dirty = dirtyOf(loan);
                      const amount = Number(loan.amount) || 0;
                      const months = Number(loan.months) || 0;
                      const end = parseDate(loan.loan_end_date ?? loan.end_date);
                      // a priced row with no term cannot be amortized at all
                      const noTerm = amount > 0 && months <= 0;
                      // an already-elapsed end date is stale data, not a blocker
                      const stale = !!end && end < today;
                      const flag = noTerm ? "err" : stale ? "warn" : undefined;
                      const share = grand.amount ? (amount / grand.amount) * 100 : 0;
                      const heat = rateHeat(loan.rate, g.key);

                      return (
                        <tr key={loan.id} className="fin-row" style={famVars} data-flag={flag}>
                          {/* --- סוג: spine + the family control --- */}
                          <td>
                            <Select
                              variant="chip"
                              value={g.key}
                              onChange={(v) => patch(loan.id, { group: v as DebtGroup })}
                              ariaLabel="סוג ההתחייבות"
                              minWidth={148}
                              options={ORDER.map((k) => ({
                                value: k,
                                label: FAMILY[k].label,
                                icon: FAM_ICON[k],
                                tone: FAMILY[k].color,
                              }))}
                            />
                            <div className="fin-share mt-0.5" title={`${share.toFixed(1)}% מהתמהיל`}>
                              <span style={{ width: `${Math.min(100, share)}%` }} />
                            </div>
                          </td>

                          {/* --- סכום --- */}
                          <td>
                            <div className="fin-well" data-dirty={dirty.has("amount") || undefined}>
                              <input
                                className="fin-cell fin-num-in font-bold"
                                value={amount ? amount.toLocaleString("he-IL") : ""}
                                placeholder="0"
                                aria-label="סכום"
                                inputMode="numeric"
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) =>
                                  patch(loan.id, { amount: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })
                                }
                              />
                              {(loan.source_bank || loan.is_guarantor || loan.is_shared) && (
                                <span className="fin-note truncate" style={{ maxWidth: "68%" }} title={loan.source_bank}>
                                  {loan.is_guarantor && (
                                    <span
                                      className="fin-tag me-1"
                                      style={{ background: FAMILY.loan.tint, color: FAMILY.loan.color }}
                                    >
                                      ערב
                                    </span>
                                  )}
                                  {loan.is_shared && (
                                    <span
                                      className="fin-tag me-1"
                                      style={{ background: "var(--primary-tint)", color: "var(--primary)" }}
                                      title="החוב מופיע בשני הדוחות — נספר פעם אחת"
                                    >
                                      משותף
                                    </span>
                                  )}
                                  {loan.source_bank?.replace(/בע"?מ|בנק/g, "").trim()}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* --- מסלול --- */}
                          <td>
                            <div className="fin-well" data-dirty={dirty.has("path_id") || undefined}>
                              <Select
                                value={loan.path_id}
                                onChange={(v) => patch(loan.id, { path_id: Number(v) })}
                                options={paths.map((p) => ({
                                  value: p.id,
                                  label: PATH_SHORT[p.id] ?? p.name,
                                  dot: TRACK_HEX[p.id],
                                }))}
                                ariaLabel="מסלול"
                                minWidth={150}
                              />
                            </div>
                          </td>

                          {/* --- לוח סילוקין --- */}
                          <td>
                            <div className="fin-well" data-dirty={dirty.has("amortization_schedule_id") || undefined}>
                              <Select
                                value={loan.amortization_schedule_id}
                                onChange={(v) => patch(loan.id, { amortization_schedule_id: Number(v) })}
                                options={schedules.map((s) => ({ value: s.id, label: s.schedule_name }))}
                                ariaLabel="לוח סילוקין"
                              />
                            </div>
                          </td>

                          {/* --- ריבית: warms as the rate climbs, per family --- */}
                          <td>
                            <div className="fin-well" data-dirty={dirty.has("rate") || undefined}>
                              <input
                                className="fin-cell fin-num-in"
                                type="number"
                                step="0.01"
                                min={0}
                                aria-label="ריבית באחוזים"
                                data-heat={heat ?? undefined}
                                title={
                                  heat === "hot"
                                    ? `ריבית גבוהה ל${FAMILY[g.key].label}`
                                    : heat === "warm"
                                      ? `ריבית גבוהה מהממוצע ל${FAMILY[g.key].label}`
                                      : undefined
                                }
                                value={loan.rate || ""}
                                placeholder="0"
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => patch(loan.id, { rate: Number(e.target.value) || 0 })}
                              />
                            </div>
                          </td>

                          {/* --- עוגן ---
                              The anchor by name, with the margin over it on the
                              note line: together they are the rate in the cell
                              before this one, taken apart. Discount also prints
                              the anchor's own level, and where it does the note
                              shows the whole sum. */}
                          <td>
                            <div
                              className="fin-well"
                              data-dirty={dirty.has("source_anchor") || undefined}
                              title={anchorTip(loan)}
                            >
                              <input
                                className="fin-cell"
                                data-text="true"
                                aria-label="עוגן"
                                placeholder="—"
                                value={loan.source_anchor ?? ""}
                                onChange={(e) => patch(loan.id, { source_anchor: e.target.value })}
                              />
                              {anchorNote(loan) && <span className="fin-note">{anchorNote(loan)}</span>}
                            </div>
                          </td>

                          {/* --- תדירות שינוי ---
                              Read from the document on import: the bank statement
                              prints it, the credit report does not and says "לא
                              צוין" instead of guessing. Editable, because an
                              advisor on the phone to the bank will know. */}
                          <td>
                            <div
                              className="fin-well"
                              data-dirty={dirty.has("change_frequency") || undefined}
                              title={freqTip(loan)}
                            >
                              <Select
                                value={loan.change_frequency ?? ""}
                                onChange={(v) => setFreq(loan.id, String(v))}
                                options={freqOptionsFor(loan.change_frequency)}
                                ariaLabel="תדירות שינוי הריבית"
                                placeholder="—"
                                minWidth={214}
                              />
                            </div>
                          </td>

                          {/* --- חודשים (synced with the end date) --- */}
                          <td>
                            <div className="fin-well" data-dirty={dirty.has("months") || undefined}>
                              <input
                                className="fin-cell fin-num-in"
                                type="number"
                                min={0}
                                aria-label="מספר חודשים"
                                data-state={noTerm ? "err" : undefined}
                                value={months || ""}
                                placeholder="0"
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => setTerm(loan.id, Number(e.target.value))}
                              />
                              {months > 0 && <span className="fin-note">{(months / 12).toFixed(1)} שנ׳</span>}
                            </div>
                          </td>

                          {/* --- תאריך סיום --- */}
                          <td>
                            <div className="fin-well" data-dirty={dirty.has("loan_end_date") || undefined}>
                              <DateField
                                value={loan.loan_end_date ?? loan.end_date}
                                onChange={(iso) => setEnd(loan.id, iso)}
                                state={stale ? "warn" : undefined}
                                hint={months > 0 ? `${months} חודשים מהיום` : "בחירת תאריך תקבע גם את מספר החודשים"}
                              />
                            </div>
                          </td>

                          {/* --- החזר חודשי (calculated: no well) --- */}
                          <td>
                            {noTerm ? (
                              <span
                                className="flex items-center justify-end gap-1 px-1 text-[11.5px] font-bold"
                                style={{ color: "var(--neg)" }}
                                title="לשורה יש יתרה אבל אין תקופה — הזינו חודשים או תאריך סיום"
                              >
                                <Warning size={13} weight="fill" />
                                חסרה תקופה
                              </span>
                            ) : (
                              <Money value={res.monthlyPayment} className="fin-pay" style={{ color: "var(--ink)" }} />
                            )}
                            {(res.isIndexed || stale) && (
                              <div className="flex items-center justify-start gap-1.5 px-2 pt-0.5" dir="ltr">
                                {stale && (
                                  <span className="text-[9.5px] font-bold" style={{ color: "var(--warn)" }} dir="rtl">
                                    תאריך עבר
                                  </span>
                                )}
                                {res.isIndexed && (
                                  <span className="text-[9.5px]" style={{ color: "var(--ink-4)" }} dir="rtl">
                                    צמוד מדד
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          {/* --- actions --- */}
                          <td>
                            <div className="flex items-center justify-end gap-0.5 pe-0.5">
                              <button
                                className="fin-act fin-tip"
                                data-tip="שדות נוספים"
                                aria-label="שדות נוספים"
                                aria-expanded={sheet?.id === loan.id}
                                onClick={(e) =>
                                  setSheet(
                                    sheet?.id === loan.id
                                      ? null
                                      : { id: loan.id, rect: e.currentTarget.getBoundingClientRect() }
                                  )
                                }
                              >
                                <Sliders size={14} />
                              </button>
                              <button
                                className="fin-act fin-tip"
                                data-tip="לוח סילוקין"
                                onClick={() => onSchedule(loan)}
                                aria-label="לוח סילוקין של השורה"
                              >
                                <TableIcon size={14} />
                              </button>
                              <button
                                className="fin-act fin-tip"
                                data-danger="true"
                                data-armed={armed === loan.id || undefined}
                                data-tip={armed === loan.id ? "לחצו שוב לאישור" : "מחיקה"}
                                onClick={() => (armed === loan.id ? remove(loan.id) : setArmed(loan.id))}
                                onBlur={() => setArmed((a) => (a === loan.id ? null : a))}
                                aria-label={armed === loan.id ? "אישור מחיקה" : "מחיקת השורה"}
                              >
                                <Trash size={14} weight={armed === loan.id ? "fill" : "regular"} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })}

              {/* add a row from the bottom, so a long list never sends you back up */}
              <tr className="fin-addrow">
                <td colSpan={11}>
                  <div className="fin-addrow-in">
                    {addBtns()}
                    <span className="fin-addrow-hint">הוספת שורה ריקה לתמהיל</span>
                  </div>
                </td>
              </tr>
            </tbody>

            <tfoot>
              <tr>
                <td>
                  <span className="fin-total-label">סה״כ</span>
                </td>
                <td>
                  <Money value={grand.amount} className="fin-total-fig" />
                </td>
                <td colSpan={7}>
                  <div className="flex flex-wrap items-center gap-1.5 px-1">
                    {groups
                      .filter((g) => g.rows.length)
                      .map((g) => (
                        <span
                          key={g.key}
                          className="fin-chip"
                          style={{
                            borderColor: FAMILY[g.key].line,
                            background: FAMILY[g.key].tint,
                            color: FAMILY[g.key].color,
                          }}
                        >
                          {FAM_ICON[g.key]}
                          {FAMILY[g.key].plural}
                          <span className="fin-fig" style={{ opacity: 0.75 }}>
                            {grand.amount ? Math.round((g.amount / grand.amount) * 100) : 0}%
                          </span>
                        </span>
                      ))}
                  </div>
                </td>
                <td>
                  <Money value={grand.monthly} className="fin-total-fig" hot />
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {sheet && sheetLoan && (
        <RowSettings
          loan={sheetLoan}
          anchorRect={sheet.rect}
          dirty={dirtyOf(sheetLoan)}
          onPatch={(next) => patch(sheetLoan.id, next)}
          onClose={() => setSheet(null)}
        />
      )}
    </section>
  );
}
