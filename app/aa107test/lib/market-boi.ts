// Server-only: assemble a MarketSnapshot from the Bank of Israel's own data.
// See lib/market.ts for what each source is for. Every fetch here can fail
// independently; the caller falls back to the stored or committed snapshot.

import { fitForecast, bondAnchor, type Forecast, type ZeroPoint } from "@/app/aa102test/lib/forecast";
import { curveYield, type FeeRow, type MarketSnapshot, type TrackKey } from "./market";
import { fetchBoi451 } from "@/app/aa102test/lib/boi451";

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

/**
 * The newest curve the BoI has published — what the board's forecast runs on:
 * the directive-451 file (lib/boi451) when it can be read, else our fit of the
 * newest complete ZCM month.
 */
export async function latestCurve(): Promise<Forecast> {
  const official = await fetchBoi451();
  if (official) return official;
  const all = await curves();
  const p = Array.from(all.keys()).sort().pop();
  if (!p) throw new Error("ZCM: no complete month");
  return all.get(p)!;
}

/* ---------------------------------- 4. per-bank comparison (Power BI DSR) */

export type PbiRow = { mmyy: string; bank: string | null; series: string; obs: number | null };

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

export async function perBank(): Promise<PbiRow[]> {
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

/**
 * The banking system's own rate per track, every month the comparison covers
 * (BNK_99034 = all banks). What the market charged a typical borrower in the
 * month a client's loan was taken — the yardstick tier inference measures the
 * client's own margins against.
 */
export function systemHistory(rows: PbiRow[]): Record<string, Partial<Record<TrackKey, number>>> {
  const out: Record<string, Partial<Record<TrackKey, number>>> = {};
  for (const r of rows) {
    if (!r.series.startsWith("BNK_99034_") || r.obs === null || !(r.obs > 0)) continue;
    const meta = PBI_SERIES[r.series.split("_").pop()!];
    if (!meta || meta.metric !== "rate" || meta.track === "all") continue;
    const [mm, yy] = r.mmyy.split("/");
    (out[`${yy}-${mm}`] ??= {})[meta.track] = r.obs;
  }
  return out;
}

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

/* ------------------------------------- 5. TamInt010 — the per-bank table now */

/**
 * The Supervisor of Banks' "השוואת ריביות - הלוואות למטרת מגורים" workbook
 * (https://www.boi.org.il/boi_files/Pikuah/TamInt010.xls): the average rate
 * given on each track at each bank and for the whole system, the last 25
 * months — the same numbers the Power BI comparison shows (its 10/2025 system
 * prime 5.36 is this file's), but published through the current month, where
 * the Power BI dataset stopped at 10/2025. Footnote: "The interest rate is the
 * annual ADJUSTED rate, not the nominal interest rate" — so every figure is
 * converted to the nominal rate the board and the loan contract quote.
 * Bullet, balloon and foreign-currency loans are excluded by the BoI.
 */
const TAMINT_URL = "https://www.boi.org.il/boi_files/Pikuah/TamInt010.xls";
const TAMINT_BANKS: Record<string, string> = {
  "פועלים": "Hapoalim",
  "לאומי": "Leumi",
  "דיסקונט": "Discount",
  "מזרחי": "Mizrahi Tefahot",
  "בינלאומי": "Habeinleumi",
  "מרכנתיל": "Mercantile",
  "ירושלים": "Jerusalem",
  "סך מערכת": "system",
};
const TAMINT_COLS: [RegExp, TrackKey | "all"][] = [
  [/IRR/, "all"],
  [/^קבועה לא צמודה/, "klz"],
  // "שאינה פריים" ends in "פריים" too — it must be tested first.
  [/שאינה פריים/, "mlz"],
  [/-\s*פריים$/, "prime"],
  [/^משתנה צמוד/, "mz"],
  [/^קבועה צמוד/, "kz"],
];

export async function tamInt(): Promise<BankTable & { history: Record<string, Record<string, Partial<Record<TrackKey | "all", number>>>> }> {
  const res = await fetch(TAMINT_URL, { headers: { "user-agent": "Mozilla/5.0" }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`TamInt010 ${res.status}`);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = await import("xlsx");
  const wb = XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: "array" });
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["L01"], { header: 1, raw: true });
  const nameRow = rows.findIndex((r) => (r ?? []).some((c) => c === "סך מערכת"));
  const labelRow = rows.findIndex((r, i) => i > nameRow && (r ?? []).some((c) => typeof c === "string" && /IRR/.test(c)));
  if (nameRow < 0 || labelRow < 0) throw new Error("TamInt010: layout changed");
  // Bank name → its first column; the track columns follow under the label row.
  const cols: { bank: string; track: TrackKey | "all"; col: number }[] = [];
  const names = rows[nameRow] as unknown[];
  const labels = rows[labelRow] as unknown[];
  names.forEach((n, c) => {
    const bank = typeof n === "string" ? TAMINT_BANKS[n.trim()] : undefined;
    if (!bank) return;
    for (let k = c; k < c + 6; k++) {
      const hit = TAMINT_COLS.find(([re]) => re.test(String(labels[k] ?? "").trim()));
      if (hit) cols.push({ bank, track: hit[1], col: k });
    }
  });
  if (cols.filter((x) => x.bank === "system").length < 6) throw new Error("TamInt010: system columns not found");
  const history: Record<string, Record<string, Partial<Record<TrackKey | "all", number>>>> = {};
  for (const r of rows) {
    const m = String((r ?? [])[0] ?? "");
    if (!/^\d{4}-\d{2}$/.test(m)) continue;
    for (const c of cols) {
      const v = Number((r as unknown[])[c.col]);
      if (Number.isFinite(v) && v > 0) ((history[m] ??= {})[c.bank] ??= {})[c.track] = v;
    }
  }
  const period = Object.keys(history).filter((m) => history[m].system?.prime).sort().pop();
  if (!period) throw new Error("TamInt010: no month with system rates");
  const out: BankTable["rows"] = [];
  for (const [bank, v] of Object.entries(history[period]))
    for (const [track, value] of Object.entries(v)) out.push({ bank, track: track as TrackKey | "all", metric: track === "all" ? "irr" : "rate", value: value as number });
  return { period, rows: out, history };
}

/** An effective (adjusted) annual rate → the nominal annual rate of a monthly-paid loan. */
export const nominalOf = (effective: number) => (Math.pow(1 + effective / 100, 1 / 12) - 1) * 1200;

/* ------------------------------ 5. average-rate tables (fees, fixed tracks) */

// The Bank of Israel's average mortgage rates as the early-repayment fee order
// (צו הבנקאות (עמלות פירעון מוקדם), התשס"ב-2002, §7(א) and the Second Schedule)
// uses them: one table per sector, a rate per bucket of term, republished
// monthly, each row effective from a stated day. Published at
// https://www.boi.org.il/information/interestrates/mortgage/ ; both files carry
// their whole history. Unlinked: by bucket for loans given from 01/03/2013, a
// single rate before. CPI-linked: today's buckets (RESULT) and the pre-2011
// buckets (RESULT_OLD), kept with their own edges. The rates are EFFECTIVE
// annual rates; automix/fees.ts states them the way the banks' letters do.
const FEE_BASE = "https://www.boi.org.il/boi_files/Pikuah";
export const FEE_SOURCES = { unlinked: `${FEE_BASE}/mashfix.xls`, linked: `${FEE_BASE}/pribmash.xls`, page: "https://www.boi.org.il/information/interestrates/mortgage/" };

/** One table: bucket upper edges in months (Infinity = open), rows newest first. */
export type FeeTable = { edges: number[]; rows: FeeRow[] };
export type FeeTables = { unlinked: FeeTable; unlinkedOld: FeeTable; linked: FeeTable; linkedOld: FeeTable };

/** Excel serial or "dd/mm/yyyy" → "yyyy-mm-dd". */
function feeDay(v: unknown): string | null {
  if (typeof v === "number" && v > 20000 && v < 80000) return new Date(Date.UTC(1899, 11, 30) + v * 86400000).toISOString().slice(0, 10);
  const m = String(v ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}
const feeNum = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null);
const newestFirst = (rows: FeeRow[]) => rows.sort((a, b) => (a.effective < b.effective ? 1 : -1));

function feeTable(rows: unknown[][], edges: number[], firstBucketCol: number, lastBucketCol: number, effCol: number, repCol: number): FeeTable {
  const out: FeeTable = { edges, rows: [] };
  for (const r of rows) {
    const eff = feeDay(r[effCol]);
    if (!eff) continue;
    // Columns run from the longest bucket (left) to the shortest (right).
    const rates: number[] = [];
    for (let c = lastBucketCol; c >= firstBucketCol; c--) rates.push(feeNum(r[c]) ?? NaN);
    if (rates.some((x) => !Number.isFinite(x))) continue;
    out.rows.push({ effective: eff, report: feeDay(r[repCol]), rates });
  }
  newestFirst(out.rows);
  return out;
}

/**
 * Both files are published together, so one report month takes effect on one
 * day in both. Where they disagree and one date is out of order (later than the
 * NEXT report's), it is a typo and the other file's date stands: mashfix dates
 * report 31/08/2026 to 31/10/2026, after report 30/09/2026 took effect on
 * 19/10/2026; pribmash dates it 15/09/2026, and the A printed on letters of
 * 04/10/2026 and 18/10/2026 is that report's.
 */
function repairFeeDates(t: FeeTable, twin: FeeTable, name: string, notes: string[]) {
  const byReport = [...t.rows].sort((a, b) => ((a.report ?? "") < (b.report ?? "") ? -1 : 1));
  byReport.forEach((r, i) => {
    const next = byReport[i + 1];
    if (!next || r.effective <= next.effective) return;
    const other = twin.rows.find((x) => x.report === r.report);
    if (!other || other.effective > next.effective) return void notes.push(`${name}: report ${r.report} effective ${r.effective} is out of order and has no usable twin`);
    notes.push(`${name}: report ${r.report} effective ${r.effective} → ${other.effective} (twin file)`);
    r.effective = other.effective;
  });
  newestFirst(t.rows);
}

/** The four tables, read from the BoI's two workbooks; `notes` says what was repaired. */
export async function feeTables(): Promise<FeeTables & { notes: string[] }> {
  const XLSX = await import("xlsx");
  const book = async (name: string) => {
    const res = await fetch(`${FEE_BASE}/${name}.xls`, { headers: { "user-agent": "Mozilla/5.0" }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`${name} ${res.status}`);
    return XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: "array" });
  };
  const [fix, cpi] = await Promise.all([book("mashfix"), book("pribmash")]);
  const sheet = (wb: Awaited<ReturnType<typeof book>>, name: string): unknown[][] => {
    if (!wb.Sheets[name]) throw new Error(`average-rate tables: sheet "${name}" not found`);
    return XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true });
  };
  // Unlinked from 03/2013: [avg, >25, 20–25, 15–20, 10–15, 5–10, 1–5, ≤1, effective, report]
  const unlinked = feeTable(sheet(fix, "הלוואות שניתנו מ-01.03.2013"), [12, 60, 120, 180, 240, 300, Infinity], 1, 7, 8, 9);
  // Unlinked to 02/2013: [loans up to, effective, rate] — one rate, every term.
  const unlinkedOld: FeeTable = { edges: [Infinity], rows: [] };
  for (const r of sheet(fix, "הלוואות שניתנו עד-28.02.2013")) {
    const eff = feeDay(r[1]);
    const rate = feeNum(r[2]);
    if (eff && rate !== null) unlinkedOld.rows.push({ effective: eff, report: feeDay(r[0]), rates: [rate] });
  }
  newestFirst(unlinkedOld.rows);
  // CPI-linked now: [avg, >25, 20–25, 15–20, 10–15, 5–10, ≤5, effective, report]
  const linked = feeTable(sheet(cpi, "RESULT"), [60, 120, 180, 240, 300, Infinity], 1, 6, 7, 8);
  // CPI-linked before 08/2011: [avg, >20, 17–20, 15–17, 12–15, 5–12, ≤5, effective, report]
  const linkedOld = feeTable(sheet(cpi, "RESULT_OLD"), [60, 144, 180, 204, 240, Infinity], 1, 6, 7, 8);
  const notes: string[] = [];
  repairFeeDates(unlinked, linked, "unlinked", notes);
  repairFeeDates(linked, unlinked, "linked", notes);
  if (!unlinked.rows.length || !linked.rows.length) throw new Error("average-rate tables: no rows read");
  return { unlinked, unlinkedOld, linked, linkedOld, notes };
}

/** How many of the newest rows a snapshot carries: newFixedRate averages three, and a deploy is rarely older than a few months. */
const FEE_ROWS_LIVE = 8;

/* ---------------------------------------------------------- assemble */

export type MarketBuild = { snapshot: MarketSnapshot; banks: BankTable; level: Level };

/**
 * The snapshot. LEVEL and per-bank spreads come from TamInt010 (current month,
 * converted to nominal); the term structure of the fixed tracks from the ZCM
 * curve of the same month (a 30-year קל"צ is funded further out than a
 * 10-year one); the all-purpose premium from BIR_MRTG_99 (the same flow states
 * both segments, so their difference is like for like). If TamInt010 cannot be
 * read, the Power BI comparison is the fallback (and its month says how old).
 */
export async function buildMarket(): Promise<MarketBuild> {
  const [lv, br, zcm, fee] = await Promise.all([level(), boiRates(), curves(), feeTables().catch(() => null)]);
  let banks: BankTable;
  let bankSource: { id: string; label: string; url: string };
  try {
    banks = await tamInt();
    bankSource = { id: "boi_tamint", label: "בנק ישראל · השוואת ריביות לפי בנק (TamInt010)", url: TAMINT_URL };
  } catch {
    banks = bankTable(await perBank());
    bankSource = { id: "boi_compare", label: "בנק ישראל · השוואת ריביות בהלוואות לדיור לפי בנק (Power BI)", url: PBI.page };
  }
  const fBank = zcm.get(banks.period) ?? zcm.get(Array.from(zcm.keys()).sort().pop()!);
  const fLevel = zcm.get(lv.period);
  if (!fBank || !fLevel) throw new Error(`ZCM missing ${!fBank ? banks.period : lv.period}`);

  const get = (bank: string, track: TrackKey | "all", metric: string) =>
    banks.rows.find((r) => r.bank === bank && r.track === track && r.metric === metric)?.value;
  const sysEff = (t: TrackKey) => get("system", t, "rate") ?? NaN;
  const sys = (t: TrackKey) => nominalOf(sysEff(t));

  const today = br.series[br.series.length - 1];
  const boiNow = today[1];
  let since = today[0];
  for (let i = br.series.length - 1; i >= 0 && br.series[i][1] === boiNow; i--) since = br.series[i][0];
  const primeThen = rateOn(br.series, banks.period) + 1.5;

  const klzSpread = sys("klz") - curveYield(fBank, KLZ_REF_YEARS * 12, false);
  const kzSpread = sys("kz") - curveYield(fBank, Math.round(lv.kzTerm * 12), true);
  const primeMargin = sys("prime") - primeThen;
  const mlzMargin = sys("mlz") - bondAnchor(fBank, 0, 60, false);
  const mzMargin = sys("mz") - bondAnchor(fBank, 0, 60, true);

  const premFixed = (lv.ap.klz - lv.klz + (lv.ap.kz - lv.kz)) / 2;
  const premVar = lv.ap.mzMargin - lv.mzMargin;

  const bankDelta: MarketSnapshot["bankDelta"] = {};
  const bankIrr: MarketSnapshot["bankIrr"] = {};
  for (const r of banks.rows) {
    if (r.metric === "irr") {
      bankIrr[r.bank] = r.value;
      continue;
    }
    if (r.bank === "system" || r.metric !== "rate" || r.track === "all") continue;
    (bankDelta[r.bank] ??= {})[r.track] = nominalOf(r.value) - sys(r.track);
  }

  const [ly, lm] = lv.period.split("-");
  const [by, bm] = banks.period.split("-");
  const snapshot: MarketSnapshot = {
    builtAt: new Date().toISOString(),
    version: 2,
    sources: [
      { ...bankSource, period: `${bm}/${by}` },
      {
        id: "boi_bir_mrtg",
        label: "בנק ישראל · ריביות על הלוואות לדיור חדשות (BIR_MRTG_99) — פער כל מטרה",
        period: `${lm}/${ly}`,
        url: BIR_URL,
      },
      { id: "boi_zcm", label: "בנק ישראל · עקומי אפס (ZCM)", period: fBank.asOf, url: ZCM_URL },
      { id: "boi_rate", label: "בנק ישראל · ריבית בנק ישראל", period: since, url: BR_URL },
    ],
    boi: { rate: boiNow, prime: boiNow + 1.5, since },
    levelPeriod: banks.period,
    bankPeriod: banks.period,
    housing: {
      klzSpread,
      kzSpread,
      primeMargin,
      mlzMargin,
      mzMargin,
      avg: {
        klz: sys("klz"),
        kz: sys("kz"),
        kzTermYears: lv.kzTerm,
        klzRefTermYears: KLZ_REF_YEARS,
        prime: sys("prime"),
        mlz: sys("mlz"),
        mz: sys("mz"),
      },
    },
    allPurposePremium: { prime: premVar, klz: premFixed, kz: premFixed, mlz: premVar, mz: premVar },
    bankDelta,
    bankIrr,
    ...(fee ? { feeRows: { unlinked: fee.unlinked.rows.slice(0, FEE_ROWS_LIVE), linked: fee.linked.rows.slice(0, FEE_ROWS_LIVE) } } : {}),
  };
  return { snapshot, banks, level: lv };
}
