// עמלת פירעון מוקדם — what prepaying one debt costs, the way the law computes it.
//
// SOURCE: צו הבנקאות (פירעון מוקדם של הלוואה לדיור), התשס"ב-2002 (named
// "(עמלות פירעון מוקדם)" until the 2014 amendment, ק"ת 7415; no later amendment
// found) — https://boi.org.il/media/qy5cow0l/116.pdf. It covers every loan "to
// buy a home or secured by a home", all-purpose mortgages included. Per track:
//
//   §2    הלוואה מוכוונת    no fee of any kind on a directed (eligibility) loan.
//   §3(1) עמלה תפעולית      ≤ ₪60, ONE per prepayment across all tracks repaid
//                           together (supervisor's letter 2021; fee rules h2791).
//   §3(2) אי מתן הודעה      0.1% of the amount when notice is under 10 days —
//                           not charged on the part a new loan from the SAME bank
//                           refinances. Avoidable by giving notice → not charged
//                           here; a caveat says to give it.
//   §3(3)–(5) הפרשי היוון   the Second Schedule's formula: the remaining payments
//                           B_i "per the loan's terms" discounted at A minus the
//                           same payments discounted at R (§3(3)) or at C (§3(4)),
//                           the bank charging the lower of the two (§3(5)) — so
//                           the comparison rate is min(R, C). A is the average in
//                           force on the prepayment day ("הריבית האחרונה הידועה",
//                           §1), C the one in force when the loan was given, R
//                           the loan's own periodic rate. Charged only when
//                           positive (§7(ב)–(ג): a negative result offsets the
//                           other fees, never pays out).
//   §4    variable tracks   counted only to the next possible change, with the
//                           balance then as the last payment; none at all when
//                           the change dates are unknown (prime) or come yearly
//                           or more often; C is the average when the rate last
//                           changed (§4(4)).
//   §5    מיצוע מדד         CPI-linked only, prepaying on days 1–15 of a month:
//                           amount × ½ × the average monthly CPI change of the
//                           last 12 indices. Avoidable by timing → not charged; a
//                           caveat quotes what it would be.
//   §7(א) which average     the bucket of the term left to the final payment, or
//                           on a variable track to the day before the next change.
//   §8    seniority          regular loan: 20% off from 3 years after it was
//                           given, 30% from 5 (a supplementary loan, §8(א), gets
//                           10–40% from year 1; a row cannot say it is one).
//
// A and C come from the BoI's own fee tables (fee-rates.json, built by
// scripts/automix-fee-rates.mts from mashfix.xls / pribmash.xls). The tables are
// effective annual rates; the order's formula wants periodic ones. The banks'
// letters show how they are stated (READING below): the published rate at 2
// decimals, its monthly-compounded nominal equivalent (the BoI file's own
// converter, "for a loan repaid monthly") at 2 decimals, divided by 12. Read
// that way the table reproduces the A printed on 73 of 73 parts (Leumi, Mizrahi,
// Jerusalem), the C printed on 51 of 51 (Mizrahi, Jerusalem), and Mizrahi's and
// Jerusalem's fee within ₪1 on every fixed-rate part they print (bar a 2009
// supplementary loan, §8(א)) and on 9 of their 15 variable ones.
//
// What it computes is the most the order allows. On fixed tracks it runs 3–13%
// above Leumi's figure and 12–26% above Hapoalim's (2024–2026 letters), for a
// reason their letters do not show; FEE_BAND carries that spread, and every
// computed fee is an ESTIMATE that says so. A fee the document states
// (`prepayment_fee`, bank payoff letters) always wins.
//
// Consumer loans that are NOT secured by a home fall under a different regime
// (not researched to a primary source here): their fee is not estimated, and
// the proposal says to ask the lender for a payoff letter.

import { priceLoan, intervalOf, firstResetOf } from "@/app/aa102test/lib/price";
import { parseDate, startOfToday, addMonths, monthsBetween } from "@/app/aa102test/lib/dates";
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

/**
 * The BoI average rate (effective annual %) in force on `day` for a term of
 * `months`, or null when the tables do not reach back. In force = the newest row
 * whose effective date is on or before the day: the C printed on 51 letter parts
 * is the row in force on the day the loan was given, never the row whose REPORT
 * month is that month (0 of 51). A term on a bucket's edge belongs to it (300
 * months is 20–25 years), as the printed C of four 300- and 180-month parts shows.
 */
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
 * What banks lent fixed-rate housing money at in month `ym` (YYYY-MM) for an
 * original term of `months`: the BoI average-rate table whose REPORT month is
 * `ym` (the loans made that month), effective annual %. A table up to two
 * months older stands in when that month's is missing; null beyond that.
 * Used to read a client's own record term for term (tiers.ts pricingRecord):
 * the all-term monthly average sits 0.3 to 0.4 points under a 25-year loan.
 */
export function averageRateIn(linked: boolean, months: number, ym: string): number | null {
  const tables = linked ? [T.linked, T.linkedOld] : [T.unlinked, T.unlinkedOld];
  const back = (a: string) => (Number(ym.slice(0, 4)) - Number(a.slice(0, 4))) * 12 + (Number(ym.slice(5, 7)) - Number(a.slice(5, 7)));
  for (const t of tables) {
    const row = t.rows.find((r) => r.report && r.report.slice(0, 7) <= ym);
    if (!row || !row.report || back(row.report) > 2) continue;
    const edges = edgesOf(t);
    const i = edges.findIndex((e) => months <= e);
    return row.rates[i < 0 ? row.rates.length - 1 : i];
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

/**
 * How the order's rates are stated and compared. Each field is a choice the
 * letters settle; scripts/automix-fees-check.mts prints what each alternative
 * does to the error. READING is the one the evidence picks.
 */
export type FeeReading = {
  /** A and C at 2 decimals, the way the letters print them (effective rate, then its nominal equivalent) — or at full precision. */
  published: boolean;
  /** Effective annual → periodic: (1+e)^(1/12) − 1 ("effective", the BoI converter), or e / 12 ("nominal"). */
  conversion: "effective" | "nominal";
  /** C on a variable track: the average when the rate last changed (§4(4)), or when the loan was given. */
  cOnVariable: "lastChange" | "given";
  /** C's bucket on a fixed track: the original term (day given → final payment), or months elapsed + months left. */
  cTerm: "original" | "elapsedPlusLeft";
  /** The payments are compared at the lower of R and C (§3(5)), at R (§3(3)) or at C (§3(4)). */
  compareAt: "lower" | "contract" | "given";
  /** §8 seniority discount. */
  seniority: boolean;
  /**
   * §4's n: the calendar months to the change day (firstResetOf), or the
   * payments due up to and including it — one more when a payment falls due
   * later this month. Jerusalem and Mizrahi count the latter, Leumi and Hapoalim
   * the former; on the 2024–2026 letters the calendar count errs less overall.
   */
  toChange: "calendarMonths" | "payments";
};

export const READING: FeeReading = {
  published: true,
  conversion: "effective",
  cOnVariable: "lastChange",
  cTerm: "original",
  compareAt: "lower",
  seniority: true,
  toChange: "calendarMonths",
};

const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * A table rate as the periodic (monthly) rate the formula discounts at. Leumi
 * prints its A as "ריבית להיוון 4.39%" for a table rate of 4.4818% effective:
 * 4.48 → 12·(1.0448^(1/12) − 1) = 4.3896 → 4.39. Mizrahi prints both steps
 * (A 3.48%, "מתואמת" 3.54%; C 3.56%, 3.62%), Jerusalem the nominal one.
 */
function periodic(effective: number, reading: FeeReading): number {
  const e = reading.published ? round2(effective) : effective;
  const annual = reading.conversion === "nominal" ? e : 1200 * (Math.pow(1 + e / 100, 1 / 12) - 1);
  return (reading.published ? round2(annual) : annual) / 1200;
}

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
  /**
   * On an estimated fee above zero: where the fee the bank prints is likely to
   * fall, ₪ — the estimate times FEE_BAND's low and high for the track. Absent
   * on a stated fee and on a zero estimate (see FEE_BAND for how often a zero
   * estimate meets a printed fee).
   */
  band?: { low: number; high: number };
};

/**
 * How far the fee a bank prints sits from this estimate, per track: printed ÷
 * estimate, its 10th and 90th percentile and median, over the letter parts and
 * Hapoalim loans whose estimate is ₪100 or more, with each row read the way a
 * credit report carries it (balance, rate, months left, schedule, the day given
 * and the final payment; no reset date or interval, no principal/indexation
 * split, no printed fee). Measured by scripts/automix-fees-check.mts on 45 bank
 * letters dated 2024-09 to 2026-11, each fee estimated as of its letter's date.
 *
 * The band is the error the engine runs with on a credit report. A break-even
 * test that must hold whatever the bank prints runs on fee × hi; one that asks
 * whether a move can pay at all runs on fee × lo. Edges are rounded outward.
 * Out of sample (each letter's band rebuilt from the other 44) it held 45 of 63
 * held-out ratios, 71% where a 10–90 band aims at 80%: with 11–22 ratios a
 * track, its edges are themselves uncertain.
 *
 * Fixed tracks sit at or just under 1: the estimate is the order's maximum,
 * Mizrahi and Jerusalem charge it to the shekel, Leumi and Hapoalim charge less.
 * Variable tracks sit well under 1 and scatter, because a report does not say
 * when the rate next changes: the estimate assumes the 5-year calendar counted
 * from the day the loan was given, and most of these letters' unlinked tracks
 * change every 24–36 months, so the estimate runs too far (and a yearly track,
 * which owes nothing, gets a fee).
 */
export const FEE_BAND = {
  measured: "2026-11-23",
  kz: { n: 22, lo: 0.87, median: 0.96, hi: 1.01 },
  klz: { n: 11, lo: 0.96, median: 1.0, hi: 1.01 },
  mz: { n: 15, lo: 0.07, median: 0.69, hi: 1.0 },
  mlz: { n: 15, lo: 0.15, median: 0.51, hi: 1.04 },
} as const;

const BAND_OF: Record<number, { lo: number; hi: number } | undefined> = { 2: FEE_BAND.klz, 3: FEE_BAND.kz, 4: FEE_BAND.mlz, 5: FEE_BAND.mz };

/** Average monthly CPI change over the last 12 indices, as a fraction (history.json: CPI y/y). */
let CPI_MONTHLY = 0;
export function setCpiMonthly(yoyPct: number | null) {
  CPI_MONTHLY = yoyPct === null ? 0 : Math.pow(1 + yoyPct / 100, 1 / 12) - 1;
}

const calendarMonths = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

/**
 * The next day a variable track's rate may change, as firstResetOf (price.ts)
 * reads it: the date a letter prints, else the opening date's phase in the
 * cycle, else one interval out (a re-tracked row is a new loan).
 */
function nextChange(l: ImportedLoan, V: number, given: Date | null, asOf: Date): Date {
  if (l.reset_fresh) return addMonths(asOf, V);
  const next = l.next_reset ? parseDate(l.next_reset) : null;
  if (next && next > asOf) return next;
  if (given) {
    const elapsed = calendarMonths(given, asOf);
    return addMonths(given, elapsed + (V - (elapsed % V) || V));
  }
  return addMonths(asOf, V);
}

/**
 * הפרשי היוון of one row as of `today` (the prepayment day: a letter's own date
 * when checking it, today when deciding now). `reading` is there for the proof
 * script's alternatives; the engine always runs READING.
 */
export function prepaymentFee(l: ImportedLoan, today = startOfToday(), reading: FeeReading = READING): FeeQuote {
  const amount = Number(l.amount) || 0;
  const path = Number(l.path_id);
  const linked = path === 3 || path === 5;
  const cpiAveraging = linked ? Math.round(amount * 0.5 * CPI_MONTHLY) : 0;
  const stated = Number(l.prepayment_fee);
  if (l.prepayment_fee !== null && l.prepayment_fee !== undefined && Number.isFinite(stated)) {
    // A letter prints the difference even when it is negative (Mizrahi: −42.20 and
    // −33.10 on two parts whose comparison rate sits under today's average): the
    // borrower owes nothing then (§7(ב)), and that is the letter's figure, not an
    // estimate.
    if (stated < 0) return { fee: 0, estimated: false, basis: "הפרשי היוון שליליים לפי מכתב הבנק, ולכן אין עמלת היוון (סעיף 7(ב) לצו)", cpiAveraging };
    return { fee: Math.round(stated), estimated: false, basis: "הפרשי היוון כפי שנמסרו במכתב הבנק", cpiAveraging };
  }
  const months = Math.round(Number(l.months) || 0);
  if (amount <= 0 || months <= 0) return { fee: 0, estimated: false, basis: "אין יתרה לפירעון", cpiAveraging: 0 };
  if (l.source_eligibility) return { fee: 0, estimated: false, basis: "הלוואה מוכוונת (זכאות), ללא עמלת פירעון מוקדם כלשהי (סעיף 2 לצו)", cpiAveraging: 0 };
  if (path === 1) return { fee: 0, estimated: false, basis: "מסלול פריים, ללא עמלת היוון (סעיף 4 לצו)", cpiAveraging };

  const start = l.source_start_date ? parseDate(l.source_start_date) : null;
  const given = start && start < today ? start : null;
  const end = parseDate(l.loan_end_date ?? l.end_date ?? null);

  // §4: a variable track counts only to its next possible change, the balance
  // after the payment due on that day being the last payment. A track that
  // follows the Bank of Israel rate (a credit report names the anchor) changes
  // on days nobody knows in advance, like prime: §4(2), no capitalisation fee.
  let horizon = months;
  let V = 0;
  let change: Date | null = null;
  if (path === 4 || path === 5) {
    if (/ריבית\s*בנק\s*ישראל|פריים/.test(l.source_anchor ?? "") && !/עוגן|אג"?ח/.test(l.source_anchor ?? ""))
      return { fee: 0, estimated: false, basis: "ריבית שצמודה לריבית בנק ישראל ומשתנה במועדים שאינם ידועים מראש, ללא עמלת היוון (סעיף 4 לצו)", cpiAveraging };
    V = intervalOf(l as never);
    if (V <= 12) return { fee: 0, estimated: false, basis: "ריבית שמשתנה כל שנה או לעתים קרובות יותר, ללא עמלת היוון (סעיף 4 לצו)", cpiAveraging };
    change = nextChange(l, V, given, today);
    const n = reading.toChange === "payments" ? calendarMonths(today, change) + (today.getDate() < change.getDate() ? 1 : 0) : firstResetOf(l as never, V, today);
    horizon = Math.max(1, Math.min(months, n));
  }
  const variable = V > 0;

  // B_i: the remaining payments at the contract rate, in the loan's own units
  // (real shekels on a linked row) — flat pricing with no CPI is exactly that.
  const own = priceLoan({ ...l, months } as never, { inflation: 0, forecast: null });
  const pay = own.schedule.slice(0, horizon).map((x) => x.payment);
  if (variable && horizon < months) pay[horizon - 1] += own.schedule[horizon - 1].closingBalance;

  // §7(א): A by the months left (to the change, on a variable track).
  const A = averageRate(linked, horizon, iso(today));
  if (!A) return { fee: 0, estimated: true, basis: "טבלת הריבית הממוצעת של בנק ישראל אינה זמינה", cpiAveraging };
  const R = (Number(l.rate) || 0) / 1200;

  // C: the average in force on the day the loan was given — on a variable track
  // the day its rate last changed — by the bucket of the term the loan was given
  // for: the original term, or the period to the next change. The original term
  // is whole months from the day given to the final payment: counted that way it
  // puts the printed C of four 300- and 180-month parts in their bucket, where
  // calendar months put them one bucket up.
  let C: { rate: number; effective: string } | null = null;
  if (given) {
    const term = end && reading.cTerm === "original" ? monthsBetween(given, end) : monthsBetween(given, today) + months;
    let cDay = given;
    if (change && reading.cOnVariable === "lastChange") {
      let last = addMonths(change, -V);
      while (last > today) last = addMonths(last, -V);
      if (last > given) cDay = last;
    }
    C = averageRate(linked, variable ? Math.min(term, V) : term, iso(cDay));
  }
  const a = periodic(A.rate, reading);
  const c = C ? periodic(C.rate, reading) : null;
  // Without the day given (or a table that far back) only §3(3) can be
  // computed: the payments compared at R, the higher of the bank's two choices.
  const base = reading.compareAt === "contract" || c === null ? R : reading.compareAt === "given" ? c : Math.min(R, c);
  const raw = pvAt(pay, a) - pvAt(pay, base);
  // §8: counted from the day the loan was given, also on a variable track whose
  // rate has changed since (Mizrahi takes 30% off parts given in 2019 and 2021
  // whose rate last changed in 2024 and 2026).
  const years = given && reading.seniority ? monthsBetween(given, today) / 12 : 0;
  const off = SENIORITY.find((s) => years >= s.fromYears)?.off ?? 0;
  const fee = Math.max(0, Math.round(raw * (1 - off)));
  const parts = [
    `ממוצע בנק ישראל היום ${(a * 1200).toFixed(2)}%`,
    c !== null ? `ביום ${variable ? "קביעת הריבית האחרונה" : "נטילת ההלוואה"} ${(c * 1200).toFixed(2)}%` : "ממוצע יום הנטילה לא ידוע, וחושב לפי ריבית החוזה",
    `ריבית ההלוואה ${(Number(l.rate) || 0).toFixed(2)}%`,
    off ? `הנחת ותק ${Math.round(off * 100)}%` : "",
    variable ? `עד מועד שינוי הריבית בעוד ${horizon} חודשים` : "",
  ].filter(Boolean);
  const k = BAND_OF[path];
  return {
    fee,
    estimated: true,
    basis: `הערכה לפי הצו: ${parts.join(", ")}`,
    cpiAveraging,
    // Measured with the day given known; without it the fee is §3(3)'s, the
    // higher of the two the bank chooses between, and no band describes it.
    ...(fee > 0 && k && c !== null ? { band: { low: Math.round(fee * k.lo), high: Math.round(fee * k.hi) } } : {}),
  };
}
