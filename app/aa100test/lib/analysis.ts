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
  /** Which debts triggered it, for the analyst to go look. */
  where?: string[];
  amount?: number;
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
  /** Drawn ÷ limit, for revolving facilities only. */
  utilization: number | null;
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
  revolving: { limit: number; used: number; utilization: number | null; peak: number };
  behaviour: Behaviour;
  inquiries: Inquiries;
  legal: Legal;
  /** The report's own summary table, per lender. */
  sources: SourceTotal[];
  reconcile: Reconciliation;
  flags: Flag[];
  warnings: string[];
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
function buildFlags(a: Omit<Analysis, "flags">): Flag[] {
  const flags: Flag[] = [];
  const own = a.lines.filter((l) => l.role === "debtor");
  const push = (f: Flag) => flags.push(f);

  /* ---- legal proceedings: the file-stoppers */
  if (a.legal.insolvency.length) {
    push({
      id: "insolvency",
      severity: "critical",
      title: "הליך חדלות פירעון",
      detail: `נמצאו ${a.legal.insolvency.length} הליכי חדלות פירעון או שיקום כלכלי. יש לברר סטטוס והכרעות לפני כל המשך טיפול.`,
      amount: a.legal.insolvency.reduce((s, c) => s + num(c["151-009"] || c["151-007"]), 0),
    });
  }
  if (a.legal.executionOpen.length) {
    push({
      id: "execution",
      severity: "critical",
      title: "תיקים פתוחים בהוצאה לפועל",
      detail: `${a.legal.executionOpen.length} תיקים פתוחים. חוב פתוח בהוצאה לפועל נחשב חוב לכל דבר וחוסם כמעט כל מסלול.`,
      amount: a.legal.executionDebt,
    });
  }
  const closedExec = a.legal.execution.length - a.legal.executionOpen.length;
  if (closedExec > 0) {
    push({
      id: "execution-closed",
      severity: "medium",
      title: "תיקי הוצאה לפועל שנסגרו",
      detail: `${closedExec} תיקים נסגרו ואינם חוב פתוח, אך נותרים בדוח ונקראים כהיסטוריה על ידי החתם.`,
    });
  }
  if (a.legal.nonPayment.length) {
    const blocking = a.legal.nonPayment.filter((n) => n.prevents).length;
    push({
      id: "nonpayment",
      // "מונע או מבטל" is the whole question. An indicator that neither
      // prevents nor cancels is on the record; one that does is a wall.
      severity: blocking ? "critical" : "high",
      title: "נתונים המעידים על אי עמידה בפירעון",
      detail: blocking
        ? `${a.legal.nonPayment.length} רשומות, מתוכן ${blocking} מונעות או מבטלות. זהו הפריט הראשון שבנק יבחן.`
        : `${a.legal.nonPayment.length} רשומות שאינן מונעות או מבטלות, אך מופיעות בדוח ויידרש הסבר.`,
      where: a.legal.nonPayment.map((n) => n.source).filter(Boolean),
    });
  }
  const openRequests = a.legal.adminActions.filter((x) => !/הסתיים|טופל/.test(x.status || ""));
  if (openRequests.length) {
    push({
      id: "admin",
      severity: "info",
      title: "פניות פתוחות מול מערכת נתוני אשראי",
      detail: `${openRequests.length} פניות שטרם הסתיימו (${openRequests
        .map((x) => x.type)
        .join(", ")}). אם מדובר בתיקון מידע, ייתכן שהתמונה תשתנה.`,
    });
  }

  /* ---- arrears, now and historic */
  const inArrears = own.filter((l) => l.overdue > 0 || l.arrearsRange);
  if (inArrears.length) {
    push({
      id: "arrears-now",
      severity: "high",
      title: "פיגורים פעילים",
      detail: `${inArrears.length} התחייבויות בפיגור${
        inArrears.some((l) => l.arrearsRange) ? ` (הטווח החמור: ${inArrears.map((l) => l.arrearsRange).filter(Boolean).sort().reverse()[0]})` : ""
      }.`,
      amount: inArrears.reduce((s, l) => s + l.overdue, 0),
      where: Array.from(new Set(inArrears.map((l) => l.bank))),
    });
  }
  if (a.behaviour.arrearsMonths > 0) {
    push({
      id: "arrears-history",
      severity: a.behaviour.worstBucket >= 4 ? "high" : "medium",
      title: "היסטוריית פיגורים",
      detail: `${a.behaviour.arrearsMonths} חודשים עם פיגור בהיסטוריה${
        a.behaviour.worstBucket >= 4 ? `, כולל פיגור של 120 יום ומעלה` : ""
      }. בנקים בוחנים את הדפוס, לא רק את המצב הנוכחי.`,
    });
  }

  /* ---- remarks the report codes explicitly */
  const remarked = (needle: string) => own.filter((l) => l.remarks.some((r) => r.includes(needle)));
  const enforced = remarked("הוצאה לפועל");
  if (enforced.length) {
    push({
      id: "remark-enforced",
      severity: "high",
      title: "עסקאות בטיפול ההוצאה לפועל",
      detail: `${enforced.length} עסקאות מסומנות כמטופלות בהוצאה לפועל.`,
      where: Array.from(new Set(enforced.map((l) => l.bank))),
    });
  }
  const noPayment = remarked("לא התקבל כל תשלום");
  if (noPayment.length) {
    push({
      id: "remark-nopay",
      severity: "high",
      title: "עסקאות בפיגור ללא תשלום כלל",
      detail: `${noPayment.length} עסקאות שלא התקבל בהן תשלום.`,
      where: Array.from(new Set(noPayment.map((l) => l.bank))),
    });
  }

  /* ---- payment instruments */
  if (a.behaviour.checksReturned > 0) {
    push({
      id: "checks",
      severity: a.behaviour.checksReturned >= 3 ? "high" : "medium",
      title: 'שיקים שחזרו (אכ"מ)',
      detail: `${a.behaviour.checksReturned} שיקים חזרו מתוך ${a.behaviour.checksPresented || "—"} שהוצגו.`,
    });
  }
  if (a.behaviour.debitsDishonored > 0) {
    push({
      id: "debits",
      severity: a.behaviour.debitsDishonored >= 3 ? "high" : "medium",
      title: "הוראות קבע שלא כובדו",
      detail: `${a.behaviour.debitsDishonored} הוראות לחיוב חשבון לא כובדו מתוך ${a.behaviour.debitsPresented || "—"}.`,
    });
  }

  /* ---- status of the client record itself */
  const blocked = a.clients.filter((c) => c.systemStatus && !/רגיל|תקין/.test(c.systemStatus));
  if (blocked.length) {
    push({
      id: "client-status",
      severity: "high",
      title: `סטטוס לקוח: ${blocked[0].systemStatus}`,
      detail: "סטטוס שאינו רגיל במערכת נתוני האשראי — יש לברר את משמעותו מול הלקוח.",
      where: blocked.map((c) => c.name),
    });
  }

  /* ---- revolving credit */
  if (a.revolving.utilization !== null && a.revolving.utilization >= 80) {
    push({
      id: "revolving",
      severity: a.revolving.utilization >= 95 ? "high" : "medium",
      title: "ניצול מסגרות גבוה",
      detail: `${a.revolving.utilization}% מהמסגרות מנוצלות. ניצול מתמשך מעל 80% נקרא כמצוקת נזילות.`,
      amount: a.revolving.used,
    });
  }

  // A facility can look calm on the statement date and still have been run to
  // the ceiling mid-month. The peak is the number a lender reacts to.
  if (
    a.revolving.limit > 0 &&
    a.revolving.peak > a.revolving.used * 1.15 &&
    a.revolving.peak / a.revolving.limit >= 0.9
  ) {
    push({
      id: "revolving-peak",
      severity: "medium",
      title: "שיא ניצול גבוה מהיתרה המוצגת",
      detail: `שיא הניצול בחודש הדיווח היה ${Math.round(a.revolving.peak).toLocaleString("en-US")} ₪ מול יתרה מוצגת של ${Math.round(a.revolving.used).toLocaleString("en-US")} ₪ — המסגרת נוצלה כמעט במלואה במהלך החודש.`,
      amount: a.revolving.peak,
    });
  }

  /* ---- price of the consumer debt */
  const expensive = own.filter((l) => l.category === "loan" && (l.rate ?? 0) >= 10);
  if (expensive.length) {
    const worst = Math.max(...expensive.map((l) => l.rate ?? 0));
    push({
      id: "expensive",
      severity: worst >= 13 ? "high" : "medium",
      title: "הלוואות בריבית גבוהה",
      detail: `${expensive.length} הלוואות בריבית ${worst.toFixed(2)}% ומטה-מעלה — מועמדות ראשונות למיחזור לתוך המשכנתא.`,
      amount: expensive.reduce((s, l) => s + l.balance, 0),
      where: Array.from(new Set(expensive.map((l) => l.bank))),
    });
  }

  /* ---- balloon exposure */
  const balloons = own.filter((l) => l.balloon);
  if (balloons.length) {
    push({
      id: "balloon",
      severity: "medium",
      title: "הלוואות בלון",
      detail: `${balloons.length} התחייבויות שהקרן בהן נפרעת בסוף התקופה. ההחזר החודשי הנוכחי אינו משקף את החבות.`,
      amount: balloons.reduce((s, l) => s + l.balance, 0),
      where: Array.from(new Set(balloons.map((l) => l.bank))),
    });
  }

  /* ---- mortgage risk composition */
  if (a.mortgage.balance > 0) {
    if (a.mortgage.variableShare >= 0.66) {
      push({
        id: "variable",
        severity: "medium",
        title: "חשיפה גבוהה לריבית משתנה",
        detail: `${Math.round(a.mortgage.variableShare * 100)}% מהמשכנתא במסלולים משתנים. כל עליית ריבית מתגלגלת כמעט במלואה להחזר.`,
        amount: Math.round(a.mortgage.balance * a.mortgage.variableShare),
      });
    }
    if (a.mortgage.linkedShare >= 0.5) {
      push({
        id: "linked",
        severity: "medium",
        title: "חשיפה גבוהה למדד",
        detail: `${Math.round(a.mortgage.linkedShare * 100)}% מהמשכנתא צמוד למדד — הקרן עצמה גדלה עם האינפלציה.`,
        amount: Math.round(a.mortgage.balance * a.mortgage.linkedShare),
      });
    }
    if (a.mortgage.ltv !== null && a.mortgage.ltv >= 0.75) {
      push({
        id: "ltv",
        severity: a.mortgage.ltv >= 0.9 ? "high" : "medium",
        title: `יחס מימון ${Math.round(a.mortgage.ltv * 100)}%`,
        detail: "יחס מימון גבוה מצמצם מאוד את מרחב המיחזור ואת הנכונות של בנקים להגדיל.",
      });
    }
  }

  /* ---- how the monthly burden is split */
  if (a.consumer.shareOfMonthly >= 0.4 && a.consumer.monthly > 0) {
    push({
      id: "consumer-weight",
      severity: "medium",
      title: "משקל גבוה להלוואות צרכניות",
      detail: `${Math.round(a.consumer.shareOfMonthly * 100)}% מההחזר החודשי הולך להלוואות צרכניות ולא למשכנתא — הפוטנציאל הגדול ביותר לשיפור תזרים.`,
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
      severity: mortgageAsk > 0 ? "high" : "medium",
      title: mortgageAsk > 0 ? "בקשות משכנתה פתוחות אצל מלווים אחרים" : "בקשות אשראי פתוחות",
      detail: `${parts.join(" · ")}. ${
        mortgageAsk > 0
          ? "הלקוח כבר נבדק במקום אחר — כדאי לברר מה הוצע לו לפני שמציעים."
          : "אשראי שיאושר יופיע כחוב נוסף."
      }`,
      amount: mortgageAsk || undefined,
      where: Array.from(new Set(a.inquiries.pending.map((q) => q.user).filter(Boolean))),
    });
  }

  /* ---- the report disagreeing with itself */
  if (a.reconcile.balanceGap > 500 || a.reconcile.limitGap > 500) {
    push({
      id: "reconcile",
      severity: "medium",
      title: "פער בין התמצית לפירוט",
      detail: `תמצית הדוח מציגה ${
        a.reconcile.balanceGap > 500 ? `יתרות גבוהות ב-₪${a.reconcile.balanceGap.toLocaleString("en-US")}` : ""
      }${a.reconcile.balanceGap > 500 && a.reconcile.limitGap > 500 ? " ו" : ""}${
        a.reconcile.limitGap > 500 ? `מסגרות גבוהות ב-₪${a.reconcile.limitGap.toLocaleString("en-US")}` : ""
      } מהמופיע בעמודי הפירוט. יש לקרוא את התמצית במסמך המקורי — הניתוח כאן עלול לחסר.`,
    });
  }
  if (a.inquiries.last3 >= 3) {
    push({
      id: "shopping",
      severity: "medium",
      title: "ריבוי פניות בזמן קצר",
      detail: `${a.inquiries.last3} פניות לקבלת מידע ב-3 החודשים האחרונים (${a.inquiries.last12} בשנה). דפוס שנקרא כחיפוש אשראי.`,
    });
  }

  /* ---- guarantees */
  if (a.totals.guaranteedCount > 0) {
    push({
      id: "guarantor",
      severity: "info",
      title: "ערבויות",
      detail: `הלקוח ערב ל-${a.totals.guaranteedCount} התחייבויות. אינן החזר שלו, אך נחשבות חשיפה בבדיקת בנק.`,
      amount: a.totals.guaranteedBalance,
    });
  }

  /* ---- joint debts, so the doubling question is answered before it is asked */
  const shared = a.lines.filter((l) => l.shared);
  if (shared.length) {
    push({
      id: "shared",
      severity: "info",
      title: "התחייבויות משותפות",
      detail: `${shared.length} התחייבויות הופיעו ביותר מדוח אחד ונספרו פעם אחת בלבד.`,
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
export function analyseReports(reports: CreditReport[], fileNames: string[] = []): Analysis {
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

  const revolvingLimit = revolvingRows.reduce((s, l) => s + l.limit, 0);
  const revolvingUsed = revolvingRows.reduce((s, l) => s + l.balance, 0);

  const base: Omit<Analysis, "flags"> = {
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
      peak: revolvingRows.reduce((s, l) => s + l.peak, 0),
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

  return { ...base, flags: buildFlags(base) };
}
