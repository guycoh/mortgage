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
import { AnimatePresence, motion } from "motion/react";
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
import { BankIcon } from "./bankIcons";
import Money from "./Money";
import RowSettings from "./RowSettings";
import Btn from "./Btn";
import { settle, snap } from "../lib/transitions";
import {
  FAMILY,
  PATH_SHORT,
  TRACK_HEX,
  rateHeat,
  type DebtGroup,
  type ImportedLoan,
} from "../lib/credit";
import { addMonths, monthsBetween, parseDate, startOfToday, toIso } from "../lib/dates";
import { freqLabel } from "@/lib/rate-frequency";

const ORDER: DebtGroup[] = ["mortgage", "loan"];

const FAM_ICON = {
  mortgage: <Bank size={12} weight="fill" className="lgr-fam-ico" />,
  loan: <HandCoins size={12} weight="fill" className="lgr-fam-ico" />,
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
  "anchor_interval",
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

  /* --- תדירות שינוי: months are the value, the wording is derived from them --- */
  // The grid edits the number. `change_frequency` is a text column other pages
  // read, so it is kept in step rather than left to contradict the integer beside
  // it — one fact, written once, in both shapes.
  const setFreq = (id: string, raw: string) => {
    const months = raw === "" ? null : Math.max(0, Math.round(Number(raw))) || null;
    patch(id, {
      anchor_interval: months,
      change_frequency: freqLabel(months),
    } as Partial<ImportedLoan>);
  };

  /** The interval in the words an advisor would say, under the figure. */
  const freqNote = (loan: ImportedLoan) => {
    const m = Number(loan.anchor_interval);
    if (loan.anchor_interval === null || loan.anchor_interval === undefined || !Number.isFinite(m) || m <= 0)
      return "";
    if (m === 1) return "כל חודש";
    if (m % 12 === 0) return `${m / 12} שנ׳`;
    return `${m} ח׳`;
  };

  /* --- עוגן: the name is the value, its margin is the note underneath --- */
  const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n).toFixed(2)}%`;

  /**
   * One of the two rate fields in the עוגן cell.
   *
   * Empty means absent, not zero: a fixed-rate row has no anchor and no margin,
   * and writing 0 into either would claim it is anchored at nothing. So the value
   * clears to null rather than to 0 — which also keeps the numeric columns
   * nullable in the database, the way they are declared.
   */
  const numField = (
    loan: ImportedLoan,
    key: "anchor" | "anchor_margin",
    label: string,
    placeholder: string
  ) => (
    <input
      className="lgr-cell lgr-num-in"
      type="number"
      step="0.01"
      aria-label={label}
      title={label}
      // A placeholder that repeats the column header ("עוגן" over the עוגן
      // column) tells nobody anything; it also made an empty field look filled
      // from two feet away. The shape of the number that belongs here does the
      // work instead, at 40% so it can never be mistaken for a typed value.
      placeholder={placeholder}
      value={loan[key] ?? ""}
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) =>
        patch(loan.id, {
          [key]: e.target.value === "" ? null : Number(e.target.value),
        } as Partial<ImportedLoan>)
      }
    />
  );

  /** The sum spelled out, for the cell's tooltip: anchor + margin = the rate. */
  const anchorTip = (loan: ImportedLoan) => {
    if (loan.anchor === null && loan.anchor_margin === null)
      return "המסמך לא ציין עוגן לשורה הזו";
    const parts = [loan.source_anchor || "עוגן"];
    if (loan.anchor !== null && Number.isFinite(Number(loan.anchor)))
      parts.push(`${Number(loan.anchor).toFixed(2)}%`);
    if (loan.anchor_margin !== null && Number.isFinite(Number(loan.anchor_margin)))
      parts.push(`מרווח ${signed(Number(loan.anchor_margin))}`);
    parts.push(`סה"כ ${(Number(loan.rate) || 0).toFixed(2)}%`);
    return parts.join(" · ");
  };

  /** Why the cell says what it says — the report's own wording, where there was one. */
  const freqTip = (loan: ImportedLoan) => {
    const m = Number(loan.anchor_interval);
    if (loan.anchor_interval === null || !Number.isFinite(m) || m <= 0)
      return loan.source_track
        ? `המסמך לא ציין תדירות שינוי · מהדוח: ${loan.source_track}`
        : "ריק = הריבית אינה מתעדכנת במחזור קבוע";
    return `הריבית מתעדכנת כל ${m} חודשים${loan.source_track ? ` · מהדוח: ${loan.source_track}` : ""}`;
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

  const addBtns = (size: "sm" | "md" = "sm") => (
    <div className="flex items-center gap-1.5">
      {ORDER.map((key) => (
        <Btn
          key={key}
          className={`lgr-btn lgr-btn-fam ${size === "sm" ? "lgr-btn-sm" : ""}`}
          style={
            {
              "--fam": FAMILY[key].color,
              "--fam-text": FAMILY[key].text,
              "--fam-tint": FAMILY[key].tint,
              "--fam-tint-2": FAMILY[key].tint2,
              "--fam-line": FAMILY[key].line,
              "--fam-ring": FAMILY[key].ring,
              "--fam-wash": FAMILY[key].wash,
            } as React.CSSProperties
          }
          onClick={() => add(key)}
        >
          <Plus size={13} weight="bold" />
          {FAMILY[key].label}
        </Btn>
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
    <section className="lgr-card">
      <header className="lgr-head">
        <h2 className="lgr-title">התחייבויות בתמהיל</h2>
        <span className="lgr-count">{loans.length}</span>
        <div className="ms-auto">{addBtns()}</div>
      </header>

      {loans.length === 0 ? (
        <div className="lgr-empty">
          <span
            className="grid size-10 place-items-center rounded-lg border"
            style={{ borderColor: "var(--line-2)", color: "var(--lgr-4)" }}
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
          <table className="lgr-table">
            <colgroup>
              {["10.5%", "11.5%", "9%", "8%", "6%", "13%", "10%", "6%", "9.5%", "10%", "6.5%"].map(
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
                {/* one header for the paired field, so both halves are named and
                    the margin's unit is stated once instead of per row */}
                {/* One <th> over a paired cell, split on the same 1fr/56px grid the
                    pair uses, so "מרווח" sits over the מרווח box instead of trailing
                    off the end of the column. */}
                <th>
                  <span className="lgr-th-pair">
                    <span>עוגן %</span>
                    <span className="lgr-th-pair-b">מרווח %</span>
                  </span>
                </th>
                <th>תדירות שינוי</th>
                <th>חודשים</th>
                <th>תאריך סיום</th>
                {/* the unit lives in the header, so it is stated once instead of
                    once per row — and the figures below keep a clean right edge */}
                <th>החזר חודשי</th>
                <th />
              </tr>
            </thead>

            <AnimatePresence initial={false} mode="popLayout">
            <tbody>
              {groups.map((g) => {
                if (!g.rows.length) return null;
                const fam = FAMILY[g.key];
                const famVars = {
                  "--fam": fam.color,
                  "--fam-text": fam.text,
                  "--fam-tint": fam.tint,
                  "--fam-tint-2": fam.tint2,
                  "--fam-line": fam.line,
                  "--fam-wash": fam.wash,
                  "--fam-ring": fam.ring,
                } as React.CSSProperties;

                return (
                  <Fragment key={g.key}>
                    {/* Group divider — still one table, just legible. Its two
                        subtotals sit in the real סכום and החזר חודשי cells rather
                        than floating in a spanned row: hand-tuned widths could
                        never land on the same pixel as the rows beneath them,
                        and a ledger whose three levels of total each hang at a
                        different offset is unreadable at a glance. */}
                    <tr className="lgr-groupbar" style={famVars}>
                      <td>
                        <div className="lgr-groupbar-in">
                          <span className="lgr-groupbar-title">
                            {FAM_ICON[g.key]}
                            {fam.plural}
                          </span>
                          <span className="lgr-count">{g.rows.length}</span>
                        </div>
                      </td>
                      <td>
                        <Money value={g.amount} className="lgr-groupbar-sum" />
                      </td>
                      <td colSpan={7} />
                      <td>
                        <Money value={g.monthly} className="lgr-groupbar-sum" style={{ color: fam.text }} />
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
                        <motion.tr
                          key={loan.id}
                          layout="position"
                          className="lgr-row"
                          style={famVars}
                          data-flag={flag}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={settle}
                        >
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
                            <div className="lgr-share mt-0.5" title={`${share.toFixed(1)}% מהתמהיל`}>
                              <span style={{ width: `${Math.min(100, share)}%` }} />
                            </div>
                          </td>

                          {/* --- סכום --- */}
                          <td>
                            <div className="lgr-well" data-dirty={dirty.has("amount") || undefined}>
                              <input
                                className="lgr-cell lgr-num-in font-bold"
                                value={amount ? amount.toLocaleString("he-IL") : ""}
                                placeholder="0"
                                aria-label="סכום"
                                inputMode="numeric"
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) =>
                                  patch(loan.id, { amount: Number(e.target.value.replace(/[^\d]/g, "")) || 0 })
                                }
                              />
                              {/* WHOSE DEBT IT IS, AS A MARK NOT A NAME.
                                  "בנק לאומי לישראל בע\"מ" trimmed down to
                                  "לאומי לישראל" still ran most of the way across
                                  the cell and met the figure coming the other
                                  way. The bank is recognised faster from its
                                  logo than from its name anyway, so it is a 14px
                                  disc now, on its own row under the field, with
                                  the full name on hover. */}
                              {(loan.source_bank || loan.is_guarantor || loan.is_shared) && (
                                <span className="lgr-note lgr-lender" title={loan.source_bank || undefined}>
                                  {loan.source_bank && <BankIcon source={loan.source_bank} size={14} />}
                                  {loan.is_guarantor && (
                                    <span
                                      className="lgr-tag"
                                      style={{ background: FAMILY.loan.tint, color: FAMILY.loan.text }}
                                    >
                                      ערב
                                    </span>
                                  )}
                                  {loan.is_shared && (
                                    <span
                                      className="lgr-tag"
                                      style={{ background: "var(--primary-tint)", color: "var(--primary-deep)" }}
                                      title="החוב מופיע בשני הדוחות — נספר פעם אחת"
                                    >
                                      משותף
                                    </span>
                                  )}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* --- מסלול --- */}
                          <td>
                            <div className="lgr-well" data-dirty={dirty.has("path_id") || undefined}>
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
                            <div className="lgr-well" data-dirty={dirty.has("amortization_schedule_id") || undefined}>
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
                            <div className="lgr-well" data-dirty={dirty.has("rate") || undefined}>
                              <input
                                className="lgr-cell lgr-num-in"
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
                                placeholder="0.00"
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => patch(loan.id, { rate: Number(e.target.value) || 0 })}
                              />
                            </div>
                          </td>

                          {/* --- עוגן / מרווח: two rates, both numeric ---
                              The pair IS the ריבית cell before this one, taken
                              apart: anchor + margin = the rate. Both typed, so a
                              hand-added row can price an anchor as fully as an
                              imported one. The lender's own name for the anchor is
                              words, so it stays off the grid and rides on the
                              cell's tooltip and the row's settings sheet. */}
                          <td>
                            <div
                              className="lgr-well"
                              data-dirty={dirty.has("anchor") || dirty.has("anchor_margin") || undefined}
                              title={anchorTip(loan)}
                            >
                              <div className="lgr-pair">
                                {numField(loan, "anchor", "ריבית העוגן באחוזים", "0.00")}
                                {numField(loan, "anchor_margin", "מרווח מהעוגן באחוזים", "0.00")}
                              </div>
                            </div>
                          </td>

                          {/* --- תדירות שינוי, in months ---
                              A number, not a phrase: the interval is arithmetic and
                              the column is read alongside ריבית and עוגן, which are
                              also numbers. The words the documents use ("כל 5 שנים",
                              "עדכ':3 חודשים", "תדירות שינוי הריבית בחודשים") all
                              reduce to the same integer, and the human phrasing is
                              still derived from it for the database and the export.
                              Blank means the rate does not reset on a fixed cycle —
                              which the מסלול column already distinguishes between a
                              fixed rate and a variable one the document left open. */}
                          <td>
                            <div
                              className="lgr-well"
                              data-dirty={dirty.has("anchor_interval") || undefined}
                              title={freqTip(loan)}
                            >
                              <input
                                className="lgr-cell lgr-num-in"
                                type="number"
                                min={0}
                                step={1}
                                aria-label="תדירות שינוי הריבית, בחודשים"
                                placeholder="0"
                                value={loan.anchor_interval ?? ""}
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => setFreq(loan.id, e.target.value)}
                              />
                              {freqNote(loan) && <span className="lgr-note">{freqNote(loan)}</span>}
                            </div>
                          </td>

                          {/* --- חודשים (synced with the end date) --- */}
                          <td>
                            <div className="lgr-well" data-dirty={dirty.has("months") || undefined}>
                              <input
                                className="lgr-cell lgr-num-in"
                                type="number"
                                min={0}
                                aria-label="מספר חודשים"
                                data-state={noTerm ? "err" : undefined}
                                value={months || ""}
                                placeholder="0"
                                onFocus={(e) => e.currentTarget.select()}
                                onChange={(e) => setTerm(loan.id, Number(e.target.value))}
                              />
                              {months > 0 && <span className="lgr-note">{(months / 12).toFixed(1)} שנ׳</span>}
                            </div>
                          </td>

                          {/* --- תאריך סיום --- */}
                          <td>
                            <div className="lgr-well" data-dirty={dirty.has("loan_end_date") || undefined}>
                              <DateField
                                value={loan.loan_end_date ?? loan.end_date}
                                onChange={(iso) => setEnd(loan.id, iso)}
                                state={stale ? "warn" : undefined}
                                hint={months > 0 ? `${months} חודשים מהיום` : "בחירת תאריך תקבע גם את מספר החודשים"}
                              />
                            </div>
                          </td>

                          {/* --- החזר חודשי (calculated: no well, but a well's box
                              so the note underneath cannot move the figure) --- */}
                          <td>
                            <div className="lgr-paycell">
                              {noTerm ? (
                                <span
                                  className="flex flex-1 items-center justify-end gap-1 px-1 text-[11.5px] font-bold"
                                  style={{ color: "var(--neg)" }}
                                  title="לשורה יש יתרה אבל אין תקופה — הזינו חודשים או תאריך סיום"
                                >
                                  <Warning size={13} weight="fill" />
                                  חסרה תקופה
                                </span>
                              ) : (
                                <Money value={res.monthlyPayment} className="lgr-pay" style={{ color: "var(--ink)" }} />
                              )}
                              {(res.isIndexed || stale) && (
                                <span className="lgr-note lgr-note-pay">
                                  {stale && <span className="lgr-note-stale">תאריך עבר</span>}
                                  {res.isIndexed && <span>צמוד מדד</span>}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* --- actions --- */}
                          <td>
                            <div className="flex items-center justify-end gap-0.5 pe-0.5">
                              <Btn
                                className="lgr-act lgr-tip"
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
                              </Btn>
                              <Btn
                                className="lgr-act lgr-tip"
                                data-tip="לוח סילוקין"
                                onClick={() => onSchedule(loan)}
                                aria-label="לוח סילוקין של השורה"
                              >
                                <TableIcon size={14} />
                              </Btn>
                              <Btn
                                className="lgr-act lgr-tip"
                                data-danger="true"
                                data-armed={armed === loan.id || undefined}
                                data-tip={armed === loan.id ? "לחצו שוב לאישור" : "מחיקה"}
                                onClick={() => (armed === loan.id ? remove(loan.id) : setArmed(loan.id))}
                                onBlur={() => setArmed((a) => (a === loan.id ? null : a))}
                                aria-label={armed === loan.id ? "אישור מחיקה" : "מחיקת השורה"}
                              >
                                <Trash size={14} weight={armed === loan.id ? "fill" : "regular"} />
                              </Btn>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </Fragment>
                );
              })}

              {/* add a row from the bottom, so a long list never sends you back up */}
              <tr className="lgr-addrow">
                <td colSpan={11}>
                  <div className="lgr-addrow-in">
                    {addBtns()}
                    <span className="lgr-addrow-hint">הוספת שורה ריקה לתמהיל</span>
                  </div>
                </td>
              </tr>
            </tbody>
            </AnimatePresence>

            <tfoot>
              <tr>
                <td>
                  <span className="lgr-total-label">סה״כ</span>
                </td>
                <td>
                  <Money value={grand.amount} className="lgr-total-fig" />
                </td>
                <td colSpan={7}>
                  <div className="flex flex-wrap items-center gap-1.5 px-1">
                    {groups
                      .filter((g) => g.rows.length)
                      .map((g) => (
                        <span
                          key={g.key}
                          className="lgr-chip"
                          style={{
                            borderColor: FAMILY[g.key].line,
                            background: FAMILY[g.key].tint,
                            color: FAMILY[g.key].text,
                          }}
                        >
                          {FAM_ICON[g.key]}
                          {FAMILY[g.key].plural}
                          <span className="lgr-fig" style={{ opacity: 0.75 }}>
                            {grand.amount ? Math.round((g.amount / grand.amount) * 100) : 0}%
                          </span>
                        </span>
                      ))}
                  </div>
                </td>
                <td>
                  <Money value={grand.monthly} className="lgr-total-fig" hot />
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
