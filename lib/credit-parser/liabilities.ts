// Liability-board model for /aa4: groups every open debt from one or more
// credit reports (e.g. both spouses) into the BDI page-2 sections
// (משכנתא / הלוואות / מסגרות אשראי / עו"ש), and cross-matches loans that appear
// in more than one report so a joint debt is only counted once.

import type { CreditReport } from "./types";
import {
  parseNum,
  type ExtractedLoan,
  type LiabilityCategory,
} from "./loan-mapping";

// ---------------------------------------------------------------------------
// shapes
// ---------------------------------------------------------------------------

/** One uploaded report (one person). */
export interface ReportSlot {
  id: string;
  fileName: string;
  report: CreditReport;
  loans: ExtractedLoan[];
}

/** A liability row's link back to the transaction(s) it came from. */
export interface SourceRef {
  person: number; // index into the ReportSlot list
  loan: ExtractedLoan;
}

/**
 * One editable row on the liabilities board. Money fields are digit-grouped
 * strings ("89,223") because they back free-text inputs.
 */
export interface LiabilityRow {
  id: string;
  category: LiabilityCategory;
  bank: string;
  typeLabel: string;
  role: "debtor" | "guarantor";
  owners: number[]; // person indices; a joint debt lists both
  sources: SourceRef[]; // empty for manually-added rows
  track: string; // mortgage track/type, editable
  balance: string; // יתרת חוב
  monthly: string; // החזר חודשי
  interest: string; // annual nominal %
  months: string; // remaining term
  endDate: string;
  limit: number; // credit limit (revolving facilities)
  include: boolean; // streamed into the consolidation calculator
  joint: boolean; // matched across two reports
  manual: boolean;
}

/** Two single-owner rows that look like the same debt but weren't certain. */
export interface MatchSuggestion {
  a: string; // row id
  b: string; // row id
}

export const CATEGORY_ORDER: LiabilityCategory[] = [
  "mortgage",
  "loan",
  "card",
  "overdraft",
  "other",
];

export const CATEGORY_LABEL: Record<LiabilityCategory, string> = {
  mortgage: "משכנתאות",
  loan: "הלוואות",
  card: "מסגרות אשראי וכרטיסים",
  overdraft: "חשבונות עובר ושב",
  other: "התחייבויות נוספות",
};

/** Person accent colours, by report order (first = the brand petrol). */
export const PERSON_COLORS = ["#1d75a1", "#6d5bd0", "#0e8a80", "#bf7d17"];

let seq = 0;
const rid = () => `liab_${++seq}`;

const group = (n: number) => (n > 0 ? Math.round(n).toLocaleString("en-US") : "");

// ---------------------------------------------------------------------------
// row construction
// ---------------------------------------------------------------------------

export function rowFromLoan(person: number, loan: ExtractedLoan): LiabilityRow {
  return {
    id: rid(),
    category: loan.category,
    bank: loan.source,
    typeLabel: loan.type,
    role: loan.role,
    owners: [person],
    sources: [{ person, loan }],
    track: loan.trackLabel,
    balance: group(loan.balance),
    monthly: group(loan.displayMonthly),
    interest: loan.interest,
    months: loan.months,
    endDate: loan.endDate,
    limit: loan.limit,
    include: loan.defaultInclude,
    joint: false,
    manual: false,
  };
}

export function manualRow(
  category: LiabilityCategory,
  person = 0
): LiabilityRow {
  return {
    id: rid(),
    category,
    bank: "",
    typeLabel: "",
    role: "debtor",
    owners: [person],
    sources: [],
    track: "",
    balance: "",
    monthly: "",
    interest: "",
    months: "",
    endDate: "",
    limit: 0,
    include: category === "mortgage" || category === "loan",
    joint: false,
    manual: true,
  };
}

// ---------------------------------------------------------------------------
// cross-report matching
// ---------------------------------------------------------------------------

const normBank = (s: string) =>
  s
    .replace(/["״'׳]/g, "")
    .replace(/בע.?מ/g, "")
    .replace(/\s+/g, " ")
    .trim();

/** dd/mm/yyyy → same calendar month in both. */
const sameMonth = (a: string, b: string) => a.slice(3) === b.slice(3);

/**
 * How strongly two debts from *different* reports look like the same one.
 * 0 = different debts · 1 = plausible (offer a merge) · 2 = certain (auto-merge).
 *
 * A genuinely joint loan is reported by the same bank in both reports with an
 * identical planned end date and (near-)identical balance; small balance drift
 * is allowed for reports generated on different days.
 */
export function matchScore(a: ExtractedLoan, b: ExtractedLoan): 0 | 1 | 2 {
  if (a.category !== b.category || a.role !== b.role) return 0;
  if (normBank(a.source) !== normBank(b.source)) return 0;

  const maxBal = Math.max(a.balance, b.balance);
  const drift = maxBal ? Math.abs(a.balance - b.balance) / maxBal : 0;

  const endKnown = !!(a.endDate && b.endDate);
  if (endKnown && !sameMonth(a.endDate, b.endDate)) return 0;
  const endSame = endKnown && a.endDate === b.endDate;

  const origSame =
    a.origAmount > 0 &&
    b.origAmount > 0 &&
    Math.abs(a.origAmount - b.origAmount) /
      Math.max(a.origAmount, b.origAmount) <
      0.01;

  // A joint current account is reported identically in both reports. Separate
  // same-bank cards with similar balances are common between spouses, so
  // revolving facilities are otherwise never merged without confirmation.
  if (
    a.category === "overdraft" &&
    drift === 0 &&
    a.balance > 0 &&
    a.limit === b.limit
  ) {
    return 2;
  }

  if (drift <= 0.02 && (endSame || origSame)) return 2;
  if (drift <= 0.05 && endSame && origSame) return 2;
  if (drift <= 0.15) return 1;
  return 0;
}

/**
 * Build the board from all uploaded reports: one row per debt, with certain
 * cross-report duplicates merged into a single joint row and plausible ones
 * returned as suggestions for the user to confirm.
 */
export function buildLiabilities(slots: ReportSlot[]): {
  rows: LiabilityRow[];
  suggestions: MatchSuggestion[];
} {
  const rows: LiabilityRow[] = [];

  slots.forEach((slot, person) => {
    for (const loan of slot.loans) {
      const hit = rows.find(
        (r) =>
          !r.manual &&
          !r.owners.includes(person) &&
          r.sources.some((s) => matchScore(s.loan, loan) === 2)
      );
      if (hit) {
        hit.owners.push(person);
        hit.sources.push({ person, loan });
        hit.joint = true;
        continue;
      }
      rows.push(rowFromLoan(person, loan));
    }
  });

  // Plausible duplicates among the remaining single-owner rows.
  const suggestions: MatchSuggestion[] = [];
  const taken = new Set<string>();
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      if (a.joint || b.joint) continue;
      if (a.owners[0] === b.owners[0]) continue;
      if (taken.has(a.id) || taken.has(b.id)) continue;
      if (matchScore(a.sources[0].loan, b.sources[0].loan) === 1) {
        suggestions.push({ a: a.id, b: b.id });
        taken.add(a.id);
        taken.add(b.id);
      }
    }
  }

  return { rows: sortRows(rows), suggestions };
}

function sortRows(rows: LiabilityRow[]): LiabilityRow[] {
  return [...rows].sort((x, y) => {
    const c =
      CATEGORY_ORDER.indexOf(x.category) - CATEGORY_ORDER.indexOf(y.category);
    if (c) return c;
    return parseNum(y.balance) - parseNum(x.balance);
  });
}

/** Merge row `b` into row `a` as one joint debt (keeps `a`'s edited values). */
export function mergeRows(
  rows: LiabilityRow[],
  aId: string,
  bId: string
): LiabilityRow[] {
  const a = rows.find((r) => r.id === aId);
  const b = rows.find((r) => r.id === bId);
  if (!a || !b) return rows;
  const merged: LiabilityRow = {
    ...a,
    owners: Array.from(new Set(a.owners.concat(b.owners))).sort(),
    sources: [...a.sources, ...b.sources],
    joint: true,
    include: a.include || b.include,
  };
  return sortRows(rows.filter((r) => r.id !== bId).map((r) => (r.id === aId ? merged : r)));
}

/** Split a joint row back into one row per source report. */
export function splitRow(rows: LiabilityRow[], id: string): LiabilityRow[] {
  const row = rows.find((r) => r.id === id);
  if (!row || row.sources.length < 2) return rows;
  const parts = row.sources.map((s) => ({
    ...rowFromLoan(s.person, s.loan),
    include: row.include,
  }));
  return sortRows(rows.flatMap((r) => (r.id === id ? parts : [r])));
}

// ---------------------------------------------------------------------------
// totals
// ---------------------------------------------------------------------------

export interface LiabilityTotals {
  balance: number;
  monthly: number;
  count: number;
  joint: number;
}

/** Joint rows are single rows here, so a plain sum already counts them once. */
export function rowTotals(rows: LiabilityRow[]): LiabilityTotals {
  return rows.reduce(
    (t, r) => ({
      balance: t.balance + parseNum(r.balance),
      monthly: t.monthly + parseNum(r.monthly),
      count: t.count + 1,
      joint: t.joint + (r.joint ? 1 : 0),
    }),
    { balance: 0, monthly: 0, count: 0, joint: 0 }
  );
}
