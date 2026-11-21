// תחזית ריבית ואינפלציה — the two curves every forecast figure on the board reads.
//
// WHAT THIS IS. Bank of Israel directive 451 (נוהל בנקאי תקין 451, appendix on
// "הריבית הכוללת החזויה") tells every bank how to project a mortgage's payments:
// anchors, prime and CPI move along the market's own expectations, read off the
// government-bond zero curves the Bank of Israel publishes. SmartNPV's default
// "תחזית בנק ישראל" is exactly that, and we reproduced it against their own
// schedules for a real client to the hundredth of a percent:
//
//   · פריים            rate(m) = nominal(m) + 1.5 + margin           (every month)
//   · משתנה כל V      for the first s months the anchor as it stands; then each
//                      window [s+1 … s+V] resets to the compounded forward
//                      anchor of that window — nominal curve for a לא צמודה
//                      track, real curve for a צמודה one — plus the margin.
//                      This is 451's formula
//                        A = ((1+Z(s+V))^((s+V)/12) / (1+Z(s))^(s/12))^(12/V) − 1
//                      written in forward rates (the two are the same number).
//   · צמוד מדד         the balance is indexed every month by (1+π(m))^(1/12).
//
// So the forecast is two vectors of 360 monthly forward rates, annual percent:
// `nominal` (what a shekel costs per year, at month m) and `inflation` (expected
// CPI per year, at month m). The real curve is their ratio.
//
// WHERE THE VECTORS COME FROM. The BoI publishes zero-coupon yields at a handful
// of maturities (nominal 1–15y, real 1–20y — SDMX flow BOI.STATISTICS/ZCM). The
// curves SmartNPV runs on are smooth Nelson–Siegel forward curves fitted to
// those points with a ~3.2-year decay, inflation converging to exactly 2% — the
// midpoint of the BoI's 1–3% target — and nominal = real × inflation. `fitForecast`
// rebuilds that from the published points; on the 01/10/26 vectors it lands
// within 0.05% everywhere and moves any 2- or 5-year anchor by under 0.03%.
// (SmartNPV fits a different day's data than the monthly average the BoI puts
// out publicly, which is the whole residual.) When exact parity matters an
// override vector can be pasted in — see `parseVectors`.
//
// Pure, no I/O, so it is checked in Node (scripts/check-forecast.ts).

export const HORIZON = 360;

export type ForecastSource = "boi" | "override";

export type Forecast = {
  /** Month the curves describe, "2026-09" — the data, not the day it was fetched. */
  asOf: string;
  source: ForecastSource;
  /** What the board says it is running on: "בנק ישראל · 09/2026". */
  label: string;
  /** Monthly forward rates, annual %, months 1…360. */
  nominal: number[];
  /** Expected CPI, annual %, months 1…360. */
  inflation: number[];
  /**
   * What the market's anchors WERE, month by month (see AnchorHistory). Not part
   * of the forecast itself: it rides along so the engine can read an anchor a
   * bank fixed years ago against the market of that day rather than today's.
   * Absent on a pasted curve or when the BoI is unreachable, and every reader
   * falls back to today's curve, which is what the engine did before it existed.
   */
  history?: AnchorHistory;
};

/**
 * The Bank of Israel's zero-coupon government yields, monthly averages (SDMX
 * flow BOI.STATISTICS/ZCM): the market anchor for a reset window of any length
 * in any past month, nominal for a לא צמודה track and CPI-linked for a צמודה one.
 */
export type AnchorHistory = {
  /** First month the rows describe, "2011-01". */
  from: string;
  /** The maturities each row holds, in years, ascending. */
  years: number[];
  /** [month][maturity] annual-compounded zero yield %, null where unpublished. */
  real: (number | null)[][];
  nominal: (number | null)[][];
};

const monthIndex = (from: string, ym: string) => {
  const [fy, fm] = from.split("-").map(Number);
  const [y, m] = ym.split("-").map(Number);
  return (y - fy) * 12 + (m - fm);
};

/** One month's zero yield at `years`, interpolated between published maturities. */
function zeroAt(h: AnchorHistory, ym: string, years: number, real: boolean): number | null {
  const row = (real ? h.real : h.nominal)[monthIndex(h.from, ym)];
  if (!row) return null;
  const pts = h.years.map((y, i) => [y, row[i]] as const).filter((p): p is readonly [number, number] => p[1] !== null);
  if (!pts.length) return null;
  if (years <= pts[0][0]) return pts[0][1];
  if (years >= pts[pts.length - 1][0]) return pts[pts.length - 1][1];
  for (let i = 1; i < pts.length; i++) {
    const [y1, v1] = pts[i];
    const [y0, v0] = pts[i - 1];
    if (years <= y1) return v0 + ((v1 - v0) * (years - y0)) / (y1 - y0);
  }
  return null;
}

/**
 * The market anchor for a `months`-long window as it stood when a bank fixed a
 * rate in `ym` ("2023-05"): the zero yield of that maturity, averaged over that
 * month and the one before — a reset is priced on an anchor published in the
 * days before it, which a monthly average straddles. Null when the history does
 * not reach that month.
 */
export function marketAnchorAt(f: Forecast, ym: string, months: number, real: boolean): number | null {
  const h = f.history;
  if (!h) return null;
  const [y, m] = ym.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  const prevYm = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  const years = Math.max(1, Math.round(months)) / 12;
  const a = zeroAt(h, ym, years, real);
  const b = zeroAt(h, prevYm, years, real);
  if (a === null && b === null) return null;
  if (a === null || b === null) return a ?? b;
  return (a + b) / 2;
}

/* ------------------------------------------------------------- reading it */

const clampMonth = (m: number) => Math.min(Math.max(Math.round(m), 1), HORIZON);

/** Nominal forward rate at month m (1-based), annual %. Flat past 30 years. */
export const nominalAt = (f: Forecast, m: number) => f.nominal[clampMonth(m) - 1];

/** Expected inflation at month m, annual %. */
export const inflationAt = (f: Forecast, m: number) => f.inflation[clampMonth(m) - 1];

/** Real forward rate at month m: what's left of the nominal once CPI is out. */
export const realAt = (f: Forecast, m: number) =>
  ((1 + nominalAt(f, m) / 100) / (1 + inflationAt(f, m) / 100) - 1) * 100;

/** One month's index factor — (1+π)^(1/12), compounded, never π/12. */
export const indexFactor = (f: Forecast, m: number) =>
  Math.pow(1 + inflationAt(f, m) / 100, 1 / 12);

/**
 * The anchor a bond-based variable track resets to for months from+1 … from+V:
 * the forward rate compounded over that window. `real` picks the curve — a
 * צמודה track is priced off the CPI-linked bonds, a לא צמודה one off the shekel.
 */
export function bondAnchor(f: Forecast, from: number, months: number, real: boolean): number {
  const V = Math.max(1, Math.round(months));
  let log = 0;
  for (let m = from + 1; m <= from + V; m++) {
    const r = real ? realAt(f, m) : nominalAt(f, m);
    log += Math.log(1 + r / 100) / 12;
  }
  return (Math.exp((log * 12) / V) - 1) * 100;
}

/* ------------------------------------------------------- building it (BoI) */

/** [years to maturity, annual-compounded yield %] */
export type ZeroPoint = [number, number];

// The decay that reproduces the curves SmartNPV publishes as "תחזית בנק ישראל".
// Fitted on the 01/10/26 vectors (λ real 3.4, inflation 3.0–3.2, nominal flat
// across 3–4); one round number per curve is the defensible choice, and the
// check script states the error it leaves.
const LAMBDA_REAL = 3.3;
const LAMBDA_NOMINAL = 3.3;
const LAMBDA_INFLATION = 3.2;
/** The BoI's inflation target is 1–3%; long-run expectations sit on its middle. */
const LONG_RUN_INFLATION = 2;

const toCont = (y: number) => Math.log(1 + y / 100) * 100;
const toAnnual = (y: number) => (Math.exp(y / 100) - 1) * 100;

/** Least squares by the normal equations — two or three unknowns, so no library. */
function leastSquares(rows: number[][], b: number[]): number[] {
  const n = rows[0].length;
  const M = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) =>
      j < n
        ? rows.reduce((s, r) => s + r[i] * r[j], 0)
        : rows.reduce((s, r, k) => s + r[i] * b[k], 0)
    )
  );
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let k = i + 1; k < n; k++) if (Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
    [M[i], M[p]] = [M[p], M[i]];
    for (let k = 0; k < n; k++) {
      if (k === i) continue;
      const q = M[k][i] / M[i][i];
      for (let j = i; j <= n; j++) M[k][j] -= q * M[i][j];
    }
  }
  return M.map((r, i) => r[n] / r[i]);
}

type NS = { b0: number; b1: number; b2: number; lambda: number };

/** Nelson–Siegel forward rate at t years (continuous, %). */
const nsForward = (p: NS, t: number) => {
  const x = t / p.lambda;
  const e = Math.exp(-x);
  return p.b0 + p.b1 * e + p.b2 * x * e;
};

/** Fit NS to zero yields (continuous %) at a fixed decay. */
function fitZeros(points: [number, number][], lambda: number): NS {
  const rows = points.map(([t]) => {
    const x = t / lambda;
    const e = Math.exp(-x);
    return [1, (1 - e) / x, (1 - e) / x - e];
  });
  const [b0, b1, b2] = leastSquares(rows, points.map(([, y]) => y));
  return { b0, b1, b2, lambda };
}

/** Fit NS to forward rates with the long end pinned. */
function fitForwardsPinned(points: [number, number][], lambda: number, b0: number): NS {
  const rows = points.map(([t]) => {
    const x = t / lambda;
    const e = Math.exp(-x);
    return [e, x * e];
  });
  const [b1, b2] = leastSquares(rows, points.map(([, y]) => y - b0));
  return { b0, b1, b2, lambda };
}

/** Mid-month, in years: the forward that governs month m. */
const tOf = (m: number) => (m - 0.5) / 12;

/**
 * The two forecast vectors from the BoI's published zero points.
 *
 *  1. Real curve: NS through the CPI-linked zero yields.
 *  2. Inflation: the breakeven the nominal and real fits imply, smoothed by an
 *     NS forward curve whose long end is held at 2%.
 *  3. Nominal = (1 + real)(1 + inflation) − 1, so the three curves are one
 *     consistent set and a צמודה and a לא צמודה track priced off them agree.
 */
export function fitForecast(
  nominalZeros: ZeroPoint[],
  realZeros: ZeroPoint[]
): { nominal: number[]; inflation: number[] } {
  const realNS = fitZeros(realZeros.map(([t, y]) => [t, toCont(y)]), LAMBDA_REAL);
  const nomNS = fitZeros(nominalZeros.map(([t, y]) => [t, toCont(y)]), LAMBDA_NOMINAL);
  const months = Array.from({ length: HORIZON }, (_, i) => i + 1);
  const real = months.map((m) => toAnnual(nsForward(realNS, tOf(m))));
  const breakeven = months.map((m, i) => {
    const n = toAnnual(nsForward(nomNS, tOf(m)));
    return ((1 + n / 100) / (1 + real[i] / 100) - 1) * 100;
  });
  const inflNS = fitForwardsPinned(
    months.map((m, i) => [tOf(m), breakeven[i]]),
    LAMBDA_INFLATION,
    LONG_RUN_INFLATION
  );
  const inflation = months.map((m) => nsForward(inflNS, tOf(m)));
  const nominal = real.map((r, i) => ((1 + r / 100) * (1 + inflation[i] / 100) - 1) * 100);
  return { nominal, inflation };
}

/**
 * AnchorHistory from the BoI's ZCM CSV (columns SERIES_CODE, TIME_PERIOD,
 * OBS_VALUE; series ZC_TSB_Z{N,R}D_{yy}Y_MA). Months run from the first one
 * at or after `from` to the newest one that has any value. Null when the text
 * holds none of the series.
 */
export function historyFromZcm(csv: string, from = "2011-01", years = [1, 2, 3, 4, 5, 7, 10]): AnchorHistory | null {
  const lines = csv.trim().split(/\r?\n/);
  const head = (lines[0] ?? "").split(",");
  const iCode = head.indexOf("SERIES_CODE");
  const iTime = head.indexOf("TIME_PERIOD");
  const iVal = head.indexOf("OBS_VALUE");
  if (iCode < 0 || iTime < 0 || iVal < 0) return null;
  const col = new Map(years.map((y, i) => [String(y).padStart(2, "0"), i]));
  const real: (number | null)[][] = [];
  const nominal: (number | null)[][] = [];
  let last = -1;
  for (const l of lines.slice(1)) {
    const c = l.split(",");
    const m = c[iCode]?.match(/^ZC_TSB_Z([NR])D_(\d\d)Y_MA$/);
    if (!m) continue;
    const j = col.get(m[2]);
    const v = Number(c[iVal]);
    if (j === undefined || !Number.isFinite(v) || !/^\d{4}-\d{2}$/.test(c[iTime] ?? "")) continue;
    const k = monthIndex(from, c[iTime]);
    if (k < 0) continue;
    const t = m[1] === "R" ? real : nominal;
    for (const arr of [real, nominal]) while (arr.length <= k) arr.push(years.map(() => null));
    // Four places: a hundredth of a basis point, and half the payload.
    t[k][j] = Math.round(v * 1e4) / 1e4;
    last = Math.max(last, k);
  }
  if (last < 0) return null;
  return { from, years, real: real.slice(0, last + 1), nominal: nominal.slice(0, last + 1) };
}

/* ------------------------------------------------------- the paste-in path */

/**
 * Two vectors pasted by an admin — the override that buys exact parity with
 * another system's forecast. Accepts JSON `{nominal:[…], inflation:[…]}` (also
 * `interest`/`I`/`F` as names) or two lines/columns of numbers. Anything that
 * is not 360 finite values a side is refused with the reason, never padded.
 */
export function parseVectors(raw: string): { nominal: number[]; inflation: number[] } | { error: string } {
  const text = raw.trim();
  if (!text) return { error: "לא הודבק דבר" };
  let a: unknown;
  let b: unknown;
  try {
    const j = JSON.parse(text) as Record<string, unknown>;
    a = j.nominal ?? j.interest ?? j.I ?? j["1"];
    b = j.inflation ?? j.F ?? j["2"];
    // SmartNPV's own graph-data shape is an object keyed 1…360.
    const vec = (v: unknown) =>
      Array.isArray(v) ? v : v && typeof v === "object" ? Object.keys(v).sort((x, y) => +x - +y).map((k) => (v as Record<string, unknown>)[k]) : v;
    a = vec(a);
    b = vec(b);
  } catch {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 2) {
      a = lines[0].split(/[\s,;\t]+/);
      b = lines[1].split(/[\s,;\t]+/);
    } else {
      // Two columns: month-per-line.
      const cols = lines.map((l) => l.split(/[\s,;\t]+/).filter(Boolean));
      const two = cols.filter((c) => c.length >= 2);
      a = two.map((c) => c[c.length - 2]);
      b = two.map((c) => c[c.length - 1]);
    }
  }
  const nums = (v: unknown) => (Array.isArray(v) ? v.map((x) => Number(x)) : []);
  const nominal = nums(a).filter((x) => x !== null);
  const inflation = nums(b);
  if (nominal.length !== HORIZON || inflation.length !== HORIZON)
    return { error: `נדרשים ${HORIZON} ערכים לכל עקום (התקבלו ${nominal.length} ו-${inflation.length})` };
  if (![...nominal, ...inflation].every((x) => Number.isFinite(x) && x > -5 && x < 30))
    return { error: "יש ערך שאינו מספר או מחוץ לטווח סביר" };
  return { nominal, inflation };
}
