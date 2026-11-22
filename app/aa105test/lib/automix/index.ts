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
import { addMonths, startOfToday, toIso } from "@/app/aa102test/lib/dates";
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
  NewTranche,
  Proposal,
  StressRow,
  TrackShare,
} from "./types";
import { ECONOMIES, scheduleIn, typedRow, pvOf } from "./econ";
import { prepaymentFee, setCpiMonthly, feeTableAsOf, newFixedRate, OPERATIONAL_FEE } from "./fees";
import { resolveTier, primeOn, NONBANK, NONBANK_LTV, LADDER, isAllPurpose, type TierInfo } from "./tiers";
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
} from "./rules";
import { solveTerms as solveTermsRaw, solveOnce, termsOf, STATS, EARLY, U, SHARE_SLACK, type Seed, type Column, type Plan, type Segment, type SolverDebt, type Spec } from "./solve";
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
 * A home-secured loan far below what lenders write. No lender publishes a
 * minimum; Mimun Yashir's all-second-lien Series 4 averages ₪408,723 (S&P
 * Maalot 12/07/2026) and Meitav lends from ₪500,000. The engine still builds
 * a smaller one, and says so under ₪50,000 (the solver's own MIN_TRANCHE).
 */
const SMALL_LOAN = 50_000;
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
  years: "אותו החזר חודשי לכל היותר, והחוב כולו נגמר מוקדם ככל האפשר",
  savings: "אותו החזר חודשי לכל היותר, והכי פחות כסף משולם בסך הכול",
  balanced: "הקלה בהחזר בלי לשלם יותר בסך הכול, בסיכון מתון",
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
};

/** A balloon (schedule 3/4) repays its principal in one last payment: that month is not a "monthly payment". */
const lumpMonth = (l: ImportedLoan) => {
  const sch = Number(l.amortization_schedule_id) || 1;
  return sch === 3 || sch === 4 ? Math.round(Number(l.months) || 0) : 0;
};

function priceRow(l: ImportedLoan, inflation: number, f: Forecast, discountRate?: number): Priced {
  const t = typedRow(l, inflation);
  const pay: number[][] = [];
  const bal: number[][] = [];
  for (const e of ECONOMIES) {
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
  const regular = ECONOMIES.map(() => [] as number[]);
  const pay = ECONOMIES.map(() => [] as number[]);
  const bal = ECONOMIES.map(() => [] as number[]);
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
  const quote = (track: TrackKey, years: number, segment: Segment) => {
    const p = newRate(m, f, track, years * 12, segment, opt);
    const shift = extra[track] ?? 0;
    if (track !== "klz" && track !== "kz") return shift ? { ...p, rate: p.rate + shift, margin: p.margin === null ? null : p.margin + shift } : p;
    const base = newRate(m, f, track, years * 12, "housing", { bank: "system", discount: 0 }).rate;
    return { ...p, rate: newFixedRate(track === "kz", years * 12).rate + (p.rate - base) + shift };
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
  priced: Priced;
  /** A debt due now (override): what it is in the document. */
  due?: DueDebt;
  /** A row in the mix in serious arrears (90+ days or legal hands): its lender is calling it (override). */
  called?: boolean;
};

/** A debt due now, as a debt the solver must clear: nothing paid on it today, nothing priced. */
function dueDebtOf(d: DueDebt, row: ImportedLoan | null): Debt {
  const zeros = ECONOMIES.map(() => 0);
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
    early: ECONOMIES.map(() => EARLY.map(() => 0)),
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
    priced: { typedMonthly: 0, typedInterest: 0, typedPaid: 0, typedPay: [], pay: ECONOMIES.map(() => []), bal: ECONOMIES.map(() => []), paid: zeros, pv: 0, peak: zeros, early: ECONOMIES.map(() => EARLY.map(() => 0)) },
    due: d,
  };
}

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
    if (group === "mortgage") {
      const q = prepaymentFee(l);
      fee = q.fee;
      feeEstimated = q.estimated;
      feeBasis = q.basis;
      cpiAveraging = q.cpiAveraging;
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
  ref: { monthly: number; paid: number; typedPaid: number; typedCost: number; months: number; worst: number; due: number; carry: number; carryYears: number; book: Book | null; pv?: number | null };
  /**
   * The structure this context prices: a bank (an internal refinance at the bank
   * that holds the mortgage, or the bank the advisor picked), the whole mortgage
   * moved to another bank, or a non-bank lender on the first or the second lien.
   */
  variant: Variant;
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

function checksOf(ctx: Ctx, rows: ImportedLoan[], plan: Plan, metrics: MixMetrics, goal: GoalId): Check[] {
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
    out.push({ label: "החזר חודשי במסגרת", ok: metrics.monthly <= ctx.budget + 0.5, value: `${nis(metrics.monthly)} מתוך ${nis(ctx.budget)}`, rule: "המסגרת שנקבעה לתמהיל" });
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
  return ECONOMIES.map((e, k) => ({
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
};

function specFor(ctx: Ctx, over: Partial<Spec>): Spec {
  return { ...ctx.base, ...over };
}

/** The lowest payment under every guardrail — and, when it can be had, a payment that survives the bad economies. */
function solvePayment(ctx: Ctx): Solved {
  const s = specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget: null });
  // Soundness: for the next five years, in every economy, the payment should not rise above what is paid today.
  const gs = { ...s, peakCap: ctx.ref.monthly };
  // The unguarded optimum first: it is cheap, and when it already keeps the
  // guard it is the guarded optimum too (the guard only removes mixes). The
  // guarded MILP is the hard one (r04: 1.3s at the node cap against 8ms), so it
  // runs only when the free answer breaks the guard.
  const free = solveTerms(ctx.debts, ctx.cols, s);
  if (free.ok) {
    const keys = new Set(Object.keys(free.amounts));
    const held = solveOnce(ctx.debts, ctx.cols.filter((c) => keys.has(c.key)), { ...gs, fixZ: free.refinance });
    if (held.ok && held.objective <= free.objective + 1e-6 * Math.max(1, Math.abs(free.objective)))
      return { plan: held, meta: { guard: 1 }, spec: gs, cols: ctx.cols };
  }
  const guarded = solveTerms(ctx.debts, ctx.cols, gs);
  if (guarded.ok) return { plan: guarded, meta: { guard: 1 }, spec: gs, cols: ctx.cols };
  return { plan: free, meta: { guard: 0 }, spec: s, cols: ctx.cols };
}

function costSpec(ctx: Ctx, goal: GoalId, over: Partial<Spec> = {}): Spec {
  return specFor(ctx, { wMonthly: 0, wCost: 1, lambda: LAMBDA[goal], budget: ctx.base.budget, ...pvCapOf(ctx, goal), ...over });
}
/**
 * Savings and balanced may not cost more than the reference in present value
 * (the board's discount rate, forecast economy): the same test the proposal's
 * gate applies, held inside the solve so the optimum never fails it.
 */
function pvCapOf(ctx: Ctx, goal: GoalId): Partial<Spec> {
  if ((goal !== "savings" && goal !== "balanced") || !ctx.input.forecastOn) return {};
  const pv = ctx.ref.pv ?? (ctx.ref.book ?? ctx.today).metrics.outlook?.pv;
  return typeof pv === "number" ? { pvCap: pv } : {};
}
function solveCost(ctx: Ctx, goal: GoalId, over: Partial<Spec> = {}): Plan {
  return solveTerms(ctx.debts, ctx.cols, costSpec(ctx, goal, over));
}

function solveYears(ctx: Ctx): Solved {
  // Candidate finish months: whole years for new money, and every kept debt's own end.
  const cands = new Set<number>();
  for (let y = 1; y <= ctx.maxYears; y++) cands.add(y * 12);
  for (const d of ctx.debts) cands.add(d.months);
  const sorted = Array.from(cands).sort((a, b) => a - b);
  const todayEnd = Math.max(0, ...ctx.debts.map((d) => d.months));
  const found = new Map<number, { plan: Plan; spec: Spec }>();
  const feasible = (T: number) => {
    const spec = specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget: ctx.base.budget, finish: T });
    const p = solveTerms(ctx.debts, ctx.cols.filter((c) => c.years * 12 <= T), spec);
    if (p.ok) found.set(T, { plan: p, spec });
    return p.ok;
  };
  let lo = 0;
  let hi = sorted.findIndex((T) => T >= todayEnd);
  if (hi < 0) hi = sorted.length - 1;
  if (!feasible(sorted[hi])) {
    // Clearing debt due now can make today's end date unreachable within the budget: the goal is then the
    // earliest finish that is reachable at all (it will not read "ok" unless it is earlier than today's).
    const later = sorted.slice(hi + 1).findIndex((T) => feasible(T));
    if (later < 0 || !ctx.ref.due) return { plan: { ok: false, status: "infeasible", refinance: [], amounts: {}, objective: NaN, setupHousing: 0, setupAp: 0 } };
    return yearsAtFrom(ctx, sorted[hi + 1 + later], found.get(sorted[hi + 1 + later]));
  }
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (feasible(sorted[mid])) hi = mid;
    else lo = mid + 1;
  }
  const T = sorted[hi];
  return yearsAtFrom(ctx, T, found.get(T));
}

/**
 * The cheapest mix that ends by T, started from the mix the search already
 * found there: the cost stage (with its stress rows) can read a feasible problem
 * as infeasible (yalps drops cycled nodes), and a goal that HAS an answer must
 * not read "unavailable" (corpus Z39: a larger budget made years unavailable).
 */
function yearsAtFrom(ctx: Ctx, T: number, seed?: { plan: Plan; spec: Spec }): Solved {
  const at = yearsAt(ctx, T);
  if (at.plan.ok || !seed) return at;
  const again = yearsAt(ctx, T, seed.plan);
  if (again.plan.ok) return again;
  return { plan: seed.plan, meta: { finish: T }, spec: seed.spec, cols: ctx.cols.filter((c) => c.years * 12 <= T) };
}

/** The cheapest (λ = 0.35) mix within budget whose last payment is by month T. */
function yearsAt(ctx: Ctx, T: number, start?: Plan): Solved {
  const cols = ctx.cols.filter((c) => c.years * 12 <= T);
  const spec = specFor(ctx, { wMonthly: 0, wCost: 1, lambda: LAMBDA.years, budget: ctx.base.budget, finish: T });
  const plan = start ? solveTermsRaw(ctx.debts, cols, spec, POOL, start) : solveTerms(ctx.debts, cols, spec);
  return { plan, meta: { finish: T }, spec, cols };
}

/**
 * מאוזן — the most payment relief that does not cost more overall, at most half
 * the way to the lowest sound payment. Solved exactly in two steps: (1) the
 * lowest payment with total cost ≤ today's (forecast AND typed read-out) and the
 * payment ≥ the halfway floor; (2) the cheapest mix (λ = 0.5) at that payment.
 * Exact, so the answer moves continuously with the inputs — a grid of relief
 * steps made it jump by a step for a 0.05pp change in one rate.
 */
function solveBalanced(ctx: Ctx, payMin: number): Solved {
  const r = reliefSolve(ctx, "balanced", payMin, 0.5, { peakCap: ctx.ref.monthly });
  if (r.plan.ok) return r;
  // No relief comes without paying more overall: the cheapest mix within the
  // budget stands in (it will read "no-gain" unless it happens to relieve) —
  // within the relief budget, so a raised budget cannot buy a higher payment.
  const spec = costSpec(ctx, "balanced", { budget: Math.min(ctx.base.budget ?? Infinity, reliefBudget(ctx)) });
  return { plan: solveTerms(ctx.debts, ctx.cols, spec), meta: { phi: 0, payMin }, spec, cols: ctx.cols };
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
  const s = specFor(ctx, { keepMortgage: true, loansAllowed: true, shareCap: false });
  const min = solveTerms(ctx.debts, ctx.cols, { ...s, wMonthly: 1, wCost: 1e-3, lambda: 0, budget: null });
  if (!min.ok) return { plan: min };
  const payMin = bookOf(rowsOf(ctx, min).rows, ctx.input, ctx.f).metrics.monthly;
  const neutral = reliefSolve(ctx, "consolidate", payMin, 0.75, { keepMortgage: true, loansAllowed: true, shareCap: false });
  // "Keep everything" satisfies "no more relief than costs nothing" — for consolidation that is not an answer:
  // when no material relief is free, take half the way and say what it costs.
  if (neutral.plan.ok && neutral.plan.refinance.length && ctx.ref.monthly - shown(ctx, neutral.plan).monthly >= MATERIAL.monthly(ctx.ref.monthly)) return neutral;
  const B = reliefBudget(ctx);
  const cap = Math.floor(B - 0.5 * (B - payMin));
  const spec = { ...s, wMonthly: 0, wCost: 1, lambda: LAMBDA.consolidate, budget: cap };
  const plan = solveTerms(ctx.debts, ctx.cols, spec);
  return plan.ok ? { plan, meta: { phi: 0.5, costs: 1, payMin, cap }, spec, cols: ctx.cols } : { plan: min };
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
  if (!sv.spec || !plan.ok) return false;
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
      if (g === "payment" || !sv.plan.ok) continue;
      const m = shown(ctx, sv.plan).monthly;
      if (m < best) {
        // A goal with tighter rules reached a lower payment: the payment goal takes that mix.
        solvedBy.set("payment", { ...pay, plan: sv.plan, meta: { ...pay.meta, guard: 0, adopted: g } });
        best = m;
      }
    }
  }
  // Savings shows the least COST (interest + indexation) on the typed read-out.
  // Not סה״כ ריבית: it leaves out indexation, and "least interest" would steer
  // savings into CPI-linked tracks whose cost that column cannot see.
  const sav = solvedBy.get("savings");
  if (sav?.plan.ok && sav.spec) {
    for (let round = 0; round < 3; round++) {
      const cur = solvedBy.get("savings")!;
      const own = shown(ctx, cur.plan).totalCost;
      let rival: { g: GoalId; plan: Plan; cost: number } | null = null;
      for (const g of BUDGET_GOALS) {
        if (g === "savings") continue;
        const sv = solvedBy.get(g);
        if (!sv?.plan.ok) continue;
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
      solvedBy.set("savings", tries.length ? { ...sav, plan: tries[0], spec } : { ...sav, plan: rival.plan });
    }
  }
}

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
    const why = overLtv
      ? `שיעור המימון היום ${pct(mortgageBal / ctx.propertyValue!)}, מעל ${pct(LTV_MAX[ctx.input.profile.propertyType])}. מחזור אסור להגדיל אותו (הוראה 329 סעיף 9), ועמלות ועלויות שממומנות בהלוואה מגדילות אותו, ולכן יש לשלם אותן במזומן.`
      : goal === "years" || goal === "savings" || goal === "stable"
        ? `אין תמהיל שעומד בכל הכללים בהחזר של עד ${nis(ctx.budget)}. המסגרת נמוכה מדי לתנאי השוק של הלקוח.`
        : "אין תמהיל שעומד בכל הכללים יחד.";
    return empty("unavailable", why);
  }
  let { rows, tranches } = rowsOf(ctx, plan);
  let book = bookOf(rows, ctx.input, ctx.f);
  // Rounding the tranches can move the typed payment by a few shekels: re-solve under a tighter budget.
  let p2 = plan;
  for (let i = 0; i < 3 && goal !== "payment" && book.metrics.monthly > ctx.budget + 0.5; i++) {
    const over = book.metrics.monthly - ctx.budget;
    // The goal's own problem, its budget tightened by the overshoot.
    const base = solved.spec ?? costSpec(ctx, goal);
    const cap = Math.min(base.budget ?? ctx.budget, ctx.budget) - over - 2 * (i + 1);
    p2 = solveTermsRaw(ctx.debts, solved.cols ?? ctx.cols, { ...base, budget: cap }, POOL, p2);
    if (!p2.ok) break;
    ({ rows, tranches } = rowsOf(ctx, p2));
    book = bookOf(rows, ctx.input, ctx.f);
  }
  const used = p2.ok ? p2 : plan;
  const refi = new Set(used.refinance);
  const t = ctx.today.metrics;
  const m = book.metrics;
  const fees = sum(ctx.debts.filter((d) => refi.has(d.id)).map((d) => d.fee));
  const feesEstimated = ctx.debts.some((d) => refi.has(d.id) && d.feeEstimated);
  const setup = used.setupHousing + used.setupAp;
  const be = refi.size ? breakEven(ctx.today, book, fees + setup) : null;

  // What each decision is worth: the goal's own problem re-solved with that one
  // debt's decision flipped (terms held). The number every "why" leads with.
  const flips = flipEffects(ctx, solved, used);
  const fc: FlipCtx = { monthlyNow: book.metrics.monthly, budget: ctx.budget, budgetGoal: goal !== "payment" };
  // Moves, each with the figures that decided it.
  const moves: DebtMove[] = ctx.debts.map((d) => {
    const moved = refi.has(d.id);
    const action: DebtMove["action"] = !moved ? "keep" : d.group === "loan" ? "consolidate" : "refinance";
    const todayRate = d.priced.pay[0].length ? effectiveRate(d) : d.rate;
    let why: string;
    if (!moved) {
      if (d.lock) why = d.lock;
      else if (goal === "consolidate" && d.group === "mortgage") why = "המשכנתא נשארת כמות שהיא באיחוד הלוואות";
      else why = whyOf(flipText(flips.get(d.id), false, fc), keepDetail(ctx, d, todayRate));
    } else {
      why = whyOf(flipText(flips.get(d.id), true, fc), moveDetail(ctx, d, todayRate, goal));
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

  // Status — each goal judged on its own measure (rules.MATERIAL).
  const monthlyGain = relief >= MATERIAL.monthly(R.monthly);
  const todayCost = ctx.today.paid[0] - sum(ctx.debts.filter((d) => !d.due).map((d) => d.balance));
  // A saving is claimed only when the forecast shows it AND the board's typed read-out does not contradict it.
  const costGain = -fPaidDelta >= MATERIAL.cost(todayCost) && typedPaidDelta < 0;
  let status: Proposal["status"] = "ok";
  let note: string | undefined;
  const mortgageNow = sum(ctx.debts.filter((d) => d.group === "mortgage").map((d) => d.balance));
  const overLtv = !!ctx.propertyValue && mortgageNow / ctx.propertyValue > LTV_MAX[ctx.input.profile.propertyType];
  const curedKept = ctx.debts.filter((d) => !refi.has(d.id) && !d.forced && (d.cure ?? 0) > 0);
  if (!refi.size && !curedKept.length) {
    status = "no-gain";
    note = overLtv
      ? `שיעור המימון היום ${pct(mortgageNow / ctx.propertyValue!)}, מעל ${pct(LTV_MAX[ctx.input.profile.propertyType])}. מחזור אסור להגדיל אותו (הוראה 329 סעיף 9), ולכן אין מהלך שממומן בהלוואה. מחזור שבו העלויות משולמות במזומן ייבדק ידנית.`
      : "שום מהלך לא משפר את התמהיל הנוכחי ביעד הזה, ועדיף להשאיר אותו כמות שהוא.";
  } else if (goal === "payment" || goal === "consolidate") {
    // With debt due now there is no "stay as you are": clearing it IS the goal's answer.
    if (!monthlyGain && R.due === 0) {
      status = "no-gain";
      note = `ההחזר יורד רק ב-${nis(relief)}, פחות מהסף של ${nis(MATERIAL.monthly(R.monthly))} שמצדיק מחזור.`;
    }
  } else if (goal === "years") {
    if (R.months - m.months < MATERIAL.months) {
      status = "no-gain";
      const pin = ctx.debts.filter((d) => d.lock && d.months >= m.months - 1).sort((a, b) => b.months - a.months)[0];
      note = pin
        ? `החוב נגמר בעוד ${yrs(m.months)} בגלל ${pin.label} של ${nis(pin.balance)} שנשאר (${pin.lock}).`
        : `הקיצור הוא ${Math.max(0, R.months - m.months)} חודשים, פחות משנה, ולא מצדיק מחזור.`;
    }
  } else if (goal === "savings") {
    if (!costGain) {
      status = "no-gain";
      note =
        typedPaidDelta >= 0 && -fPaidDelta >= MATERIAL.cost(todayCost)
          ? `בתחזית חוסכים ${nis(-fPaidDelta)}, אבל לפי הריבית המוקלדת בלוח סך התשלומים עולה ב-${nis(typedPaidDelta)}, ולא מציגים חיסכון שהלוח סותר.`
          : `החיסכון בתחזית הוא ${nis(Math.max(0, -fPaidDelta))}, פחות מהסף של ${nis(MATERIAL.cost(todayCost))} שמצדיק את העלויות והטרחה.`;
    }
  } else if (goal === "balanced") {
    if (!monthlyGain || fPaidDelta > 0 || typedPaidDelta > 0) {
      status = "no-gain";
      note = !monthlyGain
        ? "אין הקלה משמעותית בהחזר בלי לשלם יותר בסך הכול."
        : `ההקלה בהחזר עולה ${nis(Math.max(fPaidDelta, typedPaidDelta))} בסך הכול, ולכן אינה מאוזנת.`;
    }
  } else if (goal === "stable") {
    // Stability is claimed in money: the worst economy must cost materially less.
    // Exposure bought at a price that the worst case does not repay is not a gain.
    // And its expected price must be small next to that: the shocks are the
    // 10th/90th percentiles, so a household lands in one of the two bad tails
    // roughly one time in five — certainty that costs more than a quarter of
    // what it protects is an expensive policy, not stability.
    if (-worstDelta < MATERIAL.cost(todayCost)) {
      status = "no-gain";
      note = `בתרחיש הגרוע התמהיל חוסך רק ${nis(Math.max(0, -worstDelta))}, פחות מהסף של ${nis(MATERIAL.cost(todayCost))}, ואין יציבות שמצדיקה מחזור.`;
    } else if (fPaidDelta > 0.25 * -worstDelta) {
      status = "no-gain";
      note = `היציבות עולה ${nis(fPaidDelta)} בתחזית כדי לחסוך ${nis(-worstDelta)} בתרחיש הגרוע, יותר מרבע מההגנה, ולכן יקרה מדי.`;
    }
  }
  // A cost goal's gain must survive two tests an advisor applies before filing:
  // the switching costs come back within BREAK_EVEN_MAX months, and (savings,
  // balanced) the saving is not only payments moved earlier: discounted at the
  // board's own rate (the ע.נ.נ input), the client must not pay more than today.
  if (status === "ok" && (goal === "savings" || goal === "balanced" || goal === "stable") && fees + setup > 0) {
    // Forecast present value when the forecast is on, the typed read-out's otherwise.
    const base = (R.book ?? ctx.today).metrics;
    const pvNow = ctx.input.forecastOn ? base.outlook?.pv : base.pv;
    const pvNew = ctx.input.forecastOn ? m.outlook?.pv : m.pv;
    // Never ahead: a saving or a balanced relief that never pays its costs back is
    // not one (stability may, by design: it buys protection, capped by its own rule).
    if ((be !== null && be > BREAK_EVEN_MAX) || (be === null && goal !== "stable")) {
      status = "no-gain";
      note =
        be === null
          ? `העמלות והעלויות, ${nis(fees + setup)}, לא חוזרות לאורך חיי ההלוואה, ולכן המחזור לא כדאי ביעד הזה.`
          : `העמלות והעלויות, ${nis(fees + setup)}, חוזרות רק אחרי ${be} חודשים, יותר מ-${BREAK_EVEN_MAX / 12} שנים, ולכן המחזור לא כדאי ביעד הזה.`;
    } else if (goal !== "stable" && pvNow !== undefined && pvNew !== undefined && pvNew > pvNow + 1) {
      // (Stability may cost a little by design: its own rule caps that price.)
      status = "no-gain";
      note = `בערך נוכחי, בהיוון של ${ctx.input.discountRate}% בשנה, התמהיל עולה ${nis(pvNew - pvNow)} יותר מהיום: החיסכון בסך התשלומים בא מתשלום מוקדם יותר, לא מריבית זולה יותר.`;
    }
  }
  // Debt due now with no budget given: the default budget is the reference's own
  // payment, which leaves a budget goal no room. Say so, and what would open it.
  if (status === "no-gain" && R.due > 0 && goal !== "payment" && goal !== "consolidate" && !(ctx.input.profile.budget && ctx.input.profile.budget > 0))
    note = `${note ?? ""} המסגרת היא ${nis(ctx.budget)}, ${ctx.budget - R.monthly > 0.5 ? `כמעט בדיוק ההחזר הנמוך ביותר שמסלק את החוב העומד לפירעון (${nis(R.monthly)})` : "ההחזר הנמוך ביותר שמסלק את החוב העומד לפירעון"}, ובה אין מקום ל${goal === "years" ? "קיצור" : goal === "savings" ? "חיסכון" : goal === "stable" ? "יציבות" : "שיפור"}. תקציב חודשי גבוה יותר שהלקוח יכול לשאת יפתח את היעד הזה.`.trim();
  // A budget-holding goal must hold it on the board's own read-out.
  if (status === "ok" && goal !== "payment" && m.monthly > ctx.budget + 0.5) {
    status = "no-gain";
    note = `ההחזר ${nis(m.monthly)} חורג מהמסגרת ${nis(ctx.budget)}`;
  }

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
  const caveats = caveatsOf(ctx, goal, book, refi, fPaidDelta, delta, solved);
  const checks = checksOf(ctx, rows, used, m, goal);
  if (status === "ok" && checks.some((c) => !c.ok)) {
    status = "unavailable";
    note = `נכשלה בדיקה: ${checks.filter((c) => !c.ok).map((c) => c.label).join(", ")}`;
  }
  return {
    goal,
    label: LABEL[goal],
    tagline: TAGLINE[goal],
    status,
    note,
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
    costs: { prepaymentFees: fees, feesEstimated, setup, financed: true, breakEvenMonths: be },
    moves,
    tranches,
    reasons,
    caveats,
    checks,
    // With debt due now the stress panel's "today" is the reference: today cannot go on as it is.
    stress: stressOf(ctx.ref.book ?? ctx.today, book),
  };
}

type Flip = { monthly: number; paid: number; carried?: boolean } | null;

/**
 * What one decision is worth, at the margin: the mix's structure held (its
 * tracks, terms and the share of each segment's money on each), the money the
 * flip adds or removes spread over that segment's tranches, and the difference
 * priced — the month-one payment and everything still to be paid (forecast).
 * No re-optimisation: that would blend the decision with a reshuffle. A
 * segment with no tranche yet is priced at the plan's own housing structure
 * (mortgage debt) or at a קל"צ all-purpose tranche on the plan's longest term.
 */
function flipEffects(ctx: Ctx, solved: Solved, plan: Plan): Map<string, Flip> {
  const out = new Map<string, Flip>();
  if (!plan.ok) return out;
  const colsAll = solved.cols ?? ctx.cols;
  const byKey = new Map(colsAll.map((c) => [c.key, c]));
  const seg = (d: Debt): Segment => d.segment;
  const sharesOf = (sg: Segment) => {
    const xs = Object.entries(plan.amounts).filter(([k]) => byKey.get(k)?.segment === sg);
    const tot = sum(xs.map(([, x]) => x));
    return tot > 0 ? xs.map(([k, x]) => ({ c: byKey.get(k)!, w: x / tot })) : [];
  };
  const longest = Math.max(10, ...Object.keys(plan.amounts).map((k) => Number(k.split("|")[2])));
  const fallback = (sg: Segment) => {
    const h = sharesOf("housing");
    if (sg === "housing" && h.length) return h;
    const pickCol = colsAll
      .filter((c) => c.segment === sg && c.track === "klz")
      .reduce<Column | null>((b, c) => (!b || Math.abs(c.years - longest) < Math.abs(b.years - longest) ? c : b), null);
    return pickCol ? [{ c: pickCol, w: 1 }] : [];
  };
  const spec = solved.spec;
  const movable = ctx.debts.filter((d) => !d.lock && (d.group === "mortgage" ? !(spec?.keepMortgage ?? false) : spec?.loansAllowed ?? true));
  for (const d of movable) {
    const on = plan.refinance.includes(d.id);
    const sg = seg(d);
    const shares = sharesOf(sg).length ? sharesOf(sg) : fallback(sg);
    if (!shares.length) {
      out.set(d.id, null);
      continue;
    }
    if (d.forced) {
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
    for (const { c, w } of shares) {
      monthly += c.monthly * money * w;
      paid += c.paid[0] * money * w;
    }
    out.set(d.id, { monthly, paid });
  }
  return out;
}

type FlipCtx = { monthlyNow: number; budget: number; budgetGoal: boolean };

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

function keepDetail(ctx: Ctx, d: Debt, todayRate: number): string[] {
  const out: string[] = [];
  if (d.interestOnly) out.push(`זה מסלול ריבית בלבד של ${nis(d.balance)}, והמרתו ללוח שפיצר מעלה את ההחזר`);
  out.push(rateWords(todayRate, marketRateFor(ctx, d)));
  if (d.fee > 0) out.push(feeWords(d));
  return out;
}

function moveDetail(ctx: Ctx, d: Debt, todayRate: number, goal: GoalId): string[] {
  if (d.called) return ["בפיגור של 90 יום ומעלה, והמלווה מעמיד אותו לפירעון מלא", rateWords(todayRate, marketRateFor(ctx, d))];
  if (d.due)
    return [
      d.due.kind === "past-due" ? "מועד פירעונו חלף והוא עומד לפירעון מיידי" : d.due.kind === "enforcement" ? "תיק בהוצאה לפועל שנפרע ונסגר" : "חוב בפיגור מחוץ לתמהיל, לפירעון מיידי",
      "היום לא משולם עליו דבר",
      d.rate > 0 ? `הריבית בדוח ${d.rate.toFixed(2)}%` : "",
    ];
  const out: string[] = [rateWords(todayRate, marketRateFor(ctx, d)), feeWords(d)];
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
  let lead = "";
  if (disagree)
    lead = `בלוח התמהיל, לפי הריבית המוקלדת, הריבית וההצמדה ${way(typedCost)} ב-${nis(typedCost)}, ובתחזית בנק ישראל הן ${way(forecastCost)} ב-${nis(forecastCost)}.`;
  else if (costClaim && typedCost > 0) {
    const w = (b: Book) => Math.max(...b.paid.slice(1));
    lead = `הריבית וההצמדה בלוח עולות ב-${nis(typedCost)}${forecastCost > 0 ? `, ובתחזית ב-${nis(forecastCost)}` : ""}${goal === "stable" ? `, תמורת ${nis(w(R.book ?? ctx.today) - w(book))} פחות בתרחיש הגרוע` : ""}.`;
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
      : `בתחזית בנק ישראל משלמים בסך הכול ${nis(book.paid[0])} במקום ${nis(R.paid)}${R.due > 0 ? " (התמהיל של היום ונשיאת החוב שעומד לפירעון)" : ""}, ${fPaidDelta <= 0 ? `חיסכון של ${nis(fPaidDelta)}` : `תוספת של ${nis(fPaidDelta)}`}${costs}.`;
  if (goal === "payment" && fPaidDelta > 0 && dm < 0) {
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
  if (goal === "stable" || goal === "balanced" || goal === "savings") {
    const w = (b: Book) => Math.max(...b.paid.slice(1));
    out.push(`בתרחיש הגרוע מבין ארבעת תרחישי הלחץ משלמים ${nis(w(book))} במקום ${nis(w(R.book ?? ctx.today))}${R.book ? " בתמהיל של היום ונשיאת החוב שעומד לפירעון" : " היום"}.`);
  }
  if (goal === "payment" && solved.meta?.guard === 1)
    out.push(
      ctx.ref.due > 0
        ? `בחמש השנים הקרובות, גם בתרחיש הלחץ הקשה ביותר, ההחזר לא עולה על ${nis(ctx.ref.monthly)}, ההחזר של היום כולל נשיאת החוב שעומד לפירעון.`
        : `בחמש השנים הקרובות, גם בתרחיש הלחץ הקשה ביותר, ההחזר לא עולה על ${nis(t.monthly)} שמשלמים היום.`
    );
  if (goal === "balanced" && typeof solved.meta?.phi === "number" && solved.meta.phi > 0 && typeof solved.meta.payMin === "number")
    out.push(`זו ההקלה הגדולה ביותר שאינה מייקרת את סך התשלומים, ${Math.round(Number(solved.meta.phi) * 100)}% מהדרך מ-${nis(reliefBudget(ctx))} אל ההחזר הנמוך האפשרי, ${nis(Number(solved.meta.payMin))}.`);
  if (goal === "payment" && typeof solved.meta?.adopted === "string") out.push(`זה התמהיל של יעד "${LABEL[solved.meta.adopted as GoalId]}", שמגיע להחזר הנמוך ביותר מכל היעדים, ${nis(book.metrics.monthly)} בחודש.`);
  // Debt due now: today's החזר חודשי leaves it out, and every "versus today" figure says so.
  if (ctx.ref.due > 0) out.unshift(dueSentence(ctx));
  if (lead) out.unshift(lead);
  return out.slice(0, 5);
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

function caveatsOf(ctx: Ctx, goal: GoalId, book: Book, refi: Set<string>, fPaidDelta: number, delta: Proposal["delta"], solved: Solved): string[] {
  const out: string[] = [];
  const moved = ctx.debts.filter((d) => refi.has(d.id));
  const tier = ctx.pricing.tier;
  if (tier.tier !== "bank") out.push(`תמחור ${tier.tier === "nonbank" ? "של גוף חוץ־בנקאי" : `של בנק בתוספת סיכון של ${tier.premium.toFixed(2)} נק׳`}. ${tier.why} יש לאמת מול המלווה.`);
  if (moved.some((d) => d.feeEstimated && d.group === "mortgage" && d.fee > 0))
    out.push("עמלות הפירעון חושבו לפי צו הבנקאות וטבלאות בנק ישראל ואינן מחייבות. יש לבקש מכתב יתרה לסילוק מכל בנק.");
  if (moved.some((d) => d.group === "loan" && d.feeEstimated)) out.push("עמלת פירעון מוקדם על הלוואות צרכניות בריבית קבועה לא חושבה. יש לבקש מכתב יתרה.");
  const cpi = sum(moved.map((d) => d.cpiAveraging));
  if (cpi > 0) out.push(`פירעון המסלולים הצמודים אחרי ה-15 בחודש חוסך עמלת מיצוע מדד של כ-${nis(cpi)} (סעיף 5 לצו).`);
  // The fee order's notice fee is on prepaying a loan; debt due now is paid, not prepaid.
  if (moved.some((d) => !d.due && !d.called)) out.push("הודעה מוקדמת של 10 ימים לפחות חוסכת עמלה של 0.1% מהסכום (סעיף 3(2) לצו).");
  if (moved.some((d) => d.interestOnly)) out.push("מסלולי ריבית בלבד מוחלפים במסלולים שמחזירים קרן כל חודש, ולכן חלק משינוי ההחזר הוא פירעון קרן ולא ריבית.");
  if (moved.some((d) => d.group === "mortgage" && d.segment === "allPurpose")) out.push("מסלולי משכנתא שמטרתם כל מטרה ממוחזרים ככסף לכל מטרה, כפי שבנק מתמחר אותם.");
  if (goal === "payment" && fPaidDelta > 0) {
    const relief = ctx.ref.monthly - book.metrics.monthly;
    const yearsOfRelief = relief > 0 ? fPaidDelta / (relief * 12) : Infinity;
    out.push(
      `${ctx.ref.due > 0 ? `ההחזר הנמוך עולה ${nis(fPaidDelta)} יותר בסך הכול מנשיאת החוב לצד התמהיל של היום` : `ההקלה בהחזר עולה ${nis(fPaidDelta)} בסך הכול`}${Number.isFinite(yearsOfRelief) ? `, כ-${yearsOfRelief.toFixed(1)} שנים של ההקלה עצמה` : ""}. יש לומר זאת ללקוח במפורש.`
    );
  }
  if (goal === "consolidate" && solved.meta?.costs) out.push(`איחוד ההלוואות מוריד את ההחזר אבל מייקר את סך התשלומים ב-${nis(fPaidDelta)}, כי הפריסה ארוכה יותר.`);
  if (goal === "payment" && solved.meta?.guard === 0)
    out.push(
      `בתרחיש לחץ ההחזר עלול לעלות בחמש השנים הקרובות מעל ${nis(ctx.ref.monthly)}${ctx.ref.due > 0 ? ", ההחזר של היום כולל נשיאת החוב שעומד לפירעון" : " שמשלמים היום"}, ואין תמהיל שמונע זאת בהחזר הזה.`
    );
  const typedPaidDelta = book.metrics.totalPaid - ctx.ref.typedPaid;
  void delta;
  if (Math.abs(typedPaidDelta - fPaidDelta) > Math.max(10_000, 0.2 * Math.abs(fPaidDelta))) {
    const word = (x: number) => (x <= 0 ? `חיסכון של ${nis(x)}` : `תוספת של ${nis(x)}`);
    out.push(
      `לוח התמהיל מחשב לפי הריבית כפי שהוקלדה ומראה ${word(typedPaidDelta)} בסך התשלומים, ותחזית בנק ישראל, בפריים של היום ובתחזית הריבית והמדד, מראה ${word(fPaidDelta)}. ההפרש נובע בעיקר משורות פריים שהודפסו בפריים של יום הדוח.`
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
            ctx.priceBasis === "record" ? "לפי מה שהבנק הזה גבה מהלקוח עצמו, מתחת לממוצע שלו" : ctx.priceBasis === "premium" ? "בממוצע הבנקים ועוד תוספת הסיכון של הלקוח" : "בריביות של הבנק הזה"
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
  const dear: { d: Debt; annual: number; mkt: number; rate: number }[] = [];
  for (const d of ctx.debts) {
    if (d.zak || d.due || !(d.rate > 0)) continue;
    const mkt = marketRateFor(ctx, d);
    if (mkt === null) continue;
    const rate = effectiveRate(d);
    const annual = (d.balance * (rate - mkt)) / 100;
    if (rate - mkt >= (d.group === "loan" ? 1 : 0.5) && annual >= 500) dear.push({ d, annual, mkt, rate });
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
          ? `${nis(bal)} בריבית ממוצעת של ${r.toFixed(2)}% מול ${k.toFixed(2)}% לכסף חדש היום, כ-${nis(annual)} בשנה.`
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
  const payMin = solvedPayment.plan.ok ? bookOf(rowsOf(ctx, solvedPayment.plan).rows, ctx.input, ctx.f).metrics.monthly : ctx.budget;
  // On a first lien the whole mortgage moves, so "the mortgage untouched" is the second-lien structure's goal.
  const consolidateHere = !((ctx.variant === "firstLien" || ctx.variant === "bankMove") && ctx.debts.some((d) => d.group === "mortgage"));
  for (const goal of ORDER) {
    if (!wanted.has(goal)) continue;
    let solved: Solved;
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
      solved = solveConsolidate(ctx);
    } else if (goal === "payment") solved = solvedPayment;
    else if (goal === "years") solved = solveYears(ctx);
    else if (goal === "balanced") solved = solveBalanced(ctx, payMin);
    else if (goal === "stable") {
      const spec = costSpec(ctx, "stable", { shareCap: false });
      solved = { plan: solveTerms(ctx.debts, ctx.cols, spec), spec, cols: ctx.cols };
    } else {
      const spec = costSpec(ctx, goal);
      solved = { plan: solveTerms(ctx.debts, ctx.cols, spec), spec, cols: ctx.cols };
    }
    solvedBy.set(goal, tag(solved));
  }
  for (const sv of Array.from(solvedBy.values())) if (sv.plan.ok && sv.cols) addToPool(sv.plan, sv.cols);
  // POLISH. Every goal's answer is a feasible starting point for the others —
  // re-solve each goal once from its own answer with the whole pool as seeds,
  // so no goal ends up beaten on its own objective by another goal's mix that
  // satisfies its rules. "years" also takes the earliest finish any
  // budget-holding answer reached, when that answer obeys its rules.
  for (const [goal, sv] of Array.from(solvedBy.entries())) {
    if (!sv.spec || !sv.cols || !sv.plan.ok) continue;
    const p2 = solveTermsRaw(ctx.debts, sv.cols, sv.spec, POOL, sv.plan);
    if (p2.ok && p2.objective < sv.plan.objective - 1e-6) solvedBy.set(goal, { ...sv, plan: p2 });
  }
  const yrs0 = solvedBy.get("years");
  if (yrs0?.plan.ok && typeof yrs0.meta?.finish === "number") {
    const finishOf = (p: Plan) => Math.max(0, ...ctx.debts.filter((d) => !p.refinance.includes(d.id)).map((d) => d.months), ...Object.keys(p.amounts).map((k) => Number(k.split("|")[2]) * 12));
    let T = yrs0.meta.finish;
    for (const [g, sv] of Array.from(solvedBy.entries())) {
      if (g === "years" || g === "payment" || !sv.plan.ok || !sv.spec || !sv.spec.shareCap) continue;
      const f = finishOf(sv.plan);
      if (f < T) {
        const at = yearsAt(ctx, f, sv.plan);
        if (at.plan.ok) {
          solvedBy.set("years", tag(at));
          T = f;
        }
      }
    }
  }
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
  for (const [g, sv] of Array.from(solvedBy.entries())) solvedBy.set(g, tag(sv));
  return { ctx, solvedBy, unavailableConsolidate };
}

/**
 * "Today, honestly" when debt is due now: keep today's mix and clear the due
 * debt (and any arrears cure) at the LOWEST monthly payment this lender's menu
 * allows — solved as a mix, so its setup costs and rules are in it. It is the
 * least any plan must do; its payment is the default budget, and every
 * "versus today" figure is measured from it. Without debt due now it is today.
 */
function referenceOf(ctx: Ctx): Ctx["ref"] {
  const t = ctx.today;
  const none = { monthly: t.metrics.monthly, paid: t.paid[0], typedPaid: t.metrics.totalPaid, typedCost: t.metrics.totalCost, months: t.metrics.months, worst: Math.max(...t.paid.slice(1)), due: 0, carry: 0, carryYears: 0, book: null };
  if (!(ctx.ref.due > 0)) return none;
  // The reference is a yardstick, not an offer: today's mix as it stands may
  // already break the PTI or LTV guardrail, and the yardstick must still exist.
  const spec = specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget: null, peakCap: null, finish: null, keepMortgage: true, loansAllowed: false, shareCap: false, ptiCap: null, ltv: null });
  const plan = solveTermsRaw(ctx.debts, ctx.cols, spec, []);
  if (!plan.ok) return ctx.ref;
  const b = bookOf(rowsOf(ctx, plan).rows, ctx.input, ctx.f);
  const years = Math.max(0, ...Object.keys(plan.amounts).map((k) => Number(k.split("|")[2])));
  return {
    monthly: b.metrics.monthly,
    paid: b.paid[0],
    typedPaid: b.metrics.totalPaid,
    typedCost: b.metrics.totalCost,
    months: b.metrics.months,
    worst: Math.max(...b.paid.slice(1)),
    due: ctx.ref.due,
    carry: b.metrics.monthly - t.metrics.monthly,
    carryYears: years,
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

/** A goal's own measure, lexicographic (lower is better). */
function score(goal: GoalId, sv: Solved): number[] {
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
function beatsMaterially(goal: GoalId, x: Solved, incumbent: Solved): boolean {
  const a = score(goal, x);
  const b = score(goal, incumbent);
  const ref = incumbent.ctx!.ref;
  const costMargin = MATERIAL.cost(Math.max(0, ref.paid - sum(incumbent.ctx!.debts.filter((d) => !d.due).map((d) => d.balance))));
  const margin =
    goal === "payment" || goal === "balanced" || goal === "consolidate"
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
      if (g === "payment" || !sv.plan.ok || sv.ctx === cur.ctx) continue;
      if (view(sv).monthly < view(cur).monthly - (homeward(sv) ? 0.5 : mMonthly)) solvedBy.set("payment", { ...sv, meta: { ...(sv.meta ?? {}), guard: 0, adopted: g } });
    }
  const yrs = solvedBy.get("years");
  if (yrs?.plan.ok)
    for (const g of BUDGET_GOALS) {
      const sv = solvedBy.get(g);
      if (g === "years" || !sv || !holds(sv) || sv.ctx === solvedBy.get("years")!.ctx) continue;
      if (view(sv).months < view(solvedBy.get("years")!).months - (homeward(sv) ? 0 : MATERIAL.months)) solvedBy.set("years", { ...sv, meta: { ...(sv.meta ?? {}), adopted: g } });
    }
  const sav = solvedBy.get("savings");
  if (sav?.plan.ok)
    for (const g of BUDGET_GOALS) {
      const sv = solvedBy.get(g);
      if (g === "savings" || !sv || !holds(sv) || sv.ctx === solvedBy.get("savings")!.ctx) continue;
      if (view(sv).totalCost < view(solvedBy.get("savings")!).totalCost - (homeward(sv) ? 1 : mCost)) solvedBy.set("savings", { ...sv, meta: { ...(sv.meta ?? {}), adopted: g } });
    }
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
  const tier = resolveTier(input.master, input.analysis, profile, { override, pastDue: cond.due.length > 0 });
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
    // The record is followed only DOWN. It compares each tranche with the
    // month's all-term average, so long fixed tranches sit above it by their term
    // alone (+0.3 to +0.4 on r01, r02, r06): under PREMIUM_EVIDENCE it reads as
    // market pricing, and following it up would price the term twice (the fixed
    // curve already carries it) and tie new money to today's rows (r06 savings
    // flipped under a 0.05-point shift). Above the threshold it is bankPremium.
    const rec = tier.record?.strong ? Math.max(0, tier.record.median) : null;
    for (const t of TRACKS) {
      const own = input.market.bankDelta[incumbent]?.[t] ?? 0;
      priceExtra[t] = rec !== null && rec < own ? rec : own;
      if (rec !== null && rec < own) priceBasis = "record";
    }
  } else if (!target && variant === "bank" && incumbent && tier.tier === "bankPremium") priceBasis = "premium";
  const pricing = pricingFor(input.market, f, input, tier, variant === "secondLien" ? "second" : "first", target ?? "system", priceExtra);
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
  };

  return { ctx, consolidateOk };
}

export function buildAutoMix(input: AutoMixInput): AutoMixResult {
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
    const ok = options.filter((x) => x.plan.ok);
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
    const best = ok.reduce((b, x) => (beatsMaterially(goal, x, b) ? x : b), ok[0]);
    const other = ok.filter((x) => x !== best).reduce<Solved | null>((b, x) => (!b || better(score(goal, x), score(goal, b)) ? x : b), null);
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
  // Blocks — always — and, on every proposal built past one, the first caveat names it with its condition.
  const blocks = blocksOf(ctx, proposals);
  const lead = overrideCaveat(ctx, blocks);
  if (lead) for (const p of proposals) p.caveats.unshift(lead);
  // Recommendation: the balanced mix when it is a real gain; else the first real
  // gain in the order savings → consolidate → payment → years → stable.
  const pickOrder: GoalId[] = ["balanced", "savings", "consolidate", "payment", "years", "stable"];
  const recommended = pickOrder.find((g) => proposals.some((p) => p.goal === g && p.status === "ok" && !p.sameAs)) ?? null;

  const rate = (t: TrackKey, y: number) => round2(pricing.rate(t, Math.min(y, maxYears), "housing").rate);
  const asOf = input.market.levelPeriod;
  const sgn = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(2)}`;
  const dmy = (d: string) => d.split("-").reverse().join("/");
  const notes = [
    `רמת הריבית לפי מסלול ולפי בנק לקוחה מהשוואת הריביות של בנק ישראל (TamInt010) לחודש ${input.market.bankPeriod.split("-").reverse().join("/")}, והומרה מריבית מתואמת לריבית נקובה.`,
    `ריבית קבועה לפי תקופה: הממוצע של בנק ישראל להלוואות חדשות בכל טווח תקופה (טבלאות הריבית הממוצעת, דוח ${dmy(newFixedRate(false, 120).report ?? "")}), בהמרה לריבית נקובה. הפריים ${input.market.boi.prime.toFixed(2)}% (ריבית בנק ישראל ${input.market.boi.rate.toFixed(2)}% מ-${dmy(input.market.boi.since)}).`,
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
export const __test = { STATS, runGoals, variantsFor, referenceOf, applyReference, prepare, solveTermsRaw, specFor, LAMBDA, bookOf, rowsOf, priceRow, debtsOf, columnsFor, pricingFor, trancheRow, SETUP_HOUSING, SETUP_AP_ALONE, isIndexedPath };
