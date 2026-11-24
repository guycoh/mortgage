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
// HOW WE FIND IT — the bank's own number, off the letter.
// Each tranche on the letter carries the bank's projection of it, הריבית
// הכוללת החזויה, which directive 451 makes the bank compute on BoI's forecast
// file AS PUBLISHED ON THE LETTER'S DAY (lib/boi451#releaseOn) and on the margin
// it really charges. So the built-in is the one that lands our projection of
// the tranche, on that same release, on the printed figure — rounded to the
// twentieth of a percent lenders set margins in, never below zero.
//
// Measured 2026-11-24 on every Mizrahi bond tranche in ../Bank-Templates (20
// tranches, 14 letters, 2025-06 … 2026-11): it reproduces SmartNPV's built-in
// on all 20 — 1.65 ×3, 1.70 ×2, 1.65 ×2, 1.50, 1.90 ×2, 0.05, and 0 on the nine
// without one. The reading it replaces, the printed anchor against BoI's
// monthly ZCM history, was within 0.05–0.13 on the same tranches and missed six.
// (An earlier solve, dropped on 2026-11-23, ran on the board's CURRENT curve
// rather than the letter-day release, and the curve gap leaked into the margin.)
//
// GUARDS, so a misread figure cannot invent a margin:
//   · only Mizrahi — the one lender whose letters fold margin into the anchor;
//     on every other letter the printed margin is the margin (SmartNPV agrees on
//     all of them);
//   · the solve must land within AGREE of the history's raw reading (the two
//     differ by ≤ 0.13 on the corpus); a projection that disagrees more is not
//     the bank's arithmetic, and the history's estimate stands;
//   · no letter-day release (a letter before 09/2021, or BoI unreachable) → the
//     history's estimate, as before.
//
// Pure; run on import (Simulator) with the board's forecast and the letter-day
// release fetched from /api/simulator/forecast?at=.

import { anchorReading, priceLoan } from "./price";
import { annualIRR } from "./yield";
import type { Forecast } from "./forecast";
import type { ImportedLoan } from "./credit";

/** History path only: at or below this the printed anchor IS the market's — the engine's own ANCHOR_TOLERANCE. */
const DETECT = 0.5;
/** Lenders set margins in twentieths of a percent. */
const STEP = 0.05;
/** How far the letter's solve may sit from the history's raw reading and still be trusted. */
const AGREE = 0.4;

const roundStep = (x: number) => Math.round(Math.round(x / STEP) * STEP * 100) / 100;

/** The lender whose letters fold margin into the printed anchor. */
const isMizrahi = (l: ImportedLoan) => /מזרחי|טפחות/.test(l.source_bank ?? "");

/**
 * True when this row's built-in should be read off its letter — so the import
 * knows to fetch the letter-day release before settling.
 */
export function wantsLetterCurve(l: ImportedLoan): boolean {
  const path = Number(l.path_id);
  const anchor = Number(l.anchor);
  return isMizrahi(l) && (path === 4 || path === 5) && Number(l.source_forecast_rate) > 0 && Number.isFinite(anchor) && anchor !== 0;
}

/** The tranche's projected rate (שת"פ, annual) with `builtIn` folded into its anchor. */
function projected(l: ImportedLoan, f: Forecast, builtIn: number): number | null {
  const res = priceLoan({ ...l, built_in_margin: builtIn } as ImportedLoan, { inflation: 0, forecast: f });
  return annualIRR(Number(l.amount) || 0, res.schedule.map((r) => r.payment));
}

/** The built-in that lands the projection on the letter's figure, unrounded; null when none does. */
export function solveBuiltIn(l: ImportedLoan, letter: Forecast): number | null {
  const target = Number(l.source_forecast_rate);
  if (!(target > 0) || !(Number(l.amount) > 0) || !(Number(l.months) > 0)) return null;
  // The projection rises with the margin, so a bisection finds it. A negative
  // lower bound lets a tranche with no built-in solve to ≈0 instead of
  // pinning at the bound.
  let lo = -1;
  let hi = 4;
  const atLo = projected(l, letter, lo);
  const atHi = projected(l, letter, hi);
  if (atLo === null || atHi === null || atLo > target || atHi < target) return null;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2;
    const irr = projected(l, letter, mid);
    if (irr === null) return null;
    if (irr < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The row with `built_in_margin` settled, or the row unchanged when there is
 * nothing to settle it with.
 *
 * `f` is the board's forecast (its `history` dates old anchors); `letter` is the
 * 451 release in force on the letter's day, when the import could fetch it.
 */
export function settleBuiltIn(l: ImportedLoan, f: Forecast | null, letter: Forecast | null = null): ImportedLoan {
  if (l.built_in_margin !== undefined) return l;
  const read = f?.history ? anchorReading(l, f) : null;
  if (letter && wantsLetterCurve(l)) {
    const solved = solveBuiltIn(l, letter);
    const raw = read ? Number(l.anchor) - read.market : null;
    if (solved !== null && solved > -0.5 && solved < 4 && (raw === null || Math.abs(solved - raw) <= AGREE))
      return { ...l, built_in_margin: Math.max(0, roundStep(solved)) };
  }
  if (!read || read.builtIn <= DETECT) return l;
  return { ...l, built_in_margin: roundStep(read.builtIn) };
}

/** Every row of a freshly imported document. */
export const settleBuiltIns = (rows: ImportedLoan[], f: Forecast | null, letter: Forecast | null = null) =>
  rows.map((l) => settleBuiltIn(l, f, letter));
