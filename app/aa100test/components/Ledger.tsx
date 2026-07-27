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
// Every field the old grid had is still here. The five rarely-touched ones
// (עוגן, מרווח, תדירות, גרייס) sit behind a per-row expander so the default
// view stays dense and readable.

import { Fragment, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bank,
  CaretDown,
  HandCoins,
  Plus,
  Sliders,
  Table as TableIcon,
  Trash,
  Warning,
} from "@phosphor-icons/react";
import { schedules } from "@/app/data/amortization_schedules";
import { graceTypes } from "@/app/data/graceTypes";
import type { LoanPath } from "@/app/data/hooks/useLoanPaths";
import { calculateLoan } from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import Select from "./Select";
import DateField from "./DateField";
import {
  FAMILY,
  PATH_LABEL,
  PATH_SHORT,
  TRACK_HEX,
  type DebtGroup,
  type ImportedLoan,
} from "../lib/credit";
import { addMonths, monthsBetween, parseDate, startOfToday, toIso } from "../lib/dates";

const nis = (n: number) => Math.round(n || 0).toLocaleString("he-IL", { maximumFractionDigits: 0 });

const ORDER: DebtGroup[] = ["mortgage", "loan"];

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
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [armed, setArmed] = useState<string | null>(null);
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

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  /* --- תאריך סיום and חודשים describe one fact, so they move together --- */
  const setTerm = (id: string, months: number) => {
    const m = Math.max(0, Math.round(months) || 0);
    const iso = m > 0 ? toIso(addMonths(today, m)) : null;
    patch(id, { months: m, loan_end_date: iso, end_date: iso });
  };
  const setEnd = (id: string, iso: string | null) => {
    const d = iso ? parseDate(iso) : null;
    patch(id, {
      loan_end_date: iso,
      end_date: iso,
      months: d ? monthsBetween(today, d) : 0,
    });
  };

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

  const addBtns = (
    <div className="flex items-center gap-1.5">
      {ORDER.map((key) => (
        <button
          key={key}
          className="fin-btn fin-btn-sm fin-btn-fam"
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

  /* ------------------------------------------------------------------- ui */
  return (
    <section className="fin-card overflow-hidden">
      <header className="fin-head">
        <h2 className="fin-title">התחייבויות בתמהיל</h2>
        <span className="fin-count">{loans.length}</span>
        <span className="fin-sub hidden sm:inline">משכנתאות והלוואות, טבלה אחת</span>
        <div className="ms-auto">{addBtns}</div>
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
          <div className="mt-1">{addBtns}</div>
        </div>
      ) : (
        <div className="fin-scroll max-h-[62vh] overflow-auto">
          <table className="fin-table">
            <colgroup>
              {["10%", "14%", "15%", "12%", "7.5%", "7.5%", "13%", "14%", "7%"].map((w, i) => (
                <col key={i} style={{ width: w }} />
              ))}
            </colgroup>
            <thead>
              <tr>
                <th>סוג</th>
                <th data-num="true">סכום</th>
                <th>מסלול</th>
                <th>לוח סילוקין</th>
                <th data-num="true">ריבית %</th>
                <th data-num="true">חודשים</th>
                <th>תאריך סיום</th>
                <th data-num="true">החזר חודשי</th>
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
                    {/* group divider — still one table, just legible */}
                    <tr className="fin-groupbar" style={famVars}>
                      <td colSpan={9}>
                        <div className="fin-groupbar-in">
                          <span className="fin-groupbar-title">
                            {g.key === "mortgage" ? <Bank size={13} weight="fill" /> : <HandCoins size={13} weight="fill" />}
                            {fam.plural}
                          </span>
                          <span className="fin-count">{g.rows.length}</span>
                          <span className="fin-groupbar-sum ms-auto">
                            {nis(g.amount)}
                            <span className="fin-cur">₪</span>
                          </span>
                          <span className="fin-groupbar-sum" style={{ color: fam.color, minWidth: 96, textAlign: "end" }}>
                            {nis(g.monthly)}
                            <span className="fin-cur">₪/ח׳</span>
                          </span>
                          <span style={{ width: 74 }} />
                        </div>
                      </td>
                    </tr>

                    {g.rows.map((loan) => {
                      const res = calculateLoan(loan, annualInflation);
                      const open = expanded.has(loan.id);
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

                      return (
                        <Fragment key={loan.id}>
                          <tr className="fin-row" style={famVars} data-flag={flag}>
                            {/* --- סוג: spine, expander, worded chip, share --- */}
                            <td>
                              <div className="flex items-center gap-1">
                                <button
                                  className="fin-act !h-6 !w-5"
                                  onClick={() => toggle(loan.id)}
                                  aria-label="שדות נוספים"
                                  aria-expanded={open}
                                  title="עוגן, מרווח, תדירות שינוי וגרייס"
                                >
                                  <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.15 }}>
                                    <CaretDown size={12} weight="bold" />
                                  </motion.span>
                                </button>
                                <div className="min-w-0 flex-1">
                                  <button
                                    className="fin-fam"
                                    onClick={() =>
                                      patch(loan.id, { group: g.key === "mortgage" ? "loan" : "mortgage" })
                                    }
                                    title={`שינוי ל${g.key === "mortgage" ? FAMILY.loan.label : FAMILY.mortgage.label}`}
                                  >
                                    {g.key === "mortgage" ? (
                                      <Bank size={12} weight="fill" className="fin-fam-ico" />
                                    ) : (
                                      <HandCoins size={12} weight="fill" className="fin-fam-ico" />
                                    )}
                                    {fam.label}
                                  </button>
                                  <div className="fin-share mt-1" title={`${share.toFixed(1)}% מהתמהיל`}>
                                    <span style={{ width: `${Math.min(100, share)}%` }} />
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* --- סכום --- */}
                            <td>
                              <div className="fin-well" data-dirty={dirty.has("amount") || undefined}>
                                <input
                                  className="fin-cell text-end font-bold"
                                  value={amount ? amount.toLocaleString("he-IL") : ""}
                                  placeholder="0"
                                  aria-label="סכום"
                                  inputMode="numeric"
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) =>
                                    patch(loan.id, { amount: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })
                                  }
                                />
                              </div>
                              {(loan.source_bank || loan.is_guarantor) && (
                                <div
                                  className="mt-0.5 flex items-center gap-1.5 truncate px-1.5 text-[10px] leading-tight"
                                  style={{ color: "var(--ink-4)" }}
                                  title={loan.source_bank}
                                >
                                  {loan.is_guarantor && (
                                    <span
                                      className="fin-tag"
                                      style={{ background: FAMILY.loan.tint, color: FAMILY.loan.color }}
                                      title="הלקוח ערב לחוב הזה, לא חייב בו"
                                    >
                                      ערב
                                    </span>
                                  )}
                                  <span className="truncate">{loan.source_bank?.replace(/בע"?מ|בנק/g, "").trim()}</span>
                                </div>
                              )}
                            </td>

                            {/* --- מסלול --- */}
                            <td>
                              <div className="fin-well" data-dirty={dirty.has("path_id") || undefined}>
                                <Select
                                  value={loan.path_id}
                                  onChange={(v) => patch(loan.id, { path_id: Number(v) })}
                                  options={paths.map((p) => ({
                                    value: p.id,
                                    label: PATH_LABEL[p.id] ?? p.name,
                                    dot: TRACK_HEX[p.id],
                                  }))}
                                  ariaLabel="מסלול"
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

                            {/* --- ריבית --- */}
                            <td>
                              <div className="fin-well" data-dirty={dirty.has("rate") || undefined}>
                                <input
                                  className="fin-cell text-center"
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  aria-label="ריבית באחוזים"
                                  value={loan.rate || ""}
                                  placeholder="0"
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) => patch(loan.id, { rate: Number(e.target.value) || 0 })}
                                />
                              </div>
                            </td>

                            {/* --- חודשים (synced with the end date) --- */}
                            <td>
                              <div className="fin-well" data-dirty={dirty.has("months") || undefined}>
                                <input
                                  className="fin-cell text-center"
                                  type="number"
                                  min={0}
                                  aria-label="מספר חודשים"
                                  data-state={noTerm ? "err" : undefined}
                                  value={months || ""}
                                  placeholder="0"
                                  onFocus={(e) => e.currentTarget.select()}
                                  onChange={(e) => setTerm(loan.id, Number(e.target.value))}
                                />
                              </div>
                              {months > 0 && (
                                <div className="px-1 text-center text-[9.5px]" style={{ color: "var(--ink-4)" }}>
                                  {(months / 12).toFixed(1)} שנים
                                </div>
                              )}
                            </td>

                            {/* --- תאריך סיום --- */}
                            <td>
                              <div data-dirty={dirty.has("loan_end_date") || undefined} className="fin-well">
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
                                  className="flex items-center justify-end gap-1 px-1 text-[11px] font-bold"
                                  style={{ color: "var(--neg)" }}
                                  title="לשורה יש יתרה אבל אין תקופה — הזינו חודשים או תאריך סיום"
                                >
                                  <Warning size={12} weight="fill" />
                                  חסרה תקופה
                                </span>
                              ) : (
                                <span className="fin-calc font-bold" title="מחושב מהסכום, הריבית והתקופה">
                                  {nis(res.monthlyPayment)}
                                  <span className="fin-cur">₪</span>
                                </span>
                              )}
                              <div className="flex items-center justify-end gap-1.5 px-2 pt-0.5">
                                {res.isIndexed && (
                                  <span className="text-[9.5px]" style={{ color: "var(--ink-4)" }}>
                                    צמוד מדד
                                  </span>
                                )}
                                {stale && (
                                  <span className="text-[9.5px] font-bold" style={{ color: "var(--warn)" }} title="תאריך הסיום שבדוח כבר עבר">
                                    תאריך עבר
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* --- actions --- */}
                            <td>
                              <div className="flex items-center justify-end gap-0.5 pe-0.5">
                                <button
                                  className="fin-act"
                                  onClick={() => onSchedule(loan)}
                                  title="לוח סילוקין של השורה"
                                  aria-label="לוח סילוקין של השורה"
                                >
                                  <TableIcon size={14} />
                                </button>
                                <button
                                  className="fin-act"
                                  data-danger="true"
                                  data-armed={armed === loan.id || undefined}
                                  onClick={() => (armed === loan.id ? remove(loan.id) : setArmed(loan.id))}
                                  onBlur={() => setArmed((a) => (a === loan.id ? null : a))}
                                  title={armed === loan.id ? "לחצו שוב לאישור המחיקה" : "מחיקת השורה"}
                                  aria-label={armed === loan.id ? "אישור מחיקה" : "מחיקת השורה"}
                                >
                                  <Trash size={14} weight={armed === loan.id ? "fill" : "regular"} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* --- secondary fields --- */}
                          <AnimatePresence initial={false}>
                            {open && (
                              <motion.tr
                                key={`${loan.id}-x`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.14 }}
                              >
                                <td colSpan={9} className="fin-tray">
                                  <div className="flex flex-wrap items-end gap-3.5 px-4 py-2.5">
                                    <span
                                      className="flex items-center gap-1.5 self-center text-[11px]"
                                      style={{ color: "var(--ink-4)" }}
                                    >
                                      <Sliders size={13} />
                                      שדות נוספים
                                    </span>
                                    {(
                                      [
                                        { label: "עוגן", key: "anchor", type: "text", w: 96 },
                                        { label: "מרווח מהעוגן", key: "anchor_margin", type: "number", w: 96 },
                                        { label: "תדירות שינוי", key: "change_frequency", type: "text", w: 96 },
                                      ] as const
                                    ).map((f) => (
                                      <label key={f.key} className="flex flex-col gap-1">
                                        <span className="fin-label">{f.label}</span>
                                        <div className="fin-well" data-dirty={dirty.has(f.key) || undefined}>
                                          <input
                                            className="fin-cell text-center"
                                            style={{ width: f.w }}
                                            type={f.type}
                                            value={(loan[f.key] as string | number) ?? ""}
                                            onChange={(e) =>
                                              patch(loan.id, {
                                                [f.key]:
                                                  f.type === "number"
                                                    ? Number(e.target.value) || 0
                                                    : e.target.value,
                                              } as Partial<ImportedLoan>)
                                            }
                                          />
                                        </div>
                                      </label>
                                    ))}
                                    <label className="flex flex-col gap-1">
                                      <span className="fin-label">גרייס</span>
                                      <div className="fin-well" data-dirty={dirty.has("grace_type_id") || undefined}>
                                        <Select
                                          value={loan.grace_type_id ?? 1}
                                          onChange={(v) => patch(loan.id, { grace_type_id: Number(v) })}
                                          options={graceTypes.map((gt) => ({ value: gt.id, label: gt.name }))}
                                          style={{ width: 128 }}
                                          ariaLabel="גרייס"
                                        />
                                      </div>
                                    </label>
                                    <label className="flex flex-col gap-1">
                                      <span className="fin-label">חודשי גרייס</span>
                                      <div className="fin-well" data-dirty={dirty.has("grace_months") || undefined}>
                                        <input
                                          className="fin-cell text-center"
                                          style={{ width: 96 }}
                                          type="number"
                                          min={0}
                                          value={loan.grace_months ?? 0}
                                          onFocus={(e) => e.currentTarget.select()}
                                          onChange={(e) => patch(loan.id, { grace_months: Number(e.target.value) || 0 })}
                                        />
                                      </div>
                                    </label>
                                    {loan.source_track && (
                                      <span className="ms-auto self-center text-[11px]" style={{ color: "var(--ink-4)" }}>
                                        מהדוח: {loan.source_type} · {loan.source_track}
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>

            <tfoot>
              <tr>
                <td>
                  <span className="ps-1 text-[11px] font-bold" style={{ color: "var(--ink-2)" }}>
                    סה״כ
                  </span>
                </td>
                <td>
                  <span className="fin-calc font-bold" style={{ fontSize: 13.5 }}>
                    {nis(grand.amount)}
                    <span className="fin-cur">₪</span>
                  </span>
                </td>
                <td colSpan={5}>
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
                          {g.key === "mortgage" ? <Bank size={11} weight="fill" /> : <HandCoins size={11} weight="fill" />}
                          {FAMILY[g.key].plural}
                          <span className="fin-fig" style={{ opacity: 0.75 }}>
                            {grand.amount ? Math.round((g.amount / grand.amount) * 100) : 0}%
                          </span>
                        </span>
                      ))}
                  </div>
                </td>
                <td>
                  <span className="fin-calc font-bold" style={{ fontSize: 13.5, color: "var(--ink)" }}>
                    {nis(grand.monthly)}
                    <span className="fin-cur">₪</span>
                  </span>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}

/** Exported for the composition legend so a track name never drifts. */
export const trackName = (id: number) => PATH_SHORT[id] ?? PATH_LABEL[id] ?? String(id);
