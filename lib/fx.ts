// WHICH FOREIGN CURRENCY A TRACK IS LINKED TO.
//
// A מט"ח tranche is a track of its own on the board — paths 6 and 7 in
// app/data/paths — so the currency has to be READ, not inferred: "צמוד דולר"
// and "צמוד אירו" are two different debts with two different exchange rates,
// and a letter that says only "צמודה למטבע חוץ" names neither of them.
//
// One spelling list for both documents: the bank letters name the currency in
// the track description and in סוג ההצמדה (lib/bank-parser), and the credit
// report names it in מטבע העסקה, 201-021, whose own enum is ש"ח / דולר /
// דולר ארה"ב / אירו (lib/credit-parser/dictionary).

/** "other" is a foreign currency the document did not name. */
export type FxCurrency = "USD" | "EUR" | "other";

/** Spaces and gershayim out, so "מט\"ח" and "מט ח" and "מטח" are one word. */
const flat = (s: string) => s.replace(/[״׳"']/g, "").replace(/\s+/g, "");

/**
 * The currency a piece of the lender's own wording names, or null when it names
 * no foreign currency at all.
 *
 * Takes several fields because no template puts it in one place: Mizrahi writes
 * it into both the חלק name and סוג ההצמדה, Leumi into the linkage cell alone.
 * The first field that names a currency wins, and an unnamed foreign currency
 * ("נקובה במטבע חוץ") is "other" rather than a guess at the dollar.
 */
export function fxCurrencyOf(...parts: (string | null | undefined)[]): FxCurrency | null {
  const s = flat(parts.filter(Boolean).join(" "));
  // דולר covers דולרי / דולרית / דולריות and the ע.ג דולרית anchor.
  if (/דולר|USD|US\$|\$/i.test(s)) return "USD";
  // אירו(?!פ) so a European bank in a footnote is not read as a euro track.
  if (/אירו(?!פ)|יורו|EUR|€/i.test(s)) return "EUR";
  if (/מטח|מטבעחוץ|מטבעזר|פרנק|שטרלינג|לישט|יןיפני|CHF|GBP|JPY/i.test(s)) return "other";
  return null;
}

/** True when the wording names a foreign currency at all — any of the three. */
export const isFxText = (...parts: (string | null | undefined)[]) => fxCurrencyOf(...parts) !== null;
