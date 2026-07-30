// Turns a parsed credit report (חיווי אשראי / דוח ריכוז נתונים) into simulator
// rows. The report gives us balance, rate, remaining term and a track label per
// debt; the simulator wants Loan rows carrying a path_id. The only real work is
// matching the report's Hebrew track wording onto the five standard tracks in
// app/data/paths.
//
// Everything runs client-side — the PDF is decoded in the browser by the same
// parser /aa4test uses, and nothing is uploaded.

import { paths as STATIC_PATHS } from "@/app/data/paths";
import type { CreditReport } from "@/lib/credit-parser/types";
import { extractLoans, type ExtractedLoan } from "@/lib/credit-parser/loan-mapping";
import type { Loan } from "../components/LoanTable";

/** Which block of the workbench a row belongs to. */
export type DebtGroup = "mortgage" | "loan";

/** A Loan plus the provenance the UI colour-codes and labels by. Extra keys are
 *  safe: /api/mixes/save whitelists columns, so these never reach the database. */
export type ImportedLoan = Loan & {
  group?: DebtGroup;
  /** The client guarantees this debt rather than owing it. Still real exposure,
   *  so it is imported — but marked, because it is not their own repayment. */
  is_guarantor?: boolean;
  source_bank?: string;
  source_type?: string;
  source_track?: string;
};

/* ------------------------------------------------------------------ paths */

/** id → the five canonical tracks, by their short names. */
export const PATH_IDS = {
  prime: 1, // פריים
  fixedUnlinked: 2, // קלצ
  fixedLinked: 3, // קצ
  varUnlinked: 4, // מלצ
  varLinked: 5, // מצ
} as const;

/** Long, human names for the short codes the data file uses. */
export const PATH_LABEL: Record<number, string> = {
  1: "פריים",
  2: "קבועה לא צמודה",
  3: "קבועה צמודה",
  4: "משתנה לא צמודה",
  5: "משתנה צמודה",
};

/** Track colours by path id — one source for dots, dropdowns, charts, ledger bar. */
export const TRACK_HEX: Record<number, string> = {
  1: "#4f46e5",
  2: "#0891b2",
  3: "#059669",
  4: "#d97706",
  5: "#db2777",
};

/**
 * Map the report's track wording onto a path id. The parser emits labels like
 * "פריים", "קבועה לא צמודה", "משתנה +1" — so test for prime first, then decide
 * fixed-vs-variable and linked-vs-unlinked independently.
 */
export function pathIdFromTrack(track: string | undefined, isMortgage: boolean): number {
  const t = (track ?? "").trim();
  if (!t) return isMortgage ? PATH_IDS.prime : PATH_IDS.fixedUnlinked;

  if (/פריים/.test(t)) return PATH_IDS.prime;

  // "לא צמוד" must be tested before the bare "צמוד" it contains.
  const unlinked = /לא\s*צמוד/.test(t);
  const linked = !unlinked && /צמוד/.test(t);
  const variable = /משתנה/.test(t);

  if (variable) return linked ? PATH_IDS.varLinked : PATH_IDS.varUnlinked;
  // Anything not explicitly variable is treated as fixed, which is what the
  // report means by "קבועה" and by an unpriced/interest-free track.
  return linked ? PATH_IDS.fixedLinked : PATH_IDS.fixedUnlinked;
}

export const isIndexedPath = (pathId: number) =>
  STATIC_PATHS.find((p) => p.id === pathId)?.indexed ?? false;

/* ------------------------------------------------------------- conversion */

const num = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** dd/mm/yyyy → yyyy-mm-dd, the shape both the picker and the API expect. */
function toIso(dmy: string | undefined): string | null {
  const m = (dmy ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function toLoanRow(src: ExtractedLoan, mixId: string, group: DebtGroup): ImportedLoan {
  const guarantor = src.role === "guarantor";
  const pathId = pathIdFromTrack(src.trackLabel, group === "mortgage");
  const iso = toIso(src.endDate);
  return {
    id: crypto.randomUUID(),
    mix_id: mixId,
    path_id: pathId,
    amount: Math.round(src.balance),
    rate: Number(src.interest) || 0,
    months: Number(src.months) || 0,
    // The picker reads loan_end_date; the save route persists end_date. Set
    // both so an imported date survives a round-trip.
    loan_end_date: iso,
    end_date: iso,
    amortization_schedule_id: 1, // שפיצר — what a bank mortgage almost always is
    grace_type_id: 1, // ללא
    grace_months: 0,
    // `anchor` is a NUMERIC column — the anchor's own rate. Writing the word
    // "פריים" into it made every save of an imported prime row fail with 22P02,
    // and the credit report does not print an anchor rate anyway. The prime track
    // is already carried by path_id, so there is nothing to lose here.
    anchor: null,
    group,
    is_guarantor: guarantor,
    source_bank: src.source,
    source_type: src.type,
    source_track: src.trackLabel,
  };
}

export interface ImportSummary {
  loans: ImportedLoan[];
  mortgages: ImportedLoan[];
  others: ImportedLoan[];
  clientName: string;
  clientId: string;
  reportDate: string;
  /** Debts present in the report but not carried over (cards, overdrafts…). */
  skipped: { label: string; count: number; balance: number }[];
  /** How many imported rows are guaranteed rather than owed. */
  guaranteed: number;
  totalBalance: number;
  totalMonthly: number;
}

/**
 * Build simulator rows from a parsed report: mortgages first, then consumer
 * loans, each biggest-first. Revolving facilities and current accounts are
 * deliberately left out — they have no term or amortization and would corrupt
 * the mix maths — but they are reported back so the UI can say what it dropped.
 */
export function importReportToLoans(report: CreditReport, mixId: string): ImportSummary {
  const extracted = extractLoans(report).filter((l) => l.balance > 0);

  // The client's own debts first, guaranteed ones after, each biggest-first.
  const byOwnThenSize = (a: ExtractedLoan, b: ExtractedLoan) =>
    Number(a.role === "guarantor") - Number(b.role === "guarantor") || b.balance - a.balance;

  const mortgages = extracted
    .filter((l) => l.category === "mortgage")
    .sort(byOwnThenSize)
    .map((l) => toLoanRow(l, mixId, "mortgage"));

  const others = extracted
    .filter((l) => l.category === "loan")
    .sort(byOwnThenSize)
    .map((l) => toLoanRow(l, mixId, "loan"));

  const skippedMap = new Map<string, { count: number; balance: number }>();
  for (const l of extracted) {
    if (l.category === "mortgage" || l.category === "loan") continue;
    const key =
      l.category === "card"
        ? "מסגרות אשראי וכרטיסים"
        : l.category === "overdraft"
          ? "חשבונות עובר ושב"
          : "התחייבויות נוספות";
    const cur = skippedMap.get(key) ?? { count: 0, balance: 0 };
    skippedMap.set(key, { count: cur.count + 1, balance: cur.balance + l.balance });
  }

  const loans = [...mortgages, ...others];
  return {
    loans,
    mortgages,
    others,
    clientName: report.client?.name ?? "",
    clientId: report.client?.idNumber ?? "",
    reportDate: report.meta?.reportDate ?? "",
    skipped: Array.from(skippedMap.entries()).map(([label, v]) => ({ label, ...v })),
    guaranteed: loans.filter((l) => l.is_guarantor).length,
    totalBalance: loans.reduce((s, l) => s + l.amount, 0),
    totalMonthly: extracted
      .filter((l) => l.category === "mortgage" || l.category === "loan")
      .reduce((s, l) => s + l.displayMonthly, 0),
  };
}

/** Group rows for rendering: mortgages block, then loans block. */
export function groupLoans(loans: ImportedLoan[]) {
  const mortgage = loans.filter((l) => l.group === "mortgage");
  const loan = loans.filter((l) => l.group === "loan");
  const ungrouped = loans.filter((l) => l.group !== "mortgage" && l.group !== "loan");
  return { mortgage, loan, ungrouped };
}
