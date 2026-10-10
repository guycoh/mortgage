// השוואת תמהילים — one mix's figures, defined the way SmartNPV defines them.
//
// Every definition here was matched to SmartNPV's own output on real boards
// (scripts/check-forecast.ts holds the expectations), so the two tools quote
// the same number under the same name:
//
//   · תשלומי ריבית והצמדה   Σ payments − principal
//   · עלות כוללת             Σ payments
//   · החזר לשקל              Σ payments / principal
//   · החזר ראשון             month 1 at the TYPED rates — the grid's figure
//   · החזר בשיא (שנה)        the highest forecast month, and its year
//   · שת"פ                   IRR of the payments, annual effective
//   · ענ"נ                   PV of the payments discounted along the forecast
//                            nominal curve (rate ÷ 12 per month) − principal;
//                            in flat mode, at the board's one discount rate
//   · מרווח שוק              the constant spread over that same curve at which
//                            the payments are worth exactly the principal — what
//                            the mix costs above the government's own money
//   · מח"מ                   Σ t·payment / Σ payment, in years (undiscounted)
//
// Pure; the payments come from lib/price, so the comparison, the charts and the
// unified schedule can never disagree.

import { priceLoan, asEcon, type Assume } from "./price";
import { nominalAt } from "./forecast";
import { annualIRR } from "./yield";
import type { ImportedLoan } from "./credit";

export type MixFigures = {
  principal: number;
  months: number;
  /** Payment per month, months 1…N, forecast (or flat) pricing. */
  payments: number[];
  /** Balance at the end of each month. */
  balances: number[];
  totalPaid: number;
  cost: number;
  perShekel: number;
  firstTyped: number;
  peak: number;
  peakYear: number;
  irr: number | null;
  npv: number;
  spread: number | null;
  duration: number;
};

const priced = (rows: ImportedLoan[]) =>
  rows.filter((l) => (Number(l.amount) || 0) > 0 && (Number(l.months) || 0) > 0);

/** Discount factors month by month: along the curve, or at one flat rate. */
function discounter(assume: Assume, flatRate: number) {
  const e = asEcon(assume);
  return (spread: number) => {
    const out: number[] = [];
    let df = 1;
    for (let m = 1; m <= 600; m++) {
      const r = (e.forecast ? nominalAt(e.forecast, m) : flatRate) + spread;
      df /= 1 + r / 1200;
      out.push(df);
    }
    return out;
  };
}

export function mixFigures(rows: ImportedLoan[], assume: Assume, discountRate: number): MixFigures | null {
  const live = priced(rows);
  if (!live.length) return null;
  const all = live.map((l) => priceLoan(l, assume));
  const typed = live.map((l) => priceLoan(l, asEcon(assume).inflation));
  const months = all.reduce((m, r) => Math.max(m, r.schedule.length), 0);
  const payments = Array.from({ length: months }, (_, i) => all.reduce((s, r) => s + (r.schedule[i]?.payment ?? 0), 0));
  const balances = Array.from({ length: months }, (_, i) => all.reduce((s, r) => s + (r.schedule[i]?.closingBalance ?? 0), 0));
  const principal = live.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const totalPaid = payments.reduce((s, p) => s + p, 0);

  let peak = 0;
  let peakAt = 1;
  payments.forEach((p, i) => {
    if (p > peak + 0.5) {
      peak = p;
      peakAt = i + 1;
    }
  });

  const dfs = discounter(assume, discountRate);
  const pv = (spread: number) => {
    const d = dfs(spread);
    return payments.reduce((s, p, i) => s + p * d[i], 0);
  };
  // The spread at which the payments are worth the principal — bisection, the
  // PV falls monotonically as the spread rises.
  let spread: number | null = null;
  if (totalPaid > principal) {
    let lo = -10;
    let hi = 30;
    for (let k = 0; k < 70; k++) {
      const mid = (lo + hi) / 2;
      if (pv(mid) > principal) lo = mid;
      else hi = mid;
    }
    spread = (lo + hi) / 2;
  }

  const weighted = payments.reduce((s, p, i) => s + p * (i + 1), 0);
  return {
    principal,
    months,
    payments,
    balances,
    totalPaid,
    cost: totalPaid - principal,
    perShekel: principal ? totalPaid / principal : 0,
    firstTyped: typed.reduce((s, r) => s + (r.schedule[0]?.payment ?? 0), 0),
    peak,
    peakYear: Math.ceil(peakAt / 12),
    irr: annualIRR(principal, payments),
    npv: pv(0) - principal,
    spread,
    duration: totalPaid ? weighted / totalPaid / 12 : 0,
  };
}

/** The position after n payments — SmartNPV's טבלה משווה לפי תשלום. */
export function atPayment(f: MixFigures, n: number) {
  const k = Math.min(Math.max(1, Math.round(n)), f.months);
  const paidSoFar = f.payments.slice(0, k).reduce((s, p) => s + p, 0);
  const balance = f.balances[k - 1] ?? 0;
  // Principal retired = what was owed minus what is owed now; everything else
  // paid so far was interest and linkage.
  const retired = f.principal - balance;
  return {
    n: k,
    payment: f.payments[k - 1] ?? 0,
    balance,
    retired,
    costSoFar: paidSoFar - retired,
    paidSoFar,
  };
}
