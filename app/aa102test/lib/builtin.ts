// תוספת מובנית — margin a lender hides inside the anchor it prints.
//
// WHAT. When the Bank of Israel retired the "מקורות" anchor in July 2011,
// Mizrahi-Tefahot moved its bond-anchored tracks onto government-bond yields
// and folded part of every borrower's margin into the anchor (its "תוספת
// מיכונית", the bank's funding cost over the bonds). Its payoff letters still
// print that anchor: a 2013 tranche reads anchor 1.76 + margin 1.00 = 2.76,
// while the market anchor the day the bank fixed 2.76 was about 1.1 — the bank
// charges 1.70 over the market, and every future reset is anchor + 1.70.
// SmartNPV reads the same letter the same way ("מצאנו כי התוספת המיכונית הינה
// 0.7%, ולכן סך התוספת במסלול זה הינה 1.7%").
//
// HOW WE FIND IT. Two readings, one exact:
//   · the engine always compares the printed anchor with the BoI market anchor
//     of the month the rate was fixed (anchorReading in lib/price). A gap is
//     the built-in, measured on monthly averages — right to about ±0.1.
//   · the letter also prints the bank's own projection of the tranche, הריבית
//     הכוללת החזויה, computed under directive 451 on the TRUE margin. Solving
//     for the built-in that makes our projection land on that figure gives the
//     bank's own number. On the 10/11/26 Mizrahi letter it gives 0.70 on both
//     2013 tranches — SmartNPV's 0.7 — and nothing on the 2024 tranche.
// The second is used when it agrees with the first (the history vetoes a
// projection skewed by a curve weeks older than the letter); otherwise the
// engine keeps the history's estimate.
//
// Pure; run on import (Simulator.applyImport) against the board's forecast.

import { anchorReading, priceLoan } from "./price";
import type { Forecast } from "./forecast";
import { annualIRR } from "./yield";
import type { ImportedLoan } from "./credit";

/** Below this the history sees a printed anchor that IS the market's. */
const DETECT = 0.3;
/** How far the letter's figure may land from the history's and still be trusted. */
const AGREE = 0.25;
/** Lenders set margins in twentieths of a percent. */
const STEP = 0.05;

/** The tranche's projected שת"פ with `builtIn` added to its margin. */
function projected(l: ImportedLoan, f: Forecast, builtIn: number): number | null {
  const res = priceLoan({ ...l, built_in_margin: builtIn } as ImportedLoan, { inflation: 0, forecast: f });
  return annualIRR(Number(l.amount) || 0, res.schedule.map((r) => r.payment));
}

/**
 * The row with `built_in_margin` settled, or the row unchanged when there is no
 * built-in to settle (or not enough to settle it with).
 */
export function settleBuiltIn(l: ImportedLoan, f: Forecast | null): ImportedLoan {
  if (!f?.history || l.built_in_margin !== undefined) return l;
  const target = Number(l.source_forecast_rate);
  if (!(target > 0) || !(Number(l.amount) > 0) || !(Number(l.months) > 0)) return l;
  const read = anchorReading(l, f);
  if (!read || read.builtIn < DETECT) return l;
  // The projection rises with the margin, so a bisection finds it.
  let lo = 0;
  let hi = 4;
  const atLo = projected(l, f, lo);
  const atHi = projected(l, f, hi);
  if (atLo === null || atHi === null || atLo > target || atHi < target) return l;
  for (let k = 0; k < 40; k++) {
    const mid = (lo + hi) / 2;
    const irr = projected(l, f, mid);
    if (irr === null) return l;
    if (irr < target) lo = mid;
    else hi = mid;
  }
  const builtIn = Math.round((lo + hi) / 2 / STEP) * STEP;
  if (Math.abs(builtIn - read.builtIn) > AGREE) return l;
  return { ...l, built_in_margin: Math.round(builtIn * 100) / 100 };
}

/** Every row of a freshly imported document. */
export const settleBuiltIns = (rows: ImportedLoan[], f: Forecast | null) => rows.map((l) => settleBuiltIn(l, f));
