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
// HOW WE FIND IT. The printed anchor against the BoI market anchor of the
// month the rate was fixed (anchorReading in lib/price), rounded to the
// twentieth of a percent lenders set margins in. A gap of more than
// ANCHOR_TOLERANCE is the built-in.
//
// Until 2026-11-23 a second reading could override it: solving for the
// built-in that lands our projection of the tranche on the letter's own הריבית
// הכוללת החזויה. Measured against SmartNPV over every Mizrahi letter in
// ../Bank-Templates (scripts/snpv-parity.mts), that reading was the further of
// the two on five letters of six — the bank computed its projection on ITS
// curve of the letter's day, ours is another, so the solved margin absorbs the
// difference between the curves (1.50 for SmartNPV's 1.70 on מסילתי, 12/10/26:
// ₪7,971 of ריבית והצמדה). The history does not depend on any curve, which is
// what a letter read weeks from now needs. Its one miss is the 10/11/26 letter
// (0.65 for SmartNPV's 0.70, ₪1,286 on ₪701k — scripts/check-builtin.ts).
//
// Pure; run on import (Simulator.applyImport) against the board's forecast.

import { anchorReading } from "./price";
import type { Forecast } from "./forecast";
import type { ImportedLoan } from "./credit";

/** At or below this the printed anchor IS the market's — the engine's own ANCHOR_TOLERANCE. */
const DETECT = 0.5;
/** Lenders set margins in twentieths of a percent. */
const STEP = 0.05;

/**
 * The row with `built_in_margin` settled, or the row unchanged when the printed
 * anchor is the market's (or there is no history to read it against).
 */
export function settleBuiltIn(l: ImportedLoan, f: Forecast | null): ImportedLoan {
  if (!f?.history || l.built_in_margin !== undefined) return l;
  const read = anchorReading(l, f);
  if (!read || read.builtIn <= DETECT) return l;
  return { ...l, built_in_margin: Math.round(Math.round(read.builtIn / STEP) * STEP * 100) / 100 };
}

/** Every row of a freshly imported document. */
export const settleBuiltIns = (rows: ImportedLoan[], f: Forecast | null) => rows.map((l) => settleBuiltIn(l, f));
