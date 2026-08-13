// עוגני ריבית משתנה — which anchor a row is priced off, and what it is worth now.
//
// See docs/mortgage-anchor-sources.md for the sources and for what is NOT
// verified. The short version, because it decides the shape of everything here:
//
// An anchor is not a private number each bank invents. It is a handful of
// published tables keyed by TRACK — linkage and reset period — and six banks
// quoting "משתנה צמודה כל 5 שנים" are quoting the same curve. The bank matters
// for two narrower things: which family a track prices off (Leumi's annual
// unlinked is מק"ם where others use the nominal bond curve), and any convention
// of its own — see BankRule.overrides.
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
 * or so a year; the bond curves and מק"ם are monthly averages, published after
 * the month they average has ended.
 *
 * Each allowance spans one publication period PLUS the lag before the successor
 * appears, so a value flags as old only once something newer genuinely exists.
 * An allowance narrower than the lag does not catch staleness early — it just
 * accuses the current value of being stale.
 */
export const FAMILY_FRESHNESS: Record<AnchorFamily, Freshness> = {
  prime: { cadence: "בכל החלטת ריבית של בנק ישראל", maxAgeDays: 75 },
  // The zero curve is a MONTHLY AVERAGE, stamped with the month it averages and
  // published only once that month has ended. So the figure dated the 1st of July
  // is still the newest thing that exists well into September, and its age at the
  // moment its successor appears is a full month of period plus the publication
  // lag — not one cycle.
  //
  // 45 days was that mistake: it declared our own correct, latest-published value
  // stale roughly a fortnight out of every month, put a staleness mark on rows
  // that carried the current number, and sent every button press back to the Bank
  // of Israel for a value that did not exist yet. 75 spans period + lag and still
  // catches a curve that is genuinely two publications behind.
  bond_linked: { cadence: "אחת לחודש", maxAgeDays: 75 },
  bond_unlinked: { cadence: "אחת לחודש", maxAgeDays: 75 },
  makam: { cadence: "אחת לחודש", maxAgeDays: 75 },
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
 * Every entry is Bank of Israel data, so all of it is `verified` — this is the
 * same curve lib/anchors/sources.ts fetches, frozen at the moment of the last
 * deploy. It exists so the button still answers correctly if the table has not
 * been created or the database is unreachable, not as a lesser substitute.
 */
export const SNAPSHOT: AnchorRow[] = [
  {
    family: "prime",
    resetMonths: null,
    value: 5.0,
    effectiveAt: "2026-07-12",
    source: "ריבית בנק ישראל 3.5% + 1.5%",
    verified: true,
  },

  /* עקום אפס ריאלי (צמוד מדד) — בנק ישראל, 07/2026 */
  { family: "bond_linked", resetMonths: 12, value: 1.688, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס ריאלי", verified: true },
  { family: "bond_linked", resetMonths: 24, value: 1.626, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס ריאלי", verified: true },
  { family: "bond_linked", resetMonths: 36, value: 1.626, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס ריאלי", verified: true },
  { family: "bond_linked", resetMonths: 48, value: 1.657, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס ריאלי", verified: true },
  { family: "bond_linked", resetMonths: 60, value: 1.702, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס ריאלי", verified: true },
  { family: "bond_linked", resetMonths: 84, value: 1.811, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס ריאלי", verified: true },
  { family: "bond_linked", resetMonths: 120, value: 1.992, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס ריאלי", verified: true },
  { family: "bond_linked", resetMonths: 180, value: 2.16, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס ריאלי", verified: true },
  { family: "bond_linked", resetMonths: 240, value: 2.249, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס ריאלי", verified: true },

  /* עקום אפס נומינלי (לא צמוד) — בנק ישראל, 07/2026 */
  { family: "bond_unlinked", resetMonths: 12, value: 3.243, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס נומינלי", verified: true },
  { family: "bond_unlinked", resetMonths: 24, value: 3.384, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס נומינלי", verified: true },
  { family: "bond_unlinked", resetMonths: 36, value: 3.455, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס נומינלי", verified: true },
  { family: "bond_unlinked", resetMonths: 48, value: 3.492, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס נומינלי", verified: true },
  { family: "bond_unlinked", resetMonths: 60, value: 3.534, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס נומינלי", verified: true },
  { family: "bond_unlinked", resetMonths: 84, value: 3.662, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס נומינלי", verified: true },
  { family: "bond_unlinked", resetMonths: 120, value: 3.882, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס נומינלי", verified: true },
  { family: "bond_unlinked", resetMonths: 180, value: 4.123, effectiveAt: "2026-07-01", source: "בנק ישראל — עקום אפס נומינלי", verified: true },

  /* מק"ם — הנקודה לשנה על העקום הנומינלי */
  { family: "makam", resetMonths: 12, value: 3.243, effectiveAt: "2026-07-01", source: 'בנק ישראל — תשואת מק"ם ל־12 חודשים', verified: true },
];
