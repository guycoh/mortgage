// תמהיל אוטומטי — the history the engine's stress economies and fee model stand on.
//
//   npx tsx --tsconfig tsconfig.json scripts/automix-history.mts [--write]
//
// Everything here is Bank of Israel data over plain HTTP (the edge SDMX API —
// boi.org.il itself blocks scripted clients, the edge endpoint does not):
//
//   BR   MNT_RIB_BOI_D                 the BoI policy rate, daily, since 1994
//   PRI  CP_1951                       the CPI (general, base 9/1951), monthly
//   ZCM  ZC_TSB_Z{N,R}D_05Y_MA         5-year nominal and real zero yields, monthly avg, since 2008
//   BIR_MRTG_99 467 / 1492 / 1811 / 1909  average rate on NEW housing loans, fixed unlinked /
//                                      fixed CPI-linked, and the same for all-purpose loans with
//                                      housing collateral — monthly since 07/2011
//
// WHAT IS DERIVED, AND WHY THIS WAY.
//
// The board's forecast is the market's own expectation (directive 451: the
// zero curves). A stress economy is therefore best measured as how WRONG that
// expectation has been, not as a round number: for every month t with five
// years of history after it,
//
//   rate error(t)  = average BoI rate over t … t+59  −  the 5-year nominal zero at t
//   CPI error(t)   = realised CPI over t … t+60 (annualised)  −  the 5-year breakeven at t
//                    where breakeven = (1 + nominal5) / (1 + real5) − 1
//
// The 5-year zero is the market's expected average short rate (plus a term
// premium, which makes the "rates up" error a conservative, i.e. smaller,
// estimate). The 10th and 90th percentiles of each error become the shocks
// (rounded to 0.05pp). The sample is 2008-01 … (today − 5y), overlapping
// windows: it contains the 2008–09 cuts, the zero-rate decade and the
// 2022–23 surge — every regime the current borrower base has lived through.
//
// The average new-loan rates feed the early-repayment fee model (fees.ts): the
// fee order discounts the remaining payments at the average rate published for
// the month of the PREPAYMENT and compares it with the one of the month the loan
// was GIVEN. The BoI publishes those tables by term bucket on its website; the
// SDMX flow carries the all-terms average, which is what is stored here and why
// every fee the engine computes is marked an estimate.

import { writeFileSync } from "node:fs";
import { perBank, systemHistory, tamInt, nominalOf } from "../app/aa107test/lib/market-boi";

const B = "https://edge.boi.gov.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS";
const url = (flow: string, series: string) => `${B}/${flow}/1.0/?c%5BSERIES_CODE%5D=${series}&format=csv`;

async function series(flow: string, code: string): Promise<[string, number][]> {
  const res = await fetch(url(flow, code), { signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`${code} ${res.status}`);
  const lines = (await res.text()).trim().split(/\r?\n/);
  const head = lines[0].split(",");
  const iT = head.indexOf("TIME_PERIOD");
  const iV = head.indexOf("OBS_VALUE");
  const out: [string, number][] = [];
  for (const l of lines.slice(1)) {
    // Quoted commas only appear in text columns after OBS_VALUE's position in these flows;
    // split naively and read the two columns by index.
    const c = l.split(",");
    const v = Number(c[iV]);
    if (c[iT] && c[iV] !== "" && Number.isFinite(v)) out.push([c[iT], v]);
  }
  return out.sort((a, b) => (a[0] < b[0] ? -1 : 1));
}

const [br, cpi, n5, r5, klz, kz, apKlz, apKz, apVarRm, apVarRb] = await Promise.all([
  series("BR", "MNT_RIB_BOI_D"),
  series("PRI", "CP_1951"),
  series("ZCM", "ZC_TSB_ZND_05Y_MA"),
  series("ZCM", "ZC_TSB_ZRD_05Y_MA"),
  series("BIR_MRTG_99", "BNK_99034_LR_BIR_MRTG_467"),
  series("BIR_MRTG_99", "BNK_99034_LR_BIR_MRTG_1492"),
  series("BIR_MRTG_99", "BNK_99034_LR_BIR_MRTG_1811"),
  series("BIR_MRTG_99", "BNK_99034_LR_BIR_MRTG_1909"),
  // All-purpose (consumer loans with housing collateral), unlinked VARIABLE: margin and benchmark.
  series("BIR_MRTG_99", "BNK_99034_LR_BIR_MRTG_1807"),
  series("BIR_MRTG_99", "BNK_99034_LR_BIR_MRTG_1808"),
]);
// The per-bank comparison's system rows, every month it covers — what the market
// charged per track when a client's loan was taken (tier inference).
// Power BI covers 2016-01 … 2025-10; TamInt010 the last 25 months to now — the newer wins.
const sysRates = systemHistory(await perBank());
for (const [m, banks] of Object.entries((await tamInt()).history)) if (banks.system) sysRates[m] = { ...banks.system };

/** Month → the BoI rate in force mid-month. */
const monthsOf = (a: string, b: string) => {
  const out: string[] = [];
  let [y, m] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  while (y < yb || (y === yb && m <= mb)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
};
const rateOn = (day: string) => {
  let v = br[0][1];
  for (const [t, x] of br) {
    if (t > day) break;
    v = x;
  }
  return v;
};
const cpiMap = new Map(cpi);
const n5Map = new Map(n5);
const r5Map = new Map(r5);
const lastCpi = cpi[cpi.length - 1][0];
const lastBr = br[br.length - 1][0].slice(0, 7);

const rateErr: number[] = [];
const cpiErr: number[] = [];
const sample: string[] = [];
for (const t of monthsOf("2008-01", lastCpi)) {
  const window = monthsOf(t, t).length ? monthsOf(t, addMonths(t, 59)) : [];
  const end = addMonths(t, 60);
  if (end > lastCpi || addMonths(t, 59) > lastBr) break;
  const nom = n5Map.get(t);
  const real = r5Map.get(t);
  const c0 = cpiMap.get(t);
  const c1 = cpiMap.get(end);
  if (nom === undefined || real === undefined || c0 === undefined || c1 === undefined) continue;
  const avgRate = window.reduce((s, m) => s + rateOn(`${m}-15`), 0) / window.length;
  rateErr.push(avgRate - nom);
  const breakeven = ((1 + nom / 100) / (1 + real / 100) - 1) * 100;
  const realised = (Math.pow(c1 / c0, 1 / 5) - 1) * 100;
  cpiErr.push(realised - breakeven);
  sample.push(t);
}

function addMonths(ym: string, k: number) {
  let [y, m] = ym.split("-").map(Number);
  m += k;
  while (m > 12) {
    m -= 12;
    y++;
  }
  while (m < 1) {
    m += 12;
    y--;
  }
  return `${y}-${String(m).padStart(2, "0")}`;
}

const pct = (xs: number[], p: number) => {
  const s = [...xs].sort((a, b) => a - b);
  const k = (s.length - 1) * p;
  const lo = Math.floor(k);
  const hi = Math.ceil(k);
  return s[lo] + (s[hi] - s[lo]) * (k - lo);
};
const r05 = (x: number) => Math.round(x * 20) / 20;

const shocks = {
  rateUp: r05(pct(rateErr, 0.9)),
  rateDown: r05(pct(rateErr, 0.1)),
  cpiUp: r05(pct(cpiErr, 0.9)),
  cpiDown: r05(pct(cpiErr, 0.1)),
};

// Year-on-year CPI over the last 24 months, for the findings' context.
const yoy = (m: string) => {
  const a = cpiMap.get(addMonths(m, -12));
  const b = cpiMap.get(m);
  return a && b ? Math.round((b / a - 1) * 10000) / 100 : null;
};

const avgRates: Record<string, { klz?: number; kz?: number; apKlz?: number; apKz?: number; apVar?: number }> = {};
for (const [t, v] of klz) (avgRates[t] ??= {}).klz = v;
for (const [t, v] of kz) (avgRates[t] ??= {}).kz = v;
for (const [t, v] of apKlz) (avgRates[t] ??= {}).apKlz = v;
for (const [t, v] of apKz) (avgRates[t] ??= {}).apKz = v;
// The all-purpose unlinked variable RATE (benchmark + margin) — what a variable all-purpose loan cost that month.
const rb = new Map(apVarRb);
for (const [t, v] of apVarRm) if (rb.has(t)) (avgRates[t] ??= {}).apVar = Math.round((rb.get(t)! + v) * 100) / 100;

/**
 * System rate per track per month (as published: EFFECTIVE annual), plus the
 * prime margin in NOMINAL terms — nominal(prime track) − (BoI + 1.5) — which is
 * how a loan contract and a credit report state it.
 */
const market: Record<string, { prime?: number; primeMargin?: number; mlz?: number; klz?: number; kz?: number; mz?: number }> = {};
for (const [m, v] of Object.entries(sysRates)) {
  const boi = rateOn(`${m}-15`);
  const { all: _irr, ...tracks } = v as Record<string, number>;
  market[m] = { ...tracks, ...(v.prime ? { primeMargin: Math.round((nominalOf(v.prime) - boi - 1.5) * 1000) / 1000 } : {}) };
}
/** BoI rate change points (day, %) since 2000 — prime on any date = rate + 1.5. */
const boiSteps: [string, number][] = [];
for (const [t, v] of br) if (t >= "2000-01-01" && (!boiSteps.length || boiSteps[boiSteps.length - 1][1] !== v)) boiSteps.push([t, v]);

const out = {
  builtAt: new Date().toISOString(),
  sources: {
    boiRate: { url: url("BR", "MNT_RIB_BOI_D"), last: br[br.length - 1][0], value: br[br.length - 1][1] },
    cpi: { url: url("PRI", "CP_1951"), last: lastCpi, yoy: yoy(lastCpi) },
    zcm: { url: url("ZCM", "ZC_TSB_ZND_05Y_MA"), first: n5[0][0], last: n5[n5.length - 1][0] },
    avgRates: { url: url("BIR_MRTG_99", "BNK_99034_LR_BIR_MRTG_467"), first: klz[0][0], last: klz[klz.length - 1][0] },
  },
  /** Forecast-error stress shocks, pp a year, and the sample they come from. */
  shocks,
  shockSample: {
    from: sample[0],
    to: sample[sample.length - 1],
    windows: sample.length,
    rate: { p10: pct(rateErr, 0.1), p50: pct(rateErr, 0.5), p90: pct(rateErr, 0.9), min: Math.min(...rateErr), max: Math.max(...rateErr) },
    cpi: { p10: pct(cpiErr, 0.1), p50: pct(cpiErr, 0.5), p90: pct(cpiErr, 0.9), min: Math.min(...cpiErr), max: Math.max(...cpiErr) },
  },
  /** Average rate on new loans, all terms, whole banking system — month → %. */
  avgRates,
  /** Banking-system rate per track by month, from the BoI per-bank comparison (Power BI). */
  market,
  boiSteps,
};

console.log(JSON.stringify({ ...out, avgRates: `${Object.keys(avgRates).length} months`, market: `${Object.keys(market).length} months, last ${Object.keys(market).sort().pop()}`, boiSteps: boiSteps.slice(-6) }, null, 2));
if (process.argv.includes("--write")) {
  writeFileSync("app/aa105test/lib/automix/history.json", JSON.stringify(out) + "\n");
  console.log("wrote app/aa105test/lib/automix/history.json");
}
