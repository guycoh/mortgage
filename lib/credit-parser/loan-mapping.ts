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

import { FREQ_FIXED, FREQ_PRIME, FREQ_UNSTATED } from "../rate-frequency";
import type { CreditReport, Transaction, InterestTrack } from "./types";

/** BDI page-2 grouping: the four liability families + a catch-all. */
export type LiabilityCategory =
  | "mortgage"
  | "loan"
  | "card"
  | "overdraft"
  | "other";

export interface ExtractedLoan {
  uid: string;
  source: string; // reporting bank
  type: string; // transaction type (201-002)
  role: "debtor" | "guarantor";
  section: "current" | "active" | "inactive";
  isMortgage: boolean;
  /** A real loan or mortgage (vs. a revolving facility / overdraft / guarantee). */
  isLoanOrMortgage: boolean;
  /** Which BDI page-2 section the debt belongs to. */
  category: LiabilityCategory;
  /** Human mortgage-track label derived from the interest tracks (e.g. "פריים"). */
  trackLabel: string;
  /** תדירות שינוי — derived, because this report has no field for it. */
  changeFrequency: string;
  /** עוגן (201-034) of the dominant track, e.g. "ריבית פריים" ("" when blank). */
  anchorName: string;
  /** מרווח (201-035) over that anchor, in points; null when not printed. */
  anchorMargin: number | null;
  balance: number; // numeric outstanding balance
  balanceStr: string; // "89,223" (grouped, for the input field)
  interest: string; // annual nominal %, e.g. "8.42" ("" when unknown)
  months: string; // remaining term in months, e.g. "26" ("" when unknown)
  monthlyPayment: number; // payment recomputed from the row above
  knownPayment: number; // reported monthly payment (201-046), 0 when absent
  /** Monthly repayment to display: the reported payment when present, else computed. */
  displayMonthly: number;
  startDate: string; // 201-016 transaction start (dd/mm/yyyy, "" when absent)
  endDate: string; // 201-018 planned end (dd/mm/yyyy, "" when absent)
  limit: number; // 201-020 credit limit (revolving facilities), 0 when absent
  origAmount: number; // 201-045 original loan amount, 0 when absent
  overdue: number; // 201-051 amount unpaid on time, 0 when not in arrears
  arrearsRange: string; // 201-050 days-in-arrears range ("" when not in arrears)
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

const OVERDRAFT_RE = /עובר ושב|עו["״]?ש/;
const CARD_RE = /מסגרת|כרטיס/;

/** Classify a transaction into its BDI page-2 section. */
export function liabilityCategory(t: Transaction): LiabilityCategory {
  if (isMortgageTxn(t)) return "mortgage";
  const type = t.fields["201-002"] ?? "";
  if (/הלוואה/.test(type)) return "loan";
  if (OVERDRAFT_RE.test(type)) return "overdraft";
  if (CARD_RE.test(type)) return "card";
  return "other";
}

/** Short human name for one interest track: "פריים", "קבועה צמודה", ... */
function trackName(tr: InterestTrack): string {
  if (tr.anchor.includes("פריים")) return "פריים";
  if (isInterestFree(tr)) return "ללא ריבית";
  const kind = tr.type.includes("משתנה")
    ? "משתנה"
    : tr.type.includes("קבועה")
      ? "קבועה"
      : tr.type.trim();
  const linkage = /לא\s*צמוד/.test(tr.linkage)
    ? "לא צמודה"
    : tr.linkage.includes("צמוד")
      ? "צמודה"
      : "";
  return [kind, linkage].filter(Boolean).join(" ");
}

/**
 * The track that describes the debt: the one carrying the most drawn money.
 *
 * A revolving facility quotes five rates and uses one. Utilization is what says
 * which, and when nothing is drawn the first quoted track is all there is.
 */
function dominantTrack(tracks: InterestTrack[]): InterestTrack | null {
  if (!tracks.length) return null;
  return [...tracks].sort((a, b) => parseNum(b.utilization) - parseNum(a.utilization))[0];
}

/**
 * Mortgage track/type label: the dominant (highest-utilization) track's name,
 * with a "+N" suffix when the loan is split across several tracks.
 */
export function trackLabel(tracks: InterestTrack[]): string {
  const top = dominantTrack(tracks);
  if (!top) return "";
  const name = trackName(top);
  if (!name) return "";
  return tracks.length > 1 ? `${name} +${tracks.length - 1}` : name;
}

/**
 * תדירות שינוי, as far as this report can honestly go.
 *
 * The דוח ריכוז נתונים has no reset-interval field — see lib/rate-frequency.ts.
 * Two of its answers are still definite: a fixed or interest-free rate never
 * resets, and a prime-anchored one resets with the Bank of Israel. Everything
 * else is a variable rate whose period the report simply does not carry, and it
 * says exactly that instead of picking a plausible five years.
 */
/**
 * עוגן and מרווח of the track the debt is actually drawn on (201-034 / 201-035).
 *
 * The report prints these per interest track, so a facility quoting five rates
 * has five anchors. The one that matters is the one carrying the money — the same
 * track trackLabel and changeFrequency describe, so all three agree.
 */
export function anchorOf(tracks: InterestTrack[]): { name: string; margin: number | null } {
  const top = dominantTrack(tracks);
  if (!top) return { name: "", margin: null };
  const margin = parseFloat(top.margin);
  return {
    name: top.anchor.trim(),
    margin: Number.isFinite(margin) ? margin : null,
  };
}

export function changeFrequency(tracks: InterestTrack[]): string {
  const top = dominantTrack(tracks);
  if (!top) return "";
  // Prime first: a prime track is variable, so testing the type first would file
  // it as an unknown interval and lose the one thing that is certain about it.
  if (top.anchor.includes("פריים")) return FREQ_PRIME;
  if (isInterestFree(top) || top.type.includes("קבוע")) return FREQ_FIXED;
  return top.type.includes("משתנה") ? FREQ_UNSTATED : "";
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
  const anchor = anchorOf(t.interestTracks);

  // 1) Remaining months from the planned end date (independent of interest).
  //
  // Measured from the REPORT date, not from today: the balance on the row is
  // the balance as of the report, and pairing it with a term measured from a
  // later "now" amortizes a stale balance over a shortened term — on a
  // 14-month-old report that showed ₪1,766/mo where the bank printed ₪1,417.
  // The bank-statement parser already measures from the statement date; this
  // makes both documents agree.
  let months: number | null = null;
  let endPassed = false;
  const end = parseDmy(t.fields["201-018"]);
  if (end) {
    const m = Math.round(monthsBetween(asOf, end));
    if (m > 0) months = m;
    else endPassed = true;
  }

  // 2) Interest from the tracks; if none, back-solve from the known payment.
  let interest = interestFromTracks(t);
  if (interest === "" && knownPayment > 0 && balance > 0 && months) {
    const r = solveMonthlyRate(balance, knownPayment, months);
    if (r > 0) interest = round2(r * 12 * 100);
  }

  // 3) Months still unknown? back-solve from the known payment + interest —
  // but only when there was no end date at all. A loan whose planned end has
  // PASSED is not amortizing on schedule (it is defaulted or in collection),
  // and back-solving a term for it fabricated a 1-month loan whose fake
  // payment then polluted the mix totals. Leaving months empty lets the grid
  // say "חסרה תקופה" and keeps the debt out of the monthly arithmetic.
  if (months === null && !endPassed && knownPayment > 0 && balance > 0) {
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
    category: liabilityCategory(t),
    trackLabel: trackLabel(t.interestTracks),
    changeFrequency: changeFrequency(t.interestTracks),
    anchorName: anchor.name,
    anchorMargin: anchor.margin,
    balance,
    balanceStr: groupThousands(balance),
    interest,
    months: months ? String(months) : "",
    monthlyPayment,
    knownPayment,
    displayMonthly: knownPayment > 0 ? knownPayment : monthlyPayment,
    startDate: t.fields["201-016"] || "",
    endDate: t.fields["201-018"] || "",
    limit: parseNum(t.fields["201-020"]),
    origAmount: parseNum(t.fields["201-045"]),
    overdue: parseNum(t.fields["201-051"]),
    arrearsRange: t.fields["201-050"] || "",
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
  // Remaining term is measured from the REPORT's own date to the planned end
  // date (201-018), because every balance in the report is a balance as of
  // that date. Falls back to today only when the header date failed to parse.
  const asOf = parseDmy(report.meta?.reportDate) ?? new Date();
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
