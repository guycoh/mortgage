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
export { default as ReportSheet } from "./report-view/ReportSheet";
export { ReportView } from "./report-view/ReportView";

// Parsing + mapping helpers, re-exported for convenience.
export {
  extractLoans,
  toLoanRows,
  extractMortgageBalances,
  parseNum,
  type ExtractedLoan,
  type LoanRow,
  type LiabilityCategory,
} from "@/lib/credit-parser/loan-mapping";

// Liability board (BDI page-2 view): grouping, joint-debt matching, totals.
export {
  buildLiabilities,
  mergeRows,
  splitRow,
  manualRow,
  rowTotals,
  CATEGORY_ORDER,
  CATEGORY_LABEL,
  PERSON_COLORS,
  type ReportSlot,
  type LiabilityRow,
  type MatchSuggestion,
  type LiabilityTotals,
} from "@/lib/credit-parser/liabilities";
export { parsePdfFile, extractPages } from "@/lib/credit-parser/extract.client";
export type { CreditReport, Transaction } from "@/lib/credit-parser/types";
