// Maps a parsed CreditReport into the shape the /aa4 loan-consolidation
// calculator understands: one row per debt with { balance, interest, months }.
//
// Field codes (see ./dictionary.ts):
//   201-049  יתרת חוב            → outstanding balance
//   201-018  תאריך סיום מתוכנן   → planned end date (→ remaining months)
//   201-046  תשלום חודשי צפוי    → known monthly payment (used to back-solve)
//   201-045  סכום הלוואה מקורי   → original amount (fallback)
//   201-002  סוג עסקה            → transaction type (mortgage detection)
//   201-017  מטרת האשראי         → credit purpose (mortgage detection)
// Interest comes from the per-track nominal rates (Transaction.interestTracks),
// utilization-weighted so the rate reflects the money actually drawn.

import type { CreditReport, Transaction, InterestTrack } from "./types";

export interface ExtractedLoan {
  uid: string;
  source: string; // reporting bank
  type: string; // transaction type (201-002)
  role: "debtor" | "guarantor";
  section: "current" | "active" | "inactive";
  isMortgage: boolean;
  /** A real loan or mortgage (vs. a revolving facility / overdraft / guarantee). */
  isLoanOrMortgage: boolean;
  balance: number; // numeric outstanding balance
  balanceStr: string; // "89,223" (grouped, for the input field)
  interest: string; // annual nominal %, e.g. "8.42" ("" when unknown)
  months: string; // remaining term in months, e.g. "26" ("" when unknown)
  monthlyPayment: number; // payment recomputed from the row above
  knownPayment: number; // reported monthly payment (201-046), 0 when absent
  /** Pre-checked for the loans table: the client's own, non-mortgage debts. */
  defaultInclude: boolean;
}

export interface LoanRow {
  balance: string;
  interest: string;
  months: string;
  /** Reporting bank — for tagging the row in the calculator. */
  source?: string;
  /** Transaction type label (e.g. משכנתה / הלוואה). */
  typeLabel?: string;
  /** Whether this row is a mortgage or a plain loan. */
  kind?: "mortgage" | "loan";
}

// ---------------------------------------------------------------------------
// numeric helpers
// ---------------------------------------------------------------------------

export function parseNum(v?: string): number {
  if (!v) return 0;
  const n = Number(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function groupThousands(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

function round2(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

/** Parse a dd/mm/yyyy date; returns null on anything unexpected. */
function parseDmy(v?: string): Date | null {
  if (!v) return null;
  const m = v.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(y, mo - 1, d);
}

/** Whole-month distance from `a` to `b` (fractional days rounded in). */
function monthsBetween(a: Date, b: Date): number {
  return (
    (b.getFullYear() - a.getFullYear()) * 12 +
    (b.getMonth() - a.getMonth()) +
    (b.getDate() - a.getDate()) / 30
  );
}

/** Standard amortized monthly payment for principal P, monthly rate r, n months. */
function payment(P: number, r: number, n: number): number {
  if (n <= 0) return 0;
  if (r <= 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}

/** Back-solve the monthly rate that reproduces a known payment (bisection). */
function solveMonthlyRate(P: number, pmt: number, n: number): number {
  if (P <= 0 || pmt <= 0 || n <= 0) return 0;
  // If the payment barely covers principal, the implied interest is ~0.
  if (pmt <= P / n + 1e-6) return 0;
  let lo = 1e-7;
  let hi = 0.125; // 12.5%/month ≈ 150%/yr ceiling (well above any real credit rate)
  if (payment(P, hi, n) < pmt) return hi; // pathological; clamp
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (payment(P, mid, n) > pmt) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

/** Back-solve the term (months) from principal, monthly rate and payment. */
function solveMonths(P: number, r: number, pmt: number): number | null {
  if (P <= 0 || pmt <= 0) return null;
  if (r <= 0) return Math.max(1, Math.round(P / pmt));
  if (pmt <= P * r + 1e-9) return null; // payment never retires the principal
  const n = -Math.log(1 - (r * P) / pmt) / Math.log(1 + r);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(1, Math.round(n));
}

// ---------------------------------------------------------------------------
// per-transaction derivation
// ---------------------------------------------------------------------------

const MORTGAGE_RE = /משכנת|לדיור/;
// Only these transaction types feed the consolidation calculator: real loans
// and mortgages. Revolving facilities (מסגרת אשראי), overdrafts (עו"ש),
// guarantees (ערבות) and discounting (ניכיון) are intentionally excluded.
const LOAN_OR_MORTGAGE_RE = /הלוואה|משכנת|לדיור/;

function isMortgageTxn(t: Transaction): boolean {
  const type = t.fields["201-002"] ?? "";
  const purpose = t.fields["201-017"] ?? "";
  return MORTGAGE_RE.test(type) || purpose.includes("דיור");
}

function isLoanOrMortgage(t: Transaction): boolean {
  return LOAN_OR_MORTGAGE_RE.test(t.fields["201-002"] ?? "");
}

/** True when the track is flagged interest-free (ללא ריבית / הריבית = אפס). */
function isInterestFree(tr: InterestTrack): boolean {
  return tr.type.includes("ללא") || tr.type.includes("אפס");
}

/**
 * A track's nominal rate as a number. An interest-free track is 0 even when the
 * PDF renders its rate cell blank or as a fused "0%" token the parser can't
 * split into a numeric nominal — so we trust the track's type over its (often
 * empty) nominal string.
 */
function trackNominal(tr: InterestTrack): number {
  if (isInterestFree(tr)) return 0;
  return parseFloat(tr.nominal);
}

/** Utilization-weighted nominal rate across the interest tracks. */
function interestFromTracks(t: Transaction): string {
  const tracks = t.interestTracks;
  if (!tracks.length) return "";
  let wsum = 0;
  let w = 0;
  for (const tr of tracks) {
    const u = parseNum(tr.utilization);
    const nom = trackNominal(tr);
    if (u > 0 && Number.isFinite(nom)) {
      wsum += u * nom;
      w += u;
    }
  }
  if (w > 0) return round2(wsum / w);
  // Nothing marked as utilized — fall back to the highest quoted nominal.
  const noms = tracks
    .map(trackNominal)
    .filter((n) => Number.isFinite(n) && n > 0);
  if (noms.length) return round2(Math.max(...noms));
  // No priced tracks at all: an interest-free-only facility is genuinely 0%.
  return tracks.some(isInterestFree) ? "0" : "";
}

function deriveLoan(t: Transaction, asOf: Date): ExtractedLoan {
  const balance = parseNum(t.fields["201-049"]);
  const knownPayment = parseNum(t.fields["201-046"]);
  const mortgage = isMortgageTxn(t);

  // 1) Remaining months from the planned end date (independent of interest).
  let months: number | null = null;
  const end = parseDmy(t.fields["201-018"]);
  if (end) {
    const m = Math.round(monthsBetween(asOf, end));
    if (m > 0) months = m;
  }

  // 2) Interest from the tracks; if none, back-solve from the known payment.
  let interest = interestFromTracks(t);
  if (interest === "" && knownPayment > 0 && balance > 0 && months) {
    const r = solveMonthlyRate(balance, knownPayment, months);
    if (r > 0) interest = round2(r * 12 * 100);
  }

  // 3) Months still unknown? back-solve from the known payment + interest.
  if (months === null && knownPayment > 0 && balance > 0) {
    const r = parseFloat(interest || "0") / 100 / 12;
    const solved = solveMonths(balance, r, knownPayment);
    if (solved) months = solved;
  }

  const rMonthly = parseFloat(interest || "0") / 100 / 12;
  const monthlyPayment =
    balance > 0 && months ? Math.round(payment(balance, rMonthly, months)) : 0;

  return {
    uid: t.uid,
    source: t.source || "—",
    type: t.fields["201-002"] || "",
    role: t.role,
    section: t.section,
    isMortgage: mortgage,
    isLoanOrMortgage: isLoanOrMortgage(t),
    balance,
    balanceStr: groupThousands(balance),
    interest,
    months: months ? String(months) : "",
    monthlyPayment,
    knownPayment,
    // Auto-inject the client's own active loans & mortgages only.
    defaultInclude:
      t.role === "debtor" &&
      t.section === "active" &&
      balance > 0 &&
      isLoanOrMortgage(t),
  };
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

/**
 * All open debts worth showing: active/current transactions carrying an
 * outstanding balance. Sorted biggest-first. `defaultInclude` marks the ones
 * that pre-populate the loans table (the client's own, non-mortgage debts).
 */
export function extractLoans(report: CreditReport): ExtractedLoan[] {
  // Remaining term is measured from *today* to the planned end date (201-018),
  // so the months shown reflect what is actually left to pay now.
  const asOf = new Date();
  return report.transactions
    .filter(
      (t) =>
        (t.section === "active" || t.section === "current") &&
        parseNum(t.fields["201-049"]) > 0
    )
    .map((t) => deriveLoan(t, asOf))
    .sort((a, b) => b.balance - a.balance);
}

/** Convert selected loans into the calculator's row shape. */
export function toLoanRows(loans: ExtractedLoan[]): LoanRow[] {
  return loans.map((l) => ({
    balance: l.balanceStr,
    interest: l.interest,
    months: l.months,
    source: l.source,
    typeLabel: l.type,
    kind: l.isMortgage ? ("mortgage" as const) : ("loan" as const),
  }));
}

/**
 * Mortgage balances for the "יתרות משכנתא" boxes (up to `slots`, default 3).
 * Only the client's own (debtor) active/current mortgages; any overflow is
 * folded into the last slot so the total stays faithful.
 */
export function extractMortgageBalances(
  loans: ExtractedLoan[],
  slots = 3
): number[] {
  const mortgages = loans
    .filter((l) => l.isMortgage && l.role === "debtor")
    .map((l) => l.balance);
  if (mortgages.length <= slots) return mortgages;
  const head = mortgages.slice(0, slots - 1);
  const tail = mortgages.slice(slots - 1).reduce((s, v) => s + v, 0);
  return [...head, tail];
}
