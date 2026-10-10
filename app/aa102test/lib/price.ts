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
import { bondAnchor, indexFactor, nominalAt, type Forecast } from "./forecast";
import { parseDate, startOfToday } from "./dates";

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
};

/** Months between rate resets on a bond track. 60 when nothing says — the market's default. */
export function intervalOf(l: Extra): number {
  const n = Number(l.anchor_interval);
  if (Number.isFinite(n) && n > 0) return Math.round(n);
  return freqMonths(l.change_frequency) ?? 60;
}

/**
 * Months until the FIRST reset, counted from today — 451's `s`.
 *
 * A new proposal track resets one full interval out. A debt the client already
 * carries resets when its own calendar says: the bank letter's next-reset date
 * when one was printed, else the opening date's phase in the cycle. Without
 * either, it is treated as new — the only assumption that invents nothing.
 */
export function firstResetOf(l: Extra, V: number, today = startOfToday()): number {
  // Calendar months, not elapsed days: a reset dated 01/02/2031 seen from
  // 08/10/2026 leaves 52 payments at the old rate (Nov 2026 … Feb 2031) and the
  // new one is first paid in March — SmartNPV's schedule moves at month 53.
  const calMonths = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
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
 * How far a typed anchor may sit from the curve's own anchor and still be read
 * as that anchor. SmartNPV's board typed 1.76% against a curve 1.78% — the same
 * thing, a day apart. Mizrahi's letter prints 3.46% for a CPI-linked 5-year
 * anchor the curve puts at 1.78% — whatever that is, it is not the BoI curve,
 * and adding the curve's future to it would price a different mortgage.
 */
const ANCHOR_TOLERANCE = 0.5;

/**
 * The spread over the anchor the row keeps for life.
 *
 * PRIME: the stated margin (a prime margin is printed on every letter and means
 * one thing), else whatever puts month 1 at the typed rate.
 *
 * BOND TRACKS: TODAY'S SPREAD over the curve, so the rate moves by exactly as
 * much as the curve says the anchor will (owner's rule, 2026-10-10). The typed
 * anchor measures it when it agrees with the curve (see ANCHOR_TOLERANCE);
 * otherwise the curve's own anchor for the coming window does. Either way
 * month 1 is the rate the advisor typed.
 */
function marginOf(l: Extra, f: Forecast, track: Track, V: number): number {
  const rate = Number(l.rate) || 0;
  if (track === "prime") {
    const stated = Number(l.anchor_margin);
    if (l.anchor_margin !== null && l.anchor_margin !== undefined && Number.isFinite(stated)) return stated;
    return rate - (nominalAt(f, 1) + PRIME_SPREAD);
  }
  const curve = bondAnchor(f, 0, V, track === "bond_real");
  const typed = Number(l.anchor);
  if (l.anchor !== null && l.anchor !== undefined && Number.isFinite(typed) && typed !== 0 && Math.abs(typed - curve) <= ANCHOR_TOLERANCE)
    return rate - typed;
  return rate - curve;
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
    index: res.schedule.map((_, k) => (linked ? Math.pow(1 + i, k + 1) : 1)),
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
