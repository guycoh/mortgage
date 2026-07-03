// Universal credit-report import module.
//
//   import { CreditReportImport, toLoanRows } from "@/components/credit-import";
//
// Drop <CreditReportImport onSelect={...} /> onto any calculator. It parses the
// PDF in the browser and hands back the selected loans (ExtractedLoan[]) plus
// the full CreditReport; map them to your calculator's row shape however you like.

export { default as CreditReportImport } from "./CreditReportImport";
export type { CreditReportImportProps } from "./CreditReportImport";
export { default as ReportJsonPanel } from "./ReportJsonPanel";

// Parsing + mapping helpers, re-exported for convenience.
export {
  extractLoans,
  toLoanRows,
  extractMortgageBalances,
  parseNum,
  type ExtractedLoan,
  type LoanRow,
} from "@/lib/credit-parser/loan-mapping";
export { parsePdfFile, extractPages } from "@/lib/credit-parser/extract.client";
export type { CreditReport, Transaction } from "@/lib/credit-parser/types";
