// מחולל התמהיל האופטימלי — the best mix a client can actually get, from their
// own debts, today's market and the Bank of Israel's rules.
//
// THE DECISION, STATED AS AN LP. Every existing debt j can be kept or
// refinanced (wholly or partly — banks take partial prepayments), and the money
// that refinances it is borrowed again in any of five tracks × any term in the
// allowed window, as housing money (refinancing a mortgage) or as all-purpose
// money (consolidating consumer debt, which prices ~2pp higher). A tranche's
// payments are LINEAR in its principal at a given track and term, so with one
// variable per (track, term, purpose) and one per debt the question is a linear
// program, solved exactly — not searched (yalps; a small MILP pass enforces
// "one tranche per track, each at least ₪X, at most K").
//
// RISK IS SCENARIOS, NOT A PENALTY. Every candidate is priced under five
// economies — the BoI forecast (directive 451 curves) and four shocks to rates
// and CPI. The objective is
//
//      (1 − λ) · E[cost]  +  λ · max over scenarios of cost
//
// which is still linear (an auxiliary t ≥ cost in every scenario). At λ = 0
// it is the cheapest mix in expectation; as λ grows it hedges — prime wins
// when rates fall, fixed when they rise, unlinked when CPI runs — so a robust
// mix is diversified for a reason the advisor can point at.
//
//   subject to  money in = money out           (per purpose)
//               fixed ≥ ⅓ of the new loan       (directive 329 §7)
//               first (or peak) payment ≤ cap   (client's choice; PTI ≤ 50% §5)
//               secured debt ≤ LTV × value      (§2, when a value is given)
//               term ≤ 30y and ≤ the age limit  (§8)
//
// "cost" is the client's choice: ערך נוכחי (PV of every future payment at the
// board's discount rate), סך התשלומים (nominal), or the payment itself. The
// base-scenario coefficients come from the board's own engine (priceLoan), so
// the optimizer and the board can never disagree about what a tranche costs.

import { solve, type Model } from "yalps";
import { firstResetOf, intervalOf, priceLoan, type Econ } from "@/app/aa102test/lib/price";
import { HORIZON, type Forecast } from "@/app/aa102test/lib/forecast";
import { monthOnePay } from "@/app/aa102test/lib/timeline";
import { owedOnly, type ImportedLoan } from "@/app/aa102test/lib/credit";
import { FREQ_FIXED, FREQ_PRIME, freqLabel } from "@/lib/rate-frequency";
import { addMonths, startOfToday, toIso } from "@/app/aa102test/lib/dates";
import { IS_FIXED, RESET_MONTHS, TRACK_PATH, TRACK_SHORT, TRACKS, newRate, type BankId, type MarketSnapshot, type Segment, type TrackKey } from "./market";

/* ------------------------------------------------------------- settings */

export type Objective = "pv" | "total" | "payment";
/**
 * How variable and linked tracks are PROJECTED (market prices always come from
 * today's real curve):
 *   boi   — directive 451: the forward curves, as every bank and the board do;
 *   flat  — the BoI rate stays where it is today (CPI still from breakevens);
 *   blend — halfway: forwards carry a term premium, so the truth tends to sit
 *           between "the curve" and "nothing changes".
 */
export type Outlook = "boi" | "flat" | "blend";
export type PropertyType = "single" | "replacement" | "investment";

export type Settings = {
  objective: Objective;
  /** Monthly payment ceiling, ₪. null = none. */
  paymentCap: number | null;
  /** Which payment the ceiling binds: month one, or the forecast's peak. */
  capOn: "first" | "peak";
  /** Annual %, for ערך נוכחי. */
  discountRate: number;
  outlook: Outlook;
  /** 0 = expected cost only … 1 = the worst scenario only. */
  risk: number;
  /** Multiplies every scenario's shock (1 = the standard set). */
  shockScale: number;
  bank: BankId;
  /** Negotiated discount on every new track, pp. */
  negotiated: number;
  minYears: number;
  maxYears: number;
  /** Youngest borrower's age and the bank's age limit at the end of the loan. */
  age: number | null;
  maxAgeAtEnd: number;
  /** Net disposable household income, ₪/month. */
  income: number | null;
  ptiMax: number;
  propertyValue: number | null;
  propertyType: PropertyType;
  /** Refinance consumer loans into all-purpose mortgage money. */
  consolidate: boolean;
  /** May an existing debt be kept? Off = refinance everything. */
  allowKeep: boolean;
  enforce329: boolean;
  /** Smallest tranche worth opening, ₪, and at most this many new tranches. */
  minTrack: number;
  maxTracks: number;
  /** Estimate הפרשי היוון for fixed-rate debts the documents did not state. */
  estimateFees: boolean;
  /** Extra all-purpose cash to raise, ₪. */
  cashOut: number;
  tracks: Record<TrackKey, boolean>;
  /** Also consider קרן שווה (equal principal) tranches. */
  equalPrincipal: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  objective: "pv",
  outlook: "boi",
  paymentCap: null,
  capOn: "first",
  discountRate: 3.3,
  risk: 0.35,
  shockScale: 1,
  bank: "system",
  negotiated: 0,
  minYears: 5,
  maxYears: 30,
  age: null,
  maxAgeAtEnd: 85,
  income: null,
  ptiMax: 0.5,
  propertyValue: null,
  propertyType: "single",
  consolidate: true,
  allowKeep: true,
  enforce329: true,
  minTrack: 50_000,
  maxTracks: 5,
  estimateFees: true,
  cashOut: 0,
  tracks: { prime: true, klz: true, kz: true, mlz: true, mz: true },
  equalPrincipal: false,
};

export const LTV_MAX: Record<PropertyType, number> = { single: 0.75, replacement: 0.7, investment: 0.5 };

/* ------------------------------------------------------------- scenarios */

/**
 * The economies every mix is priced under. Shocks are in percentage points a
 * year on top of the BoI forecast: `rate` moves prime from next month and a
 * bond-anchored track at its resets; `cpi` moves the index from next month.
 * Probabilities weight the expectation; the worst case is taken over all five.
 */
export const SCENARIOS = [
  { id: "base", label: "תחזית בנק ישראל", rate: 0, cpi: 0, p: 0.4 },
  { id: "up", label: "ריבית עולה", rate: 2, cpi: 0.5, p: 0.15 },
  { id: "down", label: "ריבית יורדת", rate: -1.5, cpi: -0.5, p: 0.15 },
  { id: "infl", label: "אינפלציה גבוהה", rate: 0.5, cpi: 1.5, p: 0.15 },
  { id: "defl", label: "אינפלציה נמוכה", rate: -0.5, cpi: -1, p: 0.15 },
] as const;

/** The projection the chosen outlook implies, built from today's market forecast. */
export function outlookEcon(econ: Econ, o: Outlook): Econ {
  const f = econ.forecast;
  if (!f || o === "boi") return econ;
  const flat = f.nominal[0];
  const nominal = f.nominal.map((x) => (o === "flat" ? flat : (x + flat) / 2));
  const label = o === "flat" ? "ריבית נוכחית נשארת" : "בין התחזית לריבית הנוכחית";
  const proj: Forecast = { ...f, nominal: nominal.slice(0, HORIZON), label };
  return { ...econ, forecast: proj };
}

/* ------------------------------------------------------- the coefficient engine */

/**
 * A compact amortizer matching the board's forecast engine for spitzer, equal
 * principal and balloons (no grace): real balance, re-amortized whenever the
 * rate moves, indexed by `idx` (cumulative CPI factor at the end of each
 * month). Run on the engine's own rate and index paths it reproduces the
 * engine; run on shocked paths it prices a scenario.
 */
function amortize(rates: number[], idx: number[], sched: number): number[] {
  const n = rates.length;
  let real = 1;
  let pmt = 0;
  let lastRate = NaN;
  let equal = 0;
  const pay: number[] = [];
  for (let m = 1; m <= n; m++) {
    const r = rates[m - 1] / 1200;
    const opening = real;
    const interest = opening * r;
    let principal: number;
    let payment: number;
    if (sched === 3) {
      principal = m === n ? opening : 0;
      payment = interest + principal;
    } else if (sched === 4) {
      principal = m === n ? opening + interest : -interest;
      payment = m === n ? opening + interest : 0;
    } else if (sched === 2) {
      if (m === 1) equal = opening / n;
      principal = Math.min(equal, opening);
      payment = principal + interest;
    } else {
      if (m === 1 || rates[m - 1] !== lastRate) {
        const k = n - m + 1;
        pmt = r === 0 ? opening / k : (opening * r) / (1 - Math.pow(1 + r, -k));
      }
      payment = pmt;
      principal = payment - interest;
    }
    lastRate = rates[m - 1];
    real = Math.max(opening - principal, 0);
    pay.push(payment * idx[m - 1]);
  }
  return pay;
}

const pvOf = (pay: number[], annual: number) => {
  const d = Math.pow(1 + annual / 100, 1 / 12) - 1;
  let pv = 0;
  let k = 1;
  for (let m = 0; m < pay.length; m++) {
    k /= 1 + d;
    pv += pay[m] * k;
  }
  return pv;
};

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const kindOf = (pathId: number): "prime" | "bond" | "fixed" => (pathId === 1 ? "prime" : pathId === 4 || pathId === 5 ? "bond" : "fixed");

/** Per ₪1 of principal: payments and costs under every scenario. Index 0 is the forecast. */
export type Coef = {
  first: number;
  peak: number[];
  pv: number[];
  total: number[];
};

function coefOf(row: ImportedLoan, econ: Econ, s: Settings, per: number): Coef {
  const priced = priceLoan(row, econ);
  const n = priced.schedule.length;
  const path = Number(row.path_id);
  const kind = kindOf(path);
  const linked = path === 3 || path === 5;
  const sched = Number(row.amortization_schedule_id) || 1;
  const amount = Number(row.amount) || 0;
  // A bond track first moves at its own reset; a new one a full interval out.
  const V = kind === "bond" ? intervalOf(row as never) : 0;
  const s0 = kind === "bond" ? firstResetOf(row as never, V) : 0;
  // The engine's monthly index factors, recovered from its cumulative path.
  const monthIdx = priced.index.map((c, i) => (i === 0 ? c : c / priced.index[i - 1]));
  const out: Coef = { first: 0, peak: [], pv: [], total: [] };
  SCENARIOS.forEach((sc, k) => {
    let pay: number[];
    if (k === 0) {
      pay = priced.schedule.map((x) => x.payment);
    } else {
      const dr = sc.rate * s.shockScale;
      const dc = sc.cpi * s.shockScale;
      const rates = priced.rates.map((r, i) => {
        const m = i + 1;
        if (kind === "fixed") return r;
        if (kind === "prime" ? m < 2 : m <= s0) return r;
        return Math.max(0.1, r + dr);
      });
      const idx: number[] = [];
      let c = 1;
      for (let i = 0; i < n; i++) {
        if (linked) c *= monthIdx[i] * (i >= 1 ? Math.pow(1 + dc / 100, 1 / 12) : 1);
        idx.push(c);
      }
      pay = amortize(rates, idx, sched).map((p) => p * amount);
    }
    out.pv.push(pvOf(pay, s.discountRate) / per);
    out.total.push(sum(pay) / per);
    const first = n ? monthOnePay(row, pay[0]) : 0;
    out.peak.push(Math.max(first, ...pay.slice(1)) / per);
    if (k === 0) out.first = first / per;
  });
  return out;
}

/** The objective's view of a coefficient set: the per-scenario costs it minimises over. */
const costs = (c: Coef, s: Settings): number[] =>
  s.objective === "total" ? c.total : s.objective === "payment" ? SCENARIOS.map(() => c.first) : c.pv;

const expected = (xs: number[]) => sum(xs.map((x, i) => x * SCENARIOS[i].p));

/* ------------------------------------------------------------ the debts */

export type Debt = {
  id: string;
  label: string;
  group: "mortgage" | "loan";
  track: string;
  balance: number;
  rate: number;
  months: number;
  fee: number;
  feeEstimated: boolean;
  coef: Coef;
  row: ImportedLoan;
};

/**
 * הפרשי היוון, estimated the way the BoI's prepayment-fee rules compute it: the
 * remaining payments discounted at TODAY's rate for a loan of that track and
 * remaining term, minus the balance — owed only when the contract rate is above
 * today's. Variable tracks at a reset and consumer loans: ~0.
 */
function estimateFee(row: ImportedLoan, econ: Econ, m: MarketSnapshot): number {
  const path = Number(row.path_id);
  if (row.group === "loan" || (path !== 2 && path !== 3)) return 0;
  const months = Math.round(Number(row.months) || 0);
  const amount = Number(row.amount) || 0;
  if (!econ.forecast || months <= 0 || amount <= 0) return 0;
  const priced = priceLoan(row, econ);
  // Real payments on a linked row: the fee formula discounts in the loan's own units.
  const realPay = priced.schedule.map((x, i) => x.payment / (priced.index[i] || 1));
  const market = newRate(m, econ.forecast, path === 3 ? "kz" : "klz", months, "housing", { bank: "system", discount: 0 }).rate;
  const r = market / 1200;
  let pv = 0;
  for (let i = 0; i < realPay.length; i++) pv += realPay[i] / Math.pow(1 + r, i + 1);
  return Math.max(0, Math.round(pv - amount));
}

const LENDER = (l: ImportedLoan) => (l.source_bank || "").replace(/בע"מ|בנק/g, "").trim();
const KEY_OF_PATH = ["", "prime", "klz", "kz", "mlz", "mz"] as const;

/** `market` prices fees off today's curve; `proj` projects the debt's own future under the outlook. */
export function debtsOf(rows: ImportedLoan[], market: Econ, proj: Econ, m: MarketSnapshot, s: Settings): { debts: Debt[]; skipped: ImportedLoan[] } {
  const debts: Debt[] = [];
  const skipped: ImportedLoan[] = [];
  for (const row of owedOnly(rows)) {
    const amount = Number(row.amount) || 0;
    const months = Math.round(Number(row.months) || 0);
    if (amount <= 0) continue;
    if (months <= 0) {
      skipped.push(row);
      continue;
    }
    const stated = Number(row.prepayment_fee) || 0;
    const est = !stated && s.estimateFees ? estimateFee(row, market, m) : 0;
    const key = KEY_OF_PATH[Number(row.path_id)] || "";
    debts.push({
      id: row.id,
      label: [LENDER(row), key ? TRACK_SHORT[key] : ""].filter(Boolean).join(" · ") || "חוב",
      group: row.group === "loan" ? "loan" : "mortgage",
      track: key ? TRACK_SHORT[key] : "",
      balance: amount,
      rate: Number(row.rate) || 0,
      months,
      fee: stated || est,
      feeEstimated: !stated && est > 0,
      coef: coefOf(row, proj, s, amount),
      row,
    });
  }
  return { debts, skipped };
}

/* ------------------------------------------------------------ candidates */

export type Candidate = {
  key: string;
  track: TrackKey;
  segment: Segment;
  years: number;
  sched: 1 | 2;
  rate: number;
  anchor: number | null;
  margin: number | null;
  coef: Coef;
};

const PROBE = 1_000_000;

export function probeRow(c: Pick<Candidate, "track" | "years" | "sched" | "rate" | "anchor" | "margin">, amount = PROBE, mixId = "probe"): ImportedLoan {
  const bond = c.track === "mlz" || c.track === "mz";
  return {
    id: `${c.track}-${c.years}-${c.sched}`,
    mix_id: mixId,
    path_id: TRACK_PATH[c.track],
    amount,
    rate: Math.round(c.rate * 100) / 100,
    months: c.years * 12,
    amortization_schedule_id: c.sched,
    grace_type_id: 1,
    grace_months: 0,
    group: "mortgage",
    purpose: "refi_housing",
    anchor: bond ? Math.round((c.anchor ?? 0) * 100) / 100 : null,
    anchor_margin: c.margin === null ? null : Math.round(c.margin * 100) / 100,
    anchor_interval: bond ? RESET_MONTHS : null,
    change_frequency: bond ? freqLabel(RESET_MONTHS) : c.track === "prime" ? FREQ_PRIME : FREQ_FIXED,
    reset_fresh: true,
  } as ImportedLoan;
}

export function candidates(m: MarketSnapshot, market: Econ, proj: Econ, s: Settings, segments: Segment[], maxYears: number): Candidate[] {
  const f = market.forecast;
  if (!f) throw new Error("נדרשת תחזית ריבית ואינפלציה כדי לתמחר מסלולים חדשים");
  const out: Candidate[] = [];
  const minY = Math.max(1, Math.min(s.minYears, maxYears));
  for (const seg of segments)
    for (const track of TRACKS) {
      if (!s.tracks[track]) continue;
      // A 5-year reset track shorter than one reset is a fixed loan with extra words.
      const lo = track === "mlz" || track === "mz" ? Math.max(minY, 6) : minY;
      for (let y = lo; y <= maxYears; y++)
        for (const sched of s.equalPrincipal ? ([1, 2] as const) : ([1] as const)) {
          const p = newRate(m, f, track, y * 12, seg, { bank: s.bank, discount: s.negotiated });
          const c = { track, years: y, sched, rate: p.rate, anchor: p.anchor, margin: p.margin };
          out.push({ key: `${track}|${seg}|${y}|${sched}`, segment: seg, ...c, coef: coefOf(probeRow(c), proj, s, PROBE) });
        }
    }
  return out;
}

/* ------------------------------------------------------------ the LP */

export type Tranche = Omit<Candidate, "key"> & { amount: number };

export type Plan = {
  status: "optimal" | "infeasible" | "error";
  reason?: string;
  tranches: Tranche[];
  /** Fraction of each debt refinanced (0 = kept, 1 = fully refinanced). */
  refinance: Record<string, number>;
  newAmount: number;
  feesFinanced: number;
  objective: number;
  /** Which pass produced it: the LP itself, or the practicality MILP. */
  pass?: "lp" | "mip" | "lp-fallback";
};

type Ctx = { debts: Debt[]; cands: Candidate[]; s: Settings; maxYears: number };

function capFor(s: Settings): number | null {
  const caps: number[] = [];
  if (s.paymentCap && s.paymentCap > 0) caps.push(s.paymentCap);
  if (s.income && s.income > 0) caps.push(s.income * s.ptiMax);
  return caps.length ? Math.min(...caps) : null;
}

/** Build and solve. `restrict` limits the candidates (the integer pass). */
function solveLp(ctx: Ctx, cap: number | null, restrict?: Set<string>, integer = false): Plan {
  const { debts, cands, s } = ctx;
  const use = restrict ? cands.filter((c) => restrict.has(c.key)) : cands;
  const lam = Math.min(1, Math.max(0, s.risk));
  const payKey = s.capOn;
  const constraints = new Map<string, { min?: number; max?: number; equal?: number }>();
  const variables = new Map<string, Map<string, number>>();
  const binaries: string[] = [];
  // Money variables in thousands of shekels: binaries next to million-shekel
  // amounts are badly conditioned, and the solver reported false infeasibility.
  const U = 1000;

  const loanDebt = debts.filter((d) => d.group === "loan");
  const payOf = (c: Coef) => (payKey === "peak" ? c.peak[0] : c.first);
  const keptPay = sum(debts.map((d) => payOf(d.coef) * d.balance));
  const keptMortgage = sum(debts.filter((d) => d.group === "mortgage").map((d) => d.balance));
  const keptCost = SCENARIOS.map((_, k) => sum(debts.map((d) => costs(d.coef, s)[k] * d.balance)));

  const apMoney = s.consolidate && (loanDebt.length > 0 || s.cashOut > 0);
  constraints.set("fund_housing", { equal: 0 });
  constraints.set("fund_ap", { equal: apMoney ? s.cashOut / U : 0 });
  if (s.enforce329) constraints.set("fixed329", { min: 0 });
  if (cap !== null) constraints.set("pay", { max: cap - keptPay });
  if (s.propertyValue && s.propertyValue > 0) constraints.set("ltv", { max: LTV_MAX[s.propertyType] * s.propertyValue - keptMortgage });
  // Worst case: t ≥ cost in every scenario. Cost(k) = Σ x·c_k + kept_k − Σ y·c_k·B.
  if (lam > 0) SCENARIOS.forEach((_, k) => constraints.set(`wc${k}`, { min: keptCost[k] }));

  for (const c of use) {
    const v = new Map<string, number>();
    const ck = costs(c.coef, s);
    v.set("obj", (1 - lam) * expected(ck) * U);
    v.set(c.segment === "housing" ? "fund_housing" : "fund_ap", 1);
    if (s.enforce329) v.set("fixed329", IS_FIXED[c.track] ? 2 / 3 : -1 / 3);
    if (cap !== null) v.set("pay", payOf(c.coef) * U);
    if (s.propertyValue && s.propertyValue > 0) v.set("ltv", U);
    if (lam > 0) ck.forEach((x, k) => v.set(`wc${k}`, -x * U));
    if (integer) {
      v.set(`up_${c.key}`, 1);
      v.set(`lo_${c.key}`, 1);
    }
    variables.set(c.key, v);
  }
  if (lam > 0) {
    const t = new Map<string, number>([["obj", lam]]);
    SCENARIOS.forEach((_, k) => t.set(`wc${k}`, 1));
    variables.set("t_worst", t);
  }

  if (integer) {
    const M = (sum(debts.map((d) => d.balance + d.fee)) + Math.max(0, s.cashOut)) / U + 1;
    for (const c of use) {
      const b = `b_${c.key}`;
      binaries.push(b);
      constraints.set(`up_${c.key}`, { max: 0 });
      constraints.set(`lo_${c.key}`, { min: 0 });
      // One tranche per track and purpose; at most maxTracks in all.
      const one = `one_${c.track}_${c.segment}`;
      constraints.set(one, { max: 1 });
      variables.set(b, new Map([[`up_${c.key}`, -M], [`lo_${c.key}`, -Math.min(s.minTrack / U, M)], ["ntr", 1], [one, 1]]));
    }
    constraints.set("ntr", { max: s.maxTracks });
  }

  for (const d of debts) {
    const v = new Map<string, number>();
    const dk = costs(d.coef, s);
    v.set("obj", -(1 - lam) * expected(dk) * d.balance);
    v.set(d.group === "mortgage" ? "fund_housing" : "fund_ap", -(d.balance + d.fee) / U);
    if (cap !== null) v.set("pay", -payOf(d.coef) * d.balance);
    if (s.propertyValue && s.propertyValue > 0 && d.group === "mortgage") v.set("ltv", -d.balance);
    if (lam > 0) dk.forEach((x, k) => v.set(`wc${k}`, x * d.balance));
    const bound = `cap_${d.id}`;
    v.set(bound, 1);
    const allowed = d.group === "loan" ? s.consolidate : true;
    constraints.set(bound, allowed ? (s.allowKeep ? { max: 1 } : { equal: 1 }) : { equal: 0 });
    if (integer && allowed && s.allowKeep) {
      if (d.group === "loan") {
        // A consumer loan is closed or left alone — nobody prepays 7% of a car loan.
        binaries.push(`y_${d.id}`);
      } else {
        // A mortgage tranche may be partly prepaid, but what stays must be worth keeping:
        // y + z ≥ 1 and B·y + keepMin·z ≤ B  ⇒  z = 0 → fully refinanced; z = 1 → kept ≥ keepMin.
        const z = `zk_${d.id}`;
        const keepMin = Math.min(s.minTrack, d.balance);
        v.set(`kp1_${d.id}`, 1);
        v.set(`kp2_${d.id}`, d.balance / U);
        constraints.set(`kp1_${d.id}`, { min: 1 });
        constraints.set(`kp2_${d.id}`, { max: d.balance / U });
        binaries.push(z);
        variables.set(z, new Map([[`kp1_${d.id}`, 1], [`kp2_${d.id}`, keepMin / U]]));
      }
    }
    variables.set(`y_${d.id}`, v);
  }

  const model: Model = { direction: "minimize", objective: "obj", constraints, variables, binaries: integer ? binaries : undefined };
  const sol = solve(model, integer ? { maxIterations: 50_000, tolerance: 0.0005, timeout: 3000 } : undefined);
  if (sol.status !== "optimal") {
    return { status: sol.status === "infeasible" ? "infeasible" : "error", reason: sol.status, tranches: [], refinance: {}, newAmount: 0, feesFinanced: 0, objective: NaN };
  }
  const val = new Map(sol.variables);
  const tranches: Tranche[] = [];
  for (const c of use) {
    const x = (val.get(c.key) ?? 0) * U;
    if (x > 1) {
      const { key: _k, ...rest } = c;
      tranches.push({ ...rest, amount: x });
    }
  }
  const refinance: Record<string, number> = {};
  let fees = 0;
  for (const d of debts) {
    const y = Math.min(1, Math.max(0, val.get(`y_${d.id}`) ?? 0));
    refinance[d.id] = y < 1e-6 ? 0 : y > 1 - 1e-6 ? 1 : y;
    fees += refinance[d.id] * d.fee;
  }
  return {
    status: "optimal",
    tranches,
    refinance,
    newAmount: sum(tranches.map((t) => t.amount)),
    feesFinanced: fees,
    objective: sol.result + (1 - lam) * expected(keptCost),
    pass: integer ? "mip" : "lp",
  };
}

/**
 * LP, then the practicality pass: the LP's own support (a vertex solution
 * opens only a handful of tranches) plus neighbouring terms is re-solved as a
 * MILP with one tranche per track, each ≥ minTrack, at most maxTracks. The
 * continuous optimum is a lower bound the final plan is measured against.
 */
export function optimize(ctx: Ctx, cap: number | null): { plan: Plan; lowerBound: number } {
  const lp = solveLp(ctx, cap);
  if (lp.status !== "optimal") return { plan: lp, lowerBound: NaN };
  const fams = new Set(lp.tranches.map((t) => `${t.track}|${t.segment}`));
  const awkwardKeep = ctx.debts.some((d) => {
    const y = lp.refinance[d.id] ?? 0;
    return y > 0 && y < 1 && (d.group === "loan" || (1 - y) * d.balance < Math.min(ctx.s.minTrack, d.balance) - 1);
  });
  const needsInteger =
    awkwardKeep ||
    lp.tranches.length > ctx.s.maxTracks ||
    fams.size < lp.tranches.length ||
    lp.tranches.some((t) => t.amount < ctx.s.minTrack - 1);
  if (!needsInteger) return { plan: lp, lowerBound: lp.objective };
  // Two integer passes, the better one wins:
  //   near — the LP's own terms ±4 years (fast, usually optimal);
  //   wide — every term of every track family the LP used, plus the fixed
  //          tracks (catches a combination the neighbourhood cannot reach).
  const near = new Set<string>();
  for (const t of lp.tranches)
    for (let dy = -4; dy <= 4; dy++) {
      const y = t.years + dy;
      if (y < 1 || y > ctx.maxYears) continue;
      near.add(`${t.track}|${t.segment}|${y}|${t.sched}`);
    }
  // Keep a fixed track within reach so ⅓ fixed survives pruning.
  for (const c of ctx.cands) if (IS_FIXED[c.track] && (c.years === ctx.maxYears || c.years === Math.min(20, ctx.maxYears))) near.add(c.key);
  const wide = new Set<string>();
  for (const c of ctx.cands) if (fams.has(`${c.track}|${c.segment}`) || IS_FIXED[c.track]) wide.add(c.key);
  const tries = [solveLp(ctx, cap, near, true), solveLp(ctx, cap, wide, true)].filter((p) => p.status === "optimal");
  if (!tries.length) return { plan: { ...lp, pass: "lp-fallback", reason: "integer pass failed" }, lowerBound: lp.objective };
  tries.sort((a, b) => a.objective - b.objective);
  return { plan: tries[0], lowerBound: lp.objective };
}

/* ------------------------------------------------------------ the whole run */

export type Totals = {
  firstPayment: number;
  /** Highest monthly payment of the whole mix under the forecast. */
  peakPayment: number;
  total: number;
  pv: number;
  principal: number;
  /** total − principal: what the money costs (interest + indexation). */
  cost: number;
  avgRate: number;
  months: number;
  /** Per scenario: PV, total paid, the worst monthly payment (sum of per-row peaks). */
  scen: { pv: number; total: number; peak: number }[];
};

export type Result = {
  ok: boolean;
  reason?: string;
  plan: Plan;
  debts: Debt[];
  skipped: ImportedLoan[];
  rows: ImportedLoan[];
  totals: Totals;
  baseline: Totals;
  lowerBound: number;
  checks: { label: string; ok: boolean; value: string; rule: string }[];
  frontier: { pay: number; cost: number; chosen?: boolean }[];
  maxYears: number;
  candidates: number;
  ms: number;
};

export function totalsOf(rows: ImportedLoan[], econ: Econ, s: Settings): Totals {
  let first = 0;
  let total = 0;
  let principal = 0;
  let rateW = 0;
  let months = 0;
  const monthly: number[] = [];
  const scen = SCENARIOS.map(() => ({ pv: 0, total: 0, peak: 0 }));
  for (const r of rows) {
    const a = Number(r.amount) || 0;
    if (a <= 0 || !(Number(r.months) > 0)) continue;
    const p = priceLoan(r, econ);
    const c = coefOf(r, econ, s, a);
    p.schedule.forEach((x, i) => (monthly[i] = (monthly[i] ?? 0) + (i === 0 ? monthOnePay(r, x.payment) : x.payment)));
    first += c.first * a;
    total += p.totalPaid;
    principal += a;
    rateW += a * (Number(r.rate) || 0);
    months = Math.max(months, p.schedule.length);
    SCENARIOS.forEach((_, k) => {
      scen[k].pv += c.pv[k] * a;
      scen[k].total += c.total[k] * a;
      scen[k].peak += c.peak[k] * a;
    });
  }
  return {
    firstPayment: first,
    peakPayment: monthly.length ? Math.max(...monthly) : 0,
    total,
    pv: scen[0].pv,
    principal,
    cost: total - principal,
    avgRate: principal ? rateW / principal : 0,
    months,
    scen,
  };
}

/** Round each tranche to ₪1,000, the largest absorbing the remainder so the money still balances. */
function roundTranches(ts: Tranche[]): Tranche[] {
  const bySeg = new Map<Segment, Tranche[]>();
  for (const t of ts) bySeg.set(t.segment, [...(bySeg.get(t.segment) ?? []), t]);
  const out: Tranche[] = [];
  for (const list of Array.from(bySeg.values())) {
    const total = Math.round(sum(list.map((t) => t.amount)));
    const sorted = [...list].sort((a, b) => a.amount - b.amount);
    let used = 0;
    sorted.forEach((t, i) => {
      const a = i === sorted.length - 1 ? total - used : Math.round(t.amount / 1000) * 1000;
      used += a;
      out.push({ ...t, amount: a });
    });
  }
  return out;
}

export const OPT_SOURCE = "תמהיל אופטימלי";

export function mixRows(plan: Plan, debts: Debt[], mixId: string): ImportedLoan[] {
  const rows: ImportedLoan[] = [];
  // What is kept stays exactly as the document stated it (scaled when partly refinanced).
  for (const d of debts) {
    const keep = 1 - (plan.refinance[d.id] ?? 0);
    if (keep <= 1e-6) continue;
    rows.push({
      ...d.row,
      id: crypto.randomUUID(),
      mix_id: mixId,
      amount: Math.round(d.balance * keep),
      indexation: d.row.indexation ? Math.round(Number(d.row.indexation) * keep) : d.row.indexation,
      prepayment_fee: null,
    } as ImportedLoan);
  }
  // A new loan's end date, so the ledger's תאריך סיום and חודשים agree from the first paint.
  const today = startOfToday();
  for (const t of roundTranches(plan.tranches).sort((a, b) => TRACKS.indexOf(a.track) - TRACKS.indexOf(b.track))) {
    const end = toIso(addMonths(today, t.years * 12));
    rows.push({
      ...probeRow(t, t.amount, mixId),
      loan_end_date: end,
      end_date: end,
      id: crypto.randomUUID(),
      group: t.segment === "allPurpose" ? "loan" : "mortgage",
      purpose: t.segment === "allPurpose" ? "refi_any" : "refi_housing",
      source_type: OPT_SOURCE,
    } as ImportedLoan);
  }
  return rows;
}

export function run(master: ImportedLoan[], econ: Econ, m: MarketSnapshot, s: Settings, frontierPoints = 9): Result {
  const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const t0 = now();
  const ageCap = s.age ? Math.max(1, Math.floor(s.maxAgeAtEnd - s.age)) : 30;
  const maxYears = Math.max(1, Math.min(30, s.maxYears, ageCap));
  // Market prices from today's curve; the future of every track from the chosen outlook.
  const proj = outlookEcon(econ, s.outlook);
  const { debts, skipped } = debtsOf(master, econ, proj, m, s);
  const needAp = s.consolidate && (debts.some((d) => d.group === "loan") || s.cashOut > 0);
  const segments: Segment[] = needAp ? ["housing", "allPurpose"] : ["housing"];
  const emptyTotals: Totals = { firstPayment: 0, peakPayment: 0, total: 0, pv: 0, principal: 0, cost: 0, avgRate: 0, months: 0, scen: [] };
  const baseline = totalsOf(debts.map((d) => d.row), proj, s);
  const blank = (reason: string, cands = 0): Result => ({
    ok: false,
    reason,
    plan: { status: "error", tranches: [], refinance: {}, newAmount: 0, feesFinanced: 0, objective: NaN },
    debts,
    skipped,
    rows: [],
    totals: emptyTotals,
    baseline,
    lowerBound: NaN,
    checks: [],
    frontier: [],
    maxYears,
    candidates: cands,
    ms: now() - t0,
  });
  if (!debts.length) return blank("אין בתמהיל הנוכחי חובות עם סכום ותקופה — אין ממה לבנות תמהיל");
  let cands: Candidate[];
  try {
    cands = candidates(m, econ, proj, s, segments, maxYears);
  } catch (e) {
    return blank(e instanceof Error ? e.message : "תמחור המסלולים נכשל");
  }
  if (!cands.length) return blank("לא נבחר אף מסלול");
  const ctx: Ctx = { debts, cands, s, maxYears };

  const cap = capFor(s);
  const { plan, lowerBound } = optimize(ctx, cap);
  if (plan.status !== "optimal")
    return blank(
      plan.status === "infeasible"
        ? "אין תמהיל שעומד בכל התנאים יחד — תקרת ההחזר נמוכה מדי או שהמגבלות סותרות. העלו את התקרה, הרחיבו את טווח השנים או אפשרו מסלולים נוספים."
        : "הפתרון נכשל",
      cands.length
    );

  const rows = mixRows(plan, debts, "optimized");
  const totals = totalsOf(rows, proj, s);
  const metric = (t: Totals) => (s.objective === "total" ? t.total : t.pv);

  // The frontier: the cheapest mix at each payment level, from the lowest
  // payment any allowed mix reaches to what the unconstrained optimum pays.
  const frontier: Result["frontier"] = [];
  const lowPay = solveLp({ ...ctx, s: { ...s, objective: "payment", risk: 0 } }, null);
  const freePlan = solveLp(ctx, null);
  if (lowPay.status === "optimal" && freePlan.status === "optimal") {
    const payOf = (p: Plan) => totalsOf(mixRows(p, debts, "f"), proj, s).firstPayment;
    const lo = payOf(lowPay);
    const hi = Math.max(lo + 1, payOf(freePlan));
    for (let i = 0; i < frontierPoints; i++) {
      const c = lo + ((hi - lo) * i) / (frontierPoints - 1);
      const p = solveLp(ctx, c + 0.5);
      if (p.status !== "optimal") continue;
      const tt = totalsOf(mixRows(p, debts, "f"), proj, s);
      frontier.push({ pay: tt.firstPayment, cost: metric(tt) });
    }
  }
  frontier.push({ pay: totals.firstPayment, cost: metric(totals), chosen: true });

  // The rules, stated with the numbers that satisfy them.
  const newRows = rows.filter((r) => r.source_type === OPT_SOURCE);
  const newTotal = sum(newRows.map((r) => Number(r.amount) || 0));
  const fixed = sum(newRows.filter((r) => [2, 3].includes(Number(r.path_id))).map((r) => Number(r.amount) || 0));
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const nis = (x: number) => `₪${Math.round(x).toLocaleString("he-IL")}`;
  const checks: Result["checks"] = [];
  if (newTotal > 0)
    checks.push({
      label: "שליש בריבית קבועה",
      ok: !s.enforce329 || fixed / newTotal >= 1 / 3 - 0.005,
      value: pct(fixed / newTotal),
      rule: "הוראה 329 §7 — ריבית משתנה עד 66.66% מההלוואה",
    });
  checks.push({ label: "תקופה", ok: totals.months <= 360, value: `${Math.round((totals.months / 12) * 10) / 10} שנים`, rule: "הוראה 329 §8 — עד 30 שנה" });
  if (cap !== null) {
    const v = s.capOn === "peak" ? totals.scen[0]?.peak ?? totals.peakPayment : totals.firstPayment;
    checks.push({ label: s.capOn === "peak" ? "החזר בשיא" : "החזר חודשי", ok: v <= cap + 50, value: nis(v), rule: `תקרה ${nis(cap)}` });
  }
  if (s.income && s.income > 0)
    checks.push({
      label: "שיעור החזר מהכנסה",
      ok: totals.firstPayment / s.income <= s.ptiMax + 0.002,
      value: pct(totals.firstPayment / s.income),
      rule: `הוראה 329 §5 — עד ${pct(s.ptiMax)}`,
    });
  if (s.propertyValue && s.propertyValue > 0) {
    const secured = sum(rows.filter((r) => r.group !== "loan" || r.source_type === OPT_SOURCE).map((r) => Number(r.amount) || 0));
    checks.push({
      label: "שיעור מימון",
      ok: secured / s.propertyValue <= LTV_MAX[s.propertyType] + 0.005,
      value: pct(secured / s.propertyValue),
      rule: `הוראה 329 §2 — עד ${pct(LTV_MAX[s.propertyType])}`,
    });
  }

  return {
    ok: true,
    plan,
    debts,
    skipped,
    rows,
    totals,
    baseline,
    lowerBound,
    checks,
    frontier: frontier.sort((a, b) => a.pay - b.pay),
    maxYears,
    candidates: cands.length,
    ms: now() - t0,
  };
}
