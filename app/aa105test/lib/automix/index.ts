// תמהיל אוטומטי — buildAutoMix: the best mix THIS client can get, per goal.
//
// HOW IT DECIDES (the long version is in the module docs of solve.ts,
// econ.ts, fees.ts, tiers.ts, rules.ts):
//
//   1. Read the master: every owed debt, priced three ways — as the board's
//      read-out shows it (typed), under the BoI forecast (directive 451, which
//      re-anchors prime to today and resets bond tracks along the curve), and
//      under four stress economies sized by the BoI's own historical forecast
//      error. Prepayment fees by the fee order unless the document states one.
//   2. Decide who lends (tiers.ts) and price new money there: per track, per
//      whole-year term, housing or all-purpose (market.ts newRate + tier).
//   3. Per goal, solve the MILP in solve.ts — decisions are whole debts and at
//      most four housing tranches (+ two all-purpose), every law and guardrail
//      a constraint, the goal an objective or a cap.
//   4. Build the proposal rows exactly as the board will hold them, and price
//      THOSE rows again for every figure reported: typed metrics are what the
//      new tab's read-out shows; `outlook` is the forecast view.
//
// WHICH PRICING EACH GOAL OPTIMISES. Decisions and materiality use the
// forecast and the stress economies (they price today's prime at today's prime
// and the future at the market's own expectation); the budget, PTI and the
// reported headline figures use the typed pricing, so the sheet never promises
// a payment the board's read-out does not show. Where the two disagree by more
// than a little — a prime row printed at the report date's prime — the
// proposal says so with both numbers.

import { owedOnly, foldMasterRow, isIndexedPath, type ImportedLoan } from "@/app/aa102test/lib/credit";
import { priceLoan, type Econ } from "@/app/aa102test/lib/price";
import { addMonths, parseDate, startOfToday, toIso } from "@/app/aa102test/lib/dates";
import { lenderOf } from "@/app/aa102test/lib/lenders";
import { FREQ_FIXED, FREQ_PRIME, freqLabel } from "@/lib/rate-frequency";
import { BANKS, RESET_MONTHS, TRACK_PATH, TRACK_SHORT, TRACKS, newRate, round2, type BankId, type MarketSnapshot, type TrackKey } from "@/app/aa107test/lib/market";
import type { Forecast } from "@/app/aa102test/lib/forecast";
import type {
  Block,
  AutoMixInput,
  AutoMixResult,
  Check,
  DebtMove,
  Finding,
  GoalId,
  MixMetrics,
  MoveGroup,
  NewTranche,
  Proposal,
  StressRow,
  TrackShare,
} from "./types";
import { ECONOMIES, economiesOf, scheduleIn, typedRow, pvOf, type Economy } from "./econ";
import { prepaymentFee, setCpiMonthly, mergeFeeRows, feeTableAsOf, newFixedRate, OPERATIONAL_FEE } from "./fees";
import { resolveTier, primeOn, NONBANK, NONBANK_LTV, LADDER, isAllPurpose, EVENT_SHARE, PREMIUM_EVIDENCE, type TierInfo } from "./tiers";
import { conditionOf, type Condition, type DueDebt } from "./condition";
import {
  AP_TERM_MAX_YEARS,
  AP_LTV,
  AP_LTV_RELIEF,
  AP_RELIEF_CAP,
  FIXED_MIN,
  LINKED_MAX,
  LTV_MAX,
  MATERIAL,
  MIN_TRANCHE,
  MIN_YEARS,
  PTI_MAX,
  PTI_RISK,
  RULE,
  TERM_MAX_YEARS,
  TRACK_SHARE_MAX,
  BREAK_EVEN_MAX,
  YEARS_STRETCH,
  REFI_COST_MAX,
  SLIVER_SHARE,
  SLIVER_GIVE,
  CHEAP_KEEP,
  DISPLAY_GIVE,
  STABLE_BAND,
  STABLE_PRICE,
  SEASONING_MONTHS,
  SMALL_MOVE,
  TRACK_SHARE_EXEMPT,
} from "./rules";
import { solveTerms as solveTermsRaw, solveOnce, termsOf, canonical, STATS, EARLY, AHEAD, U, SHARE_SLACK, ROUNDING, FIRST_CAP, type Seed, type Column, type Plan, type Segment, type SolverDebt, type Spec } from "./solve";
import history from "./history.json";

export * from "./types";
export { DEFAULT_PROFILE } from "./types";

/* ------------------------------------------------------------ constants */

/**
 * One-off costs of a new loan (research-refi-costs notes):
 *   file opening   capped by law at ₪360 since 08/2022 (חוק הבנקאות (שירות
 *                  ללקוח), amendment 34; Supervisor's letter 12/07/2022
 *                  https://boi.org.il/media/om3etzak/202229.pdf)
 *   appraisal      ₪1,500–3,000, paid to the appraiser (typical, not regulated) → ₪2,500
 *   registration   טאבו mortgage note ₪188 (2026 tariff); pledge register ₪225 / 5y
 *   operational    ₪60 once per prepayment (fee order §3(1))
 * An internal refinance at the same bank may waive the appraisal; the figure
 * is the conservative one and says it is typical.
 */
export const SETUP = { file: 360, appraisal: 2500, registration: 188, operational: OPERATIONAL_FEE };
const SETUP_HOUSING = SETUP.file + SETUP.appraisal + SETUP.registration + SETUP.operational;
/** An all-purpose loan alongside: its own file and lien, the appraisal shared. */
const SETUP_AP_ALONE = SETUP.file + SETUP.appraisal + SETUP.registration;

/**
 * Real-world conditions before a mix built past a block can be filed.
 * Sources (research-insolvency-enforcement.md, side-session notes):
 *   · Old bankruptcy ordinance (cases pending on 15/09/2019 stay under it,
 *     חוק חדלות פירעון §373(ב)): after a receiving order the Official Receiver
 *     holds the property (פקודת פשיטת הרגל §20); a composition (§33–35) needs a
 *     majority of creditors by number and ¾ by value, the court and the OR's
 *     report, and may be funded by a third party or loan money; the lien comes
 *     after approval. https://he.wikisource.org/wiki/פקודת_פשיטת_הרגל
 *   · 2018 law: no new credit after an opening order without the Commissioner's
 *     approval (§123), the home is an estate asset (§216(2), §131); a debt
 *     arrangement (§185, §319) needs the creditors' majorities and the court and
 *     cancels the opening order. The Commissioner's directive of 06/11/2025
 *     (¶22) opposes, as a rule, prepaying a rehabilitation plan with a loan.
 *     https://he.wikisource.org/wiki/חוק_חדלות_פירעון_ושיקום_כלכלי
 *   · Enforcement: the file is paid in full (principal, interest and linkage
 *     under חוק פסיקת ריבית והצמדה, execution fees from 1% and attorney fees of
 *     5%/4%/3% by bracket, again after the warning period, plus VAT), then the
 *     attachment is cancelled and deleted (חוק ההוצאה לפועל §34(ג), §42).
 *   · Second lien: by default it needs no consent (חוק המשכון §6(א)), but bank
 *     mortgage deeds require the bank's consent (Mizrahi-Tefahot form 2813);
 *     if the bank refuses, the route is refinancing the first mortgage.
 *   · Credit data: lenders see data from the last 3 years (חוק נתוני אשראי §47(א)).
 */
const INSOLVENCY_CONDITION: Record<"bankruptcy" | "insolvency", string> = {
  bankruptcy:
    "הצעת פשרה לפי פקודת פשיטת הרגל (סעיפים 33 עד 35) באישור רוב הנושים במספר ושלושה רבעים בערך, דוח הכונס הרשמי ובית המשפט, והשעבוד נרשם רק אחרי אישורה",
  insolvency:
    "הסדר חוב לפי חוק חדלות פירעון (סעיפים 185 ו-319) באישור רוב הנושים ובית המשפט, וכל אשראי לפני כן רק באישור הממונה (סעיף 123)",
};
const ENFORCEMENT_CONDITION = "פירעון התיק במלואו מכספי ההלוואה, כולל ריבית, הצמדה, אגרות ושכר טרחה, ומחיקת העיקול מהנכס לפני רישום השעבוד";
const ARREARS_CONDITION = "פירעון הפיגורים מכספי ההלוואה, ואישור המלווה לאשראי ללווה עם היסטוריית פיגורים";
const DUE_CONDITION = "פירעון מלא מכספי ההלוואה לפי מכתב יתרה מכל נושה";
/**
 * What a debt due now grows by before it is paid (research-nonbank-distress §5),
 * CALC on sourced parameters, not a published figure:
 *   · arrears interest at most the Fair Credit ceiling × 1.2 (21.90% today);
 *   · in enforcement, without a contract arrears rate: ריבית שקלית 5.36% +
 *     דמי פיגורים 4.68% (Q4 2026, Accountant General via Bizportal 20/11/2026,
 *     https://www.bizportal.co.il/calculators/news/article/20048056); with one,
 *     that rate instead (חוק פסיקת ריבית והצמדה §6);
 *   · execution fee 1% of the file (תקנות ההוצאה לפועל (אגרות, שכר והוצאות));
 *   · attorney 5% / 4% / 3% by bracket at filing and the same again after the
 *     warning period, plus VAT (Bar recommended tariff, פרט 9).
 * A ₪100,000 judgment: about +17% to +23% in the first year without a contract
 * rate, about +35% with one at the cap → the band +15% to +35% in year one.
 * The engine adds NONE of it to the stated balances; the caveat gives the band.
 */
const DUE_GROWTH = { low: 0.15, high: 0.35 };
/**
 * A home-secured loan far below what NON-BANK lenders write: Mimun Yashir's
 * all-second-lien Series 4 averages ₪408,723 (S&P Maalot 12/07/2026) and
 * Meitav lends from ₪500,000. Under ₪50,000 (the solver's own MIN_TRANCHE) a
 * non-bank loan, or one built past debt due now, carries a caveat saying so.
 * Banks do publish smaller ones (BANK_AP_MIN), so for a bank the size is not
 * the test: the one-off costs' share of the loan is (rules.ts REFI_COST_MAX).
 */
const SMALL_LOAN = 50_000;
/**
 * The smallest regular home-secured all-purpose loan a bank publishes:
 * Mizrahi-Tefahot, "הלוואה החל מ-40,000 ₪ לתקופה של 4-30 שנים", for its
 * mortgage customers, against their home
 * (https://www.mizrahi-tefahot.co.il/loans/privateloanslib/all-purpose-loan/,
 * read 23/11/2026). The same page offers a "מסלול ירוק" of ₪10,000 to ₪60,000
 * up to 30 years against the home, for clients with a mortgage and a current
 * account there: the exception, not the market. Quoted as a fact beside the
 * cost-share note, never as a reason on its own.
 */
const BANK_AP_MIN = 40_000;
/**
 * FAIR_CREDIT — חוק אשראי הוגן (formerly חוק הסדרת הלוואות חוץ-בנקאיות,
 * התשנ"ג-1993), consolidated text https://he.wikisource.org/wiki/חוק_אשראי_הוגן
 * (research-nonbank-distress §4). It binds every lender to an individual,
 * secured loans included:
 *   · First Schedule (1): the actual cost of credit ("שיעור העלות הממשית של
 *     האשראי") may not exceed the BoI rate known at signing + 15 points a year.
 *     Cost = every "תוספת" over the amount actually received, linkage counted as
 *     interest ("ריבית או הפרשי הצמדה"), the lender's own fees included; the
 *     2019 exclusion regulations leave out only third-party costs (registry,
 *     appraisal, lawyer for a POA, insurance).
 *   · §15(ב)(1): the ceiling does not apply when the amount actually received
 *     exceeds ₪1,000,000 at the 2007 base, shown as ₪1,197,707.36 from 2014;
 *     later CPI updates are UNVERIFIED (a Tel Aviv court still used ₪1,197,707
 *     in case 848-06-23).
 *   · Second Schedule: arrears interest at most the ceiling × 1.2.
 * The engine measures each new non-bank tranche as an EFFECTIVE annual rate
 * (the stricter reading of "שנתי") with the lender's opening fee deducted from
 * the money received and the board's typed inflation as the linkage (how the
 * law treats unknown future CPI at signing is UNVERIFIED), and prices a grade
 * whose ladder rate would cross the ceiling AT the ceiling: a lender cannot
 * lawfully charge more.
 */
const FAIR_CREDIT_SPREAD = 15;
const FAIR_CREDIT_THRESHOLD = 1_197_707;
const FAIR_CREDIT_ARREARS = 1.2;
const FAIR_CREDIT_RULE = "חוק אשראי הוגן, התוספת הראשונה: העלות הממשית של האשראי, כולל עמלות המלווה והצמדה, עד ריבית בנק ישראל ועוד 15 נקודות האחוז בשנה";

/** The all-in cost of a level-payment loan as the law measures it: effective annual %, the fee off the money received, linkage as interest (the board's (1 + inflation/12)^month). */
export function allInCost(rate: number, months: number, fee: number, inflation: number): number {
  const r = rate / 1200;
  const n = Math.max(1, Math.round(months));
  const pmt = r === 0 ? 1 / n : r / (1 - Math.pow(1 + r, -n));
  const annuity = (j: number) => (Math.abs(j) < 1e-12 ? n : (1 - Math.pow(1 + j, -n)) / j);
  const target = (1 - fee) / pmt;
  let lo = -0.009;
  let hi = 0.2;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    if (annuity(mid) > target) lo = mid;
    else hi = mid;
  }
  const i = (1 + (lo + hi) / 2) * (1 + inflation / 1200) - 1;
  return (Math.pow(1 + i, 12) - 1) * 100;
}
/** The highest rate whose all-in cost stays within `ceiling`. */
function rateWithin(rate: number, months: number, fee: number, inflation: number, ceiling: number): number {
  if (allInCost(rate, months, fee, inflation) <= ceiling) return rate;
  let lo = 0;
  let hi = rate;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2;
    if (allInCost(mid, months, fee, inflation) <= ceiling) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo * 100) / 100;
}
/**
 * Second lien behind a bank mortgage. The first bank's consent: Directive 451
 * §19א — "תאגיד בנקאי לא יסרב סירוב בלתי סביר" to a second-rank pledge for
 * another lender, and answers within 7 days (https://boi.org.il/media/utld2tgp/451.pdf);
 * the fee is ₪150 at Mizrahi-Tefahot and at Discount, both marked supervised
 * (https://www.mizrahi-tefahot.co.il/mizmedia/mashkanta.pdf,
 * https://www.discountbank.co.il/media/0jmpy04u/small_part_3_31823.pdf);
 * other banks' figures are UNVERIFIED and taken as the same ₪150.
 */
const SECOND_LIEN_CONSENT = 150;
const SECOND_LIEN_CONDITION =
  "הסכמת הבנק למשכון מדרגה שנייה, שבנק אינו רשאי לסרב לה סירוב בלתי סביר ועליו להשיב תוך 7 ימים (הוראה 451 סעיף 19א), ואם הבנק מסרב הדרך היא מחזור המשכנתא כולה";
/**
 * PTI at a non-bank: no numeric rule binds it (CMA circular 2020-10-4 requires
 * underwriting on verified income net of registered debts, not on collateral);
 * Mimun Yashir underwrites above 45% (S&P Maalot), S&P scores DTI ≥ 45% at 1.8
 * times the default risk. The engine keeps the bank's 50% as its own guardrail.
 */
const NONBANK_PTI_RULE = "מדיניות התמהיל: עד 50% (על מלווה חוץ־בנקאי אין תקרה בחוק, וחוזר רשות שוק ההון 2020-10-4 מחייב חיתום לפי הכנסה)";
const FIRST_LIEN_CONDITION = "פירעון המשכנתא בבנק במלואה מכספי ההלוואה, ורישום שעבוד מדרגה ראשונה למלווה";

/** Bank age limit at the END of the loan — common practice is ~80; not a law. */
export const AGE_AT_END = 80;

/**
 * How much of each goal's cost is the WORST economy (the rest is the forecast):
 *   payment 0 (it minimises the payment; cost only breaks ties) · savings 0.25
 *   (the expected bill, hedged a little) · consolidate 0.25 · years 0.35 ·
 *   balanced 0.5 · stable 0.95 — the worst case, with 5% on the forecast to
 *   choose among equally robust mixes (and to keep the LP non-degenerate: an
 *   objective of the worst case alone made yalps cycle).
 */
const LAMBDA: Record<GoalId, number> = { payment: 0, years: 0.35, savings: 0.25, balanced: 0.5, stable: 0.95, consolidate: 0.25 };
/** A goal's λ: LAMBDA, unless a back-test's `tuning` sets it (types.ts Tuning). */
const lambdaOf = (ctx: Ctx, goal: GoalId) => ctx.input.tuning?.lambda?.[goal] ?? LAMBDA[goal];

/**
 * The economies every row is priced in: ECONOMIES, the same array, except
 * while buildAutoMix runs an input with `tuning` shocks or a base shift.
 */
let ECON: Economy[] = ECONOMIES;

const LABEL: Record<GoalId, string> = {
  payment: "החזר חודשי נמוך",
  years: "קיצור שנים",
  savings: "חיסכון מקסימלי",
  balanced: "מאוזן",
  stable: "יציבות מרבית",
  consolidate: "איחוד הלוואות",
};
const TAGLINE: Record<GoalId, string> = {
  payment: "ההחזר החודשי הנמוך ביותר שתמהיל תקין מגיע אליו, והמחיר שלו לאורך השנים",
  years: "החוב כולו נגמר מוקדם ככל האפשר, בהחזר של היום או עד 10% יותר כשזה מקצר בשנה לפחות",
  savings: "אותו החזר חודשי לכל היותר, והכי פחות כסף משולם בסך הכול",
  balanced: "גם הקלה בהחזר וגם חיסכון בסך הכול, בסיכון מתון",
  stable: "הכי פחות חשיפה לפריים ולמדד במסגרת ההחזר",
  consolidate: "המשכנתא נשארת כמות שהיא, ההלוואות הצרכניות מאוחדות להלוואה בביטחון הנכס",
};
const ORDER: GoalId[] = ["balanced", "payment", "years", "savings", "stable", "consolidate"];

const MIX_ID = "automix";
const AUTOMIX_SOURCE = "תמהיל אוטומטי";

/* ------------------------------------------------------------ helpers */

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const nis = (x: number) => `₪${Math.round(Math.abs(x)).toLocaleString("en-US")}`;
const signed = (x: number) => `${x < 0 ? "−" : "+"}${nis(x)}`;
const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`;
const yrs = (months: number) => {
  const y = months / 12;
  return Number.isInteger(y) ? `${y} שנים` : `${y.toFixed(1)} שנים`;
};
const TRACK_OF: Record<number, TrackKey> = { 1: "prime", 2: "klz", 3: "kz", 4: "mlz", 5: "mz" };
const isFixedPath = (p: number) => p === 2 || p === 3;
const isLinkedPath = (p: number) => p === 3 || p === 5;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function lenderKey(l: ImportedLoan) {
  const L = lenderOf(l.source_bank);
  return L.name || L.full || "?";
}
function debtLabel(l: ImportedLoan) {
  const t = TRACK_OF[Number(l.path_id)];
  const lender = lenderKey(l);
  return t ? `${lender}, ${TRACK_SHORT[t]}` : lender || "חוב";
}

/* ------------------------------------------------------------ pricing rows */

type Priced = {
  typedMonthly: number;
  typedInterest: number;
  typedPaid: number;
  typedPay: number[];
  /** Per economy (0 = forecast): payments and closing balances. */
  pay: number[][];
  bal: number[][];
  paid: number[];
  /** Present value of the forecast payments at the board's discount rate (0 without one). */
  pv: number;
  /** Highest regular payment per economy — a balloon's final lump excluded (findings name it). */
  peak: number[];
  /** Payments at the guard's sample months, per economy (EARLY in solve.ts). */
  early: number[][];
  /** Forecast position at each AHEAD month (solve.ts): paid through it plus the balance left. */
  ahead: number[];
};

/** Paid through month M plus the balance left at M, for each AHEAD month — the break-even gate's position. */
function aheadOf(pay: number[], bal: number[]): number[] {
  const out: number[] = [];
  let cum = 0;
  let j = 0;
  for (let m = 1; j < AHEAD.length; m++) {
    if (m <= pay.length) cum += pay[m - 1];
    if (m === AHEAD[j]) {
      out.push(cum + (m <= bal.length ? bal[m - 1] : 0));
      j++;
    }
  }
  return out;
}

/** A balloon (schedule 3/4) repays its principal in one last payment: that month is not a "monthly payment". */
const lumpMonth = (l: ImportedLoan) => {
  const sch = Number(l.amortization_schedule_id) || 1;
  return sch === 3 || sch === 4 ? Math.round(Number(l.months) || 0) : 0;
};

function priceRow(l: ImportedLoan, inflation: number, f: Forecast, discountRate?: number): Priced {
  const t = typedRow(l, inflation);
  const pay: number[][] = [];
  const bal: number[][] = [];
  for (const e of ECON) {
    const s = scheduleIn(l, f, e);
    pay.push(s.pay);
    bal.push(s.bal);
  }
  const typedPay = t.pay.slice();
  if (typedPay.length) typedPay[0] = t.monthly;
  return {
    typedMonthly: t.monthly,
    typedInterest: t.totalInterest,
    typedPaid: t.totalPaid,
    typedPay,
    pay,
    bal,
    paid: pay.map((p) => sum(p)),
    // As the board's outlook reads it: month one as quoted, the forecast after.
    pv: discountRate === undefined || !pay[0].length ? 0 : pvOf(pay[0].map((x, i) => (i === 0 ? t.monthly : x)), discountRate),
    // Month one as the board quotes it, the engine after that; no balloon lump.
    peak: pay.map((p) => {
      const lump = lumpMonth(l);
      let mx = p.length ? t.monthly : 0;
      for (let i = 1; i < p.length; i++) if (i + 1 !== lump && p[i] > mx) mx = p[i];
      return mx;
    }),
    early: pay.map((p) => EARLY.map((m) => (m === 1 ? (p.length ? t.monthly : 0) : m === lumpMonth(l) ? 0 : p[m - 1] ?? 0))),
    ahead: aheadOf(pay[0], bal[0]),
  };
}

/** The board's read-out for a set of rows, plus the forecast and stress views. */
type Book = {
  metrics: MixMetrics;
  /** Forecast & stress: unified payments and balances per economy. */
  pay: number[][];
  bal: number[][];
  /** The same payments without balloon lumps — what "highest monthly payment" reads. */
  regular: number[][];
  paid: number[];
};

function addInto(acc: number[], xs: number[]) {
  for (let i = 0; i < xs.length; i++) acc[i] = (acc[i] ?? 0) + xs[i];
}

function bookOf(rows: ImportedLoan[], input: AutoMixInput, f: Forecast): Book {
  const owed = owedOnly(rows);
  let balance = 0;
  let monthly = 0;
  let totalInterest = 0;
  let totalPaid = 0;
  let pricedBalance = 0;
  let rateW = 0;
  let months = 0;
  const typedPay: number[] = [];
  const typedRegular: number[] = [];
  const regular = ECON.map(() => [] as number[]);
  const pay = ECON.map(() => [] as number[]);
  const bal = ECON.map(() => [] as number[]);
  const byTrack = new Map<TrackKey, number>();
  const outlookPay: number[] = [];
  let outlookPaid = 0;
  let outlookPv = 0;
  const fEcon: Econ = { inflation: input.inflation, forecast: f };
  for (const l of owed) {
    const amount = Number(l.amount) || 0;
    // Exactly the `totals` memo in Simulator.tsx: every owed row, rounded per row.
    balance += Math.round(amount);
    const p = priceRow(l, input.inflation, f);
    monthly += p.typedMonthly;
    totalInterest += p.typedInterest;
    totalPaid += p.typedPaid;
    addInto(typedPay, p.typedPay);
    const lump = lumpMonth(l);
    addInto(typedRegular, lump ? p.typedPay.map((x, i) => (i + 1 === lump ? 0 : x)) : p.typedPay);
    p.pay.forEach((x, k) => addInto(pay[k], x));
    p.pay.forEach((x, k) => addInto(regular[k], lump ? x.map((y, i) => (i + 1 === lump ? 0 : y)) : x));
    p.bal.forEach((x, k) => addInto(bal[k], x));
    if (Number(l.months) > 0 && amount > 0) {
      pricedBalance += amount;
      rateW += amount * (Number(l.rate) || 0);
      months = Math.max(months, Math.round(Number(l.months)));
      const t = TRACK_OF[Number(l.path_id)];
      if (t) byTrack.set(t, (byTrack.get(t) ?? 0) + amount);
      if (input.forecastOn) {
        const fr = priceLoan(l, fEcon);
        const first = Math.round(p.typedMonthly);
        const lumpAt = lumpMonth(l);
        const series = fr.schedule.map((x, i) => (i === 0 ? first : i + 1 === lumpAt ? 0 : x.payment));
        addInto(outlookPay, series);
        outlookPv += pvOf(fr.schedule.map((x, i) => (i === 0 ? first : x.payment)), input.discountRate);
        outlookPaid += fr.totalPaid;
      }
    }
  }
  const shares: TrackShare[] = Array.from(byTrack.entries())
    .map(([track, amount]) => ({ track, amount: Math.round(amount), share: pricedBalance ? amount / pricedBalance : 0 }))
    .sort((a, b) => b.amount - a.amount);
  const shareOf = (pred: (t: TrackKey) => boolean) => sum(shares.filter((s) => pred(s.track)).map((s) => s.amount)) / (pricedBalance || 1);
  const metrics: MixMetrics = {
    balance,
    monthly,
    // The highest REGULAR payment: a balloon's final lump is a repayment of
    // principal the findings name, not a monthly payment.
    peakMonthly: typedRegular.length ? Math.max(...typedRegular) : 0,
    months,
    totalPaid,
    totalCost: totalPaid - pricedBalance,
    totalInterest,
    pv: pvOf(typedPay, input.discountRate),
    avgRate: pricedBalance ? rateW / pricedBalance : 0,
    shares,
    fixedShare: shareOf((t) => t === "klz" || t === "kz"),
    linkedShare: shareOf((t) => t === "kz" || t === "mz"),
    outlook: input.forecastOn
      ? {
          peakMonthly: outlookPay.length ? Math.max(...outlookPay) : 0,
          totalPaid: outlookPaid,
          totalCost: outlookPaid - pricedBalance,
          pv: outlookPv,
        }
      : null,
  };
  return { metrics, pay, bal, regular, paid: pay.map((p) => sum(p)) };
}

/* ------------------------------------------------------------ new money */

type Pricing = {
  tier: TierInfo;
  rate: (track: TrackKey, years: number, segment: Segment) => { rate: number; anchor: number | null; margin: number | null };
  /** Non-bank only: some ladder price was cut to the Fair Credit ceiling. */
  capped?: boolean;
};

function pricingFor(
  m: MarketSnapshot,
  f: Forecast,
  input: AutoMixInput,
  tier: TierInfo,
  lien: "first" | "second" = "first",
  bank: BankId = input.profile.bank,
  extra: Partial<Record<TrackKey, number>> = {}
): Pricing {
  const opt = { bank, discount: input.profile.negotiated || 0 };
  // Fixed tracks at the BoI's own average for the term (fees.ts newFixedRate);
  // the bank's difference, the purpose premium and the negotiated discount stay
  // as newRate adds them. Variable tracks: anchor + margin, as before. `extra`
  // is a per-track shift (the client's own record at their bank, see prepare).
  // The fixed tracks' level: the Supervisor's housing average for the track
  // (TamInt010, the same source as every other track's level), at the month's
  // average term for ק"צ and the snapshot's reference term for קל"צ, whose
  // average term no BoI series states (fees.ts newFixedRate says why).
  const avg = m.housing?.avg;
  const levelOf = (track: "klz" | "kz") =>
    avg && Number.isFinite(avg[track]) ? { rate: avg[track], months: Math.round(12 * (track === "kz" ? avg.kzTermYears : avg.klzRefTermYears)) } : null;
  const quote = (track: TrackKey, years: number, segment: Segment) => {
    const p = newRate(m, f, track, years * 12, segment, opt);
    const shift = extra[track] ?? 0;
    if (track !== "klz" && track !== "kz") return shift ? { ...p, rate: p.rate + shift, margin: p.margin === null ? null : p.margin + shift } : p;
    const base = newRate(m, f, track, years * 12, "housing", { bank: "system", discount: 0 }).rate;
    return { ...p, rate: newFixedRate(track === "kz", years * 12, levelOf(track)).rate + (p.rate - base) + shift };
  };
  const bankRate = (track: TrackKey, years: number, segment: Segment) => {
    const p = quote(track, years, segment);
    if (tier.tier !== "bankPremium") return p;
    // The borrower's premium applies to housing money. All-purpose money is
    // priced at the dearer of the product (market all-purpose) and the
    // borrower (housing + their premium) — a risk premium and a purpose premium
    // are two prices for the same risk, not a sum (r04's file: housing at P+2.25,
    // unsecured loans at P+1.75…P+3).
    const h = quote(track, years, "housing");
    const withPremium = h.rate + tier.premium;
    const rate = segment === "housing" ? withPremium : Math.max(p.rate, withPremium);
    const shift = rate - p.rate;
    return { rate, anchor: p.anchor, margin: p.margin === null ? null : p.margin + shift };
  };
  const ceiling = m.boi.rate + FAIR_CREDIT_SPREAD;
  const out: Pricing = {
    tier,
    rate(track, years, segment) {
      if (tier.tier === "nonbank") {
        // The non-bank ladder (tiers.ts LADDER): by the client's grade, dearer
        // behind a first lien, and never above the Fair Credit ceiling.
        const g = LADDER[tier.grade];
        const add = lien === "second" ? g.secondLien : 0;
        const within = (rate: number, linked: boolean) => {
          const r = rateWithin(rate, years * 12, g.openingFee, linked ? input.inflation : 0, ceiling);
          if (r < rate) out.capped = true;
          return r;
        };
        if (track === "prime") {
          const rate = within(m.boi.prime + g.primeMargin + add, false);
          return { rate, anchor: m.boi.prime, margin: rate - m.boi.prime };
        }
        if (track === "kz") return { rate: within(g.kzRate + add, true), anchor: null, margin: null };
      }
      return bankRate(track, years, segment);
    },
  };
  return out;
}

/** A new tranche as a board row. */
function trancheRow(track: TrackKey, years: number, segment: Segment, amount: number, price: { rate: number; anchor: number | null; margin: number | null }, id: string): ImportedLoan {
  const bond = track === "mlz" || track === "mz";
  const end = toIso(addMonths(startOfToday(), years * 12));
  return {
    id,
    mix_id: MIX_ID,
    path_id: TRACK_PATH[track],
    amount,
    rate: round2(price.rate),
    months: years * 12,
    amortization_schedule_id: 1,
    grace_type_id: 1,
    grace_months: 0,
    group: segment === "allPurpose" ? "loan" : "mortgage",
    purpose: segment === "allPurpose" ? "refi_any" : "refi_housing",
    anchor: bond || track === "prime" ? round2(price.anchor ?? 0) : null,
    anchor_margin: price.margin === null ? null : round2(price.margin),
    anchor_interval: bond ? RESET_MONTHS : null,
    change_frequency: bond ? freqLabel(RESET_MONTHS) : track === "prime" ? FREQ_PRIME : FREQ_FIXED,
    reset_fresh: true,
    loan_end_date: end,
    end_date: end,
    source_type: AUTOMIX_SOURCE,
  } as ImportedLoan;
}

const PROBE = 1_000_000;

function columnsFor(pr: Pricing, input: AutoMixInput, f: Forecast, maxYears: number, apYears: number, segments: Segment[]): (Column & { price: ReturnType<Pricing["rate"]> })[] {
  const out: (Column & { price: ReturnType<Pricing["rate"]> })[] = [];
  for (const segment of segments)
    for (const track of TRACKS) {
      if (!pr.tier.tracks.includes(track)) continue;
      // All-purpose money: prime and קל"צ — the menu the BoI's own all-purpose
      // data shows banks selling most (n12b: variable unlinked + fixed unlinked
      // are ~85% of 10/2026 volume); a CPI-linked consumer loan is not advised.
      if (segment === "allPurpose" && track !== "prime" && track !== "klz" && !(pr.tier.tier === "nonbank" && track === "kz")) continue;
      const top = segment === "allPurpose" ? apYears : maxYears;
      for (let y = MIN_YEARS[track]; y <= top; y++) {
        const price = pr.rate(track, y, segment);
        const row = trancheRow(track, y, segment, PROBE, price, `probe-${track}-${segment}-${y}`);
        const p = priceRow(row, input.inflation, f, input.discountRate);
        out.push({
          key: `${track}|${segment}|${y}`,
          track,
          segment,
          years: y,
          monthly: p.typedMonthly / PROBE,
          paid: p.paid.map((x) => x / PROBE),
          typedPaid: p.typedPaid / PROBE,
          pv: p.pv / PROBE,
          typedInterest: p.typedInterest / PROBE,
          peak: p.peak.map((x) => x / PROBE),
          early: p.early.map((e) => e.map((x) => x / PROBE)),
          ahead: p.ahead.map((x) => x / PROBE),
          fRate: irrOf(p.pay[0], PROBE) ?? undefined,
          price,
        });
      }
    }
  return out;
}

/* ------------------------------------------------------------ the debts */

type Debt = SolverDebt & {
  row: ImportedLoan;
  label: string;
  rate: number;
  path: number;
  zak: boolean;
  interestOnly: boolean;
  feeEstimated: boolean;
  feeBasis: string;
  cpiAveraging: number;
  /** An estimated fee's likely range, ₪ (fees.ts FEE_BAND): the break-even gate is tested at both ends. */
  feeBand?: { low: number; high: number };
  priced: Priced;
  /** A debt due now (override): what it is in the document. */
  due?: DueDebt;
  /** A row in the mix in serious arrears (90+ days or legal hands): its lender is calling it (override). */
  called?: boolean;
};

/** A debt due now, as a debt the solver must clear: nothing paid on it today, nothing priced. */
function dueDebtOf(d: DueDebt, row: ImportedLoan | null): Debt {
  const zeros = ECON.map(() => 0);
  const placeholder = row ?? ({ id: d.id, mix_id: MIX_ID, path_id: 2, amount: d.balance, rate: 0, months: 0, amortization_schedule_id: 1, grace_type_id: 1, grace_months: 0, group: "loan" } as ImportedLoan);
  return {
    id: d.id,
    group: "loan",
    segment: "allPurpose",
    lender: d.label,
    balance: d.balance,
    fee: 0,
    months: 0,
    fixed: false,
    linked: false,
    monthly: 0,
    paid: zeros,
    typedPaid: 0,
    typedInterest: 0,
    peak: zeros,
    early: ECON.map(() => EARLY.map(() => 0)),
    ahead: AHEAD.map(() => 0),
    lock: null,
    forced: true,
    row: placeholder,
    label: d.label,
    rate: Number(row?.rate) || 0,
    path: Number(row?.path_id) || 2,
    zak: false,
    interestOnly: false,
    feeEstimated: false,
    feeBasis: "חוב לפירעון מיידי",
    cpiAveraging: 0,
    priced: { typedMonthly: 0, typedInterest: 0, typedPaid: 0, typedPay: [], pay: ECON.map(() => []), bal: ECON.map(() => []), paid: zeros, pv: 0, peak: zeros, early: ECON.map(() => EARLY.map(() => 0)), ahead: AHEAD.map(() => 0) },
    due: d,
  };
}

/**
 * Bank Hapoalim prints one "עמלת פירעון מוקדם" per loan with the 0.1% notice fee
 * inside it (on every prime loan it is exactly 0.1% of the balance, 8 of 8 in
 * the fee study), and the parser shares that total among the loan's parts by
 * balance, so each part carries 0.1% of its own balance of it. The notice fee is
 * avoided by ten days' notice and is not charged at all on the part the same
 * bank refinances (fee order §3(2)), so it is not a cost of the move (audit P4:
 * ₪294 on ₪294,118 charged as a fee while the caveat called it avoidable).
 */
const NOTICE_FEE = 0.001;
const NOTICE_INSIDE = /^הפועלים$/;

function debtsOf(master: ImportedLoan[], input: AutoMixInput, f: Forecast, skipped: AutoMixResult["skipped"]): Debt[] {
  const out: Debt[] = [];
  for (const l of owedOnly(master)) {
    const amount = Number(l.amount) || 0;
    const months = Math.round(Number(l.months) || 0);
    const label = debtLabel(l);
    if (amount <= 0) continue;
    if (months <= 0) {
      // Under the override a debt past its due date is in the picture as debt due now (prepare).
      if (input.profile.override) continue;
      skipped.push({ id: l.id, label, why: "חוב שמועד פירעונו חלף ואין לו תקופה, ולכן אי אפשר לתמחר אותו. צריך להסדיר אותו מול המלווה." });
      continue;
    }
    const path = Number(l.path_id);
    const group = l.group === "loan" ? "loan" : "mortgage";
    const priced = priceRow(l, input.inflation, f, input.discountRate);
    const zak = !!l.source_eligibility;
    const sched = Number(l.amortization_schedule_id) || 1;
    let lock: string | null = null;
    if (zak) lock = "הלוואת זכאות, בריבית מסובסדת בחוק וללא עמלת פירעון, ומחזור מבטל את הזכאות";
    else if (!(Number(l.rate) > 0) && !(Number(l.source_monthly) > 0)) lock = "הריבית וההחזר לא דווחו, ואין על מה לבסס החלטה";
    else if (!(Number(l.rate) > 0)) lock = "הריבית לא דווחה בדוח, ולכן נשארת עד שתתקבל";
    // Fees: by the fee order on anything secured by a home; consumer loans are not estimated.
    let fee = 0;
    let feeEstimated = false;
    let feeBasis = "";
    let cpiAveraging = 0;
    let feeBand: { low: number; high: number } | undefined;
    if (group === "mortgage") {
      const q = prepaymentFee(l);
      fee = q.fee;
      feeEstimated = q.estimated;
      feeBasis = q.basis;
      cpiAveraging = q.cpiAveraging;
      feeBand = q.band;
      if (!q.estimated && q.fee > 0 && NOTICE_INSIDE.test(lenderKey(l))) {
        fee = Math.max(0, Math.round(q.fee - NOTICE_FEE * amount));
        feeBasis = `${q.basis}, בלי עמלת אי ההודעה (0.1% מהיתרה) שהבנק כולל בסכום ושאינה נגבית בהודעה מוקדמת`;
      }
    } else if (Number(l.prepayment_fee) > 0) {
      fee = Math.round(Number(l.prepayment_fee));
      feeBasis = "עמלת פירעון כפי שנמסרה";
    } else {
      feeEstimated = !(path === 1 || path === 4 || path === 5);
      feeBasis = feeEstimated ? "עמלת פירעון מוקדם בהלוואה צרכנית בריבית קבועה לא הוערכה, ויש לבקש מכתב יתרה" : "ריבית משתנה, עמלת פירעון זניחה";
    }
    out.push({
      id: l.id,
      group,
      segment: group === "loan" || isAllPurpose(l) ? "allPurpose" : "housing",
      lender: lenderKey(l),
      balance: amount,
      fee,
      months,
      fixed: isFixedPath(path),
      linked: isLinkedPath(path),
      monthly: priced.typedMonthly,
      paid: priced.paid,
      typedPaid: priced.typedPaid,
      typedInterest: priced.typedInterest,
      pv: priced.pv,
      peak: priced.peak,
      early: priced.early,
      ahead: priced.ahead,
      lock,
      row: l,
      label,
      rate: Number(l.rate) || 0,
      path,
      zak,
      interestOnly: sched === 3 || sched === 4,
      feeEstimated,
      feeBasis,
      cpiAveraging,
      ...(feeBand ? { feeBand } : {}),
      priced,
    });
  }
  return out;
}

/* ------------------------------------------------------------ building a proposal */

type Ctx = {
  input: AutoMixInput;
  f: Forecast;
  market: MarketSnapshot;
  debts: Debt[];
  cols: (Column & { price: ReturnType<Pricing["rate"]> })[];
  pricing: Pricing;
  today: Book;
  budget: number;
  base: Spec;
  maxYears: number;
  apYears: number;
  propertyValue: number | null;
  valueSource: string | null;
  collateral: boolean;
  moveWhole: boolean;
  /**
   * Whose prices the new money carries. A partial refinance is done at the bank
   * that holds the mortgage (no other bank takes a second lien behind it), so it
   * is priced at THAT bank's rates; moving the whole mortgage can shop every bank
   * and is priced at the system average; a bank the advisor picked is its own.
   */
  priceBank: BankId;
  /** The single bank that holds the mortgage today, when there is one (BankId). */
  incumbent: BankId | null;
  /**
   * What the new money's price rests on: the bank the advisor picked; the
   * incumbent's published difference; the client's own (lower) record there;
   * the system plus the client's premium; or the system average (a move).
   */
  priceBasis: "picked" | "incumbent" | "record" | "premium" | "system";
  /** Per-track shift over the system average the internal refinance is priced at. */
  priceExtra: Partial<Record<TrackKey, number>>;
  blocked: string | null;
  /** The client's condition (condition.ts). */
  cond: Condition;
  override: boolean;
  /**
   * "Today, honestly": the reference every goal is measured against. Without
   * debt due now it IS today's read-out. With it (override), today's החזר חודשי
   * leaves out debt nobody is paying, so the reference adds the least monthly
   * payment that can carry it (`carry`) and its balance to everything still to
   * be paid — no goal can promise relief that is only the unpaid debt.
   */
  ref: { monthly: number; paid: number; typedPaid: number; typedCost: number; months: number; worst: number; due: number; carry: number; carryYears: number; carryRate?: number; book: Book | null; pv?: number | null };
  /**
   * The structure this context prices: a bank (an internal refinance at the bank
   * that holds the mortgage, or the bank the advisor picked), the whole mortgage
   * moved to another bank, or a non-bank lender on the first or the second lien.
   */
  variant: Variant;
  /** Debts CHEAP_KEEP holds in this structure, and by how many points they are under new money. */
  cheapBy: Map<string, number>;
};

/**
 * A debt the client KEEPS, as a row of the proposal: the board's own copy of the
 * master row, plus the payment the document prints. foldMasterRow drops that
 * figure on purpose (fa2638b: a duplicated mortgage is a mortgage being priced,
 * as SmartNPV prices its שכפול), but a kept debt is not re-priced: it goes on
 * exactly as today, so its החזר is the printed one — and it is the figure the
 * solver budgets with (debtsOf prices the master row). Without it the read-out
 * of a kept row moved (r06: a loan printed at ₪665 read ₪971) and nine budget
 * goals on the real reports went over budget by ₪7 to ₪126.
 */
export function keptRow(l: ImportedLoan, id: string): ImportedLoan {
  return {
    ...foldMasterRow(l, false, MIX_ID),
    ...(l.source_monthly != null ? { source_monthly: l.source_monthly, source_monthly_basis: l.source_monthly_basis } : {}),
    id,
  };
}

/** Plan → board rows, the money balanced per segment to the shekel. */
function rowsOf(ctx: Ctx, plan: Plan): { rows: ImportedLoan[]; tranches: NewTranche[] } {
  const rows: ImportedLoan[] = [];
  let n = 0;
  const refi = new Set(plan.refinance);
  for (const d of ctx.debts) if (!refi.has(d.id)) rows.push(keptRow(d.row, `keep-${++n}`));
  // Owed rows the engine could not use (no term) stay on the board as they are.
  for (const l of owedOnly(ctx.input.master))
    if (!ctx.debts.some((d) => d.id === l.id) && (Number(l.amount) || 0) > 0) rows.push(keptRow(l, `keep-${++n}`));
  // Guarantees travel with the mix, as the board's own copy of the master does:
  // shown in their section, never in a total (owedOnly).
  for (const l of ctx.input.master) if (l.is_guarantor) rows.push(keptRow(l, `keep-${++n}`));
  const tranches: NewTranche[] = [];
  const byKey = new Map(ctx.cols.map((c) => [c.key, c]));
  for (const seg of ["housing", "allPurpose"] as Segment[]) {
    const need =
      sum(ctx.debts.filter((d) => refi.has(d.id) && d.segment === seg).map((d) => d.balance + d.fee)) +
      (seg === "allPurpose" ? sum(ctx.debts.filter((d) => !refi.has(d.id) && !d.forced).map((d) => d.cure ?? 0)) : 0) +
      (seg === "housing" ? plan.setupHousing : plan.setupAp);
    const parts = Object.entries(plan.amounts)
      .map(([k, a]) => ({ c: byKey.get(k)!, a }))
      .filter((p) => p.c.segment === seg)
      .sort((x, y) => TRACKS.indexOf(x.c.track) - TRACKS.indexOf(y.c.track));
    if (!parts.length) continue;
    // Every tranche but one is rounded DOWN to ₪1,000 and the remainder goes to
    // the tranche with the lowest payment per shekel — so rounding can only
    // lower the month-one payment the solver promised, never raise it.
    const total = Math.round(need);
    const FIX = (t: TrackKey) => t === "klz" || t === "kz";
    const LNK = (t: TrackKey) => t === "kz" || t === "mz";
    const bankLaw = ctx.pricing.tier.tier !== "nonbank";
    // Every limit the solver held, re-tested on the rounded amounts: 329 §7 on
    // this segment (law, exact); the fixed share of ALL the property's credit
    // (§9, law, exact); one track's share of the housing money and the CPI
    // thirds (the engine's own guardrails, ₪1,000 rounding may cross them by a
    // few hundred shekels). The other segment is taken at the solver's amounts.
    const other = Object.entries(plan.amounts)
      .map(([k, a]) => ({ c: byKey.get(k)!, a }))
      .filter((p) => p.c.segment !== seg);
    const keptMort = ctx.debts.filter((d) => d.group === "mortgage" && !refi.has(d.id));
    const sec = ctx.base.secured ?? { balance: 0, fixed: 0, linked: 0 };
    const keptBal = sum(keptMort.map((d) => d.balance)) + sec.balance + sum(other.map((p) => p.a));
    const keptFixed = sum(keptMort.filter((d) => d.fixed).map((d) => d.balance)) + sec.fixed + sum(other.filter((p) => FIX(p.c.track)).map((p) => p.a));
    const keptLinked = sum(keptMort.filter((d) => d.linked).map((d) => d.balance)) + sec.linked + sum(other.filter((p) => LNK(p.c.track)).map((p) => p.a));
    const phi = Math.min(FIXED_MIN, ctx.base.fixedToday);
    const psi = Math.max(LINKED_MAX, ctx.base.linkedToday);
    // The share cap held in the solve (every goal but stable) shows in its amounts.
    const capOf = (N: number) => TRACK_SHARE_MAX * N + (1 - TRACK_SHARE_MAX) * 2 * MIN_TRANCHE;
    const shareCapOn = parts.every((p) => p.a <= capOf(sum(parts.map((x) => x.a))) + 1);
    const attempt = (absorber: (typeof parts)[number], up: (t: TrackKey) => boolean) => {
      let used = 0;
      const amt = new Map<string, number>();
      for (const p of parts) {
        if (p === absorber) continue;
        const a = Math.max(MIN_TRANCHE, (up(p.c.track) ? Math.ceil : Math.floor)(p.a / 1000) * 1000);
        amt.set(p.c.key, a);
        used += a;
      }
      amt.set(absorber.c.key, total - used);
      const of = (pred: (t: TrackKey) => boolean) => sum(parts.filter((p) => pred(p.c.track)).map((p) => amt.get(p.c.key)!));
      const share = (pred: (t: TrackKey) => boolean) => of(pred) / total;
      const allBal = keptBal + total;
      const law =
        amt.get(absorber.c.key)! >= (parts.length > 1 ? MIN_TRANCHE : 1) &&
        (!bankLaw || (share(FIX) >= FIXED_MIN - 1e-9 && keptFixed + of(FIX) >= phi * allBal - SHARE_SLACK));
      const guard = (tol: number) =>
        (seg === "allPurpose" || share(LNK) <= LINKED_MAX + tol) &&
        keptLinked + of(LNK) <= psi * allBal + SHARE_SLACK + tol * allBal &&
        (seg === "allPurpose" || !shareCapOn || parts.every((p) => amt.get(p.c.key)! <= capOf(total) + tol * total));
      // Rounding may not raise the month-one payment the solver promised (the
      // budget holds on the board's read-out): an absorber dearer per shekel than
      // the cheapest may only be used where the payment does not rise.
      const pay = (f: (p: (typeof parts)[number]) => number) => sum(parts.map((p) => f(p) * p.c.monthly));
      const noRise = pay((p) => amt.get(p.c.key)!) <= pay((p) => p.a) + 0.5;
      return { amt, ok: law && guard(1e-9) && noRise, loose: law && guard(0.004) && noRise };
    };
    const byMonthly = [...parts].sort((x, y) => x.c.monthly - y.c.monthly);
    const cheapest = byMonthly[0];
    const fixedAbsorber = byMonthly.filter((p) => FIX(p.c.track))[0];
    const unlinkedAbsorber = byMonthly.filter((p) => !LNK(p.c.track))[0];
    const tries = [
      attempt(cheapest, () => false),
      attempt(cheapest, (t) => FIX(t) && !LNK(t)),
      ...(fixedAbsorber ? [attempt(fixedAbsorber, () => false)] : []),
      ...(unlinkedAbsorber ? [attempt(unlinkedAbsorber, FIX)] : []),
    ];
    // Still nothing: every tranche as the absorber, with every rounding direction.
    if (!tries.some((t) => t.ok))
      for (const ab of byMonthly) for (const up of [() => false, FIX, (t: TrackKey) => !LNK(t), (t: TrackKey) => FIX(t) && !LNK(t), () => true]) tries.push(attempt(ab, up));
    const amt = (tries.find((t) => t.ok) ?? tries.find((t) => t.loose) ?? tries[0]).amt;
    for (const p of parts) {
      const a = amt.get(p.c.key)!;
      if (a <= 0) continue;
      const row = trancheRow(p.c.track, p.c.years, seg, a, p.c.price, `new-${++n}`);
      rows.push(row);
      const tm = typedRow(row, ctx.input.inflation).monthly;
      tranches.push({ track: p.c.track, segment: seg, amount: a, years: p.c.years, rate: Number(row.rate), monthly: tm });
    }
  }
  return { rows, tranches };
}

/**
 * The first month from which the client is ahead and stays ahead, if they
 * closed everything that month: cumulative (old − new payments) + (old − new
 * outstanding balance) ≥ 0. Costs are financed, so the new balance starts
 * higher by them. 0 = ahead from the first month ("מיידי"); null = never.
 * Relief bought by a longer term does not count as being ahead: the balance
 * falls more slowly, and the measure sees it.
 */
function breakEven(today: Book, prop: Book, switchCost: number): number | null {
  if (switchCost <= 0) return 0;
  const a = today.pay[0];
  const b = prop.pay[0];
  const ba = today.bal[0];
  const bb = prop.bal[0];
  const n = Math.max(a.length, b.length);
  let cum = 0;
  let hit: number | null = null;
  for (let m = 0; m < n; m++) {
    cum += (a[m] ?? 0) - (b[m] ?? 0);
    const d = cum + (ba[m] ?? 0) - (bb[m] ?? 0);
    if (d >= 0 && hit === null) hit = m + 1;
    if (d < 0) hit = null;
  }
  return hit === 1 ? 0 : hit;
}

function checksOf(ctx: Ctx, rows: ImportedLoan[], plan: Plan, metrics: MixMetrics, goal: GoalId, ceiling: number = ctx.budget): Check[] {
  const out: Check[] = [];
  const owed = owedOnly(rows);
  const fresh = owed.filter((r) => r.source_type === AUTOMIX_SOURCE);
  const freshH = fresh.filter((r) => r.group !== "loan");
  const freshAp = fresh.filter((r) => r.group === "loan");
  const amt = (rs: ImportedLoan[]) => sum(rs.map((r) => Number(r.amount) || 0));
  const fixedOf = (rs: ImportedLoan[]) => amt(rs.filter((r) => isFixedPath(Number(r.path_id))));
  const nonbankLaw = ctx.pricing.tier.tier === "nonbank";
  if (nonbankLaw && fresh.length) {
    // The law that binds a non-bank lender: the Fair Credit Law's cost ceiling,
    // on the all-in cost (fee and linkage in), up to the amount threshold.
    const ceiling = ctx.market.boi.rate + FAIR_CREDIT_SPREAD;
    const fee = ctx.pricing.tier.openingFee;
    const top = Math.max(...fresh.map((r) => allInCost(Number(r.rate) || 0, Number(r.months) || 0, fee, isLinkedPath(Number(r.path_id)) ? ctx.input.inflation : 0)));
    const received = amt(fresh) * (1 - fee);
    const binds = received <= FAIR_CREDIT_THRESHOLD;
    out.push({
      label: "תקרת העלות בחוק אשראי הוגן",
      ok: !binds || top <= ceiling + 0.005,
      value: `${top.toFixed(2)}% מתוך ${ceiling.toFixed(2)}%${binds ? "" : `, התקרה אינה חלה מעל ${nis(FAIR_CREDIT_THRESHOLD)}`}${ctx.pricing.capped ? ", מחיר הדרגה נעצר בתקרה" : ""}`,
      rule: FAIR_CREDIT_RULE,
    });
  }
  for (const [label, rs] of (nonbankLaw ? [] : [["שליש בריבית קבועה, דיור", freshH], ["שליש בריבית קבועה, כל מטרה", freshAp]]) as [string, ImportedLoan[]][]) {
    if (!rs.length) continue;
    const share = fixedOf(rs) / amt(rs);
    out.push({ label, ok: share >= FIXED_MIN - 0.005, value: pct(share), rule: RULE.fixed });
  }
  const secured = owed.filter((r) => r.group !== "loan" || r.source_type === AUTOMIX_SOURCE);
  if (fresh.length && secured.length && !nonbankLaw) {
    const share = fixedOf(secured) / amt(secured);
    const before = ctx.base.fixedToday;
    out.push({
      label: "ריבית קבועה בכל האשראי בנכס",
      ok: share >= Math.min(FIXED_MIN, before) - 0.005,
      value: `${pct(share)} (היום ${pct(before)})`,
      rule: RULE.fixedAll,
    });
  }
  if (freshH.length) {
    const linked = amt(freshH.filter((r) => isLinkedPath(Number(r.path_id)))) / amt(freshH);
    out.push({ label: "חשיפה למדד בכסף החדש", ok: linked <= LINKED_MAX + 0.005, value: pct(linked), rule: "מדיניות התמהיל: צמוד מדד עד שליש (בשוק כ-10% מהאשראי החדש, לפי בנק ישראל)" });
  }
  const longest = Math.max(0, ...fresh.map((r) => Number(r.months) || 0));
  if (fresh.length) {
    out.push({ label: "תקופה", ok: longest <= TERM_MAX_YEARS * 12, value: yrs(longest), rule: RULE.term });
    if (ctx.input.profile.age) {
      const end = ctx.input.profile.age + longest / 12;
      const over = end > AGE_AT_END + 0.01;
      // Practice, not law: the override lifts it, and the check says so instead of failing.
      out.push({
        label: "גיל בסיום ההלוואה",
        ok: !over || ctx.override,
        value: `${Math.round(end)}${over && ctx.override ? `, מעל ${AGE_AT_END} ונבנה למרות הנוהג` : ""}`,
        rule: `נוהג הבנקים, עד גיל ${AGE_AT_END} בסיום ההלוואה (לא חוק)`,
      });
    }
  }
  if (goal !== "payment")
    out.push({
      label: "החזר חודשי במסגרת",
      ok: metrics.monthly <= ceiling + 0.5,
      value: `${nis(metrics.monthly)} מתוך ${nis(ceiling)}`,
      rule: ceiling > ctx.budget + 0.5 ? `המסגרת לקיצור שנים: ההחזר של היום ועוד עד ${Math.round(YEARS_STRETCH * 100)}%` : "המסגרת שנקבעה לתמהיל",
    });
  const income = ctx.input.profile.income;
  if (income && income > 0) {
    const housing = sum(owed.filter((r) => r.group !== "loan" || r.source_type === AUTOMIX_SOURCE).map((r) => typedRow(r, ctx.input.inflation).monthly));
    out.push({
      label: "שיעור החזר מהכנסה",
      ok: housing / income <= PTI_MAX + 0.002,
      value: `${pct(housing / income)}${housing / income > PTI_RISK && !nonbankLaw ? " (מעל 40%, משקל סיכון 100%)" : ""}`,
      rule: nonbankLaw ? NONBANK_PTI_RULE : RULE.pti,
    });
  }
  if (ctx.propertyValue && nonbankLaw) {
    const total = amt(secured);
    const cap = ctx.variant === "secondLien" ? NONBANK_LTV.combined : NONBANK_LTV.first;
    out.push({
      label: ctx.variant === "secondLien" ? "שיעור מימון, שעבוד ראשון ושני" : "שיעור מימון, שעבוד ראשון",
      ok: total / ctx.propertyValue <= cap + 0.005,
      value: pct(total / ctx.propertyValue),
      rule: `מדיניות המלווה החוץ־בנקאי: עד ${pct(cap)} (${ctx.valueSource})`,
    });
  }
  if (ctx.propertyValue && !nonbankLaw) {
    const housing = amt(owed.filter((r) => r.group !== "loan"));
    const total = amt(secured);
    out.push({ label: "שיעור מימון, דיור", ok: housing / ctx.propertyValue <= LTV_MAX[ctx.input.profile.propertyType] + 0.005, value: pct(housing / ctx.propertyValue), rule: `${RULE.ltv} עד ${pct(LTV_MAX[ctx.input.profile.propertyType])} (${ctx.valueSource})` });
    if (freshAp.length) {
      const cap = Math.min(AP_LTV_RELIEF, AP_LTV + AP_RELIEF_CAP / ctx.propertyValue);
      out.push({ label: "שיעור מימון, כולל כל מטרה", ok: total / ctx.propertyValue <= cap + 0.005, value: pct(total / ctx.propertyValue), rule: RULE.ap });
    }
  }
  void plan;
  return out;
}

function stressOf(today: Book, prop: Book): StressRow[] {
  return ECON.map((e, k) => ({
    id: e.id,
    label: e.label,
    peakMonthly: Math.round(Math.max(0, ...prop.regular[k])),
    totalPaid: Math.round(prop.paid[k]),
    todayPeakMonthly: Math.round(Math.max(0, ...today.regular[k])),
    todayTotalPaid: Math.round(today.paid[k]),
  }));
}

/* ------------------------------------------------------------ goals */

/** Every final answer joins the pool the next solves start from (solve.ts Seed). */
let POOL: Seed[] = [];
function addToPool(p: Plan, cols: Column[]) {
  const seed = { refinance: p.refinance.slice().sort(), terms: termsOf(p, cols) };
  const key = JSON.stringify(seed);
  if (!POOL.some((x) => JSON.stringify(x) === key)) POOL.push(seed);
}
function solveTerms(debts: SolverDebt[], cols: Column[], s: Spec): Plan {
  const p = solveTermsRaw(debts, cols, s, POOL);
  if (p.ok) addToPool(p, cols);
  return p;
}

/** A goal's answer, with the exact problem it answered (the polish pass re-solves it). */
type Solved = {
  plan: Plan;
  note?: string;
  meta?: Record<string, number | string>;
  spec?: Spec;
  cols?: Column[];
  /** The structure (context) it was solved in. */
  ctx?: Ctx;
  /** The best answer of the other structure, for the "why this structure" reason. */
  alt?: Solved;
  /** The other structure exists but had no answer. */
  altMissing?: Variant;
  /** The missing structure's lowest monthly payment, when it has one. */
  altFloor?: number;
  /** The five-year guard the solve held (payment, balanced, years). */
  guard?: Guard;
  /** The gates were held in the solve after its first answer failed one (runGoals, GATED_GOALS). */
  gated?: boolean;
  /** Solved without CHEAP_KEEP's holds: with them the goal had no answer, or (liftGain) a materially worse one. */
  cheapLifted?: boolean;
  /** What lifting CHEAP_KEEP bought on the goal's own measure: ₪ for the cost goals, months sooner for קיצור שנים. */
  liftGain?: number;
  /** liftGain is a lower bound (the held problem's LP relaxation), not the held answer's own figure. */
  liftAtLeast?: boolean;
  /** מאוזן lifted on the saving goal's verdict: liftGain is what holding costs the cheapest mix, not this one. */
  liftFromSavings?: boolean;
};

/**
 * The goals that lift CHEAP_KEEP when keeping the cheap debts costs them
 * materially (rules.ts): the cost goals on their own objective, קיצור שנים on its
 * end. מאוזן never lifts for its relief share (that is what stretched L44's
 * 3.03% קל"צ): it follows the saving goal's verdict on the same debts
 * (solveHolding). The payment goal and the consolidation never hold the rule.
 */
const LIFT_GOALS: GoalId[] = ["savings", "stable", "years"];
/**
 * What the answer without CHEAP_KEEP gains over the one with it, on the goal's
 * own measure, when that gain is material and the lifted answer moves a debt the
 * rule held; null otherwise. Savings and stability: the risk-weighted forecast
 * cost they minimise, by at least MATERIAL.cost (stability only when its
 * payment can rise no more than STABLE_BAND above the held answer's). קיצור
 * שנים: at least MATERIAL.months sooner. r02's budget goals: about ₪27k of
 * short loans at 3.7–4.75% folded free about ₪600 a month that shortens the
 * big tranches, ₪61k–₪230k of forecast cost.
 */
function liftGain(ctx: Ctx, goal: GoalId, held: Solved, lifted: Solved): number | null {
  if (!held.plan.ok || !lifted.plan.ok) return null;
  const hold = held.spec?.hold ?? [];
  if (!lifted.plan.refinance.some((id) => hold.includes(id))) return null;
  if (goal === "years") {
    const end = (sv: Solved) => (typeof sv.meta?.finish === "number" ? sv.meta.finish : Infinity);
    const sooner = end(held) - end(lifted);
    return Number.isFinite(sooner) && sooner >= MATERIAL.months ? sooner : null;
  }
  const hc = held.cols ?? ctx.cols;
  const lc = lifted.cols ?? ctx.cols;
  if (goal === "stable" && riseOf(ctx, lifted.plan, lc) > riseOf(ctx, held.plan, hc) + STABLE_BAND(ctx.ref.monthly)) return null;
  const lam = { lambda: lambdaOf(ctx, goal) } as Spec;
  const gain = (costObjective(ctx, lam, held.plan, hc) - costObjective(ctx, lam, lifted.plan, lc)) * U;
  return gain >= MATERIAL.cost(todayCostOf(ctx)) ? gain : null;
}

/**
 * A goal under CHEAP_KEEP, a default and not a wall (rules.ts). The goal is
 * solved free first: when its answer keeps every cheap debt the rule is not in
 * the way, and that answer stands (with the rule in its spec, so no later stage
 * moves them). When it moves one, holding is measured on the goal's own measure
 * (liftGain) and the free answer is taken only when holding costs materially
 * more and the free answer's status is no worse. The held answer's LP
 * relaxation bounds what holding costs: when that bound is already material the
 * held search is not run, and the reason says "at least" (r02: about ₪27k of
 * short loans folded, ₪61k–₪230k to its budget goals).
 *
 * מאוזן is a point between two anchors, not an optimum, and a held-against-free
 * comparison of its own costs a second full search in every structure (measured:
 * r01+r02 1.2 s → 2.0 s, r02 under a typical profile over 3 s). It takes the
 * saving goal's verdict instead (`savings`, the same book and structure): when
 * holding the cheap debts costs even the cheapest mix materially, מאוזן is
 * solved free; otherwise it holds, so a cheap debt is never moved for the
 * relief share alone (L44's 3.03% קל"צ stays). Held as a wall it cost r02
 * ₪138,015 and ₪707 a month, r01+r02 ₪78,599 and ₪664 a month. The free answer
 * stands only when it reads no worse than the held one would.
 */
function solveHolding(ctx: Ctx, goal: GoalId, solve: () => Solved, savings?: Solved): Solved {
  const hold = ctx.base.hold;
  if (goal === "payment" || goal === "consolidate" || !hold?.length) return solve();
  if (goal === "balanced" && savings?.cheapLifted && savings.plan.ok && savings.liftGain !== undefined) {
    const free = withoutHold(ctx, solve);
    const lifted: Solved = { ...free, cheapLifted: true, liftGain: savings.liftGain, liftAtLeast: savings.liftAtLeast, liftFromSavings: true };
    if (free.plan.ok && quickJudge(ctx, goal, free).status === "ok") return lifted;
    // Not ok free: the held answer decides (it costs the second search only here).
    const held = solve();
    const rank = (s: Proposal["status"]) => (s === "ok" ? 0 : s === "no-gain" ? 1 : 2);
    if (!held.plan.ok) return free.plan.ok ? lifted : held;
    return free.plan.ok && rank(quickJudge(ctx, goal, free).status) < rank(quickJudge(ctx, goal, held).status) ? lifted : held;
  }
  if (!LIFT_GOALS.includes(goal)) {
    const held = solve();
    return held.plan.ok ? held : { ...withoutHold(ctx, solve), cheapLifted: true };
  }
  const free = withoutHold(ctx, solve);
  if (!free.plan.ok) return free;
  if (!free.plan.refinance.some((id) => hold.includes(id))) return { ...free, ...(free.spec ? { spec: { ...free.spec, hold } } : {}) };
  const freeOk = quickJudge(ctx, goal, free).status === "ok";
  const bound = freeOk ? heldBound(ctx, goal, free) : null;
  if (bound !== null) return { ...free, cheapLifted: true, liftGain: bound, liftAtLeast: true };
  const held = solve();
  if (!held.plan.ok) return { ...free, cheapLifted: true };
  const gain = liftGain(ctx, goal, held, free);
  const rank = (s: Proposal["status"]) => (s === "ok" ? 0 : s === "no-gain" ? 1 : 2);
  // Never at the price of the status (r06 stable: the free mix saved more and read no-gain on its price).
  if (gain !== null && rank(freeOk ? "ok" : quickJudge(ctx, goal, free).status) <= rank(quickJudge(ctx, goal, held).status)) return { ...free, cheapLifted: true, liftGain: gain };
  return held;
}

/**
 * A lower bound on what holding CHEAP_KEEP costs the goal against its free
 * answer, from the held problem's LP relaxation, when that bound is already
 * material; null otherwise (and always for stability, whose test also weighs
 * the rise). Savings: the LP's risk-weighted cost above the free answer's, ₪.
 * קיצור שנים: the first deadline the held LP reaches within the higher ceiling
 * and no guard, months after the free answer's end.
 */
function heldBound(ctx: Ctx, goal: GoalId, free: Solved): number | null {
  const unlock = eligibilityIds(ctx);
  if (goal === "savings") {
    const lp = solveOnce(ctx.debts, ctx.cols, costSpec(ctx, goal), true);
    if (!lp.ok) return null;
    const gain = (lp.objective - costObjective(ctx, { lambda: lambdaOf(ctx, goal) } as Spec, free.plan, free.cols ?? ctx.cols)) * U;
    return gain >= MATERIAL.cost(todayCostOf(ctx)) ? gain : null;
  }
  if (goal !== "years" || typeof free.meta?.finish !== "number") return null;
  const T = free.meta.finish;
  const stretch = ctx.input.profile.budget && ctx.input.profile.budget > 0 ? ctx.budget : Math.round(ctx.ref.monthly * (1 + YEARS_STRETCH));
  const reaches = (finish: number) => solveOnce(ctx.debts, ctx.cols, specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget: Math.max(ctx.budget, stretch), finish, peakCap: null, ...yearsCaps(ctx), ...(unlock.length ? { unlock } : {}) }), true).ok;
  if (reaches(T + MATERIAL.months - 1)) return null;
  const cands = Array.from(new Set([...Array.from({ length: ctx.maxYears }, (_, i) => 12 * (i + 1)), ...ctx.debts.map((d) => d.months)])).filter((m) => m >= T + MATERIAL.months).sort((a, b) => a - b);
  const first = cands.find((m) => reaches(m));
  return first === undefined ? null : first - T;
}

/** Runs f with CHEAP_KEEP's holds lifted (every spec built inside reads ctx.base). */
function withoutHold<T>(ctx: Ctx, f: () => T): T {
  const h = ctx.base.hold;
  ctx.base.hold = undefined;
  try {
    return f();
  } finally {
    ctx.base.hold = h;
  }
}
/** Runs f with the given holds in ctx.base (the holds another solve of the same goal ran with). */
function withHold<T>(ctx: Ctx, hold: string[] | undefined, f: () => T): T {
  const h = ctx.base.hold;
  ctx.base.hold = hold;
  try {
    return f();
  } finally {
    ctx.base.hold = h;
  }
}

/** A plan's verdict as its proposal would read it (rows built and priced, no reasons written). */
function quickJudge(ctx: Ctx, goal: GoalId, sv: Solved): Verdict {
  const { rows, tranches } = rowsOf(ctx, sv.plan);
  return judge(ctx, goal, sv, sv.plan, bookOf(rows, ctx.input, ctx.f), rows, tranches);
}

/**
 * The cost goals' gates held in the solve: the one-off costs' share of the new
 * money (override off) and the break-even position at every AHEAD month,
 * against the reference. Asked for only when the goal's own optimum failed a
 * gate (audit W1: r06 savings and stable read "no-gain", fee ₪62,812 and
 * break-even 131 months, while keeping the mortgage and moving only the consumer
 * and all-purpose debt saved about ₪125k in the forecast, broke even at month 84
 * and fit the budget, ₪7,952 of ₪8,048).
 */
function gateRows(ctx: Ctx): Partial<Spec> {
  const ref = ctx.ref.book ?? ctx.today;
  return { ...(ctx.override ? {} : { costShareMax: REFI_COST_MAX }), ahead: { cap: aheadOf(ref.pay[0], ref.bal[0]) } };
}
const GATED_GOALS: GoalId[] = ["savings", "balanced", "stable"];

function specFor(ctx: Ctx, over: Partial<Spec>): Spec {
  return { ...ctx.base, ...over };
}

/**
 * The five-year payment guard, in one of three forms (Solved.guard.kind):
 *   1  absolute — in every economy, for five years, no payment above the cap
 *      (today's payment; קיצור שנים: the ceiling it is held to);
 *   2  relative — today's own mix already rises above the cap in a stress
 *      economy (L07; L11, 81% CPI-linked), so no mix that keeps any of it can
 *      hold the absolute guard: in each economy the new mix pays no more than
 *      TODAY'S MIX would there at its own five-year peak, never less than the cap;
 *   0  none — neither holds, and the proposal says so.
 * `caps` is the cap per economy (ECONOMIES order).
 */
type Guard = { kind: 0 | 1 | 2; caps: number[] };

/** The reference's highest payment in each economy over the next five years, month one as the read-out shows it. */
function refPeak5(ctx: Ctx): number[] {
  const b = ctx.ref.book ?? ctx.today;
  // Up to the agora, as the reference totals (referenceOf): the last bits follow the master's row order (fuzz seed 31 Z396).
  return ECON.map((_, k) => agoraUp(Math.max(ctx.ref.monthly, ...b.regular[k].slice(1, 60))));
}
/** The two guards at cap c, strongest first. */
function guardTiers(ctx: Ctx, c: number): Guard[] {
  const abs: Guard = { kind: 1, caps: ECON.map(() => c) };
  const rel: Guard = { kind: 2, caps: refPeak5(ctx).map((p) => Math.max(c, p)) };
  // When today's own peak never exceeds the cap the relative guard IS the absolute one.
  return rel.caps.every((x, k) => x <= abs.caps[k] + 0.5) ? [abs] : [abs, rel];
}
const capOf = (g: Guard): number | number[] => (g.caps.every((x) => Math.abs(x - g.caps[0]) < 1e-9) ? g.caps[0] : g.caps);

/** A mix's highest payment over the next five years in each economy, month one as the read-out shows it (every month, not the guard's samples). */
function peak5Of(book: Book): number[] {
  return ECON.map((_, k) => Math.max(book.metrics.monthly, ...book.regular[k].slice(1, 60)));
}
/** Does a mix's own rows hold the guard on every month 1–60 in every economy (₪1 of rounding)? */
const guardHolds = (book: Book, g: Guard) => peak5Of(book).every((p, k) => p <= g.caps[k] + 1);

/** A plan's payment at the guard's sample months, as the solver states it, under the caps? */
function earlyOk(ctx: Ctx, plan: Plan, cols: Column[], caps: number[]): boolean {
  const byKey = new Map(cols.map((c) => [c.key, c]));
  const refi = new Set(plan.refinance);
  return ECON.every((_, k) =>
    EARLY.every((_, i) => {
      let x = 0;
      for (const d of ctx.debts) if (!refi.has(d.id)) x += d.early[k][i];
      for (const [key, a] of Object.entries(plan.amounts)) x += (byKey.get(key)?.early[k][i] ?? 0) * a;
      return x <= caps[k] + 1;
    })
  );
}

/** A plan's typed month-one payment as the budget row reads it: kept debts, new money, and the read-out's rounding room per opened track. */
function budgetRowOf(ctx: Ctx, plan: Plan, cols: Column[]): number {
  const byKey = new Map(cols.map((c) => [c.key, c]));
  const refi = new Set(plan.refinance);
  let x = 0;
  for (const d of ctx.debts) if (!refi.has(d.id)) x += d.monthly;
  const fams = new Set<string>();
  for (const [key, a] of Object.entries(plan.amounts)) {
    const c = byKey.get(key);
    if (!c) continue;
    x += c.monthly * a;
    fams.add(`${c.track}|${c.segment}`);
  }
  return x + ROUNDING * fams.size;
}

/**
 * The lowest payment under every guardrail — and, when it can be had, a payment
 * that survives the bad economies (the absolute guard, else the relative one).
 * Then, at that payment (within SLIVER_GIVE.monthly, the sliver pass's own
 * tolerance), the cheapest mix: the payment objective weighs cost at 1/1000,
 * too little for branch and bound to break ties on (round 6's open question 2).
 */
function solvePayment(ctx: Ctx): Solved {
  const unlock = eligibilityIds(ctx);
  const s = specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget: null, hold: undefined, ...(unlock.length ? { unlock } : {}) });
  // The unguarded optimum first: it is cheap, and when it already keeps the
  // guard it is the guarded optimum too (the guard only removes mixes). The
  // guarded MILP is the hard one (r04: 1.3s at the node cap against 8ms), so it
  // runs only when the free answer breaks the guard.
  const free = solveTerms(ctx.debts, ctx.cols, s);
  let pick: { plan: Plan; spec: Spec; guard: Guard } | null = null;
  for (const g of guardTiers(ctx, ctx.ref.monthly)) {
    const gs = { ...s, peakCap: capOf(g) };
    if (free.ok) {
      const keys = new Set(Object.keys(free.amounts));
      const held = solveOnce(ctx.debts, ctx.cols.filter((c) => keys.has(c.key)), { ...gs, fixZ: free.refinance });
      if (held.ok && held.objective <= free.objective + 1e-6 * Math.max(1, Math.abs(free.objective))) {
        pick = { plan: held, spec: gs, guard: g };
        break;
      }
    }
    const guarded = solveTerms(ctx.debts, ctx.cols, gs);
    if (guarded.ok) {
      pick = { plan: guarded, spec: gs, guard: g };
      break;
    }
  }
  pick ??= { plan: free, spec: s, guard: { kind: 0, caps: ECON.map(() => ctx.ref.monthly) } };
  if (!pick.plan.ok) return { plan: pick.plan, meta: { guard: 0 }, spec: pick.spec, cols: ctx.cols, guard: pick.guard };
  // The cost stage: the same rules, the payment held within the tolerance of the lowest.
  const low = budgetRowOf(ctx, pick.plan, ctx.cols);
  // Never above the reference, and a material relief stays material: the stage only breaks ties.
  const material = ctx.ref.monthly - MATERIAL.monthly(ctx.ref.monthly);
  const roof = low <= material ? material : ctx.ref.monthly - 1;
  const s2: Spec = { ...pick.spec, wMonthly: 0, wCost: 1, lambda: 0, budget: low + Math.min(SLIVER_GIVE.monthly(ctx.ref.monthly), Math.max(0, roof - low)) };
  const p2 = solveGuarded(ctx, s2, POOL, 2, restart(ctx, pick.plan, s2, ctx.cols));
  const cheaper = p2.ok && frontierPoint(ctx, p2, ctx.cols).saving > frontierPoint(ctx, pick.plan, ctx.cols).saving + 1;
  if (cheaper) {
    PAYMENT_STAGE.n++;
    PAYMENT_STAGE.saved = Math.max(PAYMENT_STAGE.saved, frontierPoint(ctx, p2, ctx.cols).saving - frontierPoint(ctx, pick.plan, ctx.cols).saving);
    addToPool(p2, ctx.cols);
  }
  return { plan: cheaper ? p2 : pick.plan, meta: { guard: pick.guard.kind, low }, spec: cheaper ? s2 : pick.spec, cols: ctx.cols, guard: pick.guard };
}
/** What the payment goal's cost stage recovered across builds (the corpus prints it): answers changed, the most forecast saving, ₪. */
const PAYMENT_STAGE = { n: 0, saved: 0 };

function costSpec(ctx: Ctx, goal: GoalId, over: Partial<Spec> = {}): Spec {
  return specFor(ctx, { wMonthly: 0, wCost: 1, lambda: lambdaOf(ctx, goal), budget: ctx.base.budget, ...pvCapOf(ctx, goal), ...over });
}
/**
 * Savings and balanced may not cost more than the reference in present value
 * (the board's discount rate, forecast economy): the same test the proposal's
 * gate applies, held inside the solve so the optimum never fails it.
 */
function pvCapOf(ctx: Ctx, goal: GoalId): Partial<Spec> {
  if ((goal !== "savings" && goal !== "balanced") || !ctx.input.forecastOn) return {};
  // A back-test's base shift moves the solver's present values off the board's
  // forecast (the debts and columns are priced in the shifted base economy), so
  // the cap is today's present value in that same economy.
  const shifted = ctx.input.tuning?.baseShift && !ctx.ref.book ? sum(ctx.debts.map((d) => d.pv ?? 0)) : null;
  const pv = shifted ?? ctx.ref.pv ?? (ctx.ref.book ?? ctx.today).metrics.outlook?.pv;
  return typeof pv === "number" ? { pvCap: agoraUp(pv) } : {};
}
function solveCost(ctx: Ctx, goal: GoalId, over: Partial<Spec> = {}): Plan {
  return solveTerms(ctx.debts, ctx.cols, costSpec(ctx, goal, over));
}

/**
 * קיצור שנים. The earliest month the whole debt can end, at two ceilings: today's
 * payment (ctx.budget) and — when the advisor set no budget — up to
 * YEARS_STRETCH above it. The higher payment is taken only when it ends the
 * debt at least MATERIAL.months sooner; otherwise the payment stays as today's.
 * A state-eligibility loan is free to repay here (no fee, and its subsidy is
 * the only thing lost): when it alone would hold the end date, it is repaid.
 */
function solveYears(ctx: Ctx): Solved {
  const unlock = eligibilityIds(ctx);
  const given = ctx.input.profile.budget && ctx.input.profile.budget > 0;
  const ceiling = given ? ctx.budget : Math.round(ctx.ref.monthly * (1 + YEARS_STRETCH));
  // The ceiling holds in the stress economies too, for five years (the guard the
  // payment goal and מאוזן carry), at the ceiling each search is held to: the
  // back-test found קיצור שנים above its ceiling in real terms in 421 of 636
  // builds (65–67% prime for 2018–2021 originations: the lowest payment per
  // shekel buys the shortest term), 90 with the guard. The relative guard stands
  // in when today's own mix breaks the absolute one; no guard when neither holds.
  const tiersAt = (c: number): Guard[] => [...guardTiers(ctx, c), { kind: 0, caps: ECON.map(() => c) }];
  const levels = Math.max(tiersAt(ctx.budget).length, ceiling > ctx.budget + 0.5 ? tiersAt(ceiling).length : 0);
  for (let lvl = 0; lvl < levels; lvl++) {
    const gAt = (c: number) => {
      const t = tiersAt(c);
      return t[Math.min(lvl, t.length - 1)];
    };
    const g0 = gAt(ctx.budget);
    const base = earliestFinish(ctx, ctx.budget, unlock, g0);
    const g1 = ceiling > ctx.budget + 0.5 ? gAt(ceiling) : null;
    const stretched = g1 ? earliestFinish(ctx, ceiling, unlock, g1) : null;
    const useStretch = !!stretched?.ok && (!base.ok || base.T - stretched.T >= MATERIAL.months);
    const pick = useStretch ? stretched! : base;
    if (!pick.ok) continue;
    const g = useStretch ? g1! : g0;
    const sv = yearsAtFrom(ctx, pick.T, pick.seed?.(), pick.budget, unlock, g);
    return {
      ...sv,
      guard: g,
      meta: {
        ...(sv.meta ?? {}),
        budget: pick.budget,
        guard: g.kind,
        // What the other ceiling reaches, for the reason: today's payment's end when
        // the stretch is taken; the stretch's end when it was not worth a year.
        ...(stretched?.ok ? { ...(base.ok ? { atToday: base.T } : {}), atStretch: stretched.T, stretchBudget: ceiling, stretched: useStretch ? 1 : 0 } : {}),
      },
    };
  }
  return { plan: { ok: false, status: "infeasible", refinance: [], amounts: {}, objective: NaN, setupHousing: 0, setupAp: 0 } };
}

// The seed is solved only for the ceiling taken (each guarded one ran ~1 s on fuzz Z567), from the pool as it stood when the deadline was found.
type Finish = { ok: true; T: number; budget: number; seed?: () => { plan: Plan; spec: Spec } | undefined } | { ok: false; T: number; budget: number };

/**
 * קיצור שנים never costs more than the reference: everything still to be paid,
 * in the forecast AND on the typed read-out, at most the reference's, in every
 * solve of the goal. A shorter mortgage built from money dearer than the debts
 * it replaces pays more in total (L20: all fixed at 3.95%, +₪178 a month to end
 * 37 months sooner for ₪33,494 more in the forecast and ₪91,355 more in the
 * worst case; L41: +₪262 a month, 22 months sooner, +₪18,626): a client who can
 * pay more each month and holds debts cheaper than new money should prepay
 * them, and the goal's note says so (yearsWhatItTakes).
 */
function yearsCaps(ctx: Ctx): Partial<Spec> {
  return { paidCap: ctx.ref.paid, typedPaidCap: ctx.ref.typedPaid };
}
/** The same test on a mix as the board prices its rows (the neutral residue allowed): may קיצור שנים adopt it? */
function costsNoMore(ctx: Ctx, plan: Plan): boolean {
  if (!plan.ok) return false;
  const b = bookOf(rowsOf(ctx, plan).rows, ctx.input, ctx.f);
  const n = MATERIAL.neutral(ctx.ref.paid);
  return b.paid[0] <= ctx.ref.paid + n && b.metrics.totalPaid <= ctx.ref.typedPaid + n;
}

/** קיצור שנים: the unguarded lowest payment at each deadline, per structure (earliestFinish). */
const FREE_AT = new WeakMap<Ctx, Map<string, Plan>>();
/**
 * Node cap of the last guarded test of a deadline (every decision free). A
 * test that finds no point runs to its cap at ~8 ms a node on a 32-year
 * deadline (fuzz Z88: 5.4 s at 500 nodes). Over fuzz seeds 7, 23, 31, 11
 * (2,400 households) the test ran 726 times: of the 90 that found a point at
 * 500 nodes, 88 found it at 250 (both misses at today's end, where the next,
 * weaker guard tier is then tried), 83 at 150, 66 at 80. No corpus answer changes.
 */
const PROBE_CAP = 250;

/** The earliest feasible finish month within `budget` (binary search over whole years and the debts' own ends). */
function earliestFinish(ctx: Ctx, budget: number, unlock: string[], guard?: Guard): Finish {
  // Candidate finish months: whole years for new money, and every kept debt's own end.
  const cands = new Set<number>();
  for (let y = 1; y <= ctx.maxYears; y++) cands.add(y * 12);
  for (const d of ctx.debts) cands.add(d.months);
  const sorted = Array.from(cands).sort((a, b) => a - b);
  const todayEnd = Math.max(0, ...ctx.debts.map((d) => d.months));
  const found = new Map<number, { plan: Plan; spec: Spec }>();
  const peakCap = guard?.kind ? capOf(guard) : null;
  const specAt = (T: number) => specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget, finish: T, peakCap, ...yearsCaps(ctx), ...(unlock.length ? { unlock } : {}) });
  const colsAt = (T: number) => ctx.cols.filter((c) => c.years * 12 <= T);
  // Under the guard a deadline is feasible when the unguarded answer, its
  // decisions held, holds the guard on its own tracks or on any; only then the
  // full guarded search. The search's own lowest payment is solved once, at the
  // deadline found (it anchors yearsAtFrom's band). Each full guarded search ran
  // 80–230 ms on r01 with a profile, five or six per ceiling.
  const feasible = (T: number) => {
    const spec = specAt(T);
    const cols = colsAt(T);
    let p: Plan;
    if (peakCap === null) p = solveTerms(ctx.debts, cols, spec);
    else {
      // The unguarded search at a deadline does not depend on the guard: solved once per deadline and ceiling, for every guard tried.
      const memo = FREE_AT.get(ctx) ?? new Map<string, Plan>();
      FREE_AT.set(ctx, memo);
      const key = `${budget}|${T}|${unlock.join(",")}|${(ctx.base.hold ?? []).join(",")}`;
      const free = memo.get(key) ?? solveTerms(ctx.debts, cols, { ...spec, peakCap: null });
      memo.set(key, free);
      if (!free.ok) return false;
      const keys = new Set(Object.keys(free.amounts));
      p = solveOnce(ctx.debts, cols.filter((c) => keys.has(c.key)), { ...spec, fixZ: free.refinance });
      // A guard no point of the relaxation meets is out of reach at once.
      if (!p.ok && !solveOnce(ctx.debts, cols, spec, true).ok) return false;
      if (!p.ok) p = solveOnce(ctx.debts, cols, { ...spec, fixZ: free.refinance }, false, true, FIRST_CAP);
      // Then one capped MILP with every decision free; a deadline none of these reaches is read as out of
      // reach (the full multi-round search per deadline took fuzz Z344 to 11 s and Z59 to 2.5 s).
      if (!p.ok) p = solveOnce(ctx.debts, cols, spec, false, true, PROBE_CAP);
    }
    if (p.ok) found.set(T, { plan: p, spec });
    return p.ok;
  };
  const seedAt = (T: number) => {
    const pool = POOL.slice();
    return () => {
      if (peakCap === null) return found.get(T);
      const spec = specAt(T);
      const p = solveGuarded(ctx, spec, pool, undefined, undefined, ctx.debts, colsAt(T));
      return p.ok ? { plan: p, spec } : found.get(T);
    };
  };
  let lo = 0;
  let hi = sorted.findIndex((T) => T >= todayEnd);
  if (hi < 0) hi = sorted.length - 1;
  if (!feasible(sorted[hi])) {
    // Clearing debt due now can make today's end date unreachable within the budget: the goal is then the
    // earliest finish that is reachable at all (it will not read "ok" unless it is earlier than today's).
    // (Without debt due now a later end is no answer at all: the scan is skipped. Under the guard it ran a full search per deadline: fuzz Z344, 11 s.)
    if (!ctx.ref.due) return { ok: false, T: Infinity, budget };
    const later = sorted.slice(hi + 1).findIndex((T) => feasible(T));
    if (later < 0) return { ok: false, T: Infinity, budget };
    const T = sorted[hi + 1 + later];
    return { ok: true, T, budget, seed: seedAt(T) };
  }
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (feasible(sorted[mid])) hi = mid;
    else lo = mid + 1;
  }
  const T = sorted[hi];
  return { ok: true, T, budget, seed: seedAt(T) };
}

/**
 * The cheapest mix that ends by T, started from the mix the search already
 * found there: the cost stage (with its stress rows) can read a feasible problem
 * as infeasible (yalps drops cycled nodes), and a goal that HAS an answer must
 * not read "unavailable" (corpus Z39: a larger budget made years unavailable).
 */
function yearsAtFrom(ctx: Ctx, T: number, seed?: { plan: Plan; spec: Spec }, budget: number = ctx.base.budget ?? ctx.budget, unlock: string[] = [], guard?: Guard): Solved {
  // At the earliest end T, the payment stays within a material margin of the
  // LOWEST payment that reaches T (the search's own answer), and within that band
  // the cheapest, risk-weighted mix wins. Cheapest-within-the-ceiling filled the
  // ceiling with all-fixed money: dearer in the forecast (r01: ₪21k, r02: ₪68k),
  // a higher payment, and a mix that drifted with the ceiling (r02 at −0.05pp).
  // The band is anchored on the lowest payment, so it does not move with it.
  const low = seed?.plan.ok ? shown(ctx, seed.plan).monthly : null;
  const band = low !== null ? Math.min(budget, Math.ceil(low + Math.max(low * YEARS_BAND, YEARS_BAND_MIN))) : budget;
  const at = yearsAt(ctx, T, seed?.plan.ok ? seed.plan : undefined, band, unlock, guard);
  if (at.plan.ok || !seed) return at;
  const again = yearsAt(ctx, T, seed.plan, budget, unlock, guard);
  if (again.plan.ok) return again;
  return { plan: seed.plan, meta: { finish: T }, spec: seed.spec, cols: ctx.cols.filter((c) => c.years * 12 <= T), ...(guard ? { guard } : {}) };
}

/**
 * For a years goal that cannot shorten by a year at no extra cost: the debt
 * that holds today's end, and the lowest payment that would end everything a
 * year sooner without paying more in total (one solve, no ceiling). r06: a
 * ₪797k interest-only balloon holds the end, and no +10% reaches a year. When
 * no payment does it, the debts are cheaper than new money (L20, L41): the note
 * gives the two rates and the move that shortens the mortgage at their price.
 */
function yearsWhatItTakes(ctx: Ctx, refMonths: number, ceiling: number): string {
  const T = refMonths - MATERIAL.months;
  if (!(T > 0)) return "";
  const last = [...ctx.debts].filter((d) => !d.forced).sort((a, b) => b.months - a.months || b.balance - a.balance)[0];
  const unlock = eligibilityIds(ctx);
  const spec = specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget: null, finish: T, ...yearsCaps(ctx), ...(unlock.length ? { unlock } : {}) });
  const p = solveTerms(ctx.debts, ctx.cols.filter((c) => c.years * 12 <= T), spec);
  const holder = last ? ` את המועד קובע ${last.label} של ${nis(last.balance)}${last.interestOnly ? " בריבית בלבד" : ""}, שנגמר בעוד ${yrs(last.months)}.` : "";
  const need = p.ok ? shown(ctx, p).monthly : null;
  const takes = need !== null ? ` קיצור של שנה, ל-${yrs(T)}, בלי לשלם יותר בסך הכול, מחייב החזר של ${nis(need)} בחודש${need > ceiling + 0.5 ? `, מעל התקרה של ${nis(ceiling)}` : ""}.` : "";
  return `${holder}${takes}${cheaperThanNewMoney(ctx, need === null)}`;
}

/**
 * Why no refinance shortens the debt without paying more: the debts it could
 * refinance cost less than new money for the same tracks (balance-weighted,
 * today's effective rate against this client's price for new money), so a
 * shorter term at the dearer price pays more in total. A partial early
 * repayment of the existing tracks shortens the mortgage at their own rate.
 * Without that, and when no payment shortens it at all (`none`), one sentence
 * says there is no such refinance.
 */
function cheaperThanNewMoney(ctx: Ctx, none = true): string {
  let w = 0;
  let own = 0;
  let mkt = 0;
  for (const d of ctx.debts) {
    if (d.lock || d.forced || !(d.rate > 0)) continue;
    const m = marketRateFor(ctx, d);
    if (m === null) continue;
    w += d.balance;
    own += d.balance * ownCost(d, effectiveRate(d)).rate;
    mkt += d.balance * m;
  }
  const what = ctx.debts.some((d) => d.group === "mortgage") ? "המשכנתא" : "החוב";
  if (w > 0 && mkt / w > own / w + 0.05)
    return ` המסלולים הקיימים, בריבית ממוצעת של ${(own / w).toFixed(2)}%, זולים מכסף חדש לאותם מסלולים (${(mkt / w).toFixed(2)}%), ולכן מחזור שמקצר את ${what} מייקר את סך התשלומים או מחייב החזר גבוה בהרבה. פירעון מוקדם חלקי של המסלולים הקיימים מקצר את ${what} בלי המחיר הזה.`;
  return none ? ` גם בהחזר גבוה יותר אין מחזור שמקצר את ${what} בשנה בלי לשלם יותר בסך הכול.` : "";
}

/** קיצור שנים's band over the lowest payment that reaches the earliest end (see yearsAtFrom). */
const YEARS_BAND = 0.01;
const YEARS_BAND_MIN = 100;

/** The cheapest (λ = 0.35) mix within budget whose last payment is by month T, under the goal's guard. */
function yearsAt(ctx: Ctx, T: number, start?: Plan, budget: number = ctx.base.budget ?? ctx.budget, unlock: string[] = [], guard?: Guard): Solved {
  const cols = ctx.cols.filter((c) => c.years * 12 <= T);
  const peakCap = guard?.kind ? capOf(guard) : null;
  const spec = specFor(ctx, { wMonthly: 0, wCost: 1, lambda: lambdaOf(ctx, "years"), budget, finish: T, peakCap, ...yearsCaps(ctx), ...(unlock.length ? { unlock } : {}) });
  // A start from another spec (the search's lowest payment, another goal's mix) is re-priced under this one.
  const from = start ? restart(ctx, start, spec, cols) : undefined;
  const plan =
    peakCap !== null
      ? solveGuarded(ctx, spec, POOL, undefined, from, ctx.debts, cols)
      : from
        ? solveTermsRaw(ctx.debts, cols, spec, POOL, from)
        : solveTerms(ctx.debts, cols, spec);
  if (peakCap !== null && plan.ok && !start) addToPool(plan, cols);
  return { plan, meta: { finish: T }, spec, cols, ...(guard ? { guard } : {}) };
}

/**
 * מאוזן — payment relief and total saving in equal measure: the
 * Kalai–Smorodinsky point between the two, under balanced's own rules (the
 * relief budget, the five-year payment guard, the PV cap, and the typed
 * read-out never above the reference's total).
 *
 *   R  the free relief: the most relief that pays no more in total than the
 *      reference (forecast AND typed read-out);
 *   S  the most forecast saving the relief budget allows (the cheapest mix).
 *
 * Balanced is the largest t with relief ≥ t·R and saving ≥ t·S, and at that t
 * the cheapest risk-weighted mix (λ = 0.5) inside the two caps. On a concave
 * frontier t ≥ ½: at least half the free relief AND at least half the most
 * saving. The most free relief alone, capped half-way to the lowest payment,
 * offers relief with nothing saved where ₪102,695 can be (L42: −₪462 a
 * month, ₪56 saved) and refuses real savings for want of relief
 * (L11: −₪104,831 in the forecast at −₪2 a month).
 *
 * t is read off the frontier g(m) = the least forecast total paid at a payment
 * of m, each probe solved cold (a start from the previous probe stayed in its
 * neighbourhood and read 10 to 25 points less saving on r01): the first probe
 * where the chord between the two anchors crosses relief/R = saving/S, then
 * regula falsi on the bracket, at most BALANCED_PROBES, stopping when the two
 * shares are within BALANCED_TOL of each other. Every probe payment is a
 * continuous function of the anchors, so the answer moves with the inputs.
 *
 * Degenerate cases: R below MATERIAL.monthly → the saving anchor is the answer;
 * S below MATERIAL.cost → the relief anchor (the free relief, then the cheapest
 * mix at its payment); both → the relief anchor, which reads "no-gain".
 */
const BALANCED_PROBES = 3;
const BALANCED_TOL = 0.03;
/** A probe reads the frontier's shape; the final answer (box) gets the full search with the best probe as a seed. */
const BALANCED_PROBE_ROUNDS = 2;

/**
 * A plan's relief and saving against the reference, as the solver states them:
 * relief on the budget row (the payment plus the read-out's rounding room per
 * opened tranche, solve.ts ROUNDING) and saving on the forecast total-paid row,
 * so a cap set from them holds the plan they came from.
 */
function frontierPoint(ctx: Ctx, plan: Plan, cols: Column[]): { relief: number; saving: number } {
  const byKey = new Map(cols.map((c) => [c.key, c]));
  const refi = new Set(plan.refinance);
  let monthly = 0;
  let paid = 0;
  let open = 0;
  for (const d of ctx.debts)
    if (!refi.has(d.id)) {
      monthly += d.monthly;
      paid += d.paid[0];
    }
  for (const [k, a] of Object.entries(plan.amounts)) {
    const c = byKey.get(k);
    if (!c) continue;
    monthly += c.monthly * a;
    paid += c.paid[0] * a;
    open++;
  }
  return { relief: ctx.ref.monthly - monthly - ROUNDING * open, saving: ctx.ref.paid - paid };
}

const seedOf = (p: Plan, cols: Column[]): Seed => ({ refinance: p.refinance.slice().sort(), terms: termsOf(p, cols) });

/**
 * A solve under the five-year payment guard (peakCap), which rarely binds: the
 * unguarded optimum first, kept when it holds the guard at the same objective
 * (the guard only removes mixes, so it is then the guarded optimum too); else
 * the guarded search. The guard's 50 rows are what make the MILP hard: r01+r02's
 * free-relief anchor took 325 ms guarded (its first MILP at the node cap) and
 * 16 ms unguarded, the same answer. solvePayment does the same.
 */
function solveGuarded(ctx: Ctx, spec: Spec, seeds: Seed[] = POOL, rounds?: number, start?: Plan, debts: SolverDebt[] = ctx.debts, cols: Column[] = ctx.cols): Plan {
  if (spec.peakCap == null) return solveTermsRaw(debts, cols, spec, seeds, start, rounds);
  const free = solveTermsRaw(debts, cols, { ...spec, peakCap: null }, seeds, start, rounds);
  if (free.ok) {
    const keys = new Set(Object.keys(free.amounts));
    const held = solveOnce(debts, cols.filter((c) => keys.has(c.key)), { ...spec, fixZ: free.refinance });
    if (held.ok && held.objective <= free.objective + 1e-6 * Math.max(1, Math.abs(free.objective))) return held;
  }
  return solveTermsRaw(debts, cols, spec, seeds, start, rounds);
}

/** Today's remaining cost under the forecast (debt due now excluded): what MATERIAL.cost is measured on. */
const todayCostOf = (ctx: Ctx) => ctx.today.paid[0] - sum(ctx.debts.filter((d) => !d.due).map((d) => d.balance));

/**
 * The solves hold "pays no more than the reference" at the reference's own
 * totals, and the gate in proposalOf allows the neutral residue above them
 * (rules.ts MATERIAL.neutral): the cap is the aim, inside the gate by the
 * residue the ₪1,000 rounding of the tranches leaves. With no residue allowed,
 * that rounding pushes the board's figures over the caps by tens to hundreds of
 * shekels (audit W2: L44 own-bank typed +₪75 on an ₪878 relief, L12 +₪145, L46
 * +₪252, L05 +₪91), refuses the answer and flips its status on a 0.05-point
 * price change (L02, L16, L18, L43, L44). A cap further below the reference's
 * totals would remove real answers: the typed read-out often cannot fall ₪250
 * under today's while the forecast saves ₪22k–₪105k (L07, L11).
 */
function solveBalanced(ctx: Ctx, extra: Partial<Spec> = {}, fromGuard?: Guard["kind"]): Solved {
  const B = reliefBudget(ctx);
  const budget = Math.min(ctx.base.budget ?? B, B);
  const M0 = ctx.ref.monthly;
  const P0 = ctx.ref.paid;
  const rules: Partial<Spec> = { peakCap: M0, typedPaidCap: ctx.ref.typedPaid, ...pvCapOf(ctx, "balanced"), ...extra };
  const cheapestAt = (m: number) => specFor(ctx, { wMonthly: 0, wCost: 1, lambda: 0, budget: Math.min(budget, m), ...rules });
  let sSpec: Spec = cheapestAt(budget);
  let sPlan: Plan = { ok: false, status: "x", refinance: [], amounts: {}, objective: NaN, setupHousing: 0, setupAp: 0 };
  let rSpec: Spec = sSpec;
  let rPlan: Plan = sPlan;
  // The five-year guard compares with today's payment, and today's own mix can
  // break it (CPI-linked or prime rows rise in the stress economies: L11, 81%
  // linked; L07). Then the relative guard holds instead (Guard), and when no mix
  // holds even that the anchors are solved without one and the proposal says so.
  let guard: Guard = { kind: 0, caps: ECON.map(() => M0) };
  // (A re-solve under the gates starts at the guard its first answer held: the stronger ones already had no anchor.)
  const rank = (k: Guard["kind"]) => (k === 1 ? 0 : k === 2 ? 1 : 2);
  for (const g of [...guardTiers(ctx, M0), guard].filter((x) => fromGuard === undefined || rank(x.kind) >= rank(fromGuard))) {
    rules.peakCap = g.kind ? capOf(g) : null;
    sSpec = cheapestAt(budget);
    sPlan = solveGuarded(ctx, sSpec);
    rSpec = specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget, paidCap: P0, ...rules });
    rPlan = solveGuarded(ctx, rSpec);
    guard = g;
    if (sPlan.ok || rPlan.ok) break;
  }
  const at = (p: Plan) => frontierPoint(ctx, p, ctx.cols);
  const R = rPlan.ok ? Math.max(0, at(rPlan).relief) : 0;
  const S = sPlan.ok ? Math.max(0, at(sPlan).saving) : 0;
  const materialR = R >= MATERIAL.monthly(M0);
  const materialS = S >= MATERIAL.cost(todayCostOf(ctx));
  const anchors = { reliefMax: R, savingMax: S, guard: guard.kind };
  // The cheapest risk-weighted mix with at least `relief` and at least `saving`,
  // started from the mix known to hold both caps (the box is a small region
  // around it: a cold search cost r01+r02 under a typical profile 1.2 s more for
  // the same answer).
  const box = (relief: number, saving: number, from: Plan[], mode: string, debts: SolverDebt[] = ctx.debts, cols: Column[] = ctx.cols): Solved => {
    const spec = costSpec(ctx, "balanced", { budget: Math.min(budget, M0 - relief + 0.01), paidCap: Math.min(P0 - saving + 0.5, P0), ...rules });
    const p = solveGuarded(ctx, spec, [...POOL, ...from.map((x) => seedOf(x, ctx.cols))], undefined, from[0], debts, cols);
    const plan = p.ok ? p : from[0];
    if (plan.ok) addToPool(plan, ctx.cols);
    return { plan, meta: { ...anchors, mode }, spec, cols: ctx.cols, guard };
  };
  if (!rPlan.ok && !sPlan.ok) {
    // Nothing meets the rules with a relief or a saving: the cheapest mix within
    // the relief budget stands in, and reads "no-gain" unless it happens to gain.
    const spec = costSpec(ctx, "balanced", { budget, ...extra });
    return { plan: solveTerms(ctx.debts, ctx.cols, spec), meta: { ...anchors, mode: "none" }, spec, cols: ctx.cols, guard };
  }
  if (!materialR && materialS && sPlan.ok) {
    addToPool(sPlan, ctx.cols);
    return { plan: sPlan, meta: { ...anchors, mode: "saving" }, spec: sSpec, cols: ctx.cols, guard };
  }
  if (!materialS || !sPlan.ok || !materialR) return rPlan.ok ? box(R, 0, [rPlan], materialR ? "relief" : "none") : { plan: sPlan, meta: { ...anchors, mode: "none" }, spec: sSpec, cols: ctx.cols, guard };
  // Both anchors material: the frontier search. Shares f = relief/R, s = saving/S;
  // `a` keeps s ≥ f (the saving side), `b` keeps f ≥ s (the relief side).
  type Pt = { plan: Plan; f: number; s: number };
  const pt = (p: Plan): Pt => {
    const x = at(p);
    return { plan: p, f: x.relief / R, s: x.saving / S };
  };
  const tOf = (x: Pt) => Math.min(x.f, x.s);
  // Between the two anchors a debt both of them refinance is refinanced, and one
  // both keep is kept: the probes and the box decide only the debts the anchors
  // disagree on. On a consolidating file (r01 with a property value, 25 debts)
  // that is the difference between 25 binaries per probe and a handful.
  const between: SolverDebt[] = ctx.debts.map((d) => {
    const inS = sPlan.refinance.includes(d.id);
    const inR = rPlan.refinance.includes(d.id);
    return inS && inR ? { ...d, forced: true } : !inS && !inR && !d.forced ? { ...d, lock: d.lock ?? "kept by both anchors" } : d;
  });
  // And the new money between them: each track either anchor uses, at terms from
  // the shorter anchor's to the longer's (±3 years), plus every other track of the
  // segments they open at those terms. A probe's first MILP then runs on a
  // fraction of the grid (r02 typical: 93 columns, 98 ms a probe).
  const span = new Map<string, [number, number]>();
  for (const p of [sPlan, rPlan])
    for (const k of Object.keys(p.amounts)) {
      const [track, seg, y] = k.split("|");
      const f = `${track}|${seg}`;
      const [lo, hi] = span.get(f) ?? [Infinity, -Infinity];
      span.set(f, [Math.min(lo, Number(y)), Math.max(hi, Number(y))]);
      const any = `*|${seg}`;
      const [alo, ahi] = span.get(any) ?? [Infinity, -Infinity];
      span.set(any, [Math.min(alo, Number(y)), Math.max(ahi, Number(y))]);
    }
  const near = ctx.cols.filter((c) => {
    const r = span.get(`${c.track}|${c.segment}`) ?? span.get(`*|${c.segment}`);
    return !!r && c.years >= r[0] - 3 && c.years <= r[1] + 3;
  });
  let a = pt(sPlan);
  let b = pt(rPlan);
  let best = tOf(a) >= tOf(b) ? a : b;
  for (let k = 0; k < BALANCED_PROBES; k++) {
    const ga = a.s - a.f;
    const gb = b.s - b.f;
    if (!(ga > 0) || !(gb < 0)) break;
    const u = ga / (ga - gb);
    const f = a.f + u * (b.f - a.f);
    // Restricted to what lies between the anchors, and on the whole problem when
    // that restriction has no mix (fuzz Z381: t fell to 0.03 when the first probe failed).
    let p = solveGuarded(ctx, cheapestAt(M0 - f * R), POOL, BALANCED_PROBE_ROUNDS, undefined, between, near);
    if (!p.ok) p = solveGuarded(ctx, cheapestAt(M0 - f * R), POOL, BALANCED_PROBE_ROUNDS);
    if (!p.ok) break;
    const q = pt(p);
    if (tOf(q) > tOf(best)) best = q;
    if (Math.abs(q.s - q.f) <= BALANCED_TOL) break;
    if (q.s >= q.f) a = q;
    else b = q;
  }
  const t = tOf(best);
  return box(t * R, t * S, [best.plan], "both", between, near);
}

/**
 * Relief is measured from today's payment (the reference): a budget the advisor
 * set ABOVE it is room the client can carry, not relief, so the two relief goals
 * (balanced, consolidate) are solved at the budget they would have had by default.
 */
function reliefBudget(ctx: Ctx): number {
  const given = ctx.input.profile.budget;
  return given && given > ctx.ref.monthly ? ctx.ref.monthly + (ctx.ref.due > 0 ? 3 : 0) : ctx.budget;
}

/** The monthly ceiling a goal was held to: years its own (today's, or up to YEARS_STRETCH more), the relief goals the relief budget, the rest the budget. */
function ceilingOf(ctx: Ctx, goal: GoalId, solved?: Solved): number {
  if (goal === "years" && typeof solved?.meta?.budget === "number") return solved.meta.budget;
  if (goal === "balanced" || goal === "consolidate") return reliefBudget(ctx);
  return ctx.budget;
}

/** Does a plan move a debt the goal's spec holds (CHEAP_KEEP)? */
const movesHeld = (plan: Plan, spec?: Spec) => !!spec?.hold?.length && plan.refinance.some((id) => spec.hold!.includes(id));

/** Does a plan repay a debt that is locked for every goal but the one that unlocked it (קיצור שנים, an eligibility loan)? */
function lockedIn(ctx: Ctx, plan: Plan, allowed: string[] = []): boolean {
  return plan.refinance.some((id) => !!ctx.debts.find((d) => d.id === id)?.lock && !allowed.includes(id));
}

/**
 * State-eligibility loans the two goals that measure payment and time may
 * repay: no prepayment fee, only the subsidy is lost. קיצור שנים, when one alone
 * holds the end date; החזר חודשי נמוך, when a short one carries a heavy payment
 * (corpus Z566: kept, it held the lowest payment at ₪20,781 while repaying it
 * reached ₪12,855). The cost goals keep them: subsidised money is cheap.
 */
function eligibilityIds(ctx: Ctx): string[] {
  return ctx.debts.filter((d) => d.zak && !d.forced).map((d) => d.id);
}

function reliefSolve(ctx: Ctx, goal: "balanced" | "consolidate", payMin: number, reach: number, over: Partial<Spec>): Solved {
  const B = reliefBudget(ctx);
  const floor = Math.floor(B - reach * (B - payMin));
  const caps = { paidCap: ctx.ref.paid, typedPaidCap: ctx.ref.typedPaid, ...pvCapOf(ctx, goal) };
  const s1 = specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget: Math.min(ctx.base.budget ?? B, B), floor, ...caps, ...over });
  const p1 = solveTerms(ctx.debts, ctx.cols, s1);
  if (p1.ok) {
    const P = bookOf(rowsOf(ctx, p1).rows, ctx.input, ctx.f).metrics.monthly;
    const s2 = costSpec(ctx, goal, { budget: P, ...caps, ...over });
    const p2 = solveTermsRaw(ctx.debts, ctx.cols, s2, POOL, p1);
    const plan = p2.ok ? p2 : p1;
    const phi = B > payMin ? (B - P) / (B - payMin) : 0;
    return { plan, meta: { phi, payMin, floor }, spec: p2.ok ? s2 : s1, cols: ctx.cols };
  }
  return { plan: p1, meta: { phi: 0, payMin } };
}

/**
 * A plan's rise as the solver states it: the worst economy's sum of every row's
 * own peak payment over its whole life (an upper bound of the mix's peak there),
 * less the typed month-one payment, ₪ a month.
 */
function riseOf(ctx: Ctx, plan: Plan, cols: Column[]): number {
  const byKey = new Map(cols.map((c) => [c.key, c]));
  const refi = new Set(plan.refinance);
  let m1 = 0;
  const P = ECON.map(() => 0);
  for (const d of ctx.debts)
    if (!refi.has(d.id)) {
      m1 += d.monthly;
      d.peak.forEach((x, k) => (P[k] += x));
    }
  for (const [key, a] of Object.entries(plan.amounts)) {
    const c = byKey.get(key);
    if (!c) continue;
    m1 += c.monthly * a;
    c.peak.forEach((x, k) => (P[k] += x * a));
  }
  return Math.max(...P) - m1;
}

/**
 * יציבות מרבית, measured in the payment it promises: first the least rise of
 * the payment over the whole life of the mix in the worst economy (a five-year
 * horizon chose five-year variable tracks that reset into 2022–23 in the
 * back-test), within the budget; then, among the mixes within STABLE_BAND of
 * that rise, the cheapest risk-weighted one (λ = LAMBDA.stable). Measured in
 * worst-economy COST, stability took prime whenever prime stayed cheap under
 * the rate shock: 42–62% prime for 2016–2020 originations, a realised payment
 * peak of 1.13 times month one on average and 1.35 at worst, beaten on its own
 * promise by all-קל"צ in 431 of 636 builds.
 */
function solveStable(ctx: Ctx, extra: Partial<Spec> = {}): Solved {
  const s1 = costSpec(ctx, "stable", { shareCap: false, wCost: 1e-4, wRise: 1, ...extra });
  let p1 = solveTerms(ctx.debts, ctx.cols, s1);
  if (!p1.ok) {
    // The rise objective is degenerate (every all-קל"צ mix has none) and branch and
    // bound can drop every node of a feasible problem (L47: no answer, where the
    // same rules have one). The cheapest risk-weighted mix under the same rules is
    // then the start, and stands in when the rise search still finds nothing.
    const s0 = costSpec(ctx, "stable", { shareCap: false, ...extra });
    const p0 = solveTerms(ctx.debts, ctx.cols, s0);
    if (!p0.ok) return { plan: p0, spec: s0, cols: ctx.cols };
    const again = solveTermsRaw(ctx.debts, ctx.cols, s1, POOL, restart(ctx, p0, s1, ctx.cols));
    p1 = again.ok ? again : p0;
  }
  const r1 = riseOf(ctx, p1, ctx.cols);
  const s2 = costSpec(ctx, "stable", { shareCap: false, riseCap: r1 + STABLE_BAND(ctx.ref.monthly), ...extra });
  // The cost stage on the tracks the least rise uses, and קל"צ (no rise at
  // all), every term: within a band of a few tens of shekels another track can
  // barely enter, and on the whole grid the rise cap made each one-term
  // neighbourhood MILP run to its node cap (r02: 150 ms each, three of them).
  const fams = new Set(Object.keys(p1.amounts).map((k) => k.split("|").slice(0, 2).join("|")));
  const cols = ctx.cols.filter((c) => c.track === "klz" || fams.has(`${c.track}|${c.segment}`));
  const p2 = solveTermsRaw(ctx.debts, cols, s2, POOL, restart(ctx, p1, s2, cols));
  if (p2.ok) addToPool(p2, ctx.cols);
  return p2.ok ? { plan: p2, spec: s2, cols, meta: { rise: r1 } } : { plan: p1, spec: s1, cols: ctx.cols, meta: { rise: r1 } };
}

/**
 * A plan carried into another spec's search as its start, re-priced under that
 * spec (its decisions and columns held): solveTerms keeps a start it cannot
 * improve on by comparing objectives, and an objective from another spec is on
 * another scale (stability's rise in ₪ a month against a cost in ₪ thousands:
 * r03 kept a 5-year term where 4 years was ₪3,500 cheaper). undefined when the
 * plan does not satisfy the new spec.
 */
function restart(ctx: Ctx, plan: Plan, spec: Spec, cols: Column[]): Plan | undefined {
  if (!plan.ok) return undefined;
  const keys = new Set(Object.keys(plan.amounts));
  const p = solveOnce(ctx.debts, cols.filter((c) => keys.has(c.key)), { ...spec, fixZ: plan.refinance });
  return p.ok ? p : undefined;
}

/** Every shekel still to be paid under a plan — in the forecast, and on the board's typed read-out. */
function paidOfPlan(ctx: Ctx, plan: Plan): { forecast: number; typed: number } {
  const { rows } = rowsOf(ctx, plan);
  const b = bookOf(rows, ctx.input, ctx.f);
  return { forecast: b.paid[0], typed: b.metrics.totalPaid };
}

/**
 * איחוד הלוואות — the mortgage untouched; consumer debt folded into
 * all-purpose money. The most relief (up to ¾ of the way to the lowest
 * consolidated payment) that does not cost more overall; when every relief
 * costs more, half the way — and the proposal says what it costs.
 */
function solveConsolidate(ctx: Ctx): Solved {
  // (Consolidation folds consumer debt by design: CHEAP_KEEP does not hold it.)
  const s = specFor(ctx, { keepMortgage: true, loansAllowed: true, shareCap: false, hold: undefined });
  const minSpec = { ...s, wMonthly: 1, wCost: 1e-3, lambda: 0, budget: null };
  const min = solveTerms(ctx.debts, ctx.cols, minSpec);
  if (!min.ok) return { plan: min };
  const payMin = bookOf(rowsOf(ctx, min).rows, ctx.input, ctx.f).metrics.monthly;
  const neutral = reliefSolve(ctx, "consolidate", payMin, 0.75, { keepMortgage: true, loansAllowed: true, shareCap: false, hold: undefined });
  // "Keep everything" satisfies "no more relief than costs nothing" — for consolidation that is not an answer:
  // when no material relief is free, take half the way and say what it costs.
  if (neutral.plan.ok && neutral.plan.refinance.length && ctx.ref.monthly - shown(ctx, neutral.plan).monthly >= MATERIAL.monthly(ctx.ref.monthly)) return neutral;
  const B = reliefBudget(ctx);
  const cap = Math.floor(B - 0.5 * (B - payMin));
  const spec = { ...s, wMonthly: 0, wCost: 1, lambda: lambdaOf(ctx, "consolidate"), budget: cap };
  const plan = solveTerms(ctx.debts, ctx.cols, spec);
  // The lowest consolidated payment stands in with the problem it answered, so the sliver pass can read it.
  return plan.ok ? { plan, meta: { phi: 0.5, costs: 1, payMin, cap }, spec, cols: ctx.cols } : { plan: min, spec: minSpec, cols: ctx.cols };
}

/** Why this structure: the chosen one in a sentence, with the other structure's figures. */
function structureText(ctx: Ctx, solved: Solved, book: Book): string | null {
  if (isBankVariant(ctx.variant)) return bankStructureText(ctx, solved, book);
  const mortgageBal = sum(ctx.debts.filter((d) => d.group === "mortgage").map((d) => d.balance));
  // No mortgage today: the new loan is the first lien, and there is no structure to choose.
  if (!mortgageBal) return null;
  const here =
    ctx.variant === "secondLien"
      ? `המשכנתא בבנק, ${nis(mortgageBal)}, נשארת, וההלוואה החדשה נרשמת בשעבוד שני מאחוריה`
      : `המשכנתא בבנק, ${nis(mortgageBal)}, נפרעת, וכל החוב עובר לשעבוד ראשון אצל המלווה`;
  if (solved.alt?.plan.ok && solved.alt.ctx) {
    const a = bookOf(rowsOf(solved.alt.ctx, solved.alt.plan).rows, solved.alt.ctx.input, solved.alt.ctx.f);
    const there = solved.alt.ctx.variant === "secondLien" ? "בשעבוד שני לצד המשכנתא" : "בהעברת הכול לשעבוד ראשון";
    return `${here}. ${there} ההחזר היה ${nis(a.metrics.monthly)} בחודש וסך התשלומים ${nis(a.paid[0])}, מול ${nis(book.metrics.monthly)} ו-${nis(book.paid[0])} כאן.`;
  }
  if (solved.altMissing) {
    const there = solved.altMissing === "secondLien" ? "בשעבוד שני לצד המשכנתא" : "בשעבוד ראשון";
    return solved.altFloor !== undefined && solved.altFloor > ctx.budget + 0.5
      ? `${here}, כי ${there} ההחזר הנמוך ביותר הוא ${nis(solved.altFloor)}, מעל המסגרת של ${nis(ctx.budget)}.`
      : `${here}, כי ${there} אין תמהיל שעומד ביעד ובכללים.`;
  }
  return `${here}.`;
}

/**
 * A bank: an internal refinance at the bank that holds the mortgage (its own
 * prices), or the whole mortgage moved to another bank (the market's average).
 * Said only when both were solved and the answer touches the mortgage.
 */
function bankStructureText(ctx: Ctx, solved: Solved, book: Book): string | null {
  const own = ctx.incumbent ? BANKS.find((b) => b.id === ctx.incumbent)?.label : null;
  if (!own || !(solved.alt || solved.altMissing)) return null;
  const movesMortgage = solved.plan.refinance.some((id) => ctx.debts.find((d) => d.id === id)?.group === "mortgage");
  const mortgageBal = sum(ctx.debts.filter((d) => d.group === "mortgage" && !d.lock).map((d) => d.balance));
  if (ctx.variant === "bank" && !movesMortgage) return null;
  const here =
    ctx.variant === "bank"
      ? `המחזור נעשה בבנק ${own}, שבו המשכנתא של ${nis(mortgageBal)}, ולכן הכסף החדש תומחר ${ctx.priceBasis === "record" ? `לפי מה ש${own} גבה מהלקוח עצמו, מתחת לממוצע של הבנק` : `בריביות של ${own}`}`
      : `כל המשכנתא בבנק ${own}, ${nis(mortgageBal)}, עוברת לבנק אחר, בתמחור הממוצע של הבנקים`;
  if (solved.alt?.plan.ok && solved.alt.ctx) {
    const a = bookOf(rowsOf(solved.alt.ctx, solved.alt.plan).rows, solved.alt.ctx.input, solved.alt.ctx.f);
    const there = solved.alt.ctx.variant === "bank" ? `במחזור פנימי בבנק ${own}` : "בהעברת כל המשכנתא לבנק אחר";
    return `${here}. ${there} ההחזר היה ${nis(a.metrics.monthly)} בחודש וסך התשלומים ${nis(a.paid[0])}, מול ${nis(book.metrics.monthly)} ו-${nis(book.paid[0])} כאן.`;
  }
  if (solved.altMissing) {
    const there = solved.altMissing === "bank" ? `במחזור פנימי בבנק ${own}` : "בהעברת כל המשכנתא לבנק אחר";
    return solved.altFloor !== undefined && solved.altFloor > ctx.budget + 0.5
      ? `${here}, כי ${there} ההחזר הנמוך ביותר הוא ${nis(solved.altFloor)}, מעל המסגרת של ${nis(ctx.budget)}.`
      : `${here}, כי ${there} אין תמהיל שעומד ביעד ובכללים.`;
  }
  return `${here}.`;
}

/** The typed read-out of a plan's rows: what the new tab's rail will show. */
function shown(ctx: Ctx, plan: Plan) {
  return bookOf(rowsOf(ctx, plan).rows, ctx.input, ctx.f).metrics;
}

/** Does a plan satisfy a goal's rules (its spec), whatever its objective? */
function fits(ctx: Ctx, plan: Plan, sv: Solved): boolean {
  // A mix that moves a debt this goal holds (CHEAP_KEEP) is outside its rules: fixZ cannot move a held debt, and the
  // test would pass on a different mix (fuzz seed 11 Z436: savings adopted years' lifted mix at ₪1,209 over its ₪1,101).
  if (!sv.spec || !plan.ok || movesHeld(plan, sv.spec)) return false;
  const keys = new Set(Object.keys(plan.amounts));
  const cols = (sv.cols ?? ctx.cols).filter((c) => keys.has(c.key));
  if (cols.length !== keys.size) return false;
  return solveOnce(ctx.debts, cols, { ...sv.spec, fixZ: plan.refinance }).ok;
}

const BUDGET_GOALS: GoalId[] = ["years", "savings", "stable", "balanced", "consolidate"];

function enforceDisplayOrder(ctx: Ctx, solvedBy: Map<GoalId, Solved>) {
  const pay = solvedBy.get("payment");
  if (pay?.plan.ok) {
    let best = shown(ctx, pay.plan).monthly;
    for (const [g, sv] of Array.from(solvedBy.entries())) {
      if (g === "payment" || !sv.plan.ok || lockedIn(ctx, sv.plan, eligibilityIds(ctx))) continue;
      const m = shown(ctx, sv.plan).monthly;
      if (m < best) {
        // A goal with tighter rules reached a lower payment: the payment goal takes that mix.
        solvedBy.set("payment", { ...pay, plan: sv.plan, meta: { ...pay.meta, guard: 0, adopted: g } });
        best = m;
      }
    }
  }
  // Savings shows the least COST (interest + indexation) on the typed read-out,
  // when that costs savings' own objective (the forecast and the worst economy)
  // no more than DISPLAY_GIVE and never turns an offered saving into "no-gain"
  // (audit S1). Not סה״כ ריבית: it leaves out indexation, and "least interest"
  // would steer savings into CPI-linked tracks whose cost that column cannot see.
  // When another goal then shows a lower typed figure, savings' typed-versus-
  // forecast caveat explains why.
  const sav = solvedBy.get("savings");
  if (sav?.plan.ok && sav.spec) {
    const give = DISPLAY_GIVE(ctx.ref.paid) / U;
    const ownObjective = costObjective(ctx, sav.spec, sav.plan, sav.cols ?? ctx.cols);
    const wasOk = quickJudge(ctx, "savings", sav).status === "ok";
    for (let round = 0; round < 3; round++) {
      const cur = solvedBy.get("savings")!;
      const own = shown(ctx, cur.plan).totalCost;
      let rival: { g: GoalId; plan: Plan; cost: number } | null = null;
      for (const g of BUDGET_GOALS) {
        if (g === "savings") continue;
        const sv = solvedBy.get(g);
        if (!sv?.plan.ok || lockedIn(ctx, sv.plan)) continue;
        const c = shown(ctx, sv.plan).totalCost;
        if (c < own - 0.5 && (!rival || c < rival.cost) && fits(ctx, sv.plan, sav)) rival = { g, plan: sv.plan, cost: c };
      }
      if (!rival) break;
      // The cap AT the rival's cost keeps the rival itself feasible, so it is a
      // real start (one shekel under it was infeasible for the rival too, and the
      // MILP spent its whole node cap proving there was no answer: r01, 1.4s).
      const spec = { ...sav.spec, typedCostCap: rival.cost };
      // Two starts — the rival's mix (feasible) and savings' own (cheaper, may break the cap) — the better wins.
      const tries = [solveTermsRaw(ctx.debts, sav.cols ?? ctx.cols, spec, POOL, rival.plan), solveTermsRaw(ctx.debts, sav.cols ?? ctx.cols, spec, POOL, cur.plan)].filter(
        (p) => p.ok && shown(ctx, p).totalCost <= rival!.cost + 0.5
      );
      tries.sort((x, y) => x.objective - y.objective);
      const next: Solved = tries.length ? { ...sav, plan: tries[0], spec } : { ...sav, plan: rival.plan, meta: { ...(sav.meta ?? {}), adopted: rival.g } };
      const worse = costObjective(ctx, sav.spec, next.plan, sav.cols ?? ctx.cols) - ownObjective;
      if (worse > give || (wasOk && quickJudge(ctx, "savings", next).status !== "ok")) {
        DISPLAY_STATS.held++;
        break;
      }
      solvedBy.set("savings", next);
    }
  }
}
/** How often savings kept its own answer over the display repair (the corpus prints it). */
const DISPLAY_STATS = { held: 0 };

/* ------------------------------------------------------------ the proposal */

function proposalOf(ctx: Ctx, goal: GoalId, solved: Solved): Proposal {
  const { plan } = solved;
  const empty = (status: Proposal["status"], note: string): Proposal => ({
    goal,
    label: LABEL[goal],
    tagline: TAGLINE[goal],
    status,
    note,
    rows: [],
    target: 0,
    metrics: ctx.today.metrics,
    delta: { monthly: 0, months: 0, totalPaid: 0, totalCost: 0, totalInterest: 0, pv: 0 },
    costs: { prepaymentFees: 0, feesEstimated: false, setup: 0, financed: true, breakEvenMonths: null },
    moves: [],
    tranches: [],
    reasons: [],
    caveats: [],
    checks: [],
    stress: [],
  });
  if (ctx.blocked) return empty("unavailable", ctx.blocked);
  if (!plan.ok) {
    const mortgageBal = sum(ctx.debts.filter((d) => d.group === "mortgage").map((d) => d.balance));
    const overLtv = ctx.propertyValue && mortgageBal / ctx.propertyValue > LTV_MAX[ctx.input.profile.propertyType];
    const gap = equityGap(ctx);
    const why = gap
      ? gap
      : overLtv
        ? `שיעור המימון היום ${pct(mortgageBal / ctx.propertyValue!)}, מעל ${pct(LTV_MAX[ctx.input.profile.propertyType])}. מחזור אסור להגדיל אותו (הוראה 329 סעיף 9), ועמלות ועלויות שממומנות בהלוואה מגדילות אותו, ולכן יש לשלם אותן במזומן.`
        : goal === "years" || goal === "savings" || goal === "stable"
          ? `אין תמהיל שעומד בכל הכללים בהחזר של עד ${nis(ctx.budget)}. המסגרת נמוכה מדי לתנאי השוק של הלקוח.`
          : "אין תמהיל שעומד בכל הכללים יחד.";
    return empty("unavailable", why);
  }
  let { rows, tranches } = rowsOf(ctx, plan);
  let book = bookOf(rows, ctx.input, ctx.f);
  // Rounding the tranches can move the typed payment by a few shekels: re-solve
  // under a tighter budget. The rows, the book and the plan are always the same
  // mix (the last re-solve that had an answer).
  let used = plan;
  let usedSpec = solved.spec;
  for (let i = 0; i < 3 && goal !== "payment" && book.metrics.monthly > ctx.budget + 0.5; i++) {
    const over = book.metrics.monthly - ctx.budget;
    // The goal's own problem, its budget tightened by the overshoot.
    const base = solved.spec ?? costSpec(ctx, goal);
    const cap = Math.min(base.budget ?? ctx.budget, ctx.budget) - over - 2 * (i + 1);
    const spec = { ...base, budget: cap };
    // (The mix itself is a start only when it meets the tightened budget: a start the search cannot improve on is kept as it is, over the budget: fuzz seed 11 Z175.)
    const q = solveTermsRaw(ctx.debts, solved.cols ?? ctx.cols, spec, POOL, restart(ctx, used, spec, solved.cols ?? ctx.cols));
    if (!q.ok) break;
    used = q;
    usedSpec = spec;
    ({ rows, tranches } = rowsOf(ctx, used));
    book = bookOf(rows, ctx.input, ctx.f);
  }
  // A re-solved mix is read for slivers and for debts cheaper to keep under the
  // spec it was solved to, and kept when the read-out still holds the budget.
  if (used !== plan && usedSpec) {
    const sv2 = keepCheaper(ctx, unsliver(ctx, goal, { ...solved, plan: used, spec: usedSpec }));
    if (sv2.plan !== used) {
      const r2 = rowsOf(ctx, sv2.plan);
      const b2 = bookOf(r2.rows, ctx.input, ctx.f);
      if (b2.metrics.monthly <= ctx.budget + 0.5) {
        used = sv2.plan;
        ({ rows, tranches } = r2);
        book = b2;
      }
    }
  }
  if (usedSpec !== solved.spec) solved = { ...solved, spec: usedSpec };
  const refi = new Set(used.refinance);
  const t = ctx.today.metrics;
  const m = book.metrics;
  const fees = sum(ctx.debts.filter((d) => refi.has(d.id)).map((d) => d.fee));
  const feesEstimated = ctx.debts.some((d) => refi.has(d.id) && d.feeEstimated);
  const setup = used.setupHousing + used.setupAp;
  const verdict = judge(ctx, goal, solved, used, book, rows, tranches);
  const be = verdict.be;

  // What each decision is worth: the goal's own problem re-solved with that one
  // debt's decision flipped (terms held). The number every "why" leads with.
  const flips = flipEffects(ctx, solved, used);
  const worstK = 1 + book.paid.slice(1).reduce((b, x, k, a) => (x > a[b] ? k : b), 0);
  const fc: FlipCtx = { monthlyNow: book.metrics.monthly, budget: ceilingOf(ctx, goal, solved), budgetGoal: goal !== "payment", goal, months: book.metrics.months, worstK, variant: ctx.variant, keepTest: (d) => keepTest(ctx, goal, solved, used, d) };
  // Moves, each with the figures that decided it.
  const moves: DebtMove[] = ctx.debts.map((d) => {
    const moved = refi.has(d.id);
    const action: DebtMove["action"] = !moved ? "keep" : d.group === "loan" ? "consolidate" : "refinance";
    const todayRate = d.priced.pay[0].length ? effectiveRate(d) : d.rate;
    let why: string;
    if (!moved) {
      if (d.lock) why = d.lock;
      else if (goal === "consolidate" && d.group === "mortgage") why = "המשכנתא נשארת כמות שהיא באיחוד הלוואות";
      else why = whyKept(ctx, d, flips.get(d.id), fc, todayRate);
    } else {
      why = whyMoved(ctx, d, flips.get(d.id), fc, todayRate, goal);
      if (solved.cheapLifted && ctx.cheapBy.has(d.id)) why += ` ${liftWords(ctx.cheapBy.get(d.id)!, goal, solved.liftGain, !!solved.liftAtLeast, !!solved.liftFromSavings)}.`;
    }
    return {
      id: d.id,
      label: d.label,
      group: d.group,
      segment: d.segment,
      balance: Math.round(d.balance),
      rate: d.rate,
      months: d.months,
      action,
      why,
      fee: moved ? d.fee : 0,
      feeEstimated: moved ? d.feeEstimated : false,
      ...(d.due || d.called ? { due: true } : {}),
      ...(!moved && (d.cure ?? 0) > 0 ? { cure: Math.round(d.cure!) } : {}),
      ...(solved.spec?.hold?.includes(d.id) && ctx.cheapBy.has(d.id) ? { heldCheap: Math.round(ctx.cheapBy.get(d.id)! * 100) / 100 } : {}),
    };
  });

  const delta = {
    monthly: m.monthly - t.monthly,
    months: m.months - t.months,
    totalPaid: m.totalPaid - t.totalPaid,
    totalCost: m.totalCost - t.totalCost,
    totalInterest: m.totalInterest - t.totalInterest,
    pv: m.pv - t.pv,
  };
  // Measured against ctx.ref — today's read-out, plus (override) the debt due now that it leaves out.
  const R = ctx.ref;
  const fPaidDelta = book.paid[0] - R.paid;
  const typedPaidDelta = m.totalPaid - R.typedPaid;
  const worst = (b: Book) => Math.max(...b.paid.slice(1));
  const worstDelta = worst(book) - R.worst;
  const relief = R.monthly - m.monthly;

  // Status: judge (each goal on its own measure, then the gates).
  let status = verdict.status;
  let note = verdict.note;
  const held = ceilingOf(ctx, goal, solved);
  const newMoney = sum(tranches.map((x) => x.amount));
  const balance = goal === "balanced" ? balanceOf(solved, relief, -fPaidDelta) : undefined;
  tranches = tranches.map((x) => {
    const why = sliverWhy(ctx, goal, solved, used, x, tranches);
    return why ? { ...x, keptSmall: why } : x;
  });

  const reasons = reasonsOf(ctx, goal, book, tranches, refi, fPaidDelta, worstDelta, be, fees + setup, solved);
  const structureWhy = structureText(ctx, solved, book);
  if (structureWhy) reasons.splice(Math.min(2, reasons.length), 0, structureWhy);
  // Five at most; the sentence on the debt due now is never the one dropped.
  const dueText = R.due > 0 ? nis(R.due) : null;
  while (reasons.length > 5) {
    let i = reasons.length - 1;
    while (i > 0 && dueText && reasons[i].includes(dueText)) i--;
    reasons.splice(i, 1);
  }
  const caveats = caveatsOf(ctx, goal, book, refi, fPaidDelta, delta, solved, rows);
  // An estimated fee the break-even rests on: offered when it pays back at the
  // band's low end, and said when it does not at its high end (fees.ts FEE_BAND).
  const band = verdict.band;
  if (status === "ok" && band && (goal === "savings" || goal === "balanced" || goal === "stable")) {
    const within = (x: number | null) => x !== null && x <= BREAK_EVEN_MAX;
    const range = `${nis(band.feeLow)} עד ${nis(band.feeHigh)}`;
    if (!within(band.high))
      caveats.push(
        within(be)
          ? `עמלות הפירעון הן הערכה, ${range}. בהערכה עצמה העלויות חוזרות תוך ${be} חודשים, ובקצה העליון של הטווח ${band.high === null ? "הן לא חוזרות" : `רק אחרי ${band.high} חודשים`}. יש לבקש מכתב יתרה לפני ההגשה.`
          : `עמלות הפירעון הן הערכה, ${range}, והעלויות חוזרות תוך ${BREAK_EVEN_MAX / 12} שנים רק אם הבנק גובה את הנמוך שבטווח: אז הן חוזרות תוך ${band.low} חודשים, ובהערכה עצמה ${be === null ? "הן לא חוזרות" : `רק אחרי ${be} חודשים`}. יש לבקש מכתב יתרה לפני ההגשה.`
      );
  }
  // Under the override, the proposal the cost-share gate would have refused says so.
  if (status === "ok" && ctx.override && newMoney > 0 && fees + setup > REFI_COST_MAX * newMoney)
    caveats.push(`העלויות החד־פעמיות של המחזור, ${nis(fees + setup)}, הן ${shareText((fees + setup) / newMoney)} מהכסף החדש (${nis(newMoney)}), גבוהות מדי ביחס לחוב, והתמהיל נבנה למרות זאת.`);
  const checks = checksOf(ctx, rows, used, m, goal, held);
  if (status === "ok" && checks.some((c) => !c.ok)) {
    status = "unavailable";
    note = `נכשלה בדיקה: ${checks.filter((c) => !c.ok).map((c) => c.label).join(", ")}`;
  }
  const guard = guardOf(ctx, goal, solved, book);
  const moveGroups = moveGroupsOf(moves);
  return {
    goal,
    label: LABEL[goal],
    tagline: TAGLINE[goal],
    status,
    note,
    ...(goal !== "payment" ? { budget: Math.round(held) } : {}),
    structure: isBankVariant(ctx.variant) ? "bank" : ctx.variant,
    ...(structureWhy ? { structureWhy } : {}),
    // Always set on a bank structure: "move" when the whole mortgage goes to another
    // bank (the move structure, or a bank the advisor picked that does not hold it).
    ...(isBankVariant(ctx.variant) ? { refinance: ctx.variant === "bankMove" || ctx.moveWhole ? ("move" as const) : ("internal" as const) } : {}),
    ...(isBankVariant(ctx.variant) ? { priceBank: ctx.priceBank } : {}),
    rows,
    target: Math.round(sum(owedOnly(rows).map((r) => Number(r.amount) || 0))),
    metrics: m,
    delta,
    ...(balance ? { balance } : {}),
    costs: { prepaymentFees: fees, feesEstimated, setup, financed: true, breakEvenMonths: be },
    moves,
    ...(moveGroups ? { moveGroups } : {}),
    tranches,
    ...(guard ? { guard } : {}),
    reasons,
    caveats,
    checks,
    // With debt due now the stress panel's "today" is the reference: today cannot go on as it is.
    stress: stressOf(ctx.ref.book ?? ctx.today, book),
  };
}

/**
 * Debt due now that the property cannot carry: every mortgage row stays secured
 * on it (kept, or refinanced into the new loan), the due debt and its cures must
 * be paid from new money on it, and the one-off costs come on top. When that is
 * more than the lender's cap on the property, no goal can be built, and the note
 * says by how much (audit U7: r05 under a non-bank and the override, a ₪760,000
 * property: ₪418k of mortgage and ₪381k due against the lender's 80%, ₪608k).
 */
function equityGap(ctx: Ctx): string | null {
  const ltv = ctx.base.ltv;
  if (!ltv || !ctx.propertyValue || !(ctx.ref.due > 0)) return null;
  const mortgage = sum(ctx.debts.filter((d) => d.group === "mortgage" && !d.due).map((d) => d.balance)) + (ctx.base.secured?.balance ?? 0);
  const fees = sum(ctx.debts.filter((d) => d.forced && d.group === "mortgage").map((d) => d.fee));
  const setup = ctx.base.setupAp + (ctx.debts.some((d) => d.forced && d.group === "mortgage") ? ctx.base.setupHousing - (ctx.base.setupApShared ?? 0) : 0);
  const need = mortgage + ctx.ref.due + fees + setup;
  const share = ltv.withAp;
  const cap = share * ltv.value;
  if (need <= cap + 1) return null;
  return `החוב שעומד לפירעון, ${nis(ctx.ref.due)}, יחד עם המשכנתא (${nis(mortgage)}) ועלויות המחזור, הם ${nis(need)} בביטחון הנכס, מעל ${nis(cap)} שהמלווה מממן (${pct(share)} משווי של ${nis(ltv.value)}). חסרים כ-${nis(Math.ceil((need - cap) / 1000) * 1000)}: הון עצמי, ביטחון נוסף או שמאות גבוהה יותר.`;
}

/**
 * Proposal.moveGroups: rows under SMALL_MOVE of one lender, track and decision
 * folded into one line with their count and sum (audit P1: L44 מאוזן listed 14
 * moved rows, some of ₪1,014 to ₪2,542, each with its own sentence). Every other
 * move stays a line of its own, in order. undefined when nothing folds.
 */
function moveGroupsOf(moves: DebtMove[]): MoveGroup[] | undefined {
  const key = (m: DebtMove) => `${m.label}|${m.action}|${m.segment}`;
  const small = new Map<string, DebtMove[]>();
  for (const m of moves) if (m.balance < SMALL_MOVE && !m.due) small.set(key(m), [...(small.get(key(m)) ?? []), m]);
  if (!Array.from(small.values()).some((xs) => xs.length > 1)) return undefined;
  const out: MoveGroup[] = [];
  const done = new Set<string>();
  const verb: Record<DebtMove["action"], string> = { keep: "נשארים", refinance: "ממוחזרים", consolidate: "מאוחדים" };
  for (const m of moves) {
    const xs = m.balance < SMALL_MOVE && !m.due ? small.get(key(m)) : undefined;
    if (xs && xs.length > 1) {
      if (done.has(key(m))) continue;
      done.add(key(m));
      const balance = sum(xs.map((x) => x.balance));
      const fee = sum(xs.map((x) => x.fee));
      out.push({
        ids: xs.map((x) => x.id),
        label: m.label,
        action: m.action,
        count: xs.length,
        balance,
        fee,
        why: `${xs.length} מסלולים של ${m.label}, כל אחד מתחת ל-${nis(SMALL_MOVE)} ובסך הכול ${nis(balance)}, ${verb[m.action]} יחד${fee > 0 ? `, עם עמלות פירעון של ${nis(fee)}` : ""}.`,
      });
    } else out.push({ ids: [m.id], label: m.label, action: m.action, count: 1, balance: m.balance, fee: m.fee, why: m.why });
  }
  return out;
}

/** What a proposal's status rests on: the status, its note, the gate (if any) that refused a material gain, and the break-even figures. */
type Verdict = {
  status: Proposal["status"];
  note?: string;
  /**
   * The gate that turned a material gain into "no-gain" (runGoals then looks
   * for the best mix that passes it): break-even, present value, the costs'
   * share, savings' typed read-out (the owner's rule that a saving the board
   * contradicts is not claimed), stability's price.
   */
  gate: "breakEven" | "pv" | "share" | "typed" | "price" | null;
  /** Stability's figures, for the price test's levels (stable only). */
  stable?: { now: number; next: number; protection: number };
  be: number | null;
  /** Estimated fees (fees.ts FEE_BAND): break-even at the band's low and high fee, months (null = never). */
  band: { low: number | null; high: number | null; feeLow: number; feeHigh: number } | null;
};

/**
 * A proposal's status: each goal on its own measure (rules.ts MATERIAL), then
 * the gates an advisor applies before filing a cost goal: the switching costs
 * come back within BREAK_EVEN_MAX months and (savings, balanced) the saving is
 * not only payments moved earlier (present value). Break-even is measured
 * against the reference, like every other "versus today" figure: with debt due
 * now today's payments leave that debt out, and against today a proposal is
 * never ahead (audit W5: r05 under the override at a bank tier read savings
 * "the costs never return" while it saved ₪429,281 against the reference). An
 * estimated fee is tested at both ends of its band: a move that cannot pay back
 * even at the band's low fee is refused; one that pays back only at the point
 * estimate or the low end is offered with a caveat (caveatsOf). The one-off
 * costs' share of the new money binds every goal.
 */
function judge(ctx: Ctx, goal: GoalId, solved: Solved, used: Plan, book: Book, rows: ImportedLoan[], tranches: NewTranche[]): Verdict {
  const R = ctx.ref;
  const m = book.metrics;
  const refi = new Set(used.refinance);
  const moved = ctx.debts.filter((d) => refi.has(d.id));
  const fees = sum(moved.map((d) => d.fee));
  const setup = used.setupHousing + used.setupAp;
  const refBook = R.book ?? ctx.today;
  const be = refi.size ? breakEven(refBook, book, fees + setup) : null;
  const band = refi.size ? bandBreakEven(ctx, refBook, book, rows, moved, fees + setup) : null;
  const fPaidDelta = book.paid[0] - R.paid;
  const typedPaidDelta = m.totalPaid - R.typedPaid;
  const relief = R.monthly - m.monthly;
  let gate: Verdict["gate"] = null;
  let stable: Verdict["stable"];

  const neutral = MATERIAL.neutral(R.paid);
  const monthlyGain = relief >= MATERIAL.monthly(R.monthly);
  const todayCost = todayCostOf(ctx);
  // A saving is claimed only when the forecast shows it AND the board's typed
  // read-out does not contradict it (shows no more than the neutral residue).
  const costGain = -fPaidDelta >= MATERIAL.cost(todayCost) && typedPaidDelta <= neutral;
  let status: Proposal["status"] = "ok";
  let note: string | undefined;
  const mortgageNow = sum(ctx.debts.filter((d) => d.group === "mortgage").map((d) => d.balance));
  const overLtv = !!ctx.propertyValue && mortgageNow / ctx.propertyValue > LTV_MAX[ctx.input.profile.propertyType];
  const curedKept = ctx.debts.filter((d) => !refi.has(d.id) && !d.forced && (d.cure ?? 0) > 0);
  if (!refi.size && !curedKept.length) {
    status = "no-gain";
    note = overLtv
      ? `שיעור המימון היום ${pct(mortgageNow / ctx.propertyValue!)}, מעל ${pct(LTV_MAX[ctx.input.profile.propertyType])}. מחזור אסור להגדיל אותו (הוראה 329 סעיף 9), ולכן אין מהלך שממומן בהלוואה. מחזור שבו העלויות משולמות במזומן ייבדק ידנית.`
      : goal === "years"
        ? yearsNote(ctx, m, solved)
        : "שום מהלך לא משפר את התמהיל הנוכחי ביעד הזה, ועדיף להשאיר אותו כמות שהוא.";
  } else if (goal === "payment" || goal === "consolidate") {
    // With debt due now there is no "stay as you are": clearing it IS the goal's answer.
    if (!monthlyGain && R.due === 0) {
      status = "no-gain";
      note = `ההחזר יורד רק ב-${nis(relief)}, פחות מהסף של ${nis(MATERIAL.monthly(R.monthly))} שמצדיק מחזור.`;
    }
  } else if (goal === "years") {
    // Shortening never costs more than the reference (yearsCaps): the solves hold
    // it, and this holds it on the rows as the board prices them.
    const dearer = fPaidDelta > neutral || typedPaidDelta > neutral;
    if (R.months - m.months < MATERIAL.months || dearer) {
      status = "no-gain";
      note =
        dearer && R.months - m.months >= MATERIAL.months
          ? `קיצור של ${R.months - m.months} חודשים עולה ${nis(Math.max(fPaidDelta, typedPaidDelta))} יותר בסך הכול.${cheaperThanNewMoney(ctx, false)}`
          : yearsNote(ctx, m, solved);
    }
  } else if (goal === "savings") {
    if (!costGain) {
      status = "no-gain";
      note =
        typedPaidDelta > neutral && -fPaidDelta >= MATERIAL.cost(todayCost)
          ? `בתחזית חוסכים ${nis(-fPaidDelta)}, אבל לפי הריבית המוקלדת בלוח סך התשלומים עולה ב-${nis(typedPaidDelta)}, ולא מציגים חיסכון שהלוח סותר.`
          : `החיסכון בתחזית הוא ${nis(Math.max(0, -fPaidDelta))}, פחות מהסף של ${nis(MATERIAL.cost(todayCost))} שמצדיק את העלויות והטרחה.`;
      if (typedPaidDelta > neutral && -fPaidDelta >= MATERIAL.cost(todayCost)) gate = "typed";
    }
  } else if (goal === "balanced") {
    // Either measure carries it: a material relief that costs no more than the
    // neutral residue, or a material saving (the savings test) at a payment no
    // higher than the reference's.
    const reliefOk = monthlyGain && fPaidDelta <= neutral && typedPaidDelta <= neutral;
    const savingOk = costGain && relief >= -0.5;
    if (!reliefOk && !savingOk) {
      status = "no-gain";
      note =
        monthlyGain && (fPaidDelta > neutral || typedPaidDelta > neutral)
          ? `ההקלה של ${nis(relief)} בחודש מייקרת את סך התשלומים ב-${nis(Math.max(fPaidDelta, typedPaidDelta))}, יותר מעיגול הסכומים, ומאוזן אינו מייקר אותו.`
          : -fPaidDelta >= MATERIAL.cost(todayCost) && typedPaidDelta > neutral
            ? `בתחזית חוסכים ${nis(-fPaidDelta)}, אבל לפי הריבית המוקלדת בלוח סך התשלומים עולה ב-${nis(typedPaidDelta)}, ולא מציגים חיסכון שהלוח סותר.`
            : "אין הקלה משמעותית בהחזר בלי לשלם יותר בסך הכול, ואין חיסכון משמעותי במסגרת ההחזר.";
    }
  } else if (goal === "stable") {
    // Stability is claimed in the payment it promises: the highest payment over
    // the whole life, in the worst economy, falls materially against today's mix.
    // Its price is stated and capped: the forecast extra cost may not exceed
    // STABLE_PRICE of the payments it removes in that economy.
    const s = stabilityOf(refBook, R.monthly, book, m.monthly);
    stable = { now: s.now, next: s.next, protection: s.protection };
    if (s.now - s.next < MATERIAL.monthly(R.monthly)) {
      status = "no-gain";
      note =
        s.next < s.now
          ? `בתרחיש הגרוע ההחזר הגבוה ביותר יורד רק ב-${nis(s.now - s.next)}, מ-${nis(s.now)} ל-${nis(s.next)}, פחות מהסף של ${nis(MATERIAL.monthly(R.monthly))}, ואין יציבות שמצדיקה מחזור.`
          : `בתרחיש הגרוע ההחזר הגבוה ביותר לא יורד (${nis(s.next)} מול ${nis(s.now)} היום), ואין יציבות שמצדיקה מחזור.`;
    } else if (fPaidDelta > neutral && fPaidDelta > STABLE_PRICE * s.protection) {
      status = "no-gain";
      note = `היציבות עולה ${nis(fPaidDelta)} בתחזית, יותר מרבע מהתשלומים שהיא חוסכת בתרחיש הגרוע (${nis(s.protection)} לאורך התקופה), ולכן יקרה מדי.`;
      gate = "price";
    }
  }
  if (status === "ok" && (goal === "savings" || goal === "balanced" || goal === "stable") && fees + setup > 0) {
    // Forecast present value when the forecast is on, the typed read-out's otherwise.
    const base = refBook.metrics;
    const pvNow = ctx.input.forecastOn ? base.outlook?.pv : base.pv;
    const pvNew = ctx.input.forecastOn ? m.outlook?.pv : m.pv;
    // Never ahead: a saving or a balanced relief that never pays its costs back is
    // not one (stability may, by design: it buys protection, capped by its own rule).
    // With an estimated fee the test is at the band's low end (it cannot pay at all otherwise).
    const test = band ? band.low : be;
    if ((test !== null && test > BREAK_EVEN_MAX) || (test === null && goal !== "stable")) {
      status = "no-gain";
      gate = "breakEven";
      const low = band ? `, וגם בעמלה הנמוכה בטווח ההערכה (${nis(band.feeLow + setup)}) ${band.low === null ? "הן לא חוזרות" : `רק אחרי ${band.low} חודשים`}` : "";
      note =
        be === null
          ? `העמלות והעלויות, ${nis(fees + setup)}, לא חוזרות לאורך חיי ההלוואה${low}, ולכן המחזור לא כדאי ביעד הזה.`
          : `העמלות והעלויות, ${nis(fees + setup)}, חוזרות רק אחרי ${be} חודשים, יותר מ-${BREAK_EVEN_MAX / 12} שנים${low}, ולכן המחזור לא כדאי ביעד הזה.`;
    } else if (goal !== "stable" && pvNow !== undefined && pvNew !== undefined && pvNew > pvNow + 1) {
      // (Stability may cost a little by design: its own rule caps that price.)
      status = "no-gain";
      gate = "pv";
      note = `בערך נוכחי, בהיוון של ${ctx.input.discountRate}% בשנה, התמהיל עולה ${nis(pvNew - pvNow)} יותר מהיום: החיסכון בסך התשלומים בא מתשלום מוקדם יותר, לא מריבית זולה יותר.`;
    }
  }
  // Debt due now with no budget given: the default budget is the reference's own
  // payment, which leaves a budget goal no room. Say so, and what would open it.
  if (status === "no-gain" && R.due > 0 && goal !== "payment" && goal !== "consolidate" && !(ctx.input.profile.budget && ctx.input.profile.budget > 0))
    note = `${note ?? ""} המסגרת היא ${nis(ctx.budget)}, ${ctx.budget - R.monthly > 0.5 ? `כמעט בדיוק ההחזר הנמוך ביותר שמסלק את החוב העומד לפירעון (${nis(R.monthly)})` : "ההחזר הנמוך ביותר שמסלק את החוב העומד לפירעון"}, ובה אין מקום ל${goal === "years" ? "קיצור" : goal === "savings" ? "חיסכון" : goal === "stable" ? "יציבות" : "שיפור"}. תקציב חודשי גבוה יותר שהלקוח יכול לשאת יפתח את היעד הזה.`.trim();
  // A budget-holding goal must hold it on the board's own read-out.
  const held = ceilingOf(ctx, goal, solved);
  if (status === "ok" && goal !== "payment" && m.monthly > held + 0.5) {
    status = "no-gain";
    note = `ההחזר ${nis(m.monthly)} חורג מהמסגרת ${nis(held)}`;
  }
  // One-off costs out of proportion to the debt (rules.ts REFI_COST_MAX), for
  // every goal: the override builds it anyway and says so in a caveat. It is the
  // first reason such a refinance is not offered, so its note replaces another
  // goal's own (L26 payment: −₪24 a month, and ₪3,130 of costs on ₪12,950).
  const newMoney = sum(tranches.map((x) => x.amount));
  if (!ctx.override && newMoney > 0 && fees + setup > REFI_COST_MAX * newMoney) {
    if (status === "ok") gate = "share";
    status = "no-gain";
    note = costShareNote(newMoney, fees, setup);
  }
  return { status, note, gate, be, band, ...(stable ? { stable } : {}) };
}

/** The highest payment over a mix's whole life in each economy (month one as the read-out shows it). */
function lifePeak(book: Book, monthly: number): number[] {
  // As the stress panel shows it (stressOf): every regular payment of the forecast schedule, a balloon's lump excluded.
  void monthly;
  return book.regular.map((r) => Math.max(0, ...r));
}

/**
 * Stability in payment, against the reference: the worst economy's highest
 * payment over the whole life, today and in the mix, and what the mix removes
 * there month by month (₪ in total: the payments today's mix would make in that
 * economy above the mix's own).
 */
function stabilityOf(refBook: Book, refMonthly: number, book: Book, monthly: number): { now: number; next: number; k: number; protection: number } {
  const a = lifePeak(refBook, refMonthly);
  const b = lifePeak(book, monthly);
  const k = a.reduce((best, x, i) => (x > a[best] ? i : best), 0);
  const ra = refBook.regular[k];
  const rb = book.regular[k];
  let protection = 0;
  for (let i = 0; i < Math.max(ra.length, rb.length); i++) protection += Math.max(0, (ra[i] ?? 0) - (rb[i] ?? 0));
  return { now: Math.max(...a), next: Math.max(...b), k, protection };
}

/** breakEven on raw arrays: today's and the proposal's forecast payments and balances. */
function breakEvenOn(a: number[], ba: number[], b: number[], bb: number[]): number | null {
  const n = Math.max(a.length, b.length);
  let cum = 0;
  let hit: number | null = null;
  for (let m = 0; m < n; m++) {
    cum += (a[m] ?? 0) - (b[m] ?? 0);
    const d = cum + (ba[m] ?? 0) - (bb[m] ?? 0);
    if (d >= 0 && hit === null) hit = m + 1;
    if (d < 0) hit = null;
  }
  return hit === 1 ? 0 : hit;
}

/**
 * Break-even at the two ends of the estimated fees' band (fees.ts FEE_BAND): the
 * fee is financed, so a different fee changes the new money of its segment pro
 * rata, and with it that segment's payments and balances (a tranche's schedule
 * is linear in its principal). null when no moved debt's fee is an estimate with a band.
 */
function bandBreakEven(ctx: Ctx, refBook: Book, book: Book, rows: ImportedLoan[], moved: Debt[], cost: number): Verdict["band"] {
  const banded = moved.filter((d) => d.feeBand && d.fee > 0);
  if (!banded.length) return null;
  const per = (seg: Segment) => {
    const fresh = owedOnly(rows).filter((r) => r.source_type === AUTOMIX_SOURCE && (r.group === "loan" ? "allPurpose" : "housing") === seg);
    const N = sum(fresh.map((r) => Number(r.amount) || 0));
    const pay: number[] = [];
    const bal: number[] = [];
    for (const r of fresh) {
      const s = scheduleIn(r, ctx.f, ECON[0]);
      addInto(pay, s.pay);
      addInto(bal, s.bal);
    }
    return N > 0 ? { pay: pay.map((x) => x / N), bal: bal.map((x) => x / N) } : null;
  };
  const unit = { housing: per("housing"), allPurpose: per("allPurpose") };
  const at = (end: "low" | "high") => {
    const pay = book.pay[0].slice();
    const bal = book.bal[0].slice();
    for (const d of banded) {
      const u = unit[d.segment];
      if (!u) continue;
      const delta = d.feeBand![end] - d.fee;
      for (let i = 0; i < u.pay.length; i++) {
        pay[i] = (pay[i] ?? 0) + delta * u.pay[i];
        bal[i] = (bal[i] ?? 0) + delta * u.bal[i];
      }
    }
    return cost + sum(banded.map((d) => d.feeBand![end] - d.fee)) <= 0 ? 0 : breakEvenOn(refBook.pay[0], refBook.bal[0], pay, bal);
  };
  const fees = sum(moved.map((d) => d.fee));
  return {
    low: at("low"),
    high: at("high"),
    feeLow: fees + sum(banded.map((d) => d.feeBand!.low - d.fee)),
    feeHigh: fees + sum(banded.map((d) => d.feeBand!.high - d.fee)),
  };
}

/** A share in words: two decimals near the 5% limit, one under 10%, none above. */
const shareText = (x: number) => pct(x, x < 0.06 ? 2 : x < 0.1 ? 1 : 0);

/** The cost-share note (rules.ts REFI_COST_MAX): the amount, the costs, their share, and that they are out of proportion to the debt. */
function costShareNote(newMoney: number, fees: number, setup: number): string {
  const cost = fees + setup;
  const parts = fees > 0 ? ` (עמלות פירעון ${nis(fees)} ועלויות פתיחה ${nis(setup)})` : "";
  const size =
    newMoney < BANK_AP_MIN
      ? ` הלוואה בגודל כזה גם קטנה מ-${nis(BANK_AP_MIN)}, ההלוואה הקטנה ביותר לכל מטרה בביטחון דירה שבנק מפרסם (מזרחי טפחות, ומסלול ירוק של ₪10,000 עד ₪60,000 רק ללקוחות המשכנתא שלו).`
      : "";
  return `הכסף החדש ${nis(newMoney)}, והעלויות החד־פעמיות של המחזור, ${nis(cost)}${parts}, הן ${shareText(cost / newMoney)} ממנו, יותר מ-${pct(REFI_COST_MAX)}. העלויות גבוהות מדי ביחס לחוב, ועדיף לפרוע אותו ממקור אחר או להשאיר אותו כמות שהוא.${size}`;
}

/** Why קיצור שנים reads "no-gain": a locked debt holds the end, or no shortening of a year comes without paying more within the ceiling. */
function yearsNote(ctx: Ctx, m: MixMetrics, solved: Solved): string {
  const pin = ctx.debts.filter((d) => d.lock && d.months >= m.months - 1).sort((a, b) => b.months - a.months)[0];
  if (pin) return `החוב נגמר בעוד ${yrs(m.months)} בגלל ${pin.label} של ${nis(pin.balance)} שנשאר (${pin.lock}).`;
  const short = Math.max(0, ctx.ref.months - m.months);
  const head = short > 0 ? `הקיצור הוא ${short} חודשים, פחות משנה, ולא מצדיק מחזור.` : "במסגרת ההחזר אין מחזור שמקצר את החוב בלי לשלם יותר בסך הכול.";
  return `${head}${yearsWhatItTakes(ctx, ctx.ref.months, ceilingOf(ctx, "years", solved))}`;
}

/** Proposal.balance for מאוזן: the two measures as shown, against the anchors it balanced. */
function balanceOf(solved: Solved, relief: number, saving: number): Proposal["balance"] {
  if (typeof solved.meta?.reliefMax !== "number" || typeof solved.meta?.savingMax !== "number") return undefined;
  const R = Number(solved.meta.reliefMax);
  const S = Number(solved.meta.savingMax);
  const fr = R > 0 ? relief / R : 0;
  const sv = S > 0 ? saving / S : 0;
  const t = solved.meta.mode === "both" ? Math.min(fr, sv) : solved.meta.mode === "saving" ? sv : fr;
  return { relief: Math.round(relief), reliefMax: Math.round(R), saving: Math.round(saving), savingMax: Math.round(S), t: Math.round(t * 1000) / 1000 };
}

/** מאוזן's own sentence: what share of the free relief and of the most saving the client gets, each with its figures. */
function balancedSentence(ctx: Ctx, solved: Solved, relief: number, saving: number): string | null {
  const R = Number(solved.meta?.reliefMax ?? 0);
  const S = Number(solved.meta?.savingMax ?? 0);
  const share = (x: number, of: number) => `${Math.round((100 * x) / of)}%`;
  const mode = solved.meta?.mode;
  if (mode === "both" && R > 0 && S > 0 && relief > 0 && saving > 0)
    return `ההחזר יורד ב-${nis(relief)}, ${share(relief, R)} מההקלה הגדולה ביותר שאינה מייקרת את סך התשלומים (${nis(R)} בחודש), וסך התשלומים בתחזית יורד ב-${nis(saving)}, ${share(saving, S)} מהחיסכון הגדול ביותר במסגרת ההחזר (${nis(S)}).`;
  if (mode === "relief" && relief > 0)
    return `זו ההקלה הגדולה ביותר שאינה מייקרת את סך התשלומים, ${nis(relief)} בחודש. ${S >= 1000 ? `במסגרת ההחזר אפשר לחסוך בסך התשלומים רק ${nis(S)}, פחות מהסף של ${nis(MATERIAL.cost(todayCostOf(ctx)))}.` : "במסגרת ההחזר אין חיסכון של ממש בסך התשלומים."}`;
  if (mode === "saving" && saving > 0)
    return `זה החיסכון הגדול ביותר במסגרת ההחזר, ${nis(saving)} בסך התשלומים בתחזית. ${R >= 1 ? `הקלה בהחזר שאינה מייקרת את סך התשלומים מגיעה רק ל-${nis(R)} בחודש, פחות מהסף של ${nis(MATERIAL.monthly(ctx.ref.monthly))}.` : "אין הקלה בהחזר שאינה מייקרת את סך התשלומים."}`;
  return null;
}

/* ------------------------------------------------------------ slivers */

/**
 * Why each sliver a plan kept stays (unsliver records it; the plan object
 * carries it to whichever goal adopts the mix).
 */
const SLIVER_REASON = new WeakMap<Plan, Map<string, string>>();
/** What the sliver pass did across builds (the check and corpus scripts print it): answers changed, the most a cost goal (₪, risk-weighted) and the payment goal (₪ a month) gave up. */
const SLIVER_STATS = { dropped: 0, cost: 0, monthly: 0 };

/** What a goal may give up on its own objective to drop slivers (rules.ts SLIVER_GIVE), in objective units. */
const sliverGive = (ctx: Ctx, spec: Spec) => (spec.wMonthly > 0 ? SLIVER_GIVE.monthly(ctx.ref.monthly) : SLIVER_GIVE.cost(ctx.ref.paid) / U);

/**
 * A plan's tranches under SLIVER_SHARE of their segment's new money, smallest
 * first, with the ₪1,000 the rounding in rowsOf can take off a tranche (a
 * tranche at 10.1% here can show 9.9% on the board).
 */
function sliversOf(plan: Plan, cols: Column[]): { track: TrackKey; segment: Segment; amount: number }[] {
  const byKey = new Map(cols.map((c) => [c.key, c]));
  const out: { track: TrackKey; segment: Segment; amount: number }[] = [];
  for (const seg of ["housing", "allPurpose"] as Segment[]) {
    const byTrack = new Map<TrackKey, number>();
    for (const [k, a] of Object.entries(plan.amounts)) {
      const c = byKey.get(k);
      if (c?.segment === seg) byTrack.set(c.track, (byTrack.get(c.track) ?? 0) + a);
    }
    if (byTrack.size < 2) continue;
    const N = sum(Array.from(byTrack.values()));
    for (const [track, a] of Array.from(byTrack.entries())) if (a < SLIVER_SHARE * N + 1000) out.push({ track, segment: seg, amount: a });
  }
  return out.sort((a, b) => a.amount - b.amount || TRACKS.indexOf(a.track) - TRACKS.indexOf(b.track) || a.segment.localeCompare(b.segment));
}

/**
 * The goal's own problem without one track of one segment, the debt decisions
 * held, three ways in turn: every other tranche's term held (one LP); the
 * terms free near the mix's own (each track in use ±3 years, one term per
 * track); and the same with a track not in the mix allowed in near the dropped
 * one's term. The first that gives up no more than SLIVER_GIVE against `base`
 * (the objective before any sliver was dropped) AND leaves no sliver the plan
 * did not already have is the answer: trading one ₪50,000 track for another
 * is not a drop (L18 payment swapped קל"צ 50k for מל"צ 50k and back). Else why
 * the sliver stays, with what removing it costs.
 */
function sliverTest(ctx: Ctx, goal: GoalId, spec: Spec, cols: Column[], plan: Plan, track: TrackKey, segment: Segment, base: number): { plan: Plan | null; why: string } {
  const fam = (c: Column) => c.track === track && c.segment === segment;
  const byKey = new Map(cols.map((c) => [c.key, c]));
  const inUse = new Map<string, number[]>();
  for (const k of Object.keys(plan.amounts)) {
    const c = byKey.get(k);
    if (!c) continue;
    const f = `${c.track}|${c.segment}`;
    inUse.set(f, [...(inUse.get(f) ?? []), c.years]);
  }
  const dropped = inUse.get(`${track}|${segment}`) ?? [];
  const before = new Set(sliversOf(plan, cols).map((x) => `${x.track}|${x.segment}`));
  before.delete(`${track}|${segment}`);
  const give = sliverGive(ctx, spec);
  const held = { ...spec, fixZ: plan.refinance };
  const near = (entering: boolean) =>
    cols.filter((c) => {
      if (fam(c)) return false;
      const ys = inUse.get(`${c.track}|${c.segment}`);
      if (ys) return ys.some((y) => Math.abs(c.years - y) <= 3);
      return entering && c.segment === segment && dropped.some((y) => Math.abs(c.years - y) <= 3);
    });
  const attempts = [
    () => solveOnce(ctx.debts, cols.filter((c) => !fam(c) && c.key in plan.amounts), held),
    () => solveOnce(ctx.debts, near(false), held, false, true, FIRST_CAP),
    () => solveOnce(ctx.debts, near(true), held, false, true, FIRST_CAP),
  ];
  let best: Plan | null = null;
  let swap = false;
  for (const attempt of attempts) {
    const p = attempt();
    if (!p.ok) continue;
    const within = p.objective <= base + give;
    if (within && sliversOf(p, cols).every((x) => before.has(`${x.track}|${x.segment}`))) return { plan: p, why: "" };
    if (within) swap = true;
    else if (!best || p.objective < best.objective) best = p;
  }
  const p = best;
  const lost = p ? p.objective - plan.objective : 0;
  return {
    plan: null,
    why: swap && !p
      ? "מסלול קטן שנשאר כי בלעדיו התמהיל עומד בכללים רק עם מסלול קטן אחר במקומו"
      : !p
      ? "מסלול קטן שנשאר כי בלעדיו התמהיל אינו עומד בכללים"
      : spec.wMonthly > 0
        ? `מסלול קטן שנשאר כי בלעדיו ההחזר עולה ב-${nis(lost)} בחודש`
        : `מסלול קטן שנשאר כי בלעדיו העלות עולה בכ-${nis(lost * U)}`,
  };
}

/**
 * Drops the slivers a goal's answer can do without (rules.ts SLIVER_SHARE,
 * SLIVER_GIVE), under the goal's own rules (its spec: every cap and the budget
 * it held), so every law, guardrail and display cap still holds. After a drop
 * the slivers are read again from the new plan; the whole pass may give up at
 * most SLIVER_GIVE against the answer it started from.
 */
function unsliver(ctx: Ctx, goal: GoalId, sv: Solved): Solved {
  if (!sv.plan.ok || !sv.spec) return sv;
  const cols = sv.cols ?? ctx.cols;
  const base = sv.plan.objective;
  // A cap on the SHOWN cost (savings after the display order) is held on the
  // rows as the board prices them, not only in the solve: a drop that the
  // ₪1,000 rounding takes over it would undo the order (L01 budget-low: savings
  // ₪85 above מאוזן).
  const capOk = (p: Plan) => sv.spec!.typedCostCap == null || shown(ctx, p).totalCost <= sv.spec!.typedCostCap + 0.5;
  let cur = sv.plan;
  let why = new Map<string, string>();
  for (let round = 0; round < 6; round++) {
    let dropped = false;
    why = new Map();
    for (const x of sliversOf(cur, cols)) {
      const r = sliverTest(ctx, goal, sv.spec, cols, cur, x.track, x.segment, base);
      if (r.plan && capOk(r.plan)) {
        cur = r.plan;
        dropped = true;
        break;
      }
      why.set(`${x.track}|${x.segment}`, r.plan ? "מסלול קטן שנשאר כי בלעדיו העלות בלוח עולה מעל זו של יעד אחר" : r.why);
    }
    if (!dropped) break;
  }
  // A drop holds the debt decisions of the mix it came from; without the sliver
  // one of them can be worth undoing (r01+r02 budget-low savings kept moving a
  // ₪4,927 קל"צ that cost ₪1,281 more than keeping it). One flip at a time on the
  // new mix's own tracks and terms, kept when it is better and adds no sliver.
  if (cur !== sv.plan) {
    const spec = sv.spec;
    const known = new Set(sliversOf(cur, cols).map((x) => `${x.track}|${x.segment}`));
    // In the canonical order (solve.ts): the first improving flip is taken, so the board's row order may not decide which.
    const flippable = (canonical(ctx.debts) as Debt[]).filter((d) => !d.forced && (!d.lock || !!spec.unlock?.includes(d.id)) && !spec.hold?.includes(d.id) && (d.group === "mortgage" ? !spec.keepMortgage : spec.loansAllowed));
    for (const d of flippable) {
      const keys = new Set(Object.keys(cur.amounts));
      const z = cur.refinance.includes(d.id) ? cur.refinance.filter((id) => id !== d.id) : [...cur.refinance, d.id];
      const p = solveOnce(ctx.debts, cols.filter((c) => keys.has(c.key)), { ...spec, fixZ: z });
      if (p.ok && p.objective < cur.objective - 1e-6 && capOk(p) && sliversOf(p, cols).every((x) => known.has(`${x.track}|${x.segment}`))) cur = p;
    }
  }
  // One term per segment where the tracks' terms differ by a year or two: a
  // contract of 20, 21 and 19 years (audit P3: L05 מאוזן) says nothing a single
  // term does not, and aligning them is accepted within the same allowance.
  cur = alignTerms(ctx, sv.spec, cols, cur, base + sliverGive(ctx, sv.spec), capOk);
  SLIVER_REASON.set(cur, why);
  if (cur !== sv.plan) {
    SLIVER_STATS.dropped++;
    const lost = cur.objective - base;
    if (sv.spec.wMonthly > 0) SLIVER_STATS.monthly = Math.max(SLIVER_STATS.monthly, lost);
    else SLIVER_STATS.cost = Math.max(SLIVER_STATS.cost, lost * U);
  }
  return cur === sv.plan ? sv : { ...sv, plan: cur };
}

/** Terms of one segment within this many years of each other are aligned when it costs no more than SLIVER_GIVE. */
const ALIGN_SPAN = 2;
const ALIGN_STATS = { n: 0 };

/**
 * One common term per segment whose tracks' terms differ by at most ALIGN_SPAN
 * years: every term from the shortest to the longest tried, the debt decisions
 * and the other segment held (one LP each), the best kept when it stays within
 * `limit` on the goal's own objective, passes `ok`, and adds no sliver.
 */
function alignTerms(ctx: Ctx, spec: Spec, cols: Column[], plan: Plan, limit: number, ok: (p: Plan) => boolean): Plan {
  const byKey = new Map(cols.map((c) => [c.key, c]));
  let cur = plan;
  for (const seg of ["housing", "allPurpose"] as Segment[]) {
    const used = Object.keys(cur.amounts)
      .map((k) => byKey.get(k))
      .filter((c): c is Column => !!c && c.segment === seg);
    const fams = Array.from(new Set(used.map((c) => c.track)));
    if (fams.length < 2) continue;
    const ys = used.map((c) => c.years);
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    if (hi === lo || hi - lo > ALIGN_SPAN) continue;
    const other = Object.keys(cur.amounts).filter((k) => byKey.get(k)?.segment !== seg);
    const known = new Set(sliversOf(cur, cols).map((x) => `${x.track}|${x.segment}`));
    let best: Plan | null = null;
    for (let T = lo; T <= hi; T++) {
      const keys = new Set([...other, ...fams.map((t) => `${t}|${seg}|${T}`)]);
      const set = cols.filter((c) => keys.has(c.key));
      if (set.length !== keys.size) continue;
      const p = solveOnce(ctx.debts, set, { ...spec, fixZ: cur.refinance });
      if (!p.ok || p.objective > limit || !ok(p) || !sliversOf(p, cols).every((x) => known.has(`${x.track}|${x.segment}`))) continue;
      if (!best || p.objective < best.objective - 1e-9) best = p;
    }
    if (best) {
      cur = best;
      ALIGN_STATS.n++;
    }
  }
  return cur;
}

/** Moved debts keepCheaper would have kept but for the sliver keeping them leaves (the "why" says so). */
const KEEP_SLIVER = new WeakMap<Plan, string[]>();

/**
 * A moved debt that is cheaper to keep (its flip shows keeping saves in the
 * forecast) is kept when keeping it is better on the goal's OWN objective under
 * its own rules, every other decision and term held; the first such debt in the
 * canonical order, then again, a few times. Audit P2 and fuzz (seed 7: Z86,
 * Z232, Z355 payment) found answers that moved a 0.8–2.4% debt into dearer
 * money with nothing in the goal needing it: the search's node cap and the tiny
 * weight on cost in the payment goal let it stand. A plan is never made worse,
 * a cap on the shown cost is held, and no sliver is added.
 */
function keepCheaper(ctx: Ctx, sv: Solved): Solved {
  if (!sv.plan.ok || !sv.spec) return sv;
  const spec = sv.spec;
  const cols = sv.cols ?? ctx.cols;
  const capOk = (p: Plan) => spec.typedCostCap == null || shown(ctx, p).totalCost <= spec.typedCostCap + 0.5;
  let cur = sv.plan;
  for (let round = 0; round < 4; round++) {
    const flips = flipEffects(ctx, { ...sv, plan: cur }, cur);
    const known = new Set(sliversOf(cur, cols).map((x) => `${x.track}|${x.segment}`));
    const keys = new Set(Object.keys(cur.amounts));
    let changed = false;
    for (const d of canonical(ctx.debts) as Debt[]) {
      if (!cur.refinance.includes(d.id) || d.forced || (flips.get(d.id)?.paid ?? 0) > -100) continue;
      const p = solveOnce(ctx.debts, cols.filter((c) => keys.has(c.key)), { ...spec, fixZ: cur.refinance.filter((id) => id !== d.id) });
      // Better on the goal's objective, or no worse and cheaper in the forecast: the
      // payment goal weighs cost at 1/1000, too little for its search to see (Z426).
      const tol = 1e-6 * Math.max(1, Math.abs(cur.objective));
      const gain = p.ok && (p.objective < cur.objective - tol || (p.objective <= cur.objective + tol && frontierPoint(ctx, p, cols).saving > frontierPoint(ctx, cur, cols).saving + 100));
      const noSliver = !gain || sliversOf(p, cols).every((x) => known.has(`${x.track}|${x.segment}`));
      if (gain && capOk(p) && noSliver) {
        cur = p;
        changed = true;
        break;
      }
      if (gain && !noSliver) KEEP_SLIVER.set(cur, [...(KEEP_SLIVER.get(cur) ?? []), d.id]);
    }
    if (!changed) break;
  }
  if (cur === sv.plan) return sv;
  const held = KEEP_SLIVER.get(sv.plan);
  if (held) KEEP_SLIVER.set(cur, [...(KEEP_SLIVER.get(cur) ?? []), ...held]);
  // Its slivers are among the plan's own: their reasons carry over.
  const reasons = SLIVER_REASON.get(sv.plan);
  if (reasons) SLIVER_REASON.set(cur, reasons);
  return { ...sv, plan: cur };
}

/** A shown tranche's keptSmall: why a sliver of the final rows stays (recorded by unsliver, or tested here when the rows were re-solved after it). */
function sliverWhy(ctx: Ctx, goal: GoalId, solved: Solved, plan: Plan, x: NewTranche, all: NewTranche[]): string | null {
  const seg = all.filter((t) => t.segment === x.segment);
  if (seg.length < 2 || !(x.amount < SLIVER_SHARE * sum(seg.map((t) => t.amount)))) return null;
  const known = SLIVER_REASON.get(plan)?.get(`${x.track}|${x.segment}`);
  if (known) return known;
  if (!solved.spec) return null;
  const r = sliverTest(ctx, goal, solved.spec, solved.cols ?? ctx.cols, plan, x.track, x.segment, plan.objective);
  return r.plan ? null : r.why;
}

/**
 * A decision's measured effect. `monthly`/`paid`: flipping it (a kept debt
 * refinanced, a moved one kept). `refi`: the payment change of refinancing it;
 * `rateOnly`: the same at the debt's own remaining term (the price of the new
 * money alone); `term`: the new money's term, months (share-weighted).
 */
type Flip = {
  monthly: number;
  paid: number;
  carried?: boolean;
  refi?: number;
  rateOnly?: number;
  term?: number;
  /** The same as `paid`, per economy (0 = the forecast, then the stress economies). */
  paidBy?: number[];
  /** Moved by the structure (the whole mortgage to another bank, or behind a non-bank first lien): keeping it is not an option here. */
  structural?: boolean;
} | null;

/**
 * What one decision is worth, at the margin: the mix's structure held (its
 * tracks, terms and the share of each segment's money on each), the money the
 * flip adds or removes spread over that segment's tranches, and the difference
 * priced — the month-one payment and everything still to be paid (forecast).
 * No re-optimisation: that would blend the decision with a reshuffle. A
 * segment with no tranche yet is priced at the plan's own housing structure
 * (mortgage debt) or at a קל"צ all-purpose tranche on the plan's longest term.
 * The same money at the debt's own remaining term separates the price of new
 * money from the effect of its term (L09: a 4.22% debt "added ₪2,302 to the
 * payment and saved ₪312,935" only because the mix's tranches are shorter).
 */
function flipEffects(ctx: Ctx, solved: Solved, plan: Plan): Map<string, Flip> {
  const out = new Map<string, Flip>();
  if (!plan.ok) return out;
  const colsAll = solved.cols ?? ctx.cols;
  const byKey = new Map(colsAll.map((c) => [c.key, c]));
  // Every column of the full grid by family, for the debt's own term (the years
  // goal's columns stop at its deadline; the price at another term is the grid's).
  const family = new Map<string, Column[]>();
  for (const c of ctx.cols) {
    const f = `${c.track}|${c.segment}`;
    if (!family.has(f)) family.set(f, []);
    family.get(f)!.push(c);
  }
  const atTerm = (c: Column, months: number) =>
    (family.get(`${c.track}|${c.segment}`) ?? [c]).reduce((b, x) => (Math.abs(x.years * 12 - months) < Math.abs(b.years * 12 - months) ? x : b), c);
  const seg = (d: Debt): Segment => d.segment;
  const sharesOf = (sg: Segment) => {
    const xs = Object.entries(plan.amounts).filter(([k]) => byKey.get(k)?.segment === sg);
    const tot = sum(xs.map(([, x]) => x));
    return tot > 0 ? xs.map(([k, x]) => ({ c: byKey.get(k)!, w: x / tot })) : [];
  };
  // A segment with no tranche: housing debt at the plan's housing structure when
  // it has one, else one קל"צ tranche (it keeps 329's fixed third on its own) at
  // the debt's own remaining term, so the flip prices the new money, not a term
  // change. Audit W9: on a mix that keeps everything, a 10-year קל"צ explained a
  // 20-year ₪75,840 מל"צ with "+₪310" where a same-term refinance moves it ~₪30 (L35).
  const fallback = (sg: Segment, d: Debt) => {
    const h = sharesOf("housing");
    if (sg === "housing" && h.length) return h;
    const want = Math.max(1, Math.round(d.months / 12));
    const pickCol = colsAll
      .filter((c) => c.segment === sg && c.track === "klz")
      .reduce<Column | null>((b, c) => (!b || Math.abs(c.years - want) < Math.abs(b.years - want) ? c : b), null);
    return pickCol ? [{ c: pickCol, w: 1 }] : [];
  };
  const spec = solved.spec;
  const movable = ctx.debts.filter((d) => !d.lock && (d.group === "mortgage" ? !(spec?.keepMortgage ?? false) : spec?.loansAllowed ?? true));
  for (const d of movable) {
    const on = plan.refinance.includes(d.id);
    const sg = seg(d);
    const shares = sharesOf(sg).length ? sharesOf(sg) : fallback(sg, d);
    if (!shares.length) {
      out.set(d.id, null);
      continue;
    }
    // Only debt due now (nothing paid on it today) is "carried": its whole new
    // loan is an addition. A row the STRUCTURE moves (bankMove, firstLien) has
    // payments of its own that stop, so it takes the net branch below. Audit W4:
    // L07 years (move) read "מוסיף ₪784 להחזר החודשי ו-₪239,208 לסך התשלומים"
    // for a ₪114,135 debt at 7.02% refinanced at 6.32%.
    if (d.due || d.called) {
      // Cleared in any case: what carrying it in the new money costs.
      let monthly = 0;
      let paid = 0;
      for (const { c, w } of shares) {
        monthly += c.monthly * d.balance * w;
        paid += c.paid[0] * d.balance * w;
      }
      out.set(d.id, { monthly, paid, carried: true });
      continue;
    }
    // Refinanced → kept: its money leaves the new tranches and its own payments return.
    const sign = on ? -1 : 1;
    const money = sign * (d.balance + d.fee);
    let monthly = -sign * d.monthly;
    let paid = -sign * d.paid[0];
    let refi = -d.monthly;
    let rateOnly = -d.monthly;
    let term = 0;
    const paidBy = d.paid.map((x) => -sign * x);
    for (const { c, w } of shares) {
      monthly += c.monthly * money * w;
      paid += c.paid[0] * money * w;
      c.paid.forEach((x, k) => (paidBy[k] += x * money * w));
      refi += c.monthly * (d.balance + d.fee) * w;
      rateOnly += atTerm(c, d.months).monthly * (d.balance + d.fee) * w;
      term += c.years * 12 * w;
    }
    // A mortgage row moved by the structure, or with its lender's whole mortgage to a bank the advisor picked.
    const structural = d.forced || (on && !!spec?.moveWhole && d.group === "mortgage");
    out.set(d.id, { monthly, paid, refi, rateOnly, term, paidBy, ...(structural ? { structural: true } : {}) });
  }
  return out;
}

/**
 * Does refinancing this debt change the payment mainly because of the new
 * money's TERM, not its price? Then a "why" says the term changes, with both
 * terms, instead of putting the payment (or a saving) on the debt itself.
 */
function termDriven(d: Debt, f: Flip | undefined): f is NonNullable<Flip> & { refi: number; rateOnly: number; term: number } {
  if (!f || f.carried || f.refi === undefined || f.rateOnly === undefined || f.term === undefined) return false;
  return Math.abs(f.term - d.months) >= 12 && Math.abs(f.refi) >= 1 && Math.abs(f.refi - f.rateOnly) > Math.abs(f.rateOnly);
}
const termWords = (d: Debt, term: number) => `${term < d.months ? "מקצר" : "מאריך"} את התקופה מ-${yrs(d.months)} ל-${yrs(Math.round(term))}`;

/**
 * The forecast cost of a debt as an annual rate: the rate at which its forecast
 * payments are worth its balance. For a CPI-linked debt it includes the
 * indexation the forecast expects, which its stated rate leaves out.
 */
function forecastRate(d: Debt): number | null {
  return irrOf(d.priced.pay[0], d.balance);
}

/** The annual rate (monthly × 12, %) at which a payment stream is worth `principal`; null outside −4.8%…60%. */
function irrOf(pay: number[] | undefined, principal: number): number | null {
  if (!pay?.length || !(principal > 0)) return null;
  const pv = (r: number) => {
    let s = 0;
    let df = 1;
    for (const x of pay) s += x * (df /= 1 + r);
    return s;
  };
  let lo = -0.004;
  let hi = 0.05;
  if (pv(lo) < principal || pv(hi) > principal) return null;
  for (let k = 0; k < 60; k++) {
    const mid = (lo + hi) / 2;
    if (pv(mid) > principal) lo = mid;
    else hi = mid;
  }
  return ((lo + hi) / 2) * 1200;
}

/**
 * A debt's price against new money, on comparable terms: a CPI-linked debt
 * refinanced into unlinked money (all-purpose money is unlinked) costs its rate
 * plus the indexation, so it is compared at its forecast rate (r07: a 4.80%
 * CPI-linked loan costs about 7% against 6.32% for new money).
 */
function ownCost(d: Debt, todayRate: number): { rate: number; indexed: boolean } {
  if (isLinkedPath(d.path) && d.segment === "allPurpose") {
    const r = forecastRate(d);
    if (r !== null) return { rate: r, indexed: true };
  }
  return { rate: todayRate, indexed: false };
}

/**
 * A kept debt's reason. When new money costs more than the debt, that is the
 * reason and it leads, with its two rates; what refinancing would do to the
 * payment follows only as the term's effect or the price's, and a term effect
 * is never presented as a saving (L09: "מחזורו מוסיף ₪2,302 להחזר החודשי וחוסך
 * ₪312,935 מסך התשלומים" of a 4.22% debt against 6.32% money).
 */
function whyKept(ctx: Ctx, d: Debt, f: Flip | undefined, c: FlipCtx, todayRate: number): string {
  const mkt = marketRateFor(ctx, d);
  const own = ownCost(d, todayRate);
  const over = (x: number) => (c.budgetGoal && x > 0.5 && c.monthlyNow + x > c.budget + 0.5 ? `, אל ${nis(c.monthlyNow + x)}, מעל המסגרת של ${nis(c.budget)}` : "");
  if (mkt !== null && mkt > own.rate + 0.05) {
    const out = [
      own.indexed
        ? `עם המדד הצפוי הוא עולה כ-${own.rate.toFixed(2)}% בשנה, וכסף חדש עולה ${mkt.toFixed(2)}%, ולכן הוא נשאר`
        : `הריבית עליו ${own.rate.toFixed(2)}% וכסף חדש עולה ${mkt.toFixed(2)}%, ולכן הוא נשאר`,
    ];
    if (f === null) out.push("מחזורו גם מוציא את התמהיל מהכללים");
    else if (termDriven(d, f)) out.push(`מחזורו בתמהיל הזה היה ${termWords(d, f.term)}, ולכן ההחזר היה ${f.refi > 0 ? "עולה" : "יורד"} ב-${nis(f.refi)}${over(f.refi)}`);
    else if (f && !f.carried && f.monthly >= 1) out.push(`מחזורו היה מעלה את ההחזר ב-${nis(f.monthly)}${over(f.monthly)}${f.paid >= 100 ? ` ומוסיף ${nis(f.paid)} לסך התשלומים` : ""}`);
    if (d.interestOnly) out.push(`זה מסלול ריבית בלבד של ${nis(d.balance)}, והמרתו ללוח שפיצר מעלה את ההחזר`);
    if (d.fee > 0) out.push(feeWords(d));
    return whyOf("", out);
  }
  if (termDriven(d, f)) {
    const pd = Math.abs(f.paid) >= 100 ? ` וסך התשלומים ${f.paid > 0 ? "עולה" : "יורד"} ב-${nis(f.paid)}` : "";
    return whyOf(`מחזורו בתמהיל הזה ${termWords(d, f.term)}, ולכן ההחזר ${f.refi > 0 ? "עולה" : "יורד"} ב-${nis(f.refi)}${over(f.refi)}${over(f.refi) ? "" : pd}`, keepDetail(ctx, d, todayRate));
  }
  return whyOf(flipText(f, false, c), keepDetail(ctx, d, todayRate));
}

/**
 * What moving a debt buys when keeping it is cheaper in the forecast, with its
 * figure: the ceiling a budget goal holds, the payment the payment goal and the
 * relief goals lower, the worst economy the cost goals weigh, the end the years
 * goal reaches. null when none of them needs it.
 */
function movedFor(d: Debt, f: NonNullable<Flip>, c: FlipCtx): string | null {
  const up = f.monthly;
  const relief = c.goal === "balanced" || c.goal === "consolidate";
  if (c.budgetGoal && !relief && up > 0.5 && c.monthlyNow + up > c.budget + 0.5) return `מחזורו נדרש כדי שההחזר יישאר במסגרת של ${nis(c.budget)}: בלעדיו ההחזר ${nis(c.monthlyNow + up)}`;
  if (c.goal === "payment" && up >= 1) return `מחזורו נדרש להחזר הנמוך: בלעדיו ההחזר גבוה ב-${nis(up)}`;
  if (relief && up >= 1) return `מחזורו נדרש להקלה בהחזר: בלעדיו ההחזר גבוה ב-${nis(up)}`;
  const w = f.paidBy?.[c.worstK];
  if (w !== undefined && w >= 100) return `מחזורו נדרש להגנה מפני תרחיש גרוע: בו השארתו עולה ${nis(w)} יותר`;
  if (c.goal === "years" && d.months > c.months) return `מחזורו נדרש לקיצור: היום הוא נגמר בעוד ${yrs(d.months)}, אחרי סוף התמהיל בעוד ${yrs(c.months)}`;
  // קיצור שנים holds the payment near the lowest that reaches its end: a debt
  // whose payment the move lowers funds the shortening (r02: short loans folded in).
  if (c.goal === "years" && up >= 1) return `מחזורו נדרש לקיצור במסגרת ההחזר: בלעדיו ההחזר גבוה ב-${nis(up)}`;
  return c.keepTest(d);
}

/**
 * The goal's own problem with this one debt kept, everything else held (its
 * terms, the other decisions, every cap): what the move buys when no single
 * figure above says it. Rules → it is needed for them; a worse objective → by
 * how much. A keep that is no worse returns null: the move is the search's
 * choice between equals, and the "why" lint reports it.
 */
function keepTest(ctx: Ctx, goal: GoalId, solved: Solved, plan: Plan, d: Debt): string | null {
  if (!solved.spec || !plan.ok) return null;
  const keys = new Set(Object.keys(plan.amounts));
  const p = solveOnce(ctx.debts, (solved.cols ?? ctx.cols).filter((c) => keys.has(c.key)), { ...solved.spec, fixZ: plan.refinance.filter((id) => id !== d.id) });
  if (!p.ok) return "מחזורו נדרש כדי שהתמהיל יעמוד בכללים ובמסגרת שלו";
  if (KEEP_SLIVER.get(plan)?.includes(d.id)) return "מחזורו נדרש כדי שהכסף החדש לא יתפצל למסלול קטן נוסף";
  const worse = p.objective - plan.objective;
  // A mix adopted from another goal (the display order) moves what THAT goal needed.
  const from = typeof solved.meta?.adopted === "string" ? (solved.meta.adopted as GoalId) : null;
  if (from && from !== goal) return `מחזורו נדרש לתמהיל של יעד "${LABEL[from]}", שמוצג גם כאן כי ${goal === "payment" ? "ההחזר בו נמוך יותר" : "העלות בו בלוח נמוכה יותר"}`;
  if (!(worse > 1e-6 * Math.max(1, Math.abs(plan.objective)))) return null;
  return solved.spec.wMonthly > 0
    ? `מחזורו נדרש להחזר הנמוך: בלעדיו ההחזר גבוה ב-${nis(worse)}`
    : `מחזורו נדרש כי בלעדיו העלות, בתחזית ובתרחישי הלחץ יחד, גבוהה בכ-${nis(worse * U)}`;
}

/**
 * A moved debt's reason. When the term of the new money is what moves the
 * payment, it says so with both terms. When the debt's own rate is below new
 * money's and moving it still saves, the saving's source is named (the
 * indexation of a CPI-linked debt, or the balloon it removes); a saving the
 * engine cannot trace to a source is not claimed.
 */
function whyMoved(ctx: Ctx, d: Debt, f: Flip | undefined, c: FlipCtx, todayRate: number, goal: GoalId): string {
  const detail = moveDetail(ctx, d, todayRate, goal);
  if (!f || f.carried || d.due || d.called) return whyOf(flipText(f, true, c), detail);
  // Moved by the structure: it goes with the whole mortgage, and the sentence is
  // what that does to this debt's own payment and total, net (audit W4).
  if (f.structural) {
    const where = c.variant === "firstLien" ? "למלווה החדש, בשעבוד ראשון" : "לבנק אחר";
    const mo = Math.abs(f.refi ?? 0) >= 1 ? `ההחזר עליו ${(f.refi ?? 0) > 0 ? "עולה" : "יורד"} ב-${nis(f.refi ?? 0)}` : "ההחזר עליו כמעט לא משתנה";
    const term = termDriven(d, f) ? `, כי המחזור ${termWords(d, f.term)}` : "";
    const pd = Math.abs(f.paid) >= 100 ? `, וסך התשלומים עליו ${f.paid > 0 ? "יורד" : "עולה"} ב-${nis(f.paid)}` : "";
    return whyOf(`הוא עובר עם כל המשכנתא ${where}: ${mo}${term}${pd}`, detail);
  }
  // Moved although keeping it is cheaper in the forecast: the sentence names
  // what the move buys, with its figure (audit P2: L44 balanced moved a 3.03%
  // קל"צ while saying "השארתו … חוסכת ₪222,523"; r02 moved three short loans
  // at 3.7–4.75% into 17-year money, each freeing about ₪200 of the payment).
  if (f.paid <= -100) {
    const buys = movedFor(d, f, c);
    const cost = termDriven(d, f)
      ? `מחזורו ${termWords(d, f.term)}, ולכן ההחזר ${f.refi > 0 ? "עולה" : "יורד"} ב-${nis(f.refi)} וסך התשלומים עליו עולה ב-${nis(f.paid)}`
      : `השארתו הייתה חוסכת ${nis(f.paid)} מסך התשלומים`;
    return whyOf(buys ?? "", [cost, ...detail]);
  }
  if (termDriven(d, f)) {
    const pd = Math.abs(f.paid) >= 100 ? `, וסך התשלומים ${f.paid > 0 ? "יורד" : "עולה"} ב-${nis(f.paid)}` : "";
    return whyOf(`מחזורו ${termWords(d, f.term)}, ולכן ההחזר ${f.refi > 0 ? "עולה" : "יורד"} ב-${nis(f.refi)}${pd}`, detail);
  }
  const mkt = marketRateFor(ctx, d);
  if (mkt !== null && mkt > todayRate + 0.05 && f.paid >= 100) {
    const own = ownCost(d, todayRate);
    const source = own.indexed && own.rate > mkt
      ? `החיסכון בא מההצמדה: עם המדד הצפוי הוא עולה כ-${own.rate.toFixed(2)}% בשנה, יותר מ-${mkt.toFixed(2)}% לכסף חדש`
      : d.interestOnly
        ? "החיסכון בא מפירעון הקרן כל חודש במקום בתשלום אחד בסוף, ולא מריבית זולה יותר"
        : null;
    return source ? whyOf(flipText(f, true, c), [source, ...detail]) : whyOf(flipText({ ...f, paid: 0 }, true, c), detail);
  }
  return whyOf(flipText(f, true, c), detail);
}

/** What a "why" needs of its proposal: the payment, the ceiling it held, the goal, its end, its worst economy, its structure. */
type FlipCtx = { monthlyNow: number; budget: number; budgetGoal: boolean; goal: GoalId; months: number; worstK: number; variant: Variant; keepTest: (d: Debt) => string | null };

/** The measured effect of one decision, as one sentence (no full stop). */
function flipText(f: Flip | undefined, moved: boolean, c: FlipCtx): string {
  if (f === undefined) return "";
  if (f === null) return moved ? "בלעדיו אין תמהיל שעומד בכללים" : "מחזורו מוציא את התמהיל מהכללים";
  if (f.carried) return `פירעונו מהכסף החדש מוסיף ${nis(f.monthly)} להחזר החודשי ו-${nis(f.paid)} לסך התשלומים`;
  if (!moved && c.budgetGoal && f.monthly > 0.5 && c.monthlyNow + f.monthly > c.budget + 0.5)
    return `מחזורו מעלה את ההחזר ב-${nis(f.monthly)}, אל ${nis(c.monthlyNow + f.monthly)}, מעל המסגרת של ${nis(c.budget)}`;
  // "השארתו" takes feminine verbs, "מחזורו" masculine ones.
  const v = moved ? { add: "מוסיפה", cut: "מורידה", save: "חוסכת" } : { add: "מוסיף", cut: "מוריד", save: "חוסך" };
  const mo = Math.abs(f.monthly) >= 1 ? { up: f.monthly > 0, text: f.monthly > 0 ? `${nis(f.monthly)} להחזר החודשי` : `${nis(f.monthly)} מההחזר החודשי` } : null;
  const pd = Math.abs(f.paid) >= 100 ? { up: f.paid > 0, text: f.paid > 0 ? `${nis(f.paid)} לסך התשלומים` : `${nis(f.paid)} מסך התשלומים` } : null;
  const who = moved ? "השארתו" : "מחזורו";
  if (!mo && !pd) return moved ? "השארתו כמעט לא משנה, והוא נכלל כדי לפשט את התמהיל" : "מחזורו כמעט לא משנה";
  const verb = (x: { up: boolean }, isPaid: boolean) => (x.up ? v.add : isPaid ? v.save : v.cut);
  if (mo && pd) {
    // One verb for both when they go the same way ("מוסיפה ₪257 להחזר החודשי ו-₪131,040 לסך התשלומים").
    if (mo.up === pd.up && mo.up) return `${who} ${v.add} ${mo.text} ו-${pd.text}`;
    return `${who} ${verb(mo, false)} ${mo.text} ו${verb(pd, true)} ${pd.text}`;
  }
  const one = (mo ?? pd)!;
  return `${who} ${verb(one, !mo)} ${one.text}`;
}

/**
 * Why a debt cheaper than new money (rules.ts CHEAP_KEEP) is moved after all:
 * what keeping the cheap debts would cost this goal, with its figure.
 */
function liftWords(by: number, goal: GoalId, gain: number | undefined, atLeast = false, fromSavings = false): string {
  const cheap = `הוא זול מכסף חדש ב-${by.toFixed(2)} נקודות האחוז`;
  if (gain === undefined) return `${cheap}, אבל בלי לגעת בחובות הזולים אין ליעד הזה תמהיל שעומד בכללים`;
  // מאוזן follows the saving goal: the figure is what holding costs the cheapest mix, said as that.
  if (fromSavings) return `${cheap}, ובכל זאת כדאי לגעת בו: גם התמהיל החסכוני ביותר שמשאיר את החובות הזולים עולה ${atLeast ? "לפחות " : "בכ-"}${nis(gain)} יותר, בתחזית ובתרחישי הלחץ יחד`;
  return goal === "years"
    ? `${cheap}, ובכל זאת כדאי לגעת בו: התמהיל שמשאיר את החובות הזולים נגמר ${atLeast ? "לפחות " : ""}${Math.round(gain)} חודשים מאוחר יותר`
    : `${cheap}, ובכל זאת כדאי לגעת בו: התמהיל שמשאיר את החובות הזולים עולה ${atLeast ? "לפחות" : "בכ-"}${atLeast ? " " : ""}${nis(gain)} יותר, בתחזית ובתרחישי הלחץ יחד`;
}

/** A debt's reason: the measured effect, then the figures behind it — plain sentences. */
function whyOf(effect: string, detail: string[]): string {
  const sentences = [effect, ...detail].filter(Boolean);
  return sentences.map((x) => `${x}.`).join(" ");
}

const shareOfTrack = (m: MixMetrics, t: TrackKey) => m.shares.find((s) => s.track === t)?.share ?? 0;

/** The rate a debt actually costs today (forecast month one): prime re-anchored to today's prime. */
function effectiveRate(d: Debt): number {
  if (d.path === 1 && d.row.anchor_margin !== null && d.row.anchor_margin !== undefined && Number.isFinite(Number(d.row.anchor_margin))) {
    const prime = primeOn(toIso(startOfToday()));
    if (prime !== null) return prime + Number(d.row.anchor_margin);
  }
  return d.rate;
}

/**
 * What new money of this debt's kind costs this client, %: the same track and
 * term for housing debt; for all-purpose debt the cheaper of all-purpose prime
 * and קל"צ, both unlinked. A CPI-linked all-purpose debt is therefore compared at
 * its forecast all-in rate (ownCost, compareWords), never at its stated real rate.
 */
function marketRateFor(ctx: Ctx, d: Debt): number | null {
  const track = TRACK_OF[d.path];
  if (!track) return null;
  const years = Math.max(MIN_YEARS[track], Math.min(ctx.maxYears, Math.round(d.months / 12)));
  if (d.segment === "allPurpose") {
    const y = Math.min(ctx.apYears, Math.max(4, years));
    return Math.min(ctx.pricing.rate("prime", y, "allPurpose").rate, ctx.pricing.rate("klz", y, "allPurpose").rate);
  }
  if (!ctx.pricing.tier.tracks.includes(track)) return null;
  return ctx.pricing.rate(track, years, "housing").rate;
}

const feeWords = (d: Debt) => (d.fee > 0 ? `עמלת הפירעון ${nis(d.fee)}${d.feeEstimated ? " בהערכה" : ""}` : d.group === "mortgage" ? "אין עמלת היוון" : "");
const rateWords = (todayRate: number, mkt: number | null) => (mkt === null ? "" : `הריבית היום ${todayRate.toFixed(2)}% מול ${mkt.toFixed(2)}% לכסף חדש`);
/** A debt against new money in one sentence, like for like (a CPI-linked all-purpose debt at its forecast all-in rate: new all-purpose money is unlinked). */
function compareWords(ctx: Ctx, d: Debt, todayRate: number): string {
  const own = ownCost(d, todayRate);
  const mkt = marketRateFor(ctx, d);
  return own.indexed && mkt !== null ? `עם המדד הצפוי הוא עולה כ-${own.rate.toFixed(2)}% בשנה מול ${mkt.toFixed(2)}% לכסף חדש` : rateWords(todayRate, mkt);
}

function keepDetail(ctx: Ctx, d: Debt, todayRate: number): string[] {
  const out: string[] = [];
  if (d.interestOnly) out.push(`זה מסלול ריבית בלבד של ${nis(d.balance)}, והמרתו ללוח שפיצר מעלה את ההחזר`);
  out.push(compareWords(ctx, d, todayRate));
  if (d.fee > 0) out.push(feeWords(d));
  return out;
}

function moveDetail(ctx: Ctx, d: Debt, todayRate: number, goal: GoalId): string[] {
  if (d.called) return ["בפיגור של 90 יום ומעלה, והמלווה מעמיד אותו לפירעון מלא", compareWords(ctx, d, todayRate)];
  if (d.due)
    return [
      d.due.kind === "past-due" ? "מועד פירעונו חלף והוא עומד לפירעון מיידי" : d.due.kind === "enforcement" ? "תיק בהוצאה לפועל שנפרע ונסגר" : "חוב בפיגור מחוץ לתמהיל, לפירעון מיידי",
      "היום לא משולם עליו דבר",
      d.rate > 0 ? `הריבית בדוח ${d.rate.toFixed(2)}%` : "",
    ];
  if (d.zak)
    return [
      `הלוואת זכאות בריבית מסובסדת של ${d.rate.toFixed(2)}%, נפרעת והסבסוד אובד`,
      feeWords(d),
      goal === "years" ? `היום היא נגמרת בעוד ${yrs(d.months)}, וכל עוד היא נשארת החוב לא נגמר לפני כן` : `ההחזר עליה היום ${nis(d.monthly)} בחודש, עד ${yrs(d.months)}`,
    ];
  const out: string[] = [compareWords(ctx, d, todayRate), feeWords(d)];
  if (d.interestOnly) out.push("המסלול עובר מריבית בלבד לפירעון קרן חודשי");
  if (d.group === "mortgage" && d.segment === "allPurpose") out.push("מטרתו כל מטרה, ולכן הוא ממוחזר ככסף לכל מטרה");
  if (goal === "years") out.push(`היום הוא נגמר בעוד ${yrs(d.months)}`);
  if (d.group === "loan") out.push(`ההחזר עליו היום ${nis(d.monthly)} בחודש`);
  return out;
}

function reasonsOf(ctx: Ctx, goal: GoalId, book: Book, tranches: NewTranche[], refi: Set<string>, fPaidDelta: number, worstDelta: number, be: number | null, switchCost: number, solved: Solved): string[] {
  const t = ctx.today.metrics;
  const m = book.metrics;
  const out: string[] = [];
  const moved = ctx.debts.filter((d) => refi.has(d.id));
  // Arrears on a kept debt, brought current from new money (override).
  const cured = ctx.debts.filter((d) => !refi.has(d.id) && !d.forced && (d.cure ?? 0) > 0);
  if (!moved.length && !cured.length) return [`התמהיל הנוכחי נשאר כמות שהוא, ${nis(t.monthly)} בחודש למשך ${yrs(t.months)}.`];
  const dm = m.monthly - t.monthly;
  // THE COST COLUMN. The sheet shows the typed cost (interest + indexation). When
  // it and the forecast disagree in sign, or a goal that claims a cost result
  // shows a HIGHER typed cost than today, the first reason says so, with both figures.
  // With debt due now both are measured from the reference (today + clearing it).
  const R = ctx.ref;
  const typedCost = m.totalCost - R.typedCost;
  const forecastCost = book.paid[0] - (m.totalPaid - m.totalCost) - (R.paid - (R.typedPaid - R.typedCost));
  const way = (x: number) => (x > 0 ? "עולות" : "יורדות");
  const disagree = Math.abs(typedCost) >= 1000 && Math.abs(forecastCost) >= 1000 && Math.sign(typedCost) !== Math.sign(forecastCost);
  const costClaim = goal === "savings" || goal === "balanced" || goal === "stable";
  // Within the neutral residue (rules.ts MATERIAL.neutral) two totals are the same cost.
  const neutral = MATERIAL.neutral(R.paid);
  let lead = "";
  if (disagree)
    lead = `בלוח התמהיל, לפי הריבית המוקלדת, הריבית וההצמדה ${way(typedCost)} ב-${nis(typedCost)}, ובתחזית בנק ישראל הן ${way(forecastCost)} ב-${nis(forecastCost)}.`;
  else if (costClaim && typedCost > neutral) {
    // Stability's price is said against what it buys, in payment.
    const s = goal === "stable" ? stabilityOf(R.book ?? ctx.today, R.monthly, book, m.monthly) : null;
    lead = `הריבית וההצמדה בלוח עולות ב-${nis(typedCost)}${forecastCost > 0 ? `, ובתחזית ב-${nis(forecastCost)}` : ""}${s ? `, תמורת החזר שבתרחיש הגרוע לא עולה על ${nis(s.next)} במקום ${nis(s.now)}` : ""}.`;
  }
  // With debt due now the end is measured from the reference, whose last payment clears it.
  const end =
    R.due > 0
      ? m.months === R.months
        ? `החוב כולו נגמר בעוד ${yrs(m.months)}`
        : `החוב כולו נגמר בעוד ${yrs(m.months)} במקום ${yrs(R.months)} בהחזר הנמוך ביותר שמסלק את החוב העומד לפירעון`
      : m.months === t.months
        ? `החוב נגמר באותו מועד, בעוד ${yrs(m.months)}`
        : `החוב כולו נגמר בעוד ${yrs(m.months)} במקום ${yrs(t.months)}`;
  const mix = tranches.map((x) => `${TRACK_SHORT[x.track]}${x.segment === "allPurpose" ? " לכל מטרה" : ""} ${nis(x.amount)} ל-${x.years} שנים ב-${x.rate.toFixed(2)}%`).join(", ");
  const cureSum = sum(cured.map((d) => d.cure ?? 0));
  const cureWords = cured.length ? `${cured.map((d) => d.label).join(", ")} נשאר${cured.length > 1 ? "ים" : ""}, והפיגור ${cured.length > 1 ? "בהם" : "בו"}, ${nis(cureSum)}, נפרע מהכסף החדש` : "";
  // Debt due now is paid off, not refinanced.
  const payOff = moved.every((d) => d.due || d.called);
  const mixLine = moved.length
    ? `${payOff ? "פורעים" : "ממחזרים"} ${moved.length === 1 ? "חוב אחד" : `${moved.length} חובות`} בסך ${nis(sum(moved.map((d) => d.balance)))} ${payOff ? "מכסף חדש" : "לכסף חדש"}: ${mix}.${cured.length ? ` ${cureWords}.` : ""}`
    : `${cureWords}: ${mix}.`;
  const costs = switchCost > 0 ? `, כולל עמלות ועלויות מעבר של ${nis(switchCost)}${fPaidDelta < 0 && be !== null ? (be === 0 ? " שחוזרות מיד" : ` שחוזרות תוך ${be} חודשים`) : ""}` : "";
  const totals =
    R.due > 0 && Math.abs(fPaidDelta) < 1
      ? `בתחזית בנק ישראל משלמים בסך הכול ${nis(book.paid[0])}${costs}. זה התמהיל שההשוואה נמדדת מולו, ההחזר הנמוך ביותר שמסלק את החוב העומד לפירעון.`
      : Math.abs(fPaidDelta) <= neutral
        ? `בתחזית בנק ישראל סך התשלומים נשאר כמו ${R.due > 0 ? "בתמהיל של היום ונשיאת החוב שעומד לפירעון" : "היום"}, ${nis(book.paid[0])}${costs}.`
        : `בתחזית בנק ישראל משלמים בסך הכול ${nis(book.paid[0])} במקום ${nis(R.paid)}${R.due > 0 ? ` (${refWords(R)})` : ""}, ${fPaidDelta <= 0 ? `חיסכון של ${nis(fPaidDelta)}` : `תוספת של ${nis(fPaidDelta)}`}${costs}.`;
  if (goal === "payment" && fPaidDelta > neutral && dm < 0) {
    // The lowest payment says its price first, in words.
    const costNow = ctx.today.paid[0] - t.balance;
    const costNew = book.paid[0] - m.balance;
    out.push(
      `ההחזר יורד ב-${nis(dm)} בחודש, אל ${nis(m.monthly)}, והמחיר הוא ${nis(fPaidDelta)} יותר בסך התשלומים בתחזית${costNow > 0 ? ` (הריבית וההצמדה שנותרו גדלות פי ${(costNew / costNow).toFixed(1)})` : ""}.`
    );
    out.push(mixLine);
    out.push(`${end}.`);
  } else {
    out.push(mixLine);
    out.push(dm === 0 ? `ההחזר החודשי נשאר ${nis(m.monthly)}, ו${end}.` : `ההחזר החודשי ${dm < 0 ? "יורד" : "עולה"} מ-${nis(t.monthly)} ל-${nis(m.monthly)}, ו${end}.`);
    out.push(totals);
  }
  if (goal === "balanced" || goal === "savings") {
    const w = (b: Book) => Math.max(...b.paid.slice(1));
    out.push(`בתרחיש הגרוע מבין ארבעת תרחישי הלחץ משלמים ${nis(w(book))} במקום ${nis(w(R.book ?? ctx.today))}${R.book ? " בתמהיל של היום ונשיאת החוב שעומד לפירעון" : " היום"}.`);
  }
  // Stability says what it promises, in payment.
  if (goal === "stable") {
    const s = stabilityOf(R.book ?? ctx.today, R.monthly, book, m.monthly);
    out.push(`בתרחיש הלחץ הקשה ביותר ההחזר הגבוה ביותר לאורך כל התקופה הוא ${nis(s.next)}, מול ${nis(s.now)} בתמהיל של ${R.book ? "היום ונשיאת החוב שעומד לפירעון" : "היום"}.`);
  }
  const g = guardLine(ctx, goal, solved, book);
  if (g) out.push(g);
  // מאוזן says first what it balances: its share of the free relief and of the most saving.
  if (goal === "balanced") {
    const s = balancedSentence(ctx, solved, R.monthly - m.monthly, R.paid - book.paid[0]);
    if (s) out.unshift(s);
  }
  // Repaying a state-eligibility loan gives up its subsidy: say what it is worth.
  // The value of a below-market loan = its balance less the present value of its
  // remaining payments (forecast) at what new money of the same track and term
  // costs this client (nominal: a CPI-linked rate plus the typed inflation). An
  // estimate. Summing the payments instead overstated it (r04: ₪257k vs ₪91k).
  const zakMoved = moved.filter((d) => d.zak && !d.forced);
  if (zakMoved.length) {
    const extra = sum(
      zakMoved.map((d) => {
        const track = TRACK_OF[Number(d.row.path_id)];
        if (!track || !ctx.pricing.tier.tracks.includes(track)) return 0;
        const y = Math.max(MIN_YEARS[track], Math.min(ctx.maxYears, Math.round(d.months / 12)));
        const r = ctx.pricing.rate(track, y, "housing").rate + (isLinkedPath(Number(d.row.path_id)) ? ctx.input.inflation : 0);
        const pay = d.priced.pay[0] ?? [];
        return Math.max(0, d.balance - pvOf(pay.map((x, i) => (i === 0 ? d.priced.typedMonthly : x)), r));
      })
    );
    const bal = sum(zakMoved.map((d) => d.balance));
    const last = Math.max(...zakMoved.map((d) => d.months));
    out.splice(
      Math.min(1, out.length),
      0,
      `${zakMoved.length === 1 ? "הלוואת הזכאות" : `${zakMoved.length} הלוואות הזכאות`}, ${nis(bal)}, ${zakMoved.length === 1 ? "נפרעת" : "נפרעות"}, ${goal === "years" ? `כי בלעדיהן החוב לא נגמר לפני ${yrs(last)}` : "כי ההחזר עליהן כבד"}. ${extra >= 1000 ? `הסבסוד שאובד שווה כ-${nis(extra)} בערך נוכחי, בריבית שכסף חדש מאותו סוג עולה ללקוח (הערכה).` : "הסבסוד שאובד זניח."}`
    );
  }
  if (goal === "years" && typeof solved.meta?.atStretch === "number" && typeof solved.meta?.stretchBudget === "number") {
    const B0 = ctx.budget;
    const B1 = solved.meta.stretchBudget;
    const T0 = typeof solved.meta.atToday === "number" ? solved.meta.atToday : null;
    const T1 = solved.meta.atStretch;
    if (solved.meta.stretched)
      out.push(
        T0 !== null
          ? `במסגרת של היום, ${nis(B0)}, החוב היה נגמר בעוד ${yrs(T0)}. תקרה גבוהה ב-${nis(B1 - B0)} בחודש (עד ${Math.round(YEARS_STRETCH * 100)}% יותר) מקצרת אותו ל-${yrs(T1)}.`
          : `במסגרת של היום, ${nis(B0)}, אין תמהיל שמקצר את החוב. בתקרה של ${nis(B1)} (עד ${Math.round(YEARS_STRETCH * 100)}% יותר) הוא נגמר בעוד ${yrs(T1)}.`
      );
    else if (T0 !== null && T0 > T1)
      out.push(`תקרה גבוהה עד ${Math.round(YEARS_STRETCH * 100)}%, ${nis(B1)}, הייתה מקצרת רק ב-${T0 - T1} חודשים, פחות משנה, ולכן ההחזר נשאר במסגרת של היום, ${nis(B0)}.`);
  }
  if (goal === "payment" && typeof solved.meta?.adopted === "string") out.push(`זה התמהיל של יעד "${LABEL[solved.meta.adopted as GoalId]}", שמגיע להחזר הנמוך ביותר מכל היעדים, ${nis(book.metrics.monthly)} בחודש.`);
  // Debt due now: today's החזר חודשי leaves it out, and every "versus today" figure says so.
  if (ctx.ref.due > 0) out.unshift(dueSentence(ctx));
  if (lead) out.unshift(lead);
  return out.slice(0, 5);
}

/**
 * The guard a proposal's own rows hold on every month 1–60 in every economy:
 * the absolute guard at the goal's cap, else the relative guard the solve held,
 * else none (Proposal.guard). Only what the rows hold is stated as a promise.
 */
function guardOf(ctx: Ctx, goal: GoalId, solved: Solved, book: Book): Proposal["guard"] {
  if (goal !== "payment" && goal !== "balanced" && goal !== "years") return undefined;
  const c = goal === "years" ? ceilingOf(ctx, goal, solved) : ctx.ref.monthly;
  const abs: Guard = { kind: 1, caps: ECON.map(() => c) };
  if (guardHolds(book, abs)) return { kind: "absolute", caps: abs.caps.map(Math.ceil), holds: true };
  const imposed = solved.guard;
  if (imposed?.kind === 2) return { kind: "relative", caps: imposed.caps.map(Math.ceil), holds: guardHolds(book, imposed) };
  if (imposed?.kind === 1) return { kind: "absolute", caps: abs.caps.map(Math.ceil), holds: false };
  // A mix adopted from another goal (the display order) is measured on its own rows.
  const rel = guardTiers(ctx, c).find((x) => x.kind === 2);
  if (rel && guardHolds(book, rel)) return { kind: "relative", caps: rel.caps.map(Math.ceil), holds: true };
  return { kind: "none", caps: abs.caps.map(Math.ceil), holds: false };
}

/** The guard's sentence for the payment goal and קיצור שנים, stated only as strongly as the rows hold it. */
function guardLine(ctx: Ctx, goal: GoalId, solved: Solved, book: Book): string | null {
  if (goal !== "payment" && goal !== "years") return null;
  const g = guardOf(ctx, goal, solved, book);
  if (!g || g.kind === "none") return null;
  const peak = Math.max(...peak5Of(book));
  const c = g.caps[0];
  const today = ctx.ref.due > 0 ? `${nis(ctx.ref.monthly)}, ההחזר של היום כולל נשיאת החוב שעומד לפירעון` : `${nis(ctx.ref.monthly)} שמשלמים היום`;
  const cap = goal === "years" ? `התקרה של ${nis(c)}` : today;
  if (g.kind === "absolute" && g.holds) return `בחמש השנים הקרובות, גם בתרחיש הלחץ הקשה ביותר, ההחזר לא עולה על ${cap}.`;
  if (g.kind === "relative" && g.holds) {
    const todayPeak = Math.max(...refPeak5(ctx));
    return `התמהיל של היום עצמו עולה בתרחישי הלחץ עד ${nis(todayPeak)} בחמש השנים הקרובות. בכל תרחיש התמהיל הזה לא עולה על מה שהתמהיל של היום היה מגיע אליו באותו תרחיש, ובתרחיש הקשה ביותר הוא מגיע לכל היותר ל-${nis(peak)}.`;
  }
  return `בחמש השנים הקרובות, בתרחיש הלחץ הקשה ביותר, ההחזר מגיע לכל היותר ל-${nis(peak)}, מול ${cap}.`;
}

/**
 * The reference a saving is claimed against when debt is due now, named in the
 * same sentence (audit P5: r05 years "saves ₪950,837" against a 30-year loan at
 * a grade-D price, with no word of what it was measured from).
 */
function refWords(R: Ctx["ref"]): string {
  const loan = R.carryYears > 0 ? `, בהלוואה ל-${R.carryYears} שנים${R.carryRate !== undefined ? ` ב-${R.carryRate.toFixed(2)}%` : ""}` : "";
  return `התמהיל של היום ונשיאת החוב שעומד לפירעון, ${nis(R.due)}${loan}`;
}

/** What is due now and what the comparison is measured from, in one or two sentences (override). */
function dueSentence(ctx: Ctx): string {
  const t = ctx.today.metrics;
  const R = ctx.ref;
  const items = ctx.debts.filter((d) => d.due);
  const called = ctx.debts.filter((d) => d.called);
  const cures = ctx.debts.filter((d) => !d.forced && (d.cure ?? 0) > 0);
  const parts: string[] = [];
  if (items.length)
    parts.push(
      t.monthly > 0
        ? `${nis(sum(items.map((d) => d.balance)))} עומדים לפירעון מיידי ואינם בהחזר של היום (${nis(t.monthly)})`
        : `${nis(sum(items.map((d) => d.balance)))} עומדים לפירעון מיידי, והיום לא משולם עליהם דבר`
    );
  if (called.length)
    parts.push(
      `${called.map((d) => d.label).join(", ")} בפיגור של 90 יום ומעלה, והמלווה מעמיד את ${called.length > 1 ? "יתרתם" : "יתרתו"}, ${nis(sum(called.map((d) => d.balance)))}, לפירעון מלא`
    );
  if (cures.length) parts.push(`${nis(sum(cures.map((d) => d.cure ?? 0)))} בפיגור על ${cures.map((d) => d.label).join(", ")} נפרעים כדי שההלוואה תמשיך`);
  // On a first lien the mortgage is cleared in full, its arrears with it: the
  // reference (shared by every structure) still counts them, so say where they went.
  const moot = R.due - sum(items.map((d) => d.balance)) - sum(called.map((d) => d.balance)) - sum(cures.map((d) => d.cure ?? 0));
  if (moot > 0.5) parts.push(`${nis(moot)} בפיגור על המשכנתא נפרעים עם פירעונה המלא`);
  const total = parts.length > 1 ? `, ובסך הכול ${nis(R.due)}` : "";
  const versus =
    items.length && !called.length && !cures.length
      ? `ההשוואה היא מול התמהיל של היום ועוד ההלוואה בהחזר הנמוך ביותר שמסלקת את החוב הזה, כלומר ${nis(R.monthly)} בחודש.`
      : `ההשוואה היא מול הדרך לסלק זאת בהחזר החודשי הנמוך ביותר, ${nis(R.monthly)} בחודש.`;
  return `${parts.join(", ")}${total}. ${versus}`;
}

/** Days since the debt was given (its start date), or null when the row has none. */
function ageOf(d: Debt): number | null {
  const s = d.row.source_start_date ? parseDate(d.row.source_start_date) : null;
  if (!s) return null;
  const days = (startOfToday().getTime() - s.getTime()) / 864e5;
  return days >= 0 ? days : null;
}

/**
 * Why the board's typed read-out and the BoI forecast disagree on a proposal's
 * total, attributed from the rows that change (a kept row is the same on both
 * sides and cancels): a prime row printed at the report day's prime, prime and
 * the five-year tracks moving along the curve, and CPI against the board's
 * typed inflation. Audit W6: the caveat blamed "פריים שהודפסו בפריים של יום
 * הדוח" on 844 proposals, 485 of them in builds with no such row (L02 payment:
 * the מ"צ rows' resets +₪141,341 and prime on the forward curve +₪95,211).
 */
function gapWords(ctx: Ctx, rows: ImportedLoan[], refi: Set<string>, gap: number): string {
  const generic = "ההפרש נובע מכך שהלוח מחזיק את הריבית והמדד כפי שהוקלדו, ותחזית בנק ישראל מזיזה את הפריים, את המסלולים המשתנים כל חמש שנים ואת המדד לפי ציפיות השוק.";
  if (ctx.ref.due > 0 || Math.abs(gap) < 1) return generic;
  const prime = primeOn(toIso(startOfToday()));
  const parts = { stale: 0, prime: 0, bond: 0, cpi: 0 };
  const add = (l: ImportedLoan, sign: number) => {
    if (!(Number(l.months) > 0) || !(Number(l.amount) > 0)) return;
    const typed = typedRow(l, ctx.input.inflation).totalPaid;
    const g = typed - scheduleIn(l, ctx.f, ECON[0]).totalPaid;
    const path = Number(l.path_id);
    if (path === 1) {
      const mg = Number(l.anchor_margin);
      const stale =
        prime !== null && l.anchor_margin !== null && l.anchor_margin !== undefined && Number.isFinite(mg) && Math.abs(Number(l.rate) - (prime + mg)) >= 0.1
          ? typed - typedRow({ ...l, rate: round2(prime + mg) }, ctx.input.inflation).totalPaid
          : 0;
      parts.stale += sign * stale;
      parts.prime += sign * (g - stale);
    } else if (path === 4 || path === 5) parts.bond += sign * g;
    else if (path === 3) parts.cpi += sign * g;
  };
  for (const d of ctx.debts) if (refi.has(d.id)) add(d.row, -1);
  for (const r of owedOnly(rows)) if (r.source_type === AUTOMIX_SOURCE) add(r, 1);
  const words: Record<keyof typeof parts, string> = {
    stale: "משורות פריים שהודפסו בפריים של יום הדוח, ולא בפריים של היום",
    prime: "מהפריים, שהלוח מחזיק כמו היום ותחזית בנק ישראל מזיזה לפי העקום",
    bond: "מהמסלולים המשתנים כל חמש שנים, שהתחזית מעדכנת לפי העקום",
    cpi: `מהמדד, שהלוח מחשב ב-${ctx.input.inflation}% בשנה והתחזית לפי ציפיות האינפלציה`,
  };
  const top = (Object.keys(parts) as (keyof typeof parts)[])
    .filter((k) => Math.sign(parts[k]) === Math.sign(gap) && Math.abs(parts[k]) >= 0.25 * Math.abs(gap))
    .sort((a, b) => Math.abs(parts[b]) - Math.abs(parts[a]))
    .slice(0, 2);
  if (!top.length) return generic;
  return `ההפרש נובע בעיקר ${words[top[0]]}${top[1] ? ` ו${words[top[1]]}` : ""}.`;
}

function caveatsOf(ctx: Ctx, goal: GoalId, book: Book, refi: Set<string>, fPaidDelta: number, delta: Proposal["delta"], solved: Solved, rows: ImportedLoan[] = []): string[] {
  const out: string[] = [];
  const moved = ctx.debts.filter((d) => refi.has(d.id));
  const tier = ctx.pricing.tier;
  if (tier.tier !== "bank") out.push(`תמחור ${tier.tier === "nonbank" ? "של גוף חוץ־בנקאי" : `של בנק בתוספת סיכון של ${tier.premium.toFixed(2)} נק׳`}. ${tier.why} יש לאמת מול המלווה.`);
  else if (tier.smaller) {
    // The tier was read for the whole refinance. A mix that borrows much less is
    // the size of the loans the client paid a premium on: say so, with the figure.
    const lent = sum(Object.values(solved.plan.amounts ?? {}));
    const alike = tier.smaller.events.filter((e) => e.orig >= EVENT_SHARE * lent);
    if (lent > 0 && alike.length) {
      const lvl = alike.reduce((a, e) => a + e.excess * Math.max(1, e.orig), 0) / alike.reduce((a, e) => a + Math.max(1, e.orig), 0);
      if (lvl >= PREMIUM_EVIDENCE)
        out.push(
          `הכסף החדש בתמהיל הזה ${nis(lent)}, והלוואות המשכנתא של הלקוח בגודל כזה נלקחו ${lvl.toFixed(2)} נק׳ מעל ממוצע הבנקים. התמהיל תומחר בתנאי השוק, ובנק עשוי לתמחר הלוואה בגודל הזה ביוקר יותר. יש לאמת מול המלווה.`
        );
    }
  }
  if (moved.some((d) => d.feeEstimated && d.group === "mortgage" && d.fee > 0))
    out.push("עמלות הפירעון חושבו לפי צו הבנקאות וטבלאות בנק ישראל ואינן מחייבות. יש לבקש מכתב יתרה לסילוק מכל בנק.");
  if (moved.some((d) => d.group === "loan" && d.feeEstimated)) out.push("עמלת פירעון מוקדם על הלוואות צרכניות בריבית קבועה לא חושבה. יש לבקש מכתב יתרה.");
  const cpi = sum(moved.map((d) => d.cpiAveraging));
  if (cpi > 0) out.push(`פירעון המסלולים הצמודים אחרי ה-15 בחודש חוסך עמלת מיצוע מדד של כ-${nis(cpi)} (סעיף 5 לצו).`);
  // The fee order's notice fee is on prepaying a home-secured loan, and not on the
  // part a new loan from the SAME bank refinances (§3(2)); debt due now is paid,
  // not prepaid. It is never charged here (Hapoalim's printed figure is net of it,
  // NOTICE_FEE), so it is said only where it would otherwise be due.
  const internal = ctx.variant === "bank" && !ctx.moveWhole && !!ctx.incumbent;
  if (!internal && moved.some((d) => d.group === "mortgage" && !d.due && !d.called)) out.push("הודעה מוקדמת של 10 ימים לפחות חוסכת עמלה של 0.1% מהסכום (סעיף 3(2) לצו).");
  // A tranche refinanced within a year of being given (audit U6: L35, six weeks).
  const young = moved
    .map((d) => ({ d, age: ageOf(d) }))
    .filter((x): x is { d: Debt; age: number } => x.age !== null && x.age < SEASONING_MONTHS * 30.44 && x.d.group === "mortgage" && !x.d.due);
  if (young.length) {
    const y = young.reduce((a, b) => (b.age < a.age ? b : a));
    const ageWords = y.age < 60 ? `${Math.max(1, Math.round(y.age / 7))} שבועות` : `${Math.round(y.age / 30.44)} חודשים`;
    out.push(
      `${young.length === 1 ? `${y.d.label} ניתן` : `${young.length} מהמסלולים הממוחזרים ניתנו בשנה האחרונה, הצעיר שבהם`} לפני ${ageWords} בלבד. מחזור של משכנתא שניתנה לא מזמן יש לבדוק מול הבנק ומול הלקוח לפני שמציגים אותו.`
    );
  }
  if (moved.some((d) => d.interestOnly)) out.push("מסלולי ריבית בלבד מוחלפים במסלולים שמחזירים קרן כל חודש, ולכן חלק משינוי ההחזר הוא פירעון קרן ולא ריבית.");
  if (moved.some((d) => d.group === "mortgage" && d.segment === "allPurpose")) out.push("מסלולי משכנתא שמטרתם כל מטרה ממוחזרים ככסף לכל מטרה, כפי שבנק מתמחר אותם.");
  const neutral = MATERIAL.neutral(ctx.ref.paid);
  if (goal === "payment" && fPaidDelta > neutral) {
    const relief = ctx.ref.monthly - book.metrics.monthly;
    const yearsOfRelief = relief > 0 ? fPaidDelta / (relief * 12) : Infinity;
    out.push(
      `${ctx.ref.due > 0 ? `ההחזר הנמוך עולה ${nis(fPaidDelta)} יותר בסך הכול מנשיאת החוב לצד התמהיל של היום` : `ההקלה בהחזר עולה ${nis(fPaidDelta)} בסך הכול`}${Number.isFinite(yearsOfRelief) ? `, כ-${yearsOfRelief.toFixed(1)} שנים של ההקלה עצמה` : ""}. יש לומר זאת ללקוח במפורש.`
    );
  }
  if (goal === "consolidate" && solved.meta?.costs && fPaidDelta > neutral) out.push(`איחוד ההלוואות מוריד את ההחזר אבל מייקר את סך התשלומים ב-${nis(fPaidDelta)}, כי הפריסה ארוכה יותר.`);
  // Which five-year guard the rows hold (Proposal.guard): none is said here, and the
  // relative one by מאוזן and קיצור שנים (the payment goal says it in its reasons).
  const guard = guardOf(ctx, goal, solved, book);
  if (guard?.kind === "none")
    out.push(
      goal === "years"
        ? `בתרחיש לחץ ההחזר עלול לעלות בחמש השנים הקרובות מעל התקרה של ${nis(guard.caps[0])}, ואין תמהיל שמונע זאת ומקצר את החוב.`
        : `בתרחיש לחץ ההחזר עלול לעלות בחמש השנים הקרובות מעל ${nis(ctx.ref.monthly)}${ctx.ref.due > 0 ? ", ההחזר של היום כולל נשיאת החוב שעומד לפירעון" : " שמשלמים היום"}, ואין תמהיל שמונע זאת בהחזר הזה.`
    );
  else if (guard?.kind === "relative" && goal !== "payment")
    out.push(
      `התמהיל של היום עצמו עולה בתרחישי הלחץ עד ${nis(Math.max(...refPeak5(ctx)))} בחמש השנים הקרובות, מעל ${goal === "years" ? `התקרה של ${nis(ceilingOf(ctx, goal, solved))}` : `ההחזר של היום, ${nis(ctx.ref.monthly)}`}, ולכן אין תמהיל שנשאר תמיד מתחתיה. התמהיל הזה נבנה כך שבכל תרחיש לא יעלה על מה שהתמהיל של היום היה מגיע אליו באותו תרחיש.`
    );
  const typedPaidDelta = book.metrics.totalPaid - ctx.ref.typedPaid;
  void delta;
  if (Math.abs(typedPaidDelta - fPaidDelta) > Math.max(10_000, 0.2 * Math.abs(fPaidDelta))) {
    const word = (x: number) => (Math.abs(x) <= neutral ? "סך תשלומים כמו היום" : x <= 0 ? `חיסכון של ${nis(x)}` : `תוספת של ${nis(x)}`);
    out.push(
      `לוח התמהיל מחשב לפי הריבית כפי שהוקלדה ומראה ${word(typedPaidDelta)} בסך התשלומים, ותחזית בנק ישראל, בפריים של היום ובתחזית הריבית והמדד, מראה ${word(fPaidDelta)}. ${gapWords(ctx, rows, refi, typedPaidDelta - fPaidDelta)}`
    );
  }
  if (ctx.ref.due > 0) {
    const arrearsCap = (ctx.market.boi.rate + FAIR_CREDIT_SPREAD) * FAIR_CREDIT_ARREARS;
    out.push(
      `החובות העומדים לפירעון נלקחו ביתרה שבדוח. עד הפירעון מצטברת עליהם ריבית פיגורים (עד ${arrearsCap.toFixed(2)}% בשנה לפי חוק אשראי הוגן), ובתיק בהוצאה לפועל גם אגרה של 1% ושכר טרחה של 3% עד 5% ועוד מע"מ, פעם נוספת אם החוב לא שולם. בשנה הראשונה זה כ-${Math.round(DUE_GROWTH.low * 100)}% עד ${Math.round(DUE_GROWTH.high * 100)}% מהחוב (הערכה), כלומר עד ${nis(Math.round((ctx.ref.due * DUE_GROWTH.high) / 1000) * 1000)} יותר. יש לקבל מכתב סילוק מכל נושה, וההלוואה צריכה לכסות את הסכום שבו.`
    );
  }
  // A loan far below what home-secured lenders write: say so, with the setup's share of it.
  const newMoney = sum(Object.values(solved.plan.amounts));
  if (newMoney > 0 && newMoney < SMALL_LOAN && (ctx.ref.due > 0 || tier.tier === "nonbank")) {
    const setup = solved.plan.setupHousing + solved.plan.setupAp;
    out.push(
      `הלוואה של ${nis(newMoney)} קטנה בהרבה מהמקובל בהלוואות בביטחון נכס (בתיק השעבוד השני של מימון ישיר ההלוואה הממוצעת ${nis(408_723)}), ועלויות ההקמה, ${nis(setup)}, הן חלק גדול ממנה. אם אפשר, עדיף לשלם ממקור אחר.`
    );
  }
  if (tier.tier === "nonbank" && tier.grade === "D")
    out.push(
      `לא נמצא מלווה שמציע בפומבי אשראי ללווה בהליך חדלות פירעון. המחיר הוא הגבוה בטווח המפורסם ללווים שבנק מסרב להם (פריים ועוד 10.5), ואת ההיתכנות יש לבדוק מול מלווים לפני שמציגים ללקוח.`
    );
  if (ctx.variant === "secondLien") out.push(`לפני הגשה: ${SECOND_LIEN_CONDITION}.`);
  else if (ctx.variant === "firstLien" && moved.some((d) => d.group === "mortgage")) out.push(`לפני הגשה: ${FIRST_LIEN_CONDITION}.`);
  else if (ctx.moveWhole && moved.some((d) => d.group === "mortgage"))
    out.push(
      `מעבר לבנק אחר מחייב להעביר את כל המשכנתא שבאותו בנק, וכך נבנה התמהיל${ctx.variant === "bankMove" ? ", בתמחור הממוצע של הבנקים (בנק ישראל, TamInt010). הצעה בפועל תלויה בבנק שייבחר" : ""}.${ctx.debts.some((d) => d.group === "mortgage" && d.lock) ? " הלוואת הזכאות נשארת כפי שהיא, ואת העברתה יש לתאם עם הבנק." : ""}`
    );
  else if (moved.some((d) => d.group === "mortgage"))
    out.push(
      ctx.incumbent && (ctx.priceBasis === "incumbent" || ctx.priceBasis === "record" || ctx.priceBasis === "premium")
        ? `התמהיל הוא מחזור פנימי של מסלולים נבחרים בבנק ${BANKS.find((b) => b.id === ctx.incumbent)?.label}, ולכן הכסף החדש תומחר ${
            ctx.priceBasis === "record" ? "לפי מה שהבנק הזה גבה מהלקוח עצמו, מתחת לממוצע שלו" : ctx.priceBasis === "premium" ? (TRACKS.some((t) => (ctx.priceExtra[t] ?? 0) > 0) ? "בריביות של הבנק הזה, שגבוהות מממוצע הבנקים ועוד תוספת הסיכון המוערכת של הלקוח" : "בממוצע הבנקים ועוד תוספת הסיכון של הלקוח") : "בריביות של הבנק הזה"
          }. מעבר לבנק אחר מעביר את כל המשכנתא.`
        : "התמהיל מניח מחזור פנימי של מסלולים נבחרים בבנק הקיים. מעבר לבנק אחר מעביר את כל המשכנתא."
    );
  if (!ctx.propertyValue && (moved.length || ctx.ref.due > 0))
    out.push(
      tier.tier === "nonbank"
        ? `שווי הנכס לא ידוע, ולכן שיעור המימון (אצל המלווה החוץ־בנקאי עד ${pct(ctx.variant === "secondLien" ? NONBANK_LTV.combined : NONBANK_LTV.first)}${ctx.variant === "secondLien" ? ", שעבוד ראשון ושני יחד" : ""}) ייבדק בשמאות.`
        : "שווי הנכס לא ידוע, ולכן שיעור המימון (ובכל מטרה עד 50% משווי הנכס) ייבדק בשמאות."
    );
  if (!ctx.input.profile.income && moved.length) out.push("ההכנסה לא ידועה, ולכן שיעור ההחזר מההכנסה (עד 50%) לא נבדק.");
  if (moved.some((d) => d.group === "loan") && !ctx.collateral) out.push("לא נמצאה בדוח משכנתא, ואיחוד בביטחון נכס מחייב נכס משועבד.");
  void book;
  return out;
}

/* ------------------------------------------------------------ findings */

/** Findings are one line on the sheet: a short title and one sentence, no row lists (the board lists rows). */
function findingsOf(ctx: Ctx, analysis: AutoMixInput["analysis"]): Finding[] {
  const out: Finding[] = [];
  const avg = (xs: { w: number; v: number }[]) => sum(xs.map((x) => x.w * x.v)) / (sum(xs.map((x) => x.w)) || 1);
  const dear: { d: Debt; annual: number; mkt: number; rate: number; indexed: boolean }[] = [];
  for (const d of ctx.debts) {
    if (d.zak || d.due || !(d.rate > 0)) continue;
    const mkt = marketRateFor(ctx, d);
    if (mkt === null) continue;
    // Like for like: a CPI-linked all-purpose debt against unlinked new money at its
    // forecast all-in rate (audit U3: L03 ₪938k at 5.40% real read as cheaper than 6.30%).
    const own = ownCost(d, effectiveRate(d));
    const rate = own.rate;
    const annual = (d.balance * (rate - mkt)) / 100;
    if (rate - mkt >= (d.group === "loan" ? 1 : 0.5) && annual >= 500) dear.push({ d, annual, mkt, rate, indexed: own.indexed });
  }
  for (const [id, group] of [["dear-mortgage", "mortgage"], ["dear-consumer", "loan"]] as const) {
    const xs = dear.filter((x) => x.d.group === group);
    if (!xs.length) continue;
    const annual = sum(xs.map((x) => x.annual));
    const bal = sum(xs.map((x) => x.d.balance));
    const r = avg(xs.map((x) => ({ w: x.d.balance, v: x.rate })));
    const k = avg(xs.map((x) => ({ w: x.d.balance, v: x.mkt })));
    out.push({
      id,
      severity: annual >= (group === "mortgage" ? 5000 : 3000) ? "high" : "medium",
      title: group === "mortgage" ? (xs.length === 1 ? "מסלול משכנתא יקר מהשוק" : `${xs.length} מסלולי משכנתא יקרים מהשוק`) : `הלוואות צרכניות יקרות ב-${nis(bal)}`,
      detail:
        group === "mortgage"
          ? `${nis(bal)} בריבית ממוצעת של ${r.toFixed(2)}%${xs.some((x) => x.indexed) ? " עם המדד הצפוי" : ""} מול ${k.toFixed(2)}% לכסף חדש היום, כ-${nis(annual)} בשנה.`
          : `ריבית ממוצעת של ${r.toFixed(2)}% מול ${k.toFixed(2)}% בהלוואה בביטחון הנכס, כ-${nis(annual)} בשנה.`,
      rows: xs.map((x) => x.d.id),
      annualCost: Math.round(annual),
    });
  }
  const prime = primeOn(toIso(startOfToday()));
  const stale = ctx.debts.filter((d) => {
    if (d.path !== 1 || prime === null) return false;
    const mg = Number(d.row.anchor_margin);
    return d.row.anchor_margin !== null && d.row.anchor_margin !== undefined && Number.isFinite(mg) && Math.abs(d.rate - (prime + mg)) >= 0.1;
  });
  if (stale.length) {
    const mg0 = Number(stale[0].row.anchor_margin);
    out.push({
      id: "stale-prime",
      severity: "info",
      title: stale.length === 1 ? "שורת פריים בפריים של יום הדוח" : `${stale.length} שורות פריים בפריים של יום הדוח`,
      detail: `לדוגמה ${stale[0].rate.toFixed(2)}% בדוח ו-${(prime! + mg0).toFixed(2)}% היום, הלוח מחשב לפי המודפס והתחזית לפי היום.`,
      rows: stale.map((d) => d.id),
      annualCost: Math.round(sum(stale.map((d) => (d.balance * (d.rate - (prime! + Number(d.row.anchor_margin)))) / 100))),
    });
  }
  const mort = ctx.debts.filter((d) => d.group === "mortgage");
  const mb = sum(mort.map((d) => d.balance));
  if (mb > 0) {
    const variable = sum(mort.filter((d) => !d.fixed).map((d) => d.balance)) / mb;
    const linked = sum(mort.filter((d) => isLinkedPath(d.path)).map((d) => d.balance)) / mb;
    if (variable > 2 / 3 + 0.005 || linked > 0.5)
      out.push({
        id: "exposure",
        severity: "medium",
        title: variable > 2 / 3 ? `${pct(variable)} מהמשכנתא בריבית משתנה` : `${pct(linked)} מהמשכנתא צמודה למדד`,
        detail: `משתנה ${pct(variable)} (למשכנתא חדשה עד 66.66%) וצמוד מדד ${pct(linked)} (בשוק כ-10% מהאשראי החדש).`,
        rows: mort.filter((d) => (variable > 2 / 3 ? !d.fixed : isLinkedPath(d.path))).map((d) => d.id),
      });
  }
  const io = ctx.debts.filter((d) => d.interestOnly);
  if (io.length) {
    const big = io.reduce((b, d) => (d.balance > b.balance ? d : b), io[0]);
    // What the last payment will actually be under the forecast: the principal, indexed.
    const lump = big.priced.pay[0][big.priced.pay[0].length - 1] ?? big.balance;
    const indexed = isLinkedPath(big.path) && lump > big.balance * 1.01;
    out.push({
      id: "interest-only",
      severity: "medium",
      title: `${nis(sum(io.map((d) => d.balance)))} נפרעים בתשלום אחד בסוף`,
      detail: `${io.length === 1 ? "מסלול ריבית בלבד" : `${io.length} מסלולי ריבית בלבד`}, הגדול ${nis(big.balance)} בעוד ${yrs(big.months)}${indexed ? `, כ-${nis(lump)} עם ההצמדה בתחזית` : ""}.`,
      rows: io.map((d) => d.id),
    });
  }
  const zak = ctx.debts.filter((d) => d.zak);
  if (zak.length)
    out.push({
      id: "eligibility",
      severity: "info",
      title: `${zak.length === 1 ? "הלוואת זכאות נשארת" : `${zak.length} הלוואות זכאות נשארות`} (${nis(sum(zak.map((d) => d.balance)))})`,
      detail: "ריבית מסובסדת בחוק וללא עמלת פירעון, ומחזור מבטל את הזכאות.",
      rows: zak.map((d) => d.id),
    });
  const pastDue = owedOnly(ctx.input.master).filter((l) => !(Number(l.months) > 0) && (Number(l.amount) || 0) > 0);
  if (pastDue.length)
    out.push({
      id: "past-due",
      severity: "high",
      title: `${nis(sum(pastDue.map((l) => Number(l.amount) || 0)))} בחובות שמועד פירעונם חלף`,
      detail: ctx.override ? "הם נפרעים במלואם מהכסף החדש, וכל השוואה להיום כוללת את נשיאתם." : "כל מלווה ידרוש להסדיר אותם לפני אשראי חדש, והם לא נכללים בחישובי התמהיל.",
      rows: pastDue.map((l) => l.id),
    });
  if (analysis) {
    const flags = new Set(analysis.flags.map((f) => f.id));
    if (flags.has("arrears-now") || analysis.totals.overdue > 0)
      out.push({
        id: "arrears",
        severity: "high",
        title: `פיגור בתשלומים של ${nis(analysis.totals.overdue)}`,
        detail: `${analysis.behaviour.arrearsMonths} חודשי פיגור בהיסטוריה, ובנקים כמעט אינם ממחזרים אשראי בפיגור.`,
        rows: [],
      });
    if (analysis.legal.insolvency.length || analysis.legal.executionOpen.length)
      out.push({
        id: "legal",
        severity: "high",
        title: analysis.legal.insolvency.length ? "הליך חדלות פירעון בדוח" : `${analysis.legal.executionOpen.length} תיקי הוצאה לפועל פתוחים`,
        detail: "אשראי חדש מותנה בהסדרת ההליך, ובמקרה הטוב אצל גוף חוץ־בנקאי.",
        rows: [],
      });
  }
  const guar = (ctx.input.master || []).filter((l) => l.is_guarantor);
  if (guar.length)
    out.push({
      id: "guarantees",
      severity: "info",
      title: `${guar.length === 1 ? "ערבות" : `${guar.length} ערבויות`} בסך ${nis(sum(guar.map((l) => Number(l.amount) || 0)))}, מחוץ לסכומים`,
      detail: "הלקוח ערב ולא לווה, אבל מלווה חדש יראה את הערבות.",
      rows: guar.map((l) => l.id),
    });
  const noRate = ctx.debts.filter((d) => !d.due && !(d.rate > 0));
  if (noRate.length)
    out.push({ id: "no-rate", severity: "info", title: noRate.length === 1 ? "חוב בלי ריבית מדווחת" : `${noRate.length} חובות בלי ריבית מדווחת`, detail: "נשארים בתמהיל כמות שהם עד שתתקבל הריבית.", rows: noRate.map((d) => d.id) });
  if (ctx.pricing.tier.tier === "bank" && ctx.pricing.tier.smaller)
    out.push({
      id: "tier-small",
      severity: "info",
      title: `הלוואות קטנות נלקחו ${ctx.pricing.tier.smaller.level.toFixed(2)} נק׳ מעל השוק`,
      detail: ctx.pricing.tier.short,
      rows: ctx.pricing.tier.smaller.events.flatMap((e) => e.ids),
    });
  if (ctx.pricing.tier.tier !== "bank")
    out.push({
      id: "tier",
      severity: "medium",
      title: ctx.pricing.tier.tier === "nonbank" ? "תמחור של גוף חוץ־בנקאי" : `תוספת סיכון של ${ctx.pricing.tier.premium.toFixed(2)} נק׳`,
      detail: ctx.pricing.tier.short,
      rows: ctx.pricing.tier.evidence.map((e) => e.id),
    });
  const order = { high: 0, medium: 1, info: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity] || (b.annualCost ?? 0) - (a.annualCost ?? 0));
}

/* ------------------------------------------------------------ blocks */

const dmyOf = (d: string | null) => d ?? "";

/**
 * Every obstacle in the client's condition, overridden or not. Conditions are
 * the real-world steps before a mix built past the obstacle can be filed; the
 * sources are in research-insolvency-enforcement / research-nonbank-distress.
 */
type BlockCtx = Pick<Ctx, "cond" | "override" | "input" | "debts" | "collateral" | "propertyValue"> & { pricing: { tier: TierInfo } };

function blocksOf(ctx: BlockCtx, proposals: Proposal[]): Block[] {
  const out: Block[] = [];
  const c = ctx.cond;
  const o = ctx.override;
  const profile = ctx.input.profile;
  const nonbank = ctx.pricing.tier.tier === "nonbank";
  if (c.insolvency)
    out.push({
      id: "insolvency",
      title: c.insolvency.kind === "bankruptcy" ? "הליך פשיטת רגל" : "הליך חדלות פירעון",
      detail: `בדוח ${c.insolvency.order}${c.insolvency.orderDate ? ` מ-${dmyOf(c.insolvency.orderDate)}` : ""}${c.insolvency.stated ? `, עם חובות של ${nis(c.insolvency.stated)}` : ""}.`,
      rows: [],
      overridden: o,
      condition: INSOLVENCY_CONDITION[c.insolvency.kind],
      effect: "refuses",
      law: false,
    });
  if (c.enforcement)
    out.push({
      id: "enforcement",
      title: "תיק הוצאה לפועל פתוח",
      detail: `${c.enforcement.files === 1 ? "תיק פתוח אחד" : `${c.enforcement.files} תיקים פתוחים`} בסך ${nis(c.enforcement.debt)}${c.enforcement.covered ? ", כלול בחובות בפיגור" : ""}.`,
      rows: [],
      overridden: o,
      condition: ENFORCEMENT_CONDITION,
      effect: "prices",
      law: false,
    });
  if (c.arrearsNow || c.rowArrears.length) {
    const overdue = c.overdueTotal || sum(c.rowArrears.map((a) => a.overdue));
    out.push({
      id: "arrears",
      title: "פיגור פעיל בתשלומים",
      detail: `${nis(overdue)} בפיגור בדוח${c.arrearsMonths ? `, ${c.arrearsMonths} חודשי פיגור בהיסטוריה` : ""}.`,
      rows: c.rowArrears.map((a) => a.rowId),
      overridden: o,
      condition: ARREARS_CONDITION,
      effect: "prices",
      law: false,
    });
  }
  const pastDue = c.due.filter((d) => d.kind === "past-due");
  if (pastDue.length)
    out.push({
      id: "past-due",
      title: "חובות שמועד פירעונם חלף",
      detail: `${nis(sum(pastDue.map((d) => d.balance)))} ב-${pastDue.length === 1 ? "חוב אחד" : `${pastDue.length} חובות`} שאין להם תקופה, לפירעון מיידי.`,
      rows: pastDue.map((d) => d.rowId!).filter(Boolean),
      overridden: o,
      condition: DUE_CONDITION,
      effect: "limits",
      law: false,
    });
  const outside = c.due.filter((d) => d.kind !== "past-due");
  if (outside.length)
    out.push({
      id: "outside",
      title: "חובות בפיגור מחוץ לתמהיל",
      detail: `${nis(sum(outside.map((d) => d.balance)))} בכרטיסים, בחשבון עובר ושב או בתיקים, שאינם שורות בתמהיל.`,
      rows: [],
      overridden: o,
      condition: DUE_CONDITION,
      effect: "limits",
      law: false,
    });
  const mortgageBal = sum(ctx.debts.filter((d) => d.group === "mortgage").map((d) => d.balance));
  const needsCollateral = ctx.debts.some((d) => d.group === "loan" && !d.lock) || c.due.length > 0;
  if (!ctx.collateral && needsCollateral) {
    // The smallest property that carries the largest secured total any proposal needs, at its lender's cap.
    const cap = nonbank ? NONBANK_LTV.combined : AP_LTV;
    const secured = Math.max(0, ...proposals.filter((p) => p.status !== "unavailable").map((p) => sum(owedOnly(p.rows).filter((r) => r.group !== "loan" || r.source_type === AUTOMIX_SOURCE).map((r) => Number(r.amount) || 0))));
    const value = secured > 0 ? Math.ceil(secured / cap / 1000) * 1000 : 0;
    out.push({
      id: "no-collateral",
      title: "אין נכס משועבד ידוע",
      detail: "בדוח אין משכנתא ולא הוזן שווי נכס, ובלי נכס אין הלוואה בביטחון דירה.",
      rows: [],
      overridden: o,
      condition: value
        ? `שמאות לנכס בשווי של ${nis(value)} לפחות (${pct(cap)} מימון), ורישום שעבוד עליו.`
        : "שמאות לנכס ורישום שעבוד עליו.",
      effect: "limits",
      law: false,
    });
  }
  if (profile.age && AGE_AT_END - profile.age < TERM_MAX_YEARS) {
    const left = Math.floor(AGE_AT_END - profile.age);
    const none = left < MIN_YEARS.prime;
    out.push({
      id: "age",
      title: none ? "הגיל לא משאיר תקופה" : "הגיל מקצר את התקופה",
      detail: none
        ? `גיל ${profile.age}, ולפי נוהג הבנקים ההלוואה מסתיימת עד גיל ${AGE_AT_END}: נשארות פחות מ-${MIN_YEARS.prime} שנים, התקופה הקצרה ביותר.`
        : `גיל ${profile.age}, ולפי נוהג הבנקים ההלוואה מסתיימת עד גיל ${AGE_AT_END}, כלומר עד ${left} שנים.`,
      rows: [],
      overridden: o,
      condition: `אישור המלווה לתקופה שמסתיימת אחרי גיל ${AGE_AT_END}, או לווה נוסף צעיר יותר.`,
      effect: none ? "refuses" : "limits",
      law: false,
    });
  }
  if (ctx.propertyValue && mortgageBal / ctx.propertyValue > LTV_MAX[profile.propertyType]) {
    // Directive 329 binds a bank: no override lifts it. A non-bank lender has its own policy instead.
    out.push({
      id: "ltv",
      title: "שיעור המימון מעל התקרה",
      detail: `המשכנתא היום ${pct(mortgageBal / ctx.propertyValue)} משווי הנכס, מעל ${pct(LTV_MAX[profile.propertyType])}.`,
      rows: ctx.debts.filter((d) => d.group === "mortgage").map((d) => d.id),
      overridden: o && nonbank,
      condition: nonbank
        ? `המלווה החוץ־בנקאי מממן עד ${pct(NONBANK_LTV.first)} בשעבוד ראשון, ושמאות מעודכנת קובעת את השווי.`
        : "הוראה 329 סעיף 9 אוסרת לבנק להגדיל את שיעור המימון, ולכן עמלות ועלויות משולמות במזומן.",
      effect: "limits",
      law: !nonbank,
    });
  }
  return out;
}

/** The first caveat of every proposal built past a block: what was overridden and what must happen first. */
function overrideCaveat(ctx: BlockCtx, blocks: Block[]): string | null {
  const lifted = blocks.filter((b) => b.overridden);
  const tier = ctx.pricing.tier;
  // A bank tier the advisor FORCED on a client the engine would send to a
  // non-bank. (Grade B from history alone — bureau non-payment, closed files —
  // is a bank client at a premium, priced so automatically: nothing was forced.)
  const bankOnBad = ctx.override && tier.tier !== "nonbank" && ctx.input.profile.tier !== "auto" && tier.grade !== "A";
  if (!lifted.length && !bankOnBad) return null;
  const parts: string[] = [];
  if (lifted.length) parts.push(`נבנה למרות מצב הלקוח: ${lifted.map((b) => `${b.title} (${b.condition.replace(/\.$/, "")})`).join(", ")}.`);
  if (bankOnBad)
    parts.push(
      `תמחור בנקאי נבחר ידנית, אבל בנק מסרב בדרך כלל ללקוח במצב הזה: בספטמבר 2026 רק 4 מתוך 5,464 מחזורים פנימיים היו של חובות בעייתיים (בנק ישראל, n030).`
    );
  return parts.join(" ");
}

/* ------------------------------------------------------------ structures */

type Variant = "bank" | "bankMove" | "firstLien" | "secondLien";
const isBankVariant = (v: Variant) => v === "bank" || v === "bankMove";
type Run = { ctx: Ctx; solvedBy: Map<GoalId, Solved>; unavailableConsolidate: Proposal | null };

/** Which structures this client has: a bank lends as a bank; a non-bank lender behind the mortgage, or in its place. */
function variantsFor(ctx: Ctx): Variant[] {
  if (ctx.pricing.tier.tier !== "nonbank")
    // A bank: the internal refinance at the bank that holds the mortgage, and,
    // when the advisor has not picked a bank, the whole mortgage moved to the
    // market's average price. The internal one is the incumbent.
    // A move can only win where the incumbent prices some track above the
    // average: otherwise the internal refinance can do everything the move does
    // (refinance it all) at no higher a rate, so the move is never better.
    // (A bankPremium client is priced at the system plus the premium either way.)
    // Not while a mortgage row that cannot move (a state-eligibility loan, a row
    // with no rate) would stay at the old bank: its lien contradicts the new
    // bank's first lien.
    return ctx.incumbent &&
      ctx.input.profile.bank === "system" &&
      ctx.pricing.tier.tier === "bank" &&
      ctx.debts.some((d) => d.group === "mortgage" && !d.lock) &&
      !ctx.debts.some((d) => d.group === "mortgage" && d.lock) &&
      ctx.pricing.tier.tracks.some((t) => (ctx.priceExtra[t] ?? 0) > 0)
      ? ["bank", "bankMove"]
      : ["bank"];
  const mortgage = ctx.debts.filter((d) => d.group === "mortgage");
  // A mortgage in serious default is being called: nothing can stand behind it.
  const called = mortgage.some((d) => d.forced);
  return mortgage.length && !called ? ["secondLien", "firstLien"] : ["firstLien"];
}

/** One structure's full pipeline: every goal solved, polished against the others, and the display order enforced. */
function runGoals(ctx: Ctx, consolidateOk: boolean, wanted: Set<GoalId>): Run {
  POOL = [];
  const solvedBy = new Map<GoalId, Solved>();
  let unavailableConsolidate: Proposal | null = null;
  const tag = (sv: Solved): Solved => ({ ...sv, ctx });
  const hasLoans = ctx.debts.some((d) => d.group === "loan" && !d.lock);
  const solvedPayment = tag(solvePayment(ctx));
  // On a first lien the whole mortgage moves, so "the mortgage untouched" is the second-lien structure's goal.
  const consolidateHere = !((ctx.variant === "firstLien" || ctx.variant === "bankMove") && ctx.debts.some((d) => d.group === "mortgage"));
  const solveGoal = (goal: GoalId, extra: Partial<Spec> = {}, fromGuard?: Guard["kind"]): Solved => {
    if (goal === "consolidate") return solveConsolidate(ctx);
    if (goal === "payment") return solvedPayment;
    if (goal === "years") return solveYears(ctx);
    if (goal === "balanced") return solveBalanced(ctx, extra, fromGuard);
    if (goal === "stable") return solveStable(ctx, extra);
    const spec = costSpec(ctx, goal, extra);
    return { plan: solveTerms(ctx.debts, ctx.cols, spec), spec, cols: ctx.cols };
  };
  // Each goal under CHEAP_KEEP, once. מאוזן reads the saving goal's verdict on the cheap debts (solveHolding), so
  // savings is solved ahead of it when the rule holds a debt, and that answer is the one savings itself takes.
  const heldBy = new Map<GoalId, Solved>();
  const holding = (goal: GoalId): Solved => {
    let sv = heldBy.get(goal);
    if (!sv) heldBy.set(goal, (sv = solveHolding(ctx, goal, () => solveGoal(goal), goal === "balanced" && ctx.base.hold?.length ? holding("savings") : undefined)));
    return sv;
  };
  for (const goal of ORDER) {
    if (!wanted.has(goal)) continue;
    if (goal === "consolidate") {
      if (!hasLoans || !consolidateHere) continue;
      if (!consolidateOk) {
        unavailableConsolidate = {
          ...proposalOf(ctx, goal, { plan: { ok: false, status: "x", refinance: [], amounts: {}, objective: NaN, setupHousing: 0, setupAp: 0 } }),
          status: "unavailable",
          note: !ctx.collateral ? "אין בדוח נכס משועבד ולא הוזן שווי נכס, ולכן אין ביטחון להלוואה לכל מטרה." : "איחוד הלוואות כובה בפרופיל.",
        };
        continue;
      }
    }
    solvedBy.set(goal, tag(holding(goal)));
  }
  for (const sv of Array.from(solvedBy.values())) if (sv.plan.ok && sv.cols) addToPool(sv.plan, sv.cols);
  // POLISH. Every goal's answer is a feasible starting point for the others —
  // re-solve each goal once from its own answer with the whole pool as seeds,
  // so no goal ends up beaten on its own objective by another goal's mix that
  // satisfies its rules. "years" also takes the earliest finish any
  // budget-holding answer reached, when that answer obeys its rules.
  for (const [goal, sv] of Array.from(solvedBy.entries())) {
    if (!sv.spec || !sv.cols || !sv.plan.ok) continue;
    // (The payment goal's cost stage already searched its band with the pool as seeds; under the guard a second pass ran 0.6 s on fuzz Z59.)
    if (goal === "payment" && sv.spec.wMonthly === 0) continue;
    const p2 = solveTermsRaw(ctx.debts, sv.cols, sv.spec, POOL, sv.plan);
    if (p2.ok && p2.objective < sv.plan.objective - 1e-6) solvedBy.set(goal, { ...sv, plan: p2 });
  }
  // SLIVERS. Each goal's answer without the tranches it can do without, under
  // its own rules (before the display order, which then compares the mixes the
  // sheet will show).
  for (const [goal, sv] of Array.from(solvedBy.entries())) solvedBy.set(goal, keepCheaper(ctx, unsliver(ctx, goal, sv)));
  const afterSlivers = new Map(Array.from(solvedBy.entries()).map(([g, sv]) => [g, sv.plan]));
  // "years" also takes the earliest finish any budget-holding answer reached, when
  // that answer obeys its rules — after the polish AND after the display order
  // (savings can reach an earlier end there: corpus Z150, 48 months vs 60).
  const yearsFromOthers = () => {
    const yrs0 = solvedBy.get("years");
    if (yrs0?.plan.ok && typeof yrs0.meta?.finish === "number") {
      const finishOf = (p: Plan) => Math.max(0, ...ctx.debts.filter((d) => !p.refinance.includes(d.id)).map((d) => d.months), ...Object.keys(p.amounts).map((k) => Number(k.split("|")[2]) * 12));
      let T = yrs0.meta.finish;
      for (const [g, sv] of Array.from(solvedBy.entries())) {
        if (g === "years" || g === "payment" || !sv.plan.ok || !sv.spec || !sv.spec.shareCap) continue;
        const f = finishOf(sv.plan);
        if (f < T) {
          const ceiling = typeof yrs0.meta.budget === "number" ? yrs0.meta.budget : ctx.base.budget ?? ctx.budget;
          const at = yearsAt(ctx, f, sv.plan, ceiling, eligibilityIds(ctx));
          // The re-solve can read infeasible (yalps drops cycled nodes): the other
          // goal's mix itself ends at f within a lower ceiling, so it stands in,
          // when it too costs no more than the reference (yearsCaps).
          // (The re-solve is started from the other goal's mix, and the search keeps
          // a start it cannot improve on without testing it against years' caps:
          // fuzz Z276 took stable's mix at ₪132k more on the typed read-out.)
          // The re-solve first, then the other goal's mix itself, each held to years' own rules: no more paid in total,
          // its guard, and the debts CHEAP_KEEP keeps (fuzz Z344: the re-solve failed the rows' cost test while the mix passed).
          const okForYears = (c: Solved) => costsNoMore(ctx, c.plan) && !(yrs0.guard?.kind && !earlyOk(ctx, c.plan, c.cols ?? ctx.cols, yrs0.guard.caps)) && !movesHeld(c.plan, yrs0.spec);
          const use = [at.plan.ok ? at : null, { ...sv, meta: { finish: f } } as Solved].find((c): c is Solved => !!c && okForYears(c));
          if (!use) continue;
          const stretchedNow = !!yrs0.meta.stretched;
          solvedBy.set("years", tag({ ...use, guard: yrs0.guard, meta: { ...yrs0.meta, finish: f, ...(stretchedNow ? { atStretch: f } : typeof yrs0.meta.atStretch === "number" ? { atToday: f } : {}) } }));
          T = f;
        }
      }
    }
  };
  yearsFromOthers();
  // THE SHEET'S OWN ORDERING. The sheet's headline columns are the typed
  // read-out. Optimising on the forecast can leave "חיסכון מקסימלי" showing a
  // higher cost than another goal, which the board would contradict — so on the
  // displayed figures: the payment goal has the lowest payment of all, years
  // the earliest end among budget-holding goals, savings the lowest cost
  // (interest + indexation, metrics.totalCost) among them. Each is repaired with the
  // goal's own objective unchanged, the other goal's mix as the start, and a
  // cap on the displayed figure; if that has no solution the other mix itself
  // is adopted (and the two fold with sameAs).
  enforceDisplayOrder(ctx, solvedBy);
  yearsFromOthers();
  // A goal re-solved by the display order (savings under its cap on the shown
  // cost, years at an earlier end) is read for slivers again, under the spec it
  // now has. A mix ADOPTED from another goal is not: it is that goal's answer,
  // with that goal's reasons, and dropping a track under the adopter's rules
  // could undo the very figure it was adopted for (the payment goal's lowest
  // payment of all).
  for (const [g, sv] of Array.from(solvedBy.entries())) {
    if (sv.plan === afterSlivers.get(g)) continue;
    const shared = Array.from(solvedBy.entries()).some(([h, x]) => h !== g && x.plan === sv.plan);
    if (!shared) solvedBy.set(g, keepCheaper(ctx, unsliver(ctx, g, sv)));
  }
  // THE GATES IN THE SEARCH. A cost goal whose answer has a material gain that a
  // gate refuses (break-even, present value, the costs' share of the new money)
  // is solved again with the gates as rows, and the best mix that passes them all
  // is the answer; only when none does is the goal "no-gain".
  for (const g of GATED_GOALS) {
    const sv = solvedBy.get(g);
    if (!sv?.plan.ok || !wanted.has(g)) continue;
    const v = quickJudge(ctx, g, sv);
    if (v.status !== "no-gain" || !v.gate) continue;
    const tally = (GATE_STATS.by[`${g}/${v.gate}`] ??= { refused: 0, passed: 0 });
    tally.refused++;
    // Every gate at once, so the answer passes them all: the rows, savings' typed
    // read-out at most the reference's, and stability at a price its protection
    // allows, then at no extra cost in the forecast.
    const rows = { ...gateRows(ctx), ...(g === "savings" ? { typedPaidCap: ctx.ref.typedPaid } : {}) };
    const levels: Partial<Spec>[] =
      g === "stable" ? [rows, { ...rows, paidCap: ctx.ref.paid + STABLE_PRICE * (v.stable?.protection ?? 0) }, { ...rows, paidCap: ctx.ref.paid }] : [rows];
    for (const extra of levels) {
      const alt = withHold(ctx, sv.spec?.hold, () => solveGoal(g, extra, sv.guard?.kind));
      if (!alt.plan.ok) continue;
      const alt2 = keepCheaper(ctx, unsliver(ctx, g, tag(alt)));
      if (quickJudge(ctx, g, alt2).status === "ok") {
        GATE_STATS.n++;
        tally.passed++;
        // A lifted goal stays lifted, its measured gain with it (the moved cheap debt's reason quotes it).
        solvedBy.set(g, { ...alt2, gated: true, ...(sv.cheapLifted ? { cheapLifted: true, liftGain: sv.liftGain, liftAtLeast: sv.liftAtLeast, liftFromSavings: sv.liftFromSavings } : {}) });
        break;
      }
    }
  }
  // A cost goal the gates re-solved can end sooner than years did: years takes it when it obeys years' rules (fuzz Z344).
  if (GATED_GOALS.some((g) => solvedBy.get(g)?.gated)) {
    const before = solvedBy.get("years")?.plan;
    yearsFromOthers();
    const after = solvedBy.get("years");
    if (after && after.plan !== before && !Array.from(solvedBy.entries()).some(([h, x]) => h !== "years" && x.plan === after.plan)) solvedBy.set("years", keepCheaper(ctx, unsliver(ctx, "years", after)));
  }
  for (const [g, sv] of Array.from(solvedBy.entries())) solvedBy.set(g, tag(sv));
  return { ctx, solvedBy, unavailableConsolidate };
}
/** How often the gates in the search found an answer the first solve's gate had refused, in all and per goal and gate (the corpus prints it). */
const GATE_STATS = { n: 0, by: {} as Record<string, { refused: number; passed: number }> };

/**
 * "Today, honestly" when debt is due now: keep today's mix and clear the due
 * debt (and any arrears cure) at the LOWEST monthly payment this lender's menu
 * allows — solved as a mix, so its setup costs and rules are in it. It is the
 * least any plan must do; its payment is the default budget, and every
 * "versus today" figure is measured from it. Without debt due now it is today.
 */
/** Up to the agora: a sum over rows in the master's order, as a cap, without its order-dependent last bits. */
const agoraUp = (x: number) => Math.ceil(x * 100) / 100;

function referenceOf(ctx: Ctx): Ctx["ref"] {
  const t = ctx.today;
  // The totals are sums over the rows in the master's order: their last bits differ with that order (fuzz seed 31
  // Z567: 3,637,845.8681318522 against …852), and as caps they sent a node-capped search down another branch.
  // Rounded UP to the agora, today's own mix still meets them and the order no longer shows.
  const c = agoraUp;
  const none = { monthly: t.metrics.monthly, paid: c(t.paid[0]), typedPaid: c(t.metrics.totalPaid), typedCost: c(t.metrics.totalCost), months: t.metrics.months, worst: c(Math.max(...t.paid.slice(1))), due: 0, carry: 0, carryYears: 0, book: null };
  if (!(ctx.ref.due > 0)) return none;
  // The reference is a yardstick, not an offer: today's mix as it stands may
  // already break the PTI or LTV guardrail, and the yardstick must still exist.
  const spec = specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget: null, peakCap: null, finish: null, keepMortgage: true, loansAllowed: false, shareCap: false, ptiCap: null, ltv: null, hold: undefined });
  const plan = solveTermsRaw(ctx.debts, ctx.cols, spec, []);
  if (!plan.ok) return ctx.ref;
  const built = rowsOf(ctx, plan);
  const b = bookOf(built.rows, ctx.input, ctx.f);
  const years = Math.max(0, ...Object.keys(plan.amounts).map((k) => Number(k.split("|")[2])));
  const lent = sum(built.tranches.map((x) => x.amount));
  return {
    monthly: b.metrics.monthly,
    paid: c(b.paid[0]),
    typedPaid: c(b.metrics.totalPaid),
    typedCost: c(b.metrics.totalCost),
    months: b.metrics.months,
    worst: c(Math.max(...b.paid.slice(1))),
    due: ctx.ref.due,
    carry: b.metrics.monthly - t.metrics.monthly,
    carryYears: years,
    ...(lent > 0 ? { carryRate: sum(built.tranches.map((x) => x.amount * x.rate)) / lent } : {}),
    book: b,
  };
}
function applyReference(ctx: Ctx, ref: Ctx["ref"]) {
  ctx.ref = ref;
  if (!(ctx.input.profile.budget && ctx.input.profile.budget > 0) && ref.due > 0) {
    // The reference's own payment, plus the read-out's rounding room (½ a shekel
    // per new tranche, solve.ts ROUNDING): the reference itself must fit.
    ctx.budget = ref.monthly + 3;
    ctx.base.budget = ctx.budget;
  }
}

/**
 * מאוזן across structures: the share t of each measure it gets, against the
 * anchors of every structure together (the most free relief and the most
 * saving any of them reaches), so the two structures are measured on one scale.
 */
type Anchors = { R: number; S: number };
function balancedT(sv: Solved, a: Anchors): number {
  const c = sv.ctx!;
  const b = bookOf(rowsOf(c, sv.plan).rows, c.input, c.f);
  const fr = a.R > 0 ? (c.ref.monthly - b.metrics.monthly) / a.R : 0;
  const sh = a.S > 0 ? (c.ref.paid - b.paid[0]) / a.S : 0;
  return a.R > 0 && a.S > 0 ? Math.min(fr, sh) : a.R > 0 ? fr : sh;
}

/** A goal's own measure, lexicographic (lower is better). */
function score(goal: GoalId, sv: Solved, anchors?: Anchors): number[] {
  if (goal === "balanced" && anchors) return [-balancedT(sv, anchors), sv.plan.objective];
  const m = shown(sv.ctx!, sv.plan);
  if (goal === "payment") return [m.monthly, sv.plan.objective];
  if (goal === "years") return [m.months, sv.plan.objective];
  if (goal === "balanced" || goal === "consolidate") return [m.monthly, sv.plan.objective];
  // Savings (and stable) on their own objective. Not the displayed cost: that
  // figure is set by the display repair borrowing other goals' mixes, and it
  // jumped by ₪80–120k between structures for a 0.05-point change (r02), while
  // the objective moved by under 0.5% and always ranked the same way.
  return [sv.plan.objective];
}
function beatsMaterially(goal: GoalId, x: Solved, incumbent: Solved, anchors?: Anchors): boolean {
  const a = score(goal, x, anchors);
  const b = score(goal, incumbent, anchors);
  const ref = incumbent.ctx!.ref;
  const costMargin = MATERIAL.cost(Math.max(0, ref.paid - sum(incumbent.ctx!.debts.filter((d) => !d.due).map((d) => d.balance))));
  // מאוזן in shares: a material gain in at least one of its two measures.
  const margin =
    goal === "balanced" && anchors
      ? Math.min(anchors.R > 0 ? MATERIAL.monthly(ref.monthly) / anchors.R : Infinity, anchors.S > 0 ? costMargin / anchors.S : Infinity)
      : goal === "payment" || goal === "balanced" || goal === "consolidate"
        ? MATERIAL.monthly(ref.monthly)
        : goal === "years"
          ? MATERIAL.months
          : costMargin / U;
  if (a[0] < b[0] - margin) return true;
  if (a[0] > b[0] - margin) return false;
  return better(a.slice(1), b.slice(1));
}
function better(a: number[], b: number[]): boolean {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (Math.abs(x - y) > 1e-6 * Math.max(1, Math.abs(y))) return x < y;
  }
  return false;
}

/** The display ordering across structures (within one, enforceDisplayOrder already holds it). */
function adoptAcross(ctx: Ctx, solvedBy: Map<GoalId, Solved>) {
  const view = (sv: Solved) => shown(sv.ctx ?? ctx, sv.plan);
  // A rival holds savings' and years' rules when it keeps the budget and, at a
  // bank, one track's share cap on what it actually lends (a mix that lends
  // nothing, or the stable goal's all-fixed mix within the cap, qualifies).
  const shareOk = (sv: Solved) => {
    if (!isBankVariant(sv.ctx?.variant ?? "bank") || !sv.spec || sv.spec.shareCap) return true;
    const h = rowsOf(sv.ctx ?? ctx, sv.plan).tranches.filter((t) => t.segment === "housing");
    const N = sum(h.map((t) => t.amount));
    return h.every((t) => t.amount <= TRACK_SHARE_MAX * N + (1 - TRACK_SHARE_MAX) * 2 * MIN_TRANCHE + 1000);
  };
  const holds = (sv: Solved) => sv.plan.ok && view(sv).monthly <= ctx.budget + 0.5 && shareOk(sv);
  // Across structures the same materiality as the structure choice applies: a
  // first lien does not replace the bank mortgage, nor a move to another bank an
  // internal refinance, for a gain below the threshold. Going BACK to the
  // incumbent structure (the bank mortgage kept: an internal refinance, or a
  // second lien behind it) needs no margin: it is the structure preferred anyway.
  const mMonthly = MATERIAL.monthly(ctx.ref.monthly);
  const mCost = MATERIAL.cost(Math.max(0, ctx.ref.paid - sum(ctx.debts.filter((d) => !d.due).map((d) => d.balance))));
  const homeward = (sv: Solved) => (sv.ctx?.variant ?? "bank") === "bank" || sv.ctx?.variant === "secondLien";
  const pay = solvedBy.get("payment");
  if (pay?.plan.ok)
    for (const [g, sv] of Array.from(solvedBy.entries())) {
      const cur = solvedBy.get("payment")!;
      if (g === "payment" || !sv.plan.ok || sv.ctx === cur.ctx || lockedIn(sv.ctx ?? ctx, sv.plan, eligibilityIds(sv.ctx ?? ctx))) continue;
      if (view(sv).monthly < view(cur).monthly - (homeward(sv) ? 0.5 : mMonthly)) solvedBy.set("payment", { ...sv, meta: { ...(sv.meta ?? {}), guard: 0, adopted: g } });
    }
  const yrs = solvedBy.get("years");
  if (yrs?.plan.ok)
    for (const g of BUDGET_GOALS) {
      const sv = solvedBy.get(g);
      const cur = solvedBy.get("years")!;
      if (g === "years" || !sv || !holds(sv) || sv.ctx === cur.ctx || !costsNoMore(sv.ctx ?? ctx, sv.plan)) continue;
      // Years' own rules: its five-year guard and the debts CHEAP_KEEP keeps.
      if ((cur.guard?.kind && !earlyOk(sv.ctx ?? ctx, sv.plan, sv.cols ?? (sv.ctx ?? ctx).cols, cur.guard.caps)) || movesHeld(sv.plan, cur.spec)) continue;
      if (view(sv).months < view(cur).months - (homeward(sv) ? 0 : MATERIAL.months)) solvedBy.set("years", { ...sv, guard: cur.guard, meta: { ...(sv.meta ?? {}), adopted: g } });
    }
  const sav = solvedBy.get("savings");
  if (sav?.plan.ok)
    for (const g of BUDGET_GOALS) {
      const sv = solvedBy.get(g);
      const cur = solvedBy.get("savings")!;
      if (g === "savings" || !sv || !holds(sv) || sv.ctx === cur.ctx || lockedIn(sv.ctx ?? ctx, sv.plan) || movesHeld(sv.plan, cur.spec)) continue;
      // Savings' own objective first (rules.ts DISPLAY_GIVE): another structure's mix
      // is adopted for its lower shown cost only when it is no worse on savings' objective.
      if (!(costObjective(sv.ctx ?? ctx, cur.spec, sv.plan, sv.cols ?? (sv.ctx ?? ctx).cols) <= costObjective(cur.ctx ?? ctx, cur.spec, cur.plan, cur.cols ?? (cur.ctx ?? ctx).cols) + DISPLAY_GIVE(ctx.ref.paid) / U)) continue;
      if (view(sv).totalCost < view(cur).totalCost - (homeward(sv) ? 1 : mCost)) solvedBy.set("savings", { ...sv, meta: { ...(sv.meta ?? {}), adopted: g } });
    }
}

/**
 * A plan's value on a cost goal's own objective (spec.lambda: the forecast and
 * the worst economy), k₪, from the plan itself: kept debts and new money as the
 * solver prices them. It compares mixes solved under other specs on one goal's measure.
 */
function costObjective(ctx: Ctx, spec: Spec | undefined, plan: Plan, cols: Column[]): number {
  const lam = Math.min(1, Math.max(0, spec?.lambda ?? 0));
  const byKey = new Map(cols.map((c) => [c.key, c]));
  const refi = new Set(plan.refinance);
  const paid = ECON.map(() => 0);
  for (const d of ctx.debts) if (!refi.has(d.id)) d.paid.forEach((x, k) => (paid[k] += x));
  for (const [key, a] of Object.entries(plan.amounts)) byKey.get(key)?.paid.forEach((x, k) => (paid[k] += x * a));
  return ((1 - lam) * paid[0] + lam * Math.max(...paid)) / U;
}

/* ------------------------------------------------------------ entry */

function sameMix(a: Proposal, b: Proposal): boolean {
  if (a.status === "unavailable" || b.status === "unavailable") return false;
  const ka = a.moves.filter((x) => x.action !== "keep").map((x) => x.id).sort().join(",");
  const kb = b.moves.filter((x) => x.action !== "keep").map((x) => x.id).sort().join(",");
  if (ka !== kb) return false;
  const ta = a.tranches.map((x) => `${x.track}${x.segment}${x.years}`).sort().join(",");
  const tb = b.tranches.map((x) => `${x.track}${x.segment}${x.years}`).sort().join(",");
  if (ta !== tb) return false;
  return a.tranches.every((x) => b.tranches.some((y) => y.track === x.track && y.segment === x.segment && Math.abs(y.amount - x.amount) <= 1000));
}

/**
 * The debts CHEAP_KEEP keeps (rules.ts): the forecast all-in rate of the debt
 * (indexation included) at least CHEAP_KEEP points under the cheapest new money
 * of its segment at its own remaining term (each track's column nearest that
 * term, by its own forecast all-in rate). Debts the structure moves (a whole
 * mortgage to another bank, a first lien), debt due now, and locked or
 * state-eligibility loans (their own rules) are not held.
 */
function cheapDebts(debts: Debt[], cols: Column[], moveWhole: boolean): { id: string; by: number }[] {
  const out: { id: string; by: number }[] = [];
  for (const d of debts) {
    if (d.lock || d.forced || d.zak || d.due || (moveWhole && d.group === "mortgage")) continue;
    const own = forecastRate(d);
    if (own === null) continue;
    const want = Math.max(1, Math.round(d.months / 12));
    const nearest = new Map<TrackKey, Column>();
    for (const c of cols) {
      if (c.segment !== d.segment || c.fRate === undefined) continue;
      const b = nearest.get(c.track);
      if (!b || Math.abs(c.years - want) < Math.abs(b.years - want)) nearest.set(c.track, c);
    }
    if (!nearest.size) continue;
    const best = Math.min(...Array.from(nearest.values()).map((c) => c.fRate!));
    if (own <= best - CHEAP_KEEP) out.push({ id: d.id, by: best - own });
  }
  return out;
}

/** Everything a solve needs, from the input — the check script drives the solver through this too. */
function prepare(
  input: AutoMixInput,
  f: Forecast,
  skipped: AutoMixResult["skipped"],
  variant: Variant = "bank"
): { ctx: Ctx; consolidateOk: boolean } | { fail: string; today: Book; parts: BlockCtx } {
  const profile = input.profile;
  const override = !!profile.override;
  const cond = conditionOf(input.master, input.analysis);
  const debts = debtsOf(input.master, input, f, skipped);
  if (override) {
    // Debt due now joins the picture: past-due rows, arrears outside the mix, uncovered enforcement files.
    for (const d of cond.due) debts.push(dueDebtOf(d, d.rowId ? input.master.find((l) => l.id === d.rowId) ?? null : null));
    // A row in arrears: in serious default it is cleared in full; otherwise, kept, it is brought current.
    for (const a of cond.rowArrears) {
      const d = debts.find((x) => x.id === a.rowId);
      if (!d) continue;
      if (a.serious) {
        d.forced = true;
        d.called = true;
      }
      else d.cure = a.overdue;
    }
  }
  if (variant === "bankMove")
    // Moving banks: the new bank takes the first lien, so the old bank's mortgage
    // is repaid whole. State-eligibility loans stay locked (as when the advisor
    // picks another bank); the caveat says they need the ministry's handling.
    for (const d of debts) if (d.group === "mortgage" && !d.lock) d.forced = true;
  if (variant === "firstLien")
    // A first lien for the new lender means the property is clear of the old one:
    // every mortgage-secured row is repaid from its money, state loans included.
    for (const d of debts)
      if (d.group === "mortgage") {
        d.forced = true;
        d.lock = null;
        d.cure = 0;
      }
  const today = bookOf(input.master, input, f);
  // The record is read for a loan the size of the new money: what this
  // structure may refinance (every debt that is not locked in place).
  const newMoney = sum(debts.filter((d) => !d.lock).map((d) => d.balance));
  const tier = resolveTier(input.master, input.analysis, profile, { override, pastDue: cond.due.length > 0, size: newMoney });
  if (!debts.length)
    return {
      fail: "אין בתמהיל הנוכחי חובות עם סכום ותקופה, ואין ממה לבנות.",
      today,
      parts: { cond, override, input, debts, collateral: owedOnly(input.master).some((l) => l.group === "mortgage") || !!(profile.propertyValue && profile.propertyValue > 0), propertyValue: profile.propertyValue || null, pricing: { tier } },
    };

  const mortgages = debts.filter((d) => d.group === "mortgage");
  const bankNames = new Set(mortgages.map((d) => d.lender));
  const target = profile.bank === "system" ? null : profile.bank;
  const BANK_WORDS: Record<string, RegExp> = {
    "Mizrahi Tefahot": /מזרחי|טפחות/,
    Leumi: /^לאומי/,
    Hapoalim: /פועלים/,
    Discount: /^דיסקונט/,
    Habeinleumi: /בינלאומי/,
    Mercantile: /מרכנתיל/,
    Jerusalem: /ירושלים/,
  };
  const bankIdOf = (name: string) => (Object.keys(BANK_WORDS) as BankId[]).find((id) => BANK_WORDS[id].test(name)) ?? null;
  const ids = new Set(Array.from(bankNames).map(bankIdOf));
  const incumbent = ids.size === 1 ? Array.from(ids)[0] : null;
  const moveWhole = variant === "bankMove" || (!!target && Array.from(bankNames).some((n) => !BANK_WORDS[target]?.test(n)));
  // Whose prices. A bank the advisor picked: its own. Otherwise, on a bank tier:
  //  - an internal refinance at the bank that holds the mortgage: that bank's
  //    published difference from the system (TamInt010), unless the client's
  //    own record there is strong and LOWER, which is the better evidence of
  //    what it charges this client (never higher than the bank's average: a
  //    record above it is the bankPremium tier's to price);
  //  - a bankPremium client: the system plus the premium, which is measured
  //    against the system and already holds the bank's own level (adding the
  //    bank's difference on top counted it twice);
  //  - a move to another bank: the system average.
  const priceBank: BankId = target ?? (tier.tier !== "nonbank" && variant === "bank" && incumbent ? incumbent : "system");
  const priceExtra: Partial<Record<TrackKey, number>> = {};
  let priceBasis: Ctx["priceBasis"] = target ? "picked" : "system";
  if (!target && variant === "bank" && incumbent && tier.tier === "bank") {
    priceBasis = "incumbent";
    // The record is followed only DOWN. Under PREMIUM_EVIDENCE it reads as
    // market pricing (the record is noisy: ±0.3 between a client's loans of one
    // bank is common), and following it up would tie new money to today's rows
    // (r06 savings flipped under a 0.05-point shift). Above the threshold it is
    // bankPremium. It is read for a loan the size of the new money (tiers.ts).
    const rec = tier.record?.strong ? Math.max(0, tier.record.level) : null;
    for (const t of TRACKS) {
      const own = input.market.bankDelta[incumbent]?.[t] ?? 0;
      priceExtra[t] = rec !== null && rec < own ? rec : own;
      if (rec !== null && rec < own) priceBasis = "record";
    }
  } else if (!target && variant === "bank" && incumbent && tier.tier === "bankPremium") priceBasis = "premium";
  // A bankPremium client at the bank that holds the mortgage (refinanced there,
  // or that bank picked in the profile) pays the bank's difference OR the
  // premium, never both (audit U4: L47 savings −₪131,420 automatically, −₪22,613
  // with its own bank picked; r07 −₪99,300 and −₪58,625). A premium read from the
  // client's own record is measured against the system and already holds that
  // bank's level; a premium that is an estimate (no record that strong: r07's
  // 0.50 floor for bureau non-payment) is the larger of the two, track by track.
  const atIncumbent = tier.tier === "bankPremium" && variant === "bank" && !!incumbent && (!target || target === incumbent);
  if (atIncumbent) {
    const measured = !!tier.record && tier.record.level >= PREMIUM_EVIDENCE;
    for (const t of TRACKS) priceExtra[t] = measured ? 0 : Math.max(0, (input.market.bankDelta[incumbent!]?.[t] ?? 0) - tier.premium);
  }
  const pricing = pricingFor(input.market, f, input, tier, variant === "secondLien" ? "second" : "first", atIncumbent ? "system" : target ?? "system", priceExtra);
  // The age limit at the end of the loan is bank practice, not law: the override lifts it.
  const ageCap = profile.age && !override ? Math.max(1, Math.floor(AGE_AT_END - profile.age)) : TERM_MAX_YEARS;
  // The shortest term on the menu is MIN_YEARS.prime (4): a client whose age
  // leaves less than that gets no new money from a bank's practice at all.
  const ageRefuses = ageCap < MIN_YEARS.prime;
  const maxYears = Math.max(MIN_YEARS.prime, Math.min(TERM_MAX_YEARS, tier.maxYears, ageCap));
  const apYears = Math.min(maxYears, AP_TERM_MAX_YEARS);
  const collateralValue = input.analysis?.mortgage.collateralValue || 0;
  const propertyValue = profile.propertyValue && profile.propertyValue > 0 ? profile.propertyValue : collateralValue > 0 ? collateralValue : null;
  const valueSource = profile.propertyValue && profile.propertyValue > 0 ? "שווי שהוזן" : collateralValue > 0 ? "שווי הבטוחה כפי שדווח בדוח" : null;
  const collateral = mortgages.length > 0 || !!propertyValue;
  // Mortgage rows the solver does not decide on (past their term, no override):
  // still on the property, so still in its limits.
  const decided = new Set(debts.flatMap((d) => [d.id, d.due?.rowId].filter(Boolean) as string[]));
  const stuck = owedOnly(input.master).filter((l) => l.group === "mortgage" && !decided.has(l.id) && Number(l.amount) > 0);
  const secured = {
    balance: sum(stuck.map((l) => Number(l.amount))),
    fixed: sum(stuck.filter((l) => isFixedPath(Number(l.path_id))).map((l) => Number(l.amount))),
    linked: sum(stuck.filter((l) => isLinkedPath(Number(l.path_id))).map((l) => Number(l.amount))),
  };
  // Today's shares of the property's credit: every owed mortgage-secured row as
  // the board holds it, a past-due one included (under the override it is paid
  // off as debt due now, but today it is on the property: leaving it out read
  // today's CPI share as 67% instead of 64%, and the guardrail let it rise).
  const onProperty = owedOnly(input.master).filter((l) => l.group === "mortgage" && Number(l.amount) > 0);
  const allBal = sum(onProperty.map((l) => Number(l.amount)));
  const fixedToday = allBal > 0 ? sum(onProperty.filter((l) => isFixedPath(Number(l.path_id))).map((l) => Number(l.amount))) / allBal : 1;
  const linkedToday = allBal > 0 ? sum(onProperty.filter((l) => isLinkedPath(Number(l.path_id))).map((l) => Number(l.amount))) / allBal : 0;
  const nonbankLaw = tier.tier === "nonbank";
  const ltv = !propertyValue
    ? null
    : !nonbankLaw
      ? { value: propertyValue, housing: LTV_MAX[profile.propertyType], withAp: Math.min(AP_LTV_RELIEF, AP_LTV + AP_RELIEF_CAP / propertyValue) }
      : variant === "secondLien"
        ? // The first lien stays with the bank; the lender's cap is on first + second together.
          { value: propertyValue, housing: 1, withAp: NONBANK_LTV.combined }
        : { value: propertyValue, housing: NONBANK_LTV.first, withAp: NONBANK_LTV.first };
  // No known collateral refuses all-purpose money — unless the override says a property will be pledged.
  const consolidateOk = profile.consolidate && (collateral || override);
  const dueAll = sum(debts.filter((d) => d.forced && (d.due || d.called)).map((d) => d.balance)) + sum(debts.map((d) => d.cure ?? 0));
  const segments: Segment[] =
    (consolidateOk && debts.some((d) => d.group === "loan" && !d.lock)) || debts.some((d) => d.group === "mortgage" && d.segment === "allPurpose" && !d.lock) || dueAll > 0
      ? ["housing", "allPurpose"]
      : ["housing"];
  const cols = columnsFor(pricing, input, f, maxYears, apYears, segments);
  const cheap = cheapDebts(debts, cols, moveWhole);
  // THE REFERENCE when debt is due now: today's mix kept as it is, and the due
  // debt carried at the lowest monthly payment the lender's menu allows (the
  // cheapest-per-shekel all-purpose column — the longest term). It is the least
  // any honest plan must do; every "versus today" figure is measured from it.
  const apCols = cols.filter((c) => c.segment === "allPurpose");
  const carryCol = dueAll > 0 && apCols.length ? apCols.reduce((b, c) => (c.monthly < b.monthly ? c : b), apCols[0]) : null;
  const carry = carryCol ? Math.ceil(dueAll * carryCol.monthly) : 0;
  const ref = {
    monthly: today.metrics.monthly + carry,
    paid: today.paid[0] + (carryCol ? dueAll * carryCol.paid[0] : 0),
    typedPaid: today.metrics.totalPaid + (carryCol ? dueAll * carryCol.typedPaid : 0),
    typedCost: today.metrics.totalCost + (carryCol ? dueAll * carryCol.typedPaid - dueAll : 0),
    months: Math.max(today.metrics.months, carryCol ? carryCol.years * 12 : 0),
    worst: Math.max(...today.paid.slice(1).map((x, k) => x + (carryCol ? dueAll * carryCol.paid[k + 1] : 0))),
    due: dueAll,
    carry,
    carryYears: carryCol?.years ?? 0,
    ...(carryCol ? { carryRate: carryCol.price.rate } : {}),
    book: null as Book | null,
  };
  const budget = profile.budget && profile.budget > 0 ? profile.budget : ref.monthly;
  const solveBudget = budget;
  const openingFee = (x: number) => Math.round(x * tier.openingFee);
  const base: Spec = {
    wMonthly: 0,
    wCost: 1,
    lambda: 0,
    budget: solveBudget,
    peakCap: null,
    finish: null,
    keepMortgage: variant === "secondLien",
    loansAllowed: consolidateOk,
    law: nonbankLaw ? "nonbank" : "bank",
    shareCap: true,
    moveWhole,
    ptiCap: profile.income && profile.income > 0 ? PTI_MAX * profile.income : null,
    ltv,
    fixedToday,
    linkedToday,
    ...(secured.balance > 0 ? { secured } : {}),
    // A non-bank's opening fee is its file fee (the ₪360 cap binds banks), and a
    // second lien adds the first bank's consent fee.
    setupHousing: SETUP_HOUSING - (nonbankLaw ? SETUP.file : 0) + openingFee(sum(mortgages.filter((d) => d.segment === "housing").map((d) => d.balance))),
    setupAp:
      SETUP_AP_ALONE - (nonbankLaw ? SETUP.file : 0) + (variant === "secondLien" ? SECOND_LIEN_CONSENT : 0) + openingFee(sum(debts.filter((d) => d.segment === "allPurpose").map((d) => d.balance))),
    setupApShared: SETUP.appraisal,
    ...(cheap.length ? { hold: cheap.map((x) => x.id) } : {}),
  };
  const ctx: Ctx = {
    input,
    f,
    market: input.market,
    debts,
    cols,
    pricing,
    today,
    budget,
    base,
    maxYears,
    apYears,
    propertyValue,
    valueSource,
    collateral,
    moveWhole,
    priceBank,
    incumbent,
    priceBasis,
    priceExtra,
    blocked:
      tier.blocked ??
      (ageRefuses
        ? `גיל ${profile.age}, ולפי נוהג הבנקים ההלוואה מסתיימת עד גיל ${AGE_AT_END}: נשארות פחות מ-${MIN_YEARS.prime} שנים, התקופה הקצרה ביותר, ואין לבנות תמהיל בלי אישור המלווה או לווה נוסף צעיר יותר.`
        : null),
    cond,
    override,
    ref,
    variant,
    cheapBy: new Map(cheap.map((x) => [x.id, x.by])),
  };

  return { ctx, consolidateOk };
}

export function buildAutoMix(input: AutoMixInput): AutoMixResult {
  const t = input.tuning;
  if (!t?.shocks && !t?.baseShift) return buildIn(input);
  // A back-test's economies (types.ts Tuning), for this build only.
  ECON = economiesOf(t.shocks, t.baseShift);
  try {
    return buildIn(input);
  } finally {
    ECON = ECONOMIES;
  }
}

function buildIn(input: AutoMixInput): AutoMixResult {
  const t0 = now();
  const skipped: AutoMixResult["skipped"] = [];
  const f = input.forecast;
  const emptyMetrics: MixMetrics = { balance: 0, monthly: 0, peakMonthly: 0, months: 0, totalPaid: 0, totalCost: 0, totalInterest: 0, pv: 0, avgRate: 0, shares: [], fixedShare: 0, linkedShare: 0, outlook: null };
  const fail = (reason: string, today: MixMetrics = emptyMetrics, blocks: Block[] = []): AutoMixResult => ({
    ok: false,
    reason,
    blocks,
    dueNow: null,
    today,
    findings: [],
    proposals: [],
    recommended: null,
    pricing: { asOf: input.market?.levelPeriod ?? "", bank: input.profile.bank, tier: "bank", tierWhy: "", rows: [], notes: [] },
    skipped,
    ms: now() - t0,
  });
  if (!f) return fail("תחזית הריבית והמדד של בנק ישראל עדיין לא נטענה, ואי אפשר לתמחר כסף חדש.");
  setCpiMonthly((history.sources.cpi as { yoy: number | null }).yoy);
  mergeFeeRows(input.market?.feeRows);

  const prep0 = prepare(input, f, skipped, "bank");
  if ("fail" in prep0) return fail(prep0.fail, prep0.today.metrics, blocksOf(prep0.parts, []));
  const ctx = prep0.ctx;
  const { today, pricing, maxYears } = ctx;
  const profile = input.profile;
  const tier = pricing.tier;
  const wanted = new Set<GoalId>(input.goals ?? ORDER);

  // STRUCTURES. A bank tier lends as a bank does. A non-bank lender either
  // lends behind the existing mortgage on a second lien (the mortgage stays), or
  // takes the first lien (the whole mortgage is repaid from its money) — the
  // engine solves both and keeps, per goal, the one that does better on that
  // goal's own measure, and says what the other would have been.
  const runs: Run[] = [];
  let shared: Ctx["ref"] | null = null;
  for (const v of variantsFor(ctx)) {
    const p = v === "bank" ? prep0 : prepare(input, f, [], v);
    if ("fail" in p) continue;
    // One reference for every structure: today's mix, plus the cheapest monthly
    // way to clear the debt due now (solved, with its costs), mortgage kept.
    if (!shared) shared = referenceOf(p.ctx);
    applyReference(p.ctx, shared);
    runs.push(runGoals(p.ctx, p.consolidateOk, wanted));
  }
  if (shared) applyReference(ctx, shared);
  const solvedBy = new Map<GoalId, Solved>();
  let unavailableConsolidate: Proposal | null = null;
  for (const goal of ORDER) {
    const options = runs.map((r) => r.solvedBy.get(goal)).filter((x): x is Solved => !!x);
    const solvedOk = options.filter((x) => x.plan.ok);
    // A cost goal's structure that passes its gates is preferred over one whose
    // better objective a gate refuses (the gates are part of the answer: W1).
    const passing = GATED_GOALS.includes(goal) && solvedOk.length > 1 ? solvedOk.filter((x) => quickJudge(x.ctx!, goal, x).status === "ok") : [];
    const ok = passing.length ? passing : solvedOk;
    if (!options.length) {
      unavailableConsolidate = goal === "consolidate" ? runs.map((r) => r.unavailableConsolidate).find(Boolean) ?? null : unavailableConsolidate;
      continue;
    }
    if (!ok.length) {
      solvedBy.set(goal, options[0]);
      continue;
    }
    // The second lien keeps the bank mortgage: it is the incumbent, and a first lien
    // must beat it MATERIALLY on the goal's own measure to replace it.
    const anchors = goal === "balanced" ? { R: Math.max(0, ...ok.map((x) => Number(x.meta?.reliefMax ?? 0))), S: Math.max(0, ...ok.map((x) => Number(x.meta?.savingMax ?? 0))) } : undefined;
    const best = ok.reduce((b, x) => (beatsMaterially(goal, x, b, anchors) ? x : b), ok[0]);
    const other = solvedOk.filter((x) => x !== best).reduce<Solved | null>((b, x) => (!b || better(score(goal, x, anchors), score(goal, b, anchors)) ? x : b), null);
    const missing = runs.length > 1 && !other ? runs.find((r) => r.ctx.variant !== best.ctx!.variant && r.solvedBy.has(goal)) : undefined;
    const floorPlan = missing?.solvedBy.get("payment");
    solvedBy.set(goal, {
      ...best,
      alt: other ?? undefined,
      altMissing: missing?.ctx.variant,
      altFloor: floorPlan?.plan.ok ? shown(missing!.ctx, floorPlan.plan).monthly : undefined,
    });
  }
  // THE SHEET'S OWN ORDERING, across structures: adopt another goal's mix when it
  // shows a better figure on this goal's displayed measure and obeys its rules.
  adoptAcross(ctx, solvedBy);
  const proposals: Proposal[] = [];
  for (const goal of ORDER) {
    const sv = solvedBy.get(goal);
    if (sv) proposals.push(proposalOf(sv.ctx ?? ctx, goal, sv));
    else if (goal === "consolidate" && unavailableConsolidate) proposals.push(unavailableConsolidate);
  }
  // Fold identical answers onto the first goal that reached them.
  // The primary of a pair is the one with the better status (ok before no-gain),
  // then the earlier goal; the other points at it.
  const rank = (p: Proposal) => (p.status === "ok" ? 0 : p.status === "no-gain" ? 1 : 2);
  for (let i = 0; i < proposals.length; i++) {
    if (proposals[i].sameAs) continue;
    for (let j = 0; j < proposals.length; j++) {
      if (i === j || proposals[j].sameAs || !sameMix(proposals[i], proposals[j])) continue;
      const [a, b] = rank(proposals[i]) < rank(proposals[j]) || (rank(proposals[i]) === rank(proposals[j]) && i < j) ? [i, j] : [j, i];
      proposals[b].sameAs = proposals[a].goal;
      if (b === i) break;
    }
  }
  // Savings' own objective comes first (rules.ts DISPLAY_GIVE): where another
  // offered goal within savings' budget shows a lower typed cost, the savings
  // line says so and why, with the figures of both views.
  const sav = proposals.find((p) => p.goal === "savings" && p.status === "ok");
  if (sav)
    for (const p of proposals) {
      if (p === sav || p.status !== "ok" || p.sameAs === "savings" || !BUDGET_GOALS.includes(p.goal) || p.metrics.monthly > ctx.budget + 0.5) continue;
      if (!(sav.metrics.totalCost > p.metrics.totalCost + 1)) continue;
      const dF = (sav.stress[0]?.totalPaid ?? 0) - (p.stress[0]?.totalPaid ?? 0);
      const worstOf = (x: Proposal) => Math.max(...x.stress.map((s) => s.totalPaid));
      const dW = worstOf(sav) - worstOf(p);
      const word = (x: number) => (x <= 0 ? `${nis(x)} פחות` : `${nis(x)} יותר`);
      sav.caveats.push(
        `בלוח, לפי הריבית המוקלדת, יעד "${p.label}" מראה ריבית והצמדה נמוכות יותר, ${nis(p.metrics.totalCost)} מול ${nis(sav.metrics.totalCost)}. בתחזית בנק ישראל התמהיל הזה משלם ${word(dF)} בסך הכול ובתרחיש הגרוע ${word(dW)}, והחיסכון נמדד כך: הלוח מחזיק את הריבית והמדד קבועים.`
      );
    }
  // Blocks — always — and, on every proposal built past one, the first caveat names it with its condition.
  const blocks = blocksOf(ctx, proposals);
  const lead = overrideCaveat(ctx, blocks);
  if (lead) for (const p of proposals) p.caveats.unshift(lead);
  const recommended = recommendationOf(ctx, proposals);

  const rate = (t: TrackKey, y: number) => round2(pricing.rate(t, Math.min(y, maxYears), "housing").rate);
  const asOf = input.market.levelPeriod;
  const sgn = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(2)}`;
  const dmy = (d: string) => d.split("-").reverse().join("/");
  const notes = [
    `רמת הריבית לפי מסלול ולפי בנק לקוחה מהשוואת הריביות של בנק ישראל (TamInt010) לחודש ${input.market.bankPeriod.split("-").reverse().join("/")}, והומרה מריבית מתואמת לריבית נקובה.`,
    input.market.housing?.avg
      ? `ריבית קבועה לפי תקופה: ההפרשים בין טווחי התקופה לפי טבלאות הריבית הממוצעת של בנק ישראל (דוח ${dmy(newFixedRate(false, 120).report ?? "")}), ברמה של ממוצע הלוואות הדיור באותו מסלול (TamInt010), כי הטבלאות כוללות גם הלוואות לכל מטרה בביטחון דירה. הפריים ${input.market.boi.prime.toFixed(2)}% (ריבית בנק ישראל ${input.market.boi.rate.toFixed(2)}% מ-${dmy(input.market.boi.since)}).`
      : `ריבית קבועה לפי תקופה: הממוצע של בנק ישראל להלוואות חדשות בכל טווח תקופה (טבלאות הריבית הממוצעת, דוח ${dmy(newFixedRate(false, 120).report ?? "")}), בהמרה לריבית נקובה. הפריים ${input.market.boi.prime.toFixed(2)}% (ריבית בנק ישראל ${input.market.boi.rate.toFixed(2)}% מ-${dmy(input.market.boi.since)}).`,
    `תוספת כל מטרה של ${Math.min(input.market.allPurposePremium.klz, input.market.allPurposePremium.prime).toFixed(2)} עד ${Math.max(input.market.allPurposePremium.klz, input.market.allPurposePremium.prime).toFixed(2)} נק׳ לפי BIR_MRTG_99, ונבדקה מול לוח n12b לאוקטובר 2026.`,
    "הלוואה לכל מטרה עד 30 שנה לפי הוראה 329, והתקופה הממוצעת שניתנה בפועל באוקטובר 2026 הייתה 23.7 שנים (בנק ישראל, n12b).",
    `עמלות הפירעון לפי טבלאות הריבית הממוצעת של בנק ישראל שבתוקף מ-${dmy(feeTableAsOf().unlinked)}.`,
    `תרחישי הלחץ הם טעות התחזית של השוק בשנים 2008 עד 2021 (אחוזונים 10 ו-90): ריבית ${sgn(history.shocks.rateDown)} ו-${sgn(history.shocks.rateUp)} נק׳, מדד ${sgn(history.shocks.cpiDown)} ו-${sgn(history.shocks.cpiUp)} נק׳.`,
  ];
  if (runs.some((r) => r.ctx.variant === "bankMove") && ctx.incumbent)
    notes.unshift(
      `מחזור פנימי תומחר ${ctx.priceBasis === "record" ? `לפי מה ש${BANKS.find((b) => b.id === ctx.incumbent)?.label} גבה מהלקוח עצמו` : `בריביות של ${BANKS.find((b) => b.id === ctx.incumbent)?.label}`}, שבו המשכנתא היום, ומעבר של כל המשכנתא לבנק אחר תומחר בממוצע הבנקים. בכל יעד נבחר המבנה הטוב יותר.`
    );
  if ((input.market.version ?? 1) < 2) notes.unshift("נתוני השוק שהתקבלו בנויים בגרסה הישנה (פער של כ-0.1 נק׳ בפריים). יש לרענן את נתוני השוק.");
  return {
    ok: true,
    today: today.metrics,
    findings: findingsOf(ctx, input.analysis),
    proposals,
    recommended,
    pricing: {
      asOf,
      bank: ctx.priceBank,
      tier: tier.tier,
      tierWhy: tier.why,
      rows: tier.tracks.map((t) => ({ track: t, label: TRACK_SHORT[t], rate10: rate(t, 10), rate20: rate(t, 20), rate30: rate(t, 30) })),
      notes,
    },
    skipped,
    blocks,
    dueNow: dueNowOf(ctx),
    ms: now() - t0,
  };
}

/**
 * The recommendation: the first offered goal that does not cost more than the
 * reference in the forecast (beyond the neutral residue), in the order מאוזן →
 * savings → stability → years → consolidation. A goal that buys something at a
 * price (the lowest payment, a consolidation or a stability that costs) is
 * recommended only when the advisor's inputs ask for it: a budget typed below
 * today's payment asks for relief (מאוזן, else the lowest payment). Otherwise
 * nothing is recommended and the sheet shows no badge. Audit S3: in 37 corpus
 * builds the recommendation was the lowest payment at +₪24k…+₪365k while
 * another offered goal saved money (L14: +₪248,298 while years saved ₪67,658);
 * in the back-test all 23 payment fallbacks cost more than keeping (mean +₪249,347).
 */
function recommendationOf(ctx: Ctx, proposals: Proposal[]): GoalId | null {
  const neutral = MATERIAL.neutral(ctx.ref.paid);
  const offered = (g: GoalId) => proposals.find((p) => p.goal === g && p.status === "ok" && !p.sameAs);
  const costsNoMoreThanRef = (p: Proposal) => (p.stress[0] ? p.stress[0].totalPaid - p.stress[0].todayTotalPaid : 0) <= neutral;
  for (const g of ["balanced", "savings", "stable", "years", "consolidate"] as GoalId[]) {
    const p = offered(g);
    if (p && costsNoMoreThanRef(p)) return g;
  }
  const typed = ctx.input.profile.budget;
  if (typed && typed > 0 && typed < ctx.ref.monthly - 0.5) for (const g of ["balanced", "payment"] as GoalId[]) if (offered(g)) return g;
  return null;
}

/** AutoMixResult.dueNow — the debt due now and the reference measured from it. */
function dueNowOf(ctx: Ctx): AutoMixResult["dueNow"] {
  if (!ctx.override || !(ctx.ref.due > 0)) return null;
  const items = ctx.debts
    .filter((d) => d.due || d.called)
    .map((d) => ({ id: d.id, label: d.label, balance: Math.round(d.balance), kind: d.due ? d.due.kind : ("called" as const), rowId: d.due ? d.due.rowId : d.id }));
  const cures = ctx.debts.filter((d) => (d.cure ?? 0) > 0).map((d) => ({ rowId: d.id, overdue: Math.round(d.cure!) }));
  const fromProfile = !!(ctx.input.profile.budget && ctx.input.profile.budget > 0);
  return {
    total: Math.round(ctx.ref.due),
    items,
    cures,
    reference: {
      monthly: ctx.ref.monthly,
      totalPaid: Math.round(ctx.ref.typedPaid),
      months: ctx.ref.months,
      ...(ctx.input.forecastOn && ctx.ref.book?.metrics.outlook ? { pv: Math.round(ctx.ref.book.metrics.outlook.pv) } : {}),
    },
    budget: ctx.budget,
    budgetSource: fromProfile ? "profile" : "reference",
  };
}

/** Exposed for the check script. */
export const __test = { STATS, SLIVER_STATS, GATE_STATS, DISPLAY_STATS, PAYMENT_STAGE, ALIGN_STATS, runGoals, sliversOf, sliverTest, SLIVER_REASON, unsliver, solveBalanced, frontierPoint, solveGuarded, variantsFor, referenceOf, applyReference, prepare, solveTermsRaw, specFor, LAMBDA, bookOf, rowsOf, priceRow, debtsOf, columnsFor, pricingFor, trancheRow, SETUP_HOUSING, SETUP_AP_ALONE, isIndexedPath };
