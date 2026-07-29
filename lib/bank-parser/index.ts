// Read a mortgage statement, whichever of the four lenders printed it.
//
// Detection first, then the matching reader. A template that is recognised but
// not yet implemented says so by name — "בנק לאומי" rather than "unsupported
// file" — because the two are different problems for whoever is holding the PDF.

import type { RawPage } from "@/lib/credit-parser/types";
import { detectBank, type Detection } from "./detect";
import { parseDiscount } from "./banks/discount";
import { BANK_LABEL, type BankStatement } from "./types";

/** True when this looks like a bank mortgage statement at all. */
export function isBankStatement(pages: RawPage[]): boolean {
  return detectBank(pages) !== null;
}

/**
 * Parse a statement into tranches.
 *
 * Throws rather than returning an empty statement: a mortgage that silently
 * reads as zero tranches would fill the board with nothing and look like the
 * client has no debt.
 */
export function parseBankStatement(pages: RawPage[]): BankStatement {
  const det = detectBank(pages);
  if (!det) {
    throw new Error(
      "לא זוהתה תבנית בנק מוכרת בקובץ. נתמכים: דיסקונט, מרכנתיל, לאומי, הפועלים, ירושלים."
    );
  }

  switch (det.bank) {
    case "discount":
    case "mercantile":
      return withMeta(parseDiscount(pages, det.bank, det.dataPages), det);
    default:
      throw new Error(
        `זוהה מסמך של ${BANK_LABEL[det.bank]}, אך הקריאה עבור התבנית הזו עדיין לא נתמכת.`
      );
  }
}

/** Carry the detection's own findings onto the statement. */
function withMeta(st: BankStatement, det: Detection): BankStatement {
  const warnings = [...st.warnings];
  if (det.documents.length > 1) {
    warnings.push(
      `הקובץ מכיל ${det.documents.length} מסמכים נפרדים; נקרא הראשון בלבד.`
    );
  }
  if (det.confidence < 0.8) {
    warnings.push(`זיהוי התבנית בביטחון ${Math.round(det.confidence * 100)}% בלבד — כדאי לוודא את הנתונים.`);
  }
  return { ...st, template: det.template, warnings };
}

export { detectBank };
export type { Detection };
export * from "./types";
