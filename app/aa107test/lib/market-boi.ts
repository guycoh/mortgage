// Server-only: assemble a MarketSnapshot from the Bank of Israel's own data.
// See lib/market.ts for what each source is for. Every fetch here can fail
// independently; the caller falls back to the stored or committed snapshot.

import { fitForecast, bondAnchor, type Forecast, type ZeroPoint } from "@/app/aa102test/lib/forecast";
import { curveYield, type MarketSnapshot, type TrackKey } from "./market";

const SDMX = "https://edge.boi.gov.il/FusionEdgeServer/ws/public/sdmxapi/rest/data/BOI.STATISTICS";
const BIR_URL = `${SDMX},BIR_MRTG_99,1.0?lastNObservations=6`;
const BR_URL = `${SDMX},BR,1.0?lastNObservations=500`;
const ZCM_URL = "https://edge.boi.org.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/ZCM/1.0/?lastNObservations=18&format=csv";
const PBI_URL = "https://wabi-west-europe-api.analysis.windows.net/public/reports/querydata?synchronous=true";
const PBI = {
  key: "c3e6befd-7e64-4b32-8b67-2fc26a3ac048",
  dataset: "bf76ee55-839f-4c54-b340-6d95364ddab5",
  report: "dbf34224-00ef-4d09-b15a-c8367209dff5",
  model: 8429316,
  page: "https://www.boi.org.il/en/information-and-service-to-the-public/interest-rates-and-early-repayment-fees/interest-rate-comparisons-housing-loans/",
};
/** Kalatz's reference term: the SDMX flow does not publish its average term. */
const KLZ_REF_YEARS = 20;

async function csv(url: string): Promise<Record<string, string>[]> {
  const res = await fetch(url, {
    headers: { accept: "application/vnd.sdmx.data+csv" },
    cache: "no-store",
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`${url.slice(0, 80)} → ${res.status}`);
  const text = await res.text();
  if (text.startsWith("<")) throw new Error(`${url.slice(0, 80)} → HTML`);
  const lines = text.trim().split(/\r?\n/);
  const head = lines[0].split(",");
  return lines.slice(1).map((l) => {
    const c = l.split(",");
    return Object.fromEntries(head.map((h, i) => [h, c[i] ?? ""]));
  });
}

/* ------------------------------------------------- 1. BIR_MRTG_99 (level) */

type Level = {
  period: string;
  klz: number;
  kz: number;
  kzTerm: number;
  mzMargin: number;
  mzBench: number;
  ap: { klz: number; kz: number; mzMargin: number };
};

async function level(): Promise<Level> {
  const rows = await csv(BIR_URL);
  const pick = (bs: string, idx: string, fv: string, dt: string) => {
    const hits = rows
      .filter(
        (r) =>
          r.BS_ITEM === bs &&
          r.BIR_COVERAGE === "N" &&
          r.INDEXATION_TYPE === idx &&
          r.IR_FV_TYPE === fv &&
          r.DATA_TYPE === dt &&
          r.LTV === "L0" &&
          r.PTI === "P01" &&
          Number(r.OBS_VALUE) > 0
      )
      .sort((a, b) => (a.TIME_PERIOD < b.TIME_PERIOD ? 1 : -1));
    if (!hits.length) throw new Error(`BIR_MRTG_99 missing ${bs}/${idx}/${fv}/${dt}`);
    return { v: Number(hits[0].OBS_VALUE), p: hits[0].TIME_PERIOD };
  };
  const klz = pick("A2C", "NI", "F", "R");
  const kz = pick("A2C", "CPI", "F", "R");
  return {
    period: klz.p > kz.p ? klz.p : kz.p,
    klz: klz.v,
    kz: kz.v,
    kzTerm: pick("A2C", "CPI", "F", "T").v,
    mzMargin: pick("A2C", "CPI", "V", "RM").v,
    mzBench: pick("A2C", "CPI", "V", "RB").v,
    ap: {
      klz: pick("A2B2", "NI", "F", "R").v,
      kz: pick("A2B2", "CPI", "F", "R").v,
      mzMargin: pick("A2B2", "CPI", "V", "RM").v,
    },
  };
}

/* --------------------------------------------- 2. BoI rate (prime) history */

async function boiRates(): Promise<{ series: [string, number][] }> {
  const rows = await csv(BR_URL);
  const series = rows
    .filter((r) => r.SERIES_CODE === "MNT_RIB_BOI_D" && r.OBS_VALUE !== "")
    .map((r) => [r.TIME_PERIOD, Number(r.OBS_VALUE)] as [string, number])
    .sort((a, b) => (a[0] < b[0] ? -1 : 1));
  if (!series.length) throw new Error("BR: no BoI rate");
  return { series };
}

/** The BoI rate in force on a day (YYYY-MM-DD); a month string means its middle. */
function rateOn(series: [string, number][], day: string): number {
  const d = day.length === 7 ? `${day}-15` : day;
  let v = series[0][1];
  for (const [t, x] of series) {
    if (t > d) break;
    v = x;
  }
  return v;
}

/* --------------------------------------------- 3. ZCM curves by month */

const NOMINAL = [1, 2, 3, 4, 5, 7, 10, 15];
const REAL = [1, 2, 3, 4, 5, 7, 10, 15, 20];
const zc = (kind: "N" | "R", y: number) => `ZC_TSB_Z${kind}D_${String(y).padStart(2, "0")}Y_MA`;

async function curves(): Promise<Map<string, Forecast>> {
  const res = await fetch(ZCM_URL, { cache: "no-store", signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`ZCM ${res.status}`);
  const lines = (await res.text()).trim().split(/\r?\n/);
  const head = lines[0].split(",");
  const iC = head.indexOf("SERIES_CODE");
  const iT = head.indexOf("TIME_PERIOD");
  const iV = head.indexOf("OBS_VALUE");
  const obs = new Map<string, number>();
  const periods = new Set<string>();
  for (const l of lines.slice(1)) {
    const c = l.split(",");
    if (!c[iC]?.endsWith("_MA")) continue;
    const v = Number(c[iV]);
    if (!Number.isFinite(v)) continue;
    obs.set(`${c[iC]}|${c[iT]}`, v);
    periods.add(c[iT]);
  }
  const out = new Map<string, Forecast>();
  for (const p of Array.from(periods)) {
    const nom = NOMINAL.map((y) => obs.get(`${zc("N", y)}|${p}`));
    const real = REAL.map((y) => obs.get(`${zc("R", y)}|${p}`));
    if (nom.some((x) => x === undefined) || real.some((x) => x === undefined)) continue;
    const fit = fitForecast(NOMINAL.map((y, i) => [y, nom[i]!] as ZeroPoint), REAL.map((y, i) => [y, real[i]!] as ZeroPoint));
    out.set(p, { asOf: p, source: "boi", label: p, ...fit });
  }
  return out;
}

/** The newest monthly curve the BoI has published — what the board's forecast runs on. */
export async function latestCurve(): Promise<Forecast> {
  const all = await curves();
  const p = Array.from(all.keys()).sort().pop();
  if (!p) throw new Error("ZCM: no complete month");
  return all.get(p)!;
}

/* ---------------------------------- 4. per-bank comparison (Power BI DSR) */

type PbiRow = { mmyy: string; bank: string | null; series: string; obs: number | null };

/** Power BI's compressed DSR → rows. R = repeat-from-previous bitmask, Ø = null bitmask. */
function flattenDsr(resp: unknown, names: string[]): Record<string, unknown>[] {
  const data = (resp as { results: { result: { data: { dsr: { DS: { PH: { DM0: unknown[] }[]; ValueDicts?: Record<string, unknown[]> }[] } } } }[] })
    .results[0].result.data;
  const ds = data.dsr.DS[0];
  const dicts = ds.ValueDicts ?? {};
  const raw = ds.PH[0].DM0 as { S?: { N: string; DN?: string }[]; C?: unknown[]; R?: number; "Ø"?: number }[];
  let schema = raw[0]?.S ?? [];
  const out: Record<string, unknown>[] = [];
  let prev: unknown[] = Array(schema.length).fill(null);
  for (const row of raw) {
    if (row.S) schema = row.S;
    const vals = [...prev];
    const repeat = row.R ?? 0;
    const nulls = row["Ø"] ?? 0;
    const cells = (row.C ?? [])[Symbol.iterator]();
    schema.forEach((s, i) => {
      if (repeat & (1 << i)) return;
      if (nulls & (1 << i)) {
        vals[i] = null;
        return;
      }
      let v = cells.next().value as unknown;
      if (s.DN && typeof v === "number") v = dicts[s.DN][v];
      vals[i] = v;
    });
    prev = vals;
    out.push(Object.fromEntries(schema.map((_, i) => [names[i] ?? `c${i}`, vals[i]])));
  }
  return out;
}

async function perBank(): Promise<PbiRow[]> {
  const col = (p: string) => ({ Column: { Expression: { SourceRef: { Source: "f" } }, Property: p }, Name: `FactData.${p}` });
  const select = [
    col("MMYY"),
    col("legendBank"),
    col("SERIES_CODE"),
    { Aggregation: { Expression: { Column: { Expression: { SourceRef: { Source: "f" } }, Property: "OBS_VALUE" } }, Function: 0 }, Name: "Sum(FactData.OBS_VALUE)" },
  ];
  const where = [
    { Condition: { Contains: { Left: { Column: { Expression: { SourceRef: { Source: "f" } }, Property: "SERIES_CODE" } }, Right: { Literal: { Value: "'_LC_BIR_MRTG_'" } } } } },
  ];
  const body = {
    version: "1.0.0",
    queries: [
      {
        Query: {
          Commands: [
            {
              SemanticQueryDataShapeCommand: {
                Query: { Version: 2, From: [{ Name: "f", Entity: "FactData", Type: 0 }], Select: select, Where: where },
                Binding: { Primary: { Groupings: [{ Projections: [0, 1, 2, 3] }] }, DataReduction: { DataVolume: 4, Primary: { Window: { Count: 30000 } } }, Version: 1 },
                ExecutionMetricsKind: 1,
              },
            },
          ],
        },
        QueryId: "",
        ApplicationContext: { DatasetId: PBI.dataset, Sources: [{ ReportId: PBI.report }] },
      },
    ],
    cancelQueries: [],
    modelId: PBI.model,
  };
  const res = await fetch(PBI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json;charset=UTF-8",
      Accept: "application/json",
      "X-PowerBI-ResourceKey": PBI.key,
      ActivityId: crypto.randomUUID(),
      RequestId: crypto.randomUUID(),
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Power BI ${res.status}`);
  const rows = flattenDsr(await res.json(), ["mmyy", "bank", "series", "obs"]);
  return rows.map((r) => ({
    mmyy: String(r.mmyy),
    bank: (r.bank as string | null) ?? null,
    series: String(r.series),
    obs: r.obs === null || r.obs === undefined ? null : Number(r.obs),
  }));
}

/** Series suffix → (track, metric) in the comparison. */
const PBI_SERIES: Record<string, { track: TrackKey | "all"; metric: "rate" | "share" | "irr" }> = {
  "230": { track: "kz", metric: "rate" },
  "229": { track: "kz", metric: "share" },
  "236": { track: "mz", metric: "rate" },
  "233": { track: "mz", metric: "share" },
  "240": { track: "klz", metric: "rate" },
  "239": { track: "klz", metric: "share" },
  "246": { track: "prime", metric: "rate" },
  "243": { track: "prime", metric: "share" },
  "260": { track: "mlz", metric: "rate" },
  "257": { track: "mlz", metric: "share" },
  "269": { track: "all", metric: "irr" },
};

export type BankTable = {
  period: string;
  rows: { bank: string; track: TrackKey | "all"; metric: "rate" | "share" | "irr"; value: number }[];
};

function bankTable(rows: PbiRow[]): BankTable {
  const months = Array.from(new Set(rows.map((r) => r.mmyy))).sort((a, b) =>
    a.slice(3) + a.slice(0, 2) < b.slice(3) + b.slice(0, 2) ? -1 : 1
  );
  // Newest month in which the whole system has a prime rate published.
  let mm = "";
  for (const m of months.reverse()) {
    if (rows.some((r) => r.mmyy === m && r.series === "BNK_99034_LC_BIR_MRTG_246" && (r.obs ?? 0) > 0)) {
      mm = m;
      break;
    }
  }
  if (!mm) throw new Error("Power BI: no month with system rates");
  const out: BankTable["rows"] = [];
  for (const r of rows) {
    if (r.mmyy !== mm || r.obs === null) continue;
    const code = r.series.split("_").pop()!;
    const meta = PBI_SERIES[code];
    if (!meta) continue;
    const bank = r.series.startsWith("BNK_99034_") ? "system" : r.bank ?? r.series.split("_")[1];
    out.push({ bank, track: meta.track, metric: meta.metric, value: r.obs });
  }
  const [m, y] = mm.split("/");
  return { period: `${y}-${m}`, rows: out };
}

/* ---------------------------------------------------------- assemble */

export type MarketBuild = { snapshot: MarketSnapshot; banks: BankTable; level: Level };

export async function buildMarket(): Promise<MarketBuild> {
  const [lv, br, zcm, pbiRows] = await Promise.all([level(), boiRates(), curves(), perBank()]);
  const banks = bankTable(pbiRows);
  const fLevel = zcm.get(lv.period);
  const fBank = zcm.get(banks.period);
  if (!fLevel || !fBank) throw new Error(`ZCM missing ${!fLevel ? lv.period : banks.period}`);

  const get = (bank: string, track: TrackKey | "all", metric: string) =>
    banks.rows.find((r) => r.bank === bank && r.track === track && r.metric === metric)?.value;
  const sys = (t: TrackKey) => get("system", t, "rate") ?? NaN;

  const today = br.series[br.series.length - 1];
  const boiNow = today[1];
  let since = today[0];
  for (let i = br.series.length - 1; i >= 0 && br.series[i][1] === boiNow; i--) since = br.series[i][0];
  const primeThen = rateOn(br.series, banks.period) + 1.5;

  const klzSpread = lv.klz - curveYield(fLevel, KLZ_REF_YEARS * 12, false);
  const kzSpread = lv.kz - curveYield(fLevel, Math.round(lv.kzTerm * 12), true);
  const primeMargin = sys("prime") - primeThen;
  const mlzMargin = sys("mlz") - bondAnchor(fBank, 0, 60, false);

  const premFixed = (lv.ap.klz - lv.klz + (lv.ap.kz - lv.kz)) / 2;
  const premVar = lv.ap.mzMargin - lv.mzMargin;

  const bankDelta: MarketSnapshot["bankDelta"] = {};
  const bankIrr: MarketSnapshot["bankIrr"] = {};
  for (const r of banks.rows) {
    if (r.bank === "system") {
      if (r.metric === "irr") bankIrr.system = r.value;
      continue;
    }
    if (r.metric === "irr") {
      bankIrr[r.bank] = r.value;
      continue;
    }
    if (r.metric !== "rate" || r.track === "all") continue;
    (bankDelta[r.bank] ??= {})[r.track] = r.value - sys(r.track);
  }

  const [ly, lm] = lv.period.split("-");
  const [by, bm] = banks.period.split("-");
  const snapshot: MarketSnapshot = {
    builtAt: new Date().toISOString(),
    sources: [
      {
        id: "boi_bir_mrtg",
        label: "בנק ישראל · ריביות על הלוואות לדיור חדשות (BIR_MRTG_99)",
        period: `${lm}/${ly}`,
        url: BIR_URL,
      },
      { id: "boi_compare", label: "בנק ישראל · השוואת ריביות בהלוואות לדיור לפי בנק", period: `${bm}/${by}`, url: PBI.page },
      { id: "boi_zcm", label: "בנק ישראל · עקומי אפס (ZCM)", period: `${lm}/${ly}`, url: ZCM_URL },
      { id: "boi_rate", label: "בנק ישראל · ריבית בנק ישראל", period: since, url: BR_URL },
    ],
    boi: { rate: boiNow, prime: boiNow + 1.5, since },
    levelPeriod: lv.period,
    bankPeriod: banks.period,
    housing: {
      klzSpread,
      kzSpread,
      primeMargin,
      mlzMargin,
      mzMargin: lv.mzMargin,
      avg: {
        klz: lv.klz,
        kz: lv.kz,
        kzTermYears: lv.kzTerm,
        klzRefTermYears: KLZ_REF_YEARS,
        prime: sys("prime"),
        mlz: sys("mlz"),
        mz: lv.mzBench + lv.mzMargin,
      },
    },
    allPurposePremium: { prime: premVar, klz: premFixed, kz: premFixed, mlz: premVar, mz: premVar },
    bankDelta,
    bankIrr,
  };
  return { snapshot, banks, level: lv };
}
