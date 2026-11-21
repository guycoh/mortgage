// עמלת פירעון מוקדם — what prepaying one debt costs, the way the law computes it.
//
// SOURCE: צו הבנקאות (עמלות פירעון מוקדם), התשס"ב-2002, as amended (last 2014;
// no 2024–2026 amendment found) — https://boi.org.il/media/qy5cow0l/116.pdf.
// It covers every loan "to buy a home or secured by a home", all-purpose
// mortgages included. Per track:
//
//   §3(1) עמלה תפעולית      ≤ ₪60, ONE per prepayment across all tracks repaid
//                           together (supervisor's letter 2021; fee rules h2791).
//   §3(2) אי מתן הודעה      0.1% of the amount when notice is under 10 days —
//                           not charged on the part a new loan from the SAME bank
//                           refinances. Avoidable by giving notice → not charged
//                           here; a caveat says to give it.
//   §3(3)–(5) הפרשי היוון   the remaining payments discounted at A (the BoI
//                           average rate now, for the remaining term) minus the
//                           same payments discounted at min(R, C) — R the loan's
//                           own rate, C the BoI average when it was given. Charged
//                           only when positive (§7(ב)–(ג): a negative result
//                           offsets the other fees, never pays out).
//   §4    variable tracks   counted only to the next possible reset, with the
//                           balance at the reset as the last payment; none at all
//                           when the reset dates are unknown (prime) or come
//                           yearly or more often; none on the reset day itself.
//   §5    מיצוע מדד         CPI-linked only, prepaying on days 1–15 of a month:
//                           amount × ½ × the average monthly CPI change of the
//                           last 12 indices. Avoidable by timing → not charged; a
//                           caveat quotes what it would be.
//   §8    seniority          regular loan: 20% off from 3 years, 30% from 5.
//
// A and C come from the BoI's own fee tables (fee-rates.json, built by
// scripts/automix-fee-rates.mts from mashfix.xls / pribmash.xls), by bucket of
// remaining term. They are effective annual rates and are applied as monthly
// (1+x)^(1/12) − 1; the supervisor's exact conversion method was not found, so
// every computed fee is an ESTIMATE and says so. A fee the document states
// (`prepayment_fee`, bank payoff letters) always wins.
//
// Consumer loans that are NOT secured by a home fall under a different regime
// (not researched to a primary source here): their fee is not estimated, and
// the proposal says to ask the lender for a payoff letter.

import { priceLoan, intervalOf, firstResetOf } from "@/app/aa102test/lib/price";
import { parseDate, startOfToday } from "@/app/aa102test/lib/dates";
import type { ImportedLoan } from "@/app/aa102test/lib/credit";
import rates from "./fee-rates.json";

export const OPERATIONAL_FEE = 60;
export const SENIORITY = [
  { fromYears: 5, off: 0.3 },
  { fromYears: 3, off: 0.2 },
];

type Table = { edges: (number | null)[]; rows: { effective: string; report: string | null; rates: number[] }[] };
const T = rates as unknown as { unlinked: Table; unlinkedOld: Table; linked: Table; linkedOld: Table };
// JSON turns Infinity into null.
const edgesOf = (t: Table) => t.edges.map((e) => (e === null ? Infinity : e));

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The BoI average rate (effective annual %) in force on `day` for a term of `months`, or null when the tables do not reach back. */
export function averageRate(linked: boolean, months: number, day: string): { rate: number; effective: string } | null {
  const tables = linked ? [T.linked, T.linkedOld] : [T.unlinked, T.unlinkedOld];
  for (const t of tables) {
    const row = t.rows.find((r) => r.effective <= day);
    if (!row) continue;
    const edges = edgesOf(t);
    const i = edges.findIndex((e) => months <= e);
    return { rate: row.rates[i < 0 ? row.rates.length - 1 : i], effective: row.effective };
  }
  return null;
}

/**
 * What a NEW fixed-rate housing loan of `months` costs today: the BoI's average
 * rate on the loans banks made in the newest report month, by bucket of term
 * (the same tables the fees use: mashfix.xls unlinked, pribmash.xls CPI-linked),
 * converted from effective annual to nominal, and interpolated linearly between
 * bucket midpoints (flat before the first and after the last). One spread on a
 * zero curve calibrated at ~20 years priced 4–10-year fixed money 0.4–0.8 points
 * below what banks actually lent at (audit 2026-11-21: 4-year קל"צ 3.87 vs 4.50).
 */
export function newFixedRate(linked: boolean, months: number): { rate: number; report: string | null } {
  const t = linked ? T.linked : T.unlinked;
  const row = t.rows[0];
  const mids: number[] = [];
  let lo = 0;
  for (const e of edgesOf(t)) {
    const hi = Number.isFinite(e) ? e : 360;
    mids.push((lo + hi) / 2);
    lo = hi;
  }
  // The newest three monthly tables, averaged: one month's buckets jump (the
  // linked 10–15y bucket read 3.59, 3.19 and 3.25 in Aug, Sep and Oct 2026).
  const recent = t.rows.slice(0, 3).filter((r) => r.rates.length === row.rates.length);
  const eff = row.rates.map((_, i) => recent.reduce((a, r) => a + r.rates[i], 0) / recent.length);
  // Then a curve that never falls with the term (pool adjacent violators): a
  // shorter fixed loan is not dearer than a longer one of the same kind; where a
  // bucket of few loans says otherwise, it is pooled with its neighbour.
  const blocks: { v: number; n: number }[] = [];
  for (const v of eff) {
    blocks.push({ v, n: 1 });
    while (blocks.length > 1 && blocks[blocks.length - 2].v > blocks[blocks.length - 1].v) {
      const b = blocks.pop()!;
      const a = blocks.pop()!;
      blocks.push({ v: (a.v * a.n + b.v * b.n) / (a.n + b.n), n: a.n + b.n });
    }
  }
  const fitted = blocks.flatMap((b) => Array(b.n).fill(b.v) as number[]);
  const nominal = fitted.map((e) => 1200 * (Math.pow(1 + e / 100, 1 / 12) - 1));
  let rate = nominal[nominal.length - 1];
  if (months <= mids[0]) rate = nominal[0];
  else
    for (let i = 1; i < mids.length; i++)
      if (months <= mids[i]) {
        const w = (months - mids[i - 1]) / (mids[i] - mids[i - 1]);
        rate = nominal[i - 1] + w * (nominal[i] - nominal[i - 1]);
        break;
      }
  return { rate, report: row.report };
}

/** The newest table row — the A every fee today is computed with. */
export const feeTableAsOf = () => ({ unlinked: T.unlinked.rows[0].effective, linked: T.linked.rows[0].effective });

const monthly = (effectiveAnnual: number) => Math.pow(1 + effectiveAnnual / 100, 1 / 12) - 1;
const pvAt = (pay: number[], r: number) => {
  let k = 1;
  let s = 0;
  for (const p of pay) {
    k /= 1 + r;
    s += p * k;
  }
  return s;
};

export type FeeQuote = {
  /** הפרשי היוון after the seniority discount, ₪. */
  fee: number;
  estimated: boolean;
  /** Why it is what it is — for DebtMove.why and the caveats. */
  basis: string;
  /** §5 מיצוע מדד if prepaid on days 1–15 — avoided by timing, quoted not charged. */
  cpiAveraging: number;
};

/** Average monthly CPI change over the last 12 indices, as a fraction (history.json: CPI y/y). */
let CPI_MONTHLY = 0;
export function setCpiMonthly(yoyPct: number | null) {
  CPI_MONTHLY = yoyPct === null ? 0 : Math.pow(1 + yoyPct / 100, 1 / 12) - 1;
}

export function prepaymentFee(l: ImportedLoan, today = startOfToday()): FeeQuote {
  const amount = Number(l.amount) || 0;
  const path = Number(l.path_id);
  const linked = path === 3 || path === 5;
  const cpiAveraging = linked ? Math.round(amount * 0.5 * CPI_MONTHLY) : 0;
  const stated = Number(l.prepayment_fee);
  if (l.prepayment_fee !== null && l.prepayment_fee !== undefined && Number.isFinite(stated) && stated >= 0)
    return { fee: Math.round(stated), estimated: false, basis: "הפרשי היוון כפי שנמסרו במכתב הבנק", cpiAveraging };
  const months = Math.round(Number(l.months) || 0);
  if (amount <= 0 || months <= 0) return { fee: 0, estimated: false, basis: "אין יתרה לפירעון", cpiAveraging: 0 };
  if (path === 1) return { fee: 0, estimated: false, basis: "מסלול פריים, ללא עמלת היוון (סעיף 4 לצו)", cpiAveraging };

  const start = l.source_start_date ? parseDate(l.source_start_date) : null;
  const elapsed = start && start < today ? (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth()) : null;

  // §4: a variable track counts only to its next possible reset.
  let horizon = months;
  let variable = false;
  if (path === 4 || path === 5) {
    const V = intervalOf(l as never);
    if (V <= 12) return { fee: 0, estimated: false, basis: "ריבית שמשתנה כל שנה או לעתים קרובות יותר, ללא עמלת היוון (סעיף 4 לצו)", cpiAveraging };
    horizon = Math.min(months, firstResetOf(l as never, V, today));
    variable = true;
  }

  // The remaining payments at the contract rate, in the loan's own units (real
  // shekels on a linked row): flat pricing with no CPI is exactly that schedule.
  const own = priceLoan({ ...l, months } as never, { inflation: 0, forecast: null });
  const pay = own.schedule.slice(0, horizon).map((x) => x.payment);
  if (variable && horizon < months) pay[horizon - 1] += own.schedule[horizon - 1].closingBalance;

  const A = averageRate(linked, horizon, iso(today));
  if (!A) return { fee: 0, estimated: true, basis: "טבלת הריבית הממוצעת של בנק ישראל אינה זמינה", cpiAveraging };
  const R = (Number(l.rate) || 0) / 1200;
  const origTerm = elapsed !== null ? elapsed + months : months;
  const C = start ? averageRate(linked, variable ? Math.min(origTerm, intervalOf(l as never)) : origTerm, iso(start)) : null;
  const rMin = C ? Math.min(R, monthly(C.rate)) : R;
  const raw = pvAt(pay, monthly(A.rate)) - pvAt(pay, rMin);
  const years = elapsed !== null ? elapsed / 12 : 0;
  const off = SENIORITY.find((s) => years >= s.fromYears)?.off ?? 0;
  const fee = Math.max(0, Math.round(raw * (1 - off)));
  const parts = [
    `ממוצע בנק ישראל היום ${A.rate.toFixed(2)}%`,
    C ? `ביום נטילת ההלוואה ${C.rate.toFixed(2)}%` : "ממוצע יום הנטילה לא ידוע, וחושב לפי ריבית החוזה",
    `ריבית ההלוואה ${(Number(l.rate) || 0).toFixed(2)}%`,
    off ? `הנחת ותק ${Math.round(off * 100)}%` : "",
    variable ? `עד מועד שינוי הריבית בעוד ${horizon} חודשים` : "",
  ].filter(Boolean);
  return { fee, estimated: true, basis: `הערכה לפי הצו: ${parts.join(", ")}`, cpiAveraging };
}
