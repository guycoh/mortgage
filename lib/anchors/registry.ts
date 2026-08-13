// עוגני ריבית משתנה — which anchor a row is priced off, and what it is worth now.
//
// See docs/mortgage-anchor-sources.md for the sources and for what is NOT
// verified. The short version, because it decides the shape of everything here:
//
// An anchor is not a private number each bank invents. It is a handful of
// published tables keyed by TRACK — linkage and reset period — and six banks
// quoting "משתנה צמודה כל 5 שנים" are quoting the same curve. The bank matters
// for two narrower things: which family a track prices off (Leumi's annual
// unlinked is מק"ם where others use the nominal bond curve), and bank rules such
// as Mizrahi's 0% floor.
//
// So: values are keyed by family × reset months, and the bank selects the family.
// Keying primarily on the bank would have stored six copies of one number and
// invited them to drift.

import type { AnchorFamily, AnchorRow, BankRule, Freshness } from "./types";

/** What to call a family on screen, where the tooltip explains a resolved row. */
export const FAMILY_LABEL: Record<AnchorFamily, string> = {
  prime: "ריבית פריים",
  bond_linked: 'עוגן אג"ח צמוד מדד',
  bond_unlinked: 'עוגן אג"ח לא צמוד',
  makam: 'עוגן מק"ם',
};

/**
 * When each family stops being current — a property of the SOURCE, not a house
 * rule. Prime holds until the next Bank of Israel decision and those are eight
 * or so a year; the bond curves are republished twice a month; מק"ם monthly.
 * The allowances are deliberately about one cycle wide, so a value flags as old
 * only once its successor should already exist.
 */
export const FAMILY_FRESHNESS: Record<AnchorFamily, Freshness> = {
  prime: { cadence: "בכל החלטת ריבית של בנק ישראל", maxAgeDays: 75 },
  bond_linked: { cadence: "פעמיים בחודש", maxAgeDays: 25 },
  bond_unlinked: { cadence: "פעמיים בחודש", maxAgeDays: 25 },
  makam: { cadence: "אחת לחודש", maxAgeDays: 45 },
};

/**
 * Per-bank pricing rules, by the short name lib/lenders.ts resolves a document's
 * legal name to. A bank that is not here resolves to UNSUPPORTED and its rows are
 * left alone — that covers every non-bank lender and card company, and any bank
 * whose variable-rate pricing nobody has checked.
 */
export const BANK_RULES: Record<string, BankRule> = {
  // `overrides` is keyed "<linkage>:<resetMonths>" and beats the defaults. It is
  // how a bank whose particular track reads a DIFFERENT dataset gets said —
  // Hapoalim's 18-month track is documented off a model-derived series rather
  // than the zero curve, and FIBI and בנק ירושלים each document their own
  // averaging conventions. None of those are entered here yet, because none of
  // them has been read off the bank's own price list; the entry exists so that
  // adding one is a line of data rather than a redesign. See the docs.
  "מזרחי טפחות": { linked: "bond_linked", unlinked: "bond_unlinked" },
  "לאומי": {
    linked: "bond_linked",
    unlinked: "bond_unlinked",
    // The one per-bank mapping that IS verified against the lender's own page:
    // Leumi states outright that its annual unlinked variable mortgage resets to
    // the 12-month מק"ם anchor.
    // https://www.mortgage.leumi.co.il/Articles/82
    overrides: { "unlinked:12": "makam" },
  },
  "הפועלים": { linked: "bond_linked", unlinked: "bond_unlinked" },
  "דיסקונט": { linked: "bond_linked", unlinked: "bond_unlinked" },
  "מרכנתיל": { linked: "bond_linked", unlinked: "bond_unlinked" },
  "הבינלאומי": { linked: "bond_linked", unlinked: "bond_unlinked" },
  "ירושלים": { linked: "bond_linked", unlinked: "bond_unlinked" },
  "אוצר החייל": { linked: "bond_linked", unlinked: "bond_unlinked" },
  'פאג"י': { linked: "bond_linked", unlinked: "bond_unlinked" },
  "מסד": { linked: "bond_linked", unlinked: "bond_unlinked" },
  "יהב": { linked: "bond_linked", unlinked: "bond_unlinked" },
};

/**
 * The bundled snapshot — what the resolver answers with before the
 * `mortgage_anchors` table has been created or filled, and the floor it falls
 * back to for any key the table does not carry.
 *
 * Every entry states its own date and source, because the whole point of the
 * button is to replace a rate from the day the mortgage was taken with one whose
 * age is known. An anchor that says it is from July is useful; one that implies
 * it is from this morning is not.
 *
 * `verified` is false for everything read off a secondary aggregator rather than
 * off the bank's own price list or the Bank of Israel. That flag reaches the
 * tooltip — see docs/mortgage-anchor-sources.md.
 */
export const SNAPSHOT: AnchorRow[] = [
  {
    family: "prime",
    resetMonths: null,
    value: 5.0,
    effectiveAt: "2026-07-06",
    source: 'ריבית בנק ישראל 3.5% (החלטה מ־06/07/2026) + 1.5%',
    verified: true,
  },

  /* עוגן אג"ח צמוד מדד (ריאלי) — 11/07/2026 */
  { family: "bond_linked", resetMonths: 12, value: 1.65, effectiveAt: "2026-07-11", source: 'טבלת עוגן אג"ח צמוד', verified: false },
  { family: "bond_linked", resetMonths: 30, value: 1.61, effectiveAt: "2026-07-11", source: 'טבלת עוגן אג"ח צמוד', verified: false },
  { family: "bond_linked", resetMonths: 60, value: 1.73, effectiveAt: "2026-07-11", source: 'טבלת עוגן אג"ח צמוד', verified: false },
  { family: "bond_linked", resetMonths: 84, value: 1.74, effectiveAt: "2026-07-11", source: 'טבלת עוגן אג"ח צמוד', verified: false },
  { family: "bond_linked", resetMonths: 120, value: 1.86, effectiveAt: "2026-07-11", source: 'טבלת עוגן אג"ח צמוד', verified: false },

  /* עוגן אג"ח לא צמוד (נומינלי) — 11/07/2026 */
  { family: "bond_unlinked", resetMonths: 24, value: 3.21, effectiveAt: "2026-07-11", source: 'טבלת עוגן אג"ח לא צמוד', verified: false },
  { family: "bond_unlinked", resetMonths: 60, value: 3.34, effectiveAt: "2026-07-11", source: 'טבלת עוגן אג"ח לא צמוד', verified: false },
  { family: "bond_unlinked", resetMonths: 84, value: 3.48, effectiveAt: "2026-07-11", source: 'טבלת עוגן אג"ח לא צמוד', verified: false },

  /* עוגן מק"ם — 09/07/2026 */
  { family: "makam", resetMonths: 12, value: 3.22, effectiveAt: "2026-07-09", source: 'תשואת מק"ם ל־12 חודשים', verified: false },
];
