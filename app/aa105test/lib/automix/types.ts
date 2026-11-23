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
  /**
   * מאוזן — payment relief and total saving in equal measure (the same share of
   * the most free relief and of the most saving the budget allows); the default
   * recommendation.
   */
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
  /**
   * "Build it anyway." The advisor's override of everything in the client's
   * condition that would otherwise refuse a mix — insolvency or enforcement
   * proceedings, active arrears, debts past their due date, no known
   * collateral, an age that cuts the term. With it on, nothing in `blocks` is a
   * refusal any more: the engine builds the best case that a lender of the
   * chosen tier would still write, prices it for that reality, and says on
   * every proposal what was overridden and what has to happen for it to be
   * filed. Rules that are LAW for the lender in question are never overridden.
   */
  override: boolean;
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
  /**
   * Back-test and calibration only (scripts/automix-backtest.mts); the sheet
   * never sets it. Absent, every output is byte-identical to the engine without
   * the field (scripts/automix-check.mts holds that with its golden copies).
   */
  tuning?: Tuning;
};

/**
 * What a walk-forward back-test may vary, nothing else:
 *   lambda     per goal, the share of cost that is the worst economy (index.ts LAMBDA);
 *   shocks     the four stress economies' sizes, pp (econ.ts; default history.json shocks);
 *   baseShift  a correction to the forecast's own path, pp, added to EVERY economy
 *              (the base included) wherever a rate or CPI can move — prime from
 *              month 2, bond tracks at their resets, CPI-linked indexation —
 *              phased in over twelve months like the shocks. New money is still
 *              priced on the curve as it stands, and the board's own figures
 *              (`outlook`, the typed read-out) do not move.
 */
export type Tuning = {
  lambda?: Partial<Record<GoalId, number>>;
  shocks?: { rateUp: number; rateDown: number; cpiUp: number; cpiDown: number };
  baseShift?: { rate: number; cpi: number };
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
  /**
   * Override only: a debt due now (AutoMixResult.dueNow.items), always paid off
   * from the new money. For arrears on an account the mix leaves out, `id` is
   * that item's id ("line:<uid>" or "file:<case>"), NOT a master row.
   */
  due?: boolean;
  /** Override only: arrears on this KEPT debt, brought current from the new money, ₪. */
  cure?: number;
  /**
   * Set when the debt is clearly cheaper than the new money that would replace
   * it (rules.ts CHEAP_KEEP): how many points its forecast all-in rate sits
   * under the cheapest new money of its segment at its own term. Every goal but
   * the lowest payment and the consolidation keeps such a debt.
   */
  heldCheap?: number;
};

/** Small rows of one lender, track and decision, shown as one line (Proposal.moveGroups). */
export type MoveGroup = {
  /** The DebtMove ids in this line (one id = a line of its own). */
  ids: string[];
  label: string;
  action: DebtMove["action"];
  count: number;
  /** Σ balance, ₪. */
  balance: number;
  /** Σ fee, ₪. */
  fee: number;
  /** The single move's own `why`, or one sentence for the group. */
  why: string;
};

export type NewTranche = {
  track: TrackKey;
  segment: "housing" | "allPurpose";
  amount: number;
  years: number;
  rate: number;
  monthly: number;
  /**
   * Set on a tranche under a tenth of its segment's new money (rules.ts
   * SLIVER_SHARE), saying why it stays: removing it costs the goal more than
   * the engine gives up for one less track, or a rule needs it.
   */
  keptSmall?: string;
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
  /**
   * The same two figures for the master in the same economy, or, when debt is
   * due now (AutoMixResult.dueNow), for the reference: today's mix cannot go on
   * as it is, so the comparison is today plus clearing that debt.
   */
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
  /**
   * How the new money is secured: "bank" (a bank refinance), "firstLien" (a
   * non-bank lender takes the first lien, the bank mortgage is repaid in full),
   * "secondLien" (the bank mortgage stays; the non-bank loan is registered
   * behind it). `structureWhy` says why, with the other structure's figures.
   */
  structure?: "bank" | "firstLien" | "secondLien";
  structureWhy?: string;
  /**
   * Always set when `structure` is "bank": "internal" = the mortgage stays at its
   * bank and the new money is that bank's (its rates, or the client's own lower
   * record there, or the system plus the client's premium); "move" = the whole
   * mortgage moves to another bank (the system average, or the bank the advisor
   * picked). Absent on non-bank structures.
   */
  refinance?: "internal" | "move";
  /** The bank whose prices this proposal's new money carries ("system" = the average of the banks). */
  priceBank?: BankId;
  /**
   * The monthly ceiling this goal was held to (every goal but payment): the
   * budget; for קיצור שנים up to 10% above today's payment when no budget was
   * set and the higher payment ends the debt at least a year sooner.
   */
  budget?: number;

  /** The complete proposal mix, ready for the board: kept rows + new tranches. */
  rows: ImportedLoan[];
  /** גובה התמהיל for the new tab. */
  target: number;

  metrics: MixMetrics;
  /** proposal − today. Negative monthly/months/totalPaid = better. */
  delta: { monthly: number; months: number; totalPaid: number; totalCost: number; totalInterest: number; pv: number };

  /**
   * מאוזן only: the two measures it balances, against the reference. `relief`
   * = reference − this payment (₪ a month); `saving` = reference − this forecast
   * total paid (₪). `reliefMax` = the most relief that pays no more in total;
   * `savingMax` = the most forecast saving the budget allows; `t` = the smaller
   * of the two shares (relief/reliefMax, saving/savingMax), the share of each the
   * client gets at least. A maximum below materiality is not balanced against
   * (`t` is then the other share).
   */
  balance?: { relief: number; reliefMax: number; saving: number; savingMax: number; t: number };

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
  /**
   * `moves` for a short list: every move under SMALL_MOVE (rules.ts, ₪20,000) of
   * one lender, track and decision folded into one line with a count and a sum;
   * every other move a line of its own, in `moves` order. Present only when it
   * folds something. `moves` stays complete.
   */
  moveGroups?: MoveGroup[];
  tranches: NewTranche[];
  /**
   * החזר חודשי נמוך, מאוזן, קיצור שנים: the five-year payment guard. "absolute":
   * no payment above `caps[0]` in any economy (today's payment; קיצור שנים its
   * ceiling); "relative": today's own mix rises above that in a stress economy,
   * so in each economy the mix pays no more than today's mix would there at its
   * own five-year peak (`caps` per economy, `stress` order); "none": neither.
   * `holds`: the proposal's own rows hold it on every month 1–60.
   */
  guard?: { kind: "absolute" | "relative" | "none"; caps: number[]; holds: boolean };
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

/** One thing in the client's condition that refuses a mix, or would without the override. */
export type Block = {
  id: string;
  /** Short name of the obstacle, e.g. "הליך חדלות פירעון". */
  title: string;
  /** One sentence: what the document shows and what it means for new credit. */
  detail: string;
  /** Master row ids it is about. */
  rows: string[];
  /** Did `profile.override` lift it? */
  overridden: boolean;
  /** What has to happen in the real world before a mix built past it can be filed. */
  condition: string;
  /**
   * What the block does while it is NOT overridden:
   *   refuses — no goal is built (insolvency);
   *   limits  — something is left out or cut (past-due debt outside the mix, no
   *             all-purpose money without collateral, a shorter term for age,
   *             no enlarging an LTV breach);
   *   prices  — the mix is still built, at the lender who would take it
   *             (arrears, enforcement → non-bank).
   */
  effect: "refuses" | "limits" | "prices";
  /** Is it law for the lender chosen (never lifted by the override)? */
  law: boolean;
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
    /** The bank whose prices `rows` show: the picked bank, else the bank that holds the mortgage (an internal refinance), else "system". */
    bank: BankId;
    /** The tier the new money was priced at, and — when it was read from the document — why. */
    tier: PricingTier;
    tierWhy: string;
    rows: { track: TrackKey; label: string; rate10: number; rate20: number; rate30: number }[];
    notes: string[];
  };
  /** Master rows the engine could not use, and why. */
  skipped: { id: string; label: string; why: string }[];
  /**
   * Everything in the client's condition that stands between them and a mix,
   * whether or not it was overridden. Empty for a clean file. While any block
   * with `overridden: false` remains, the goals it touches are "unavailable".
   */
  blocks: Block[];
  /**
   * Override only, when the condition puts debt due now in the picture (null
   * otherwise): what it is, and the REFERENCE every proposal's "versus today" is
   * measured from: today's mix kept, plus the cheapest monthly way this lender
   * clears the due debt and cures the arrears (solved as a mix, costs included).
   * Balances are as the report states them; the growth until payoff is a caveat.
   */
  dueNow: {
    total: number;
    /** kind "called": a row in the mix in arrears of 90+ days (or in legal hands), which its lender calls in full. */
    items: { id: string; label: string; balance: number; kind: "past-due" | "outside" | "enforcement" | "called"; rowId: string | null }[];
    /** Arrears on kept rows, brought current from the new money. */
    cures: { rowId: string; overdue: number }[];
    /** `pv`: the reference's forecast present value at the board's discount rate (the savings/balanced PV cap). */
    reference: { monthly: number; totalPaid: number; months: number; pv?: number };
    /** The budget the budget goals were held to. */
    budget: number;
    /** "profile": profile.budget; "reference": the reference's own payment (the default). */
    budgetSource: "profile" | "reference";
  } | null;
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
  override: false,
};
