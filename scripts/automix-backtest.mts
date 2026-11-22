// תמהיל אוטומטי — the walk-forward back-test. Prints figures only.
//
//   npx tsx --tsconfig tsconfig.json scripts/automix-backtest.mts [--quick | --full] [--cache DIR] [--json FILE]
//
//   --quick   every sixth origination month, the one-loan master, the default
//             profile: the shipped engine and walk-forward shocks (under a minute)
//   (none)    every origination month, every master and profile: the shipped
//             engine and walk-forward shocks (about a quarter of an hour)
//   --full    the same, plus the calibration grid on every third month (about
//             three quarters of an hour)
//   --cache   where the Bank of Israel downloads are kept (default: the OS temp
//             directory); every later run is offline
//   --json    also write every build's figures to FILE (for the written report)
//   --case 2019-07/a/default   print the engine's answers for one build and stop
//   --no-mlz-imputed           a sensitivity: the pre-2022 מל"צ priced out of the menu
//   --from / --to YYYY-MM      the origination months (default 2016-01 … the month before LAST)
//   --split YYYY-MM            the calibration split (default 2019-12)
//   --timing                   also print build times (the only non-deterministic lines)
//
// WHAT IT TESTS. The proofs (automix-check, -corpus, -verify) show the solver is
// exact and its figures are the board's. They cannot show that the mixes it
// picks are GOOD: that needs what happened afterwards. Here the real engine is
// run in every month t from 2016-01, with only what was knowable then, on
// synthetic masters (never a client file), and every proposal is priced again
// on the realised Bank of Israel rate, CPI and zero curves.
//
//   A. reconstruction  the market of month t rebuilt the way buildMarket()
//                      builds today's, and the engine's own pricingFor priced
//                      against that month's published system averages
//   B. leakage         what the clock and today's fee tables change in a run
//                      dated t, measured (E measures today's stress shocks)
//   C. per goal        each goal's own promise on realised numbers, against four
//                      advisor benchmarks on the same money, the same law and the
//                      same budget, against keeping the debt, and the regret
//                      against the best static mix in hindsight
//   C2. by year        the same on a scale-free measure, by origination year
//   D. choices         which tracks the engine took, year by year, against which
//                      track won in hindsight; what master (c) refinanced
//   E. shocks          the shipped shocks against walk-forward shocks
//   G. ex-ante rules   two rules the engine could adopt, built on the same grid
//                      from what was known at t: קיצור שנים under the five-year
//                      payment guard, and יציבות measured in payment over the life
//   F. calibration     (--full) λ per goal, walk-forward shocks and a base-case
//                      correction, chosen before a split date and scored after
//                      it, and the reverse
//
// THE METHOD.
//
//   Month t is a DATA month: its zero curve (ZCM monthly average), its system
//   rate per track (Power BI / TamInt010, as history.json holds them; the prime
//   track before 2022 from the Power BI benchmark + margin series), the BoI rate
//   on the run day, BIR_MRTG_99 two months older (the all-purpose premium and
//   the CPI-linked term), exactly the lags today's snapshot has. The engine runs
//   on the 22nd of t+1 (today's run: 22/11/2026 on October's data), with the
//   clock set to that day and the fee tables cut to the rows in force on it.
//
//   Realised, payment m is made on the 22nd of month t+1+m:
//     prime       the day-average BoI rate over the month before it, + 1.5 + margin
//     CPI-linked  indexed on the KNOWN index (the board's price.ts has no lag; a
//                 bank indexes on the last CPI published): CPI(t+m) / CPI(t)
//     mlz / mz    every 60 payments, the anchor of the curve of the month before
//                 the reset (bondAnchor, the engine's own) + the tranche's margin
//     fixed       never moves
//   Payments are realised through the last month every series covers (L); after
//   it the rest is priced on L's curve. Two views: "to date" = payments made +
//   balance still owed at L − the debt at t; "completed" = every payment − the
//   debt at t. Fees and setup costs are inside both (they are financed).
//   Rows are amortised by econ.ts scheduleOn — the engine's own twin of the board.
//
//   Masters: (a) one ₪1,000,000 prime loan at P+1.00, 25 years left;
//   (b) (a) plus two consumer loans (₪80,000 prime + 3.5 for 5 years, ₪40,000 at
//   9% for 3 years); (c) a ₪1,200,000 mortgage taken 5 years before t in thirds
//   (prime / קל"צ / ק"צ, 25 years) at that month's market, amortised on the
//   realised path to t, so prepayment fees and keep-versus-refinance matter.
//   Profiles: the default, and "bound": income at 45% PTI today and the property
//   at 72% LTV ((b): the all-purpose cap at 62% of the property).
//
// THE LIMITS. One realised path: 2016–2021 at the floor, the 2022–23 surge, a
// partial easing. Origination months are not independent (t and t+1 share all
// but one realised month), so 129 months are a handful of regimes, not 129
// trials. The last years of every completed cost are a forecast. The masters
// are synthetic and priced at the system average.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { buildAutoMix, DEFAULT_PROFILE, __test, type AutoMixInput, type AutoMixResult, type ClientProfile, type GoalId, type Proposal, type Tuning } from "../app/aa105test/lib/automix";
import { ECONOMIES, scheduleIn, scheduleOn, typedRow } from "../app/aa105test/lib/automix/econ";
import { EARLY } from "../app/aa105test/lib/automix/solve";
import { averageRateIn, newFixedRate } from "../app/aa105test/lib/automix/fees";
import { MIN_YEARS } from "../app/aa105test/lib/automix/rules";
import { bondAnchor, fitForecast, indexFactor, nominalAt, type Forecast, type ZeroPoint } from "../app/aa102test/lib/forecast";
import { intervalOf, firstResetOf, priceLoan, anchorReading } from "../app/aa102test/lib/price";
import { owedOnly, type ImportedLoan } from "../app/aa102test/lib/credit";
import { curveYield, round2, TRACKS, type MarketSnapshot, type TrackKey } from "../app/aa107test/lib/market";
import { perBank, nominalOf } from "../app/aa107test/lib/market-boi";

const argAfter = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};
const QUICK = process.argv.includes("--quick");
const FULL = process.argv.includes("--full");
const CACHE = argAfter("--cache") ?? path.join(os.tmpdir(), "automix-backtest");
const JSON_OUT = argAfter("--json");
/** `--case 2016-01/a/default`: print the engine's answers for one build and stop. */
const ONE_CASE = argAfter("--case");
/** `--no-mlz-imputed`: the pre-2022 מל"צ priced out of the menu instead of at its imputed margin (a sensitivity). */
const NO_MLZ_IMPUTED = process.argv.includes("--no-mlz-imputed");
/** `--timing`: also print how long the builds took (the only output that is not deterministic). */
const TIMING = process.argv.includes("--timing");

// The engine's own JSON objects (fees.ts and tiers/index read them through
// require): the run of month t sees the fee tables in force on its day.
const require = createRequire(import.meta.url);
type FeeTable = { rows: { effective: string; report: string | null; rates: number[] }[] };
const FEE = require("../app/aa105test/lib/automix/fee-rates.json") as Record<"unlinked" | "unlinkedOld" | "linked" | "linkedOld", FeeTable>;
const HISTORY = require("../app/aa105test/lib/automix/history.json") as {
  sources: { cpi: { yoy: number | null } };
  shocks: { rateUp: number; rateDown: number; cpiUp: number; cpiDown: number };
  market: Record<string, Partial<Record<"prime" | "klz" | "kz" | "mlz" | "mz", number>>>;
};
const FEE_KEYS = ["unlinked", "unlinkedOld", "linked", "linkedOld"] as const;
const FEE_FULL = Object.fromEntries(FEE_KEYS.map((k) => [k, FEE[k].rows.slice()])) as Record<(typeof FEE_KEYS)[number], FeeTable["rows"]>;
const CPI_YOY_TODAY = HISTORY.sources.cpi.yoy;

/* ------------------------------------------------------------ the clock */

// startOfToday(), tiers' termOf and the fee order read `new Date()`. Every
// build runs with the clock on its own day; nothing else in the process moves.
const RealDate = Date;
let FAKE_NOW: number | null = null;
class ClockDate extends RealDate {
  constructor(...a: unknown[]) {
    if (a.length === 0 && FAKE_NOW !== null) super(FAKE_NOW);
    else super(...(a as [number]));
  }
  static now() {
    return FAKE_NOW ?? RealDate.now();
  }
  static [Symbol.hasInstance](x: unknown) {
    return x instanceof RealDate;
  }
}
globalThis.Date = ClockDate as unknown as DateConstructor;

/* ------------------------------------------------------------ months */

const ym = (y: number, m: number) => `${y}-${String(m).padStart(2, "0")}`;
function ymAdd(a: string, k: number): string {
  const [y, m] = a.split("-").map(Number);
  const i = y * 12 + (m - 1) + k;
  return ym(Math.floor(i / 12), (i % 12) + 1);
}
const ymDiff = (a: string, b: string) => {
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (ya - yb) * 12 + (ma - mb);
};
const monthsFrom = (a: string, b: string) => Array.from({ length: Math.max(0, ymDiff(b, a) + 1) }, (_, i) => ymAdd(a, i));
/** The run day of data month t: the 22nd of the month after it. */
const runDay = (t: string) => `${ymAdd(t, 1)}-22`;
const dateOf = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new RealDate(y, m - 1, d, 12, 0, 0);
};
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDaysIso = (iso: string, k: number) => {
  const d = dateOf(iso);
  d.setDate(d.getDate() + k);
  return isoOf(d);
};

/* ------------------------------------------------------------ the data (cached) */

async function cached(name: string, fetcher: () => Promise<string>): Promise<string> {
  const file = path.join(CACHE, name);
  if (fs.existsSync(file)) return fs.readFileSync(file, "utf8");
  const text = await fetcher();
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(file, text);
  return text;
}
const http = (url: string, accept?: string) => async () => {
  for (let k = 0; ; k++) {
    try {
      const res = await fetch(url, { headers: accept ? { accept } : {}, signal: AbortSignal.timeout(180_000) });
      if (!res.ok) throw new Error(`${url.slice(0, 90)} → ${res.status}`);
      const text = await res.text();
      if (text.startsWith("<")) throw new Error(`${url.slice(0, 90)} → HTML`);
      return text;
    } catch (e) {
      if (k >= 2) throw e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
};
/** A CSV line, quotes respected. */
function cells(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out;
}
function table(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  const head = cells(lines[0]);
  return lines.slice(1).map((l) => {
    const c = cells(l);
    return Object.fromEntries(head.map((h, i) => [h, c[i] ?? ""]));
  });
}

const EDGE = "https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS";
const seriesUrl = (flow: string, code: string) => `${EDGE}/${flow}/1.0/?c%5BSERIES_CODE%5D=${code}&format=csv`;
const BIR_ALL = "https://edge.boi.gov.il/FusionEdgeServer/ws/public/sdmxapi/rest/data/BOI.STATISTICS,BIR_MRTG_99,1.0";
const NOMINAL_YEARS = [1, 2, 3, 4, 5, 7, 10, 15];
const REAL_YEARS = [1, 2, 3, 4, 5, 7, 10, 15, 20];
const zcCode = (k: "N" | "R", y: number) => `ZC_TSB_Z${k}D_${String(y).padStart(2, "0")}Y_MA`;

const [brText, cpiText, birText, pbiText, ...zcTexts] = await Promise.all([
  cached("BR.csv", http(seriesUrl("BR", "MNT_RIB_BOI_D"))),
  cached("CPI.csv", http(seriesUrl("PRI", "CP_1951"))),
  cached("BIR_MRTG_99.csv", http(BIR_ALL, "application/vnd.sdmx.data+csv")),
  cached("pbi.json", async () => JSON.stringify(await perBank())),
  ...NOMINAL_YEARS.map((y) => cached(`ZCM_${zcCode("N", y)}.csv`, http(seriesUrl("ZCM", zcCode("N", y))))),
  ...REAL_YEARS.map((y) => cached(`ZCM_${zcCode("R", y)}.csv`, http(seriesUrl("ZCM", zcCode("R", y))))),
]);

/** The BoI rate, every day (the series is daily, gaps filled forward). */
const BOI = new Map<string, number>();
{
  const rows = table(brText)
    .filter((r) => r.OBS_VALUE !== "")
    .map((r) => [r.TIME_PERIOD, Number(r.OBS_VALUE)] as [string, number])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  let day = rows[0][0];
  let k = 0;
  let v = rows[0][1];
  const last = rows[rows.length - 1][0];
  while (day <= last) {
    while (k < rows.length && rows[k][0] <= day) v = rows[k++][1];
    BOI.set(day, v);
    day = addDaysIso(day, 1);
  }
}
const BOI_LAST = Array.from(BOI.keys()).pop()!;
const boiOn = (day: string) => BOI.get(day > BOI_LAST ? BOI_LAST : day) ?? NaN;
/** Day-average BoI rate over [from, to). */
function boiAvg(from: string, to: string): number {
  let s = 0;
  let n = 0;
  for (let d = from; d < to; d = addDaysIso(d, 1)) {
    s += boiOn(d);
    n++;
  }
  return s / n;
}
const boiSince = (day: string) => {
  const v = boiOn(day);
  let d = day;
  while (boiOn(addDaysIso(d, -1)) === v && d > "1994-02-01") d = addDaysIso(d, -1);
  return d;
};

const CPI = new Map(table(cpiText).filter((r) => r.OBS_VALUE !== "").map((r) => [r.TIME_PERIOD, Number(r.OBS_VALUE)]));
const CPI_LAST = Array.from(CPI.keys()).sort().pop()!;

const ZC = new Map<string, number>();
for (const text of zcTexts) for (const r of table(text)) if (r.OBS_VALUE !== "") ZC.set(`${r.SERIES_CODE}|${r.TIME_PERIOD}`, Number(r.OBS_VALUE));
const ZC_LAST = Array.from(ZC.keys()).map((k) => k.split("|")[1]).sort().pop()!;
const curves = new Map<string, Forecast>();
/** Month t's Forecast: that month's published zero points through the engine's own fit (market-boi curves()). */
function curve(t: string): Forecast {
  const hit = curves.get(t);
  if (hit) return hit;
  const nom = NOMINAL_YEARS.map((y) => ZC.get(`${zcCode("N", y)}|${t}`));
  const real = REAL_YEARS.map((y) => ZC.get(`${zcCode("R", y)}|${t}`));
  if (nom.some((x) => x === undefined) || real.some((x) => x === undefined)) throw new Error(`ZCM: no complete curve for ${t}`);
  const fit = fitForecast(NOMINAL_YEARS.map((y, i) => [y, nom[i]!] as ZeroPoint), REAL_YEARS.map((y, i) => [y, real[i]!] as ZeroPoint));
  const f: Forecast = { asOf: t, source: "boi", label: t, ...fit };
  curves.set(t, f);
  return f;
}

const BIR = new Map<string, Map<string, number>>();
for (const r of table(birText)) {
  if (r.OBS_VALUE === "") continue;
  const code = r.SERIES_CODE.split("_").pop()!;
  if (!BIR.has(code)) BIR.set(code, new Map());
  BIR.get(code)!.set(r.TIME_PERIOD, Number(r.OBS_VALUE));
}
const bir = (code: string, t: string) => BIR.get(code)?.get(t);

/** The Power BI comparison's system series that history.json does not keep: 226/227 (prime margin and benchmark), 231/241 (CPI-linked / unlinked fixed average term). */
const PBI = new Map<string, Map<string, number>>();
for (const r of JSON.parse(pbiText) as { mmyy: string; series: string; obs: number | null }[]) {
  if (!r.series.startsWith("BNK_99034_") || r.obs === null) continue;
  const code = r.series.split("_").pop()!;
  if (!PBI.has(code)) PBI.set(code, new Map());
  PBI.get(code)!.set(`${r.mmyy.slice(3)}-${r.mmyy.slice(0, 2)}`, r.obs);
}
const pbi = (code: string, t: string) => PBI.get(code)?.get(t);

/** The last month every realised series covers: CPI, the BoI rate through the 22nd after it, the curve. */
const LAST = [CPI_LAST, ZC_LAST, ymAdd(BOI_LAST.slice(0, 7), BOI_LAST.slice(8) >= "22" ? -1 : -2)].sort()[0];
/** The latest curve: what every payment after LAST is priced on. */
const FINAL = curve(LAST);
const FL = FINAL;

/* ------------------------------------------------------------ the market of month t */

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : NaN;
};
const pctl = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  const k = (s.length - 1) * p;
  const lo = Math.floor(k);
  const hi = Math.ceil(k);
  return s[lo] + (s[hi] - s[lo]) * (k - lo);
};
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : NaN);

/**
 * The 5-year unlinked variable track has no published system rate before 2022
 * (Power BI starts it in 01/2022). Its margin over the engine's own anchor is
 * imputed for 2016–2021 as the median of 2022–2023: a FUTURE figure in the
 * menu of those years, stated and measured (section D counts how often it is
 * taken), never used as an outcome.
 */
const MLZ_IMPUTED = median(
  monthsFrom("2022-01", "2023-12")
    .filter((m) => HISTORY.market[m]?.mlz)
    .map((m) => nominalOf(HISTORY.market[m]!.mlz!) - bondAnchor(curve(m), 0, 60, false))
);

/** The system rate per track in month t, EFFECTIVE annual % as published; imputed tracks flagged. */
function systemAt(t: string): { rates: Record<TrackKey, number>; imputed: TrackKey[] } {
  const h = HISTORY.market[t] ?? {};
  const imputed: TrackKey[] = [];
  const prime = h.prime ?? (pbi("227", t) !== undefined && pbi("226", t) !== undefined ? pbi("227", t)! + pbi("226", t)! : NaN);
  let mlz = h.mlz ?? NaN;
  if (!Number.isFinite(mlz)) {
    imputed.push("mlz");
    const nominal = bondAnchor(curve(t), 0, 60, false) + MLZ_IMPUTED;
    mlz = (Math.pow(1 + nominal / 1200, 12) - 1) * 100;
  }
  return { rates: { prime, klz: h.klz ?? NaN, kz: h.kz ?? NaN, mlz, mz: h.mz ?? NaN }, imputed };
}

/** BIR_MRTG_99 as today's snapshot sees it: two months behind the level month. */
const birMonth = (t: string) => ymAdd(t, -2);

/** Month t's MarketSnapshot, calibrated exactly the way market-boi.ts buildMarket() calibrates today's. */
function marketAt(t: string): MarketSnapshot {
  const f = curve(t);
  const { rates: sysEff, imputed } = systemAt(t);
  // Sensitivity: the imputed מל"צ priced out of the menu (20 points over its anchor) instead.
  if (NO_MLZ_IMPUTED && imputed.includes("mlz")) sysEff.mlz = (Math.pow(1 + (bondAnchor(f, 0, 60, false) + 20) / 1200, 12) - 1) * 100;
  const sys = (k: TrackKey) => nominalOf(sysEff[k]);
  const b = birMonth(t);
  const kzTerm = bir("1491", b)!;
  const run = runDay(t);
  const boiNow = boiOn(run);
  const primeThen = boiOn(`${t}-15`) + 1.5;
  const premFixed = (bir("1811", b)! - bir("467", b)! + (bir("1909", b)! - bir("1492", b)!)) / 2;
  const premVar = bir("1905", b)! - bir("1488", b)!;
  return {
    builtAt: `${run}T12:00:00.000Z`,
    version: 2,
    sources: [],
    boi: { rate: boiNow, prime: boiNow + 1.5, since: boiSince(run) },
    levelPeriod: t,
    bankPeriod: t,
    housing: {
      klzSpread: sys("klz") - curveYield(f, 240, false),
      kzSpread: sys("kz") - curveYield(f, Math.round(kzTerm * 12), true),
      primeMargin: sys("prime") - primeThen,
      mlzMargin: sys("mlz") - bondAnchor(f, 0, 60, false),
      mzMargin: sys("mz") - bondAnchor(f, 0, 60, true),
      avg: { klz: sys("klz"), kz: sys("kz"), kzTermYears: kzTerm, klzRefTermYears: 20, prime: sys("prime"), mlz: sys("mlz"), mz: sys("mz") },
    },
    allPurposePremium: { prime: premVar, klz: premFixed, kz: premFixed, mlz: premVar, mz: premVar },
    bankDelta: {},
    bankIrr: {},
  };
}

/* ------------------------------------------------------------ the world as of month t */

/** Fee tables cut to the rows in force on `day` (newFixedRate then reads the newest three of them). */
function feeTablesAsOf(day: string | null) {
  for (const k of FEE_KEYS) {
    const rows = day === null ? FEE_FULL[k] : FEE_FULL[k].filter((r) => r.effective <= day);
    FEE[k].rows.splice(0, FEE[k].rows.length, ...rows);
  }
}
/** Set the engine's world to the run day of month t: the clock, the fee tables, the CPI y/y it quotes. */
function worldAt(t: string | null) {
  if (t === null) {
    FAKE_NOW = null;
    feeTablesAsOf(null);
    HISTORY.sources.cpi.yoy = CPI_YOY_TODAY;
    return;
  }
  FAKE_NOW = dateOf(runDay(t)).getTime();
  feeTablesAsOf(runDay(t));
  const a = CPI.get(ymAdd(t, -12));
  const c = CPI.get(t);
  HISTORY.sources.cpi.yoy = a && c ? Math.round((c / a - 1) * 10000) / 100 : null;
}

/**
 * Walk-forward shocks: the history script's own measure (avg BoI over t0…t0+59
 * minus the 5-year nominal zero at t0; realised 5-year CPI minus the 5-year
 * breakeven) on the windows that had CLOSED by the run of month t (t0 + 60 ≤ t).
 */
function shocksAt(t: string): { shocks: NonNullable<Tuning["shocks"]>; p50: { rate: number; cpi: number }; windows: number } {
  const rateErr: number[] = [];
  const cpiErr: number[] = [];
  for (const t0 of monthsFrom("2008-01", ymAdd(t, -60))) {
    const nom = ZC.get(`${zcCode("N", 5)}|${t0}`);
    const real = ZC.get(`${zcCode("R", 5)}|${t0}`);
    const c0 = CPI.get(t0);
    const c1 = CPI.get(ymAdd(t0, 60));
    if (nom === undefined || real === undefined || c0 === undefined || c1 === undefined) continue;
    const avg = mean(monthsFrom(t0, ymAdd(t0, 59)).map((m) => boiOn(`${m}-15`)));
    rateErr.push(avg - nom);
    cpiErr.push((Math.pow(c1 / c0, 1 / 5) - 1) * 100 - ((1 + nom / 100) / (1 + real / 100) - 1) * 100);
  }
  const r05 = (x: number) => Math.round(x * 20) / 20;
  return {
    shocks: { rateUp: r05(pctl(rateErr, 0.9)), rateDown: r05(pctl(rateErr, 0.1)), cpiUp: r05(pctl(cpiErr, 0.9)), cpiDown: r05(pctl(cpiErr, 0.1)) },
    p50: { rate: median(rateErr), cpi: median(cpiErr) },
    windows: rateErr.length,
  };
}

/* ------------------------------------------------------------ realised paths */

const isLinked = (p: number) => p === 3 || p === 5;
const FWD = (m: number, mL: number) => m - mL; // forward month on L's curve

/**
 * A row's realised rate path and CPI factors, from origination month t (run on
 * the 22nd of t+1; payment m on the 22nd of t+1+m), realised through LAST and
 * on LAST's curve after it.
 */
function realisedPaths(l: ImportedLoan, t: string, last = LAST, FL = FINAL): { rates: number[]; factors: number[] } {
  const n = Math.max(0, Math.round(Number(l.months) || 0));
  const p = Number(l.path_id);
  const mL = ymDiff(last, t);
  const rates: number[] = [];
  const factors: number[] = [];
  const typed = Number(l.rate) || 0;
  const stated = Number(l.anchor_margin);
  const hasMargin = l.anchor_margin !== null && l.anchor_margin !== undefined && Number.isFinite(stated);
  const V = p === 4 || p === 5 ? intervalOf(l as never) : 0;
  const s = V ? firstResetOf(l as never, V, dateOf(runDay(t))) : 0;
  // A bond track keeps the margin the board reads off it (price.ts anchorReading), as the engine priced it.
  const bondMargin = V ? anchorReading(l as never, curve(t))?.margin ?? typed - bondAnchor(curve(t), 0, V, p === 5) : 0;
  const primeMargin = hasMargin ? stated : typed - (boiOn(runDay(t)) + 1.5);
  let current = typed;
  for (let m = 1; m <= n; m++) {
    const realised = m <= mL;
    if (isLinked(p)) factors.push(realised ? CPI.get(ymAdd(t, m))! / CPI.get(ymAdd(t, m - 1))! : indexFactor(FL, FWD(m, mL)));
    else factors.push(1);
    if (p === 1) {
      const r = realised ? boiAvg(`${ymAdd(t, m)}-22`, `${ymAdd(t, m + 1)}-22`) : nominalAt(FL, FWD(m, mL));
      rates.push(r + 1.5 + primeMargin);
    } else if (V) {
      if (m > s && (m - s - 1) % V === 0) {
        const at = ymAdd(t, m - 1);
        current = (ymDiff(at, last) < 0 || (ymDiff(at, last) === 0 && mL > 0) ? bondAnchor(curve(at), 0, V, p === 5) : bondAnchor(FL, FWD(m, mL) - 1, V, p === 5)) + bondMargin;
      }
      rates.push(current);
    } else rates.push(typed);
  }
  return { rates, factors };
}

type Ev = { pay: number[]; bal: number[]; months: number; principal: number };
function evalRows(rows: ImportedLoan[], t: string): Ev {
  const pay: number[] = [];
  const bal: number[] = [];
  let months = 0;
  let principal = 0;
  for (const l of owedOnly(rows)) {
    const n = Math.round(Number(l.months) || 0);
    const P = Number(l.amount) || 0;
    if (n <= 0 || P <= 0) continue;
    const { rates, factors } = realisedPaths(l, t);
    const s = scheduleOn(l, rates, factors);
    for (let i = 0; i < n; i++) {
      pay[i] = (pay[i] ?? 0) + s.pay[i];
      bal[i] = (bal[i] ?? 0) + s.bal[i];
    }
    months = Math.max(months, n);
    principal += P;
  }
  for (let i = 0; i < months; i++) {
    pay[i] ??= 0;
    bal[i] ??= 0;
  }
  return { pay, bal, months, principal };
}

/** The realised CPI deflator to month-t shekels for payment m (forecast CPI past LAST). */
function deflators(t: string, n: number): number[] {
  const mL = ymDiff(LAST, t);
  const out: number[] = [];
  let k = 1;
  for (let m = 1; m <= n; m++) {
    k = m <= mL ? CPI.get(ymAdd(t, m))! / CPI.get(t)! : k * indexFactor(FL, FWD(m, mL));
    out.push(k);
  }
  return out;
}

/** What a mix did. `D` is the client's debt at t, the same for every mix of one master. */
type Real = {
  month1: number;
  peak5: number;
  /** The highest payment over the months actually realised (first 60 at most for the guard). */
  peak5Realised: number;
  maxRealised: number;
  /** The same, each payment deflated by realised CPI to month-t shekels. */
  peak5RealisedReal: number;
  maxRealisedReal: number;
  peakOverStart: number;
  worst12: number;
  costToDate: number;
  costDone: number;
  costReal: number;
  months: number;
  realisedShare: number;
};
function measure(e: Ev, t: string, D: number, defl: number[]): Real {
  const mL = Math.min(ymDiff(LAST, t), e.months);
  const pay = e.pay;
  const first60 = pay.slice(0, 60);
  const realised = pay.slice(0, Math.max(1, mL));
  let worst12 = 0;
  for (let i = 12; i < realised.length; i++) if (realised[i - 12] > 0) worst12 = Math.max(worst12, realised[i] / realised[i - 12] - 1);
  const paidToDate = pay.slice(0, mL).reduce((a, x) => a + x, 0);
  const owedAtL = mL > 0 ? e.bal[mL - 1] ?? 0 : D;
  const done = pay.reduce((a, x) => a + x, 0);
  return {
    month1: pay[0] ?? 0,
    peak5: Math.max(0, ...first60),
    peak5Realised: Math.max(0, ...pay.slice(0, Math.max(1, Math.min(60, mL)))),
    maxRealised: Math.max(0, ...realised),
    peak5RealisedReal: Math.max(0, ...pay.slice(0, Math.max(1, Math.min(60, mL))).map((x, i) => x / (defl[i] ?? 1))),
    maxRealisedReal: Math.max(0, ...realised.map((x, i) => x / (defl[i] ?? 1))),
    peakOverStart: pay[0] > 0 ? Math.max(...realised) / pay[0] : 1,
    worst12,
    costToDate: paidToDate + owedAtL - D,
    costDone: done - D,
    costReal: pay.reduce((a, x, i) => a + x / (defl[i] ?? 1), 0) - D,
    months: e.months,
    realisedShare: done > 0 ? paidToDate / done : 0,
  };
}

/* ------------------------------------------------------------ the masters */

type MasterId = "a" | "b" | "c";
type ProfileId = "default" | "bound";
type Master = { id: MasterId; rows: ImportedLoan[]; D: number; mortgage: number; loans: number };
const LENDER = "בנק לדוגמה";
const LOAN_LENDER = "חברת אשראי לדוגמה";
const INFLATION = 2;
const DISCOUNT = 4.5;

function row(over: Partial<ImportedLoan> & { id: string; path_id: number; amount: number; rate: number; months: number }): ImportedLoan {
  return {
    mix_id: "master",
    amortization_schedule_id: 1,
    grace_type_id: 1,
    grace_months: 0,
    group: "mortgage",
    purpose: "housing",
    source_bank: LENDER,
    anchor: null,
    anchor_margin: null,
    ...over,
  } as ImportedLoan;
}

/**
 * The prime-track margin of month s, nominal: Power BI's benchmark + margin
 * (from 2016) or history.json (from 2022). Before 2016 — needed only for master
 * (c)'s origination — BIR_MRTG_99's unlinked variable margin (series 347, a
 * subset that runs above the prime track) less its median distance from the
 * Power BI margin over 2016–2021: an estimate, for a synthetic client.
 */
const PRIME_PROXY_OFFSET = median(monthsFrom("2016-01", "2021-12").filter((m) => bir("347", m) !== undefined && pbi("226", m) !== undefined).map((m) => bir("347", m)! - pbi("226", m)!));
function primeMarginAt(s: string): number {
  const eff = systemAt(s).rates.prime;
  const prime = boiOn(`${s}-15`) + 1.5;
  if (Number.isFinite(eff)) return nominalOf(eff) - prime;
  // BIR_MRTG_99 starts in 07/2011: an earlier month takes the first one published (its own benchmark too).
  const at = monthsFrom(s, ymAdd(s, 12)).find((m) => bir("347", m) !== undefined && bir("348", m) !== undefined)!;
  const est = bir("348", at)! + bir("347", at)! - PRIME_PROXY_OFFSET;
  return nominalOf(est) - (boiOn(`${at}-15`) + 1.5);
}

function masterAt(id: MasterId, t: string): Master {
  const run = runDay(t);
  const prime = boiOn(run) + 1.5;
  const a = row({ id: "m-prime", path_id: 1, amount: 1_000_000, rate: round2(prime + 1), anchor: prime, anchor_margin: 1, months: 300 });
  if (id === "a") return { id, rows: [a], D: 1_000_000, mortgage: 1_000_000, loans: 0 };
  if (id === "b") {
    const l1 = row({ id: "l-prime", path_id: 1, amount: 80_000, rate: round2(prime + 3.5), anchor: prime, anchor_margin: 3.5, months: 60, group: "loan", purpose: "any", source_bank: LOAN_LENDER });
    const l2 = row({ id: "l-fixed", path_id: 2, amount: 40_000, rate: 9, months: 36, group: "loan", purpose: "any", source_bank: LOAN_LENDER });
    return { id, rows: [a, l1, l2], D: 1_120_000, mortgage: 1_000_000, loans: 120_000 };
  }
  // (c): ₪1,200,000 in thirds, 25 years, taken on the run day of month s = t − 60
  // at that month's market, then amortised on the realised path to t's run day.
  const s = ymAdd(t, -60);
  const start = runDay(s);
  const end = isoOf(new RealDate(dateOf(start).getFullYear(), dateOf(start).getMonth() + 300, 22));
  feeTablesAsOf(null);
  const klz = nominalOf(averageRateIn(false, 300, s)!);
  const kz = nominalOf(averageRateIn(true, 300, s)!);
  const pm = primeMarginAt(s);
  const prime0 = boiOn(start) + 1.5;
  const orig = [
    row({ id: "c-prime", path_id: 1, amount: 400_000, rate: round2(prime0 + pm), anchor: prime0, anchor_margin: round2(pm), months: 300 }),
    row({ id: "c-klz", path_id: 2, amount: 400_000, rate: round2(klz), months: 300 }),
    row({ id: "c-kz", path_id: 3, amount: 400_000, rate: round2(kz), months: 300 }),
  ];
  const rows = orig.map((l) => {
    const { rates, factors } = realisedPaths(l, s);
    const sch = scheduleOn(l, rates, factors);
    const bal = Math.round(sch.bal[59]);
    const realBal = l.path_id === 3 ? bal / (CPI.get(t)! / CPI.get(s)!) : bal;
    return {
      ...l,
      amount: bal,
      ...(l.path_id === 3 ? { indexation: Math.round(bal - realBal) } : {}),
      rate: l.path_id === 1 ? round2(prime + Number(l.anchor_margin)) : l.rate,
      ...(l.path_id === 1 ? { anchor: prime } : {}),
      months: 240,
      source_start_date: start,
      loan_end_date: end,
      end_date: end,
      source_orig_amount: 400_000,
    } as ImportedLoan;
  });
  const D = rows.reduce((x, l) => x + Number(l.amount), 0);
  return { id, rows, D, mortgage: D, loans: 0 };
}

const typedMonthly = (rows: ImportedLoan[]) => owedOnly(rows).filter((l) => Number(l.months) > 0 && Number(l.amount) > 0).reduce((a, l) => a + typedRow(l, INFLATION).monthly, 0);

function profileFor(p: ProfileId, m: Master): ClientProfile {
  if (p === "default") return { ...DEFAULT_PROFILE };
  const today = typedMonthly(m.rows);
  const value = m.id === "b" ? Math.round((m.mortgage + m.loans) / 0.62) : Math.round(m.mortgage / 0.72);
  return { ...DEFAULT_PROFILE, income: Math.round(today / 0.45), propertyValue: value };
}

/* ------------------------------------------------------------ one build */

const GOALS: GoalId[] = ["payment", "years", "savings", "balanced", "stable", "consolidate"];
type Bench = "keep" | "thirds" | "maxPrime" | "allKlz" | "primeKlz";
const SPLITS: Record<Exclude<Bench, "keep">, Partial<Record<TrackKey, number>>> = {
  thirds: { prime: 1 / 3, klz: 1 / 3, kz: 1 / 3 },
  maxPrime: { prime: 2 / 3, klz: 1 / 3 },
  allKlz: { klz: 1 },
  primeKlz: { prime: 1 / 3, klz: 2 / 3 },
};
const BENCHES = Object.keys(SPLITS) as Exclude<Bench, "keep">[];

type GoalKey = GoalId | "recommended";
type GoalOut = {
  goal: GoalKey;
  note?: string;
  /** A no-gain proposal's own mix, realised: what the shown-but-not-offered answer would have done. */
  shown?: Real;
  /** Master rows the answer refinances. */
  moved: string[];
  status: Proposal["status"] | "absent";
  /** The ceiling the goal was held to (payment: none). */
  ceiling: number | null;
  typed1: number;
  shares: Partial<Record<TrackKey, number>>;
  years: number[];
  refinanced: number;
  fees: number;
  real: Real;
  bench: Partial<Record<Bench, Real & { years: number; typed1: number; overBudget?: boolean }>>;
  frontier: { measure: number; shares: Partial<Record<TrackKey, number>>; years: number } | null;
  /** Section G: an ex-ante rule on the same grid (known at t only), realised. */
  alt?: { rule: string; shares: Partial<Record<TrackKey, number>>; years: number; typed1: number; real: Real };
  engineMeasure: number;
};
type Case = {
  t: string;
  master: MasterId;
  profile: ProfileId;
  variant: string;
  ok: boolean;
  ms: number;
  D: number;
  todayTyped: number;
  keep: Real;
  goals: GoalOut[];
  tier: string;
  recommended: GoalId | null;
};

/**
 * One ₪ of a housing tranche at month t: typed month one, realised payments and
 * cost, and — for the ex-ante rules of section G — the forecast cost and the
 * payment at the guard's months in each shipped economy (month one as typed, as
 * the engine's own guard reads it).
 */
type Unit = { typed1: number; pay: number[]; cost: number; costReal: number; baseCost: number; early: number[][]; life: number[][] };
/**
 * The engine's own view of a set of rows: payments at the guard's EARLY months
 * per shipped economy, every month's payment per economy (month one as typed),
 * and the forecast cost.
 */
function earlyOf(rows: ImportedLoan[], f: Forecast): { early: number[][]; life: number[][]; baseCost: number } {
  const early = ECONOMIES.map(() => EARLY.map(() => 0));
  const life = ECONOMIES.map(() => [] as number[]);
  let baseCost = 0;
  for (const l of owedOnly(rows)) {
    if (!(Number(l.months) > 0 && Number(l.amount) > 0)) continue;
    const typed = typedRow(l, INFLATION).monthly;
    ECONOMIES.forEach((e, k) => {
      const s = scheduleIn(l, f, e);
      if (k === 0) baseCost += s.pay.reduce((a, x) => a + x, 0);
      EARLY.forEach((m, j) => (early[k][j] += m === 1 ? typed : s.pay[m - 1] ?? 0));
      s.pay.forEach((x, i) => (life[k][i] = (life[k][i] ?? 0) + (i === 0 ? typed : x)));
    });
  }
  return { early, life, baseCost };
}
const unitCache = new Map<string, Map<string, Unit>>();

const SIX = 6;
const COMPOSITIONS: number[][] = [];
(function compose(prefix: number[], left: number, k: number) {
  if (k === 1) {
    COMPOSITIONS.push([...prefix, left]);
    return;
  }
  for (let a = 0; a <= left; a++) compose([...prefix, a], left - a, k - 1);
})([], SIX, TRACKS.length);

function runCase(t: string, mid: MasterId, pid: ProfileId, variant: string, tuning?: Tuning, withFrontier = true): Case {
  worldAt(t);
  const f = curve(t);
  const market = marketAt(t);
  const m = masterAt(mid, t);
  worldAt(t);
  const profile = profileFor(pid, m);
  const input: AutoMixInput = { master: m.rows, market, forecast: f, forecastOn: true, inflation: INFLATION, discountRate: DISCOUNT, profile, ...(tuning ? { tuning } : {}) };
  const t0 = performance.now();
  const res = buildAutoMix(input);
  const ms = performance.now() - t0;
  const prep = __test.prepare(input, f, []);
  // New housing money as the engine prices it on t's run day (fixed tracks read the fee tables in force then).
  const prices = new Map<string, { rate: number; anchor: number | null; margin: number | null }>();
  if (!("fail" in prep)) for (const track of TRACKS) for (let y = MIN_YEARS[track]; y <= 30; y++) prices.set(`${track}|${y}`, prep.ctx.pricing.rate(track, y, "housing"));
  worldAt(null);
  const D = m.D;
  const defl = deflators(t, 360);
  const keepEv = evalRows(m.rows, t);
  const keep = measure(keepEv, t, D, defl);
  const todayTyped = res.ok ? res.today.monthly : typedMonthly(m.rows);
  const out: Case = { t, master: mid, profile: pid, variant, ok: res.ok, ms, D, todayTyped, keep, goals: [], tier: res.pricing.tier, recommended: res.recommended };
  if (!res.ok || "fail" in prep) return out;
  const ctx = prep.ctx;
  const price = (track: TrackKey, y: number) => prices.get(`${track}|${y}`)!;

  // Unit schedules for this month (bank tier at the system average: the same for every master and profile).
  const ukey = `${t}|${ctx.pricing.tier.tier}`;
  let units = unitCache.get(ukey);
  if (!units) {
    units = new Map();
    worldAt(t);
    for (const track of TRACKS)
      for (let y = MIN_YEARS[track]; y <= 30; y++) {
        const r = __test.trancheRow(track, y, "housing", 1_000_000, price(track, y), `u-${track}-${y}`);
        const e = evalRows([r], t);
        const done = e.pay.reduce((a, x) => a + x, 0);
        units.set(`${track}|${y}`, {
          typed1: typedRow(r, INFLATION).monthly / 1e6,
          pay: e.pay.map((x) => x / 1e6),
          cost: done / 1e6,
          costReal: e.pay.reduce((a, x, i) => a + x / (defl[i] ?? 1), 0) / 1e6,
          ...(() => {
            const g = earlyOf([r], f);
            return { baseCost: g.baseCost / 1e6, early: g.early.map((xs) => xs.map((x) => x / 1e6)), life: g.life.map((xs) => xs.map((x) => x / 1e6)) };
          })(),
        });
      }
    worldAt(null);
    unitCache.set(ukey, units);
  }

  // Every goal, and the mix the sheet recommends (scored like balanced: its own payment, then cost).
  for (const key of [...GOALS, "recommended"] as GoalKey[]) {
    const rec = key === "recommended";
    const found = res.proposals.find((x) => x.goal === (rec ? res.recommended : key));
    if (!found && !rec) continue;
    const p = found ?? null;
    const goal: GoalId = rec ? "balanced" : (key as GoalId);
    const ok = p?.status === "ok";
    const rows = ok ? p!.rows : m.rows;
    const ev = evalRows(rows, t);
    const real = measure(ev, t, D, defl);
    const housing = ok ? p!.tranches.filter((x) => x.segment === "housing") : [];
    const N = housing.reduce((a, x) => a + x.amount, 0);
    const shares: Partial<Record<TrackKey, number>> = {};
    for (const x of housing) shares[x.track] = (shares[x.track] ?? 0) + x.amount / (N || 1);
    const refinanced = ok ? p!.moves.filter((x) => x.action !== "keep").length : 0;
    const moved = ok ? p!.moves.filter((x) => x.action !== "keep").map((x) => x.id) : [];
    const shown = p && p.status === "no-gain" && p.rows.length ? measure(evalRows(p.rows, t), t, D, defl) : undefined;
    const fees = ok ? p!.costs.prepaymentFees : 0;
    const ceiling = goal === "payment" ? null : p?.budget ?? null;
    const typed1 = ok ? p!.metrics.monthly : todayTyped;

    // The benchmarks' fixed part: the proposal's kept rows and its all-purpose tranches (or,
    // when the engine keeps everything, every mortgage debt refinanced in full).
    let baseRows: ImportedLoan[];
    let money: number;
    if (ok && housing.length) {
      baseRows = p!.rows.filter((r) => !(r.source_type === "תמהיל אוטומטי" && r.group !== "loan"));
      money = N;
    } else {
      const mort = ctx.debts.filter((d) => d.group === "mortgage" && !d.lock);
      baseRows = m.rows.filter((r) => !mort.some((d) => d.id === r.id));
      money = mort.reduce((a, d) => a + d.balance + d.fee, 0) + __test.SETUP_HOUSING;
    }
    const baseEv = evalRows(baseRows, t);
    const baseTyped = typedMonthly(baseRows);
    const target = goal === "payment" ? null : goal === "balanced" ? typed1 : ceiling;
    const bench: GoalOut["bench"] = { keep: { ...keep, years: 25, typed1: todayTyped } };
    const unitOf = (track: TrackKey, y: number) => units!.get(`${track}|${y}`)!;
    const mixOf = (sh: Partial<Record<TrackKey, number>>, y: number) => {
      const pay = baseEv.pay.slice();
      let typed = baseTyped;
      for (const [track, w] of Object.entries(sh) as [TrackKey, number][]) {
        if (!w) continue;
        const u = unitOf(track, y);
        typed += w * money * u.typed1;
        for (let i = 0; i < u.pay.length; i++) pay[i] = (pay[i] ?? 0) + w * money * u.pay[i];
      }
      for (let i = 0; i < pay.length; i++) pay[i] ??= 0;
      return { typed, pay };
    };
    const minYears = (sh: Partial<Record<TrackKey, number>>) => Math.max(...(Object.entries(sh) as [TrackKey, number][]).filter(([, w]) => w > 0).map(([k]) => MIN_YEARS[k]));
    if (goal !== "consolidate")
      for (const b of BENCHES) {
        const sh = SPLITS[b];
        let y = 30;
        let over = false;
        if (target !== null) {
          const fit = Array.from({ length: 31 - minYears(sh) }, (_, i) => minYears(sh) + i).find((yy) => mixOf(sh, yy).typed <= target + 0.5);
          if (fit === undefined) over = true;
          else y = fit;
        }
        const rowsB = [...baseRows, ...(Object.entries(sh) as [TrackKey, number][]).map(([track, w], i) => __test.trancheRow(track, y, "housing", w * money, price(track, y), `b-${b}-${i}`))];
        const r = measure(evalRows(rowsB, t), t, D, defl);
        bench[b] = { ...r, years: y, typed1: mixOf(sh, y).typed, ...(over ? { overBudget: true } : {}) };
      }

    const goalMeasure = (r: Real, kind: GoalId) =>
      kind === "payment" ? r.peak5 : kind === "years" ? r.months : kind === "stable" ? r.peakOverStart : r.costDone;
    // Hindsight: the best static mix on a grid of track shares (sixths) and one common term,
    // the same money, the same law (⅓ fixed) and guardrails (CPI ≤ ⅓, one track ≤ ⅔ but in stable),
    // and the goal's own ceiling on the typed month-one payment.
    let frontier: GoalOut["frontier"] = null;
    if (withFrontier && goal !== "consolidate" && money > 0) {
      const mL = Math.max(1, Math.min(ymDiff(LAST, t), 360));
      let best: { v: number; tie: number; sh: Partial<Record<TrackKey, number>>; y: number } | null = null;
      for (const c of COMPOSITIONS) {
        const [pr, kl, kzz, ml, mz] = c;
        if (kl + kzz < 2 || kzz + mz > 2) continue;
        if (goal !== "stable" && Math.max(...c) > 4) continue;
        const sh: Partial<Record<TrackKey, number>> = {};
        TRACKS.forEach((k, i) => c[i] && (sh[k] = c[i] / SIX));
        void pr;
        void ml;
        for (let y = minYears(sh); y <= 30; y++) {
          const mix = mixOf(sh, y);
          if (target !== null && mix.typed > target + 0.5) continue;
          const months = Math.max(y * 12, baseEv.months);
          const pay = mix.pay;
          let v: number;
          let tie = 0;
          if (goal === "payment") {
            v = Math.max(...pay.slice(0, 60));
            tie = pay[0];
          } else if (goal === "years") {
            const maxR = Math.max(...pay.slice(0, mL).map((x, i) => x / (defl[i] ?? 1)));
            if (ceiling !== null && maxR > 1.01 * ceiling) continue;
            v = months;
            tie = pay.reduce((a, x) => a + x, 0);
          } else if (goal === "stable") {
            v = Math.max(...pay.slice(0, mL)) / pay[0];
            tie = pay.reduce((a, x) => a + x, 0);
          } else {
            v = pay.reduce((a, x) => a + x, 0) - D;
          }
          if (!best || v < best.v - 1e-9 || (Math.abs(v - best.v) <= 1e-9 && tie < best.tie)) best = { v, tie, sh, y };
        }
      }
      if (best) frontier = { measure: best.v, shares: best.sh, years: best.y };
    }
    // G. Ex-ante rules the engine could adopt, on the same grid and money, from what was known at t:
    //   years + guard     the shortest common term whose payment stays within the ceiling at every
    //                     guard month of the next five years in every shipped economy (the guard the
    //                     payment and balanced goals already carry), then the lowest forecast cost;
    //   stable by payment the mix (no track cap) whose highest payment over its whole life, in the worst
    //                     shipped economy, over month one is lowest within the ceiling, then the lowest
    //                     forecast cost. (A five-year horizon was tried first: it took 5-year variable
    //                     tracks, which then reset into 2022–23.)
    let alt: GoalOut["alt"];
    if (withFrontier && (goal === "years" || goal === "stable") && !rec && ceiling !== null && money > 0) {
      const baseG = earlyOf(baseRows, f);
      let best: { v: number; tie: number; sh: Partial<Record<TrackKey, number>>; y: number; typed: number } | null = null;
      for (const c of COMPOSITIONS) {
        const [, kl, kzz, , mz] = c;
        if (kl + kzz < 2 || kzz + mz > 2) continue;
        if (goal === "years" && Math.max(...c) > 4) continue;
        const sh: Partial<Record<TrackKey, number>> = {};
        TRACKS.forEach((k, i) => c[i] && (sh[k] = c[i] / SIX));
        for (let y = minYears(sh); y <= 30; y++) {
          const typed = mixOf(sh, y).typed;
          if (typed > ceiling + 0.5) continue;
          let cost = baseG.baseCost;
          for (const [track, w] of Object.entries(sh) as [TrackKey, number][]) cost += w * money * unitOf(track, y).baseCost;
          let v: number;
          if (goal === "years") {
            // The guard: every EARLY month of the next five years, every economy.
            const early = baseG.early.map((xs) => xs.slice());
            for (const [track, w] of Object.entries(sh) as [TrackKey, number][]) unitOf(track, y).early.forEach((xs, k) => xs.forEach((x, j) => (early[k][j] += w * money * x)));
            if (Math.max(...early.flat()) > ceiling + 0.5) continue;
            v = Math.max(y * 12, baseEv.months);
          } else {
            // Stability in payment: the highest payment over the whole life, in the worst economy, over month one.
            const parts = (Object.entries(sh) as [TrackKey, number][]).map(([track, w]) => ({ w: w * money, u: unitOf(track, y).life }));
            let worst = 0;
            for (let k = 0; k < ECONOMIES.length; k++) {
              const n = Math.max(baseG.life[k].length, y * 12);
              const b = baseG.life[k];
              for (let i = 0; i < n; i++) {
                let x = b[i] ?? 0;
                for (const q of parts) x += q.w * (q.u[k][i] ?? 0);
                if (x > worst) worst = x;
              }
            }
            v = worst / typed;
          }
          if (!best || v < best.v - 1e-9 || (Math.abs(v - best.v) <= 1e-9 && cost < best.tie)) best = { v, tie: cost, sh, y, typed };
        }
      }
      if (best) {
        const rowsA = [...baseRows, ...(Object.entries(best.sh) as [TrackKey, number][]).map(([track, w], i) => __test.trancheRow(track, best!.y, "housing", w * money, price(track, best!.y), `g-${i}`))];
        alt = { rule: goal === "years" ? "years + guard" : "stable by payment", shares: best.sh, years: best.y, typed1: best.typed, real: measure(evalRows(rowsA, t), t, D, defl) };
      }
    }
    // The years goal's promise also needs the payment held: a realised breach scores as a fail, not a win.
    out.goals.push({
      ...(alt ? { alt } : {}),
      goal: key,
      status: p?.status ?? "absent",
      note: p?.note,
      ...(shown ? { shown } : {}),
      moved,
      ceiling,
      typed1,
      shares,
      years: Array.from(new Set(housing.map((x) => x.years))).sort((a, b) => a - b),
      refinanced,
      fees,
      real,
      bench,
      frontier,
      engineMeasure: goalMeasure(real, goal),
    });
  }
  return out;
}

/* ------------------------------------------------------------ printing helpers */

const nis = (x: number) => `${x < 0 ? "−" : ""}₪${Math.round(Math.abs(x)).toLocaleString("en-US")}`;
const pc = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
const f2 = (x: number) => (Number.isFinite(x) ? x.toFixed(2) : "n/a");
const pad = (s: string, n: number) => (s.length >= n ? s : s + " ".repeat(n - s.length));
const lpad = (s: string, n: number) => (s.length >= n ? s : " ".repeat(n - s.length) + s);
const section = (s: string) => console.log(`\n### ${s}`);
const line = (cols: string[], w: number[]) => console.log("  " + cols.map((c, i) => (i === 0 ? pad(c, w[i]) : lpad(c, w[i]))).join(" "));

/* ------------------------------------------------------------ the run */

const FROM = argAfter("--from") ?? "2016-01";
const TO = argAfter("--to") ?? ymAdd(LAST, -1);
const ALL_MONTHS = monthsFrom(FROM, TO);
const MONTHS = QUICK ? ALL_MONTHS.filter((_, i) => i % 6 === 0) : ALL_MONTHS;
const MASTERS: MasterId[] = QUICK ? ["a"] : ["a", "b", "c"];
const PROFILES: ProfileId[] = QUICK ? ["default"] : ["default", "bound"];
/** Headline aggregates: months with at least two years realised. */
const SCORED = (t: string) => ymDiff(LAST, t) >= 24;

console.log(`automix back-test · ${QUICK ? "quick" : FULL ? "full" : "standard"} · origination ${MONTHS[0]} … ${MONTHS[MONTHS.length - 1]} (${MONTHS.length} months) · realised through ${LAST}`);
console.log(`  data: BoI rate to ${BOI_LAST}, CPI to ${CPI_LAST}, zero curves to ${ZC_LAST}; BIR_MRTG_99 to ${Array.from(BIR.get("467")!.keys()).sort().pop()}`);
console.log(`  masters ${MASTERS.join(", ")} · profiles ${PROFILES.join(", ")} · typed inflation ${INFLATION}% · discount ${DISCOUNT}% (the board's defaults)`);
console.log(`  headline aggregates: origination months with ≥ 24 realised months (${MONTHS.filter(SCORED).length} of ${MONTHS.length})`);

if (ONE_CASE) {
  const [t, mid, pid] = ONE_CASE.split("/") as [string, MasterId, ProfileId];
  worldAt(t);
  const m = masterAt(mid, t);
  worldAt(t);
  const input: AutoMixInput = { master: m.rows, market: marketAt(t), forecast: curve(t), forecastOn: true, inflation: INFLATION, discountRate: DISCOUNT, profile: profileFor(pid ?? "default", m) };
  const res = buildAutoMix(input);
  worldAt(null);
  console.log(`  master ${mid}: ${m.rows.map((l) => `${l.id} ₪${Math.round(Number(l.amount)).toLocaleString("en-US")} @ ${l.rate}% ${l.months}m`).join(" · ")}`);
  console.log(`  today ${nis(res.today.monthly)} · tier ${res.pricing.tier} · prices ${res.pricing.rows.map((r) => `${r.track} ${r.rate10}/${r.rate20}/${r.rate30}`).join(" · ")}`);
  for (const p of res.proposals) {
    console.log(`  ${pad(p.goal, 12)} ${pad(p.status, 11)} ${nis(p.metrics.monthly)} (ceiling ${p.budget ?? "—"}) Δpaid ${nis(p.delta.totalPaid)} · ${p.tranches.map((x) => `${x.track} ${x.years}y ${nis(x.amount)} @${x.rate}`).join(", ")}`);
    if (p.note) console.log(`      note: ${p.note}`);
  }
  process.exit(0);
}

/* --- A. reconstruction */
section("A. reconstruction — month t's market through the engine's own pricingFor, against that month's published system average");
{
  const errs: Record<string, number[]> = {};
  const byYear: Record<string, Record<string, number[]>> = {};
  const push = (k: string, t: string, v: number) => {
    if (!Number.isFinite(v)) return;
    (errs[k] ??= []).push(v);
    ((byYear[t.slice(0, 4)] ??= {})[k] ??= []).push(v);
  };
  for (const t of ALL_MONTHS) {
    worldAt(t);
    const market = marketAt(t);
    const f = curve(t);
    const m = masterAt("a", t);
    worldAt(t);
    const input: AutoMixInput = { master: m.rows, market, forecast: f, forecastOn: true, inflation: INFLATION, discountRate: DISCOUNT, profile: { ...DEFAULT_PROFILE } };
    const prep = __test.prepare(input, f, []);
    if ("fail" in prep) continue;
    const pr = (track: TrackKey, y: number) => prep.ctx.pricing.rate(track, y, "housing").rate;
    const sys = systemAt(t);
    const nom = (k: TrackKey) => nominalOf(sys.rates[k]);
    const klzTerm = pbi("241", t);
    const kzTerm = pbi("231", t) ?? bir("1491", t);
    push("klz 20y", t, pr("klz", 20) - nom("klz"));
    push("kz 20y", t, pr("kz", 20) - nom("kz"));
    if (klzTerm) push("klz at avg term", t, pr("klz", Math.round(klzTerm)) - nom("klz"));
    if (kzTerm) push("kz at avg term", t, pr("kz", Math.round(kzTerm)) - nom("kz"));
    push("prime", t, pr("prime", 25) - nom("prime"));
    if (!sys.imputed.includes("mlz")) push("mlz", t, pr("mlz", 20) - nom("mlz"));
    push("mz", t, pr("mz", 20) - nom("mz"));
    // The table the fixed tracks were read from: its report month against t.
    push("fixed table lag (months)", t, ymDiff(t, (newFixedRate(false, 240).report ?? t).slice(0, 7)));
    worldAt(null);
  }
  const keys = Object.keys(errs);
  line(["error, pp (engine − published)", "n", "mean", "MAE", "max |e|"], [34, 5, 8, 8, 8]);
  for (const k of keys) line([k, String(errs[k].length), f2(mean(errs[k])), f2(mean(errs[k].map(Math.abs))), f2(Math.max(...errs[k].map(Math.abs)))], [34, 5, 8, 8, 8]);
  console.log("  by year, mean error pp (klz 20y · kz 20y · klz avg term · kz avg term · prime):");
  for (const [y, v] of Object.entries(byYear))
    console.log(`    ${y}  ${["klz 20y", "kz 20y", "klz at avg term", "kz at avg term", "prime"].map((k) => lpad(f2(mean(v[k] ?? [])), 6)).join(" ")}`);
  // Parity: with nothing realised (the "last month" set to t itself), the realised pricing must BE the
  // engine's own forecast schedule (price.ts forecastSchedule), row by row, to the agora.
  {
    let rows = 0;
    let worst = 0;
    for (const t of ALL_MONTHS.filter((_, i) => i % 12 === 0)) {
      worldAt(t);
      const f = curve(t);
      const prep = __test.prepare({ master: masterAt("c", t).rows, market: marketAt(t), forecast: f, forecastOn: true, inflation: INFLATION, discountRate: DISCOUNT, profile: { ...DEFAULT_PROFILE } }, f, []);
      worldAt(null);
      if ("fail" in prep) continue;
      const probe = [...prep.ctx.debts.map((d) => d.row), ...prep.ctx.cols.filter((c) => c.years % 6 === 0).map((c) => __test.trancheRow(c.track, c.years, c.segment, 500_000, c.price, c.key))];
      for (const l of probe) {
        const { rates, factors } = realisedPaths(l, t, t, f);
        const a = scheduleOn(l, rates, factors).pay;
        const b = priceLoan(l, { inflation: INFLATION, forecast: f }).schedule.map((x) => x.payment);
        let d = a.length === b.length ? 0 : Infinity;
        for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i] - b[i]));
        worst = Math.max(worst, d);
        rows++;
      }
    }
    console.log(`  parity, realised pricing with nothing realised vs the board's forecast schedule: ${rows} rows, worst monthly difference ₪${worst.toExponential(2)}`);
  }
  console.log(`  mlz before 2022: no published system rate; margin imputed at ${f2(MLZ_IMPUTED)} over the 5-year anchor (median 2022–2023).`);
  console.log(`  prime-margin proxy before 2016 (master c's origination only): BIR 347 less ${f2(PRIME_PROXY_OFFSET)} pp.`);
}

/* --- B. leakage */
section("B. leakage — the same build with today's clock, fee tables and CPI y/y left in, against the build dated t");
{
  const sample = ALL_MONTHS.filter((_, i) => i % 12 === 0);
  let goalsSeen = 0;
  let goalsChanged = 0;
  const dRate: number[] = [];
  const dCost: number[] = [];
  for (const t of sample)
    for (const mid of ["a", "c"] as MasterId[]) {
      const f = curve(t);
      worldAt(t);
      const market = marketAt(t);
      const m = masterAt(mid, t);
      worldAt(t);
      const input: AutoMixInput = { master: m.rows, market, forecast: f, forecastOn: true, inflation: INFLATION, discountRate: DISCOUNT, profile: { ...DEFAULT_PROFILE } };
      const klz20 = () => {
        const p = __test.prepare(input, f, []);
        return "fail" in p ? NaN : p.ctx.pricing.rate("klz", 20, "housing").rate;
      };
      const clean = buildAutoMix(input);
      const cleanKlz = klz20();
      worldAt(null);
      const leaky = buildAutoMix(input);
      const leakyKlz = klz20();
      if (Number.isFinite(cleanKlz) && Number.isFinite(leakyKlz)) dRate.push(leakyKlz - cleanKlz);
      for (const p of clean.proposals) {
        const q = leaky.proposals.find((x) => x.goal === p.goal);
        if (!q) continue;
        goalsSeen++;
        const key = (x: Proposal) => `${x.status}|${x.tranches.map((y) => `${y.track}${y.years}:${Math.round(y.amount / 1000)}`).join(",")}`;
        if (key(p) !== key(q)) goalsChanged++;
        if (p.status === "ok" && q.status === "ok") {
          const a = measure(evalRows(p.rows, t), t, m.D, deflators(t, 360)).costDone;
          const b = measure(evalRows(q.rows, t), t, m.D, deflators(t, 360)).costDone;
          dCost.push(b - a);
        }
      }
    }
  console.log(`  ${sample.length} months × masters a, c · default profile`);
  console.log(`  20-year קל"צ priced with today's fee tables instead of t's: mean ${f2(mean(dRate))} pp, range ${f2(Math.min(...dRate))} … ${f2(Math.max(...dRate))} pp`);
  console.log(`  goal answers that change: ${goalsChanged} of ${goalsSeen}; realised completed cost of the leaky answer minus the clean one: mean ${nis(mean(dCost))}, |max| ${nis(Math.max(0, ...dCost.map(Math.abs)))}`);
  console.log("  every build below runs with the clock, the fee tables and the CPI y/y of its own run day; the stress shocks are the shipped ones unless a section says otherwise (E measures them)");
}

/* --- C. the base runs */
const cases: Case[] = [];
const wfCases: Case[] = [];
const tStart = performance.now();
for (const t of MONTHS) {
  const wf = shocksAt(t);
  for (const mid of MASTERS)
    for (const pid of PROFILES) {
      cases.push(runCase(t, mid, pid, "shipped"));
      wfCases.push(runCase(t, mid, pid, "wf-shocks", { shocks: wf.shocks }, false));
    }
}
const buildMs = [...cases, ...wfCases].map((c) => c.ms);
console.log(`\n  ${cases.length + wfCases.length} builds${TIMING ? ` · engine ${f2(mean(buildMs) / 1000)} s mean, ${f2(Math.max(...buildMs) / 1000)} s max · ${f2((performance.now() - tStart) / 60000)} min with the realised pricing` : ""}`);
const failed = cases.filter((c) => !c.ok);
if (failed.length) console.log(`  builds that failed: ${failed.map((c) => `${c.t}/${c.master}/${c.profile}`).join(", ")}`);

type Agg = { n: number; mean: number; median: number; worst: number };
const agg = (xs: number[], worstIsMax = true): Agg => ({ n: xs.length, mean: mean(xs), median: median(xs), worst: xs.length ? (worstIsMax ? Math.max(...xs) : Math.min(...xs)) : NaN });

/** Why a proposal read no-gain, from its note (the engine's own sentence). */
function noteClass(note?: string): string {
  if (!note) return "none";
  if (note.includes("המוקלדת")) return "typed read-out contradicts the forecast";
  if (note.includes("בערך נוכחי")) return "PV gate";
  if (note.includes("חוזרות")) return "break-even";
  if (note.includes("אין הקלה")) return "no relief without paying more";
  if (note.includes("ההקלה בהחזר עולה")) return "relief costs more";
  if (note.includes("יקרה מדי")) return "stability too dear";
  if (note.includes("פחות מהסף") || note.includes("פחות משנה")) return "below the materiality threshold";
  if (note.includes("שום מהלך")) return "nothing improves";
  if (note.includes("חורג מהמסגרת")) return "over its own ceiling after rounding";
  if (note.includes("נגמר בעוד")) return "a kept debt holds the end";
  return "other";
}

function goalTable(key: GoalKey, pool: Case[]) {
  // The recommended mix is scored on balanced's rule: its own payment, then cost.
  const goal: GoalId = key === "recommended" ? "balanced" : key;
  const groups = new Map<string, Case[]>();
  for (const c of pool) if (c.ok && SCORED(c.t)) (groups.get(`${c.master}/${c.profile}`) ?? groups.set(`${c.master}/${c.profile}`, []).get(`${c.master}/${c.profile}`)!).push(c);
  groups.set("all", pool.filter((c) => c.ok && SCORED(c.t)));
  const isCost = goal === "savings" || goal === "balanced" || goal === "consolidate";
  for (const [k, all] of groups) {
    const cs = all.filter((c) => c.goals.some((g) => g.goal === key));
    const gs = cs.map((c) => c.goals.find((g) => g.goal === key)!);
    if (!gs.length) continue;
    const st = { ok: gs.filter((g) => g.status === "ok").length, nogain: gs.filter((g) => g.status === "no-gain").length, un: gs.filter((g) => g.status === "unavailable").length };
    console.log(`  ${k} · ${gs.length} months · ok ${st.ok} · no-gain ${st.nogain} · unavailable ${st.un}${key === "recommended" ? ` · recommended: ${Object.entries(cs.reduce<Record<string, number>>((a, c) => ((a[c.recommended ?? "none"] = (a[c.recommended ?? "none"] ?? 0) + 1), a), {})).map(([g, n]) => `${g} ${n}`).join(", ")}` : ""}`);
    const ng = gs.map((g, i) => ({ g, c: cs[i] })).filter((x) => x.g.status === "no-gain");
    if (ng.length) {
      const classes = ng.reduce<Record<string, number>>((a, x) => ((a[noteClass(x.g.note)] = (a[noteClass(x.g.note)] ?? 0) + 1), a), {});
      const forgone = ng.filter((x) => x.g.shown).map((x) => x.c.keep.costDone - x.g.shown!.costDone);
      console.log(`    no-gain, why: ${Object.entries(classes).map(([k2, n]) => `${k2} ${n}`).join(", ")}${forgone.length ? ` · the shown mix vs keeping, realised completed cost: cheaper in ${forgone.filter((x) => x > 0).length} of ${forgone.length}, mean saving forgone ${nis(mean(forgone))}` : ""}`);
    }
    if (goal === "payment") {
      const relief = gs.map((g, i) => cs[i].todayTyped - g.real.month1);
      const over = gs.map((g, i) => g.real.peak5Realised / cs[i].todayTyped - 1);
      const overReal = gs.map((g, i) => g.real.peak5RealisedReal / cs[i].todayTyped - 1);
      console.log(`    realised month one vs the payment before: mean ${nis(mean(relief))} lower, median ${nis(median(relief))}, least ${nis(Math.min(...relief))}`);
      console.log(`    realised peak in the first 60 months (realised part) over the payment before: mean ${pc(mean(over))}, worst ${pc(Math.max(...over))}; the 5-year guard broken (by > 1%) in ${over.filter((x) => x > 0.01).length} of ${gs.length} months, in real terms in ${overReal.filter((x) => x > 0.01).length}`);
    } else if (goal === "years") {
      const months = gs.map((g) => g.real.months);
      const held = gs.filter((g) => g.ceiling !== null);
      const nomOver = held.map((g) => g.real.maxRealised / g.ceiling! - 1);
      const realOver = held.map((g) => g.real.maxRealisedReal / g.ceiling! - 1);
      console.log(`    months to finish: mean ${f2(mean(months))}, median ${median(months)}; realised payment above the ceiling it was held to (by > 1%): ${nomOver.filter((x) => x > 0.01).length} of ${held.length} months nominal (worst ${pc(Math.max(...nomOver))}), ${realOver.filter((x) => x > 0.01).length} in real terms (worst ${pc(Math.max(...realOver))})`);
    } else if (goal === "stable") {
      console.log(`    realised peak over month one: mean ${f2(mean(gs.map((g) => g.real.peakOverStart)))}, worst ${f2(Math.max(...gs.map((g) => g.real.peakOverStart)))} · worst 12-month rise: mean ${pc(mean(gs.map((g) => g.real.worst12)))}, worst ${pc(Math.max(...gs.map((g) => g.real.worst12)))}`);
    } else if (goal === "balanced" || goal === "consolidate") {
      const relief = gs.map((g, i) => cs[i].todayTyped - g.real.month1);
      const dk = gs.map((g, i) => g.real.costDone - cs[i].keep.costDone);
      console.log(`    realised relief in month one: mean ${nis(mean(relief))} · realised completed cost vs keeping today's debt: mean ${nis(mean(dk))}, worst ${nis(Math.max(...dk))}; costs more than keeping in ${dk.filter((x) => x > 0).length} of ${gs.length}`);
    }
    if (goal === "consolidate") continue;
    // Against the benchmarks, on the goal's own measure.
    const better = (a: number, b: number) => a < b - (goal === "years" ? 0 : goal === "stable" ? 1e-6 : 1);
    // קיצור שנים keeps two promises: the ceiling held (in real terms, within 1%), then the earlier end.
    const broke = (r: Real, g: GoalOut) => (g.ceiling !== null && r.maxRealisedReal > 1.01 * g.ceiling ? 1 : 0);
    const yScore = (r: Real, g: GoalOut) => broke(r, g) * 1000 + r.months;
    const rowsOut: string[][] = [];
    for (const b of ["keep", ...BENCHES] as Bench[]) {
      const pairs = gs.map((g) => ({ e: g.engineMeasure, b: g.bench[b] ? (goal === "payment" ? g.bench[b]!.peak5 : goal === "years" ? g.bench[b]!.months : goal === "stable" ? g.bench[b]!.peakOverStart : g.bench[b]!.costDone) : NaN, g })).filter((x) => Number.isFinite(x.b));
      const d = pairs.map((x) => x.e - x.b);
      const win = (x: (typeof pairs)[number]) => (goal === "years" ? yScore(x.g.real, x.g) < yScore(x.g.bench[b]!, x.g) : better(x.e, x.b));
      const loss = (x: (typeof pairs)[number]) => (goal === "years" ? yScore(x.g.bench[b]!, x.g) < yScore(x.g.real, x.g) : better(x.b, x.e));
      const beaten = pairs.filter(win).length;
      const lost = pairs.filter(loss).length;
      const extra = goal === "years" ? ` · over ceiling, real ${pairs.filter((x) => x.g.ceiling !== null && x.g.bench[b]!.maxRealisedReal > 1.01 * x.g.ceiling).length}` : "";
      rowsOut.push([b, goal === "stable" ? f2(mean(d)) : goal === "years" ? f2(mean(d)) : nis(mean(d)), goal === "stable" || goal === "years" ? f2(median(d)) : nis(median(d)), goal === "stable" || goal === "years" ? f2(Math.max(...d)) : nis(Math.max(...d)), `${beaten}/${lost}/${pairs.length}${extra}`]);
    }
    const unit = goal === "payment" ? "peak 60m ₪" : goal === "years" ? "months" : goal === "stable" ? "peak/start" : "completed cost ₪";
    line([`    engine − benchmark (${unit})`, "mean", "median", "worst", "beat/lost/n"], [40, 11, 11, 11, 18]);
    for (const r of rowsOut) line([`      ${r[0]}`, r[1], r[2], r[3], r[4]], [40, 11, 11, 11, 18]);
    const reg = gs.filter((g) => g.frontier && (goal !== "years" || !broke(g.real, g))).map((g) => g.engineMeasure - g.frontier!.measure);
    if (reg.length) {
      const fmt = (x: number) => (goal === "years" || goal === "stable" ? f2(x) : nis(x));
      line([`      regret vs hindsight grid${goal === "years" ? " (ceiling held)" : ""}`, fmt(mean(reg)), fmt(median(reg)), fmt(Math.max(...reg)), `${reg.filter((x) => x <= 0).length} at or below`], [40, 11, 11, 11, 18]);
    }
    if (goal === "years") console.log(`      engine broke the ceiling (real, > 1%) in ${gs.filter((g) => broke(g.real, g)).length} of ${gs.length}; beat/lost count a broken ceiling as a loss before months`);
    if (isCost) {
      const dReal = gs.map((g) => g.real.costReal - (g.bench.thirds?.costReal ?? NaN)).filter(Number.isFinite);
      const dDate = gs.map((g) => g.real.costToDate - (g.bench.thirds?.costToDate ?? NaN)).filter(Number.isFinite);
      console.log(`      vs thirds in real (CPI-deflated) cost: mean ${nis(mean(dReal))}; to date only: mean ${nis(mean(dDate))}`);
    }
  }
}

for (const key of [...GOALS, "recommended"] as GoalKey[]) {
  section(`C. ${key} — realised, the shipped engine (every month; aggregates over months with ≥ 24 realised)`);
  goalTable(key, cases);
}

/* --- C2. by origination year */
section("C2. by origination year — every master and profile pooled, on a scale-free measure (cost per ₪ of debt; payment peaks over the payment before; stable peak over month one)");
{
  const years = Array.from(new Set(MONTHS.map((t) => t.slice(0, 4))));
  const scale = (goal: GoalId, r: Real, c: Case) => (goal === "payment" ? r.peak5 / c.todayTyped : goal === "stable" ? r.peakOverStart : goal === "years" ? r.months : r.costDone / c.D);
  for (const key of [...GOALS, "recommended"] as GoalKey[]) {
    const goal: GoalId = key === "recommended" ? "balanced" : key;
    const head = goal === "years" ? "months (real breach share)" : goal === "payment" ? "peak 60m / before" : goal === "stable" ? "peak / month one" : "completed cost / debt";
    console.log(`  ${key} — ${head}: year  engine   keep ${BENCHES.map((b) => lpad(b, 8)).join(" ")}  hindsight`);
    for (const y of years) {
      const xs = cases.filter((c) => c.ok && c.t.startsWith(y)).map((c) => ({ c, g: c.goals.find((g) => g.goal === key) })).filter((x): x is { c: Case; g: GoalOut } => !!x.g);
      if (!xs.length) continue;
      const fmt = (v: number) => (goal === "years" ? lpad(v.toFixed(0), 7) : lpad(v.toFixed(3), 7));
      const e = mean(xs.map((x) => scale(goal, x.g.real, x.c)));
      const k = mean(xs.map((x) => scale(goal, x.c.keep, x.c)));
      const bs = BENCHES.map((b) => {
        const v = xs.filter((x) => x.g.bench[b]).map((x) => scale(goal, x.g.bench[b]!, x.c));
        return v.length ? lpad(fmt(mean(v)), 8) : lpad("—", 8);
      });
      const fr = xs.filter((x) => x.g.frontier).map((x) => (goal === "years" ? x.g.frontier!.measure : goal === "stable" ? x.g.frontier!.measure : goal === "payment" ? x.g.frontier!.measure / x.c.todayTyped : x.g.frontier!.measure / x.c.D));
      const breach = goal === "years" ? ` (${pc(xs.filter((x) => x.g.ceiling !== null && x.g.real.maxRealisedReal > 1.01 * x.g.ceiling).length / xs.length, 0)})` : "";
      const done = mean(xs.map((x) => x.g.real.realisedShare));
      console.log(`      ${y} ${fmt(e)}${breach} ${fmt(k)} ${bs.join(" ")}  ${fr.length ? fmt(mean(fr)) : "      —"}   (${xs.length} builds, ${pc(done, 0)} of the engine's payments realised)`);
    }
  }
}

/* --- D. choices */
section("D. choices — the engine's share of new housing money by track, by origination year (all masters and profiles, ok proposals), and the track that won in hindsight");
{
  const years = Array.from(new Set(MONTHS.map((t) => t.slice(0, 4))));
  for (const goal of GOALS.filter((g) => g !== "consolidate")) {
    console.log(`  ${goal}: year  prime   klz    kz   mlz    mz   term(y)`);
    for (const y of years) {
      const gs = cases.filter((c) => c.t.startsWith(y)).flatMap((c) => c.goals.filter((g) => g.goal === goal && g.status === "ok" && Object.keys(g.shares).length));
      if (!gs.length) continue;
      const sh = (k: TrackKey) => mean(gs.map((g) => g.shares[k] ?? 0));
      console.log(`         ${y}  ${TRACKS.map((k) => lpad(pc(sh(k), 0), 5)).join(" ")}  ${lpad(f2(mean(gs.map((g) => mean(g.years)))), 6)}`);
    }
  }
  // Which single track at 25 years cost least, completed (nominal), per origination year.
  console.log("  cheapest single track in hindsight, ₪1 at 25 years, completed nominal cost per shekel (mean over the year's months):");
  console.log("         year  prime   klz    kz   mlz    mz   winner (months won of the year)");
  for (const y of years) {
    const ms = MONTHS.filter((t) => t.startsWith(y));
    const cost: Record<TrackKey, number[]> = { prime: [], klz: [], kz: [], mlz: [], mz: [] };
    const wins: Record<string, number> = {};
    for (const t of ms) {
      const u = unitCache.get(`${t}|bank`);
      if (!u) continue;
      let best: TrackKey = "prime";
      for (const k of TRACKS) {
        const c = u.get(`${k}|25`)!.cost - 1;
        cost[k].push(c);
        if (c < u.get(`${best}|25`)!.cost - 1) best = k;
      }
      wins[best] = (wins[best] ?? 0) + 1;
    }
    console.log(`         ${y}  ${TRACKS.map((k) => lpad(f2(mean(cost[k])), 5)).join(" ")}   ${Object.entries(wins).map(([k, v]) => `${k} ${v}`).join(", ")}`);
  }
  // Master (c): which of the five-year-old tracks each goal refinanced, and what it paid to.
  const cc = cases.filter((c) => c.master === "c" && c.ok && SCORED(c.t));
  if (cc.length) {
    console.log("  master c (5-year-old prime / קל\"צ / ק\"צ): share of months each track is refinanced, mean prepayment fee when any is, realised cost vs keeping");
    for (const goal of GOALS.filter((g) => g !== "consolidate")) {
      const gs = cc.map((c) => ({ c, g: c.goals.find((x) => x.goal === goal) })).filter((x): x is { c: Case; g: GoalOut } => !!x.g);
      if (!gs.length) continue;
      const share = (id: string) => pc(gs.filter((x) => x.g.moved.includes(id)).length / gs.length, 0);
      const paid = gs.filter((x) => x.g.fees > 0).map((x) => x.g.fees);
      const dk = gs.map((x) => x.g.real.costDone - x.c.keep.costDone);
      console.log(`    ${pad(goal, 9)} prime ${lpad(share("c-prime"), 4)} · klz ${lpad(share("c-klz"), 4)} · kz ${lpad(share("c-kz"), 4)} · fee ${paid.length ? nis(mean(paid)) : "—"} (${paid.length}) · vs keep ${nis(mean(dk))} mean, cheaper in ${dk.filter((x) => x < -1).length}/${dk.length}`);
    }
  }
  const preMlz = cases.filter((c) => c.t < "2022-01").flatMap((c) => c.goals.filter((g) => g.status === "ok" && (g.shares.mlz ?? 0) > 0));
  console.log(`  goal answers before 2022 that take מל"צ (priced on the imputed margin): ${preMlz.length}`);
}

/* --- E. shocks */
section("E. shocks — shipped (2008–2021 windows, look-ahead before 2026) against walk-forward (windows closed by t)");
{
  const sample = MONTHS.filter((_, i) => i % 12 === 0);
  console.log("  walk-forward shocks by origination month (rate up / down, CPI up / down, windows):");
  for (const t of sample) {
    const w = shocksAt(t);
    console.log(`    ${t}  ${[w.shocks.rateUp, w.shocks.rateDown, w.shocks.cpiUp, w.shocks.cpiDown].map((x) => lpad(f2(x), 6)).join(" ")}  ${lpad(String(w.windows), 4)}   median error rate ${f2(w.p50.rate)}, CPI ${f2(w.p50.cpi)}`);
  }
  console.log(`    shipped     ${[HISTORY.shocks.rateUp, HISTORY.shocks.rateDown, HISTORY.shocks.cpiUp, HISTORY.shocks.cpiDown].map((x) => lpad(f2(x), 6)).join(" ")}`);
  for (const goal of GOALS) {
    let same = 0;
    let n = 0;
    const d: number[] = [];
    for (let i = 0; i < cases.length; i++) {
      const a = cases[i].goals.find((g) => g.goal === goal);
      const b = wfCases[i].goals.find((g) => g.goal === goal);
      if (!a || !b || !SCORED(cases[i].t)) continue;
      n++;
      const key = (g: GoalOut) => `${g.status}|${JSON.stringify(g.shares, (_, v) => (typeof v === "number" ? Math.round(v * 100) : v))}|${g.years.join(",")}`;
      if (key(a) === key(b)) same++;
      d.push(goal === "stable" ? b.real.peakOverStart - a.real.peakOverStart : goal === "payment" ? b.real.peak5 - a.real.peak5 : goal === "years" ? b.real.months - a.real.months : b.real.costDone - a.real.costDone);
    }
    if (!n) continue;
    const fmt = (x: number) => (goal === "stable" || goal === "years" ? f2(x) : nis(x));
    console.log(`  ${pad(goal, 12)} same answer ${same}/${n} · walk-forward − shipped on the goal's measure: mean ${fmt(mean(d))}, median ${fmt(median(d))}, range ${fmt(Math.min(...d))} … ${fmt(Math.max(...d))}`);
  }
}

/* --- G. ex-ante rules */
section("G. ex-ante rules on the same grid, from what was known at t (shipped shocks) — a guard on קיצור שנים, and יציבות measured in payment");
for (const goal of ["years", "stable"] as GoalId[]) {
  const groups = new Map<string, { c: Case; g: GoalOut }[]>();
  for (const c of cases) {
    if (!c.ok || !SCORED(c.t)) continue;
    const g = c.goals.find((x) => x.goal === goal);
    if (!g?.alt) continue;
    for (const k of [`${c.master}/${c.profile}`, "all"]) (groups.get(k) ?? groups.set(k, []).get(k)!).push({ c, g });
  }
  console.log(`  ${goal} — engine | ${goal === "years" ? "years + guard" : "stable by payment"}`);
  for (const [k, xs] of groups) {
    const broke = (r: Real, g: GoalOut) => r.maxRealisedReal > 1.01 * (g.ceiling ?? Infinity);
    const dCost = xs.map((x) => x.g.alt!.real.costDone - x.g.real.costDone);
    const prime = (sh: Partial<Record<TrackKey, number>>) => sh.prime ?? 0;
    if (goal === "years")
      console.log(
        `    ${pad(k, 11)} n ${lpad(String(xs.length), 3)} · months ${f2(mean(xs.map((x) => x.g.real.months)))} | ${f2(mean(xs.map((x) => x.g.alt!.real.months)))} · ceiling broken (real, > 1%) ${xs.filter((x) => broke(x.g.real, x.g)).length} | ${xs.filter((x) => broke(x.g.alt!.real, x.g)).length} · worst overshoot ${pc(Math.max(...xs.map((x) => x.g.real.maxRealisedReal / x.g.ceiling! - 1)))} | ${pc(Math.max(...xs.map((x) => x.g.alt!.real.maxRealisedReal / x.g.ceiling! - 1)))} · prime ${pc(mean(xs.map((x) => prime(x.g.shares))), 0)} | ${pc(mean(xs.map((x) => prime(x.g.alt!.shares))), 0)} · completed cost, rule − engine: mean ${nis(mean(dCost))}`
      );
    else
      console.log(
        `    ${pad(k, 11)} n ${lpad(String(xs.length), 3)} · peak/start mean ${f2(mean(xs.map((x) => x.g.real.peakOverStart)))} | ${f2(mean(xs.map((x) => x.g.alt!.real.peakOverStart)))}, worst ${f2(Math.max(...xs.map((x) => x.g.real.peakOverStart)))} | ${f2(Math.max(...xs.map((x) => x.g.alt!.real.peakOverStart)))} · worst 12-month rise ${pc(Math.max(...xs.map((x) => x.g.real.worst12)))} | ${pc(Math.max(...xs.map((x) => x.g.alt!.real.worst12)))} · prime ${pc(mean(xs.map((x) => prime(x.g.shares))), 0)} | ${pc(mean(xs.map((x) => prime(x.g.alt!.shares))), 0)} · completed cost, rule − engine: mean ${nis(mean(dCost))}, median ${nis(median(dCost))}`
      );
  }
}

/* --- F. calibration */
type Variant = { id: string; family: "lambda" | "shift"; tuning: (t: string) => Tuning | undefined };
const LAMBDAS = [0, 0.15, 0.25, 0.35, 0.5, 0.75, 0.95];
const CAL_GOALS: GoalId[] = ["years", "savings", "balanced", "stable", "consolidate", "payment"];
/** A goal's realised loss, scale-free: cost per shekel of debt; stable its peak over month one; payment its 60-month peak over the payment before. */
const lossOf = (goal: GoalId, g: GoalOut, c: Case) =>
  goal === "stable" ? g.real.peakOverStart : goal === "payment" ? g.real.peak5 / c.todayTyped : g.real.costDone / c.D;
if (FULL) {
  section("F. calibration — every third month, every master and profile; choose on one side of a split, score on the other");
  const calMonths = ALL_MONTHS.filter((_, i) => i % 3 === 0).filter(SCORED);
  const variants: Variant[] = [
    ...LAMBDAS.map((l) => ({ id: `λ=${l}`, family: "lambda" as const, tuning: () => ({ lambda: Object.fromEntries(GOALS.map((g) => [g, l])) as Tuning["lambda"] }) })),
    { id: "shift ½·median", family: "shift", tuning: (t) => { const w = shocksAt(t); return { shocks: w.shocks, baseShift: { rate: 0.5 * w.p50.rate, cpi: 0.5 * w.p50.cpi } }; } },
    { id: "shift 1·median", family: "shift", tuning: (t) => { const w = shocksAt(t); return { shocks: w.shocks, baseShift: { rate: w.p50.rate, cpi: w.p50.cpi } }; } },
  ];
  const runs = new Map<string, Case[]>();
  const shipped = cases.filter((c) => calMonths.includes(c.t));
  const wf = wfCases.filter((c) => calMonths.includes(c.t));
  runs.set("shipped", shipped);
  runs.set("wf-shocks", wf);
  const t1 = performance.now();
  for (const v of variants) {
    const cs: Case[] = [];
    for (const t of calMonths) for (const mid of MASTERS) for (const pid of PROFILES) cs.push(runCase(t, mid, pid, v.id, v.tuning(t), false));
    runs.set(v.id, cs);
  }
  console.log(`  ${calMonths.length} months × ${MASTERS.length * PROFILES.length} cases × ${variants.length} variants${TIMING ? ` · ${f2((performance.now() - t1) / 60000)} min` : ""}`);
  const SPLIT = argAfter("--split") ?? "2019-12";
  const lossFor = (id: string, goal: GoalId, side: (t: string) => boolean) => {
    const xs: number[] = [];
    for (const c of runs.get(id)!) {
      if (!side(c.t)) continue;
      const g = c.goals.find((x) => x.goal === goal);
      if (g) xs.push(lossOf(goal, g, c));
    }
    return { m: mean(xs), n: xs.length };
  };
  const before = (t: string) => t <= SPLIT;
  const after = (t: string) => t > SPLIT;
  const ids = ["shipped", "wf-shocks", ...variants.map((v) => v.id)];
  for (const goal of CAL_GOALS) {
    console.log(`  ${goal} — mean loss (${goal === "stable" ? "realised peak / month one" : goal === "payment" ? "60-month peak / payment before" : "completed cost / debt"}) ≤ ${SPLIT} | > ${SPLIT}:`);
    for (const id of ids) {
      const a = lossFor(id, goal, before);
      const b = lossFor(id, goal, after);
      if (!a.n && !b.n) continue;
      console.log(`    ${pad(id, 16)} ${lpad(a.m.toFixed(4), 8)} (${a.n}) | ${lpad(b.m.toFixed(4), 8)} (${b.n})`);
    }
    // Walk-forward choice: pick on one side, score on the other.
    for (const [name, fit, test] of [["forward", before, after], ["reverse", after, before]] as const) {
      const lam = LAMBDAS.map((l) => ({ id: `λ=${l}`, fit: lossFor(`λ=${l}`, goal, fit).m, test: lossFor(`λ=${l}`, goal, test).m })).filter((x) => Number.isFinite(x.fit));
      if (!lam.length) continue;
      const pick = lam.reduce((b, x) => (x.fit < b.fit - 1e-12 ? x : b), lam[0]);
      const base = { fit: lossFor("shipped", goal, fit).m, test: lossFor("shipped", goal, test).m };
      const fam = ["shipped", "wf-shocks", "shift ½·median", "shift 1·median"].map((id) => ({ id, fit: lossFor(id, goal, fit).m, test: lossFor(id, goal, test).m }));
      const pick2 = fam.reduce((b, x) => (x.fit < b.fit - 1e-12 ? x : b), fam[0]);
      console.log(`    ${name}: λ chosen ${pick.id} (in-sample ${pick.fit.toFixed(4)} vs shipped ${base.fit.toFixed(4)}) → out-of-sample ${pick.test.toFixed(4)} vs shipped ${base.test.toFixed(4)}; economy chosen ${pick2.id} → out-of-sample ${pick2.test.toFixed(4)}`);
    }
  }
  if (JSON_OUT) fs.writeFileSync(JSON_OUT.replace(/\.json$/, "") + "-calibration.json", JSON.stringify(Object.fromEntries(runs)));
}

if (JSON_OUT) {
  fs.writeFileSync(JSON_OUT, JSON.stringify({ last: LAST, months: MONTHS, mlzImputed: MLZ_IMPUTED, primeProxyOffset: PRIME_PROXY_OFFSET, cases, wfCases }));
  console.log(`\n  wrote ${JSON_OUT}`);
}
