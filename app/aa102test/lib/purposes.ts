// מטרת ההלוואה — the board's one vocabulary for what the money was for.
//
// The list is the trade's own (it is the list SmartNPV offers, in its order),
// so an advisor moving between tools meets the same eleven words. Every
// document says it differently — Mizrahi "רכישת דירה יד שניה", Hapoalim
// "הלוואה לדיור לרכישה", Leumi "לווה פרטי-מגורים", the credit report's five
// coarse values in 201-017 — and the parsers already boil that down to a
// PurposeKind (lib/bank-parser/purpose.ts). This module is the last step: that
// kind, plus the raw wording where the kind is not fine enough, onto one of
// the eleven. The raw wording is still kept on the row (source_purpose) — it is
// what the lender said and it rides on the cell's tooltip.

import type { PurposeKind } from "@/lib/bank-parser/purpose";

export type PurposeId =
  | "housing" // דיור — purchase, build, extension: a mortgage for the home
  | "any" // כל מטרה — secured on the property, spent elsewhere
  | "renovation" // שיפוצים
  | "existing_lien" // שעבוד קיים לטובת נרכש — the old home funds the new one
  | "bridge" // גישור
  | "dowry" // נדוניה
  | "refi_housing" // מחזור לדיור
  | "refi_any" // מחזור כל מטרה
  | "business" // עסקית
  | "unknown" // לא זוהה
  | "purchase_group"; // קבוצת רכישה

export const PURPOSES: { id: PurposeId; label: string }[] = [
  { id: "housing", label: "דיור" },
  { id: "any", label: "כל מטרה" },
  { id: "renovation", label: "שיפוצים" },
  { id: "existing_lien", label: "שעבוד קיים לטובת נרכש" },
  { id: "bridge", label: "גישור" },
  { id: "dowry", label: "נדוניה" },
  { id: "refi_housing", label: "מחזור לדיור" },
  { id: "refi_any", label: "מחזור כל מטרה" },
  { id: "business", label: "עסקית" },
  { id: "unknown", label: "לא זוהה" },
  { id: "purchase_group", label: "קבוצת רכישה" },
];

export const PURPOSE_LABEL_OF: Record<PurposeId, string> = Object.fromEntries(
  PURPOSES.map((p) => [p.id, p.label])
) as Record<PurposeId, string>;

const IDS = new Set<string>(PURPOSES.map((p) => p.id));
/** A saved value, if it is one of ours; anything else (or nothing) is null. */
export const asPurposeId = (v: unknown): PurposeId | null =>
  typeof v === "string" && IDS.has(v) ? (v as PurposeId) : null;

/** Whitespace and the punctuation that varies between templates. */
const norm = (s: string) => s.replace(/[\s'"״׳`.,;:()\-–־]/g, "");

/**
 * The document's purpose, onto the board's list.
 *
 * The raw wording is read FIRST for the words only the raw text can carry —
 * the parsers' PurposeKind has no bucket for גישור, נדוניה, קבוצת רכישה or
 * שעבוד, and folds מחזור לדיור and מחזור כל מטרה into one `refinance`. Then
 * the kind decides. Ordered so a stronger word beats the weaker one it
 * contains: "מחזור כל מטרה" must not stop at כל מטרה.
 *
 * `group` matters for the loose ends: a consumer loan's רכב / צריכה / אחר has
 * no word in a mortgage vocabulary, and the honest reading of "not for the
 * home" is כל מטרה. Nothing is ever invented for an empty answer — that stays
 * לא זוהה, which is a value on the list precisely so it can be said.
 */
export function purposeFrom(
  kind: PurposeKind | undefined,
  raw: string | undefined,
  group: "mortgage" | "loan" = "mortgage"
): PurposeId {
  const hay = norm(raw ?? "");
  if (hay) {
    // Only the words the kind cannot carry. Everything else defers to the
    // kind, which already knows the documents' traps — the credit report's
    // "נדל"ן ושיפוצים" contains שיפוצים and is NOT a renovation.
    if (/קבוצתרכישה/.test(hay)) return "purchase_group";
    if (/נדוני/.test(hay)) return "dowry";
    if (/גישור/.test(hay)) return "bridge";
    if (/שעבוד|שיעבוד/.test(hay)) return "existing_lien";
    if (/מיחזור|מחזור/.test(hay)) return /כלמטרה/.test(hay) ? "refi_any" : "refi_housing";
  }
  switch (kind) {
    case "purchase":
    case "build":
    case "extend":
    case "housing":
      return "housing";
    case "renovate":
      return "renovation";
    case "any":
      return "any";
    case "refinance":
      return "refi_housing";
    case "business":
      return "business";
    case "vehicle":
    case "consumer":
    case "other":
      // Not the home. On a loan that is exactly what כל מטרה means; on a
      // mortgage the parsers already turned these into `any` (see
      // creditReportPurpose), so this arm is the loan family's.
      return group === "loan" ? "any" : "unknown";
    default:
      return "unknown";
  }
}

/** The purpose a hand-added row starts with: a mortgage is for the home. */
export const defaultPurpose = (group: "mortgage" | "loan"): PurposeId =>
  group === "loan" ? "any" : "housing";
