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
import { RESET_MONTHS, TRACK_PATH, TRACK_SHORT, TRACKS, newRate, round2, type MarketSnapshot, type TrackKey } from "@/app/aa107test/lib/market";
import type { Forecast } from "@/app/aa102test/lib/forecast";
import type {
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
import { prepaymentFee, setCpiMonthly, feeTableAsOf, OPERATIONAL_FEE } from "./fees";
import { resolveTier, primeOn, NONBANK, isAllPurpose, type TierInfo } from "./tiers";
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
} from "./rules";
import { solveTerms as solveTermsRaw, solveOnce, termsOf, STATS, EARLY, type Seed, type Column, type Plan, type Segment, type SolverDebt, type Spec } from "./solve";
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

function priceRow(l: ImportedLoan, inflation: number, f: Forecast): Priced {
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
};

function pricingFor(m: MarketSnapshot, f: Forecast, input: AutoMixInput, tier: TierInfo): Pricing {
  const opt = { bank: input.profile.bank, discount: input.profile.negotiated || 0 };
  const bankRate = (track: TrackKey, years: number, segment: Segment) => {
    const p = newRate(m, f, track, years * 12, segment, opt);
    if (tier.tier !== "bankPremium") return p;
    // The borrower's premium applies to housing money. All-purpose money is
    // priced at the dearer of the product (market all-purpose) and the
    // borrower (housing + their premium) — a risk premium and a purpose premium
    // are two prices for the same risk, not a sum (r04's file: housing at P+2.25,
    // unsecured loans at P+1.75…P+3).
    const h = newRate(m, f, track, years * 12, "housing", opt);
    const withPremium = h.rate + tier.premium;
    const rate = segment === "housing" ? withPremium : Math.max(p.rate, withPremium);
    const shift = rate - p.rate;
    return { rate, anchor: p.anchor, margin: p.margin === null ? null : p.margin + shift };
  };
  return {
    tier,
    rate(track, years, segment) {
      if (tier.tier === "nonbank") {
        if (track === "prime") return { rate: m.boi.prime + NONBANK.primeMargin, anchor: m.boi.prime, margin: NONBANK.primeMargin };
        if (track === "kz") return { rate: NONBANK.kzRate, anchor: null, margin: null };
      }
      return bankRate(track, years, segment);
    },
  };
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
        const p = priceRow(row, input.inflation, f);
        out.push({
          key: `${track}|${segment}|${y}`,
          track,
          segment,
          years: y,
          monthly: p.typedMonthly / PROBE,
          paid: p.paid.map((x) => x / PROBE),
          typedPaid: p.typedPaid / PROBE,
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
};

function debtsOf(master: ImportedLoan[], input: AutoMixInput, f: Forecast, skipped: AutoMixResult["skipped"]): Debt[] {
  const out: Debt[] = [];
  for (const l of owedOnly(master)) {
    const amount = Number(l.amount) || 0;
    const months = Math.round(Number(l.months) || 0);
    const label = debtLabel(l);
    if (amount <= 0) continue;
    if (months <= 0) {
      skipped.push({ id: l.id, label, why: "חוב שמועד פירעונו חלף ואין לו תקופה, ולכן אי אפשר לתמחר אותו. צריך להסדיר אותו מול המלווה." });
      continue;
    }
    const path = Number(l.path_id);
    const group = l.group === "loan" ? "loan" : "mortgage";
    const priced = priceRow(l, input.inflation, f);
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
  blocked: string | null;
};

/** Plan → board rows, the money balanced per segment to the shekel. */
function rowsOf(ctx: Ctx, plan: Plan): { rows: ImportedLoan[]; tranches: NewTranche[] } {
  const rows: ImportedLoan[] = [];
  let n = 0;
  const refi = new Set(plan.refinance);
  for (const d of ctx.debts) if (!refi.has(d.id)) rows.push({ ...foldMasterRow(d.row, false, MIX_ID), id: `keep-${++n}` });
  // Owed rows the engine could not use (no term) stay on the board as they are.
  for (const l of owedOnly(ctx.input.master))
    if (!ctx.debts.some((d) => d.id === l.id) && (Number(l.amount) || 0) > 0) rows.push({ ...foldMasterRow(l, false, MIX_ID), id: `keep-${++n}` });
  // Guarantees travel with the mix, as the board's own copy of the master does:
  // shown in their section, never in a total (owedOnly).
  for (const l of ctx.input.master) if (l.is_guarantor) rows.push({ ...foldMasterRow(l, false, MIX_ID), id: `keep-${++n}` });
  const tranches: NewTranche[] = [];
  const byKey = new Map(ctx.cols.map((c) => [c.key, c]));
  for (const seg of ["housing", "allPurpose"] as Segment[]) {
    const need =
      sum(ctx.debts.filter((d) => refi.has(d.id) && d.segment === seg).map((d) => d.balance + d.fee)) +
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
      const share = (pred: (t: TrackKey) => boolean) => sum(parts.filter((p) => pred(p.c.track)).map((p) => amt.get(p.c.key)!)) / total;
      const ok = share(FIX) >= FIXED_MIN - 1e-9 && (seg === "allPurpose" || share(LNK) <= LINKED_MAX + 1e-9) && amt.get(absorber.c.key)! > 0;
      return { amt, ok };
    };
    const cheapest = parts.reduce((b, p) => (p.c.monthly < b.c.monthly ? p : b), parts[0]);
    const fixedAbsorber = parts.filter((p) => FIX(p.c.track)).sort((x, y) => x.c.monthly - y.c.monthly)[0];
    const tries = [
      attempt(cheapest, () => false),
      attempt(cheapest, (t) => FIX(t) && !LNK(t)),
      ...(fixedAbsorber ? [attempt(fixedAbsorber, () => false)] : []),
    ];
    const amt = (tries.find((t) => t.ok) ?? tries[0]).amt;
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
  for (const [label, rs] of [["שליש בריבית קבועה, דיור", freshH], ["שליש בריבית קבועה, כל מטרה", freshAp]] as const) {
    if (!rs.length) continue;
    const share = fixedOf(rs) / amt(rs);
    out.push({ label, ok: share >= FIXED_MIN - 0.005, value: pct(share), rule: RULE.fixed });
  }
  const secured = owed.filter((r) => r.group !== "loan" || r.source_type === AUTOMIX_SOURCE);
  if (fresh.length && secured.length) {
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
    if (ctx.input.profile.age)
      out.push({
        label: "גיל בסיום ההלוואה",
        ok: ctx.input.profile.age + longest / 12 <= AGE_AT_END + 0.01,
        value: `${Math.round(ctx.input.profile.age + longest / 12)}`,
        rule: `נוהג הבנקים, עד גיל ${AGE_AT_END} בסיום ההלוואה (לא חוק)`,
      });
  }
  if (goal !== "payment")
    out.push({ label: "החזר חודשי במסגרת", ok: metrics.monthly <= ctx.budget + 0.5, value: `${nis(metrics.monthly)} מתוך ${nis(ctx.budget)}`, rule: "המסגרת שנקבעה לתמהיל" });
  const income = ctx.input.profile.income;
  if (income && income > 0) {
    const housing = sum(owed.filter((r) => r.group !== "loan" || r.source_type === AUTOMIX_SOURCE).map((r) => typedRow(r, ctx.input.inflation).monthly));
    out.push({ label: "שיעור החזר מהכנסה", ok: housing / income <= PTI_MAX + 0.002, value: `${pct(housing / income)}${housing / income > PTI_RISK ? " (מעל 40%, משקל סיכון 100%)" : ""}`, rule: RULE.pti });
  }
  if (ctx.propertyValue) {
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
type Solved = { plan: Plan; note?: string; meta?: Record<string, number | string>; spec?: Spec; cols?: Column[] };

function specFor(ctx: Ctx, over: Partial<Spec>): Spec {
  return { ...ctx.base, ...over };
}

/** The lowest payment under every guardrail — and, when it can be had, a payment that survives the bad economies. */
function solvePayment(ctx: Ctx): Solved {
  const s = specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget: null });
  // Soundness: for the next five years, in every economy, the payment should not rise above what is paid today.
  const gs = { ...s, peakCap: ctx.today.metrics.monthly };
  const guarded = solveTerms(ctx.debts, ctx.cols, gs);
  if (guarded.ok) return { plan: guarded, meta: { guard: 1 }, spec: gs, cols: ctx.cols };
  const free = solveTerms(ctx.debts, ctx.cols, s);
  return { plan: free, meta: { guard: 0 }, spec: s, cols: ctx.cols };
}

function costSpec(ctx: Ctx, goal: GoalId, over: Partial<Spec> = {}): Spec {
  return specFor(ctx, { wMonthly: 0, wCost: 1, lambda: LAMBDA[goal], budget: ctx.base.budget, ...over });
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
  const feasible = (T: number) => {
    const p = solveTerms(ctx.debts, ctx.cols.filter((c) => c.years * 12 <= T), specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget: ctx.base.budget, finish: T }));
    return p.ok;
  };
  let lo = 0;
  let hi = sorted.findIndex((T) => T >= todayEnd);
  if (hi < 0) hi = sorted.length - 1;
  if (!feasible(sorted[hi])) return { plan: { ok: false, status: "infeasible", refinance: [], amounts: {}, objective: NaN, setupHousing: 0, setupAp: 0 } };
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (feasible(sorted[mid])) hi = mid;
    else lo = mid + 1;
  }
  const T = sorted[hi];
  return yearsAt(ctx, T);
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
  const r = reliefSolve(ctx, "balanced", payMin, 0.5, { peakCap: ctx.today.metrics.monthly });
  if (r.plan.ok) return r;
  // No relief comes without paying more overall: the cheapest mix within the
  // budget stands in (it will read "no-gain" unless it happens to relieve).
  const spec = costSpec(ctx, "balanced");
  return { plan: solveTerms(ctx.debts, ctx.cols, spec), meta: { phi: 0, payMin }, spec, cols: ctx.cols };
}

function reliefSolve(ctx: Ctx, goal: "balanced" | "consolidate", payMin: number, reach: number, over: Partial<Spec>): Solved {
  const floor = Math.floor(ctx.budget - reach * (ctx.budget - payMin));
  const caps = { paidCap: ctx.today.paid[0], typedPaidCap: ctx.today.metrics.totalPaid };
  const s1 = specFor(ctx, { wMonthly: 1, wCost: 1e-3, lambda: 0, budget: ctx.base.budget, floor, ...caps, ...over });
  const p1 = solveTerms(ctx.debts, ctx.cols, s1);
  if (p1.ok) {
    const P = bookOf(rowsOf(ctx, p1).rows, ctx.input, ctx.f).metrics.monthly;
    const s2 = costSpec(ctx, goal, { budget: P, ...caps, ...over });
    const p2 = solveTermsRaw(ctx.debts, ctx.cols, s2, POOL, p1);
    const plan = p2.ok ? p2 : p1;
    const phi = ctx.budget > payMin ? (ctx.budget - P) / (ctx.budget - payMin) : 0;
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
  if (neutral.plan.ok && neutral.plan.refinance.length && ctx.today.metrics.monthly - shown(ctx, neutral.plan).monthly >= MATERIAL.monthly(ctx.today.metrics.monthly)) return neutral;
  const cap = Math.floor(ctx.budget - 0.5 * (ctx.budget - payMin));
  const spec = { ...s, wMonthly: 0, wCost: 1, lambda: LAMBDA.consolidate, budget: cap };
  const plan = solveTerms(ctx.debts, ctx.cols, spec);
  return plan.ok ? { plan, meta: { phi: 0.5, costs: 1, payMin, cap }, spec, cols: ctx.cols } : { plan: min };
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
      const spec = { ...sav.spec, typedCostCap: rival.cost - 1 };
      // Two starts — the rival's mix (feasible) and savings' own (cheaper, may break the cap) — the better wins.
      const tries = [solveTermsRaw(ctx.debts, sav.cols ?? ctx.cols, spec, POOL, rival.plan), solveTermsRaw(ctx.debts, sav.cols ?? ctx.cols, spec, POOL, cur.plan)].filter(
        (p) => p.ok && shown(ctx, p).totalCost < rival!.cost
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
  const fPaidDelta = book.paid[0] - ctx.today.paid[0];
  const worst = (b: Book) => Math.max(...b.paid.slice(1));
  const worstDelta = worst(book) - worst(ctx.today);

  // Status — each goal judged on its own measure (rules.MATERIAL).
  const monthlyGain = -delta.monthly >= MATERIAL.monthly(t.monthly);
  const todayCost = ctx.today.paid[0] - sum(ctx.debts.map((d) => d.balance));
  // A saving is claimed only when the forecast shows it AND the board's typed read-out does not contradict it.
  const costGain = -fPaidDelta >= MATERIAL.cost(todayCost) && delta.totalPaid < 0;
  let status: Proposal["status"] = "ok";
  let note: string | undefined;
  const mortgageNow = sum(ctx.debts.filter((d) => d.group === "mortgage").map((d) => d.balance));
  const overLtv = !!ctx.propertyValue && mortgageNow / ctx.propertyValue > LTV_MAX[ctx.input.profile.propertyType];
  if (!refi.size) {
    status = "no-gain";
    note = overLtv
      ? `שיעור המימון היום ${pct(mortgageNow / ctx.propertyValue!)}, מעל ${pct(LTV_MAX[ctx.input.profile.propertyType])}. מחזור אסור להגדיל אותו (הוראה 329 סעיף 9), ולכן אין מהלך שממומן בהלוואה. מחזור שבו העלויות משולמות במזומן ייבדק ידנית.`
      : "שום מהלך לא משפר את התמהיל הנוכחי ביעד הזה, ועדיף להשאיר אותו כמות שהוא.";
  } else if (goal === "payment" || goal === "consolidate") {
    if (!monthlyGain) {
      status = "no-gain";
      note = `ההחזר יורד רק ב-${nis(-delta.monthly)}, פחות מהסף של ${nis(MATERIAL.monthly(t.monthly))} שמצדיק מחזור.`;
    }
  } else if (goal === "years") {
    if (-delta.months < MATERIAL.months) {
      status = "no-gain";
      const pin = ctx.debts.filter((d) => d.lock && d.months >= m.months - 1).sort((a, b) => b.months - a.months)[0];
      note = pin
        ? `החוב נגמר בעוד ${yrs(m.months)} בגלל ${pin.label} של ${nis(pin.balance)} שנשאר (${pin.lock}).`
        : `הקיצור הוא ${Math.max(0, -delta.months)} חודשים, פחות משנה, ולא מצדיק מחזור.`;
    }
  } else if (goal === "savings") {
    if (!costGain) {
      status = "no-gain";
      note =
        delta.totalPaid >= 0 && -fPaidDelta >= MATERIAL.cost(todayCost)
          ? `בתחזית חוסכים ${nis(-fPaidDelta)}, אבל לפי הריבית המוקלדת בלוח סך התשלומים עולה ב-${nis(delta.totalPaid)}, ולא מציגים חיסכון שהלוח סותר.`
          : `החיסכון בתחזית הוא ${nis(Math.max(0, -fPaidDelta))}, פחות מהסף של ${nis(MATERIAL.cost(todayCost))} שמצדיק את העלויות והטרחה.`;
    }
  } else if (goal === "balanced") {
    if (!monthlyGain || fPaidDelta > 0 || delta.totalPaid > 0) {
      status = "no-gain";
      note = !monthlyGain
        ? "אין הקלה משמעותית בהחזר בלי לשלם יותר בסך הכול."
        : `ההקלה בהחזר עולה ${nis(Math.max(fPaidDelta, delta.totalPaid))} בסך הכול, ולכן אינה מאוזנת.`;
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
  // A budget-holding goal must hold it on the board's own read-out.
  if (status === "ok" && goal !== "payment" && m.monthly > ctx.budget + 0.5) {
    status = "no-gain";
    note = `ההחזר ${nis(m.monthly)} חורג מהמסגרת ${nis(ctx.budget)}`;
  }

  const reasons = reasonsOf(ctx, goal, book, tranches, refi, fPaidDelta, worstDelta, be, fees + setup, solved);
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
    stress: stressOf(ctx.today, book),
  };
}

type Flip = { monthly: number; paid: number } | null;

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
  if (!moved.length) return [`התמהיל הנוכחי נשאר כמות שהוא, ${nis(t.monthly)} בחודש למשך ${yrs(t.months)}.`];
  const dm = m.monthly - t.monthly;
  // THE COST COLUMN. The sheet shows the typed cost (interest + indexation). When
  // it and the forecast disagree in sign, or a goal that claims a cost result
  // shows a HIGHER typed cost than today, the first reason says so, with both figures.
  const typedCost = m.totalCost - t.totalCost;
  const forecastCost = book.paid[0] - (m.totalPaid - m.totalCost) - (ctx.today.paid[0] - (t.totalPaid - t.totalCost));
  const way = (x: number) => (x > 0 ? "עולות" : "יורדות");
  const disagree = Math.abs(typedCost) >= 1000 && Math.abs(forecastCost) >= 1000 && Math.sign(typedCost) !== Math.sign(forecastCost);
  const costClaim = goal === "savings" || goal === "balanced" || goal === "stable";
  let lead = "";
  if (disagree)
    lead = `בלוח התמהיל, לפי הריבית המוקלדת, הריבית וההצמדה ${way(typedCost)} ב-${nis(typedCost)}, ובתחזית בנק ישראל הן ${way(forecastCost)} ב-${nis(forecastCost)}.`;
  else if (costClaim && typedCost > 0) {
    const w = (b: Book) => Math.max(...b.paid.slice(1));
    lead = `הריבית וההצמדה בלוח עולות ב-${nis(typedCost)}${forecastCost > 0 ? `, ובתחזית ב-${nis(forecastCost)}` : ""}${goal === "stable" ? `, תמורת ${nis(w(ctx.today) - w(book))} פחות בתרחיש הגרוע` : ""}.`;
  }
  const end = m.months === t.months ? `החוב נגמר באותו מועד, בעוד ${yrs(m.months)}` : `החוב כולו נגמר בעוד ${yrs(m.months)} במקום ${yrs(t.months)}`;
  const mix = tranches.map((x) => `${TRACK_SHORT[x.track]}${x.segment === "allPurpose" ? " לכל מטרה" : ""} ${nis(x.amount)} ל-${x.years} שנים ב-${x.rate.toFixed(2)}%`).join(", ");
  const mixLine = `ממחזרים ${moved.length === 1 ? "חוב אחד" : `${moved.length} חובות`} בסך ${nis(sum(moved.map((d) => d.balance)))} לכסף חדש: ${mix}.`;
  const costs = switchCost > 0 ? `, כולל עמלות ועלויות מעבר של ${nis(switchCost)}${fPaidDelta < 0 && be !== null ? (be === 0 ? " שחוזרות מיד" : ` שחוזרות תוך ${be} חודשים`) : ""}` : "";
  const totals = `בתחזית בנק ישראל משלמים בסך הכול ${nis(book.paid[0])} במקום ${nis(ctx.today.paid[0])}, ${fPaidDelta <= 0 ? `חיסכון של ${nis(fPaidDelta)}` : `תוספת של ${nis(fPaidDelta)}`}${costs}.`;
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
    out.push(`בתרחיש הגרוע מבין ארבעת תרחישי הלחץ משלמים ${nis(w(book))} במקום ${nis(w(ctx.today))} היום.`);
  }
  if (goal === "payment" && solved.meta?.guard === 1) out.push(`בחמש השנים הקרובות, גם בתרחיש הלחץ הקשה ביותר, ההחזר לא עולה על ${nis(t.monthly)} שמשלמים היום.`);
  if (goal === "balanced" && typeof solved.meta?.phi === "number" && solved.meta.phi > 0 && typeof solved.meta.payMin === "number")
    out.push(`זו ההקלה הגדולה ביותר שאינה מייקרת את סך התשלומים, ${Math.round(Number(solved.meta.phi) * 100)}% מהדרך מ-${nis(ctx.budget)} אל ההחזר הנמוך האפשרי, ${nis(Number(solved.meta.payMin))}.`);
  if (goal === "payment" && typeof solved.meta?.adopted === "string") out.push(`זה התמהיל של יעד "${LABEL[solved.meta.adopted as GoalId]}", שמגיע להחזר הנמוך ביותר מכל היעדים.`);
  if (lead) out.unshift(lead);
  return out.slice(0, 5);
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
  if (moved.length) out.push("הודעה מוקדמת של 10 ימים לפחות חוסכת עמלה של 0.1% מהסכום (סעיף 3(2) לצו).");
  if (moved.some((d) => d.interestOnly)) out.push("מסלולי ריבית בלבד מוחלפים במסלולים שמחזירים קרן כל חודש, ולכן חלק משינוי ההחזר הוא פירעון קרן ולא ריבית.");
  if (moved.some((d) => d.group === "mortgage" && d.segment === "allPurpose")) out.push("מסלולי משכנתא שמטרתם כל מטרה ממוחזרים ככסף לכל מטרה, כפי שבנק מתמחר אותם.");
  if (goal === "payment" && fPaidDelta > 0) {
    const yearsOfRelief = -delta.monthly > 0 ? fPaidDelta / (-delta.monthly * 12) : Infinity;
    out.push(`ההקלה בהחזר עולה ${nis(fPaidDelta)} בסך הכול${Number.isFinite(yearsOfRelief) ? `, כ-${yearsOfRelief.toFixed(1)} שנים של ההקלה עצמה` : ""}. יש לומר זאת ללקוח במפורש.`);
  }
  if (goal === "consolidate" && solved.meta?.costs) out.push(`איחוד ההלוואות מוריד את ההחזר אבל מייקר את סך התשלומים ב-${nis(fPaidDelta)}, כי הפריסה ארוכה יותר.`);
  if (goal === "payment" && solved.meta?.guard === 0) out.push(`בתרחיש לחץ ההחזר עלול לעלות בחמש השנים הקרובות מעל ${nis(ctx.today.metrics.monthly)} שמשלמים היום, ואין תמהיל שמונע זאת בהחזר הזה.`);
  const typedPaidDelta = delta.totalPaid;
  if (Math.abs(typedPaidDelta - fPaidDelta) > Math.max(10_000, 0.2 * Math.abs(fPaidDelta))) {
    const word = (x: number) => (x <= 0 ? `חיסכון של ${nis(x)}` : `תוספת של ${nis(x)}`);
    out.push(
      `לוח התמהיל מחשב לפי הריבית כפי שהוקלדה ומראה ${word(typedPaidDelta)} בסך התשלומים, ותחזית בנק ישראל, בפריים של היום ובתחזית הריבית והמדד, מראה ${word(fPaidDelta)}. ההפרש נובע בעיקר משורות פריים שהודפסו בפריים של יום הדוח.`
    );
  }
  if (ctx.moveWhole) out.push("מעבר לבנק אחר מחייב להעביר את כל המשכנתא שבאותו בנק, וכך נבנה התמהיל.");
  else if (moved.some((d) => d.group === "mortgage")) out.push("התמהיל מניח מחזור פנימי של מסלולים נבחרים בבנק הקיים. מעבר לבנק אחר מעביר את כל המשכנתא.");
  if (!ctx.propertyValue && moved.length) out.push("שווי הנכס לא ידוע, ולכן שיעור המימון (ובכל מטרה עד 50% משווי הנכס) ייבדק בשמאות.");
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
    if (d.zak || !(d.rate > 0)) continue;
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
      detail: "כל מלווה ידרוש להסדיר אותם לפני אשראי חדש, והם לא נכללים בחישובי התמהיל.",
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
  const noRate = ctx.debts.filter((d) => !(d.rate > 0));
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
function prepare(input: AutoMixInput, f: Forecast, skipped: AutoMixResult["skipped"]): { ctx: Ctx; consolidateOk: boolean } | { fail: string; today: Book } {
  const debts = debtsOf(input.master, input, f, skipped);
  const today = bookOf(input.master, input, f);
  if (!debts.length) return { fail: "אין בתמהיל הנוכחי חובות עם סכום ותקופה, ואין ממה לבנות.", today };

  const profile = input.profile;
  const tier = resolveTier(input.master, input.analysis, profile);
  const pricing = pricingFor(input.market, f, input, tier);
  const ageCap = profile.age ? Math.max(1, Math.floor(AGE_AT_END - profile.age)) : TERM_MAX_YEARS;
  const maxYears = Math.max(4, Math.min(TERM_MAX_YEARS, tier.maxYears, ageCap));
  const apYears = Math.min(maxYears, AP_TERM_MAX_YEARS);
  const mortgages = debts.filter((d) => d.group === "mortgage");
  const collateralValue = input.analysis?.mortgage.collateralValue || 0;
  const propertyValue = profile.propertyValue && profile.propertyValue > 0 ? profile.propertyValue : collateralValue > 0 ? collateralValue : null;
  const valueSource = profile.propertyValue && profile.propertyValue > 0 ? "שווי שהוזן" : collateralValue > 0 ? "שווי הבטוחה כפי שדווח בדוח" : null;
  const collateral = mortgages.length > 0 || !!propertyValue;
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
  const moveWhole = !!target && Array.from(bankNames).some((n) => !BANK_WORDS[target]?.test(n));

  const fixedToday = mortgages.length ? sum(mortgages.filter((d) => d.fixed).map((d) => d.balance)) / sum(mortgages.map((d) => d.balance)) : 1;
  const linkedToday = mortgages.length ? sum(mortgages.filter((d) => d.linked).map((d) => d.balance)) / sum(mortgages.map((d) => d.balance)) : 0;
  const ltv = propertyValue
    ? { value: propertyValue, housing: LTV_MAX[profile.propertyType], withAp: Math.min(AP_LTV_RELIEF, AP_LTV + AP_RELIEF_CAP / propertyValue) }
    : null;
  const budget = profile.budget && profile.budget > 0 ? profile.budget : today.metrics.monthly;
  const solveBudget = budget;
  const consolidateOk = profile.consolidate && collateral;
  const segments: Segment[] =
    (consolidateOk && debts.some((d) => d.group === "loan" && !d.lock)) || debts.some((d) => d.group === "mortgage" && d.segment === "allPurpose" && !d.lock) ? ["housing", "allPurpose"] : ["housing"];
  const cols = columnsFor(pricing, input, f, maxYears, apYears, segments);
  const openingFee = (x: number) => Math.round(x * tier.openingFee);
  const base: Spec = {
    wMonthly: 0,
    wCost: 1,
    lambda: 0,
    budget: solveBudget,
    peakCap: null,
    finish: null,
    keepMortgage: false,
    loansAllowed: consolidateOk,
    shareCap: true,
    moveWhole,
    ptiCap: profile.income && profile.income > 0 ? PTI_MAX * profile.income : null,
    ltv,
    fixedToday,
    linkedToday,
    setupHousing: SETUP_HOUSING + openingFee(sum(mortgages.filter((d) => d.segment === "housing").map((d) => d.balance))),
    setupAp: SETUP_AP_ALONE + openingFee(sum(debts.filter((d) => d.segment === "allPurpose").map((d) => d.balance))),
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
    blocked: tier.blocked,
  };

  return { ctx, consolidateOk };
}

export function buildAutoMix(input: AutoMixInput): AutoMixResult {
  const t0 = now();
  const skipped: AutoMixResult["skipped"] = [];
  const f = input.forecast;
  const emptyMetrics: MixMetrics = { balance: 0, monthly: 0, peakMonthly: 0, months: 0, totalPaid: 0, totalCost: 0, totalInterest: 0, pv: 0, avgRate: 0, shares: [], fixedShare: 0, linkedShare: 0, outlook: null };
  const fail = (reason: string, today: MixMetrics = emptyMetrics): AutoMixResult => ({
    ok: false,
    reason,
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

  const prep = prepare(input, f, skipped);
  if ("fail" in prep) return fail(prep.fail, prep.today.metrics);
  const { ctx, consolidateOk } = prep;
  const { debts, today, pricing, budget, maxYears, collateral } = ctx;
  const profile = input.profile;
  const tier = pricing.tier;
  POOL = [];
  const wanted = new Set<GoalId>(input.goals ?? ORDER);
  const hasLoans = debts.some((d) => d.group === "loan" && !d.lock);
  const proposals: Proposal[] = [];
  const solvedBy = new Map<GoalId, Solved>();
  let unavailableConsolidate: Proposal | null = null;
  const solvedPayment = solvePayment(ctx);
  const payMin = solvedPayment.plan.ok ? bookOf(rowsOf(ctx, solvedPayment.plan).rows, input, f).metrics.monthly : budget;
  for (const goal of ORDER) {
    if (!wanted.has(goal)) continue;
    let solved: Solved;
    if (goal === "consolidate") {
      if (!hasLoans) continue;
      if (!consolidateOk) {
        unavailableConsolidate = { ...proposalOf(ctx, goal, { plan: { ok: false, status: "x", refinance: [], amounts: {}, objective: NaN, setupHousing: 0, setupAp: 0 } }), status: "unavailable", note: !collateral ? "אין בדוח נכס משועבד ולא הוזן שווי נכס, ולכן אין ביטחון להלוואה לכל מטרה." : "איחוד הלוואות כובה בפרופיל." };
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
    solvedBy.set(goal, solved);
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
          solvedBy.set("years", at);
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
  for (const goal of ORDER) {
    const sv = solvedBy.get(goal);
    if (sv) proposals.push(proposalOf(ctx, goal, sv));
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
    `מבנה התקופות בריבית קבועה לפי עקום האפס של בנק ישראל (${f.asOf.split("-").reverse().join("/")}). הפריים ${input.market.boi.prime.toFixed(2)}% (ריבית בנק ישראל ${input.market.boi.rate.toFixed(2)}% מ-${dmy(input.market.boi.since)}).`,
    `תוספת כל מטרה של ${Math.min(input.market.allPurposePremium.klz, input.market.allPurposePremium.prime).toFixed(2)} עד ${Math.max(input.market.allPurposePremium.klz, input.market.allPurposePremium.prime).toFixed(2)} נק׳ לפי BIR_MRTG_99, ונבדקה מול לוח n12b לאוקטובר 2026.`,
    "הלוואה לכל מטרה עד 30 שנה לפי הוראה 329, והתקופה הממוצעת שניתנה בפועל באוקטובר 2026 הייתה 23.7 שנים (בנק ישראל, n12b).",
    `עמלות הפירעון לפי טבלאות הריבית הממוצעת של בנק ישראל שבתוקף מ-${dmy(feeTableAsOf().unlinked)}.`,
    `תרחישי הלחץ הם טעות התחזית של השוק בשנים 2008 עד 2021 (אחוזונים 10 ו-90): ריבית ${sgn(history.shocks.rateDown)} ו-${sgn(history.shocks.rateUp)} נק׳, מדד ${sgn(history.shocks.cpiDown)} ו-${sgn(history.shocks.cpiUp)} נק׳.`,
  ];
  if ((input.market.version ?? 1) < 2) notes.unshift("נתוני השוק שהתקבלו בנויים בגרסה הישנה (פער של כ-0.1 נק׳ בפריים). יש לרענן את נתוני השוק.");
  return {
    ok: true,
    today: today.metrics,
    findings: findingsOf(ctx, input.analysis),
    proposals,
    recommended,
    pricing: {
      asOf,
      bank: profile.bank,
      tier: tier.tier,
      tierWhy: tier.why,
      rows: tier.tracks.map((t) => ({ track: t, label: TRACK_SHORT[t], rate10: rate(t, 10), rate20: rate(t, 20), rate30: rate(t, 30) })),
      notes,
    },
    skipped,
    ms: now() - t0,
  };
}

/** Exposed for the check script. */
export const __test = { STATS, prepare, solveTermsRaw, specFor, LAMBDA, bookOf, rowsOf, priceRow, debtsOf, columnsFor, pricingFor, trancheRow, SETUP_HOUSING, SETUP_AP_ALONE, isIndexedPath };
