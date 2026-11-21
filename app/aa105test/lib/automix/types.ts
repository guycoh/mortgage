// תמהיל אוטומטי — the contract between the engine (./index.ts and friends) and
// the sheet that shows its answers (components/AutoMix.tsx).
//
// THE FEATURE. A credit report (or a bank payoff letter) is on the board as the
// master mix. One button asks: given everything this document says, what is the
// best mix this client can actually get today? The answer is not one mix but
// one per GOAL — the lowest sound monthly payment, the shortest overall term at
// the payment they already carry, the lowest total cost, a balanced middle, the
// most certainty — each a complete, bank-approvable, advisor-credible mix that
// lands on the board as an ordinary proposal tab copied from the master.
//
// Every figure a proposal states must be the figure the BOARD will show once
// the tab exists (same pricing engine, same assumptions) — to the shekel.
//
// The engine is pure: no fetch, no Date.now() beyond what the board's own
// engine already reads, runnable in Node. The sheet fetches the market
// snapshot and hands everything in.

import type { ImportedLoan } from "@/app/aa102test/lib/credit";
import type { Forecast } from "@/app/aa102test/lib/forecast";
import type { BankId, MarketSnapshot, TrackKey } from "@/app/aa107test/lib/market";
import type { Analysis } from "@/app/aa102test/lib/analysis";

/* ------------------------------------------------------------------ input */

export type GoalId =
  /** אופטימיזציית החזר חודשי — the lowest monthly payment a sound mix reaches. */
  | "payment"
  /** קיצור שנים כולל — the monthly budget held, the whole debt finished as early as possible. */
  | "years"
  /** חיסכון מקסימלי — the monthly budget held, the least money paid overall. */
  | "savings"
  /** מאוזן — some of the payment relief and some of the saving; the default recommendation. */
  | "balanced"
  /** יציבות מרבית — the least exposure to prime and CPI the budget allows. */
  | "stable"
  /** איחוד הלוואות בלבד — the mortgage untouched, consumer debt folded into housing-collateral money. */
  | "consolidate";

export type PropertyType = "single" | "replacement" | "investment";

/** What no credit report states. Every field optional; null = unknown. */
export type ClientProfile = {
  /** Net disposable household income, ₪ a month — enables the PTI rule. */
  income: number | null;
  /** Value of the mortgaged property, ₪ — enables LTV and all-purpose headroom. */
  propertyValue: number | null;
  propertyType: PropertyType;
  /** Age of the YOUNGEST borrower — caps the term at the bank's age limit. */
  age: number | null;
  /** The bank the new money is priced at; "system" = the banking-system average. */
  bank: BankId;
  /** Negotiated discount on every new track, percentage points. */
  negotiated: number;
  /**
   * The monthly payment the client can carry, ₪. null = what they pay today.
   * "years", "savings", "stable" hold the payment at or under it; "payment"
   * ignores it; "balanced" lands under it.
   */
  budget: number | null;
  /** May consumer loans be refinanced into housing-collateral (כל מטרה) money? */
  consolidate: boolean;
  /**
   * What kind of lender this client can realistically get new money from.
   * "auto" = read it from the document (who lent to them, at what margins,
   * arrears) — the resolved answer and its reason come back in `pricing`.
   */
  tier: PricingTier | "auto";
};

/**
 * bank        — a bank at market terms (the BoI averages);
 * bankPremium — a bank, with a risk premium on every track;
 * nonbank     — a non-bank mortgage lender (חוץ־בנקאי): dearer, narrower menu.
 */
export type PricingTier = "bank" | "bankPremium" | "nonbank";

export type AutoMixInput = {
  /** The master mix's rows exactly as the board holds them (guarantees included — the engine drops them). */
  master: ImportedLoan[];
  market: MarketSnapshot;
  /**
   * The BoI curves (directive 451) as the board loaded them — needed to price
   * new money along the curve whatever mode the board is in. null only while
   * they are still loading or the fetch failed (then nothing can be priced).
   */
  forecast: Forecast | null;
  /**
   * Is the board's forecast switch on? When off, the over-time views price
   * flat too, so `MixMetrics.outlook` is null and nothing claims a forecast.
   */
  forecastOn: boolean;
  /** The board's typed annual inflation, %. */
  inflation: number;
  /** The board's discount rate, annual %. */
  discountRate: number;
  profile: ClientProfile;
  /** Which goals to solve. Omitted = every goal that applies to this master. */
  goals?: GoalId[];
  /**
   * The board's analysis of the credit report(s) behind the master
   * (analyseReports, the same object the analysis modal reads). Optional — a
   * bank letter has none. It is the only place arrears, enforcement,
   * insolvency and the reported collateral value live; without it the engine
   * cannot see them and says so.
   */
  analysis?: Analysis | null;
};

/* ----------------------------------------------------------------- output */

export type TrackShare = { track: TrackKey; amount: number; share: number };

/** One mix, priced the way the board prices it. */
export type MixMetrics = {
  /** Total owed, ₪ (guarantees excluded). */
  balance: number;
  /** החזר חודשי — month one, as the board's read-out shows it. */
  monthly: number;
  /** The highest monthly payment over the life of the mix under the board's assumptions. */
  peakMonthly: number;
  /** Months until the last payment of the whole mix. */
  months: number;
  /** Every future payment, nominal. */
  totalPaid: number;
  /** totalPaid − balance: interest plus indexation. */
  totalCost: number;
  /**
   * סה״כ ריבית exactly as the board's read-out states it for this mix:
   * Σ priceLoan(row, typed).totalInterest over owed rows (see `totals` in
   * Simulator.tsx). The sheet's cost column quotes this one, so the figure a
   * goal promises is the figure the new tab's read-out shows.
   */
  totalInterest: number;
  /** Present value of every payment at the board's discount rate. */
  pv: number;
  /** Balance-weighted rate today, %. */
  avgRate: number;
  /** By track, largest first. */
  shares: TrackShare[];
  /** Share of the balance whose rate cannot change (קל"צ + ק"צ). */
  fixedShare: number;
  /** Share of the balance linked to CPI (ק"צ + מ"צ). */
  linkedShare: number;
  /**
   * The same mix down the years under the BoI forecast (directive 451) — the
   * pricing the board's charts, unified schedule and comparison use. The
   * fields above are the TYPED pricing (rate as entered, CPI at the board's
   * one %), which is what the board's read-out and grid show. null when the
   * board has no forecast.
   */
  outlook: { peakMonthly: number; totalPaid: number; totalCost: number; pv: number } | null;
};

/** What happens to one debt of the master. */
export type DebtMove = {
  /** The master row's id. */
  id: string;
  label: string;
  group: "mortgage" | "loan";
  /**
   * What refinancing it borrows: "housing", or "allPurpose" for a consumer loan
   * and for a mortgage row whose purpose is כל מטרה (banks price a refinance by
   * the purpose of the money). The proposal's tranches of the same segment fund it.
   */
  segment: "housing" | "allPurpose";
  balance: number;
  rate: number;
  months: number;
  action: "keep" | "refinance" | "consolidate";
  /** One plain Hebrew sentence with the numbers that decided it. */
  why: string;
  /** הפרשי היוון + statutory fees charged for prepaying this debt, ₪ (0 when kept). */
  fee: number;
  feeEstimated: boolean;
};

export type NewTranche = {
  track: TrackKey;
  segment: "housing" | "allPurpose";
  amount: number;
  years: number;
  rate: number;
  monthly: number;
};

export type Check = {
  label: string;
  ok: boolean;
  value: string;
  /** The rule and its source, e.g. "הוראה 329 §7 — ריבית משתנה עד ⅔". */
  rule: string;
};

export type StressRow = {
  id: string;
  label: string;
  /** Highest monthly payment in this economy. */
  peakMonthly: number;
  totalPaid: number;
  /** The same two figures for the master in the same economy. */
  todayPeakMonthly: number;
  todayTotalPaid: number;
};

export type Proposal = {
  goal: GoalId;
  /** The tab's name on the board. */
  label: string;
  /** One line under the name: what this goal does, in the advisor's words. */
  tagline: string;
  /**
   * ok          — a real improvement on its own goal;
   * no-gain     — solved, but not materially better than today (shown, not offered);
   * unavailable — cannot be built for this master (`note` says why).
   */
  status: "ok" | "no-gain" | "unavailable";
  note?: string;
  /** Same mix as another goal's answer → that goal's id (the sheet folds them). */
  sameAs?: GoalId;

  /** The complete proposal mix, ready for the board: kept rows + new tranches. */
  rows: ImportedLoan[];
  /** גובה התמהיל for the new tab. */
  target: number;

  metrics: MixMetrics;
  /** proposal − today. Negative monthly/months/totalPaid = better. */
  delta: { monthly: number; months: number; totalPaid: number; totalCost: number; totalInterest: number; pv: number };

  /** What the switch itself costs, ₪ — all of it already inside `rows` when financed. */
  costs: {
    prepaymentFees: number;
    feesEstimated: boolean;
    /** File opening, appraisal, registration — the new loan's one-off costs. */
    setup: number;
    /** Are fees and setup rolled into the new principal (true) or paid in cash? */
    financed: boolean;
    /**
     * The first month from which the client is ahead and stays ahead if they
     * closed everything then: cumulative (old − new payments) + (old − new
     * balance) ≥ 0, costs financed. 0 = from the first month (מיידי); null = never.
     */
    breakEvenMonths: number | null;
  };

  moves: DebtMove[];
  tranches: NewTranche[];
  /** Why this mix — three to five sentences, each carrying its numbers. */
  reasons: string[];
  /** What the advisor must check or tell the client before filing it. */
  caveats: string[];
  checks: Check[];
  stress: StressRow[];
};

/** Something the engine read in the document that drives the proposals. */
export type Finding = {
  id: string;
  /** high = costs real money now · medium = worth acting on · info = context. */
  severity: "high" | "medium" | "info";
  title: string;
  detail: string;
  /** Master row ids it is about. */
  rows: string[];
  /** ₪ a year this costs against today's market, when it can be put in money. */
  annualCost?: number;
};

export type AutoMixResult = {
  ok: boolean;
  /** When !ok: why nothing could be built, in Hebrew. */
  reason?: string;
  today: MixMetrics;
  findings: Finding[];
  proposals: Proposal[];
  recommended: GoalId | null;
  /** The market the new money was priced on — shown as provenance. */
  pricing: {
    asOf: string;
    bank: BankId;
    /** The tier the new money was priced at, and — when it was read from the document — why. */
    tier: PricingTier;
    tierWhy: string;
    rows: { track: TrackKey; label: string; rate10: number; rate20: number; rate30: number }[];
    notes: string[];
  };
  /** Master rows the engine could not use, and why. */
  skipped: { id: string; label: string; why: string }[];
  ms: number;
};

export const DEFAULT_PROFILE: ClientProfile = {
  income: null,
  propertyValue: null,
  propertyType: "single",
  age: null,
  bank: "system",
  negotiated: 0,
  budget: null,
  consolidate: true,
  tier: "auto",
};
