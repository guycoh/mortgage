// Server-only: the Bank of Israel's directive-451 forecast file.
//
// WHAT IT IS. Directive 451 (p.24) tells banks to price the expected payments of a
// mortgage on "עקומי התשואות והאינפלציה החזויה המתבססים על שוק ההון ומפורסמים
// באתר בנק ישראל". This is that publication: BoI's own Nelson–Siegel fit (on its
// non-parametric curve points and the BoI rate), 360 monthly maturities of
// nominal and real zero yields, plus the expected CPI index the two imply
// (sheet "התפתחות פער התשואות"). It comes out twice a month, as two averages:
//
//   מדדי    — observations from the 16th of the previous month to the 15th of
//             this one, published about the 17th  → SmartNPV's "15/MM" curve
//   קלנדרי  — the calendar month, published early the next month → its "01/MM+1"
//
// SmartNPV's "תחזית בנק ישראל" IS this file: on 2026-11-24 the November מדדי row,
// read as below, reproduced its 21/11/2026 vectors to the fourth decimal on all
// 360 months (scripts/check-boi451.mts). Our own fit of the monthly ZCM points
// (lib/forecast#fitForecast) stays as the fallback.
//
// READING IT. nominal(m) = the monthly forward between the m−1 and m month zeros,
// annualised; inflation(m) = the index's growth from month m−1 to m, annualised.

import * as XLSX from "xlsx";
import { HORIZON, type Forecast } from "./forecast";

export const BOI451_URL =
  "https://www.boi.org.il/boi_files/Statistics/Estimation%20of%20yields%20from%20government%20bonds.xlsx";

export type Boi451Kind = "index" | "calendar";

export type Boi451Row = {
  year: number;
  /** 1–12 */
  month: number;
  kind: Boi451Kind;
  /** Zero yields, annual %, maturities 1…360 months. */
  nominal: number[];
  real: number[];
  /** Expected CPI index, 100 at month 0, months 0…360. */
  cpi: number[];
};

const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const KIND: Record<string, Boi451Kind> = { "מדדי": "index", "קלנדרי": "calendar" };

/**
 * One sheet → rows keyed "yyyy-mm|kind", values by maturity (the header row's
 * month numbers, so a column added or moved cannot shift the vector).
 */
function readSheet(ws: XLSX.WorkSheet): Map<string, Map<number, number>> {
  const a = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true });
  const h = a.findIndex((r) => String(r?.[0] ?? "").trim() === "שנה");
  if (h < 0) throw new Error("451: no header row");
  const head = a[h];
  const out = new Map<string, Map<number, number>>();
  for (const r of a.slice(h + 1)) {
    const year = r?.[0];
    const month = MONTHS.indexOf(String(r?.[1] ?? "").trim()) + 1;
    const kind = KIND[String(r?.[2] ?? "").trim()];
    if (typeof year !== "number" || !month || !kind) continue;
    const vals = new Map<number, number>();
    head.forEach((m, j) => {
      const v = r[j];
      if (j >= 3 && typeof m === "number" && typeof v === "number" && Number.isFinite(v)) vals.set(m, v);
    });
    out.set(`${year}-${String(month).padStart(2, "0")}|${kind}`, vals);
  }
  return out;
}

const sheetLike = (wb: XLSX.WorkBook, word: string, fallback: number) =>
  wb.Sheets[wb.SheetNames.find((n) => n.includes(word)) ?? wb.SheetNames[fallback]];

/** Every complete row of the file, oldest publication first. */
export function readBoi451(data: ArrayBuffer | Uint8Array): Boi451Row[] {
  const wb = XLSX.read(data instanceof Uint8Array ? data : new Uint8Array(data), { type: "array" });
  const nom = readSheet(sheetLike(wb, "נומינלית", 0));
  const real = readSheet(sheetLike(wb, "ריאלית", 1));
  const cpi = readSheet(sheetLike(wb, "פער", 2));
  const range = (n: number, from: number) => Array.from({ length: n }, (_, i) => i + from);
  const rows: Boi451Row[] = [];
  for (const [key, n] of nom) {
    const r = real.get(key);
    const c = cpi.get(key);
    if (!r || !c) continue;
    const nominal = range(HORIZON, 1).map((m) => n.get(m));
    const realZ = range(HORIZON, 1).map((m) => r.get(m));
    const index = range(HORIZON + 1, 0).map((m) => c.get(m));
    if ([...nominal, ...realZ, ...index].some((v) => v === undefined)) continue;
    const [ym, kind] = key.split("|");
    const [year, month] = ym.split("-").map(Number);
    rows.push({ year, month, kind: kind as Boi451Kind, nominal: nominal as number[], real: realZ as number[], cpi: index as number[] });
  }
  return rows.sort((a, b) => order(a) - order(b));
}

/** Publication order: month M's מדדי (≈17/M) comes before its קלנדרי (≈early M+1). */
const order = (r: Pick<Boi451Row, "year" | "month" | "kind">) => (r.year * 12 + r.month) * 2 + (r.kind === "calendar" ? 1 : 0);

/** The date SmartNPV and the banks show for a row: 15/MM for מדדי, 01/MM+1 for קלנדרי. */
export function rowDate(r: Pick<Boi451Row, "year" | "month" | "kind">): string {
  if (r.kind === "index") return `15/${String(r.month).padStart(2, "0")}/${r.year}`;
  const y = r.month === 12 ? r.year + 1 : r.year;
  const m = r.month === 12 ? 1 : r.month + 1;
  return `01/${String(m).padStart(2, "0")}/${y}`;
}

/** The engine's two vectors from one row. */
export function vectorsFrom451(r: Boi451Row): { nominal: number[]; inflation: number[] } {
  const growth = (m: number) => (1 + r.nominal[m - 1] / 100) ** (m / 12);
  const nominal = r.nominal.map((_, i) => ((growth(i + 1) / (i ? growth(i) : 1)) ** 12 - 1) * 100);
  const inflation = r.cpi.slice(1).map((v, i) => ((v / r.cpi[i]) ** 12 - 1) * 100);
  return { nominal, inflation };
}

/** A row as the board's Forecast, or null when its vectors are not believable. */
export function forecastFrom451(r: Boi451Row): Forecast | null {
  const { nominal, inflation } = vectorsFrom451(r);
  const sane = (v: number[], lo: number, hi: number) => v.length === HORIZON && v.every((x) => Number.isFinite(x) && x > lo && x < hi);
  if (!sane(nominal, -3, 20) || !sane(inflation, -5, 15)) return null;
  return {
    asOf: `${r.year}-${String(r.month).padStart(2, "0")}`,
    source: "boi",
    label: `בנק ישראל · ${rowDate(r)}`,
    nominal,
    inflation,
  };
}

/** The newest curve in the file, or null when it cannot be read. */
export function latestFrom451(data: ArrayBuffer | Uint8Array): Forecast | null {
  const rows = readBoi451(data);
  for (let i = rows.length - 1; i >= 0; i--) {
    const f = forecastFrom451(rows[i]);
    if (f) return f;
  }
  return null;
}

/* ------------------------------------------------ which release was in force */

// A letter's own projection (הריבית הכוללת החזויה, printed per tranche) was
// computed on the release in force ON THE LETTER'S DAY, and lib/builtin solves
// against it — so a past release has to be found by date, not just the newest.
// BoI publishes the dates (the calendar file below); per the supervisor, a
// release applies "בפתיחת יום העסקים העוקב ליום הפרסום".

export const BOI451_CALENDAR_URL =
  "https://www.boi.org.il/boi_files/Statistics/The_data_publication_dates_of_the_nominal_and_real_yields_calculated_on_the_basis_of_a_model_-_NBT_Code_451.xlsx";

/** One publication: the day it came out and the row it carries. */
export type Boi451Publication = { published: string; year: number; month: number; kind: Boi451Kind };

/** The calendar file → publications, oldest first. Its layout differs by year sheet, so cells are found, not indexed. */
export function readBoi451Calendar(data: ArrayBuffer | Uint8Array): Boi451Publication[] {
  const wb = XLSX.read(data instanceof Uint8Array ? data : new Uint8Array(data), { type: "array" });
  const out: Boi451Publication[] = [];
  for (const name of wb.SheetNames) {
    for (const r of XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true })) {
      const c = (r ?? []).filter((x) => x !== null && x !== undefined && x !== "");
      const i = c.findIndex((x) => typeof x === "number" && x > 40000 && x < 80000); // an Excel date serial
      if (i < 0 || typeof c[i + 1] !== "number") continue;
      const month = MONTHS.indexOf(String(c[i + 2]).trim()) + 1;
      const kind = KIND[String(c[i + 3]).trim()];
      if (!month || !kind) continue;
      const published = new Date(Date.UTC(1899, 11, 30) + (c[i] as number) * 86_400_000).toISOString().slice(0, 10);
      out.push({ published, year: c[i + 1] as number, month, kind });
    }
  }
  return out.sort((a, b) => (a.published < b.published ? -1 : a.published > b.published ? 1 : 0));
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** The first business day after `published` (Israel: Sunday–Thursday; holidays are not modelled). */
function effectiveFrom(published: string): string {
  const [y, m, d] = published.split("-").map(Number);
  const t = new Date(y, m - 1, d + 1);
  while (t.getDay() === 5 || t.getDay() === 6) t.setDate(t.getDate() + 1);
  return iso(t);
}

/**
 * Where the calendar does not reach (it starts 09/2022): the dates BoI has kept
 * since — מדדי of M around the 18th of M, קלנדרי of M around the 3rd of M+1.
 */
function assumedPublished(r: Pick<Boi451Row, "year" | "month" | "kind">): string {
  return r.kind === "index" ? iso(new Date(r.year, r.month - 1, 18)) : iso(new Date(r.year, r.month, 3));
}

/**
 * The row that was in force on `day`: the newest whose publication took effect
 * on or before it. Null before the file's first row.
 */
export function releaseOn(rows: Boi451Row[], calendar: Boi451Publication[], day: Date): Boi451Row | null {
  const want = iso(day);
  const pub = new Map(calendar.map((p) => [`${p.year}-${p.month}|${p.kind}`, p.published]));
  let best: Boi451Row | null = null;
  for (const r of rows) {
    const p = pub.get(`${r.year}-${r.month}|${r.kind}`) ?? assumedPublished(r);
    if (effectiveFrom(p) <= want) best = r; // rows are in publication order
  }
  return best;
}

/* --------------------------------------------------------------- fetching */

async function getXlsx(url: string, timeoutMs: number): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    // An error page served as 200 is HTML, not a zip ("PK").
    const head = new Uint8Array(buf, 0, Math.min(2, buf.byteLength));
    return head[0] === 0x50 && head[1] === 0x4b ? buf : null;
  } catch {
    return null;
  }
}

export type Boi451Data = { rows: Boi451Row[]; calendar: Boi451Publication[] };

/**
 * The file and its calendar, read once per six hours per server instance (BoI
 * publishes twice a month; a failure is retried after five minutes). The
 * calendar falls back to the copy in the repo, which BoI fills a year ahead.
 */
let cache: { at: number; ttl: number; value: Boi451Data | null } | null = null;
export async function loadBoi451(timeoutMs = 20_000): Promise<Boi451Data | null> {
  if (cache && Date.now() - cache.at < cache.ttl) return cache.value;
  const [file, cal] = await Promise.all([getXlsx(BOI451_URL, timeoutMs), getXlsx(BOI451_CALENDAR_URL, timeoutMs)]);
  let value: Boi451Data | null = null;
  try {
    const rows = file ? readBoi451(file) : [];
    if (rows.length) {
      let calendar = cal ? readBoi451Calendar(cal) : [];
      if (!calendar.length) {
        const saved = (await import("./boi451-calendar.json")).default as unknown as { rows: [string, number, number, Boi451Kind][] };
        calendar = saved.rows.map(([published, year, month, kind]) => ({ published, year, month, kind }));
      }
      value = { rows, calendar };
    }
  } catch {
    value = null;
  }
  cache = { at: Date.now(), ttl: value ? 6 * 3600_000 : 300_000, value };
  return value;
}

/** The newest curve. Null on any failure — the caller has fallbacks. */
export async function fetchBoi451(timeoutMs = 20_000): Promise<Forecast | null> {
  const data = await loadBoi451(timeoutMs);
  if (!data) return null;
  for (let i = data.rows.length - 1; i >= 0; i--) {
    const f = forecastFrom451(data.rows[i]);
    if (f) return f;
  }
  return null;
}

/** The curve that was in force on `day` (a letter's date). Null when unknown. */
export async function fetchBoi451On(day: Date, timeoutMs = 20_000): Promise<Forecast | null> {
  const data = await loadBoi451(timeoutMs);
  const row = data ? releaseOn(data.rows, data.calendar, day) : null;
  return row ? forecastFrom451(row) : null;
}
