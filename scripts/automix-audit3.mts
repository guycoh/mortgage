// תמהיל אוטומטי — independent optimality audit (audit 3). Can the engine's offer be beaten under its own rules?
//
//   npx tsx --tsconfig tsconfig.json scripts/automix-audit3.mts [--only L04,r01] [--profile default|typical|both]
//       [--goals savings,payment,...] [--power] [--seed 3] [--out results.jsonl] [--quick]
//
// THE ENGINE IS AN ORACLE ONLY. buildAutoMix gives its answer. __test.prepare gives what a
// solve starts from and nothing it decides: the debts (fees, locks, segments, the cheap-keep
// list) and the priced columns of new money (the bank's quote per track, segment and whole-year
// term). keptRow / trancheRow write board rows. Every candidate is priced row by row with the
// board's own calculator (priceLoan, typedRow, scheduleIn in the five economies). NO solve
// function of solve.ts or index.ts is called: the continuous part is this file's own dense
// two-phase simplex (Bland's rule after degenerate stalls) with cutting planes for the guard,
// the break-even and the peak rows; the debts and the tranche structure are searched on top of
// it (every subset when there are few debts, a seeded local search when there are many; every
// track set; a line search over every term of every track).
//
// Every candidate that is reported is rebuilt as board rows with ₪1,000 tranches, re-priced
// exactly and re-tested against the laws the verifier (scripts/automix-verify.mts) and the
// engine's own gates (index.ts judge/checksOf) hold for that goal. Letters are L01…, reports
// r01…; nothing else about a client is printed.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { household, FIXTURE_SETS } from "./automix-fixtures.mts";
import { buildAutoMix, DEFAULT_PROFILE, keptRow, __test, type AutoMixInput, type AutoMixResult, type GoalId, type Proposal } from "../app/aa105test/lib/automix";
import { ECONOMIES, scheduleIn, typedRow, pvOf } from "../app/aa105test/lib/automix/econ";
import {
  MATERIAL,
  MIN_TRANCHE,
  FIXED_MIN,
  LINKED_MAX,
  TRACK_SHARE_MAX,
  TRACK_SHARE_EXEMPT,
  LTV_MAX,
  PTI_MAX,
  AP_LTV,
  AP_LTV_RELIEF,
  AP_RELIEF_CAP,
  YEARS_STRETCH,
  REFI_COST_MAX,
  SLIVER_SHARE,
  BREAK_EVEN_MAX,
  STABLE_PRICE,
  MIN_YEARS,
  MAX_HOUSING_TRANCHES,
  MAX_AP_TRANCHES,
} from "../app/aa105test/lib/automix/rules";
import { NONBANK_LTV } from "../app/aa105test/lib/automix/tiers";
import { priceLoan } from "../app/aa102test/lib/price";
import { owedOnly, type ImportedLoan } from "../app/aa102test/lib/credit";
import { parseBankStatement, detectBank } from "../lib/bank-parser/index";
import { bankStatementToLoans } from "../lib/bank-parser/to-loans";
import { latestCurve } from "../app/aa107test/lib/market-boi";
import type { MarketSnapshot, TrackKey } from "../app/aa107test/lib/market";
import type { Forecast } from "../app/aa102test/lib/forecast";
import snapshotJson from "../app/aa107test/lib/market-snapshot.json" with { type: "json" };
import { solve as yalps } from "yalps";

/* ------------------------------------------------------------------ args */

const argv = process.argv.slice(2);
const arg = (f: string) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : null);
const ONLY = arg("--only") ? new Set(arg("--only")!.split(",")) : null;
const PROFILES = (arg("--profile") ?? "both") === "both" ? ["default", "typical"] : [arg("--profile")!];
const GOALS = (arg("--goals")?.split(",") ?? ["payment", "years", "savings", "balanced", "stable", "consolidate"]) as GoalId[];
const POWER = argv.includes("--power");
const QUICK = argv.includes("--quick");
const SEED = Number(arg("--seed") ?? 3);
const OUT = arg("--out");
const market = snapshotJson as unknown as MarketSnapshot;
const REPO = process.cwd();
const ART = path.resolve(REPO, "../_artifacts/automix-round6");

/** mulberry32 — the search's only randomness, seeded. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ----------------------------------------------------------- the corpus */

// The BoI curve, pinned for the audit (the live one moves): fetched once, then read.
const CURVE = path.join(ART, "audit3-curve.json");
let forecast: Forecast;
if (fs.existsSync(CURVE)) forecast = JSON.parse(fs.readFileSync(CURVE, "utf8"));
else {
  forecast = await latestCurve();
  fs.mkdirSync(ART, { recursive: true });
  fs.writeFileSync(CURVE, JSON.stringify(forecast));
}

type Case = { id: string; master: ImportedLoan[]; analysis: any };
const cases: Case[] = [];
{
  const LETTERS = path.resolve(REPO, "../Bank-Templates");
  const require = createRequire(path.join(REPO, "package.json"));
  const pdfjs: any = await import(pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href);
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")).href;
  } catch {}
  const warn = console.warn;
  console.warn = () => {};
  let n = 0;
  for (const file of fs.readdirSync(LETTERS).filter((f) => /\.pdf$/i.test(f)).sort()) {
    const id = `L${String(++n).padStart(2, "0")}`;
    if (ONLY && !ONLY.has(id)) continue;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path.join(LETTERS, file))), useSystemFonts: true, verbosity: 0 }).promise;
    const pages: any[] = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const tc = await (await doc.getPage(p)).getTextContent();
      pages.push({ page: p, items: (tc.items as any[]).filter((i) => i.str).map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width })) });
    }
    if (!pages.some((p) => p.items.some((i: any) => i.str.trim())) || !detectBank(pages)) continue;
    const master = bankStatementToLoans(parseBankStatement(pages), "mix", file).loans;
    if (master.length) cases.push({ id, master, analysis: null });
  }
  for (const s of FIXTURE_SETS) {
    if (ONLY && !ONLY.has(s.id)) continue;
    const h = await household(s.id, s.files);
    cases.push({ id: s.id, master: h.master, analysis: h.analysis });
  }
  console.warn = warn;
}

/* ------------------------------------------------- the board's calculator */

type Seg = "housing" | "allPurpose";
const ECON_N = ECONOMIES.length;
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const fmt = (x: number) => Math.round(x).toLocaleString("en-US");
const AUTOMIX = "תמהיל אוטומטי";
const isFixedPath = (p: number) => p === 2 || p === 3;
const isLinkedPath = (p: number) => p === 3 || p === 5;
const TRACK_OF: Record<number, TrackKey> = { 1: "prime", 2: "klz", 3: "kz", 4: "mlz", 5: "mz" };
const FIXED_T = (t: TrackKey) => t === "klz" || t === "kz";
const LINKED_T = (t: TrackKey) => t === "kz" || t === "mz";
/** The guard's sample months (the solver's EARLY): every sixth month of five years, and month 60. */
const EARLY = [...Array.from({ length: 10 }, (_, i) => 1 + 6 * i), 60];

/** One board row, priced the three ways the engine reports it (typed read-out, forecast, stress). */
type RowEval = {
  amount: number;
  months: number;
  path: number;
  /** Counts on the property (329 Q&A 5.1 shares): a mortgage row, or new money of either segment. */
  onProperty: boolean;
  /** group !== "loan": the housing LTV and the PTI's mortgage side. */
  housingLtv: boolean;
  typedMonthly: number;
  typedPaid: number;
  typedInterest: number;
  /** [economy][month-1] regular payments (a balloon's last lump excluded). */
  reg: number[][];
  /** Base economy: payments, and payments with the lump (for totals). */
  paid: number[];
  /** Base economy: cumulative payments + closing balance, per month (the break-even position). */
  pay0: number[];
  bal0: number[];
  pv: number;
};

function evalRow(l: ImportedLoan, inflation: number, discount: number): RowEval {
  const amount = Number(l.amount) || 0;
  const months = Math.round(Number(l.months) || 0);
  const t = typedRow(l, inflation);
  const sch = Number(l.amortization_schedule_id) || 1;
  const lump = sch === 3 || sch === 4 ? months : 0;
  const reg: number[][] = [];
  const paid: number[] = [];
  let pay0: number[] = [];
  let bal0: number[] = [];
  for (const e of ECONOMIES) {
    const s = scheduleIn(l, forecast, e);
    paid.push(sum(s.pay));
    reg.push(lump ? s.pay.map((x, i) => (i + 1 === lump ? 0 : x)) : s.pay);
    if (e.id === "base") {
      pay0 = s.pay;
      bal0 = s.bal;
    }
  }
  let pv = 0;
  if (months > 0 && amount > 0) {
    const fr = priceLoan(l, { inflation, forecast });
    pv = pvOf(fr.schedule.map((x, i) => (i === 0 ? Math.round(t.monthly) : x.payment)), discount);
  }
  return {
    amount,
    months,
    path: Number(l.path_id),
    onProperty: l.group === "mortgage" || l.source_type === AUTOMIX,
    housingLtv: l.group !== "loan",
    typedMonthly: t.monthly,
    typedPaid: t.totalPaid,
    typedInterest: t.totalInterest,
    reg,
    paid,
    pay0,
    bal0,
    pv,
  };
}

/** A mix as the board and the engine read it: sums over owed rows, arrays out to the horizon H. */
type Mix = {
  monthly: number;
  typedPaid: number;
  priced: number;
  balance: number;
  months: number;
  paid: number[];
  /** [economy][month-1] regular payments (no balloon lumps) — the stress panel's peaks and the guard. */
  reg: number[][];
  /** Cumulative base payments + base balance per month (break-even). */
  cb0: number[];
  pv: number;
  propBal: number;
  propFixed: number;
  propLinked: number;
  housingBal: number;
  securedBal: number;
  ptiMonthly: number;
};

function emptyMix(H: number): Mix {
  return { monthly: 0, typedPaid: 0, priced: 0, balance: 0, months: 0, paid: ECONOMIES.map(() => 0), reg: ECONOMIES.map(() => new Array(H).fill(0)), cb0: new Array(H).fill(0), pv: 0, propBal: 0, propFixed: 0, propLinked: 0, housingBal: 0, securedBal: 0, ptiMonthly: 0 };
}
function copyMix(m: Mix): Mix {
  return { ...m, paid: m.paid.slice(), reg: m.reg.map((r) => r.slice()), cb0: m.cb0.slice() };
}
/** m += row (in place). */
function addRow(m: Mix, e: RowEval) {
  const H = m.cb0.length;
  m.balance += Math.round(e.amount);
  m.monthly += e.typedMonthly;
  m.typedPaid += e.typedPaid;
  for (let k = 0; k < ECON_N; k++) {
    m.paid[k] += e.paid[k];
    const r = e.reg[k];
    const acc = m.reg[k];
    for (let i = 0; i < r.length && i < H; i++) acc[i] += r[i];
  }
  let cum = 0;
  for (let i = 0; i < H; i++) {
    cum += e.pay0[i] ?? 0;
    m.cb0[i] += cum + (e.bal0[i] ?? 0);
  }
  if (e.months > 0 && e.amount > 0) {
    m.priced += e.amount;
    m.months = Math.max(m.months, e.months);
    m.pv += e.pv;
  }
  if (e.amount > 0 && e.onProperty) {
    m.propBal += e.amount;
    if (isFixedPath(e.path)) m.propFixed += e.amount;
    if (isLinkedPath(e.path)) m.propLinked += e.amount;
  }
  if (e.housingLtv) m.housingBal += e.amount;
  if (e.housingLtv || e.onProperty) {
    m.securedBal += e.amount;
    m.ptiMonthly += e.typedMonthly;
  }
}
function mixOf(evals: RowEval[], H: number): Mix {
  const m = emptyMix(H);
  for (const e of evals) addRow(m, e);
  return m;
}

const fOf = (m: Mix) => m.paid[0];
const worstOf = (m: Mix) => Math.max(...m.paid.slice(1));
const Jof = (m: Mix, lam: number) => (1 - lam) * m.paid[0] + lam * Math.max(...m.paid);
/** Highest regular payment over the whole life, per economy, then the worst of them (the stress panel). */
const lifePeak = (m: Mix) => Math.max(...m.reg.map((r) => Math.max(0, ...r)));
/** The guard's reading: month one as the read-out shows it, then the economy's schedule, at `months`. */
function guardPeaks(m: Mix, months: number[]): number[] {
  return ECONOMIES.map((_, k) => Math.max(...months.map((mo) => (mo === 1 ? m.monthly : m.reg[k][mo - 1] ?? 0))));
}

/** Break-even (index.ts breakEven, the same definition on the same arrays): the first month from which the client stays ahead. */
function breakEven(todayCb: number[], prop: Mix, cost: number): number | null {
  if (cost <= 0) return 0;
  let hit: number | null = null;
  for (let m = 0; m < prop.cb0.length; m++) {
    const d = (todayCb[m] ?? todayCb[todayCb.length - 1]) - prop.cb0[m];
    if (d >= 0 && hit === null) hit = m + 1;
    if (d < 0) hit = null;
  }
  return hit === 1 ? 0 : hit;
}

/* -------------------------------------------------- a dense simplex */

/**
 * minimize c·x subject to lo_r ≤ a_r·x ≤ hi_r for every row and lb ≤ x ≤ ub. Two-phase,
 * Dantzig's rule, Bland's rule after a run of degenerate pivots (it cannot cycle).
 */
type LpRow = { a: number[]; lo?: number; hi?: number };
type LpOut = { ok: boolean; x: number[]; obj: number; status: string };
const LPSTAT = { n: 0, ms: 0, rounds: 0, calls: 0, rowsMax: 0, fallback: 0 };
function lp(c: number[], rows: LpRow[], lb: number[], ub: number[]): LpOut {
  const t0 = performance.now();
  try {
    const out = lpInner(c, rows, lb, ub);
    if (out.ok && lpFeasible(rows, out.x, lb, ub)) return out;
    // Unsure (an answer outside its own rows, or a failure that is not a proved infeasibility): ask yalps.
    if (out.ok || out.status !== "infeasible") {
      LPSTAT.fallback++;
      const y = lpYalps(c, rows, lb, ub);
      if (y.ok && lpFeasible(rows, y.x, lb, ub)) return y;
      return { ok: false, x: [], obj: NaN, status: `unsure (${out.status}; ${y.status})` };
    }
    return out;
  } finally {
    LPSTAT.n++;
    LPSTAT.ms += performance.now() - t0;
    LPSTAT.rowsMax = Math.max(LPSTAT.rowsMax, rows.length);
  }
}
function lpInner(c: number[], rows: LpRow[], lb: number[], ub: number[]): LpOut {
  const n = c.length;
  // Standard rows: a·y (+/-) s = b with y = x − lb ≥ 0.
  type SR = { a: number[]; b: number; kind: "le" | "ge" | "eq" };
  const srs: SR[] = [];
  const shiftOf = (a: number[]) => {
    let s = 0;
    for (let j = 0; j < n; j++) s += a[j] * lb[j];
    return s;
  };
  for (const r of rows) {
    const s = shiftOf(r.a);
    if (r.lo !== undefined && r.hi !== undefined && Math.abs(r.lo - r.hi) <= 1e-12 * Math.max(1, Math.abs(r.hi))) srs.push({ a: r.a, b: r.hi - s, kind: "eq" });
    else {
      if (r.hi !== undefined) srs.push({ a: r.a, b: r.hi - s, kind: "le" });
      if (r.lo !== undefined) srs.push({ a: r.a, b: r.lo - s, kind: "ge" });
    }
  }
  for (let j = 0; j < n; j++)
    if (Number.isFinite(ub[j])) {
      const a = new Array(n).fill(0);
      a[j] = 1;
      srs.push({ a, b: ub[j] - lb[j], kind: "le" });
    }
  const m = srs.length;
  // Columns: n structural, one slack per le/ge row, artificials where needed.
  let nS = 0;
  const slackOf: number[] = [];
  for (const r of srs) slackOf.push(r.kind === "eq" ? -1 : n + nS++);
  const artOf: number[] = [];
  let nA = 0;
  const sign: number[] = [];
  for (let i = 0; i < m; i++) {
    const r = srs[i];
    let sg = r.b < 0 ? -1 : 1;
    sign.push(sg);
    // le with b ≥ 0: slack is basic. ge with b < 0 (flipped to le): slack basic. Otherwise artificial.
    const slackBasic = (r.kind === "le" && sg === 1) || (r.kind === "ge" && sg === -1);
    artOf.push(slackBasic ? -1 : n + nS + nA++);
  }
  const W = n + nS + nA;
  const T: Float64Array[] = [];
  const basis: number[] = [];
  for (let i = 0; i < m; i++) {
    const r = srs[i];
    const row = new Float64Array(W + 1);
    const sg = sign[i];
    for (let j = 0; j < n; j++) row[j] = sg * r.a[j];
    if (slackOf[i] >= 0) row[slackOf[i]] = sg * (r.kind === "le" ? 1 : -1);
    if (artOf[i] >= 0) row[artOf[i]] = 1;
    row[W] = sg * r.b;
    T.push(row);
    basis.push(artOf[i] >= 0 ? artOf[i] : slackOf[i]);
  }
  const isArt = (j: number) => j >= n + nS;
  const run = (obj: Float64Array, allowed: (j: number) => boolean): string => {
    let degenerate = 0;
    for (let it = 0; it < 20000; it++) {
      const bland = degenerate > 50;
      let enter = -1;
      let best = -1e-9;
      for (let j = 0; j < W; j++) {
        if (!allowed(j)) continue;
        if (obj[j] < best) {
          enter = j;
          if (bland) break;
          best = obj[j];
        }
      }
      if (enter < 0) return "optimal";
      let leave = -1;
      let ratio = Infinity;
      for (let i = 0; i < m; i++) {
        const v = T[i][enter];
        if (v > 1e-11) {
          const q = T[i][W] / v;
          if (q < ratio - 1e-12 || (Math.abs(q - ratio) <= 1e-12 && leave >= 0 && basis[i] < basis[leave])) {
            ratio = q;
            leave = i;
          }
        }
      }
      if (leave < 0) return "unbounded";
      if (ratio < 1e-12) degenerate++;
      else degenerate = 0;
      const pr = T[leave];
      const pv = pr[enter];
      for (let j = 0; j <= W; j++) pr[j] /= pv;
      for (let i = 0; i < m; i++) {
        if (i === leave) continue;
        const f = T[i][enter];
        if (f === 0) continue;
        const ri = T[i];
        for (let j = 0; j <= W; j++) ri[j] -= f * pr[j];
      }
      const f = obj[enter];
      if (f !== 0) for (let j = 0; j <= W; j++) obj[j] -= f * pr[j];
      basis[leave] = enter;
    }
    return "iterations";
  };
  // Phase 1.
  if (nA > 0) {
    const o = new Float64Array(W + 1);
    for (let i = 0; i < m; i++)
      if (artOf[i] >= 0) for (let j = 0; j <= W; j++) if (j === W || !isArt(j)) o[j] -= T[i][j];
    const st = run(o, () => true);
    if (st !== "optimal") return { ok: false, x: [], obj: NaN, status: `phase1 ${st}` };
    const scale = Math.max(1, ...srs.map((r) => Math.abs(r.b)));
    if (-o[W] > 1e-7 * scale) return { ok: false, x: [], obj: NaN, status: "infeasible" };
    // Artificials out of the basis.
    for (let i = 0; i < m; i++) {
      if (!isArt(basis[i]) || Math.abs(T[i][W]) > 1e-7 * scale) continue;
      let piv = -1;
      let big = 1e-9;
      for (let j = 0; j < n + nS; j++) if (Math.abs(T[i][j]) > big) { piv = j; big = Math.abs(T[i][j]); }
      if (piv < 0) continue; // a redundant row: its artificial stays at 0 and is never allowed to enter
      const pr = T[i];
      const pv = pr[piv];
      for (let j = 0; j <= W; j++) pr[j] /= pv;
      for (let r = 0; r < m; r++) {
        if (r === i) continue;
        const f = T[r][piv];
        if (f === 0) continue;
        for (let j = 0; j <= W; j++) T[r][j] -= f * pr[j];
      }
      basis[i] = piv;
    }
  }
  // Phase 2.
  const o = new Float64Array(W + 1);
  for (let j = 0; j < n; j++) o[j] = c[j];
  for (let i = 0; i < m; i++) {
    const b = basis[i];
    const cb = b < n ? c[b] : 0;
    if (cb !== 0) for (let j = 0; j <= W; j++) o[j] -= cb * T[i][j];
  }
  const st = run(o, (j) => !isArt(j));
  if (st !== "optimal") return { ok: false, x: [], obj: NaN, status: st };
  const y = new Array(n).fill(0);
  for (let i = 0; i < m; i++) if (basis[i] < n) y[basis[i]] = T[i][W];
  const x = y.map((v, j) => v + lb[j]);
  let obj = 0;
  for (let j = 0; j < n; j++) obj += c[j] * x[j];
  return { ok: true, x, obj, status: "optimal" };
}

/** Is x within every row and bound (relative tolerance)? */
function lpFeasible(rows: LpRow[], x: number[], lb: number[], ub: number[]): boolean {
  for (let j = 0; j < x.length; j++) if (x[j] < lb[j] - 1e-6 * Math.max(1, Math.abs(lb[j])) || x[j] > ub[j] + 1e-6 * Math.max(1, Math.abs(ub[j]))) return false;
  for (const r of rows) {
    let a = 0;
    let mag = 0;
    for (let j = 0; j < x.length; j++) {
      a += r.a[j] * x[j];
      mag += Math.abs(r.a[j] * x[j]);
    }
    const tol = 1e-6 * Math.max(1, mag, Math.abs(r.lo ?? 0), Math.abs(r.hi ?? 0));
    if ((r.lo !== undefined && a < r.lo - tol) || (r.hi !== undefined && a > r.hi + tol)) return false;
  }
  return true;
}

/** The same LP through yalps (a generic LP library; no engine code), when the simplex above is numerically unsure. */
function lpYalps(c: number[], rows: LpRow[], lb: number[], ub: number[]): LpOut {
  const constraints = new Map<string, { min?: number; max?: number; equal?: number }>();
  const variables = new Map<string, Map<string, number>>();
  const n = c.length;
  for (let j = 0; j < n; j++) variables.set(`x${j}`, new Map([["obj", c[j]]]));
  rows.forEach((r, i) => {
    const k = `r${i}`;
    constraints.set(k, r.lo !== undefined && r.hi !== undefined && Math.abs(r.lo - r.hi) < 1e-12 ? { equal: r.lo } : { ...(r.lo !== undefined ? { min: r.lo } : {}), ...(r.hi !== undefined ? { max: r.hi } : {}) });
    for (let j = 0; j < n; j++) if (r.a[j]) variables.get(`x${j}`)!.set(k, r.a[j]);
  });
  for (let j = 0; j < n; j++) {
    const k = `b${j}`;
    constraints.set(k, { min: lb[j], ...(Number.isFinite(ub[j]) ? { max: ub[j] } : {}) });
    variables.get(`x${j}`)!.set(k, 1);
  }
  const sol = yalps({ direction: "minimize", objective: "obj", constraints, variables }, { tolerance: 1e-9, checkCycles: true, includeZeroVariables: true });
  if (sol.status !== "optimal") return { ok: false, x: [], obj: NaN, status: `yalps ${sol.status}` };
  const val = new Map(sol.variables);
  const x = Array.from({ length: n }, (_, j) => val.get(`x${j}`) ?? 0);
  let obj = 0;
  for (let j = 0; j < n; j++) obj += c[j] * x[j];
  return { ok: true, x, obj, status: "optimal" };
}

/* The simplex against yalps on random problems (--lptest): same feasibility verdict, same optimum. */
if (argv.includes("--lptest")) {
  const R = rng(SEED);
  let agree = 0, bad = 0;
  for (let t = 0; t < 3000; t++) {
    const n = 2 + Math.floor(R() * 12);
    const m = 1 + Math.floor(R() * 14);
    const c = Array.from({ length: n }, () => R() * 10 - 3);
    const rows: LpRow[] = [];
    rows.push({ a: Array.from({ length: n }, () => (R() < 0.7 ? 1 : 0)), lo: 50 + R() * 100, hi: 50 + R() * 100 });
    rows[0].hi = rows[0].lo;
    for (let i = 0; i < m; i++) {
      const a = Array.from({ length: n }, () => (R() < 0.6 ? R() * 4 - 1.5 : 0));
      const k = R();
      rows.push(k < 0.45 ? { a, hi: R() * 120 - 30 } : k < 0.9 ? { a, lo: R() * 80 - 40 } : { a, lo: -10, hi: 40 });
    }
    const lb = Array.from({ length: n }, () => (R() < 0.3 ? R() * 10 : 0));
    const ub = Array.from({ length: n }, () => (R() < 0.3 ? 20 + R() * 60 : Infinity));
    const a1 = lpInner(c, rows, lb, ub);
    const a2 = lpYalps(c, rows, lb, ub);
    const f1 = a1.ok && lpFeasible(rows, a1.x, lb, ub);
    const f2 = a2.ok && lpFeasible(rows, a2.x, lb, ub);
    if (f1 === f2 && (!f1 || Math.abs(a1.obj - a2.obj) <= 1e-6 * Math.max(1, Math.abs(a2.obj)))) agree++;
    else if (a2.status === "yalps unbounded" && !a1.ok) agree++;
    else {
      bad++;
      if (bad <= 5) console.log("disagree", t, a1.status, f1, a1.obj, "|", a2.status, f2, a2.obj);
    }
  }
  console.log(`lptest: ${agree} agree, ${bad} disagree`);
  process.exit(0);
}

/* -------------------------------------------------------- the oracle */

const __ = __test as any;
type Debt = {
  id: string;
  group: "mortgage" | "loan";
  segment: Seg;
  lender: string;
  balance: number;
  fee: number;
  months: number;
  lock: string | null;
  forced?: boolean;
  zak: boolean;
  row: ImportedLoan;
  label: string;
  rate: number;
  feeEstimated: boolean;
  priced: { pay: number[][]; paid: number[] };
};

/** New money per ₪1 in one column (track, segment, term), priced at the engine's quote. */
type Unit = {
  key: string;
  track: TrackKey;
  seg: Seg;
  years: number;
  price: { rate: number; anchor: number | null; margin: number | null };
  m: number;
  tp: number;
  paid: number[];
  pv: number;
  /** [economy][month-1] regular payments per ₪1 */
  reg: number[][];
  /** cumulative base payments + base balance per ₪1, per month, out to the horizon */
  cb0: number[];
  fixed: boolean;
  linked: boolean;
  fRate: number;
};

type World = {
  id: string;
  profile: string;
  input: AutoMixInput;
  res: AutoMixResult;
  variant: string;
  ctx: any;
  debts: Debt[];
  units: Unit[];
  unitByKey: Map<string, Unit>;
  extras: RowEval[];
  keptEval: Map<string, RowEval>;
  trCache: Map<string, RowEval>;
  today: Mix;
  H: number;
  R: { monthly: number; paid: number; typedPaid: number; months: number; worst: number; pvNow: number };
  neutral: number;
  todayCost: number;
  budget: number;
  reliefBudget: number;
  bankLaw: boolean;
  phi: number;
  psi: number;
  income: number | null;
  ltv: { value: number; housing: number; withAp: number } | null;
  setupH: number;
  setupAp: number;
  shared: number;
  hold: string[];
  moveWhole: boolean;
  keepMortgageVariant: boolean;
  loansAllowed: boolean;
  maxYears: number;
  apYears: number;
  age: number | null;
  /**
   * The bank all-purpose floor (rules.ts BANK_AP_MIN, or AP_GREEN.min for Mizrahi-Tefahot's own mortgage client
   * refinanced there: the engine's Spec.apMin), as solve.ts holds it: all-purpose money lent at all is at least
   * min(floor, MIN_TRANCHE). 0 for a non-bank lender, and where the segment carries money the mix must lend (a
   * forced all-purpose debt, a כל מטרה mortgage row that moves with the whole mortgage, arrears to cure).
   */
  apFloor: number;
};

/** Every structure the engine itself would price (variantsFor), with its debts, its columns and its reference. */
function worldsOf(id: string, profileName: string, input: AutoMixInput, res: AutoMixResult): World[] {
  const p0 = __.prepare(input, forecast, [], "bank");
  if ("fail" in p0) return [];
  const variants: string[] = __.variantsFor(p0.ctx);
  const out: World[] = [];
  let shared: any = null;
  for (const v of variants) {
    const p = v === "bank" ? p0 : __.prepare(input, forecast, [], v);
    if ("fail" in p) continue;
    if (!shared) shared = __.referenceOf(p.ctx); // without debt due now: today's read-out, nothing solved
    __.applyReference(p.ctx, shared);
    if (p.ctx.ref.due > 0 || p.ctx.blocked) continue;
    out.push(worldOf(id, profileName, input, res, v, p.ctx, p.consolidateOk));
  }
  return out;
}

function worldOf(id: string, profileName: string, input: AutoMixInput, res: AutoMixResult, variant: string, ctx: any, consolidateOk: boolean): World {
  const inf = input.inflation;
  const disc = input.discountRate;
  const debts: Debt[] = ctx.debts;
  const extras: RowEval[] = [];
  let n = 0;
  for (const l of owedOnly(input.master)) if (!debts.some((d) => d.id === l.id) && (Number(l.amount) || 0) > 0) extras.push(evalRow(keptRow(l, `x-${++n}`), inf, disc));
  const keptEval = new Map<string, RowEval>();
  for (const d of debts) keptEval.set(d.id, evalRow(keptRow(d.row, `k-${d.id}`), inf, disc));
  const todayEvals = owedOnly(input.master).map((l) => evalRow(l, inf, disc));
  const H = Math.max(...todayEvals.map((e) => e.months), ...Array.from(keptEval.values()).map((e) => e.months), ctx.maxYears * 12, 1);
  const today = mixOf(todayEvals, H);
  const units: Unit[] = [];
  for (const c of ctx.cols) {
    const P = 1_000_000;
    const row: ImportedLoan = __.trancheRow(c.track, c.years, c.segment, P, c.price, `u-${c.key}`);
    const ev = evalRow(row, inf, disc);
    const one = mixOf([ev], H);
    units.push({
      key: c.key,
      track: c.track,
      seg: c.segment,
      years: c.years,
      price: c.price,
      m: ev.typedMonthly / P,
      tp: ev.typedPaid / P,
      paid: ev.paid.map((x) => x / P),
      pv: ev.pv / P,
      reg: one.reg.map((r) => r.map((x) => x / P)),
      cb0: one.cb0.map((x) => x / P),
      fixed: FIXED_T(c.track),
      linked: LINKED_T(c.track),
      fRate: irr(ev.pay0, P) ?? 99,
    });
  }
  const pr = input.profile;
  const R = { monthly: ctx.ref.monthly, paid: ctx.ref.paid, typedPaid: ctx.ref.typedPaid, months: ctx.ref.months, worst: ctx.ref.worst, pvNow: today.pv };
  const fixedToday = today.propBal > 0 ? today.propFixed / today.propBal : 1;
  const linkedToday = today.propBal > 0 ? today.propLinked / today.propBal : 0;
  const given = pr.budget && pr.budget > 0 ? pr.budget : null;
  const budget = given ?? R.monthly;
  return {
    id,
    profile: profileName,
    input,
    res,
    variant,
    ctx,
    debts,
    units,
    unitByKey: new Map(units.map((u) => [u.key, u])),
    extras,
    keptEval,
    trCache: new Map(),
    today,
    H,
    R,
    neutral: MATERIAL.neutral(R.paid),
    todayCost: ctx.today.paid[0] - sum(debts.map((d) => d.balance)),
    budget,
    reliefBudget: given && given > R.monthly ? R.monthly : budget,
    bankLaw: ctx.pricing.tier.tier !== "nonbank",
    phi: Math.min(FIXED_MIN, fixedToday),
    psi: Math.max(LINKED_MAX, linkedToday),
    income: pr.income && pr.income > 0 ? pr.income : null,
    ltv: ctx.base.ltv ?? null,
    setupH: ctx.base.setupHousing,
    setupAp: ctx.base.setupAp,
    shared: ctx.base.setupApShared ?? 0,
    hold: ctx.base.hold ?? [],
    moveWhole: !!ctx.base.moveWhole,
    keepMortgageVariant: !!ctx.base.keepMortgage,
    loansAllowed: !!ctx.base.loansAllowed && consolidateOk,
    maxYears: ctx.maxYears,
    apYears: ctx.apYears,
    age: pr.age ?? null,
    apFloor: (() => {
      const apMin: number | null = ctx.base.apMin ?? null;
      const exempt = debts.some((d: any) => (d.cure ?? 0) > 0) || debts.some((d: any) => d.segment === "allPurpose" && (!!d.forced || (!!ctx.base.moveWhole && d.group === "mortgage" && !d.lock)));
      return apMin && !exempt ? Math.min(apMin, MIN_TRANCHE) : 0;
    })(),
  };
}

/** The forecast all-in rate of a payment stream on a principal (IRR), % a year. */
function irr(pay: number[], principal: number): number | null {
  if (!pay.length || principal <= 0) return null;
  let lo = -0.05 / 12,
    hi = 0.5 / 12;
  for (let k = 0; k < 80; k++) {
    const mid = (lo + hi) / 2;
    let pv = 0,
      df = 1;
    for (const x of pay) pv += x * (df /= 1 + mid);
    if (pv > principal) lo = mid;
    else hi = mid;
  }
  return (Math.pow(1 + (lo + hi) / 2, 12) - 1) * 100;
}

/* ------------------------------------------------ one refinance set */

/** What a refinance set leaves: the kept rows as a mix, and the new money each segment must lend (fees and setup in it). */
type Base = { S: Set<string>; kept: Mix; NH: number; NA: number; fees: number; setup: number };

function baseOf(w: World, S: Set<string>): Base {
  const kept = mixOf([...w.debts.filter((d) => !S.has(d.id)).map((d) => w.keptEval.get(d.id)!), ...w.extras], w.H);
  const moved = w.debts.filter((d) => S.has(d.id));
  const hasH = moved.some((d) => d.segment === "housing");
  const hasA = moved.some((d) => d.segment === "allPurpose");
  // index.ts rowsOf / solve.ts: a file per segment opened, the appraisal paid once when both open.
  const setupH = hasH ? w.setupH : 0;
  const setupAp = hasA ? w.setupAp - (hasH ? w.shared : 0) : 0;
  const NH = hasH ? Math.round(sum(moved.filter((d) => d.segment === "housing").map((d) => d.balance + d.fee)) + setupH) : 0;
  const NA = hasA ? Math.round(sum(moved.filter((d) => d.segment === "allPurpose").map((d) => d.balance + d.fee)) + setupAp) : 0;
  return { S, kept, NH, NA, fees: sum(moved.map((d) => d.fee)), setup: setupH + setupAp };
}

/** The constant tests of a refinance set: the cost share (REFI_COST_MAX), LTV and all-purpose LTV. */
function setConstantsOk(w: World, b: Base): boolean {
  if (b.NH + b.NA > 0 && b.fees + b.setup > REFI_COST_MAX * (b.NH + b.NA) + 0.5) return false;
  if (w.ltv && b.NH + b.NA > 0) {
    const V = w.ltv.value;
    if (w.bankLaw) {
      if (b.kept.housingBal + b.NH > LTV_MAX[w.input.profile.propertyType] * V + 1) return false;
      if (b.NA > 0 && b.kept.securedBal + b.NH + b.NA > Math.min(AP_LTV_RELIEF, AP_LTV + AP_RELIEF_CAP / V) * V + 1) return false;
    } else if (b.kept.securedBal + b.NH + b.NA > (w.variant === "secondLien" ? NONBANK_LTV.combined : NONBANK_LTV.first) * V + 1) return false;
  }
  return true;
}

/* ------------------------------------------------------------ goal rules */

type Rules = {
  goal: GoalId;
  ceiling: number | null;
  shareCap: boolean;
  guard: number[] | null;
  guardMonths: number[];
  typedCap: number | null;
  paidCap: number | null;
  pvCap: number | null;
  breakEven: boolean;
  finish: number | null;
  hold: string[];
  unlockZak: boolean;
  keepMortgage: boolean;
};
type GuardKind = "absolute" | "relative" | "none";

/** The reference's five-year peak per economy (index.ts refPeak5), for the relative guard. */
function refPeak5(w: World): number[] {
  return ECONOMIES.map((_, k) => Math.ceil(Math.max(w.R.monthly, ...w.today.reg[k].slice(1, 60)) * 100) / 100);
}
function guardCapsOf(w: World, kind: GuardKind, c: number): number[] | null {
  if (kind === "none") return null;
  if (kind === "absolute") return ECONOMIES.map(() => c);
  return refPeak5(w).map((p) => Math.max(c, p));
}

function rulesFor(w: World, goal: GoalId, p: Proposal | undefined, opts: { lift?: boolean; ceiling?: number; guardKind?: GuardKind; finish?: number | null } = {}): Rules | null {
  // "The mortgage untouched" is not this structure's goal where the whole mortgage moves (index.ts runGoals consolidateHere).
  if (goal === "consolidate" && (w.variant === "bankMove" || w.variant === "firstLien") && w.debts.some((d) => d.group === "mortgage")) return null;
  // מאוזן follows savings on the cheap debts: free only where savings itself moved one (index.ts solveHolding).
  const sav = w.res.proposals.find((x) => x.goal === "savings");
  // (Per structure: the engine's מאוזן is free only where that structure's own savings answer lifted; the
  // savings proposal shown is one structure's, so another structure is taken as held.)
  const savStructure = sav ? (!sav.structure || sav.structure === "bank" ? (sav.refinance === "move" ? "bankMove" : "bank") : sav.structure) : null;
  const savingsLifted = !!sav && savStructure === w.variant && sav.moves.some((m) => m.action !== "keep" && w.hold.includes(m.id));
  const hold = goal === "payment" || goal === "consolidate" ? [] : goal === "balanced" ? (savingsLifted || opts.lift ? [] : w.hold) : opts.lift ? [] : w.hold;
  const kind: GuardKind = opts.guardKind ?? (p?.guard?.kind as GuardKind | undefined) ?? "absolute";
  const ceiling = goal === "payment" ? null : goal === "years" ? opts.ceiling ?? p?.budget ?? w.budget : goal === "balanced" || goal === "consolidate" ? w.reliefBudget : w.budget;
  const guarded = goal === "payment" || goal === "balanced" || goal === "years";
  return {
    goal,
    ceiling,
    shareCap: goal !== "stable" && goal !== "consolidate",
    guard: guarded ? guardCapsOf(w, kind, goal === "years" ? ceiling! : w.R.monthly) : null,
    guardMonths: EARLY,
    typedCap: goal === "savings" || goal === "balanced" || goal === "years" ? w.R.typedPaid + w.neutral : null,
    paidCap: goal === "years" || goal === "balanced" ? w.R.paid + w.neutral : null,
    pvCap: goal === "savings" || goal === "balanced" ? w.R.pvNow + 1 : null,
    breakEven: goal === "savings" || goal === "balanced" || goal === "stable",
    finish: opts.finish ?? null,
    hold,
    unlockZak: goal === "years" || goal === "payment",
    keepMortgage: goal === "consolidate" || w.keepMortgageVariant,
  };
}

/** Debts every set must refinance: the structure's (a move, a first lien), and a deadline's (קיצור שנים). */
const mustMove = (w: World, r: Rules, d: Debt) => !!d.forced || (r.finish !== null && d.months > r.finish);
/** May this debt be refinanced under the goal's rules (locks, holds, the structure)? */
function debtMovable(w: World, r: Rules, d: Debt): boolean {
  if (d.forced) return true;
  if (d.lock && !(r.unlockZak && d.zak)) return false;
  if (r.hold.includes(d.id)) return false;
  if (d.group === "mortgage" && r.keepMortgage) return false;
  if (d.group === "loan" && !w.loansAllowed) return false;
  return true;
}
function setAllowed(w: World, r: Rules, S: Set<string>): boolean {
  for (const d of w.debts) {
    if (mustMove(w, r, d) && !S.has(d.id)) return false;
    if (S.has(d.id) && !debtMovable(w, r, d)) return false;
  }
  if (r.finish !== null && w.extras.some((e) => e.months > r.finish!)) return false;
  if (w.moveWhole) {
    const by = new Map<string, boolean[]>();
    for (const d of w.debts) if (d.group === "mortgage" && !d.lock) by.set(d.lender, [...(by.get(d.lender) ?? []), S.has(d.id)]);
    for (const xs of Array.from(by.values())) if (xs.some((x) => x !== xs[0])) return false;
  }
  return true;
}

/* ------------------------------------------------- exact candidates */

type Tr = { key: string; amount: number };
type Cand = { w: World; S: Set<string>; tr: Tr[]; mix: Mix; base: Base; fees: number; setup: number; newMoney: number };

function trEval(w: World, key: string, amount: number): RowEval {
  const k = `${key}:${amount}`;
  let e = w.trCache.get(k);
  if (!e) {
    const u = w.unitByKey.get(key)!;
    e = evalRow(__.trancheRow(u.track, u.years, u.seg, amount, u.price, "n"), w.input.inflation, w.input.discountRate);
    if (w.trCache.size > 200_000) w.trCache.clear();
    w.trCache.set(k, e);
  }
  return e;
}

function buildCand(w: World, b: Base, tr: Tr[]): Cand {
  const mix = copyMix(b.kept);
  for (const t of tr) addRow(mix, trEval(w, t.key, t.amount));
  return { w, S: b.S, tr, mix, base: b, fees: b.fees, setup: b.setup, newMoney: sum(tr.map((t) => t.amount)) };
}

/** A candidate as board rows (kept rows, rows the engine cannot use, guarantees, new tranches) — as index.ts rowsOf writes them. */
function rowsOfCand(w: World, c: Cand): ImportedLoan[] {
  const rows: ImportedLoan[] = [];
  let n = 0;
  for (const d of w.debts) if (!c.S.has(d.id)) rows.push(keptRow(d.row, `keep-${++n}`));
  for (const l of owedOnly(w.input.master)) if (!w.debts.some((d) => d.id === l.id) && (Number(l.amount) || 0) > 0) rows.push(keptRow(l, `keep-${++n}`));
  for (const l of w.input.master) if (l.is_guarantor) rows.push(keptRow(l, `keep-${++n}`));
  for (const t of c.tr) {
    const u = w.unitByKey.get(t.key)!;
    rows.push(__.trancheRow(u.track, u.years, u.seg, t.amount, u.price, `new-${++n}`));
  }
  return rows;
}

/** index.ts stabilityOf against today: worst-economy lifetime peak now and next, and the payments removed there. */
function stability(w: World, m: Mix) {
  const a = w.today.reg.map((r) => Math.max(0, ...r));
  const b = m.reg.map((r) => Math.max(0, ...r));
  const k = a.reduce((best, x, i) => (x > a[best] ? i : best), 0);
  const ra = w.today.reg[k];
  const rb = m.reg[k];
  let protection = 0;
  for (let i = 0; i < Math.max(ra.length, rb.length); i++) protection += Math.max(0, (ra[i] ?? 0) - (rb[i] ?? 0));
  return { now: Math.max(...a), next: Math.max(...b), protection };
}

/**
 * The laws and gates a candidate must hold for this goal — the verifier's per-proposal laws
 * (scripts/automix-verify.mts §1–7d) and the engine's own checks and gates (index.ts checksOf,
 * judge) — and, with `statusOk`, the goal's own "ok" test. [] = an offer the engine would file.
 */
function failures(c: Cand, r: Rules, statusOk = true): string[] {
  const w = c.w;
  const out: string[] = [];
  const m = c.mix;
  const R = w.R;
  for (const seg of ["housing", "allPurpose"] as Seg[]) {
    const ts = c.tr.filter((t) => w.unitByKey.get(t.key)!.seg === seg);
    if (!ts.length) continue;
    const N = sum(ts.map((t) => t.amount));
    const us = ts.map((t) => w.unitByKey.get(t.key)!);
    const fixed = sum(ts.filter((t) => w.unitByKey.get(t.key)!.fixed).map((t) => t.amount));
    if (w.bankLaw && fixed / N < FIXED_MIN - 0.005) out.push(`${seg} fixed ${(fixed / N).toFixed(3)}`);
    if (new Set(us.map((u) => u.track)).size !== us.length) out.push(`${seg} two tranches on one track`);
    if (ts.length > (seg === "housing" ? MAX_HOUSING_TRANCHES : MAX_AP_TRANCHES)) out.push(`${seg} count`);
    if (ts.length > 1 && ts.some((t) => t.amount < MIN_TRANCHE)) out.push(`${seg} tranche under ₪50k`);
    if (ts.length > 1 && ts.some((t) => t.amount < SLIVER_SHARE * N)) out.push(`${seg} sliver`);
    if (ts.filter((t) => t.amount % 1000 !== 0).length > 1) out.push(`${seg} rounding`);
    if (ts.some((t) => !(t.amount > 0) || !Number.isInteger(t.amount))) out.push(`${seg} amount`);
    if (seg === "housing") {
      const linked = sum(ts.filter((t) => w.unitByKey.get(t.key)!.linked).map((t) => t.amount));
      if (linked / N > LINKED_MAX + 0.005) out.push(`linked ${(linked / N).toFixed(3)}`);
      if (r.shareCap) for (const t of ts) if (!TRACK_SHARE_EXEMPT.includes(w.unitByKey.get(t.key)!.track) && t.amount > TRACK_SHARE_MAX * N + (1 - TRACK_SHARE_MAX) * 2 * MIN_TRANCHE + 1000) out.push("share cap");
    }
    for (const u of us) {
      if (u.years > (seg === "allPurpose" ? w.apYears : w.maxYears) || u.years < MIN_YEARS[u.track]) out.push(`term ${u.years}`);
      if (w.age && w.age + u.years > 80) out.push("age");
    }
  }
  const NH = sum(c.tr.filter((t) => w.unitByKey.get(t.key)!.seg === "housing").map((t) => t.amount));
  const NA = sum(c.tr.filter((t) => w.unitByKey.get(t.key)!.seg === "allPurpose").map((t) => t.amount));
  if (Math.abs(NH - c.base.NH) > 1 || Math.abs(NA - c.base.NA) > 1) out.push("money");
  if (NA > 0 && w.apFloor && NA < w.apFloor - 0.5) out.push(`AP floor ${Math.round(NA)}<${w.apFloor}`);
  if (c.tr.length && m.propBal > 0 && w.today.propBal > 0) {
    const fx = m.propFixed / m.propBal;
    const lk = m.propLinked / m.propBal;
    if (w.bankLaw && fx < w.phi - 0.005) out.push(`property fixed ${fx.toFixed(3)}`);
    if (lk > w.psi + 0.005) out.push(`property linked ${lk.toFixed(3)}`);
  }
  if (w.income && m.ptiMonthly > PTI_MAX * w.income + 0.5) out.push("PTI");
  if (w.ltv && c.tr.length) {
    const V = w.ltv.value;
    if (w.bankLaw) {
      // (₪0.5: the solver's own LTV rows are exact; the checks' 0.5% and the verifier's ₪1 are looser, and a
      // candidate that needs them is not one the engine could reach: r01+r02 typical, ₪1 over.)
      if (m.housingBal > Math.max(LTV_MAX[w.input.profile.propertyType] * V, w.today.housingBal) + 0.5) out.push("LTV");
      if (NA > 0 && m.securedBal > Math.min(AP_LTV_RELIEF, AP_LTV + AP_RELIEF_CAP / V) * V + 0.5) out.push("AP LTV");
    } else if (m.securedBal > (w.variant === "secondLien" ? NONBANK_LTV.combined : NONBANK_LTV.first) * V + 0.5) out.push("nonbank LTV");
  }
  if (r.ceiling !== null && m.monthly > r.ceiling + 0.5) out.push(`budget ${m.monthly}>${Math.round(r.ceiling)}`);
  if (r.guard && guardPeaks(m, r.guardMonths).some((p, k) => p > r.guard![k] + 1)) out.push("guard");
  if (r.finish !== null && m.months > r.finish) out.push("finish");
  if (c.newMoney > 0 && c.fees + c.setup > REFI_COST_MAX * c.newMoney + 0.5) out.push("cost share");
  const fP = fOf(m) - R.paid;
  const tP = m.typedPaid - R.typedPaid;
  if (r.typedCap !== null && m.typedPaid > r.typedCap) out.push("typed total");
  if (r.paidCap !== null && fOf(m) > r.paidCap) out.push("forecast total");
  if (r.breakEven && c.fees + c.setup > 0 && c.tr.length) {
    const be = breakEven(w.today.cb0, m, c.fees + c.setup);
    if ((be !== null && be > BREAK_EVEN_MAX) || (be === null && r.goal !== "stable")) out.push(`break-even ${be ?? "never"}`);
    if (r.pvCap !== null && m.pv > r.pvCap) out.push("PV");
  }
  if (!statusOk) return out;
  const relief = R.monthly - m.monthly;
  const g = r.goal;
  if (!c.S.size) out.push("nothing moves");
  if (g === "payment" || g === "consolidate") {
    if (relief < MATERIAL.monthly(R.monthly)) out.push("relief not material");
  } else if (g === "years") {
    if (R.months - m.months < MATERIAL.months || fP > w.neutral || tP > w.neutral) out.push("years not material");
  } else if (g === "savings") {
    if (-fP < MATERIAL.cost(w.todayCost) || tP > w.neutral) out.push("saving not material");
  } else if (g === "balanced") {
    const reliefOk = relief >= MATERIAL.monthly(R.monthly) && fP <= w.neutral && tP <= w.neutral;
    const savingOk = -fP >= MATERIAL.cost(w.todayCost) && tP <= w.neutral && relief >= -0.5;
    if (!reliefOk && !savingOk) out.push("balanced not material");
  } else if (g === "stable") {
    const s = stability(w, m);
    if (s.now - s.next < MATERIAL.monthly(R.monthly)) out.push("stability not material");
    else if (fP > w.neutral && fP > STABLE_PRICE * s.protection) out.push("stability price");
  }
  return out;
}

/* ---------------------------------------- the continuous part: one LP */

type Obj = { kind: "monthly" } | { kind: "f" } | { kind: "J"; lam: number } | { kind: "peak" } | { kind: "excess"; share: number; floor: number };
/**
 * jMax: the risk-weighted cost (1 − λ)·F + λ·max_k paid_k at most `cap` (a row per economy, the max needs none).
 * promise: stability's promise on the true peak, against the mix's own month one: in every economy and month the
 * summed payment at most (1 + share)·month one + floor + slack (slack 0: the promise kept; the engine takes share or
 * floor by today's payment, solveStable, and the candidate is re-tested on MATERIAL.monthly exactly).
 */
type Extra = { monthlyMax?: number; fMax?: number; peakMax?: number; jMax?: { lam: number; cap: number }; promise?: { share: number; floor: number; slack: number } };

/**
 * The best amounts over a set of columns for one refinance set: every linear rule a row, the
 * guard / break-even / peak rows added as cutting planes until none is violated. `integer`: the
 * columns ARE the tranches, each at least ₪50,000 and a tenth of its segment when it has two or
 * more. Returns the amounts (₪) and the bound in the score's own units.
 */
type Amounts = { x: number[] | null; xr: number[]; lb: number; cols: Unit[] };
function solveAmounts(w: World, b: Base, r: Rules, colsIn: Unit[], obj: Obj, ex: Extra, integer: boolean): Amounts | null {
  const U = 1000;
  const K = b.kept;
  const useH = b.NH > 0;
  const useA = b.NA > 0;
  const cols = colsIn.filter((u) => (u.seg === "housing" ? useH : useA) && (r.finish === null || u.years * 12 <= r.finish));
  if ((useH && !cols.some((u) => u.seg === "housing")) || (useA && !cols.some((u) => u.seg === "allPurpose"))) return null;
  // The bank all-purpose floor: a set that lends less all-purpose money than it has no tranche a bank writes.
  if (useA && w.apFloor && b.NA < w.apFloor - 0.5) return null;
  const nx = cols.length;
  const iT = nx;
  const n = nx + (obj.kind === "J" || obj.kind === "peak" || obj.kind === "excess" ? 1 : 0);
  const c = new Array(n).fill(0);
  const vec = (f: (u: Unit) => number) => {
    const a = new Array(n).fill(0);
    cols.forEach((u, j) => (a[j] = f(u)));
    return a;
  };
  const rows: LpRow[] = [];
  const hCount = cols.filter((u) => u.seg === "housing").length;
  const aCount = cols.filter((u) => u.seg === "allPurpose").length;
  const open = integer ? cols.length : 0;
  if (useH) rows.push({ a: vec((u) => (u.seg === "housing" ? 1 : 0)), lo: b.NH / U, hi: b.NH / U });
  if (useA) rows.push({ a: vec((u) => (u.seg === "allPurpose" ? 1 : 0)), lo: b.NA / U, hi: b.NA / U });
  if (w.bankLaw) {
    if (useH) rows.push({ a: vec((u) => (u.seg === "housing" ? (u.fixed ? 1 : 0) - FIXED_MIN : 0)), lo: 0 });
    if (useA) rows.push({ a: vec((u) => (u.seg === "allPurpose" ? (u.fixed ? 1 : 0) - FIXED_MIN : 0)), lo: 0 });
  }
  if (useH) rows.push({ a: vec((u) => (u.seg === "housing" ? (u.linked ? 1 : 0) - LINKED_MAX : 0)), hi: 0 });
  const allProp = K.propBal + b.NH + b.NA;
  if (allProp > 0 && w.today.propBal > 0) {
    if (w.bankLaw) rows.push({ a: vec((u) => (u.fixed ? 1 : 0)), lo: (w.phi * allProp - K.propFixed) / U });
    rows.push({ a: vec((u) => (u.linked ? 1 : 0)), hi: (w.psi * allProp - K.propLinked) / U });
  }
  if (r.shareCap && useH)
    for (const t of ["prime", "kz", "mlz", "mz"] as TrackKey[])
      if (cols.some((u) => u.track === t && u.seg === "housing")) rows.push({ a: vec((u) => (u.track === t && u.seg === "housing" ? 1 : 0)), hi: (TRACK_SHARE_MAX * b.NH + (1 - TRACK_SHARE_MAX) * 2 * MIN_TRANCHE) / U });
  const mRow = vec((u) => u.m * U);
  if (r.ceiling !== null) rows.push({ a: mRow, hi: r.ceiling - K.monthly - 0.6 * open });
  if (ex.monthlyMax !== undefined) rows.push({ a: mRow, hi: ex.monthlyMax - K.monthly - 0.6 * open });
  if (w.income) rows.push({ a: mRow, hi: PTI_MAX * w.income - K.ptiMonthly - 0.6 * open });
  if (r.typedCap !== null) rows.push({ a: vec((u) => u.tp), hi: (r.typedCap - K.typedPaid) / U - 0.05 });
  if (r.paidCap !== null) rows.push({ a: vec((u) => u.paid[0]), hi: (r.paidCap - K.paid[0]) / U - 0.05 });
  if (ex.fMax !== undefined) rows.push({ a: vec((u) => u.paid[0]), hi: (ex.fMax - K.paid[0]) / U });
  if (ex.jMax) {
    const jl = ex.jMax.lam;
    for (let k = 0; k < ECON_N; k++) rows.push({ a: vec((u) => (1 - jl) * u.paid[0] + jl * u.paid[k]), hi: (ex.jMax.cap - (1 - jl) * K.paid[0] - jl * K.paid[k]) / U });
  }
  if (r.pvCap !== null) rows.push({ a: vec((u) => u.pv), hi: (r.pvCap - K.pv) / U - 0.002 });
  if (obj.kind === "monthly") cols.forEach((u, j) => (c[j] = u.m * U));
  else if (obj.kind === "f") cols.forEach((u, j) => (c[j] = u.paid[0]));
  else if (obj.kind === "J") {
    cols.forEach((u, j) => (c[j] = (1 - obj.lam) * u.paid[0]));
    c[iT] = obj.lam;
    for (let k = 0; k < ECON_N; k++) {
      const a = vec((u) => u.paid[k]);
      a[iT] = -1;
      rows.push({ a, hi: -K.paid[k] / U });
    }
  } else if (obj.kind === "excess") {
    // The worst economy's true peak over the mix's own promise: P − (1 + share)·month one − floor.
    c[iT] = 1;
    cols.forEach((u, j) => (c[j] = -(1 + obj.share) * u.m * U));
  } else c[iT] = 1;
  const lbScore = (o: number) => (obj.kind === "monthly" ? K.monthly + o : obj.kind === "f" ? K.paid[0] + U * o : obj.kind === "J" ? (1 - obj.lam) * K.paid[0] + U * o : obj.kind === "excess" ? o - (1 + obj.share) * K.monthly - obj.floor : o);
  const lb = new Array(n).fill(0);
  const ub = new Array(n).fill(Infinity);
  if (integer)
    cols.forEach((u, j) => {
      const many = u.seg === "housing" ? hCount > 1 : aCount > 1;
      if (many) lb[j] = Math.max(MIN_TRANCHE, SLIVER_SHARE * (u.seg === "housing" ? b.NH : b.NA)) / U + 0.001;
    });
  // (t ≥ every economy's total paid, all positive: its lower bound 0 needs no shift.)
  const cut = new Set<string>();
  const guardRow = (k: number, mo: number): LpRow => ({
    a: vec((u) => (mo === 1 ? u.m * U : (u.reg[k][mo - 1] ?? 0) * U)),
    hi: r.guard![k] - (mo === 1 ? K.monthly + 0.6 * open : K.reg[k][mo - 1]),
  });
  const beRow = (mo: number): LpRow => ({ a: vec((u) => u.cb0[mo - 1]), hi: (w.today.cb0[mo - 1] - K.cb0[mo - 1]) / U });
  const pr = ex.promise;
  const peakRow = (k: number, mo: number): LpRow => {
    if (pr) {
      const a = vec((u) => ((u.reg[k][mo - 1] ?? 0) - (1 + pr.share) * u.m) * U);
      return { a, hi: (1 + pr.share) * K.monthly + pr.floor + pr.slack - K.reg[k][mo - 1] };
    }
    const a = vec((u) => (u.reg[k][mo - 1] ?? 0) * U);
    if (ex.peakMax === undefined) {
      a[iT] = -1;
      return { a, hi: -K.reg[k][mo - 1] };
    }
    return { a, hi: ex.peakMax - K.reg[k][mo - 1] };
  };
  const wantBE = r.breakEven && b.fees + b.setup > 0;
  const peakMode = obj.kind === "peak" || obj.kind === "excess" || ex.peakMax !== undefined || !!pr;
  if (r.guard) for (let k = 1; k < ECON_N; k++) for (const mo of [1, 31, 60]) { rows.push(guardRow(k, mo)); cut.add(`g${k}_${mo}`); }
  if (wantBE) for (const mo of [120, 180, 240]) if (mo <= w.H) { rows.push(beRow(mo)); cut.add(`b${mo}`); }
  if (peakMode) for (let k = 0; k < ECON_N; k++) { rows.push(peakRow(k, 1)); cut.add(`p${k}_1`); }
  let last: Amounts | null = null;
  for (let round = 0; round < 40; round++) {
    const sol = lp(c, rows, lb, ub);
    // Infeasible with a subset of the rows: infeasible. A failure after some rounds keeps the bound it had.
    if (!sol.ok) return round === 0 || sol.status === "infeasible" ? null : last;
    const x = sol.x;
    // Only the columns the LP uses carry weight in the arrays.
    const nz: number[] = [];
    for (let j = 0; j < nx; j++) if (Math.abs(x[j]) > 1e-12) nz.push(j);
    const viol: { key: string; v: number; row: () => LpRow }[] = [];
    if (r.guard)
      for (let k = 0; k < ECON_N; k++)
        for (const mo of r.guardMonths) {
          const key = `g${k}_${mo}`;
          if (cut.has(key)) continue;
          let s = mo === 1 ? K.monthly + 0.6 * open : K.reg[k][mo - 1];
          for (const j of nz) s += (mo === 1 ? cols[j].m : cols[j].reg[k][mo - 1] ?? 0) * U * x[j];
          if (s > r.guard[k] + 0.01) viol.push({ key, v: s - r.guard[k], row: () => guardRow(k, mo) });
        }
    if (wantBE)
      for (let mo = BREAK_EVEN_MAX; mo <= w.H; mo++) {
        const key = `b${mo}`;
        if (cut.has(key)) continue;
        let s = K.cb0[mo - 1];
        for (const j of nz) s += cols[j].cb0[mo - 1] * U * x[j];
        const d = w.today.cb0[mo - 1] - s;
        if (d < -0.01) viol.push({ key, v: -d, row: () => beRow(mo) });
      }
    if (peakMode) {
      let m1 = K.monthly;
      for (const j of nz) m1 += cols[j].m * U * x[j];
      const P = pr ? (1 + pr.share) * m1 + pr.floor + pr.slack : ex.peakMax ?? x[iT];
      for (let k = 0; k < ECON_N; k++)
        for (let mo = 1; mo <= w.H; mo++) {
          const key = `p${k}_${mo}`;
          if (cut.has(key)) continue;
          let s = K.reg[k][mo - 1];
          for (const j of nz) s += (cols[j].reg[k][mo - 1] ?? 0) * U * x[j];
          if (s > P + 0.01) viol.push({ key, v: s - P, row: () => peakRow(k, mo) });
        }
    }
    const xs = x.slice(0, nx).map((v) => v * U);
    if (!viol.length) return { x: xs, xr: xs, lb: lbScore(sol.obj), cols };
    // Not converged yet: what is known is a bound (fewer rows than the problem).
    last = { x: null, xr: xs, lb: lbScore(sol.obj), cols };
    viol.sort((a, b2) => b2.v - a.v);
    const fam = new Map<string, number>();
    for (const v of viol) {
      const f = v.key[0];
      if ((fam.get(f) ?? 0) >= 6) continue;
      fam.set(f, (fam.get(f) ?? 0) + 1);
      rows.push(v.row());
      cut.add(v.key);
    }
  }
  return last;
}

/* ------------------------------------- from amounts to an exact candidate */

/** ₪1,000 tranches, one taking the remainder (as index.ts rowsOf does), every pattern tried, the best legal one kept. */
function roundCand(w: World, b: Base, r: Rules, cols: Unit[], x: number[], score: (c: Cand) => number, statusOk: boolean): Cand | null {
  const parts = cols.map((u, j) => ({ u, a: x[j] })).filter((p) => p.a > 1);
  const perSeg = (seg: Seg): Tr[][] => {
    const ps = parts.filter((p) => p.u.seg === seg);
    const total = seg === "housing" ? b.NH : b.NA;
    if (!total) return [[]];
    if (!ps.length) return [];
    if (ps.length === 1) return [[{ key: ps[0].u.key, amount: total }]];
    const out: Tr[][] = [];
    const seen = new Set<string>();
    for (const ab of ps) {
      const others = ps.filter((p) => p !== ab);
      for (let mask = 0; mask < 1 << others.length; mask++) {
        const tr: Tr[] = [];
        let used = 0;
        others.forEach((p, i) => {
          const a = Math.max(MIN_TRANCHE, (mask & (1 << i) ? Math.ceil : Math.floor)(p.a / 1000) * 1000);
          tr.push({ key: p.u.key, amount: a });
          used += a;
        });
        tr.push({ key: ab.u.key, amount: total - used });
        const k = tr.map((t) => `${t.key}:${t.amount}`).sort().join(",");
        if (seen.has(k)) continue;
        seen.add(k);
        if (tr.some((t) => t.amount < Math.max(MIN_TRANCHE, SLIVER_SHARE * total))) continue;
        out.push(tr);
      }
    }
    return out;
  };
  // Every pattern, ordered by its linear score (the exact one differs by the read-out's rounding only);
  // the first few legal ones are priced exactly and the best kept.
  const lin = (tr: Tr[]) => sum(tr.map((t) => { const u = w.unitByKey.get(t.key)!; return t.amount * (u.paid[0] + 1e-3 * u.m + 1e-6 * u.years); }));
  const all: Tr[][] = [];
  for (const h of perSeg("housing")) for (const a of perSeg("allPurpose")) all.push([...h, ...a]);
  all.sort((p, q) => lin(p) - lin(q));
  let best: Cand | null = null;
  let bestS = Infinity;
  let legal = 0;
  for (const tr of all) {
    const c = buildCand(w, b, tr);
    if (failures(c, r, statusOk).length) continue;
    const s = score(c);
    if (s < bestS) {
      bestS = s;
      best = c;
    }
    if (++legal >= 4) break;
  }
  return best;
}

/* -------------------------------------------------- the tranche structure */

const termsOf = (t: TrackKey, top: number) => Array.from({ length: Math.max(0, top - MIN_YEARS[t] + 1) }, (_, i) => MIN_YEARS[t] + i);
type Found = { cand: Cand; score: number };

/**
 * The best exact candidate for one refinance set: the LP over every column first (a bound, and
 * the tracks and terms it reaches for), then tranche structures — the LP's support, its
 * weighted-average terms, coarse grids on every track set it names, all-קל"צ and קל"צ + פריים —
 * each improved by a line search over every term of every track and by dropping, adding and
 * swapping a track; each structure's amounts by LP, each answer rounded and tested exactly.
 */
function bestForSet(w: World, b: Base, r: Rules, obj: Obj, ex: Extra, score: (c: Cand) => number, statusOk: boolean, target = Infinity, stopAtFirst = false, budgetLps = QUICK ? 150 : 400): { lb: number; found: Found | null } {
  if (!b.NH && !b.NA) {
    const c = buildCand(w, b, []);
    return { lb: score(c), found: failures(c, r, statusOk).length ? null : { cand: c, score: score(c) } };
  }
  if (!setConstantsOk(w, b)) return { lb: Infinity, found: null };
  const all = w.units.filter((u) => (u.seg === "housing" ? b.NH > 0 : b.NA > 0));
  const relax = solveAmounts(w, b, r, all, obj, ex, false);
  if (!relax) return { lb: Infinity, found: null };
  if (relax.lb >= target) return { lb: relax.lb, found: null };
  let lps = 1;
  let best: Found | null = null;
  const memo = new Map<string, number>();
  const evalStructure = (keys: string[]): number => {
    const k = keys.slice().sort().join(",");
    if (memo.has(k)) return memo.get(k)!;
    if (lps >= budgetLps || (stopAtFirst && best) || (best && (best as Found).score <= relax.lb + 1e-6)) return Infinity;
    lps++;
    let v = Infinity;
    const cols = keys.map((x) => w.unitByKey.get(x)!);
    const sol = solveAmounts(w, b, r, cols, obj, ex, true);
    if (sol && sol.x) {
      const cand = roundCand(w, b, r, sol.cols, sol.x, score, statusOk);
      if (cand) {
        v = score(cand);
        if (!best || v < best.score) best = { cand, score: v };
      } else v = sol.lb + 1e12; // the LP holds and no rounding does: after every legal structure, still a direction
    }
    memo.set(k, v);
    return v;
  };
  const support = relax.cols.map((u, j) => ({ u, a: relax.xr[j] })).filter((p) => p.a > 1);
  const heavy = new Map<string, { u: Unit; a: number }>();
  const avg = new Map<string, { s: number; a: number; u: Unit }>();
  for (const p of support) {
    const k = `${p.u.track}|${p.u.seg}`;
    const cur = heavy.get(k);
    if (!cur || p.a > cur.a) heavy.set(k, p);
    const v = avg.get(k) ?? { s: 0, a: 0, u: p.u };
    v.s += p.a * p.u.years;
    v.a += p.a;
    avg.set(k, v);
  }
  const top = (seg: Seg) => (seg === "allPurpose" ? w.apYears : w.maxYears);
  const valid = (keys: string[]) => keys.filter((k) => w.unitByKey.has(k));
  const starts: string[][] = [
    Array.from(heavy.values()).map((p) => p.u.key),
    valid(Array.from(avg.values()).map((v) => `${v.u.track}|${v.u.seg}|${Math.round(v.s / v.a)}`)),
  ];
  const segs = (["housing", "allPurpose"] as Seg[]).filter((s) => (s === "housing" ? b.NH : b.NA) > 0);
  const tracksIn = (seg: Seg) => Array.from(new Set(support.filter((p) => p.u.seg === seg).map((p) => p.u.track)));
  for (const y of [10, 15, 20, 25, 30]) {
    const per = (f: (seg: Seg) => string[]) => valid(segs.flatMap(f));
    starts.push(per((seg) => tracksIn(seg).map((t) => `${t}|${seg}|${Math.max(MIN_YEARS[t], Math.min(top(seg), y))}`)));
    starts.push(per((seg) => [`klz|${seg}|${Math.min(top(seg), y)}`]));
    starts.push(per((seg) => [`klz|${seg}|${Math.min(top(seg), y)}`, `prime|${seg}|${Math.min(top(seg), y)}`]));
  }
  const descend = (keys0: string[]) => {
    let keys = valid(keys0);
    if (!keys.length) return;
    let cur = evalStructure(keys);
    for (let pass = 0; pass < 4; pass++) {
      let improved = false;
      for (let i = 0; i < keys.length; i++) {
        const u = w.unitByKey.get(keys[i])!;
        for (const y of termsOf(u.track, top(u.seg))) {
          const k2 = `${u.track}|${u.seg}|${y}`;
          if (k2 === keys[i] || !w.unitByKey.has(k2)) continue;
          const next = keys.slice();
          next[i] = k2;
          const s = evalStructure(next);
          if (s < cur - 1e-6) {
            cur = s;
            keys = next;
            improved = true;
          }
        }
      }
      for (let i = 0; i < keys.length && keys.length > 1; i++) {
        const next = keys.filter((_, j) => j !== i);
        const s = evalStructure(next);
        if (s < cur - 1e-6) {
          cur = s;
          keys = next;
          improved = true;
          i--;
        }
      }
      for (const seg of segs) {
        const have = new Set(keys.filter((k) => w.unitByKey.get(k)!.seg === seg).map((k) => w.unitByKey.get(k)!.track));
        for (const t of ["prime", "klz", "kz", "mlz", "mz"] as TrackKey[]) {
          if (have.has(t)) continue;
          for (const y of [MIN_YEARS[t], 10, 15, 20, 25, top(seg)]) {
            const k2 = `${t}|${seg}|${y}`;
            if (!w.unitByKey.has(k2)) continue;
            // add (room permitting), or swap for each track of the segment
            const variants: string[][] = [];
            if (have.size < (seg === "housing" ? MAX_HOUSING_TRANCHES : MAX_AP_TRANCHES)) variants.push([...keys, k2]);
            keys.forEach((k, j) => {
              if (w.unitByKey.get(k)!.seg === seg) variants.push(keys.map((x, i) => (i === j ? k2 : x)));
            });
            for (const next of variants) {
              const s = evalStructure(next);
              if (s < cur - 1e-6) {
                cur = s;
                keys = next;
                improved = true;
              }
            }
          }
        }
      }
      if (!improved) break;
    }
  };
  for (const s of starts) descend(s);
  return { lb: relax.lb, found: best };
}

/* ---------------------------------------------------- refinance sets */

/** Seeds: the engine's own refinance sets (every goal), nothing, everything, mortgages, loans, the debts dearer than new money. */
function seedSets(w: World, r: Rules): Set<string>[] {
  const forced = w.debts.filter((d) => mustMove(w, r, d)).map((d) => d.id);
  const movable = w.debts.filter((d) => !mustMove(w, r, d) && debtMovable(w, r, d));
  const out: Set<string>[] = [];
  const add = (ids: string[]) => {
    const S = new Set([...forced, ...ids.filter((id) => movable.some((d) => d.id === id))]);
    if (setAllowed(w, r, S)) out.push(S);
  };
  for (const p of w.res.proposals) add(p.moves.filter((m) => m.action !== "keep").map((m) => m.id));
  add([]);
  add(movable.map((d) => d.id));
  add(movable.filter((d) => d.group === "mortgage").map((d) => d.id));
  add(movable.filter((d) => d.group === "loan").map((d) => d.id));
  const dear = movable.filter((d) => {
    const own = irr(d.priced.pay[0], d.balance);
    if (own === null) return false;
    const want = Math.max(1, Math.round(d.months / 12));
    const near = w.units.filter((u) => u.seg === d.segment && Math.abs(u.years - want) <= 1);
    return near.length > 0 && own > Math.min(...near.map((u) => u.fRate));
  });
  add(dear.map((d) => d.id));
  return out;
}

const keyOf = (S: Set<string>) => Array.from(S).sort().join(",");

/**
 * The best candidate over refinance sets. Every set's LP bound first (every subset when the
 * movable debts are few; a seeded local search on the bound when many: single flips from every
 * seed, random restarts, pair flips around the best). Then the exact search, in bound order, on
 * the sets whose bound can still beat `target` (the engine's figure less materiality) — a set
 * whose bound cannot is proved unable to (the bound relaxes every integer rule). `reach`: the
 * best-bound set is searched exactly anyway, so the line can say what the search itself reached.
 * `stopAtFirst`: a feasibility question (any offer at all).
 */
type SOpts = { target: number; stopAtFirst?: boolean; reach?: boolean };
type SearchOut = { best: Found | null; sets: number; exact: number; minLb: number; exhaustive: boolean; below: number };
function search(w: World, r: Rules, obj: Obj, ex: Extra, score: (c: Cand) => number, statusOk: boolean, rand: () => number, o: SOpts): SearchOut {
  const forced = w.debts.filter((d) => mustMove(w, r, d)).map((d) => d.id);
  const movable = w.debts.filter((d) => !mustMove(w, r, d) && debtMovable(w, r, d));
  const groups: string[][] = [];
  const seen = new Set<string>();
  for (const d of movable) {
    if (seen.has(d.id)) continue;
    const g = w.moveWhole && d.group === "mortgage" ? movable.filter((x) => x.group === "mortgage" && x.lender === d.lender).map((x) => x.id) : [d.id];
    g.forEach((x) => seen.add(x));
    groups.push(g);
  }
  const lbCache = new Map<string, number>();
  const bound = (S: Set<string>): number => {
    const k = keyOf(S);
    if (lbCache.has(k)) return lbCache.get(k)!;
    let v = Infinity;
    if (setAllowed(w, r, S)) {
      const b = baseOf(w, S);
      if (!b.NH && !b.NA) {
        const c = buildCand(w, b, []);
        v = failures(c, r, statusOk).length ? Infinity : score(c);
      } else if (setConstantsOk(w, b)) {
        const s = solveAmounts(w, b, r, w.units, obj, ex, false);
        v = s ? s.lb : Infinity;
      }
    }
    lbCache.set(k, v);
    return v;
  };
  let best: Found | null = null;
  let exact = 0;
  const CAP = QUICK ? 16 : 40;
  const done = new Set<string>();
  const runExact = (S: Set<string>, target: number) => {
    const k = keyOf(S);
    if (done.has(k)) return;
    done.add(k);
    exact++;
    const res = bestForSet(w, baseOf(w, S), r, obj, ex, score, statusOk, target, !!o.stopAtFirst);
    if (res.found && (!best || res.found.score < best.score)) best = res.found;
  };
  const worth = (lbv: number) => lbv < o.target - 1e-6 && (!best || lbv < (best as Found).score - 1e-6);
  const visit = (list: { S: Set<string>; lb: number }[]) => {
    for (const x of list) {
      if ((o.stopAtFirst && best) || exact >= CAP) break;
      if (worth(x.lb)) runExact(x.S, Math.min(o.target, best ? (best as Found).score : Infinity));
      else if (o.reach && exact === 0) runExact(x.S, Infinity);
    }
  };
  const toSet = (mask: boolean[]) => new Set([...forced, ...groups.flatMap((g, i) => (mask[i] ? g : []))]);
  const EXH = QUICK ? 8 : 10;
  if (groups.length <= EXH) {
    const all: { S: Set<string>; lb: number }[] = [];
    for (let mask = 0; mask < 1 << groups.length; mask++) {
      const S = toSet(groups.map((_, i) => !!(mask & (1 << i))));
      const lbv = bound(S);
      if (Number.isFinite(lbv)) all.push({ S, lb: lbv });
    }
    all.sort((a, b2) => a.lb - b2.lb);
    visit(all);
    return { best, sets: all.length, exact, minLb: all[0]?.lb ?? Infinity, exhaustive: true, below: all.filter((x) => x.lb < o.target - 1e-6).length };
  }
  const met = new Map<string, { S: Set<string>; lb: number }>();
  const note = (S: Set<string>) => {
    const lbv = bound(S);
    if (Number.isFinite(lbv)) met.set(keyOf(S), { S, lb: lbv });
    return lbv;
  };
  const maskOf = (S: Set<string>) => groups.map((g) => g.every((id) => S.has(id)));
  const descend = (mask0: boolean[]) => {
    const mask = mask0.slice();
    let cur = note(toSet(mask));
    for (let it = 0; it < 60; it++) {
      let bestI = -1;
      let bestV = cur;
      for (let i = 0; i < groups.length; i++) {
        const m2 = mask.slice();
        m2[i] = !m2[i];
        const v = note(toSet(m2));
        if (v < bestV - 1e-6 || (!Number.isFinite(bestV) && Number.isFinite(v))) {
          bestV = v;
          bestI = i;
        }
      }
      if (bestI < 0) break;
      mask[bestI] = !mask[bestI];
      cur = bestV;
    }
    return mask;
  };
  const ends: boolean[][] = [];
  for (const S of seedSets(w, r)) ends.push(descend(maskOf(S)));
  for (let k = 0; k < (QUICK ? 3 : 8); k++) {
    const from = ends[Math.floor(rand() * ends.length)] ?? groups.map(() => false);
    ends.push(descend(from.map((x) => (rand() < 0.25 ? !x : x))));
  }
  const ranked = Array.from(met.values()).sort((a, b2) => a.lb - b2.lb);
  visit(ranked);
  // Pair flips around the best set met (its bound, or its exact answer).
  const centre = best ? (best as Found).cand.S : ranked[0]?.S;
  if (centre && !(o.stopAtFirst && best)) {
    const m0 = maskOf(centre);
    const pairs: { S: Set<string>; lb: number }[] = [];
    for (let i = 0; i < groups.length; i++)
      for (let j = i + 1; j < groups.length; j++) {
        const m2 = m0.slice();
        m2[i] = !m2[i];
        m2[j] = !m2[j];
        const S = toSet(m2);
        const lbv = note(S);
        if (Number.isFinite(lbv)) pairs.push({ S, lb: lbv });
      }
    pairs.sort((a, b2) => a.lb - b2.lb);
    visit(pairs.slice(0, QUICK ? 6 : 16));
  }
  const all = Array.from(met.values());
  return { best, sets: met.size, exact, minLb: Math.min(Infinity, ...all.map((x) => x.lb)), exhaustive: false, below: all.filter((x) => x.lb < o.target - 1e-6).length };
}

/* ------------------------------------------------------------ the goals */

type Line = {
  id: string;
  profile: string;
  goal: GoalId;
  status: string;
  measure: string;
  engine: Record<string, number>;
  best: Record<string, number> | null;
  gap: number;
  gapPct: number;
  material: number;
  verdict: string;
  cand?: ReturnType<typeof describe>;
  note?: string;
  proof?: "bound" | "search" | "local";
  bound?: number | null;
};

const pIn = (res: AutoMixResult, g: GoalId) => res.proposals.find((p) => p.goal === g);

function describe(c: Cand) {
  const w = c.w;
  const idx = (d: Debt) => `#${w.input.master.findIndex((l) => l.id === d.id) + 1}`;
  return {
    variant: w.variant,
    refinanced: w.debts.filter((d) => c.S.has(d.id)).map(idx).join(" ") || "none",
    kept: w.debts.filter((d) => !c.S.has(d.id)).map(idx).join(" ") || "none",
    tranches: c.tr.map((t) => {
      const u = w.unitByKey.get(t.key)!;
      return `${u.track}${u.seg === "allPurpose" ? "*" : ""} ${t.amount}/${u.years}y@${u.price.rate.toFixed(2)}`;
    }),
    monthly: c.mix.monthly,
    months: c.mix.months,
    forecast: Math.round(fOf(c.mix)),
    worst: Math.round(worstOf(c.mix)),
    J25: Math.round(Jof(c.mix, 0.25)),
    peak: Math.round(lifePeak(c.mix)),
    typed: Math.round(c.mix.typedPaid),
    pv: Math.round(c.mix.pv),
    fees: Math.round(c.fees),
    setup: Math.round(c.setup),
    be: breakEven(w.today.cb0, c.mix, c.fees + c.setup),
  };
}

/** The engine's proposal as this file's calculator reads its rows — with a check that the two agree. */
function engineMix(w: World, p: Proposal): Mix {
  const rows = owedOnly(p.rows);
  const m = mixOf(rows.map((l) => evalRow(l, w.input.inflation, w.input.discountRate)), w.H);
  const s0 = p.stress[0];
  if (s0 && (Math.abs(Math.round(fOf(m)) - s0.totalPaid) > 1 || m.monthly !== p.metrics.monthly))
    throw new Error(`${w.id}/${p.goal}: the audit's calculator disagrees with the engine (${Math.round(fOf(m))} vs ${s0.totalPaid}, ${m.monthly} vs ${p.metrics.monthly})`);
  return m;
}

/** The structure a proposal was built in. */
function worldFor(ws: World[], p: Proposal): World {
  const v = !p.structure || p.structure === "bank" ? (p.refinance === "move" ? "bankMove" : "bank") : p.structure;
  return ws.find((w) => w.variant === v) ?? ws[0];
}

const TIERS: GuardKind[] = ["absolute", "relative", "none"];

function auditGoal(ws: World[], goal: GoalId, rand: () => number): Line[] {
  const w0 = ws[0];
  const p = pIn(w0.res, goal);
  if (!p) return [];
  const status = p.status + (p.sameAs ? `=${p.sameAs}` : "");
  const em = p.status !== "unavailable" ? engineMix(worldFor(ws, p), p) : null;
  const ok = p.status === "ok" && !!em;
  const R = w0.R;
  const matM = MATERIAL.monthly(R.monthly);
  const matC = MATERIAL.cost(w0.todayCost);
  const lam = goal === "balanced" ? 0.5 : goal === "stable" ? 0.95 : 0.25;
  // How far the search's "no" reaches: "bound" = every refinance set enumerated and none's LP bound beats the target.
  type Run = { best: Found | null; proof: "bound" | "search" | "local"; minLb: number };
  const line = (measure: string, verdict: string, engine: Record<string, number>, best: Record<string, number> | null, gap: number, material: number, run: Run | null, c?: Cand, note?: string): Line => ({
    id: w0.id,
    profile: w0.profile,
    goal,
    status,
    measure,
    engine,
    best,
    gap,
    gapPct: engine.base ? (100 * gap) / Math.abs(engine.base) : 0,
    material,
    verdict: run && /CONFIRMED/.test(verdict) ? `${verdict} (${run.proof})` : verdict,
    ...(run ? { proof: run.proof, bound: Number.isFinite(run.minLb) ? Math.round(run.minLb) : null } : {}),
    ...(c ? { cand: describe(c) } : {}),
    ...(note ? { note } : {}),
  });
  const runAll = (mk: (w: World) => Rules | null, obj: Obj, ex: Extra, score: (c: Cand) => number, o: SOpts): Run => {
    let best: Found | null = null;
    let proof: "bound" | "search" | "local" = "bound";
    let minLb = Infinity;
    for (const w of ws) {
      const r = mk(w);
      if (!r) continue;
      const s = search(w, r, obj, ex, score, true, rand, o);
      // bound: every set enumerated and no set's relaxation reaches the target; search: every set
      // enumerated, the ones that could were searched exactly; local: a local search over the sets.
      if (!s.exhaustive) proof = "local";
      else if (s.below > 0 && proof === "bound") proof = "search";
      minLb = Math.min(minLb, s.minLb);
      if (s.best && (!best || s.best.score < best.score)) best = s.best;
      if (o.stopAtFirst && best) break;
    }
    return { best, proof, minLb };
  };
  // The guard tier: the engine's own when it offered; else the strongest tier with any offer (the engine's order).
  const tiered = (mk: (w: World, kind: GuardKind) => Rules | null, obj: Obj, ex: Extra, score: (c: Cand) => number, o: SOpts): Run => {
    if (ok) return runAll((w) => mk(w, (p.guard?.kind as GuardKind) ?? "absolute"), obj, ex, score, o);
    let last: Run = { best: null, proof: "bound", minLb: Infinity };
    for (const kind of TIERS) {
      last = runAll((w) => mk(w, kind), obj, ex, score, o);
      if (last.best) return last;
    }
    return last;
  };
  const ANY: SOpts = { target: Infinity, stopAtFirst: true };
  if (goal === "payment") {
    const eM = em?.monthly ?? R.monthly;
    const r1 = tiered((w, kind) => rulesFor(w, "payment", p, { guardKind: kind }), { kind: "monthly" }, {}, (c) => c.mix.monthly + fOf(c.mix) * 1e-9, ok ? { target: eM - matM, reach: true } : ANY);
    const b1 = r1.best;
    const g1 = b1 ? eM - b1.cand.mix.monthly : 0;
    const out = [line("payment ₪/month", !ok ? (b1 ? "MISS" : "NO-OFFER CONFIRMED") : g1 > matM ? "BEATEN" : "CONFIRMED", { base: eM, monthly: eM, forecast: Math.round(em ? fOf(em) : R.paid) }, b1 ? { monthly: b1.cand.mix.monthly, forecast: Math.round(fOf(b1.cand.mix)) } : null, g1, matM, r1, b1?.cand)];
    if (ok && em) {
      const r2 = runAll((w) => rulesFor(w, "payment", p), { kind: "f" }, { monthlyMax: em.monthly }, (c) => (c.mix.monthly <= em.monthly + 0.5 ? fOf(c.mix) : Infinity), { target: fOf(em) - matC, reach: true });
      const b2 = r2.best;
      const g2 = b2 ? fOf(em) - fOf(b2.cand.mix) : 0;
      out.push(line("payment: forecast at ≤ the same payment ₪", g2 > matC ? "BEATEN" : "CONFIRMED", { base: fOf(em), forecast: Math.round(fOf(em)), monthly: em.monthly }, b2 ? { forecast: Math.round(fOf(b2.cand.mix)), monthly: b2.cand.mix.monthly } : null, g2, matC, r2, b2?.cand));
    }
    return out;
  }
  if (goal === "savings") {
    const J0 = em ? Jof(em, lam) : Jof(w0.today, lam);
    const o: SOpts = ok ? { target: J0 - matC, reach: true } : ANY;
    const held = runAll((w) => rulesFor(w, "savings", p), { kind: "J", lam }, {}, (c) => Jof(c.mix, lam), o);
    let best = held.best;
    let note: string | undefined;
    if (ws.some((w) => w.hold.length)) {
      // A lifted answer stands only where it beats the best held one materially too (index.ts liftGain).
      const heldBest = held.best?.score ?? Infinity;
      const lifted = runAll((w) => rulesFor(w, "savings", p, { lift: true }), { kind: "J", lam }, {}, (c) => Jof(c.mix, lam), { target: Math.min(o.target, heldBest - matC), stopAtFirst: !ok && !held.best, reach: ok });
      if (lifted.best && (!held.best || lifted.best.score < heldBest - matC)) {
        best = lifted.best;
        note = lifted.best.score < J0 - matC || !ok ? "moves a debt CHEAP_KEEP holds, and beats the best held mix by more than materiality" : "the best reached moves a debt CHEAP_KEEP holds, as the engine's answer does";
      }
    }
    const gap = best ? J0 - best.score : 0;
    return [
      line(
        "savings J=0.75F+0.25max ₪",
        !ok ? (best ? "MISS" : "NO-OFFER CONFIRMED") : gap > matC ? "BEATEN" : "CONFIRMED",
        { base: J0, J: Math.round(J0), forecast: Math.round(em ? fOf(em) : R.paid), worst: Math.round(em ? worstOf(em) : R.worst) },
        best ? { J: Math.round(best.score), forecast: Math.round(fOf(best.cand.mix)), worst: Math.round(worstOf(best.cand.mix)) } : null,
        gap,
        matC,
        held,
        best?.cand,
        note
      ),
    ];
  }
  if (goal === "years") {
    const endE = ok ? em!.months : R.months;
    const stretch = Math.round(R.monthly * (1 + YEARS_STRETCH));
    const given = !!(w0.input.profile.budget && w0.input.profile.budget > 0);
    const ceilings = given ? [w0.budget] : Array.from(new Set([w0.budget, stretch]));
    const kinds: GuardKind[] = ok ? [(p.guard?.kind as GuardKind) ?? "absolute"] : TIERS;
    let best: { f: Found; ceiling: number } | null = null;
    let proof: Run | null = null;
    const at = (ceiling: number, T: number, kind: GuardKind) => runAll((w) => rulesFor(w, "years", p, { ceiling, finish: T, guardKind: kind }), { kind: "monthly" }, {}, (c) => c.mix.monthly, ANY);
    for (const kind of kinds) {
      for (const ceiling of ceilings)
        for (const T of [endE - 12, endE - 24, endE - 36, endE - 60, endE - 96].filter((x) => x >= 12)) {
          const run = at(ceiling, T, kind);
          if (T === endE - 12 && (!proof || run.proof === "local")) proof = run;
          if (!run.best) break;
          if (!best || run.best.cand.mix.months < best.f.cand.mix.months) best = { f: run.best, ceiling };
        }
      if (best) break;
    }
    // The stretch is the engine's only when it ends ≥ 12 months sooner than today's payment can (index.ts solveYears).
    if (best && best.ceiling > w0.budget + 0.5) {
      const kind = ok ? ((p.guard?.kind as GuardKind) ?? "absolute") : "none";
      const atToday = at(w0.budget, best.f.cand.mix.months + 11, kind);
      if (atToday.best) best = { f: atToday.best, ceiling: w0.budget };
    }
    const gap = best ? endE - best.f.cand.mix.months : 0;
    return [
      line("years: months to the end", !ok ? (best && gap >= 12 ? "MISS" : "NO-OFFER CONFIRMED") : gap >= MATERIAL.months ? "BEATEN" : "CONFIRMED", { base: endE, months: endE, monthly: em?.monthly ?? R.monthly }, best ? { months: best.f.cand.mix.months, monthly: best.f.cand.mix.monthly } : null, gap, MATERIAL.months, proof, best?.f.cand),
    ];
  }
  if (goal === "balanced" || goal === "consolidate") {
    const mk = (w: World, kind: GuardKind) => rulesFor(w, goal, p, { guardKind: kind });
    const eng = { base: em ? fOf(em) : R.paid, relief: Math.round(em ? R.monthly - em.monthly : 0), saving: Math.round(em ? R.paid - fOf(em) : 0) };
    const fig = (c: Cand) => ({ relief: Math.round(R.monthly - c.mix.monthly), saving: Math.round(R.paid - fOf(c.mix)) });
    if (!ok) {
      let run = tiered(mk, { kind: "f" }, {}, (c) => fOf(c.mix), ANY);
      if (!run.best) run = tiered(mk, { kind: "monthly" }, {}, (c) => c.mix.monthly, ANY);
      const any = run.best;
      return [line(`${goal}: any offer`, any ? "MISS" : "NO-OFFER CONFIRMED", eng, any ? fig(any.cand) : null, any ? R.paid - fOf(any.cand.mix) : 0, matC, run, any?.cand)];
    }
    const r1 = tiered(mk, { kind: "f" }, { monthlyMax: em!.monthly }, (c) => (c.mix.monthly <= em!.monthly + 0.5 ? fOf(c.mix) : Infinity), { target: fOf(em!) - matC, reach: true });
    const r2 = tiered(mk, { kind: "monthly" }, { fMax: fOf(em!) }, (c) => (fOf(c.mix) <= fOf(em!) + 1 ? c.mix.monthly : Infinity), { target: em!.monthly - matM, reach: true });
    const b1 = r1.best;
    const b2 = r2.best;
    const g1 = b1 ? fOf(em!) - fOf(b1.cand.mix) : 0;
    const g2 = b2 ? em!.monthly - b2.cand.mix.monthly : 0;
    return [
      line(`${goal}: saving at ≥ its relief ₪`, g1 > matC ? "BEATEN" : "CONFIRMED", eng, b1 ? fig(b1.cand) : null, g1, matC, r1, b1?.cand),
      line(`${goal}: relief at ≥ its saving ₪/mo`, g2 > matM ? "BEATEN" : "CONFIRMED", { ...eng, base: em!.monthly }, b2 ? fig(b2.cand) : null, g2, matM, r2, b2?.cand),
    ];
  }
  if (goal === "stable") {
    const ePeak = em ? lifePeak(em) : lifePeak(w0.today);
    const eF = em ? fOf(em) : R.paid;
    const mk = (w: World) => rulesFor(w, "stable", p);
    const eng = { base: eF, peak: Math.round(ePeak), forecast: Math.round(eF) };
    const fig = (c: Cand) => ({ peak: Math.round(lifePeak(c.mix)), forecast: Math.round(fOf(c.mix)) });
    if (!ok) {
      let run = runAll(mk, { kind: "peak" }, {}, (c) => lifePeak(c.mix), ANY);
      if (!run.best) run = runAll(mk, { kind: "f" }, {}, (c) => fOf(c.mix), ANY);
      const any = run.best;
      return [line("stable: any offer", any ? "MISS" : "NO-OFFER CONFIRMED", eng, any ? fig(any.cand) : null, any ? ePeak - lifePeak(any.cand.mix) : 0, matM, run, any?.cand)];
    }
    // STABILITY AS DEFINED (index.ts solveStable, rules after 490c92d): the promise that in every economy the TRUE
    // peak of the summed payments over the whole life stays within MATERIAL.monthly of the mix's OWN month one.
    // Among mixes that keep it the cheaper risk-weighted one (λ 0.95) is better, by MATERIAL.cost; where none keeps
    // it, the smaller worst-economy excess over the promise at no higher risk-weighted cost (by MATERIAL.monthly), or
    // the lower cost at no higher excess. A mix that keeps the promise where the engine's does not beats it outright.
    const lamS = 0.95;
    const share = MATERIAL.monthly(1e9) / 1e9;
    const floorM = MATERIAL.monthly(0);
    const mode = share * R.monthly >= floorM ? { share, floor: 0 } : { share: 0, floor: floorM };
    const excOf = (m: Mix) => lifePeak(m) - m.monthly - MATERIAL.monthly(m.monthly);
    const keeps = (m: Mix) => excOf(m) <= 0.5;
    const eJ = Jof(em!, lamS);
    const eExc = excOf(em!);
    const engS = { base: eJ, J: Math.round(eJ), peak: Math.round(ePeak), excess: Math.round(Math.max(0, eExc)), monthly: em!.monthly, forecast: Math.round(eF) };
    const figS = (c: Cand) => ({ J: Math.round(Jof(c.mix, lamS)), peak: Math.round(lifePeak(c.mix)), excess: Math.round(Math.max(0, excOf(c.mix))), monthly: c.mix.monthly, forecast: Math.round(fOf(c.mix)) });
    // A held search, and where CHEAP_KEEP holds a debt the lifted one, which counts only where it beats the best held
    // mix by the same materiality (index.ts LIFT_GOALS).
    const both = (obj: Obj, ex: Extra, score: (c: Cand) => number, o: SOpts, mat: number) => {
      let run = runAll(mk, obj, ex, score, o);
      let note: string | undefined;
      if (ws.some((w) => w.hold.length)) {
        const l = runAll((w) => rulesFor(w, "stable", p, { lift: true }), obj, ex, score, { ...o, target: Math.min(o.target, (run.best?.score ?? Infinity) - mat) });
        if (l.best && (!run.best || l.best.score < run.best.score - mat)) {
          run = l;
          note = "lifted CHEAP_KEEP (beats the best held mix materially)";
        }
      }
      return { run, note };
    };
    const Jscore = (c: Cand) => Jof(c.mix, lamS);
    const out: Line[] = [];
    if (keeps(em!)) {
      const { run, note } = both({ kind: "J", lam: lamS }, { promise: { ...mode, slack: 0 } }, (c) => (keeps(c.mix) ? Jscore(c) : Infinity), { target: eJ - matC, reach: true }, matC);
      const g = run.best ? eJ - run.best.score : 0;
      out.push(line("stable: risk-weighted cost among mixes that keep the promise ₪", g > matC ? "BEATEN" : "CONFIRMED", engS, run.best ? figS(run.best.cand) : null, g, matC, run, run.best?.cand, note));
    } else {
      const k0 = both({ kind: "J", lam: lamS }, { promise: { ...mode, slack: 0 } }, (c) => (keeps(c.mix) ? Jscore(c) : Infinity), { target: Infinity, stopAtFirst: true }, matC);
      out.push(line("stable: a mix that keeps the promise (the engine's does not)", k0.run.best ? "BEATEN" : "CONFIRMED", engS, k0.run.best ? figS(k0.run.best.cand) : null, k0.run.best ? eExc : 0, 0.5, k0.run, k0.run.best?.cand, k0.note));
      const e1 = both({ kind: "excess", ...mode }, { jMax: { lam: lamS, cap: eJ } }, (c) => (Jscore(c) <= eJ + 1 ? excOf(c.mix) : Infinity), { target: eExc - matM, reach: true }, matM);
      const g1 = e1.run.best ? eExc - e1.run.best.score : 0;
      out.push(line("stable: worst excess over the promise at ≤ its risk-weighted cost ₪/mo", g1 > matM ? "BEATEN" : "CONFIRMED", { ...engS, base: Math.max(1, eExc) }, e1.run.best ? figS(e1.run.best.cand) : null, g1, matM, e1.run, e1.run.best?.cand, e1.note));
      const c1 = both({ kind: "J", lam: lamS }, { promise: { ...mode, slack: eExc } }, (c) => (excOf(c.mix) <= eExc + 0.5 ? Jscore(c) : Infinity), { target: eJ - matC, reach: true }, matC);
      const g2 = c1.run.best ? eJ - c1.run.best.score : 0;
      out.push(line("stable: risk-weighted cost at ≤ its worst excess ₪", g2 > matC ? "BEATEN" : "CONFIRMED", engS, c1.run.best ? figS(c1.run.best.cand) : null, g2, matC, c1.run, c1.run.best?.cand, c1.note));
    }
    // (info) The earlier two-way test, kept for comparison: forecast at no higher worst peak, worst peak at no higher forecast.
    const { run: r1 } = both({ kind: "f" }, { peakMax: ePeak }, (c) => (lifePeak(c.mix) <= ePeak + 0.5 ? fOf(c.mix) : Infinity), { target: eF - matC, reach: true }, matC);
    const { run: r2 } = both({ kind: "peak" }, { fMax: eF }, (c) => (fOf(c.mix) <= eF + 1 ? lifePeak(c.mix) : Infinity), { target: ePeak - matM, reach: true }, matM);
    const b1 = r1.best;
    const b2 = r2.best;
    const g1 = b1 ? eF - fOf(b1.cand.mix) : 0;
    const g2 = b2 ? ePeak - lifePeak(b2.cand.mix) : 0;
    out.push(
      line("(info) stable: forecast at ≤ its worst peak ₪", g1 > matC ? "info: beaten" : "info: confirmed", eng, b1 ? fig(b1.cand) : null, g1, matC, r1, b1?.cand),
      line("(info) stable: worst peak at ≤ its forecast ₪/mo", g2 > matM ? "info: beaten" : "info: confirmed", { ...eng, base: ePeak }, b2 ? fig(b2.cand) : null, g2, matM, r2, b2?.cand)
    );
    return out;
  }
  return [];
}

/* ------------------------------------------------------- power test */

/**
 * The search's power: the engine's answer with its largest tranche's term moved five years
 * (savings +5, payment −5, the other way where the grid ends) is the answer to beat; the search,
 * never given the engine's tranches, must beat it by more than materiality on the goal's measure.
 */
function powerTest(ws: World[], goal: GoalId, rand: () => number): Line[] {
  const p = pIn(ws[0].res, goal);
  if (!p || p.status !== "ok" || !p.tranches.length || (goal !== "payment" && goal !== "savings")) return [];
  const w = worldFor(ws, p);
  const S = new Set(p.moves.filter((m) => m.action !== "keep").map((m) => m.id));
  const b = baseOf(w, S);
  const big = p.tranches.reduce((a, t) => (t.amount > a.amount ? t : a), p.tranches[0]);
  const tr: Tr[] = p.tranches.map((t) => {
    const top = t.segment === "allPurpose" ? w.apYears : w.maxYears;
    let y = t.years;
    if (t === big) y = goal === "payment" ? (t.years - 5 >= MIN_YEARS[t.track] ? t.years - 5 : t.years + 5) : t.years + 5 <= top ? t.years + 5 : t.years - 5;
    return { key: `${t.track}|${t.segment}|${y}`, amount: t.amount };
  });
  if (tr.some((t) => !w.unitByKey.has(t.key))) return [];
  const weak = buildCand(w, b, tr);
  const r = rulesFor(w, goal, p)!;
  const legal = failures(weak, r, false);
  const lam = 0.25;
  const wv = goal === "savings" ? Jof(weak.mix, lam) : weak.mix.monthly;
  const mat0 = goal === "savings" ? MATERIAL.cost(w.todayCost) : MATERIAL.monthly(w.R.monthly);
  const o: SOpts = { target: wv - mat0, reach: true };
  const s = goal === "savings" ? search(w, r, { kind: "J", lam }, {}, (c) => Jof(c.mix, lam), true, rand, o) : search(w, r, { kind: "monthly" }, {}, (c) => c.mix.monthly, true, rand, o);
  const bv = s.best ? s.best.score : Infinity;
  const ev = goal === "savings" ? Jof(engineMix(w, p), lam) : p.metrics.monthly;
  const gap = s.best ? wv - bv : 0;
  const mat = goal === "savings" ? MATERIAL.cost(w.todayCost) : MATERIAL.monthly(w.R.monthly);
  return [
    {
      id: w.id,
      profile: w.profile,
      goal,
      status: "weakened",
      measure: `${goal} vs the weakened answer (${legal.join("/") || "legal"})`,
      engine: { base: wv, weakened: Math.round(wv), engine: Math.round(ev) },
      best: s.best ? { search: Math.round(bv) } : null,
      gap,
      gapPct: (100 * gap) / wv,
      material: mat,
      verdict: gap > mat ? "POWER: beats the weakened answer" : "power: not beaten",
      ...(s.best ? { cand: describe(s.best.cand) } : {}),
    },
  ];
}

/* ------------------------------------------------ the market's baskets */

/**
 * The Bank of Israel's three uniform baskets, at the engine's own prices, against an answer
 * (savings, balanced): the same debts refinanced, the housing money split as the basket at the
 * answer's own (balance-weighted) term, and at the best whole-year term the goal's rules allow;
 * all-purpose money left as the answer has it. Basket 1 all קל"צ; basket 2 ⅓ קל"צ + ⅓ פריים +
 * ⅓ מ"צ (five-year variable, linked); basket 3 ½ קל"צ + ½ פריים. And keeping today's mix.
 */
function basketTest(ws: World[], goal: GoalId): Line[] {
  const p = pIn(ws[0].res, goal);
  if (!p || p.status === "unavailable" || (goal !== "savings" && goal !== "balanced")) return [];
  const w = worldFor(ws, p);
  const em = engineMix(w, p);
  const S = new Set(p.moves.filter((m) => m.action !== "keep").map((m) => m.id));
  const b = baseOf(w, S);
  const lam = goal === "savings" ? 0.25 : 0.5;
  const R = w.R;
  const H = p.tranches.filter((t) => t.segment === "housing");
  const NH = sum(H.map((t) => t.amount));
  const ap: Tr[] = p.tranches.filter((t) => t.segment === "allPurpose").map((t) => ({ key: `${t.track}|${t.segment}|${t.years}`, amount: t.amount }));
  const r = rulesFor(w, goal, p)!;
  const out: Line[] = [];
  const baskets: { name: string; parts: [TrackKey, number][] }[] = [
    { name: "basket 1 (all קל\"צ)", parts: [["klz", 1]] },
    { name: "basket 2 (⅓ קל\"צ ⅓ פריים ⅓ מ\"צ)", parts: [["klz", 1 / 3], ["prime", 1 / 3], ["mz", 1 / 3]] },
    { name: "basket 3 (½ קל\"צ ½ פריים)", parts: [["klz", 0.5], ["prime", 0.5]] },
  ];
  const eJ = Jof(em, lam);
  const eRel = R.monthly - em.monthly;
  const eSav = R.paid - fOf(em);
  const score = (c: Cand) => (goal === "savings" ? Jof(c.mix, lam) : -(R.paid - fOf(c.mix)));
  const termAvg = NH ? Math.round(sum(H.map((t) => t.amount * t.years)) / NH) : 0;
  for (const bk of baskets) {
    if (!NH) break;
    const build = (y: number): Cand | null => {
      const keys = bk.parts.map(([t]) => `${t}|housing|${Math.max(MIN_YEARS[t], Math.min(w.maxYears, y))}`);
      if (keys.some((k) => !w.unitByKey.has(k))) return null;
      // ₪1,000 tranches, קל"צ takes the remainder (it holds the fixed third).
      let used = 0;
      const tr: Tr[] = bk.parts.slice(1).map(([t, s], i) => {
        const a = Math.floor((s * NH) / 1000) * 1000;
        used += a;
        return { key: keys[i + 1], amount: a };
      });
      tr.unshift({ key: keys[0], amount: NH - used });
      return buildCand(w, b, [...tr, ...ap]);
    };
    const atOwn = build(termAvg);
    let bestLegal: Cand | null = null;
    for (let y = 4; y <= w.maxYears; y++) {
      const c = build(y);
      if (!c || failures(c, r, false).length) continue;
      if (!bestLegal || score(c) < score(bestLegal)) bestLegal = c;
    }
    const fig = (c: Cand) => (goal === "savings" ? { J: Math.round(Jof(c.mix, lam)), forecast: Math.round(fOf(c.mix)), worst: Math.round(worstOf(c.mix)), monthly: c.mix.monthly } : { relief: Math.round(R.monthly - c.mix.monthly), saving: Math.round(R.paid - fOf(c.mix)), monthly: c.mix.monthly });
    const engFig = goal === "savings" ? { base: eJ, J: Math.round(eJ), forecast: Math.round(fOf(em)), worst: Math.round(worstOf(em)), monthly: em.monthly } : { base: eSav, relief: Math.round(eRel), saving: Math.round(eSav), monthly: em.monthly };
    for (const [tag, c] of [[`at its term ${termAvg}y`, atOwn], ["best legal term", bestLegal]] as [string, Cand | null][]) {
      if (!c) continue;
      const legal = failures(c, r, false);
      const gap = goal === "savings" ? eJ - Jof(c.mix, lam) : R.paid - fOf(c.mix) - eSav;
      const reliefNoWorse = R.monthly - c.mix.monthly >= eRel - 0.5;
      const loses = goal === "savings" ? gap > 0 : gap > 0 && reliefNoWorse;
      out.push({
        id: w.id,
        profile: w.profile,
        goal,
        status: p.status,
        measure: `${bk.name} ${tag} (${legal.join("/") || "legal"})`,
        engine: engFig,
        best: fig(c),
        gap,
        gapPct: engFig.base ? (100 * gap) / Math.abs(engFig.base) : 0,
        material: goal === "savings" ? MATERIAL.cost(w.todayCost) : MATERIAL.cost(w.todayCost),
        verdict: loses ? (legal.length ? "basket better (outside the goal's rules)" : "BASKET BEATS THE ENGINE") : "engine ≥ basket",
        cand: describe(c),
      });
    }
  }
  // Keeping today's mix.
  const keep = buildCand(w, baseOf(w, new Set()), []);
  const kGap = goal === "savings" ? eJ - Jof(keep.mix, lam) : -eSav;
  out.push({ id: w.id, profile: w.profile, goal, status: p.status, measure: "keep today's mix", engine: goal === "savings" ? { base: eJ, J: Math.round(eJ) } : { base: eSav, saving: Math.round(eSav), relief: Math.round(eRel) }, best: goal === "savings" ? { J: Math.round(Jof(keep.mix, lam)) } : { saving: 0, relief: 0 }, gap: kGap, gapPct: 0, material: MATERIAL.cost(w.todayCost), verdict: p.status === "ok" && kGap > 0 && (goal === "savings" || eRel < 0.5) ? "KEEPING BEATS THE ENGINE" : "engine ≥ keeping" });
  return out;
}

/** Every proposal in full (moves, tranches, checks, reasons, caveats) — the realism read. */
function dumpProposals(ws: World[]): string {
  const res = ws[0].res;
  const lines: string[] = [];
  const t = res.today;
  lines.push(`== ${ws[0].id} ${ws[0].profile}: ${res.pricing.tier} ${res.pricing.bank} today bal ${fmt(t.balance)} mo ${fmt(t.monthly)} months ${t.months} rec ${res.recommended ?? "-"}`);
  ws[0].input.master.forEach((l, i) => lines.push(`   #${i + 1} ${l.group} path ${l.path_id} amt ${fmt(Number(l.amount))} rate ${l.rate} months ${l.months} sched ${l.amortization_schedule_id} fee ${fmt(Number(l.prepayment_fee ?? 0))} srcMonthly ${l.source_monthly ?? "-"} start ${l.source_start_date ?? "-"} purpose ${l.purpose ?? "-"}${l.is_guarantor ? " GUARANTOR" : ""}`));
  for (const f of res.findings) lines.push(`   F[${f.severity}] ${f.title} :: ${f.detail}`);
  for (const p of res.proposals) {
    lines.push(`  -- ${p.goal} ${p.status}${p.sameAs ? " =" + p.sameAs : ""} ${p.structure ?? ""}/${p.refinance ?? ""} mo ${fmt(p.metrics.monthly)} months ${p.metrics.months} fees ${fmt(p.costs.prepaymentFees)} setup ${fmt(p.costs.setup)} be ${p.costs.breakEvenMonths ?? "-"} guard ${p.guard?.kind ?? "-"}${p.guard ? (p.guard.holds ? "/holds" : "/not") : ""}`);
    if (p.note) lines.push(`     note: ${p.note}`);
    for (const x of p.tranches) lines.push(`     T ${x.track}${x.segment === "allPurpose" ? "*" : ""} ${fmt(x.amount)} ${x.years}y @${x.rate} mo ${fmt(x.monthly)}${x.keptSmall ? " small: " + x.keptSmall : ""}`);
    for (const m of p.moves) lines.push(`     M ${m.action} ${m.label} ${fmt(m.balance)} ${m.rate}% ${m.months}m fee ${fmt(m.fee)}${m.feeEstimated ? "~" : ""}${m.heldCheap !== undefined ? ` held ${m.heldCheap}` : ""} | ${m.why}`);
    for (const x of p.checks) if (!x.ok) lines.push(`     CHECK FAIL ${x.label}: ${x.value}`);
    if (p.stress.length) lines.push(`     stress: ${p.stress.map((s) => `${s.id} peak ${fmt(s.peakMonthly)}/${fmt(s.todayPeakMonthly)} paid ${fmt(s.totalPaid)}/${fmt(s.todayTotalPaid)}`).join(" | ")}`);
    if (p.balance) lines.push(`     balance: relief ${fmt(p.balance.relief)}/${fmt(p.balance.reliefMax)} saving ${fmt(p.balance.saving)}/${fmt(p.balance.savingMax)} t ${p.balance.t.toFixed(2)}`);
    for (const x of p.reasons) lines.push(`     R: ${x}`);
    for (const x of p.caveats) lines.push(`     C: ${x}`);
  }
  return lines.join("\n");
}

/* ------------------------------------------------------------ the run */

const BASKETS = argv.includes("--baskets");
const DUMP = arg("--dump");
if (DUMP) fs.writeFileSync(DUMP, "");
const outLines: Line[] = [];
if (OUT) fs.writeFileSync(OUT, "");
const pad = (s: string, n: number) => (s.length >= n ? s : s + " ".repeat(n - s.length));
const KEYS = ["monthly", "months", "J", "forecast", "worst", "relief", "saving", "peak", "weakened", "engine", "search"];
const fig = (o: Record<string, number> | null) => (o ? KEYS.filter((k) => k in o).map((k) => `${k} ${fmt(o[k])}`).join(" ") : "-");

/** What decides a goal's answer, for comparing the two profiles' engines. */
const sig = (res: AutoMixResult, g: GoalId) => {
  const p = pIn(res, g);
  return JSON.stringify(p ? [p.status, p.metrics.monthly, p.metrics.months, p.stress[0]?.totalPaid ?? 0, p.tranches.map((t) => `${t.track}${t.segment}${t.years}:${t.amount}`).sort(), p.guard?.kind ?? ""] : null);
};
const sameMarket = (a: AutoMixResult, b: AutoMixResult) => JSON.stringify([a.pricing.tier, a.pricing.bank, a.pricing.rows]) === JSON.stringify([b.pricing.tier, b.pricing.bank, b.pricing.rows]);

for (const c of cases) {
  const byProfile = new Map<string, { res: AutoMixResult; lines: Map<GoalId, Line[]> }>();
  for (const prof of PROFILES) {
    const t0 = Date.now();
    const baseIn: AutoMixInput = { master: c.master, market, forecast, forecastOn: true, inflation: 2, discountRate: 4.5, profile: { ...DEFAULT_PROFILE }, analysis: c.analysis };
    const base = buildAutoMix(baseIn);
    let input = baseIn;
    if (prof === "typical") {
      const mort = c.master.filter((l) => !l.is_guarantor && l.group !== "loan").reduce((a, l) => a + Number(l.amount || 0), 0);
      input = { ...baseIn, profile: { ...DEFAULT_PROFILE, income: Math.max(4000, Math.round(base.today.monthly / 0.3 / 100) * 100), propertyValue: mort > 0 ? Math.round(mort / 0.5 / 10000) * 10000 : null, age: 42 } };
    }
    const res = prof === "typical" ? buildAutoMix(input) : base;
    if (!res.ok) {
      console.log(`${pad(c.id, 8)} ${pad(prof, 7)} engine not ok: nothing to audit`);
      continue;
    }
    const ws = worldsOf(c.id, prof, input, res);
    if (!ws.length) {
      console.log(`${pad(c.id, 8)} ${pad(prof, 7)} no structure to search (blocked, or debt due now)`);
      continue;
    }
    const rand = rng(SEED * 7919 + cases.indexOf(c) * 31 + (prof === "typical" ? 1 : 0));
    if (arg("--recheck")) {
      // Every finding of this file and profile, rebuilt from its printed description and re-tested: this
      // file's laws, and the engine's own read-out (index.ts bookOf) and the verifier's guard test.
      const { verifier } = await import("./automix-verify.mts");
      const V = verifier(market, forecast);
      const lines = fs.readFileSync(arg("--recheck")!, "utf8").split(String.fromCharCode(10)).filter(Boolean).map((x) => JSON.parse(x)).filter((l: any) => l.id === c.id && l.profile === prof && /BEATEN|MISS/.test(l.verdict) && l.cand);
      for (const l of lines) {
        const w = ws.find((x) => x.variant === l.cand.variant)!;
        const S = new Set<string>(l.cand.refinanced === "none" ? [] : l.cand.refinanced.split(" ").map((x: string) => input.master[Number(x.slice(1)) - 1].id));
        const tr: Tr[] = l.cand.tranches.map((t: string) => {
          const m = t.match(/^(\w+)(\*?) (\d+)\/(\d+)y@/)!;
          return { key: `${m[1]}|${m[2] ? "allPurpose" : "housing"}|${m[4]}`, amount: Number(m[3]) };
        });
        const b = baseOf(w, S);
        const cand = buildCand(w, b, tr);
        const p = pIn(res, l.goal)!;
        const r = rulesFor(w, l.goal, p, l.goal === "years" ? { ceiling: Math.round(w.R.monthly * 1.1), finish: cand.mix.months, guardKind: (p.guard?.kind as GuardKind) ?? "absolute" } : {})!;
        const fails = failures(cand, r, true);
        if (l.goal === "years" || l.goal === "payment" || l.goal === "balanced")
          for (const kind of TIERS) for (const ceil of l.goal === "years" ? [w.budget, Math.round(w.R.monthly * 1.1)] : [0]) {
            const rk = rulesFor(w, l.goal, p, l.goal === "years" ? { ceiling: ceil, finish: cand.mix.months, guardKind: kind } : { guardKind: kind })!;
            console.log(`  tier ${kind}${l.goal === "years" ? ` ceiling ${ceil}` : ""}: ${failures(cand, rk, true).join(", ") || "all hold"}; guard peaks ${guardPeaks(cand.mix, EARLY).map(Math.round).join("/")} vs caps ${rk.guard?.map(Math.round).join("/") ?? "none"}`);
          }
        const book = __.bookOf(rowsOfCand(w, cand), input, forecast);
        const g = r.guard;
        const guardOk = g ? V.guardOk(rowsOfCand(w, cand), input.inflation, g, [...Array.from({ length: 10 }, (_, i) => 1 + 6 * i), 60]) : true;
        const guard60 = g ? V.guardOk(rowsOfCand(w, cand), input.inflation, g) : true;
        console.log(`RECHECK ${c.id} ${prof} ${l.goal} [${l.measure}] ${l.verdict}`);
        console.log(`  rules: ${fails.length ? "FAIL " + fails.join(", ") : "all hold"}; guard (verifier, sample months) ${guardOk}; every month 1-60 ${guard60}`);
        console.log(`  engine read-out of the rows: monthly ${book.metrics.monthly} (audit ${cand.mix.monthly}) forecast ${Math.round(book.paid[0])} (audit ${Math.round(fOf(cand.mix))}) worst ${Math.round(Math.max(...book.paid.slice(1)))} typed ${Math.round(book.metrics.totalPaid)} months ${book.metrics.months} pv ${Math.round(book.metrics.outlook?.pv ?? 0)}`);
        console.log(`  today: monthly ${w.R.monthly} forecast ${Math.round(w.R.paid)} typed ${Math.round(w.R.typedPaid)} worst ${Math.round(w.R.worst)} pv ${Math.round(w.R.pvNow)} months ${w.R.months}; neutral ${Math.round(w.neutral)}; material cost ${Math.round(MATERIAL.cost(w.todayCost))}`);
        console.log(`  costs: fees ${Math.round(cand.fees)} setup ${Math.round(cand.setup)} new money ${cand.newMoney} share ${(100 * (cand.fees + cand.setup) / Math.max(1, cand.newMoney)).toFixed(2)}% break-even ${breakEven(w.today.cb0, cand.mix, cand.fees + cand.setup)}; property fixed ${(cand.mix.propFixed / cand.mix.propBal).toFixed(3)} (min ${w.phi.toFixed(3)}) linked ${(cand.mix.propLinked / cand.mix.propBal).toFixed(3)} (max ${w.psi.toFixed(3)}); holds ${w.hold.map((id) => `#${input.master.findIndex((x) => x.id === id) + 1}`).join(" ") || "none"}`);
        const st = stability(w, cand.mix);
        console.log(`  stability: worst life peak today ${Math.round(st.now)} -> ${Math.round(st.next)}, rise ${Math.round(Math.max(...cand.mix.reg.map((x) => Math.max(...x))) - cand.mix.monthly)}; protection ${Math.round(st.protection)}`);
      }
      continue;
    }
    if (argv.includes("--debug-years")) {
      const w = ws[0];
      const p = pIn(res, "years")!;
      const T = Number(arg("--T") ?? 228);
      const r = rulesFor(w, "years", p, { ceiling: Number(arg("--ceil") ?? w.budget), finish: T, guardKind: "absolute" })!;
      const forcedIds = w.debts.filter((d) => mustMove(w, r, d)).map((d) => d.id);
      const movable = w.debts.filter((d) => !mustMove(w, r, d) && debtMovable(w, r, d));
      console.log("forced", forcedIds.length, "movable", movable.length, "ceiling", r.ceiling, "guard", r.guard);
      for (let mask = 0; mask < 1 << movable.length; mask++) {
        const S = new Set([...forcedIds, ...movable.filter((_, i) => mask & (1 << i)).map((d) => d.id)]);
        if (!setAllowed(w, r, S)) continue;
        const b = baseOf(w, S);
        if (!setConstantsOk(w, b)) { console.log(mask, "constants fail"); continue; }
        const sa = solveAmounts(w, b, r, w.units, { kind: "monthly" }, {}, false);
        console.log(mask, "kept monthly", Math.round(b.kept.monthly), "NH", b.NH, sa ? `lb ${Math.round(sa.lb)} conv ${!!sa.x} support ${sa.xr.map((x, j) => (x > 1 ? `${sa.cols[j].key}:${Math.round(x)}` : "")).filter(Boolean).join(" ")}` : "infeasible");
      }
      continue;
    }
    if (DUMP) {
      fs.appendFileSync(DUMP, dumpProposals(ws) + "\n\n");
      console.log(`${c.id} ${prof} dumped`);
      continue;
    }
    const mine = new Map<GoalId, Line[]>();
    byProfile.set(prof, { res, lines: mine });
    for (const g of GOALS) {
      let ls: Line[] = [];
      // The typical profile only adds limits (PTI, LTV, the age cap): where its engine gives the same answer at the
      // same prices and the default profile's answer stood, nothing the typical rules allow can beat it.
      const d = byProfile.get("default");
      if (prof === "typical" && !POWER && !BASKETS && d && d.lines.get(g)?.length && sameMarket(d.res, res) && sig(d.res, g) === sig(res, g) && d.lines.get(g)!.every((l) => /CONFIRMED/.test(l.verdict))) {
        ls = d.lines.get(g)!.map((l) => ({ ...l, profile: "typical", verdict: `${l.verdict} [= default: same answer, typical only adds limits]` }));
      } else try {
        ls = POWER ? powerTest(ws, g, rand) : BASKETS ? basketTest(ws, g) : auditGoal(ws, g, rand);
      } catch (e) {
        console.log(`${pad(c.id, 8)} ${pad(prof, 7)} ${pad(g, 11)} ERROR ${(e as Error).message}`);
        continue;
      }
      if (!ls.length) continue;
      mine.set(g, ls);
      for (const l of ls) {
        outLines.push(l);
        if (OUT) fs.appendFileSync(OUT, JSON.stringify(l) + "\n");
      }
      // One line per file and goal: every measure of the goal, the verdict the worst of them.
      const rank = (v: string) => (/BEATEN|MISS|POWER:/.test(v) ? 2 : /CONFIRMED/.test(v) ? 1 : 0);
      const head = ls.reduce((a, l) => (rank(l.verdict) > rank(a.verdict) ? l : a), ls[0]);
      console.log(
        `${pad(c.id, 8)} ${pad(prof, 7)} ${pad(g, 11)} ${pad(ls[0].status, 14)} ` +
          ls.map((l) => `[${l.measure}] engine ${fig(l.engine)} | best ${fig(l.best)}${l.bound != null ? ` | bound ${fmt(l.bound)}` : ""} | gap ${fmt(l.gap)} (${l.gapPct.toFixed(2)}%) vs ${fmt(l.material)}`).join(" ;; ") +
          ` => ${head.verdict}${head.note ? ` (${head.note})` : ""}`
      );
    }
    console.log(`         ${c.id} ${prof}: ${ws.map((w) => `${w.variant} ${w.debts.length} debts ${w.units.length} cols`).join(", ")}, ${((Date.now() - t0) / 1000).toFixed(1)}s (LPs ${LPSTAT.n}, ${(LPSTAT.ms / 1000).toFixed(1)}s, max rows ${LPSTAT.rowsMax}, yalps fallbacks ${LPSTAT.fallback})`);
  }
}

const byGoal = new Map<string, Line[]>();
for (const l of outLines) byGoal.set(l.goal, [...(byGoal.get(l.goal) ?? []), l]);
console.log("\nSUMMARY (measures per goal: confirmed / beaten / miss; the largest gap)");
for (const [g, all] of Array.from(byGoal.entries())) {
  // (info) lines are a second, informational column: not counted as measures.
  const ls = all.filter((l) => !l.measure.startsWith("(info)"));
  const info = all.length - ls.length;
  const n = (v: RegExp) => ls.filter((l) => v.test(l.verdict)).length;
  const top = ls.filter((l) => /BEATEN|MISS|POWER:/.test(l.verdict)).sort((a, b) => b.gap - a.gap)[0];
  console.log(`  ${pad(g, 11)} ${ls.length} measures: confirmed ${n(/CONFIRMED/)}, beaten ${n(/BEATEN/)}, miss ${n(/MISS/)}, power ${n(/POWER:/)}${info ? ` (info: ${all.filter((l) => /^info: beaten/.test(l.verdict)).length} of ${info} beaten)` : ""}${top ? `; largest ${fmt(top.gap)} (${top.gapPct.toFixed(2)}%) ${top.id} ${top.profile} [${top.measure}]` : ""}`);
}
