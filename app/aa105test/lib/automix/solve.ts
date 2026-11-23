// תמהיל אוטומטי — the solver.
//
// THE DECISION. Every debt j of the master is kept whole or refinanced whole
// (z_j ∈ {0,1}); the money that refinances it — its balance, its prepayment
// fee and the new loan's one-off costs — is borrowed again as x_c over the
// candidate columns c = (track, whole-year term, housing | all-purpose). A
// tranche's payments are linear in its principal for a given column, so for a
// fixed choice of terms the question is a mixed-integer LINEAR program, solved
// exactly by branch and bound (yalps).
//
//   money      Σ x(housing) = Σ z_j (B_j + fee_j) over mortgage debts + setup_h·s_h
//              Σ x(all-purpose) = the same over consumer debts + setup_ap·s_ap
//   law        fixed ≥ ⅓ of the new money (329 §7), and of all credit on the
//              property after the move — or no lower than today's share (§9)
//              payment ≤ 50% of income (§5), LTV caps (§2, Q&A 2.2, §10א),
//              term ≤ 30 years and the age limit (§8)
//   practice   CPI-linked ≤ ⅓ of new housing money; no track over ⅔ (tapered
//              for small amounts, קל"צ exempt) except in the stability goal; ≤ 4 housing
//              tranches + ≤ 2 all-purpose, each ≥ ₪50,000 unless it is the only
//              one; whole debts only; state-eligibility loans are never touched
//   goal       a budget on the typed month-one payment, a cap on the stressed
//              payment over the next five years (one cap, or one per economy),
//              a deadline for the last payment, the cost goals' gates (the
//              one-off costs' share of the new money, the break-even position)
//              — whichever the goal needs
//   objective  the typed payment, or (1−λ)·cost(forecast) + λ·max over the
//              stress economies of cost, cost = every shekel still to be paid,
//              or the payment's rise (the worst economy's peak less month one)
//
// TERMS. One term per track. Phase 1 solves with every term of every track as
// a column (the LP picks at most two adjacent terms per track); phase 2 merges
// each track to one term and re-solves; phase 3 moves each track's term ±1…3
// years while the objective improves. scripts/automix-check.mts compares the
// result with brute force over every term combination on small cases.

import { solve, type Model } from "yalps";
import type { TrackKey } from "@/app/aa107test/lib/market";
import { FIXED_MIN, LINKED_MAX, MAX_AP_TRANCHES, MAX_HOUSING_TRANCHES, MIN_TRANCHE, TRACK_SHARE_MAX, TRACK_SHARE_EXEMPT } from "./rules";

export const U = 1000; // money variables in ₪ thousands — binaries next to millions are badly conditioned
/** Per opened tranche, ₪ — the read-out's per-row rounding (see the budget row). */
export const ROUNDING = 0.6;

export type Segment = "housing" | "allPurpose";

/** Per-economy figures. Index 0 is the forecast (base); the rest are the stress economies. */
export type Vec = number[];

export type SolverDebt = {
  id: string;
  group: "mortgage" | "loan";
  /**
   * What refinancing it borrows: housing money, or all-purpose money — a
   * consumer loan, and a mortgage row whose purpose is כל מטרה (a bank prices a
   * refinance by the purpose of the money).
   */
  segment: Segment;
  /** Lender key — refinancing at ANOTHER bank moves every mortgage tranche of a lender together. */
  lender: string;
  balance: number;
  fee: number;
  months: number;
  fixed: boolean;
  linked: boolean;
  /** Typed month-one payment (the board's figure). */
  monthly: number;
  /** Every future payment, per economy, ₪. */
  paid: Vec;
  /** Every future payment on the board's typed read-out, ₪. */
  typedPaid: number;
  /** Present value of the forecast payments at the board's discount rate (ע.נ.נ), ₪. */
  pv?: number;
  /** סה״כ ריבית on the typed read-out, ₪ — the figure the sheet's cost column shows. */
  typedInterest: number;
  /** Highest monthly payment, per economy, ₪. */
  peak: Vec;
  /** Payment at the guard's sample months (EARLY), per economy, ₪ — [economy][sample]. */
  early: number[][];
  /** Forecast position at each AHEAD month: everything paid through it plus the balance left, ₪. */
  ahead?: number[];
  /** null = may move; a string = why it may not (kept). */
  lock: string | null;
  /** Must be cleared in full (a debt due now, or one its lender has called). */
  forced?: boolean;
  /** Kept, it needs this much all-purpose money to be brought current (its arrears), ₪. */
  cure?: number;
};

export type Column = {
  key: string;
  track: TrackKey;
  segment: Segment;
  years: number;
  /** Per ₪1 of principal. */
  monthly: number;
  paid: Vec;
  typedPaid: number;
  typedInterest: number;
  /** Per ₪1: present value of the forecast payments at the board's discount rate. */
  pv?: number;
  peak: Vec;
  /** Per ₪1, at the guard's sample months — [economy][sample]. */
  early: number[][];
  /** Per ₪1: the forecast position at each AHEAD month (paid through it plus the balance left). */
  ahead?: number[];
  /** The forecast's all-in annual rate of the column, % (the rate at which its forecast payments are worth ₪1). */
  fRate?: number;
};

/**
 * The months the payment guard looks at: every sixth month of the next five
 * years, and the last month of the five. Five years because a household's
 * budget is a near-term fact — thirty years out, a nominal shekel compared with
 * today's says nothing — and every sixth month because payments move smoothly
 * with prime and step at bond resets (60 months for a new track; an existing
 * track resets on its own calendar). Month 60 itself: CPI-linked and prime
 * payments drift upward month by month, so the five years' highest payment sits
 * at their end, and sampling stopped at 55 (audit W3: L01 ₪7,043 at month 60
 * against the ₪7,006 the reason promised; L17 ₪9,064 against ₪9,021). The
 * proposal tests its own rows on every month 1–60 before it states the guard.
 */
export const EARLY = [...Array.from({ length: 10 }, (_, i) => 1 + 6 * i), 60];
/**
 * The months the break-even gate's position test is held at when a cost goal's
 * answer failed it (index.ts gatesPass): BREAK_EVEN_MAX and later, out to the
 * longest term, so the client is ahead by month 120 and stays ahead.
 */
export const AHEAD = [120, 132, 144, 168, 192, 240, 300, 360];

export type Spec = {
  /** Weight on the typed month-one payment (₪/month). */
  wMonthly: number;
  /** Weight on cost; λ is the share of it that is the worst economy. */
  wCost: number;
  lambda: number;
  /** Cap on the typed month-one payment of the whole mix. */
  budget: number | null;
  /**
   * Cap on the mix's monthly payment at every EARLY month in every economy: one
   * figure for all of them, or one per economy (ECONOMIES order) — the relative
   * guard, today's own five-year peak in that economy (index.ts guardCaps).
   */
  peakCap: number | number[] | null;
  /**
   * Weight on the rise: the worst economy's payment peak over the whole life
   * (bounded above by the sum of every row's own peak there) less the typed
   * month-one payment, ₪ a month (יציבות מרבית, index.ts solveStable).
   */
  wRise?: number;
  /** Cap on the same rise, ₪ a month (the stability goal's band). */
  riseCap?: number | null;
  /** Cap on the same bound as a share of month one: P ≤ (1 + riseShare) × the typed month-one payment (the stability promise, index.ts solveStable). */
  riseShare?: number | null;
  /** Cap on the same bound itself, ₪ a month: the worst-economy peak at most this (stability's material fall against today). */
  peakTop?: number | null;
  /** Debts this goal keeps whole (rules.ts CHEAP_KEEP): locked for this solve. */
  hold?: string[];
  /**
   * One-off costs (fees + setup) at most this share of the new money
   * (rules.ts REFI_COST_MAX), held in the solve: the gate in proposalOf, as a
   * row (the cures of kept debts left out of the new money, so it is stricter).
   */
  costShareMax?: number | null;
  /**
   * The break-even gate's position test as rows: at each month of `months`
   * (solve.ts AHEAD) everything paid through it plus the balance left, forecast,
   * at most `cap` (the reference's own position then), ₪.
   */
  ahead?: { cap: number[] } | null;
  /** Floor on the typed month-one payment — "no more relief than this" (balanced, consolidate). */
  floor?: number | null;
  /** Caps on everything still to be paid: under the forecast, and on the typed read-out, ₪. */
  paidCap?: number | null;
  /**
   * Cap on the present value of every forecast payment, at the board's discount
   * rate (savings, balanced): a saving that is only payments moved earlier, and
   * costs more once discounted, is not one (the proposal's PV gate).
   */
  pvCap?: number | null;
  typedPaidCap?: number | null;
  /** Cap on the typed read-out's סה״כ ריבית, ₪. */
  typedInterestCap?: number | null;
  /**
   * Cap on the typed read-out's cost — interest AND indexation, everything paid
   * beyond the balances (fees and setup included, since they are borrowed) — ₪.
   * What keeps the sheet's displayed ordering of goals true without rewarding
   * CPI-linked tracks, whose indexation סה״כ ריבית does not count.
   */
  typedCostCap?: number | null;
  /** Last payment no later than this month. */
  finish: number | null;
  /** Every mortgage tranche stays (the consolidation goal). */
  keepMortgage: boolean;
  /** Consumer debts may be consolidated. */
  loansAllowed: boolean;
  /** Apply the ⅔ per-track ceiling. */
  shareCap: boolean;
  /** Mortgage tranches of one lender move together (moving to another bank). */
  moveWhole: boolean;
  /**
   * Locked debts this goal may repay anyway (קיצור שנים: a state-eligibility
   * loan that alone holds the end date, and costs nothing to repay).
   */
  unlock?: string[];
  /** Payment cap from income (329 §5), on the housing-secured payment. */
  ptiCap: number | null;
  /** LTV: property value, the housing cap, the all-purpose total cap. */
  ltv: { value: number; housing: number; withAp: number } | null;
  /**
   * Credit the property secures that no decision touches — a mortgage row past
   * its term, which stays on the board as it is. It counts in every limit on
   * the property (LTV, the fixed and CPI shares of all its credit) exactly as
   * the proposal's checks count it.
   */
  secured?: { balance: number; fixed: number; linked: number };
  /** Today's fixed share of the property's credit (for 329 §9). */
  fixedToday: number;
  /** Today's CPI-linked share of it — the mix after the move may not be more linked than max(⅓, this). */
  linkedToday: number;
  /** One-off costs of opening each segment, ₪. */
  setupHousing: number;
  setupAp: number;
  /**
   * The part of setupAp not paid again when the housing file opens too: the
   * appraisal is one for the property (audit W7: r04, L16, L45 charged ₪6,156
   * where ₪3,656 is due). The all-purpose file then pays its file and lien only.
   */
  setupApShared?: number;
  /** Debt decisions held fixed (the term walk): ids refinanced; every other movable debt kept. */
  fixZ?: string[] | null;
  /**
   * The smallest all-purpose loan the lender writes (rules.ts BANK_AP_MIN, or
   * AP_GREEN.min at Mizrahi-Tefahot for its own mortgage client): the
   * segment's only tranche at least this. Not held while the segment carries
   * money the mix must lend: a forced all-purpose debt (debt due now, a row
   * moving with a whole mortgage) or, under moveWhole, a כל מטרה mortgage row
   * that moves; nor while arrears are cured from it. null = no floor (a non-bank).
   */
  apMin?: number | null;
  /**
   * Whose law the new money is under. "bank": directive 329 (⅓ fixed on the new
   * money and on the property, no enlarging an LTV breach). "nonbank": 329 does
   * not bind a non-bank lender — its own LTV policy (`ltv`) and the Fair Credit
   * Law ceiling (applied to the columns) do. Default "bank".
   */
  law?: "bank" | "nonbank";
};

export type Plan = {
  ok: boolean;
  /** optimal · incumbent (node cap reached, best found) · relaxed (LP only) · or why it failed. */
  status: string;
  /** The LP relaxation's debt decisions, when `relaxed`. */
  zFrac?: Record<string, number>;
  /** Refinanced debt ids. */
  refinance: string[];
  /** Column key → ₪. */
  amounts: Record<string, number>;
  objective: number;
  setupHousing: number;
  setupAp: number;
};

const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const FIXED: Record<TrackKey, boolean> = { prime: false, klz: true, kz: true, mlz: false, mz: false };
const LINKED: Record<TrackKey, boolean> = { prime: false, klz: false, kz: true, mlz: false, mz: true };

/** Solver telemetry — how many MILPs a build ran and how long they took (the check script prints it). */
export const STATS = { solves: 0, ms: 0, cacheHits: 0, slow: [] as { ms: number; status: string; bins: number; cols: number; spec?: string }[] };

/** One MILP over the given columns. */
/**
 * The debts in an order that depends on what they ARE, never on where they sit
 * on the board: the model's variable order steers branch and bound, and a
 * node-capped search that followed the board's order gave a different answer
 * when the same rows were listed in reverse (corpus: r02 with a profile).
 */
const ORDER_KEY = (d: SolverDebt) => [d.group, d.segment, -Math.round(d.balance), Math.round(d.paid[0]), d.months, d.fixed ? 1 : 0, d.linked ? 1 : 0, d.lender];
export function canonical(debts: SolverDebt[]): SolverDebt[] {
  return [...debts].sort((a, b) => {
    const x = ORDER_KEY(a);
    const y = ORDER_KEY(b);
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
    return 0;
  });
}

export function solveOnce(debtsIn: SolverDebt[], cols: Column[], s: Spec, relaxed = false, oneTerm = false, cap = NODE_CAP): Plan {
  const debts = canonical(debtsIn);
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  let out: Plan | null = null;
  try {
    out = solveOnceInner(debts, cols, s, relaxed, oneTerm, cap);
    return out;
  } finally {
    const ms = (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0;
    STATS.solves++;
    STATS.ms += ms;
    if (ms > 50)
      STATS.slow.push({
        ms: Math.round(ms),
        status: out?.status ?? "?",
        bins: debts.length,
        cols: cols.length,
        spec: `w${s.wMonthly}/${s.wCost}${s.wRise ? `/r${s.wRise}` : ""} l${s.lambda} b${s.budget ?? "-"} f${s.finish ?? "-"} fl${s.floor ?? "-"} pk${Array.isArray(s.peakCap) ? "rel" : s.peakCap ?? "-"} km${s.keepMortgage ? 1 : 0} sc${s.shareCap ? 1 : 0}${s.typedCostCap != null ? ` tc${Math.round(s.typedCostCap)}` : ""}${s.paidCap != null ? ` pc${Math.round(s.paidCap)}` : ""}${s.fixZ ? " fixZ" : ""}${relaxed ? " LP" : ""}${oneTerm ? " 1T" : ""}`,
      });
  }
}

/**
 * Branch and bound is capped by NODES, never by the clock — the same input must
 * give the same answer on any machine. When the cap is reached the best
 * integer solution found so far is used (status "incumbent"); solveTerms then
 * improves it by local search, and the check script measures the gap to brute
 * force.
 */
export const NODE_CAP = 1500;
/** Slack on the whole-property share rows, ₪ (see fix_all). */
export const SHARE_SLACK = 100;
/** The opening solve's cap (solveTerms): enough for a normal file, short of proving a hard one has no point. */
export const FIRST_CAP = 500;

function solveOnceInner(debts: SolverDebt[], colsIn: Column[], s: Spec, relaxed: boolean, oneTerm: boolean, cap: number): Plan {
  // A deadline binds new money too: no column may end after it.
  const cols = s.finish === null ? colsIn : colsIn.filter((c) => c.years * 12 <= s.finish!);
  const C = new Map<string, { min?: number; max?: number; equal?: number }>();
  const V = new Map<string, Map<string, number>>();
  const bins: string[] = [];
  const add = (v: string, c: string, k: number) => {
    if (!k) return;
    let m = V.get(v);
    if (!m) V.set(v, (m = new Map()));
    m.set(c, (m.get(c) ?? 0) + k);
  };
  const nE = cols[0]?.paid.length ?? debts[0]?.paid.length ?? 1;
  const stressK = Array.from({ length: nE }, (_, k) => k);

  const free = (d: SolverDebt) => (!d.lock || !!s.unlock?.includes(d.id)) && !s.hold?.includes(d.id);
  const movable = debts.filter((d) => d.forced || (free(d) && (d.group === "mortgage" ? !s.keepMortgage : s.loansAllowed)));
  const kept = (d: SolverDebt) => !movable.includes(d);
  const bankLaw = (s.law ?? "bank") === "bank";
  // Arrears to bring current on a debt that stays: needed only while it stays.
  const cureOf = (d: SolverDebt) => (d.forced ? 0 : d.cure ?? 0);
  const cureAll = sum(debts.map(cureOf));

  // Constants carried by every kept debt (as if z = 0), and the z coefficients that undo them.
  const keptPaid = stressK.map((k) => sum(debts.map((d) => d.paid[k])));
  const keptMonthly = sum(debts.map((d) => d.monthly));
  const keptEarly = stressK.map((k) => EARLY.map((_, i) => sum(debts.map((d) => d.early[k][i]))));
  const mortgageBal = sum(debts.filter((d) => d.group === "mortgage").map((d) => d.balance)) + (s.secured?.balance ?? 0);
  const mortgageFixed = sum(debts.filter((d) => d.group === "mortgage" && d.fixed).map((d) => d.balance)) + (s.secured?.fixed ?? 0);
  const mortgageMonthly = sum(debts.filter((d) => d.group === "mortgage").map((d) => d.monthly));

  const needH = movable.some((d) => d.segment === "housing");
  const needAp = movable.some((d) => d.segment === "allPurpose") || cureAll > 0;
  const use = cols.filter((c) => (c.segment === "housing" ? needH : needAp));

  // ---- money
  C.set("fund_h", { equal: 0 });
  // A kept debt in arrears is brought current from all-purpose money: Σx − … − cure·(1 − z) = 0.
  C.set("fund_ap", { equal: cureAll / U });
  // ---- objective pieces
  const costW = s.wCost;
  const lam = Math.min(1, Math.max(0, s.lambda));
  let objConst = s.wMonthly * keptMonthly + costW * (1 - lam) * (keptPaid[0] / U);
  if (costW && lam > 0) {
    for (const k of stressK) C.set(`wc${k}`, { min: keptPaid[k] / U });
    add("t", "obj", costW * lam);
    for (const k of stressK) add("t", `wc${k}`, 1);
  }
  if (s.budget !== null) C.set("budget", { max: s.budget - keptMonthly });
  if (s.floor != null) C.set("floor", { min: s.floor - keptMonthly });
  const keptTyped = sum(debts.map((d) => d.typedPaid));
  if (s.paidCap != null) C.set("paid0", { max: (s.paidCap - keptPaid[0]) / U });
  if (s.pvCap != null) C.set("pv0", { max: (s.pvCap - sum(debts.map((d) => d.pv ?? 0))) / U });
  if (s.typedPaidCap != null) C.set("tpaid", { max: (s.typedPaidCap - keptTyped) / U });
  const keptInterest = sum(debts.map((d) => d.typedInterest));
  if (s.typedInterestCap != null) C.set("tint", { max: (s.typedInterestCap - keptInterest) / U });
  const keptCost = sum(debts.map((d) => d.typedPaid - d.balance));
  if (s.typedCostCap != null) C.set("tcost", { max: (s.typedCostCap - keptCost) / U });
  if (s.ptiCap !== null) C.set("pti", { max: s.ptiCap - mortgageMonthly });
  const capAt = (k: number) => (Array.isArray(s.peakCap) ? s.peakCap[k] ?? s.peakCap[s.peakCap.length - 1] : (s.peakCap as number));
  // A guard row no mix can reach is left out: every debt kept at its own payment
  // there, plus all the money that could be lent at the dearest column there, is
  // still under the cap (most rows of the falling economies, and of the early
  // months). Each of the 55 rows slowed every pivot: קיצור שנים under its guard
  // averaged 22 ms a solve against 0.5 ms without it (fuzz seed 31 Z88, 5.7 s).
  const lendable = sum(debts.map((d) => d.balance + d.fee)) + cureAll + s.setupHousing + s.setupAp;
  const guardRow = (k: number, i: number) => {
    let top = 0;
    for (const c of use) if (c.early[k][i] > top) top = c.early[k][i];
    return keptEarly[k][i] + lendable * top > capAt(k);
  };
  const pkRows = new Set<string>();
  if (s.peakCap !== null)
    for (const k of stressK)
      EARLY.forEach((_, i) => {
        if (!guardRow(k, i)) return;
        pkRows.add(`pk${k}_${i}`);
        C.set(`pk${k}_${i}`, { max: capAt(k) - keptEarly[k][i] });
      });
  // The break-even position test (index.ts gatesPass), at each AHEAD month.
  const aheadCap = s.ahead?.cap ?? null;
  if (aheadCap) aheadCap.forEach((cap, j) => C.set(`ah${j}`, { max: (cap - sum(debts.map((d) => d.ahead?.[j] ?? 0))) / U }));
  // Stability's rise: P ≥ Σ every row's own peak in economy k (an upper bound of
  // the mix's peak there), and the rise is P less the typed month-one payment.
  const rise = !!s.wRise || s.riseCap != null || s.riseShare != null || s.peakTop != null;
  if (rise) {
    for (const k of stressK) {
      C.set(`rp${k}`, { min: sum(debts.map((d) => d.peak[k])) });
      add("P", `rp${k}`, 1);
    }
    if (s.wRise) {
      add("P", "obj", s.wRise);
      objConst -= s.wRise * keptMonthly;
    }
    if (s.riseCap != null) {
      C.set("rise", { max: s.riseCap + keptMonthly });
      add("P", "rise", 1);
    }
    if (s.riseShare != null) {
      C.set("riseS", { max: (1 + s.riseShare) * keptMonthly });
      add("P", "riseS", 1);
    }
    if (s.peakTop != null) {
      C.set("ptop", { max: s.peakTop });
      add("P", "ptop", 1);
    }
  }
  // 329 §7 on the new money, per segment — bank law only.
  if (bankLaw) {
    C.set("fix_h", { min: 0 });
    C.set("fix_ap", { min: 0 });
  }
  // 329 Q&A 5.1 / §9 on everything the property secures afterwards — bank law only.
  const phi = Math.min(FIXED_MIN, s.fixedToday);
  // Both whole-property rows are tight AT ZERO when nothing moves (phi or psi
  // equals today's share), a degenerate corner where yalps' simplex cycles and
  // branch and bound silently drops the node — enough of them and a feasible
  // problem reads "infeasible" (r01 savings, r02 at +0.05pp). ₪100 of slack
  // (SHARE_SLACK) breaks the tie; rowsOf re-tests the shares on the rounded
  // amounts, and ₪100 is under a thousandth of a point of any real mortgage.
  if (bankLaw) C.set("fix_all", { min: -(mortgageFixed - phi * mortgageBal) / U - SHARE_SLACK / U });
  C.set("link_h", { max: 0 });
  // Practice on the whole secured mix: the move may not leave it more CPI-linked than max(⅓, today).
  const psi = Math.max(LINKED_MAX, s.linkedToday);
  const mortgageLinked = sum(debts.filter((d) => d.group === "mortgage" && d.linked).map((d) => d.balance)) + (s.secured?.linked ?? 0);
  C.set("link_all", { max: -(mortgageLinked - psi * mortgageBal) / U + SHARE_SLACK / U });
  if (s.ltv) {
    // 329 §9: a refinance may not create a breach or enlarge one — so the cap is
    // the rule or today's balance, whichever is higher (a household already over
    // it may move only if the move does not add to it).
    // A non-bank lender is bound by its own LTV policy only (329 §9 is bank law).
    const capH = bankLaw ? Math.max(s.ltv.housing * s.ltv.value, mortgageBal) : s.ltv.housing * s.ltv.value;
    C.set("ltv_h", { max: (capH - mortgageBal) / U });
    C.set("ltv_all", { max: (s.ltv.withAp * s.ltv.value - mortgageBal) / U + (capH / s.ltv.value - s.ltv.withAp) * (s.ltv.value / U) });
  }

  // ---- columns
  const tracksOf = new Map<string, Column[]>();
  for (const c of use) {
    const v = `x:${c.key}`;
    const seg = c.segment === "housing" ? "h" : "ap";
    add(v, `fund_${seg}`, 1);
    add(v, "obj", s.wMonthly * c.monthly * U + costW * (1 - lam) * c.paid[0]);
    if (costW && lam > 0) for (const k of stressK) add(v, `wc${k}`, -c.paid[k]);
    if (s.budget !== null) add(v, "budget", c.monthly * U);
    if (s.floor != null) add(v, "floor", c.monthly * U);
    if (s.paidCap != null) add(v, "paid0", c.paid[0]);
    if (s.pvCap != null) add(v, "pv0", c.pv ?? 0);
    if (s.typedPaidCap != null) add(v, "tpaid", c.typedPaid);
    if (s.typedInterestCap != null) add(v, "tint", c.typedInterest);
    if (s.typedCostCap != null) add(v, "tcost", c.typedPaid - 1);
    if (s.ptiCap !== null) add(v, "pti", c.monthly * U);
    if (s.peakCap !== null) for (const k of stressK) EARLY.forEach((_, i) => pkRows.has(`pk${k}_${i}`) && add(v, `pk${k}_${i}`, c.early[k][i] * U));
    if (aheadCap) aheadCap.forEach((_, j) => add(v, `ah${j}`, c.ahead?.[j] ?? 0));
    if (rise) {
      for (const k of stressK) add(v, `rp${k}`, -c.peak[k] * U);
      if (s.wRise) add(v, "obj", -s.wRise * c.monthly * U);
      if (s.riseCap != null) add(v, "rise", -c.monthly * U);
      if (s.riseShare != null) add(v, "riseS", -(1 + s.riseShare) * c.monthly * U);
    }
    if (bankLaw) {
      add(v, `fix_${seg}`, (FIXED[c.track] ? 1 : 0) - FIXED_MIN);
      add(v, "fix_all", (FIXED[c.track] ? 1 : 0) - phi);
    }
    if (seg === "h") add(v, "link_h", (LINKED[c.track] ? 1 : 0) - LINKED_MAX);
    add(v, "link_all", (LINKED[c.track] ? 1 : 0) - psi);
    if (s.ltv) {
      if (seg === "h") add(v, "ltv_h", 1);
      add(v, "ltv_all", 1);
    }
    const tk = `${c.track}|${seg}`;
    if (!tracksOf.has(tk)) tracksOf.set(tk, []);
    tracksOf.get(tk)!.push(c);
  }
  // ---- tranche structure: open binaries, minimum size, count, share cap
  const bigM = (sum(debts.map((d) => d.balance + d.fee)) + cureAll + s.setupHousing + s.setupAp) / U + 1;
  // The bank all-purpose minimum (Spec.apMin) on the segment's only tranche:
  // its own minimum row relieved by MIN − floor instead of MIN when it is the
  // only one, so a lone tranche is at least `floor` and two are each MIN. Not
  // held while the segment carries money the mix must lend (a forced
  // all-purpose debt, or a כל מטרה mortgage row that moves with its lender) or
  // cures arrears (override only). A separate row on the segment's total made
  // yalps read feasible relaxations as infeasible (r04 קיצור שנים at 144 months).
  const apExempt = (d: SolverDebt) => d.segment === "allPurpose" && (!!d.forced || (s.moveWhole && d.group === "mortgage"));
  const apFloor = s.apMin && cureAll === 0 && !movable.some(apExempt) ? Math.min(s.apMin, MIN_TRANCHE) : 0;
  for (const seg of ["h", "ap"] as const) {
    const maxTr = seg === "h" ? MAX_HOUSING_TRANCHES : MAX_AP_TRANCHES;
    const single = `single_${seg}`;
    C.set(`count_${seg}`, { max: maxTr });
    add(single, `count_${seg}`, maxTr - 1);
    bins.push(single);
    for (const [tk, list] of Array.from(tracksOf.entries())) {
      if (!tk.endsWith(`|${seg}`)) continue;
      const o = `o:${tk}`;
      bins.push(o);
      add(o, `count_${seg}`, 1);
      // The board's read-out rounds every row to the shekel: an opened tranche
      // may add up to ½ to the payment the LP computed. Kept rows are already
      // whole shekels, so keeping the master stays feasible at the budget itself.
      if (s.budget !== null) add(o, "budget", ROUNDING);
      if (s.ptiCap !== null) add(o, "pti", ROUNDING);
      C.set(`up:${tk}`, { max: 0 });
      C.set(`lo:${tk}`, { min: 0 });
      add(o, `up:${tk}`, -bigM);
      add(o, `lo:${tk}`, -MIN_TRANCHE / U);
      add(single, `lo:${tk}`, (MIN_TRANCHE - (seg === "ap" ? apFloor : 0)) / U);
      for (const c of list) {
        add(`x:${c.key}`, `up:${tk}`, 1);
        add(`x:${c.key}`, `lo:${tk}`, 1);
      }
      // One term per track: a binary per (track, term), at most one of them, only if the track is open.
      if (oneTerm && list.length > 1) {
        C.set(`bt:${tk}`, { max: 0 });
        add(o, `bt:${tk}`, -1);
        for (const c of list) {
          const b = `b:${c.key}`;
          bins.push(b);
          add(b, `bt:${tk}`, 1);
          C.set(`bx:${c.key}`, { max: 0 });
          add(`x:${c.key}`, `bx:${c.key}`, 1);
          add(b, `bx:${c.key}`, -bigM);
        }
      }
      if (s.shareCap && seg === "h" && !TRACK_SHARE_EXEMPT.includes(list[0].track)) {
        C.set(`share:${tk}`, { max: ((1 - TRACK_SHARE_MAX) * 2 * MIN_TRANCHE) / U });
        for (const c of use) if (c.segment === "housing") add(`x:${c.key}`, `share:${tk}`, (c.track === list[0].track ? 1 : 0) - TRACK_SHARE_MAX);
      }
    }
  }
  // ---- setup indicators (binary: a file is opened or it is not)
  if (needH) {
    add("s_h", "fund_h", -s.setupHousing / U);
    bins.push("s_h");
  }
  if (needAp) {
    add("s_ap", "fund_ap", -s.setupAp / U);
    bins.push("s_ap");
    // A debt that cannot move (kept by the structure or its lock) and must be brought
    // current opens the all-purpose file whatever else happens.
    if (sum(debts.filter((d) => kept(d)).map(cureOf)) > 0) {
      C.set("cu:kept", { min: 1 });
      add("s_ap", "cu:kept", 1);
    }
    if (s.ltv) add("s_ap", "ltv_all", ((bankLaw ? Math.max(s.ltv.housing * s.ltv.value, mortgageBal) : s.ltv.housing * s.ltv.value) / s.ltv.value - s.ltv.withAp) * (s.ltv.value / U));
  }
  // Both files open: the appraisal is paid once. w = s_h · s_ap, pinned exactly
  // (w ≤ s_h, w ≤ s_ap, w ≥ s_h + s_ap − 1) so no objective can borrow it anyway.
  const shared = needH && needAp ? s.setupApShared ?? 0 : 0;
  if (shared > 0) {
    add("w_both", "fund_ap", shared / U);
    C.set("wb_h", { max: 0 });
    add("w_both", "wb_h", 1);
    add("s_h", "wb_h", -1);
    C.set("wb_ap", { max: 0 });
    add("w_both", "wb_ap", 1);
    add("s_ap", "wb_ap", -1);
    C.set("wb_lo", { min: -1 });
    add("w_both", "wb_lo", 1);
    add("s_h", "wb_lo", -1);
    add("s_ap", "wb_lo", -1);
    // The housing file opens only for housing debt (it may not be opened for the appraisal's credit).
    C.set("shn", { max: 0 });
    add("s_h", "shn", 1);
  }
  // The cost share (rules.ts REFI_COST_MAX) as a row: Σ z·(fee − c·(B + fee)) + (1 − c)·setup ≤ 0.
  const cs = s.costShareMax ?? null;
  if (cs !== null) {
    C.set("cshare", { max: 0 });
    if (needH) add("s_h", "cshare", ((1 - cs) * s.setupHousing) / U);
    if (needAp) add("s_ap", "cshare", ((1 - cs) * s.setupAp) / U);
    if (shared > 0) add("w_both", "cshare", -((1 - cs) * shared) / U);
  }
  // ---- debts. A decision that is held (fixZ) or forced (the deadline) is not a
  // variable at all: its column is folded into the constraint bounds.
  const shift = new Map<string, number>();
  const zConst = (id: string): 0 | 1 | null => {
    const d = debts.find((x) => x.id === id)!;
    if (d.forced) return 1;
    if (s.finish !== null && d.months > s.finish) return 1;
    if (s.fixZ) return s.fixZ.includes(id) ? 1 : 0;
    return null;
  };
  let fixedObj = 0;
  const lenderRef = new Map<string, string>();
  const forcedH = { any: false };
  const forcedAp = { any: false };
  for (const d of movable) {
    const k = zConst(d.id);
    const z = k === null ? `z:${d.id}` : `#const`;
    const seg = d.segment === "housing" ? "h" : "ap";
    const put = (row: string, a: number) => {
      if (!a) return;
      if (k === null) add(z, row, a);
      else if (k === 1) shift.set(row, (shift.get(row) ?? 0) + a);
    };
    if (k === null) bins.push(z);
    if (k === 1) (seg === "h" ? forcedH : forcedAp).any = true;
    put(`fund_${seg}`, -(d.balance + d.fee) / U);
    const o = -(s.wMonthly * d.monthly + costW * (1 - lam) * (d.paid[0] / U));
    if (k === null) add(z, "obj", o);
    else if (k === 1) fixedObj += o;
    if (costW && lam > 0) for (const kk of stressK) put(`wc${kk}`, d.paid[kk] / U);
    if (s.budget !== null) put("budget", -d.monthly);
    if (s.floor != null) put("floor", -d.monthly);
    if (s.paidCap != null) put("paid0", -d.paid[0] / U);
    if (s.pvCap != null) put("pv0", -(d.pv ?? 0) / U);
    if (s.typedPaidCap != null) put("tpaid", -d.typedPaid / U);
    if (s.typedInterestCap != null) put("tint", -d.typedInterest / U);
    if (s.typedCostCap != null) put("tcost", -(d.typedPaid - d.balance) / U);
    if (s.ptiCap !== null && d.group === "mortgage") put("pti", -d.monthly);
    if (s.peakCap !== null) for (const kk of stressK) EARLY.forEach((_, i) => pkRows.has(`pk${kk}_${i}`) && put(`pk${kk}_${i}`, -d.early[kk][i]));
    if (aheadCap) aheadCap.forEach((_, j) => put(`ah${j}`, -(d.ahead?.[j] ?? 0) / U));
    if (rise) {
      for (const kk of stressK) put(`rp${kk}`, d.peak[kk]);
      if (s.wRise) {
        if (k === null) add(z, "obj", s.wRise * d.monthly);
        else if (k === 1) fixedObj += s.wRise * d.monthly;
      }
      if (s.riseCap != null) put("rise", d.monthly);
      if (s.riseShare != null) put("riseS", (1 + s.riseShare) * d.monthly);
    }
    if (cs !== null) put("cshare", (d.fee - cs * (d.balance + d.fee)) / U);
    if (shared > 0 && d.segment === "housing") put("shn", -1);
    // Cleared, a debt in arrears needs no cure; kept, it needs its cure (fund_ap above, and an all-purpose file).
    const cure = cureOf(d);
    if (cure > 0) {
      C.set(`cu:${d.id}`, { min: 1 });
      add("s_ap", `cu:${d.id}`, 1);
      if (k === null) {
        add(z, "fund_ap", cure / U);
        add(z, `cu:${d.id}`, 1);
      } else if (k === 1) {
        shift.set("fund_ap", (shift.get("fund_ap") ?? 0) + cure / U);
        shift.set(`cu:${d.id}`, (shift.get(`cu:${d.id}`) ?? 0) + 1);
      }
    }
    if (d.group === "mortgage") {
      if (bankLaw) put("fix_all", -((d.fixed ? 1 : 0) - phi) * (d.balance / U));
      // Refinanced, the debt's own linked share leaves the kept side — the same
      // sign as fix_all above (it was added, which counted a refinanced linked
      // debt twice and an unlinked one as negative).
      put("link_all", -((d.linked ? 1 : 0) - psi) * (d.balance / U));
      if (s.ltv) {
        // Refinanced, its balance leaves the kept side (and returns as x).
        put("ltv_h", -d.balance / U);
        put("ltv_all", -d.balance / U);
      }
    }
    // setup: one aggregated row per segment — Σ z ≤ n·s, s binary
    put(`su_${seg}`, 1);
    if (s.moveWhole && d.group === "mortgage" && k === null) {
      const ref = lenderRef.get(d.lender);
      if (!ref) lenderRef.set(d.lender, z);
      else {
        C.set(`mv:${d.id}`, { equal: 0 });
        add(z, `mv:${d.id}`, 1);
        add(ref, `mv:${d.id}`, -1);
      }
    }
  }
  const nH = movable.filter((d) => d.segment === "housing").length;
  const nAp = movable.filter((d) => d.segment === "allPurpose").length;
  if (needH) {
    C.set("su_h", { max: 0 });
    add("s_h", "su_h", -nH);
  }
  if (needAp) {
    C.set("su_ap", { max: 0 });
    add("s_ap", "su_ap", -nAp);
  }
  objConst += fixedObj;
  // Apply the folded constants: Σ a·x + const ⋚ b  →  Σ a·x ⋚ b − const.
  for (const [row, k] of Array.from(shift.entries())) {
    const c = C.get(row);
    if (!c) continue;
    C.set(row, {
      ...(c.min !== undefined ? { min: c.min - k } : {}),
      ...(c.max !== undefined ? { max: c.max - k } : {}),
      ...(c.equal !== undefined ? { equal: c.equal - k } : {}),
    });
  }
  // A kept debt that ends after the deadline makes the deadline impossible.
  if (s.finish !== null && debts.some((d) => kept(d) && d.months > s.finish!))
    return { ok: false, status: "infeasible", refinance: [], amounts: {}, objective: NaN, setupHousing: 0, setupAp: 0 };

  // Every binary bounded explicitly, so the LP relaxation (and the rounding
  // fallback that reads it) lives in [0, 1] like the integer problem does.
  const binList = bins.filter((b) => V.has(b));
  // (yalps bounds its binaries itself in the integer problem.)
  if (relaxed)
    for (const b of binList) {
      C.set(`ub:${b}`, { max: 1 });
      add(b, `ub:${b}`, 1);
    }
  const model: Model = { direction: "minimize", objective: "obj", constraints: C, variables: V, binaries: relaxed ? [] : binList };
  const sol = solve(model, { tolerance: 1e-7, maxIterations: cap, checkCycles: true });
  const incumbent = sol.status === "timedout" && Number.isFinite(sol.result);
  if (sol.status !== "optimal" && !incumbent)
    return { ok: false, status: sol.status, refinance: [], amounts: {}, objective: NaN, setupHousing: 0, setupAp: 0 };
  const val = new Map(sol.variables);
  const amounts: Record<string, number> = {};
  for (const c of use) {
    const x = (val.get(`x:${c.key}`) ?? 0) * U;
    if (x > 0.5) amounts[c.key] = x;
  }
  const zOf = (d: SolverDebt) => {
    const k = zConst(d.id);
    return k === null ? val.get(`z:${d.id}`) ?? 0 : k;
  };
  const refinance = movable.filter((d) => zOf(d) > 0.5).map((d) => d.id);
  const anyH = refinance.some((id) => debts.find((d) => d.id === id)!.segment === "housing");
  // An all-purpose file is opened for refinanced consumer debt, or to bring a kept debt current.
  const anyAp = refinance.some((id) => debts.find((d) => d.id === id)!.segment === "allPurpose") || debts.some((d) => !refinance.includes(d.id) && cureOf(d) > 0);
  return {
    ok: true,
    status: incumbent ? "incumbent" : relaxed ? "relaxed" : "optimal",
    zFrac: relaxed ? Object.fromEntries(movable.map((d) => [d.id, zOf(d)])) : undefined,
    refinance,
    amounts,
    objective: sol.result + objConst,
    setupHousing: anyH ? s.setupHousing : 0,
    setupAp: anyAp ? s.setupAp - (anyH ? shared : 0) : 0,
  };
}

const better = (a: Plan, b: Plan) => a.ok && (!b.ok || a.objective < b.objective - Math.max(1e-6, Math.abs(b.objective) * 1e-9));

/**
 * The full search. 1) The MILP over every term (node-capped). If it finds no
 * integer point, round the LP relaxation's debt decisions and solve with those
 * held. 2) One term per track (amount-weighted), 3) a coordinate walk over each
 * track's term (±1…3 years) with the debt decisions held, 4) a one-flip walk
 * over the debt decisions with the terms held, 5) a free re-solve on the best
 * terms; 3–5 repeat while anything improves, at most `rounds` times (a probe
 * that only reads the shape of a frontier needs fewer than a final answer).
 */
/** A starting point another goal reached: which debts moved and each track's term. */
export type Seed = { refinance: string[]; terms: Record<string, number> };

export function termsOf(plan: Plan, cols: Column[]): Record<string, number> {
  const byKey = new Map(cols.map((c) => [c.key, c]));
  const out: Record<string, number> = {};
  for (const k of Object.keys(plan.amounts)) {
    const c = byKey.get(k);
    if (c) out[`${c.track}|${c.segment}`] = c.years;
  }
  return out;
}

export function solveTerms(debtsIn: SolverDebt[], cols: Column[], s: Spec, seeds: Seed[] = [], startIn?: Plan, rounds = 6): Plan {
  const debts = canonical(debtsIn);
  // A start on columns outside this search's grid is no start (a מאוזן probe
  // solved on the whole grid handed to a box restricted to the anchors' terms:
  // fuzz seed 31 Z470 threw on it).
  const colKeys = new Set(cols.map((c) => c.key));
  const start = startIn?.ok && Object.keys(startIn.amounts).every((k) => colKeys.has(k)) ? startIn : undefined;
  // 1) The first solve on every other year of each track's grid (and its
  //    longest term) — the neighbourhood step below refines on the full grid.
  const grid = new Map<string, number[]>();
  for (const c of cols) {
    const f = `${c.track}|${c.segment}`;
    grid.set(f, [...(grid.get(f) ?? []), c.years]);
  }
  const coarse = cols.filter((c) => {
    const ys = grid.get(`${c.track}|${c.segment}`)!;
    const lo = Math.min(...ys);
    const hi = Math.max(...ys);
    return ys.length <= 8 || (c.years - lo) % 2 === 0 || c.years === hi;
  });
  // The first solve runs on a third of the node cap: when it has found its
  // point by then it is kept (and improved below); when not, the cheap starts
  // below are tried before any solve is given the full cap.
  let first = start?.ok ? start : solveOnce(debts, coarse, s, false, false, FIRST_CAP);
  // When the coarse MILP finds nothing, the cheap starts come first (the LP's
  // rounding, then the mix as it is) and the full-grid MILP last: its branch
  // and bound can spend the whole node cap without an integer point (r01
  // savings, 1.5s) where a held start is found in milliseconds.
  if (!first.ok) {
    const lp = solveOnce(debts, coarse, s, true);
    // No point of the relaxation on the whole grid: no mix exists, and the full
    // MILPs below would spend their node caps proving it (קיצור שנים under its
    // five-year guard: 80–230 ms per infeasible deadline on r01 with a profile).
    if (!lp.ok && lp.status === "infeasible" && solveOnce(debts, cols, s, true).status === "infeasible") return { ...lp, ok: false };
    const fr = lp.ok ? lp.zFrac ?? {} : {};
    for (const cut of lp.ok ? [0.5, 0.25, 0.75, 0.05] : []) {
      const fixZ = Object.keys(fr).filter((id) => fr[id] >= cut);
      const p = solveOnce(debts, coarse, { ...s, fixZ });
      if (p.ok) {
        first = p;
        break;
      }
    }
    // Last, the mix as it is (only what must move moves): when it keeps every
    // rule it is an answer, and the search below improves on it. Without this a
    // branch and bound that hit its node cap with no incumbent read as "no mix
    // exists", and which way it fell depended on the order of the debts.
    if (!first.ok) {
      const keep = solveOnce(debts, coarse, { ...s, fixZ: [] });
      if (keep.ok) first = keep;
    }
    if (!first.ok) first = solveOnce(debts, coarse, s);
    if (!first.ok && coarse.length < cols.length) first = solveOnce(debts, cols, s);
    if (!first.ok) return first;
  }
  const byKey = new Map(cols.map((c) => [c.key, c]));
  const famKey = (c: Column) => `${c.track}|${c.segment}`;
  const families = Array.from(new Set(cols.map(famKey)));
  const yearsOf = new Map<string, number[]>();
  for (const f of families) yearsOf.set(f, Array.from(new Set(cols.filter((c) => famKey(c) === f).map((c) => c.years))).sort((x, y) => x - y));
  const held = (z: string[]) => ({ ...s, fixZ: z });
  const movable = debts.filter((d) => (!d.lock || !!s.unlock?.includes(d.id)) && !s.hold?.includes(d.id) && (d.group === "mortgage" ? !s.keepMortgage : s.loansAllowed));
  // Debts that move together: a lender's whole mortgage when moving banks.
  const groups: string[][] = [];
  const seen = new Set<string>();
  for (const d of movable) {
    if (seen.has(d.id)) continue;
    const g = s.moveWhole && d.group === "mortgage" ? movable.filter((x) => x.group === "mortgage" && x.lender === d.lender).map((x) => x.id) : [d.id];
    g.forEach((id) => seen.add(id));
    groups.push(g);
  }
  const termsIn = (p: Plan) => {
    const t = new Map<string, Set<number>>();
    for (const k of Object.keys(p.amounts)) {
      const c = byKey.get(k)!;
      const f = famKey(c);
      if (!t.has(f)) t.set(f, new Set());
      t.get(f)!.add(c.years);
    }
    return t;
  };
  /**
   * The neighbourhood: for a track in use, its terms ±3 grid positions; for a
   * track not in use, a spread of its grid (every fifth position, both ends)
   * AND the terms around the mix's own (every term in use, ±3) — so a track can
   * enter the mix where it fits beside the others (r07: a 5-year prime beside an
   * 8-year קל"צ, which the spread 4, 9, 14… never offered). Solved exactly with
   * one binary per term.
   */
  const neighbourhood = (p: Plan) => {
    const used = termsIn(p);
    const mixYears = new Set<number>();
    for (const ys of Array.from(used.values())) for (const y of Array.from(ys)) for (let k = -3; k <= 3; k++) mixYears.add(y + k);
    const keep = new Set<string>();
    for (const f of families) {
      const ys = yearsOf.get(f)!;
      const pickIdx = new Set<number>();
      if (used.has(f)) for (const y of Array.from(used.get(f)!)) for (let k = -3; k <= 3; k++) pickIdx.add(ys.indexOf(y) + k);
      else {
        for (let i = 0; i < ys.length; i += 5) pickIdx.add(i);
        pickIdx.add(ys.length - 1);
        ys.forEach((y, i) => mixYears.has(y) && pickIdx.add(i));
      }
      for (const i of Array.from(pickIdx)) if (i >= 0 && i < ys.length) keep.add(`${f}|${ys[i]}`);
    }
    return cols.filter((c) => keep.has(`${famKey(c)}|${c.years}`));
  };
  const single = (p: Plan) => Array.from(termsIn(p).values()).every((v) => v.size === 1);
  const fixedTerms = (p: Plan) => {
    const t = termsIn(p);
    return cols.filter((c) => t.get(famKey(c))?.has(c.years));
  };

  // 2) the neighbourhood of the first answer, decisions held, one term per track
  // Refinement solves (one binary per term) run on the opening cap: they start
  // from an answer, and the full cap on a wide neighbourhood cost 0.6–1.7s each
  // for nothing better (corpus Z174, 5 debts, 5.5s).
  let best = solveOnce(debts, neighbourhood(first), held(first.refinance), false, true, FIRST_CAP);
  if (!best.ok) best = solveOnce(debts, neighbourhood(first), s, false, true, FIRST_CAP);
  if (start?.ok && single(start) && better(start, best)) best = start;
  if (!best.ok) return { ...first, ok: false, status: "terms" };
  // Other goals' answers as starting points: B&B is node-capped, so a good
  // incumbent from a neighbouring goal can beat what the cap allowed here.
  for (const seed of seeds) {
    const keep = new Set(Object.entries(seed.terms).map(([f, y]) => `${f}|${y}`));
    const sc = cols.filter((c) => keep.has(`${famKey(c)}|${c.years}`));
    if (!sc.length) continue;
    const p = solveOnce(debts, sc, held(seed.refinance.filter((id) => movable.some((d) => d.id === id))));
    if (better(p, best)) best = p;
  }
  for (let outer = 0; outer < rounds; outer++) {
    let changed = false;
    // 3) one group of debt decisions at a time, terms held
    for (const g of groups) {
      const on = g.every((id) => best.refinance.includes(id));
      const z = on ? best.refinance.filter((x) => !g.includes(x)) : Array.from(new Set([...best.refinance, ...g]));
      const p = solveOnce(debts, fixedTerms(best), held(z));
      if (better(p, best)) {
        best = p;
        changed = true;
      }
    }
    // 4) every term move in the neighbourhood at once, decisions held
    const nb = solveOnce(debts, neighbourhood(best), held(best.refinance), false, true, FIRST_CAP);
    if (better(nb, best) && single(nb)) {
      best = nb;
      changed = true;
    }
    // 5) everything free on these terms
    const free = solveOnce(debts, fixedTerms(best), s);
    if (better(free, best)) {
      best = free;
      changed = true;
    }
    if (!changed) break;
  }
  return best;
}
