// Pricing a row — the one function every figure on the board goes through.
//
// TWO ASSUMPTION SETS, ONE RESULT SHAPE.
//
//   · flat      — the board's old behaviour, untouched: the rate as typed for the
//                 life of the loan, CPI at one annual % (calculateLoan). Kept as
//                 the explicit "אינפלציה קבועה" mode and as what a bare number
//                 means everywhere a caller still passes one (/hachamsim does).
//   · forecast  — directive 451, as SmartNPV runs it: prime follows the BoI
//                 forward curve every month, a bond-anchored track resets to the
//                 forward anchor of each window, a צמוד track is indexed month
//                 by month along expected CPI. See lib/forecast for the curves
//                 and for how the rules were proved against SmartNPV.
//
// The forecast engine returns the same LoanResult the flat one does — nominal
// payment/principal/interest/opening/closing per month — so the grid, charts,
// comparison, schedule modal, export and yield maths read either without
// knowing which ran. Two extra arrays ride along for the charts: the rate each
// month was priced at, and the cumulative index factor.

import {
  calculateLoan,
  type Loan,
  type LoanResult,
  type ScheduleRow,
} from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import type { CombinedRow, MixFullTotals } from "@/app/private/crm/leads/simulators/components/calculate/mixScheduleCalculators";
import { freqMonths } from "@/lib/rate-frequency";
import { bondAnchor, indexFactor, marketAnchorAt, nominalAt, type Forecast } from "./forecast";
import { parseDate, startOfToday } from "./dates";
import { primeAt } from "./boi";

/** The board's economic assumptions. `forecast: null` is the flat mode. */
export type Econ = { inflation: number; forecast: Forecast | null };

/** What callers pass: an Econ, or — the old signature — a bare inflation %. */
export type Assume = number | Econ;

export const asEcon = (a: Assume): Econ => (typeof a === "number" ? { inflation: a, forecast: null } : a);

/** BoI rate → prime. Fixed by banking practice since 1997. */
export const PRIME_SPREAD = 1.5;

export type PricedLoan = LoanResult & {
  /** Annual % the month was priced at (flat mode: the typed rate throughout). */
  rates: number[];
  /** Cumulative CPI factor at the END of each month (1 on an unlinked row). */
  index: number[];
};

/* ----------------------------------------------------------- track rules */

type Track = "prime" | "fixed" | "bond_nominal" | "bond_real";

/** Path ids are the static five in app/data/paths: 1 פריים · 2 קל"צ · 3 ק"צ · 4 מל"צ · 5 מ"צ. */
function trackOf(pathId: number): Track {
  if (pathId === 1) return "prime";
  if (pathId === 4) return "bond_nominal";
  if (pathId === 5) return "bond_real";
  return "fixed";
}

const isLinkedPath = (pathId: number) => pathId === 3 || pathId === 5;

type Extra = Loan & {
  anchor?: number | null;
  anchor_margin?: number | null;
  anchor_interval?: number | null;
  change_frequency?: string | null;
  source_start_date?: string;
  next_reset?: string | null;
  reset_fresh?: boolean;
  anchor_asof?: string;
  built_in_margin?: number;
  loan_end_date?: string | null;
  end_date?: string | null;
};

/**
 * The month a row's schedule starts from — its OWN "today": תאריך סיום less the
 * payments left. On an imported row that is the document's date (the import
 * counts the term from it), on a row typed in today it is today.
 *
 * Every calendar fact about a row — when its rate resets, when it was last
 * fixed — must be counted from here, because the schedule's month 1 is the
 * month after this one. Counting from the wall clock instead slid every reset
 * earlier by the letter's age: a 2024 letter viewed in 2026 had resets that
 * had "already passed" and were pushed a whole interval out, so the board
 * priced years at the old rate (Mercantile 08/09/2024: ריבית והצמדה ₪10,800
 * under SmartNPV, which counts from the letter's date; Leumi 25/09/2024: ₪24,000
 * under). Even a fresh letter lost a month whenever the calendar turned
 * between the letter and the import.
 */
export function frameOf(l: Extra, fallback = startOfToday()): Date {
  const end = parseDate(l.loan_end_date ?? l.end_date ?? null);
  const n = Math.round(Number(l.months) || 0);
  if (!end || !(n > 0)) return fallback;
  return new Date(end.getFullYear(), end.getMonth() - n, Math.min(end.getDate(), 28));
}

/** Months between rate resets on a bond track. 60 when nothing says — the market's default. */
export function intervalOf(l: Extra): number {
  const n = Number(l.anchor_interval);
  if (Number.isFinite(n) && n > 0) return Math.round(n);
  return freqMonths(l.change_frequency) ?? 60;
}

/**
 * Months until the FIRST reset, counted from the row's own frame (frameOf) —
 * 451's `s`.
 *
 * A new proposal track resets one full interval out. A debt the client already
 * carries resets when its own calendar says: the bank letter's next-reset date
 * when one was printed, else the opening date's phase in the cycle. Without
 * either, it is treated as new — the only assumption that invents nothing.
 */
export function firstResetOf(l: Extra, V: number, today = frameOf(l)): number {
  // Calendar months, not elapsed days: a reset dated 01/02/2031 seen from
  // 08/10/2026 leaves 52 payments at the old rate (Nov 2026 … Feb 2031) and the
  // new one is first paid in March — SmartNPV's schedule moves at month 53.
  const calMonths = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  // Re-tracked on the board: a new loan, whatever the document said.
  if (l.reset_fresh) return V;
  const next = l.next_reset ? parseDate(l.next_reset) : null;
  if (next) {
    const s = calMonths(today, next);
    if (s > 0) return s;
  }
  const start = l.source_start_date ? parseDate(l.source_start_date) : null;
  if (start && start < today) {
    const elapsed = calMonths(start, today);
    const s = V - (elapsed % V);
    return s === 0 ? V : s;
  }
  return V;
}

/**
 * How far a typed anchor may sit from the market's own anchor and still be read
 * as that anchor. SmartNPV's board typed 1.76% against a curve 1.78% — the same
 * thing, a day apart. Mizrahi's letter prints 3.46% for a CPI-linked 5-year
 * anchor the market put at 1.73% — whatever that is, it is not the BoI curve,
 * and adding the curve's future to it would price a different mortgage.
 */
const ANCHOR_TOLERANCE = 0.5;

/**
 * The calendar month the row's current rate was fixed in ("2023-05"), or null
 * when it is being fixed now — a new track, a re-tracked row, a debt whose
 * calendar the document did not give. One reset interval before the next one.
 */
export function lastResetYm(l: Extra, V: number, today = frameOf(l)): string | null {
  if (l.reset_fresh) return null;
  const ym = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  // The rate a document prints was fixed one interval before the change it
  // announces — even when that change has since passed: a letter dated before
  // its own reset still shows the old period's anchor and rate.
  const next = l.next_reset ? parseDate(l.next_reset) : null;
  if (next) {
    const at = new Date(next.getFullYear(), next.getMonth() - V, 1);
    return at < thisMonth ? ym(at) : null;
  }
  const s = firstResetOf(l, V, today);
  if (s >= V) return null;
  return ym(new Date(today.getFullYear(), today.getMonth() + s - V, 1));
}

/**
 * The anchor the row's current rate was set against: the market's, in the month
 * the bank last fixed it (BoI zero yields, see marketAnchorAt), or today's curve
 * for a rate being fixed now or when the history does not reach back that far.
 */
function referenceAnchor(l: Extra, f: Forecast, V: number, real: boolean): number {
  // A refreshed anchor (עדכון עוגנים) is today's value by definition, whatever
  // the row's own calendar says about when the bank last fixed it.
  const ym = l.anchor_asof ? null : lastResetYm(l, V);
  const then = ym ? marketAnchorAt(f, ym, V, real) : null;
  return then ?? bondAnchor(f, 0, V, real);
}

/**
 * A bond track's anchor, read against the market of the day it was fixed.
 *
 * `builtIn` is what the lender folded into the anchor it prints: Mizrahi-Tefahot
 * moved part of every pre-2023 borrower's margin into its "עוגן אג"ח" when the
 * מקורות anchor was retired in 2011 (its "תוספת מיכונית"), so its letter shows,
 * say, anchor 1.76 + margin 1.00 on a rate set when the market anchor was 1.13
 * — the margin the bank actually charges over the market is 1.63. SmartNPV
 * names the same thing and resets on the full margin. Zero when the printed
 * anchor is the market's (within ANCHOR_TOLERANCE) or below it.
 */
export function anchorReading(l: Loan, f: Forecast): { market: number; builtIn: number; margin: number } | null {
  const x = l as Extra;
  const track = trackOf(Number(x.path_id));
  if (track !== "bond_nominal" && track !== "bond_real") return null;
  const V = intervalOf(x);
  const rate = Number(x.rate) || 0;
  const typed = Number(x.anchor);
  const hasTyped = x.anchor !== null && x.anchor !== undefined && Number.isFinite(typed) && typed !== 0;
  // Settled on import against the letter's own projection (lib/builtin): the
  // exact figure, where the history below can only estimate it.
  const settled = Number(x.built_in_margin);
  if (hasTyped && x.built_in_margin !== undefined && Number.isFinite(settled))
    return { market: typed - settled, builtIn: settled, margin: rate - typed + settled };
  const market = referenceAnchor(x, f, V, track === "bond_real");
  // ABOVE the market by more than noise: margin the lender folded into the
  // anchor, so the spread the bank charges is measured from the market.
  if (hasTyped && typed - market > ANCHOR_TOLERANCE) return { market, builtIn: typed - market, margin: rate - market };
  // At the market, or BELOW it: the printed margin stands. Lenders hide margin
  // inside an anchor, never the reverse — an anchor well under the market of
  // the month we date it to is an older reading (a credit report's origination
  // anchor, a letter printed before its reset), and the contractual margin
  // beside it is still the one thing about the row that does not move.
  if (hasTyped) return { market, builtIn: 0, margin: rate - typed };
  return { market, builtIn: 0, margin: rate - market };
}

/**
 * The spread over the anchor the row keeps for life.
 *
 * PRIME: the stated margin (a prime margin is printed on most letters and means
 * one thing). Where none is printed, the rate less the prime IN FORCE ON THE
 * ROW'S OWN DATE (BoI's policy-rate history, lib/boi): a Leumi letter of
 * 16/02/2025 prints its prime parts at 6.00 with no margin — prime was 6.00 that
 * day, so the margin is 0. Measured against today's forward prime (4.65) it read
 * as +1.35, and ₪84,000 of ריבית והצמדה appeared that SmartNPV does not show.
 * Past the history's reach, whatever puts month 1 at the typed rate.
 *
 * BOND TRACKS: the spread the rate was SET at, kept for life, so every reset is
 * the window's forward anchor + that spread (owner's rule, 2026-10-10: the bank's
 * margin does not move, the anchor does). It is read against the market anchor
 * of the month the rate was fixed (see anchorReading): a printed anchor at or
 * below that market keeps its printed margin; one well ABOVE it carries margin
 * the lender folded in, and the spread is measured from the market instead. A
 * rate being fixed now is read against today's curve. Either way month 1 is the
 * rate the advisor typed.
 *
 * Until 2026-11 the yardstick was always TODAY's curve. Right for a rate set
 * lately; wrong for one set years ago — a 2021 CPI-linked track at −1.08 + 3.05
 * was priced on a 0.07 margin, and a 2013 Mizrahi track whose 1.76 anchor hides
 * 0.7 of margin happened to sit near today's 1.9 and lost the 0.7.
 */
function marginOf(l: Extra, f: Forecast, track: Track, V: number): number {
  const rate = Number(l.rate) || 0;
  if (track === "prime") {
    const stated = Number(l.anchor_margin);
    if (l.anchor_margin !== null && l.anchor_margin !== undefined && Number.isFinite(stated)) return stated;
    const then = primeAt(frameOf(l));
    if (then !== null) return Math.round((rate - then) * 100) / 100;
    return rate - (nominalAt(f, 1) + PRIME_SPREAD);
  }
  return anchorReading(l, f)!.margin;
}

/** The annual rate for every month of the row's life. */
export function ratePath(l: Extra, f: Forecast, n: number): number[] {
  const track = trackOf(Number(l.path_id));
  const typed = Number(l.rate) || 0;
  if (track === "fixed") return Array(n).fill(typed);
  const V = intervalOf(l);
  const margin = marginOf(l, f, track, V);
  if (track === "prime") {
    return Array.from({ length: n }, (_, i) => nominalAt(f, i + 1) + PRIME_SPREAD + margin);
  }
  const real = track === "bond_real";
  const s = firstResetOf(l, V);
  const out: number[] = [];
  let current = typed;
  for (let m = 1; m <= n; m++) {
    if (m > s && (m - s - 1) % V === 0) current = bondAnchor(f, m - 1, V, real) + margin;
    out.push(current);
  }
  return out;
}

/* ---------------------------------------------------------------- engine */

const annuity = (balance: number, r: number, months: number) =>
  months <= 0 ? balance : r === 0 ? balance / months : (balance * r) / (1 - Math.pow(1 + r, -months));

/**
 * The forecast schedule. Works in REAL shekels (today's money) and states every
 * row in nominal ones: the balance is indexed into this month, the payment is
 * the real annuity grown by the index so far. On an unlinked row the index is
 * 1 throughout and real = nominal. A rate change re-amortises the remaining
 * real balance over the remaining months — exactly what a bank does on a reset.
 *
 * Grace runs first (full, then partial), the same sequence the flat engine
 * implements; balloons pay interest only (3) or accrue everything (4).
 */
function forecastSchedule(l: Extra, f: Forecast): PricedLoan {
  const n = Math.max(0, Math.round(Number(l.months) || 0));
  const P = Number(l.amount) || 0;
  const linked = isLinkedPath(Number(l.path_id));
  const rates = ratePath(l, f, n);
  const sched = Number(l.amortization_schedule_id) || 1;

  const legacyType = l.grace_type_id ?? 1;
  const legacyMonths = Math.max(Math.floor(l.grace_months ?? 0), 0);
  const wantFull = Math.max(Math.floor(l.grace_full_months ?? (legacyType === 3 ? legacyMonths : 0)), 0);
  const wantPartial = Math.max(Math.floor(l.grace_partial_months ?? (legacyType === 2 ? legacyMonths : 0)), 0);
  const room = n > 1 ? n - 1 : 0;
  const gPartial = sched <= 2 ? Math.min(wantPartial, room) : 0;
  const gFull = sched <= 2 ? Math.min(wantFull, room - gPartial) : 0;
  const g = gFull + gPartial;

  const schedule: ScheduleRow[] = [];
  const index: number[] = [];
  let real = P;
  let cum = 1;
  let pmtReal = 0;
  let lastRate = NaN;
  let equalPrincipal = 0;

  for (let m = 1; m <= n; m++) {
    const cumPrev = cum;
    if (linked) cum *= indexFactor(f, m);
    const r = rates[m - 1] / 12 / 100;
    const opening = real;
    const interestReal = opening * r;
    let principalReal = 0;
    let paymentReal = 0;

    if (m <= g) {
      if (m <= gFull) {
        // Nothing paid; interest joins the balance — a negative principal keeps
        // paid = principal + interest true across the whole schedule.
        principalReal = -interestReal;
        paymentReal = 0;
      } else {
        paymentReal = interestReal;
      }
    } else if (sched === 3) {
      principalReal = m === n ? opening : 0;
      paymentReal = interestReal + principalReal;
    } else if (sched === 4) {
      principalReal = m === n ? opening + interestReal : -interestReal;
      paymentReal = m === n ? opening + interestReal : 0;
    } else if (sched === 2) {
      if (m === g + 1) equalPrincipal = opening / (n - g);
      principalReal = Math.min(equalPrincipal, opening);
      paymentReal = principalReal + interestReal;
    } else {
      if (m === g + 1 || rates[m - 1] !== lastRate) pmtReal = annuity(opening, r, n - m + 1);
      paymentReal = pmtReal;
      principalReal = paymentReal - interestReal;
    }
    lastRate = rates[m - 1];
    real = Math.max(opening - principalReal, 0);
    if (m === n) real = 0;

    schedule.push({
      month: m,
      payment: paymentReal * cum,
      principal: principalReal * cum,
      interest: interestReal * cum,
      openingBalance: opening * cumPrev,
      closingBalance: real * cum,
    });
    index.push(cum);
  }

  let totalPrincipal = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  let maxMonthlyPayment = 0;
  for (const row of schedule) {
    totalPrincipal += row.principal;
    totalInterest += row.interest;
    totalPaid += row.payment;
    maxMonthlyPayment = Math.max(maxMonthlyPayment, row.payment);
  }
  return {
    amortization_schedule_id: sched,
    monthlyPayment: sched === 4 ? 0 : schedule[0]?.payment ?? 0,
    maxMonthlyPayment,
    totalPrincipal,
    totalInterest,
    totalPaid,
    isIndexed: linked,
    schedule,
    rates,
    index,
  };
}

/**
 * Month 1's payment in TODAY's money: the schedule's first payment without the
 * month of CPI the engine has already grown it by on a צמוד row.
 *
 * It is the figure a bank prints as the monthly charge and the one SmartNPV
 * quotes as החזר חודשי / החזר ראשון (2,594 on a ₪342,881 ק"צ at 5.6% where
 * the schedule's month 1 reads 2,598). The schedule itself keeps the CPI —
 * that month IS paid indexed, and every total is summed from it.
 */
export const todayPayment = (res: PricedLoan, payment: number = res.monthlyPayment) => payment / (res.index[0] || 1);

/** Price one row under the board's assumptions. */
export function priceLoan(loan: Loan, assume: Assume): PricedLoan {
  const econ = asEcon(assume);
  if (econ.forecast) return forecastSchedule(loan as Extra, econ.forecast);
  const res = calculateLoan(loan, econ.inflation);
  const linked = res.isIndexed;
  const i = econ.inflation / 12 / 100;
  return {
    ...res,
    rates: res.schedule.map(() => Number(loan.rate) || 0),
    // The balloon engine (schedule 3) indexes the balance at the END of each
    // month, so its month-one payment carries no CPI yet; the others pay month
    // one already indexed. Stated with one month too many, todayPayment took a
    // month of CPI off a figure that had none (₪3,597 for SmartNPV's ₪3,603 on
    // a Leumi בלון חלקי of ₪800,756 at 5.4%).
    index: res.schedule.map((_, k) => (linked ? Math.pow(1 + i, k + (Number(loan.amortization_schedule_id) === 3 ? 0 : 1)) : 1)),
  };
}

/* ------------------------------------------------------------- the mix */

/** The mix's month-by-month sum — the shape mixScheduleCalculators returns. */
export function unifiedSchedule(loans: Loan[], assume: Assume): CombinedRow[] {
  if (!loans?.length) return [];
  const all = loans.map((l) => priceLoan(l, assume).schedule);
  const max = Math.max(0, ...all.map((s) => s.length));
  const out: CombinedRow[] = [];
  for (let m = 1; m <= max; m++) {
    const row = { month: m, totalPayment: 0, totalPrincipal: 0, totalInterest: 0, openingBalance: 0, closingBalance: 0 };
    for (const s of all) {
      const r = s[m - 1];
      if (!r) continue;
      row.totalPayment += r.payment;
      row.totalPrincipal += r.principal;
      row.totalInterest += r.interest;
      row.openingBalance += r.openingBalance;
      row.closingBalance += r.closingBalance;
    }
    out.push(row);
  }
  return out;
}

export function mixFullTotals(loans: Loan[], assume: Assume): MixFullTotals {
  const schedule = unifiedSchedule(loans, assume);
  let totalPayment = 0;
  let totalPrincipal = 0;
  let totalInterest = 0;
  for (const r of schedule) {
    totalPayment += r.totalPayment;
    totalPrincipal += r.totalPrincipal;
    totalInterest += r.totalInterest;
  }
  return {
    schedule,
    totalPayment,
    totalPrincipal,
    totalInterest,
    openingBalance: schedule[0]?.openingBalance ?? 0,
    closingBalance: schedule[schedule.length - 1]?.closingBalance ?? 0,
    firstPayment: schedule[0]?.totalPayment ?? 0,
    maxPayment: schedule.length ? Math.max(...schedule.map((r) => r.totalPayment)) : 0,
    originalLoanAmount: loans.reduce((s, l) => s + (Number(l.amount) || 0), 0),
  };
}
