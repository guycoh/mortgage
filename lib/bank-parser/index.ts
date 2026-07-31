// Read a mortgage statement, whichever of the four lenders printed it.
//
// Detection first, then the matching reader. A template that is recognised but
// not yet implemented says so by name — "בנק לאומי" rather than "unsupported
// file" — because the two are different problems for whoever is holding the PDF.

import type { RawPage } from "@/lib/credit-parser/types";
import { detectBank, type Detection } from "./detect";
import { parseDiscount } from "./banks/discount";
import { parsePoalim } from "./banks/poalim";
import { parseLeumi } from "./banks/leumi";
import { parseMizrahi } from "./banks/mizrahi";
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
      "לא זוהתה תבנית בנק מוכרת בקובץ. נתמכים: דיסקונט, מרכנתיל, לאומי, הפועלים, מזרחי טפחות."
    );
  }

  switch (det.bank) {
    case "discount":
    case "mercantile":
      return withMeta(parseDiscount(pages, det.bank, det.dataPages), det);
    case "poalim":
      return withMeta(parsePoalim(pages, det.dataPages), det);
    case "leumi":
      // One file can hold two complete statements — two different mortgages for
      // the same borrower, boilerplate and all. Each is parsed against its own
      // pages and the results joined, because reading them together mixes two
      // mortgages into one balance and reading only the first loses half the debt.
      return withMeta(
        joinStatements(det.documents.map((d) => parseLeumi(pages, d.dataPages))),
        det
      );
    case "mizrahi":
      return withMeta(parseMizrahi(pages, det.dataPages), det);
    default:
      throw new Error(
        `זוהה מסמך של ${BANK_LABEL[det.bank]}, אך הקריאה עבור התבנית הזו עדיין לא נתמכת.`
      );
  }
}

/**
 * Join the statements found in one file.
 *
 * Same borrower, several mortgages. Loans and tranches concatenate; the client
 * and the date come from the first that states them, since a blank in one
 * document should not erase a value the other printed.
 */
function joinStatements(parts: BankStatement[]): BankStatement {
  const live = parts.filter((p) => p.tranches.length);
  if (live.length <= 1) return live[0] ?? parts[0];
  const first = live[0];
  return {
    ...first,
    client: {
      name: live.find((p) => p.client.name)?.client.name ?? "",
      idNumber: live.find((p) => p.client.idNumber)?.client.idNumber ?? "",
      address: live.find((p) => p.client.address)?.client.address ?? "",
    },
    loans: live.flatMap((p) => p.loans),
    tranches: live.flatMap((p) => p.tranches),
    totals: {
      balance: live.reduce((s, p) => s + p.totals.balance, 0),
      payoff: live.reduce((s, p) => s + p.totals.payoff, 0),
      monthly: live.reduce((s, p) => s + p.totals.monthly, 0),
      breakFee: live.reduce((s, p) => s + p.totals.breakFee, 0),
    },
    warnings: [
      `הקובץ מכיל ${live.length} הלוואות נפרדות — כולן נקראו.`,
      ...live.flatMap((p) => p.warnings),
    ],
  };
}

/**
 * Say what did not come through.
 *
 * The mix needs a balance, a rate and a term per tranche. A missing rate does
 * not fail loudly — it lands in the board as 0% and quietly understates the
 * cost of the mortgage — so every gap is named against the tranche it belongs
 * to and carried to the surface.
 */
function auditTranches(st: BankStatement): string[] {
  const out: string[] = [];
  for (const t of st.tranches) {
    const missing: string[] = [];
    if (t.rate === null) missing.push("ריבית");
    if (!t.months) missing.push("יתרת תקופה");
    if (t.balance === null) missing.push("יתרה");
    if (missing.length) {
      out.push(
        `${t.loanNumber}${t.trancheNumber ? ` חלק ${t.trancheNumber}` : ""}: לא נקראו ${missing.join(", ")} — יש להשלים ידנית.`
      );
    }
  }
  return out;
}

/** Carry the detection's own findings onto the statement. */
function withMeta(st: BankStatement, det: Detection): BankStatement {
  const warnings = [...st.warnings, ...auditTranches(st)];
  if (det.confidence < 0.8) {
    warnings.push(`זיהוי התבנית בביטחון ${Math.round(det.confidence * 100)}% בלבד — כדאי לוודא את הנתונים.`);
  }
  return { ...st, template: det.template, warnings };
}

export { detectBank };
export type { Detection };
export * from "./types";
