// Reading a חיווי אשראי the way an underwriter reads it.
//
// The simulator only needs four numbers per debt (balance, rate, term, payment)
// — everything else the דוח ריכוז נתונים carries is thrown away on import. But
// that discarded material is most of what decides whether a file is bankable:
// arrears history, enforced-collection remarks, insolvency proceedings, how
// much of a revolving limit is drawn, how many lenders were approached last
// quarter, whether a mortgage is 80% variable.
//
// So this module re-reads the parsed report and produces one Analysis object:
// an inventory of every liability, per-family totals, mortgage track exposure,
// payment behaviour, credit-seeking activity, legal proceedings — and a ranked
// list of flags, each carrying the concrete number that triggered it.
//
// Everything here is pure and derived. It never mutates the report, and it is
// never persisted: the analysis is recomputed from the PDF on every import.

import type {
  AdminAction,
  Collateral,
  CreditReport,
  InterestTrack,
  MonthlyGrid,
  NewCreditInquiry,
  Transaction,
} from "@/lib/credit-parser/types";
import {
  extractLoans,
  liabilityCategory,
  parseNum,
  trackLabel,
  type ExtractedLoan,
  type LiabilityCategory,
} from "@/lib/credit-parser/loan-mapping";
import {
  APPLICATIONS_IN_WINDOW_TRIGGER,
  ARREARS_BUCKET_HIGH,
  CONSUMER_MONTHLY_SHARE_TRIGGER,
  DEAR_RATE_CONSUMER,
  DEAR_RATE_CONSUMER_HIGH,
  DISHONOURED_COUNT_HIGH,
  LINKED_SHARE_TRIGGER,
  LTV_HIGH,
  LTV_TRIGGER,
  UTILISATION_PEAK_EXCESS,
  UTILISATION_PEAK_RATIO,
  isDearRate,
  linkedIsHigh,
  noteOf,
  show,
  silent,
  utilisationHeat,
  variableSeverity,
  type ClientDisposition,
} from "@/lib/verdicts";

/* --------------------------------------------------------------- vocabulary */

export type Severity = "critical" | "high" | "medium" | "info";

/** Ranked worst-first, which is also the order they are shown in. */
export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "info"];

export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "קריטי",
  high: "מהותי",
  medium: "לתשומת לב",
  info: "הערה",
};

export const CATEGORY_LABEL: Record<LiabilityCategory, string> = {
  mortgage: "משכנתאות",
  loan: "הלוואות",
  card: "מסגרות וכרטיסי אשראי",
  overdraft: 'חשבונות עו"ש',
  other: "התחייבויות אחרות",
};

/** Display order of the families — mortgages first, catch-all last. */
export const CATEGORY_ORDER: LiabilityCategory[] = [
  "mortgage",
  "loan",
  "card",
  "overdraft",
  "other",
];

export interface Flag {
  id: string;
  severity: Severity;
  /** Short enough to scan in a list. */
  title: string;
  /** One sentence saying what it means for the file. */
  detail: string;
  /**
   * Whether the client hears this, and in what words. NOT optional.
   *
   * The client page used to keep its own hand-written list of worries, and five of
   * the nine critical/high findings had quietly never made it in. Requiring a
   * disposition here means a new finding cannot be added without deciding, in the
   * same diff, whether the client is told — and writing down why when they are not.
   */
  client: ClientDisposition;
  /** Which debts triggered it, for the analyst to go look. */
  where?: string[];
  amount?: number;
  /**
   * Where the evidence for this finding actually is.
   *
   * A finding that states a number without showing you the rows behind it asks
   * to be taken on trust. `section` is where to go; `uids` are the exact debts
   * that produced it, so the claim can be pointed at rather than described.
   */
  target?: { section: string; uids?: string[] };
}

/** One liability, with everything the report says about it. */
export interface DebtLine {
  uid: string;
  bank: string;
  type: string;
  category: LiabilityCategory;
  role: "debtor" | "guarantor";
  section: "current" | "active" | "inactive";
  balance: number;
  original: number;
  limit: number;
  /** Annual nominal %, utilization-weighted across tracks. null when unpriced. */
  rate: number | null;
  monthly: number;
  /** 201-048 — what actually left the account. Below `monthly` on a card means
   *  the charge is being rolled rather than cleared. */
  paidActually: number;
  months: number | null;
  startDate: string;
  endDate: string;
  status: string;
  purpose: string;
  frequency: string;
  paymentType: string;
  /** Principal falls due in one lump — a payment shock the mix maths hides. */
  balloon: boolean;
  overdue: number;
  arrearsRange: string;
  firstMiss: string;
  lastPaid: string;
  track: string;
  tracks: InterestTrack[];
  collateral: Collateral[];
  remarks: string[];
  grids: MonthlyGrid[];
  /** Drawn ÷ limit as a PERCENTAGE (0-100), for facilities that state a limit. */
  utilization: number | null;
  /** What the drawn balance costs — utilisation-weighted over the tracks the
   *  report marks as used. null when the report does not say where the money is. */
  rateOnDrawn: number | null;
  /** The dearest rate quoted on the facility, drawn or not. */
  rateMaxQuoted: number | null;
  /** The drawn money sits entirely on a ללא ריבית track. */
  interestFree: boolean;
  /** Which money fields the document actually printed — see toLine. */
  reported: { limit: boolean; monthly: boolean; paid: boolean; peak: boolean };
  /** Highest the facility was drawn during the reporting month (201-072).
   *  A limit that looks calm on the statement date can still be run to the
   *  ceiling mid-month, which is the number a lender actually reacts to. */
  peak: number;
  /** The same debt appeared in more than one report (a joint household debt). */
  shared: boolean;
  /** Which report(s) it came from, by client name. */
  reportedBy: string[];
}

export interface CategoryTotals {
  category: LiabilityCategory;
  count: number;
  balance: number;
  monthly: number;
  limit: number;
  overdue: number;
  /** Balance-weighted nominal rate, null when nothing in the family is priced. */
  rate: number | null;
}

export interface TrackSlice {
  label: string;
  amount: number;
  share: number;
  rate: number | null;
  variable: boolean;
  linked: boolean;
}

export interface ClientCard {
  name: string;
  idNumber: string;
  clientType: string;
  systemStatus: string;
  collectionStart: string;
  reportDate: string;
  reportType: string;
  fileName: string;
}

export interface Behaviour {
  checksPresented: number;
  checksReturned: number;
  debitsPresented: number;
  debitsDishonored: number;
  /** Months in arrears, worst bucket per month, newest year first. */
  arrears: { year: string; months: (number | null)[] }[];
  arrearsMonths: number;
  worstBucket: number;
}

export interface Inquiries {
  last3: number;
  last12: number;
  total: number;
  pending: NewCreditInquiry[];
  byPurpose: { purpose: string; count: number }[];
}

export interface Legal {
  execution: Record<string, string>[];
  insolvency: Record<string, string>[];
  nonPayment: CreditReport["nonPaymentIndicators"];
  /** Open files only — a closed case with a nil balance is history, not debt. */
  executionOpen: Record<string, string>[];
  executionDebt: number;
  adminActions: AdminAction[];
}

/** One line of the report's own תמצית — the lender's stated position. */
export interface SourceTotal {
  role: "debtor" | "guarantor";
  transactionType: string;
  category: LiabilityCategory;
  source: string;
  count: string;
  limit: number;
  balance: number;
  overdue: number;
}

/**
 * The תמצית against the transaction pages.
 *
 * These are two statements of the same thing, and they do not always agree —
 * the summary counts facilities the detail pages sometimes omit. When the
 * summary is larger, the summary is right and the analysis is reading short,
 * which the advisor needs told rather than hidden.
 */
export interface Reconciliation {
  summaryBalance: number;
  summaryLimit: number;
  extractedBalance: number;
  extractedLimit: number;
  balanceGap: number;
  limitGap: number;
  missingCounts: string[];
}

export interface Analysis {
  clients: ClientCard[];
  lines: DebtLine[];
  byCategory: CategoryTotals[];
  totals: {
    balance: number;
    monthly: number;
    overdue: number;
    limit: number;
    rate: number | null;
    /** Guaranteed rather than owed — real exposure, not their repayment. */
    guaranteedBalance: number;
    guaranteedCount: number;
  };
  mortgage: {
    balance: number;
    monthly: number;
    rate: number | null;
    tracks: TrackSlice[];
    variableShare: number;
    linkedShare: number;
    collateralValue: number;
    /** Balance ÷ collateral value, when the report prices the collateral. */
    ltv: number | null;
    longestMonths: number | null;
  };
  consumer: {
    balance: number;
    monthly: number;
    rate: number | null;
    count: number;
    worstRate: number | null;
    /** Consumer repayment as a share of all monthly repayment. */
    shareOfMonthly: number;
  };
  revolving: {
    /** Sum of the ceilings that were actually printed. */
    limit: number;
    /** Balance drawn against those ceilings — the utilisation numerator. */
    used: number;
    /** used ÷ limit, as a percentage. Never above 100 by construction. */
    utilization: number | null;
    /** Balance on facilities with no approved limit on record. Debt, not draw-down. */
    unlimitedBalance: number;
    peak: number;
    /** Every open revolving balance, whether or not a limit was printed. */
    totalBalance: number;
  };
  /**
   * What the cards and the current account actually take out of the household
   * every month.
   *
   * This is the number an advisor is asked for first and the report states
   * plainly — yet it never reaches the mix, because a revolving facility has no
   * term to amortise and is dropped on import. Left out, the monthly outgoings
   * look smaller than they are.
   */
  cards: {
    /** 201-046 across cards and current accounts — the charge. */
    monthlyCharge: number;
    /** 201-048 — what was actually paid against it. */
    paidActually: number;
    /** Charge minus payment: what rolled into next month. */
    rolled: number;
    count: number;
  };
  behaviour: Behaviour;
  inquiries: Inquiries;
  legal: Legal;
  /** The report's own summary table, per lender. */
  sources: SourceTotal[];
  reconcile: Reconciliation;
  flags: Flag[];
  /** Exactly what the client page renders — see buildClientView. */
  clientView: ClientView;
  warnings: string[];
}

/* ------------------------------------------------------- what a client sees */

/** One line on the client page. A lender's whole holding, or one facility. */
export interface ClientRow {
  /** Every uid folded into this row, so a worry can be tied to what is on screen. */
  uids: string[];
  bank: string;
  family: "mortgage" | "loan" | "card";
  /** 201-002 as printed — only meaningful on the card family. */
  type: string;
  parts: number;
  balance: number;
  monthly: number;
  months: number | null;
  late: boolean;
  overdue: number;
  arrearsRange: string;
  /** What the drawn money costs, where the report says. */
  rate: number | null;
  /** The dearest rate quoted, drawn or not. */
  rateMaxQuoted: number | null;
  interestFree: boolean;
  minRate: number | null;
  maxRate: number | null;
  limit: number;
  /** Percentage, 0-100. */
  utilization: number | null;
  peak: number;
  /** Charged but not paid — only when the report printed both figures. */
  rolled: number;
  reported: { limit: boolean; monthly: boolean; paid: boolean; peak: boolean };
  remarks: string[];
}

export interface ClientSection {
  key: "mortgage" | "loan" | "card";
  title: string;
  accent: string;
  rows: ClientRow[];
}

/**
 * The client page, decided in the engine rather than in the component.
 *
 * The component used to select its own rows and recompute its own worries with its
 * own thresholds. That is how it came to announce ₪372,873 of arrears above rows
 * accounting for ₪33,825, and to print a ₪799,555 footer over ₪451,962 of visible
 * balances — two populations, no arithmetic tying them together.
 *
 * Here there is one population. `shownBalance` is summed over the same `sections`
 * array the component maps, so the two cannot drift; `unshownBalance` is the proof
 * and must be zero.
 */
export interface ClientView {
  sections: ClientSection[];
  worries: { say: string; severity: Severity }[];
  footer: { balance: number; monthly: number };
  shownBalance: number;
  /** footer.balance − shownBalance. Zero, or the page says so out loud. */
  unshownBalance: number;
}

/* ------------------------------------------------------------------ helpers */

const num = (v?: string) => parseNum(v);

/** dd/mm/yyyy → Date. The report never uses any other form. */
function dmy(v?: string): Date | null {
  const m = (v ?? "").match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

const monthsAgo = (d: Date | null, now: Date): number =>
  d ? (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()) : Infinity;

/** Balance-weighted mean rate. Unpriced debts are excluded, not counted as 0. */
function weightedRate(rows: { balance: number; rate: number | null }[]): number | null {
  let w = 0;
  let sum = 0;
  for (const r of rows) {
    if (r.rate === null || !Number.isFinite(r.rate) || r.balance <= 0) continue;
    w += r.balance;
    sum += r.balance * r.rate;
  }
  return w > 0 ? Math.round((sum / w) * 100) / 100 : null;
}

const BALLOON_RE = /בלון|בולט/;
const VARIABLE_RE = /משתנה|פריים/;

function isLinked(tr: InterestTrack): boolean {
  return !/לא\s*צמוד/.test(tr.linkage) && tr.linkage.includes("צמוד");
}

function isVariable(tr: InterestTrack): boolean {
  return VARIABLE_RE.test(tr.type) || tr.anchor.includes("פריים");
}

/** "פריים" / "קבועה צמודה" / … — the same wording the ledger uses. */
function trackSliceLabel(tr: InterestTrack): string {
  if (tr.anchor.includes("פריים")) return "פריים";
  if (tr.type.includes("ללא") || tr.type.includes("אפס")) return "ללא ריבית";
  const kind = tr.type.includes("משתנה") ? "משתנה" : tr.type.includes("קבועה") ? "קבועה" : tr.type.trim();
  const link = /לא\s*צמוד/.test(tr.linkage) ? "לא צמודה" : tr.linkage.includes("צמוד") ? "צמודה" : "";
  return [kind, link].filter(Boolean).join(" ") || "לא מסווג";
}

/**
 * Identity of a debt across two household reports.
 *
 * A jointly-held mortgage prints in full on both spouses' reports, so counting
 * both doubles the two numbers that matter. Same shape as the ledger's loanKey
 * — lender, size, price, term — with the balance bucketed to ₪50 because the
 * two reports are rarely pulled the same morning.
 */
function lineKey(l: DebtLine): string {
  return [
    l.category,
    l.type,
    l.role,
    l.bank.replace(/\s+/g, ""),
    Math.round(l.balance / 50),
    l.rate === null ? "-" : l.rate.toFixed(2),
    l.months ?? "-",
    l.startDate,
    l.endDate,
  ].join("|");
}

/* -------------------------------------------------------------- debt lines */

/**
 * A facility's price, read straight off its interest tracks.
 *
 * Two numbers, because one cannot honestly answer the question. The report quotes
 * up to five rates per revolving facility and marks which of them the drawn money
 * actually sits on (201-038). `onDrawn` is what the balance costs; `maxQuoted` is
 * what the rest of the limit would cost if it were used. Collapsing them loses the
 * distinction in both directions:
 *
 *   - כאל's ₪3,192 card quotes 17.00% and 17.90% with neither marked drawn.
 *     Reporting 17.90% as the price of the balance is a guess presented as a fact.
 *   - Discount's ₪1,029 facility sits on an interest-free track while quoting
 *     17.23% on the rest. Reporting 0% tells a client their card is free.
 *
 * Computed here rather than taken from extractLoans, which drops any transaction
 * with no balance — that is why a ₪15,000 מזרחי limit quoting five rates used to
 * arrive with no rate at all.
 */
function trackPricing(tracks: InterestTrack[]): {
  onDrawn: number | null;
  maxQuoted: number | null;
  interestFree: boolean;
} {
  const nominal = (tr: InterestTrack) => {
    const n = parseFloat(tr.nominal);
    return Number.isFinite(n) ? n : null;
  };
  const free = (tr: InterestTrack) => tr.type.includes("ללא") || tr.type.includes("אפס");

  let w = 0;
  let wsum = 0;
  for (const tr of tracks) {
    const used = num(tr.utilization);
    if (used <= 0) continue;
    const n = free(tr) ? 0 : nominal(tr);
    if (n === null) continue;
    wsum += used * n;
    w += used;
  }

  const quoted = tracks.filter((tr) => !free(tr)).map(nominal).filter((n): n is number => n !== null && n > 0);
  const drawnFree = tracks.some((tr) => free(tr) && num(tr.utilization) > 0);

  return {
    onDrawn: w > 0 ? Math.round((wsum / w) * 100) / 100 : null,
    maxQuoted: quoted.length ? Math.max(...quoted) : null,
    interestFree: drawnFree && w > 0 && wsum === 0,
  };
}

function toLine(
  t: Transaction,
  loan: ExtractedLoan | undefined,
  reporter: string
): DebtLine {
  const f = t.fields;
  const balance = loan?.balance ?? num(f["201-049"]);
  const limit = num(f["201-020"]);
  const rateStr = loan?.interest ?? "";
  const rate = rateStr === "" ? null : Number(rateStr);
  const paymentType = f["201-047"] ?? "";
  const frequency = f["201-044"] ?? "";
  const pricing = trackPricing(t.interestTracks);

  return {
    uid: t.uid,
    bank: t.source || "—",
    type: f["201-002"] ?? "",
    category: liabilityCategory(t),
    role: t.role,
    section: t.section,
    balance,
    original: num(f["201-045"]),
    limit,
    rate: rate !== null && Number.isFinite(rate) ? rate : null,
    monthly: loan?.displayMonthly ?? num(f["201-046"]),
    paidActually: num(f["201-048"]),
    months: loan?.months ? Number(loan.months) : null,
    startDate: f["201-016"] ?? "",
    endDate: f["201-018"] ?? "",
    status: f["201-022"] ?? "",
    purpose: f["201-017"] ?? "",
    frequency,
    paymentType,
    balloon: BALLOON_RE.test(paymentType) || BALLOON_RE.test(frequency) || !!f["201-054"],
    overdue: num(f["201-051"]),
    arrearsRange: f["201-050"] ?? "",
    firstMiss: f["201-052"] ?? "",
    lastPaid: f["201-053"] ?? "",
    track: trackLabel(t.interestTracks),
    tracks: t.interestTracks,
    collateral: t.collateral,
    remarks: t.remarks,
    grids: t.grids,
    utilization: limit > 0 ? Math.round((balance / limit) * 1000) / 10 : null,
    peak: num(f["201-072"]),
    rateOnDrawn: pricing.onDrawn,
    rateMaxQuoted: pricing.maxQuoted,
    interestFree: pricing.interestFree,
    // A printed "0" is a claim; an absent field is a gap. num() collapses both to
    // zero, so which one it was is recorded before that happens — it is the
    // difference between "approved limit ₪0" and "no limit on record", and the
    // second must never enter a utilisation denominator.
    reported: {
      limit: f["201-020"] !== undefined,
      monthly: f["201-046"] !== undefined,
      paid: f["201-048"] !== undefined,
      peak: f["201-072"] !== undefined,
    },
    shared: false,
    reportedBy: [reporter],
  };
}

/**
 * Every liability across every loaded report, joint debts folded together.
 *
 * Closed transactions are dropped — a settled loan is history, not exposure —
 * but everything still open is kept, including the revolving facilities and
 * overdrafts the simulator itself cannot model.
 */
function buildLines(reports: CreditReport[]): DebtLine[] {
  const out: DebtLine[] = [];
  const at = new Map<string, number>();

  for (const report of reports) {
    const reporter = report.client?.name || "דוח";
    // extractLoans has already back-solved rate and term; join on uid rather
    // than repeat that arithmetic here.
    const priced = new Map(extractLoans(report).map((l) => [l.uid, l]));

    for (const t of report.transactions) {
      if (t.section === "inactive") continue;
      const line = toLine(t, priced.get(t.uid), reporter);
      if (line.balance <= 0 && line.limit <= 0) continue;

      const k = lineKey(line);
      const hit = at.get(k);
      // Merge only ACROSS reports. Two facilities at one bank can legitimately
      // look identical — same type, both drawn to zero — and folding those
      // together inside a single report both loses a debt and claims a joint
      // holding that does not exist.
      if (hit !== undefined && !out[hit].reportedBy.includes(reporter)) {
        const prev = out[hit];
        prev.shared = true;
        prev.reportedBy.push(reporter);
        continue;
      }
      // Later reports should still be able to match this line.
      if (hit === undefined) at.set(k, out.length);
      out.push(line);
    }
  }

  return out.sort(
    (a, b) =>
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category) ||
      Number(a.role === "guarantor") - Number(b.role === "guarantor") ||
      b.balance - a.balance
  );
}

/* ----------------------------------------------------------------- rollups */

function categoryTotals(lines: DebtLine[]): CategoryTotals[] {
  return CATEGORY_ORDER.map((category) => {
    const rows = lines.filter((l) => l.category === category && l.role === "debtor");
    return {
      category,
      count: rows.length,
      balance: rows.reduce((s, l) => s + l.balance, 0),
      monthly: rows.reduce((s, l) => s + l.monthly, 0),
      limit: rows.reduce((s, l) => s + l.limit, 0),
      overdue: rows.reduce((s, l) => s + l.overdue, 0),
      rate: weightedRate(rows),
    };
  }).filter((c) => c.count > 0);
}

/**
 * Where the mortgage money actually sits, by track.
 *
 * A track's own utilization figure is used when the report gives one; when it
 * does not, the loan's balance is split evenly across its tracks. That is a
 * stated approximation rather than a silent one — without it a multi-track
 * mortgage would vanish from the mix entirely.
 */
function mortgageTracks(lines: DebtLine[]): TrackSlice[] {
  const bucket = new Map<string, { amount: number; rate: number; w: number; variable: boolean; linked: boolean }>();

  for (const l of lines) {
    if (l.category !== "mortgage" || l.role !== "debtor") continue;
    const tracks = l.tracks.length ? l.tracks : [];
    if (!tracks.length) {
      const cur = bucket.get("לא מסווג") ?? { amount: 0, rate: 0, w: 0, variable: false, linked: false };
      cur.amount += l.balance;
      bucket.set("לא מסווג", cur);
      continue;
    }
    const stated = tracks.reduce((s, tr) => s + num(tr.utilization), 0);
    for (const tr of tracks) {
      const amount = stated > 0 ? num(tr.utilization) : l.balance / tracks.length;
      if (amount <= 0) continue;
      const label = trackSliceLabel(tr);
      const nominal = Number(tr.nominal);
      const cur =
        bucket.get(label) ?? { amount: 0, rate: 0, w: 0, variable: isVariable(tr), linked: isLinked(tr) };
      cur.amount += amount;
      if (Number.isFinite(nominal) && nominal > 0) {
        cur.rate += nominal * amount;
        cur.w += amount;
      }
      bucket.set(label, cur);
    }
  }

  const total = Array.from(bucket.values()).reduce((s, v) => s + v.amount, 0);
  return Array.from(bucket.entries())
    .map(([label, v]) => ({
      label,
      amount: Math.round(v.amount),
      share: total > 0 ? v.amount / total : 0,
      rate: v.w > 0 ? Math.round((v.rate / v.w) * 100) / 100 : null,
      variable: v.variable,
      linked: v.linked,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Payment behaviour: bounced cheques, dishonoured direct debits, and the
 * per-transaction arrears history grid (buckets 1=30-59 days … 6=180+).
 */
function behaviour(reports: CreditReport[], lines: DebtLine[]): Behaviour {
  let checksPresented = 0;
  let checksReturned = 0;
  let debitsPresented = 0;
  let debitsDishonored = 0;

  const sumGrid = (g: MonthlyGrid) =>
    g.rows.reduce((s, r) => s + r.months.reduce((a, m) => a + (m ? num(m) : 0), 0), 0);

  for (const report of reports) {
    for (const t of report.transactions) {
      for (const g of t.grids) {
        if (g.label.includes("שיקים שהוצגו")) checksPresented += sumGrid(g);
        else if (g.label.includes("שיקים שחזרו")) checksReturned += sumGrid(g);
        else if (g.label.includes("הוראות לחיוב חשבון שלא")) debitsDishonored += sumGrid(g);
        else if (g.label.includes("הוראות לחיוב חשבון")) debitsPresented += sumGrid(g);
      }
    }
  }

  // Worst arrears bucket per calendar month, across every transaction.
  const byYear = new Map<string, (number | null)[]>();
  for (const l of lines) {
    for (const g of l.grids) {
      if (!g.label.includes("היסטוריית פיגורים")) continue;
      for (const row of g.rows) {
        const cur = byYear.get(row.year) ?? Array(12).fill(null);
        row.months.forEach((m, i) => {
          const v = m ? num(m) : 0;
          if (v > 0) cur[i] = Math.max(cur[i] ?? 0, v);
        });
        byYear.set(row.year, cur);
      }
    }
  }

  const arrears = Array.from(byYear.entries())
    .map(([year, months]) => ({ year, months }))
    .sort((a, b) => Number(b.year) - Number(a.year));

  let arrearsMonths = 0;
  let worstBucket = 0;
  for (const y of arrears) {
    for (const m of y.months) {
      if (m && m > 0) {
        arrearsMonths += 1;
        worstBucket = Math.max(worstBucket, m);
      }
    }
  }

  return { checksPresented, checksReturned, debitsPresented, debitsDishonored, arrears, arrearsMonths, worstBucket };
}

/** Map a תמצית block heading onto the same families the detail pages use. */
function categoryOfType(type: string): LiabilityCategory {
  if (/משכנת|לדיור/.test(type)) return "mortgage";
  if (/הלוואה/.test(type)) return "loan";
  if (/עובר ושב|עו["״]?ש/.test(type)) return "overdraft";
  if (/מסגרת|כרטיס/.test(type)) return "card";
  return "other";
}

/** Per-lender rows of the report's own summary, totals excluded. */
function sourceTotals(reports: CreditReport[]): SourceTotal[] {
  const out: SourceTotal[] = [];
  for (const r of reports) {
    for (const g of r.summary ?? []) {
      for (const b of g.blocks) {
        for (const row of b.rows) {
          if (row.isTotal) continue;
          out.push({
            role: g.role,
            transactionType: b.transactionType,
            category: categoryOfType(b.transactionType),
            source: row.source,
            count: row.idOrCount,
            limit: num(row.limit),
            balance: num(row.debtBalance),
            overdue: num(row.overdue),
          });
        }
      }
    }
  }
  return out;
}

/**
 * Does the detail agree with the summary?
 *
 * The transaction pages are parsed geometrically and can come up short when a
 * facility's block is laid out unusually; the summary is a plain table and
 * rarely does. Where they differ, the difference is stated rather than
 * quietly averaged away.
 */
function reconcile(reports: CreditReport[], lines: DebtLine[]): Reconciliation {
  const rows = sourceTotals(reports).filter((s) => s.role === "debtor");
  const summaryBalance = rows.reduce((s, r) => s + r.balance, 0);
  const summaryLimit = rows.reduce((s, r) => s + r.limit, 0);

  const own = lines.filter((l) => l.role === "debtor");
  const extractedBalance = own.reduce((s, l) => s + l.balance, 0);
  const extractedLimit = own.reduce((s, l) => s + l.limit, 0);

  return {
    summaryBalance,
    summaryLimit,
    extractedBalance,
    extractedLimit,
    balanceGap: Math.round(summaryBalance - extractedBalance),
    limitGap: Math.round(summaryLimit - extractedLimit),
    // The parser says so itself when a block's stated count exceeds what it
    // could pull out of the detail pages.
    missingCounts: Array.from(
      new Set(reports.flatMap((r) => (r.warnings ?? []).filter((w) => w.includes("אימות ספירה"))))
    ),
  };
}

function inquiries(reports: CreditReport[], now: Date): Inquiries {
  const all = reports.flatMap((r) => r.inquiriesByDate ?? []);
  const pending = reports.flatMap((r) => r.newCreditInquiries ?? []);

  const purposes = new Map<string, number>();
  for (const q of all) {
    const p = q.purpose?.trim() || "לא צוין";
    purposes.set(p, (purposes.get(p) ?? 0) + 1);
  }

  return {
    total: all.length,
    last3: all.filter((q) => monthsAgo(dmy(q.date), now) <= 3).length,
    last12: all.filter((q) => monthsAgo(dmy(q.date), now) <= 12).length,
    pending,
    byPurpose: Array.from(purposes.entries())
      .map(([purpose, count]) => ({ purpose, count }))
      .sort((a, b) => b.count - a.count),
  };
}

/* ------------------------------------------------------------------- flags */

/**
 * The ranked list of things an advisor must not miss.
 *
 * Each flag names its own evidence — the bank, the amount, the count — because
 * "high utilization" without the number is not a finding, it is a mood.
 */
/** Which section a given debt is rendered in, so a finding can point at it. */
function sectionOf(l?: DebtLine): string {
  if (!l) return "picture";
  if (l.role === "guarantor") return "guarantees";
  if (l.category === "mortgage") return "mortgage";
  if (l.category === "loan") return "consumer";
  if (l.category === "card" || l.category === "overdraft") return "revolving";
  return "other";
}

/* ------------------------------------------------- the client page, decided here */

const EMPTY_ROW = (bank: string, family: ClientRow["family"], type: string): ClientRow => ({
  uids: [],
  bank,
  family,
  type,
  parts: 0,
  balance: 0,
  monthly: 0,
  months: null,
  late: false,
  overdue: 0,
  arrearsRange: "",
  rate: null,
  rateMaxQuoted: null,
  interestFree: false,
  minRate: null,
  maxRate: null,
  limit: 0,
  utilization: null,
  peak: 0,
  rolled: 0,
  reported: { limit: false, monthly: false, paid: false, peak: false },
  remarks: [],
});

/** Fold one liability into a row. */
function absorb(row: ClientRow, l: DebtLine): ClientRow {
  row.uids.push(l.uid);
  row.parts += 1;
  row.balance += l.balance;
  row.monthly += l.monthly;
  row.limit += l.limit;
  row.peak += l.peak;
  row.overdue += l.overdue;
  if (l.months && (row.months === null || l.months > row.months)) row.months = l.months;
  if (l.overdue > 0 || l.arrearsRange) row.late = true;
  if (l.arrearsRange && l.arrearsRange > row.arrearsRange) row.arrearsRange = l.arrearsRange;
  if (l.rateOnDrawn !== null) row.rate = Math.max(row.rate ?? -Infinity, l.rateOnDrawn);
  if (l.rateMaxQuoted !== null) row.rateMaxQuoted = Math.max(row.rateMaxQuoted ?? -Infinity, l.rateMaxQuoted);
  if (l.interestFree) row.interestFree = true;
  if (l.rate !== null) {
    row.minRate = row.minRate === null ? l.rate : Math.min(row.minRate, l.rate);
    row.maxRate = row.maxRate === null ? l.rate : Math.max(row.maxRate, l.rate);
  }
  // Only a printed 201-048 can evidence a rolled charge; an absent one is silence,
  // not non-payment.
  if (l.reported.paid && l.paidActually > 0 && l.monthly - l.paidActually > 1)
    row.rolled += l.monthly - l.paidActually;
  for (const k of ["limit", "monthly", "paid", "peak"] as const)
    if (l.reported[k]) row.reported[k] = true;
  for (const r of l.remarks) if (!row.remarks.includes(r)) row.remarks.push(r);
  return row;
}

/**
 * Build the client page from the analysis.
 *
 * Mortgages and consumer loans fold to one row per lender — a מסלול is an artefact
 * of how the bank booked the loan, and a household with a fourteen-tranche mortgage
 * has three mortgages at three banks. Revolving facilities do NOT fold: מזרחי holds
 * two separate ₪15,000 lines and a client needs to see both, and the point of the
 * section is what each card costs.
 */
function buildClientView(a: Omit<Analysis, "flags" | "clientView">, flags: Flag[]): ClientView {
  const own = a.lines.filter((l) => l.role === "debtor");

  const byLender = (lines: DebtLine[], family: "mortgage" | "loan"): ClientRow[] => {
    const by = new Map<string, ClientRow>();
    for (const l of lines) {
      const k = l.bank.replace(/\s+/g, "");
      by.set(k, absorb(by.get(k) ?? EMPTY_ROW(l.bank, family, l.type), l));
    }
    return Array.from(by.values()).sort((x, y) => y.balance - x.balance || y.monthly - x.monthly);
  };

  // One row per facility. No monthly gate: a card that has stopped being serviced
  // is the most important row on the page, and gating on monthly > 0 hid every
  // revolving facility on a real report — ₪347,593 of it.
  const cardRows = own
    .filter((l) => l.category === "card" || l.category === "overdraft")
    .map((l) => {
      const row = absorb(EMPTY_ROW(l.bank, "card", l.type), l);
      row.utilization = l.utilization;
      return row;
    })
    .sort((x, y) => y.monthly - x.monthly || y.balance - x.balance);

  const sections: ClientSection[] = [
    { key: "mortgage" as const, title: "משכנתאות", accent: "#6b53d8", rows: byLender(own.filter((l) => l.category === "mortgage"), "mortgage") },
    { key: "loan" as const, title: "הלוואות", accent: "#c4681a", rows: byLender(own.filter((l) => l.category === "loan"), "loan") },
    { key: "card" as const, title: "כרטיסי אשראי ומסגרות", accent: "#0d8b9b", rows: cardRows },
  ].filter((s) => s.rows.length > 0);

  // Anything the categoriser did not place. Without this a new transaction type
  // would silently vanish from the page while still counting in the footer.
  const placed = new Set(sections.flatMap((s) => s.rows.flatMap((r) => r.uids)));
  const orphans = own.filter((l) => !placed.has(l.uid));
  if (orphans.length) {
    sections.push({
      key: "loan",
      title: "התחייבויות נוספות",
      accent: "#64748b",
      rows: byLender(orphans, "loan"),
    });
  }

  const shownBalance = sections.reduce((s, sec) => s + sec.rows.reduce((t, r) => t + r.balance, 0), 0);

  // Ordered by severity, and each sentence's rows are on the page by construction.
  const worries = flags
    .map((f) => ({ note: noteOf(f.client), severity: f.severity }))
    .filter((x): x is { note: { say: string; uids?: string[] }; severity: Severity } => x.note !== null)
    .map((x) => ({ say: x.note.say, severity: x.severity }));

  return {
    sections,
    worries,
    footer: { balance: a.totals.balance, monthly: a.totals.monthly },
    shownBalance,
    unshownBalance: Math.round(a.totals.balance - shownBalance),
  };
}

function buildFlags(a: Omit<Analysis, "flags" | "clientView">): Flag[] {
  const flags: Flag[] = [];
  const own = a.lines.filter((l) => l.role === "debtor");
  const push = (f: Flag) => flags.push(f);

  /* ---- legal proceedings: the file-stoppers */
  if (a.legal.insolvency.length) {
    push({
      id: "insolvency",
      target: { section: "legal" },
      severity: "critical",
      title: "הליך חדלות פירעון",
      detail: `נמצאו ${a.legal.insolvency.length} הליכי חדלות פירעון או שיקום כלכלי. יש לברר סטטוס והכרעות לפני כל המשך טיפול.`,
      client: show("קיים הליך חדלות פירעון — זה הפריט הראשון שכל בנק יבדוק"),
      amount: a.legal.insolvency.reduce((s, c) => s + num(c["151-009"] || c["151-007"]), 0),
    });
  }
  if (a.legal.executionOpen.length) {
    push({
      id: "execution",
      target: { section: "legal" },
      severity: "critical",
      title: "תיקים פתוחים בהוצאה לפועל",
      detail: `${a.legal.executionOpen.length} תיקים פתוחים. חוב פתוח בהוצאה לפועל נחשב חוב לכל דבר וחוסם כמעט כל מסלול.`,
      client: show(
        a.legal.executionOpen.length === 1
          ? "קיים תיק פתוח בהוצאה לפועל — חוב לכל דבר, שחוסם כמעט כל מסלול"
          : `קיימים ${a.legal.executionOpen.length} תיקים פתוחים בהוצאה לפועל — חוב לכל דבר, שחוסם כמעט כל מסלול`
      ),
      amount: a.legal.executionDebt,
    });
  }
  const closedExec = a.legal.execution.length - a.legal.executionOpen.length;
  if (closedExec > 0) {
    push({
      id: "execution-closed",
      target: { section: "legal" },
      severity: "medium",
      title: "תיקי הוצאה לפועל שנסגרו",
      detail: `${closedExec} תיקים נסגרו ואינם חוב פתוח, אך נותרים בדוח ונקראים כהיסטוריה על ידי החתם.`,
      // Closed and paid. Telling a client about a file they already settled invites
      // alarm about something they cannot act on; the advisor still needs to see it
      // because an underwriter will read the history.
      client: silent("תיק שנסגר ואינו חוב פתוח — רלוונטי לחתם, לא ללקוח"),
    });
  }
  if (a.legal.nonPayment.length) {
    // The column that decides how much this hurts is "מאפשר העברת מידע ללשכה
    // בחיווי אשראי": it says the event may be passed to the bureau and shown in
    // the credit rating a lender actually pulls. An item that stays inside the
    // report is a conversation; one that reaches the bureau is priced.
    const toBureau = a.legal.nonPayment.filter((n) => n.allowsBureauTransfer).length;
    push({
      id: "nonpayment",
      target: { section: "legal" },
      severity: toBureau ? "critical" : "high",
      title: "נתונים המעידים על אי עמידה בפירעון",
      detail: toBureau
        ? `${a.legal.nonPayment.length} רשומות, מתוכן ${toBureau} ניתנות להעברה ללשכה ומופיעות בחיווי האשראי שהבנק מושך. זהו הפריט הראשון שייבחן.`
        : `${a.legal.nonPayment.length} רשומות שאינן מועברות ללשכה, אך מופיעות בדוח ויידרש עליהן הסבר.`,
      client: show(
        toBureau
          ? "קיים רישום על אי עמידה בתשלומים שמופיע בדירוג האשראי שהבנק מושך"
          : "קיים רישום על אי עמידה בתשלומים בדוח, שיידרש עליו הסבר"
      ),
      where: a.legal.nonPayment.map((n) => n.source).filter(Boolean),
    });
  }
  const openRequests = a.legal.adminActions.filter((x) => !/הסתיים|טופל/.test(x.status || ""));
  if (openRequests.length) {
    push({
      id: "admin",
      target: { section: "meta" },
      severity: "info",
      title: "פניות פתוחות מול מערכת נתוני אשראי",
      detail: `${openRequests.length} פניות שטרם הסתיימו (${openRequests
        .map((x) => x.type)
        .join(", ")}). אם מדובר בתיקון מידע, ייתכן שהתמונה תשתנה.`,
      client: silent("פנייה מנהלית מול מערכת נתוני אשראי — לא מצב פיננסי של הלקוח"),
    });
  }

  /* ---- arrears, now and historic */
  const inArrears = own.filter((l) => l.overdue > 0 || l.arrearsRange);
  if (inArrears.length) {
    push({
      id: "arrears-now",
      target: { section: sectionOf(inArrears[0]), uids: inArrears.map((l) => l.uid) },
      severity: "high",
      title: "פיגורים פעילים",
      detail: `${inArrears.length} התחייבויות בפיגור${
        inArrears.some((l) => l.arrearsRange) ? ` (הטווח החמור: ${inArrears.map((l) => l.arrearsRange).filter(Boolean).sort().reverse()[0]})` : ""
      }.`,
      client: show("יש פיגור בתשלומים", inArrears.map((l) => l.uid)),
      amount: inArrears.reduce((s, l) => s + l.overdue, 0),
      where: Array.from(new Set(inArrears.map((l) => l.bank))),
    });
  }
  if (a.behaviour.arrearsMonths > 0) {
    push({
      id: "arrears-history",
      target: { section: "behaviour" },
      severity: a.behaviour.worstBucket >= 4 ? "high" : "medium",
      title: "היסטוריית פיגורים",
      detail: `${a.behaviour.arrearsMonths} חודשים עם פיגור בהיסטוריה${
        a.behaviour.worstBucket >= 4 ? `, כולל פיגור של 120 יום ומעלה` : ""
      }. בנקים בוחנים את הדפוס, לא רק את המצב הנוכחי.`,
      client: show(
        a.behaviour.arrearsMonths === 1
          ? "בעבר היה חודש אחד עם פיגור בתשלומים — הבנק מסתכל על הדפוס, לא רק על היום"
          : `בעבר היו ${a.behaviour.arrearsMonths} חודשים עם פיגור בתשלומים — הבנק מסתכל על הדפוס, לא רק על היום`
      ),
    });
  }

  /* ---- remarks the report codes explicitly */
  const remarked = (needle: string) => own.filter((l) => l.remarks.some((r) => r.includes(needle)));
  const enforced = remarked("הוצאה לפועל");
  if (enforced.length) {
    push({
      id: "remark-enforced",
      target: { section: sectionOf(enforced[0]), uids: enforced.map((l) => l.uid) },
      severity: "high",
      title: "עסקאות בטיפול ההוצאה לפועל",
      detail: `${enforced.length} עסקאות מסומנות כמטופלות בהוצאה לפועל.`,
      client: show("חלק מההתחייבויות מטופלות בהוצאה לפועל", enforced.map((l) => l.uid)),
      where: Array.from(new Set(enforced.map((l) => l.bank))),
    });
  }
  const noPayment = remarked("לא התקבל כל תשלום");
  if (noPayment.length) {
    push({
      id: "remark-nopay",
      target: { section: sectionOf(noPayment[0]), uids: noPayment.map((l) => l.uid) },
      severity: "high",
      title: "עסקאות בפיגור ללא תשלום כלל",
      detail: `${noPayment.length} עסקאות שלא התקבל בהן תשלום.`,
      client: show("יש התחייבויות שלא שולם בהן דבר", noPayment.map((l) => l.uid)),
      where: Array.from(new Set(noPayment.map((l) => l.bank))),
    });
  }

  /* ---- payment instruments */
  if (a.behaviour.checksReturned > 0) {
    push({
      id: "checks",
      target: { section: "behaviour" },
      severity: a.behaviour.checksReturned >= 3 ? "high" : "medium",
      title: 'שיקים שחזרו (אכ"מ)',
      detail: `${a.behaviour.checksReturned} שיקים חזרו מתוך ${a.behaviour.checksPresented || "—"} שהוצגו.`,
      client: show(
        a.behaviour.checksReturned === 1
          ? "שיק אחד חזר — פוגע בדירוג ומורגש בכל בקשה חדשה"
          : `${a.behaviour.checksReturned} שיקים חזרו — פוגע בדירוג ומורגש בכל בקשה חדשה`
      ),
    });
  }
  if (a.behaviour.debitsDishonored > 0) {
    push({
      id: "debits",
      target: { section: "behaviour" },
      severity: a.behaviour.debitsDishonored >= 3 ? "high" : "medium",
      title: "הוראות קבע שלא כובדו",
      detail: `${a.behaviour.debitsDishonored} הוראות לחיוב חשבון לא כובדו מתוך ${a.behaviour.debitsPresented || "—"}.`,
      client: show(
        a.behaviour.debitsDishonored === 1
          ? "הוראת קבע אחת לא כובדה — סימן לתזרים לחוץ בחשבון"
          : `${a.behaviour.debitsDishonored} הוראות קבע לא כובדו — סימן לתזרים לחוץ בחשבון`
      ),
    });
  }

  /* ---- status of the client record itself */
  const blocked = a.clients.filter((c) => c.systemStatus && !/רגיל|תקין/.test(c.systemStatus));
  if (blocked.length) {
    push({
      id: "client-status",
      target: { section: "meta" },
      severity: "high",
      title: `סטטוס לקוח: ${blocked[0].systemStatus}`,
      detail: "סטטוס שאינו רגיל במערכת נתוני האשראי — יש לברר את משמעותו מול הלקוח.",
      // Deliberately not shown: the status is about the client's record inside the
      // credit-data system, and its meaning has to be established with them before
      // it can be stated to them.
      client: silent("סטטוס הרשומה במערכת נתוני אשראי — לברור מול הלקוח לפני שנאמר לו"),
      where: blocked.map((c) => c.name),
    });
  }

  /* ---- revolving credit */
  const utilFraction = a.revolving.utilization === null ? null : a.revolving.utilization / 100;
  const utilHeat = utilisationHeat(utilFraction);
  if (utilHeat) {
    const stretched = a.lines.filter(
      (l) => utilisationHeat(l.utilization === null ? null : l.utilization / 100) !== null
    );
    push({
      id: "revolving",
      target: { section: "revolving", uids: stretched.map((l) => l.uid) },
      severity: utilHeat === "hot" ? "high" : "medium",
      title: "ניצול מסגרות גבוה",
      detail: `${a.revolving.utilization}% מהמסגרות המאושרות מנוצלות. ניצול מתמשך בשיעור כזה נקרא כמצוקת נזילות.`,
      amount: a.revolving.used,
      client: show(
        `המסגרות מנוצלות ב-${Math.round(a.revolving.utilization ?? 0)}% — כמעט ללא אוויר לנשימה בחשבון`,
        stretched.map((l) => l.uid)
      ),
    });
  }

  // Balance with no approved ceiling behind it. Not a utilisation problem — there
  // is nothing to divide by — but the largest single debt on a real report was
  // exactly this, and dividing by the other facilities' limits is what produced
  // "ניצול 10,889.5%".
  if (a.revolving.unlimitedBalance > 0) {
    const noCeiling = a.lines.filter(
      (l) =>
        (l.category === "card" || l.category === "overdraft") &&
        l.role === "debtor" &&
        l.balance > 0 &&
        !(l.reported.limit && l.limit > 0)
    );
    push({
      id: "revolving-unlimited",
      target: { section: "revolving", uids: noCeiling.map((l) => l.uid) },
      severity: "high",
      title: "יתרה ללא מסגרת מאושרת בדוח",
      detail: `${Math.round(a.revolving.unlimitedBalance).toLocaleString("en-US")} ₪ נמצאים בחשבונות שהדוח אינו מציין להם מסגרת מאושרת. אין מול מה למדוד את הניצול, והיתרה עצמה היא חוב לכל דבר.`,
      amount: a.revolving.unlimitedBalance,
      client: show(
        `${Math.round(a.revolving.unlimitedBalance).toLocaleString("en-US")} ₪ ביתרת חובה בחשבון, בלי מסגרת מאושרת בדוח`,
        noCeiling.map((l) => l.uid)
      ),
    });
  }

  // A facility can look calm on the statement date and still have been run to
  // the ceiling mid-month. The peak is the number a lender reacts to.
  if (
    a.revolving.limit > 0 &&
    a.revolving.peak > a.revolving.used * UTILISATION_PEAK_EXCESS &&
    a.revolving.peak / a.revolving.limit >= UTILISATION_PEAK_RATIO
  ) {
    push({
      id: "revolving-peak",
      target: { section: "revolving" },
      severity: "medium",
      title: "שיא ניצול גבוה מהיתרה המוצגת",
      detail: `שיא הניצול בחודש הדיווח היה ${Math.round(a.revolving.peak).toLocaleString("en-US")} ₪ מול יתרה מוצגת של ${Math.round(a.revolving.used).toLocaleString("en-US")} ₪ — המסגרת נוצלה כמעט במלואה במהלך החודש.`,
      client: show(
        `במהלך החודש המסגרת נוצלה עד ${Math.round(a.revolving.peak).toLocaleString("en-US")} ₪ — גם אם ביום הדוח היא נראית פנויה`
      ),
      amount: a.revolving.peak,
    });
  }

  /* ---- what the plastic costs every month */
  if (a.cards.monthlyCharge > 0) {
    const share = a.totals.monthly > 0 ? a.cards.monthlyCharge / a.totals.monthly : 0;
    push({
      id: "card-charge",
      target: {
        section: "revolving",
        uids: a.lines
          .filter((l) => l.role === "debtor" && (l.category === "card" || l.category === "overdraft") && l.monthly > 0)
          .map((l) => l.uid),
      },
      severity: share >= 0.3 ? "medium" : "info",
      title: "חיוב חודשי בכרטיסי אשראי ומסגרות",
      detail: `${Math.round(a.cards.monthlyCharge).toLocaleString("en-US")} ₪ בחודש על פני ${a.cards.count} מסגרות${
        share > 0 ? ` — ${Math.round(share * 100)}% מסך ההחזר החודשי` : ""
      }. חיוב שאינו מופיע בתמהיל, אך יוצא מהחשבון בכל חודש.`,
      client: show(
        `${Math.round(a.cards.monthlyCharge).toLocaleString("en-US")} ₪ בחודש יוצאים על כרטיסי אשראי ומסגרות`,
        a.lines
          .filter((l) => l.role === "debtor" && (l.category === "card" || l.category === "overdraft"))
          .map((l) => l.uid)
      ),
      amount: a.cards.monthlyCharge,
    });
  }
  if (a.cards.rolled > 0) {
    push({
      id: "card-rolled",
      target: {
        section: "revolving",
        uids: a.lines.filter((l) => l.monthly - l.paidActually > 1 && l.paidActually > 0).map((l) => l.uid),
      },
      severity: "high",
      title: "חיוב שלא נפרע במלואו",
      detail: `${Math.round(a.cards.rolled).toLocaleString("en-US")} ₪ מהחיוב החודשי לא שולמו בפועל וגולגלו קדימה. גלגול אשראי צרכני הוא האשראי היקר ביותר שיש.`,
      client: show(
        `${Math.round(a.cards.rolled).toLocaleString("en-US")} ₪ מהחיוב בכרטיס לא נפרעו והתגלגלו לחודש הבא — זה האשראי היקר ביותר שיש`,
        a.lines.filter((l) => l.monthly - l.paidActually > 1 && l.paidActually > 0).map((l) => l.uid)
      ),
      amount: a.cards.rolled,
    });
  }

  /* ---- price of the consumer debt */
  const expensive = own.filter((l) => l.category === "loan" && (l.rate ?? 0) >= DEAR_RATE_CONSUMER);
  if (expensive.length) {
    const worst = Math.max(...expensive.map((l) => l.rate ?? 0));
    const cheapest = Math.min(...expensive.map((l) => l.rate ?? 0));
    push({
      id: "expensive",
      target: { section: "consumer", uids: expensive.map((l) => l.uid) },
      severity: worst >= DEAR_RATE_CONSUMER_HIGH ? "high" : "medium",
      title: "הלוואות בריבית גבוהה",
      // The range of the set actually counted. "N loans at X% and above" where X
      // was the MAXIMUM of the set said the opposite of what it meant.
      detail: `${expensive.length} הלוואות בריבית ${
        cheapest === worst ? `${worst.toFixed(2)}%` : `${cheapest.toFixed(2)}%–${worst.toFixed(2)}%`
      } — מועמדות ראשונות למיחזור לתוך המשכנתא.`,
      client: show(
        `${expensive.length === 1 ? "הלוואה אחת" : `${expensive.length} הלוואות`} בריבית ${
          cheapest === worst ? `${worst.toFixed(1)}%` : `${cheapest.toFixed(1)}%–${worst.toFixed(1)}%`
        } — ${expensive.length === 1 ? "אפשר למחזר אותה" : "אפשר למחזר אותן"} לריבית נמוכה בהרבה`,
        expensive.map((l) => l.uid)
      ),
      amount: expensive.reduce((s, l) => s + l.balance, 0),
      where: Array.from(new Set(expensive.map((l) => l.bank))),
    });
  }

  /* ---- balloon exposure */
  const balloons = own.filter((l) => l.balloon);
  if (balloons.length) {
    push({
      id: "balloon",
      target: { section: sectionOf(balloons[0]), uids: balloons.map((l) => l.uid) },
      severity: "medium",
      title: "הלוואות בלון",
      detail: `${balloons.length} התחייבויות שהקרן בהן נפרעת בסוף התקופה. ההחזר החודשי הנוכחי אינו משקף את החבות.`,
      client: show(
        `${balloons.length === 1 ? "הלוואה אחת" : `${balloons.length} הלוואות`} מסוג בלון — הקרן כולה נפרעת בסוף, וההחזר החודשי היום אינו משקף את החוב`,
        balloons.map((l) => l.uid)
      ),
      amount: balloons.reduce((s, l) => s + l.balance, 0),
      where: Array.from(new Set(balloons.map((l) => l.bank))),
    });
  }

  /* ---- mortgage risk composition */
  if (a.mortgage.balance > 0) {
    const varSeverity = variableSeverity(a.mortgage.variableShare);
    if (varSeverity) {
      push({
        id: "variable",
        target: { section: "mortgage" },
        severity: varSeverity,
        title: "חשיפה גבוהה לריבית משתנה",
        detail: `${Math.round(a.mortgage.variableShare * 100)}% מהמשכנתא במסלולים משתנים. כל עליית ריבית מתגלגלת כמעט במלואה להחזר.`,
        client: show(
          `${Math.round(a.mortgage.variableShare * 100)}% מהמשכנתא נע עם הריבית — אם הריבית תעלה, ההחזר יעלה`
        ),
        amount: Math.round(a.mortgage.balance * a.mortgage.variableShare),
      });
    }
    if (linkedIsHigh(a.mortgage.linkedShare)) {
      push({
        id: "linked",
        target: { section: "mortgage" },
        severity: "medium",
        title: "חשיפה גבוהה למדד",
        detail: `${Math.round(a.mortgage.linkedShare * 100)}% מהמשכנתא צמוד למדד — הקרן עצמה גדלה עם האינפלציה.`,
        client: show(
          `${Math.round(a.mortgage.linkedShare * 100)}% מהמשכנתא צמוד למדד — הקרן עצמה גדלה עם האינפלציה, לא רק ההחזר`
        ),
        amount: Math.round(a.mortgage.balance * a.mortgage.linkedShare),
      });
    }
    if (a.mortgage.ltv !== null && a.mortgage.ltv >= LTV_TRIGGER) {
      push({
        id: "ltv",
        target: { section: "mortgage" },
        severity: a.mortgage.ltv >= LTV_HIGH ? "high" : "medium",
        title: `יחס מימון ${Math.round(a.mortgage.ltv * 100)}%`,
        detail: "יחס מימון גבוה מצמצם מאוד את מרחב המיחזור ואת הנכונות של בנקים להגדיל.",
        client: show(
          `המשכנתא מכסה ${Math.round((a.mortgage.ltv ?? 0) * 100)}% משווי הנכס — יחס גבוה שמצמצם את מרחב התמרון`
        ),
      });
    }
  }

  /* ---- how the monthly burden is split */
  if (a.consumer.shareOfMonthly >= CONSUMER_MONTHLY_SHARE_TRIGGER && a.consumer.monthly > 0) {
    push({
      id: "consumer-weight",
      target: { section: "consumer" },
      severity: "medium",
      title: "משקל גבוה להלוואות צרכניות",
      detail: `${Math.round(a.consumer.shareOfMonthly * 100)}% מההחזר החודשי הולך להלוואות צרכניות ולא למשכנתא — הפוטנציאל הגדול ביותר לשיפור תזרים.`,
      client: show(
        `${Math.round(a.consumer.shareOfMonthly * 100)}% מההחזר החודשי הולך להלוואות צרכניות ולא למשכנתא`
      ),
      amount: a.consumer.monthly,
    });
  }

  /* ---- credit-seeking behaviour */
  if (a.inquiries.pending.length) {
    // Two mortgage applications are one purchase shopped at two banks, not
    // ₪4m of intended borrowing — so the largest per type is the honest
    // headline and summing everything is not.
    const byType = new Map<string, { n: number; max: number }>();
    for (const q of a.inquiries.pending) {
      const t = q.transactionType?.trim() || "אשראי";
      const cur = byType.get(t) ?? { n: 0, max: 0 };
      byType.set(t, { n: cur.n + 1, max: Math.max(cur.max, num(q.amount)) });
    }
    const parts = Array.from(byType.entries()).map(
      ([t, v]) => `${v.n} ${t}${v.max > 0 ? ` עד ₪${Math.round(v.max).toLocaleString("en-US")}` : ""}`
    );
    const mortgageAsk = byType.get("משכנתה")?.max ?? 0;
    push({
      id: "pending",
      target: { section: "inquiries" },
      severity: mortgageAsk > 0 ? "high" : "medium",
      title: mortgageAsk > 0 ? "בקשות משכנתה פתוחות אצל מלווים אחרים" : "בקשות אשראי פתוחות",
      detail: `${parts.join(" · ")}. ${
        mortgageAsk > 0
          ? "הלקוח כבר נבדק במקום אחר — כדאי לברר מה הוצע לו לפני שמציעים."
          : "אשראי שיאושר יופיע כחוב נוסף."
      }`,
      client: show(
        mortgageAsk > 0
          ? "קיימת בקשת משכנתה פתוחה אצל מלווה אחר — כדאי לברר מה הוצע שם לפני שמחליטים"
          : "קיימות בקשות אשראי פתוחות שטרם אושרו — אם יאושרו, הן יתווספו לחוב"
      ),
      amount: mortgageAsk || undefined,
      where: Array.from(new Set(a.inquiries.pending.map((q) => q.user).filter(Boolean))),
    });
  }

  /* ---- the report disagreeing with itself */
  if (a.reconcile.balanceGap > 500 || a.reconcile.limitGap > 500) {
    push({
      id: "reconcile",
      target: { section: "sources" },
      severity: "medium",
      title: "פער בין התמצית לפירוט",
      detail: `תמצית הדוח מציגה ${
        a.reconcile.balanceGap > 500 ? `יתרות גבוהות ב-₪${a.reconcile.balanceGap.toLocaleString("en-US")}` : ""
      }${a.reconcile.balanceGap > 500 && a.reconcile.limitGap > 500 ? " ו" : ""}${
        a.reconcile.limitGap > 500 ? `מסגרות גבוהות ב-₪${a.reconcile.limitGap.toLocaleString("en-US")}` : ""
      } מהמופיע בעמודי הפירוט. יש לקרוא את התמצית במסמך המקורי — הניתוח כאן עלול לחסר.`,
      // About how well the document was READ, not about the client's finances.
      client: silent("מדבר על איכות קריאת המסמך, לא על מצבו של הלקוח"),
    });
  }
  if (a.inquiries.last3 >= APPLICATIONS_IN_WINDOW_TRIGGER) {
    push({
      id: "shopping",
      target: { section: "inquiries" },
      severity: "medium",
      title: "ריבוי פניות בזמן קצר",
      detail: `${a.inquiries.last3} פניות לקבלת מידע ב-3 החודשים האחרונים (${a.inquiries.last12} בשנה). דפוס שנקרא כחיפוש אשראי.`,
      // The count mixes lender applications with the client's own report pulls, so
      // it overstates credit-seeking. Not sound enough to put in front of them.
      client: silent("הספירה כוללת גם בקשות שהלקוח עצמו יזם — לא אמינה דיה לרמת הלקוח"),
    });
  }

  /* ---- guarantees */
  if (a.totals.guaranteedCount > 0) {
    push({
      id: "guarantor",
      target: {
        section: "guarantees",
        uids: a.lines.filter((l) => l.role === "guarantor").map((l) => l.uid),
      },
      severity: "info",
      title: "ערבויות",
      detail: `הלקוח ערב ל-${a.totals.guaranteedCount} התחייבויות. אינן החזר שלו, אך נחשבות חשיפה בבדיקת בנק.`,
      client: show(
        `אתם ערבים ל-${a.totals.guaranteedCount} התחייבויות בסך ${Math.round(a.totals.guaranteedBalance).toLocaleString("en-US")} ₪ — לא ההחזר שלכם, אך הבנק מביא אותן בחשבון`
      ),
      amount: a.totals.guaranteedBalance,
    });
  }

  /* ---- joint debts, so the doubling question is answered before it is asked */
  const shared = a.lines.filter((l) => l.shared);
  if (shared.length) {
    push({
      id: "shared",
      target: { section: "picture", uids: shared.map((l) => l.uid) },
      severity: "info",
      title: "התחייבויות משותפות",
      detail: `${shared.length} התחייבויות הופיעו ביותר מדוח אחד ונספרו פעם אחת בלבד.`,
      // How two reports were merged, not a fact about the household's finances.
      // The client sees each debt once, which is the correct outcome either way.
      client: silent("פרט על אופן איחוד שני הדוחות, לא על מצב הלקוח"),
      amount: shared.reduce((s, l) => s + l.balance, 0),
    });
  }

  return flags.sort(
    (x, y) => SEVERITY_ORDER.indexOf(x.severity) - SEVERITY_ORDER.indexOf(y.severity)
  );
}

/* -------------------------------------------------------------------- main */

/**
 * Build the whole analysis from one or more reports of the same household.
 */
export function analyseReports(rawReports: CreditReport[], rawNames: string[] = []): Analysis {
  // The same PDF dropped twice.
  //
  // Line-level merging deliberately refuses to fold two rows from one report
  // together — two facilities at one bank can genuinely look identical — so a
  // duplicate report would otherwise double every figure on this screen
  // silently. A report is identified by whose it is and when it was pulled;
  // the same person pulled on two different dates is two real snapshots, and
  // the later one is kept.
  const seenReport = new Map<string, number>();
  const reports: CreditReport[] = [];
  const fileNames: string[] = [];
  rawReports.forEach((r, i) => {
    const key = `${r.client?.idNumber ?? ""}|${r.meta?.reportDate ?? ""}|${r.transactions.length}`;
    const at = seenReport.get(key);
    if (at !== undefined) {
      reports[at] = r;
      fileNames[at] = rawNames[i] ?? fileNames[at] ?? "";
      return;
    }
    seenReport.set(key, reports.length);
    reports.push(r);
    fileNames.push(rawNames[i] ?? "");
  });

  // Recency is measured from the report, not from today. A דוח ריכוז נתונים is
  // a snapshot: read a year later, "פניות ב-3 החודשים האחרונים" counted against
  // the wall clock is always zero, which reads as "no credit-seeking" when what
  // it means is "we are looking at an old report".
  const asOf =
    reports
      .map((r) => dmy(r.meta?.reportDate))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? new Date();
  const lines = buildLines(reports);
  const own = lines.filter((l) => l.role === "debtor");
  const guaranteed = lines.filter((l) => l.role === "guarantor");

  const byCategory = categoryTotals(lines);
  const mortgages = own.filter((l) => l.category === "mortgage");
  const consumer = own.filter((l) => l.category === "loan");
  const revolvingRows = own.filter((l) => l.category === "card" || l.category === "overdraft");

  const monthlyAll = own.reduce((s, l) => s + l.monthly, 0);
  const consumerMonthly = consumer.reduce((s, l) => s + l.monthly, 0);

  // One property, several mortgages on it. Each deal restates the same
  // collateral, so summing across deals inflates the security and understates
  // LTV — the one direction an LTV must never be wrong in. The report gives
  // each charge a file id (201-076) precisely so it can be recognised twice.
  const collateralSeen = new Map<string, number>();
  for (const l of mortgages) {
    for (const c of l.collateral) {
      const key = c.fileId || `${c.type}|${c.value}`;
      collateralSeen.set(key, Math.max(collateralSeen.get(key) ?? 0, num(c.value)));
    }
  }
  const collateralValue = Array.from(collateralSeen.values()).reduce((s, v) => s + v, 0);
  const mortgageBalance = mortgages.reduce((s, l) => s + l.balance, 0);
  const tracks = mortgageTracks(lines);
  const trackTotal = tracks.reduce((s, t) => s + t.amount, 0);

  // A utilisation ratio is only meaningful over facilities that state a ceiling.
  // Summing every balance over only the limits that happen to be printed made a
  // real report read "ניצול מסגרות 10,889.5%": a ₪336,296 overdraft with no limit
  // on record landed in the numerator against a ₪3,192 card limit. Balance with
  // no approved limit behind it is still debt — it is reported as its own figure
  // rather than divided by somebody else's ceiling.
  const priced = revolvingRows.filter((l) => l.reported.limit && l.limit > 0);
  const revolvingLimit = priced.reduce((s, l) => s + l.limit, 0);
  const revolvingUsed = priced.reduce((s, l) => s + l.balance, 0);
  const revolvingUnlimited = revolvingRows
    .filter((l) => !(l.reported.limit && l.limit > 0))
    .reduce((s, l) => s + l.balance, 0);

  const base: Omit<Analysis, "flags" | "clientView"> = {
    clients: reports.map((r, i) => ({
      name: r.client?.name ?? "",
      idNumber: r.client?.idNumber ?? "",
      clientType: r.client?.clientType ?? "",
      systemStatus: r.client?.systemStatus ?? "",
      collectionStart: r.client?.dataCollectionStart ?? "",
      reportDate: r.meta?.reportDate ?? "",
      reportType: r.meta?.reportType ?? "",
      fileName: fileNames[i] ?? "",
    })),
    lines,
    byCategory,
    totals: {
      balance: own.reduce((s, l) => s + l.balance, 0),
      monthly: monthlyAll,
      overdue: own.reduce((s, l) => s + l.overdue, 0),
      limit: own.reduce((s, l) => s + l.limit, 0),
      rate: weightedRate(own),
      guaranteedBalance: guaranteed.reduce((s, l) => s + l.balance, 0),
      guaranteedCount: guaranteed.length,
    },
    mortgage: {
      balance: mortgageBalance,
      monthly: mortgages.reduce((s, l) => s + l.monthly, 0),
      rate: weightedRate(mortgages),
      tracks,
      variableShare: trackTotal > 0 ? tracks.filter((t) => t.variable).reduce((s, t) => s + t.amount, 0) / trackTotal : 0,
      linkedShare: trackTotal > 0 ? tracks.filter((t) => t.linked).reduce((s, t) => s + t.amount, 0) / trackTotal : 0,
      collateralValue,
      ltv: collateralValue > 0 ? Math.round((mortgageBalance / collateralValue) * 1000) / 1000 : null,
      longestMonths: mortgages.reduce<number | null>(
        (m, l) => (l.months && (m === null || l.months > m) ? l.months : m),
        null
      ),
    },
    consumer: {
      balance: consumer.reduce((s, l) => s + l.balance, 0),
      monthly: consumerMonthly,
      rate: weightedRate(consumer),
      count: consumer.length,
      worstRate: consumer.reduce<number | null>(
        (m, l) => (l.rate !== null && (m === null || l.rate > m) ? l.rate : m),
        null
      ),
      shareOfMonthly: monthlyAll > 0 ? consumerMonthly / monthlyAll : 0,
    },
    revolving: {
      limit: revolvingLimit,
      used: revolvingUsed,
      utilization: revolvingLimit > 0 ? Math.round((revolvingUsed / revolvingLimit) * 1000) / 10 : null,
      unlimitedBalance: revolvingUnlimited,
      peak: revolvingRows.reduce((s, l) => s + l.peak, 0),
      /** Every open card and overdraft, priced ceiling or not — what the client owes. */
      totalBalance: revolvingRows.reduce((s, l) => s + l.balance, 0),
    },
    cards: {
      monthlyCharge: revolvingRows.reduce((s, l) => s + l.monthly, 0),
      paidActually: revolvingRows.reduce((s, l) => s + l.paidActually, 0),
      rolled: Math.max(
        0,
        revolvingRows.reduce((s, l) => s + Math.max(0, l.monthly - l.paidActually), 0)
      ),
      count: revolvingRows.filter((l) => l.monthly > 0).length,
    },
    behaviour: behaviour(reports, lines),
    inquiries: inquiries(reports, asOf),
    legal: (() => {
      const execution = reports.flatMap((r) => (r.execution ?? []).map((c) => c.fields));
      // A file with a closing date and nothing left owing is history. Calling
      // it an open debt is the kind of false alarm that kills a good file.
      const executionOpen = execution.filter(
        (c) => !c["197-013"] || num(c["197-009"]) > 0
      );
      return {
        execution,
        executionOpen,
        insolvency: reports.flatMap((r) => (r.insolvency ?? []).map((c) => c.fields)),
        nonPayment: reports.flatMap((r) => r.nonPaymentIndicators ?? []),
        executionDebt: executionOpen.reduce(
          (s, c) => s + num(c["197-009"] || c["197-007"]),
          0
        ),
        adminActions: reports.flatMap((r) => r.adminActions ?? []),
      };
    })(),
    sources: sourceTotals(reports),
    reconcile: reconcile(reports, lines),
    warnings: Array.from(new Set(reports.flatMap((r) => r.warnings ?? []))),
  };

  const flags = buildFlags(base);
  const clientView = buildClientView(base, flags);

  // The invariant, said out loud rather than trusted. If a debt counts toward the
  // footer but has no row, the page must not quietly show a smaller sum than it
  // announces — so the gap becomes a warning the advisor sees.
  const warnings =
    clientView.unshownBalance === 0
      ? base.warnings
      : [
          ...base.warnings,
          `סיכום ללקוח: ${Math.abs(clientView.unshownBalance).toLocaleString("en-US")} ₪ מהיתרה אינם מופיעים באף שורה בעמוד.`,
        ];

  return { ...base, warnings, flags, clientView };
}
