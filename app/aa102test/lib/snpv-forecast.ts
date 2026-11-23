// SmartNPV's own forecast, read from its API — so the board prices on the very
// curve SmartNPV prices on, whatever date it was published, with nothing pasted.
//
// WHY. Our BoI rebuild equals SmartNPV's curve when both stand on the same data
// (its 01/10/2026 curve = our fit of BoI's September average, to 0.03), but
// SmartNPV republishes on the 1st and 15th from fresher market data than the
// BoI's monthly averages, which are all the public SDMX feed carries. On
// 23/11/2026 its curve sat ~0.3 above ours at the long end and the board's
// ריבית והצמדה ran 1–2% under SmartNPV's on every letter (scripts/
// snpv-parity.mts, FORECAST=boi). Reading SmartNPV's own vectors closes that
// for good, whenever it republishes.
//
// HOW. SmartNPV's API (Premium) prices a mix and returns, PER TRACK, the total
// repaid ("repayment_ratio"). It does not return its vectors, so they are read
// back from probe tracks: a track of n months whose first n−1 months are full
// grace (interest capitalised) repays P · Π(1 + r_m/12) in one payment, so
//   ratio(n) / ratio(n−1) − 1 = r_n / 12.
// A prime probe at margin 0 gives r_n = nominal(n) + 1.5 (SmartNPV's prime is
// the nominal forward + 1.5 + margin; our engine uses the same rule); a ק"צ probe
// at 0% gives the month's CPI factor. 360 months of each, in batches.
//
// SAFETY. Nothing here runs without SNPV_API_KEY. Every answer is checked —
// 360 finite months, rates and CPI within sane bounds, and within 1.5 points of
// the BoI curve everywhere — before the board may use it; anything else falls
// back to BoI and says why in the server log.

import { HORIZON, type Forecast } from "./forecast";

const URL_CALC = "https://www.snpv.co.il/api/v2/calculators/reform/process";
/** SmartNPV's track codes ("kind|linkage", as its own form posts them). */
const PRIME = process.env.SNPV_PRIME_TYPE || "1|2";
const FIXED_LINKED = process.env.SNPV_FIXED_LINKED_TYPE || "0|1";
const SPITZER = "1";
const PRINCIPAL = 1_000_000;
const BATCH = 60;

type CalcResponse = {
  status?: boolean;
  economic_forecasts_published_date?: string;
  response?: { data?: { per_mortgages?: { repayment_ratio?: number[] } } };
};

function probe(type: string, n: number, today: string) {
  return {
    loan_board: SPITZER,
    loan_type: type,
    loan_value: String(PRINCIPAL),
    loan_years: String(n),
    loan_interest: "0",
    loan_interest_spacious: "0",
    loan_grace_full: String(n - 1),
    date_balance: today,
  };
}

async function ratios(key: string, type: string, today: string): Promise<{ ratios: number[]; published: string | null }> {
  const out: number[] = [];
  let published: string | null = null;
  for (let from = 1; from <= HORIZON; from += BATCH) {
    const mix = [];
    for (let n = from; n < from + BATCH && n <= HORIZON; n++) mix.push(probe(type, n, today));
    const res = await fetch(URL_CALC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: key, request: { mix } }),
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(`SmartNPV ${res.status}`);
    const j = (await res.json()) as CalcResponse;
    const r = j.response?.data?.per_mortgages?.repayment_ratio;
    if (!j.status || !Array.isArray(r) || r.length !== mix.length) throw new Error("SmartNPV: no per-track ratios");
    published ??= j.economic_forecasts_published_date ?? null;
    out.push(...r.map(Number));
  }
  return { ratios: out, published };
}

/** ratio(n)/ratio(n−1) − 1, month by month, as an annual %. */
const monthly = (r: number[]) => r.map((x, i) => ((x / (i ? r[i - 1] : 1)) - 1) * 1200);

/** The vectors, checked against the BoI curve they must stay near. */
export function vectorsFromRatios(primeRatios: number[], linkedRatios: number[], boi: Forecast | null) {
  const nominal = monthly(primeRatios).map((p) => p - 1.5);
  // A month's CPI factor f = (1 + π)^(1/12) → π = f^12 − 1.
  const inflation = linkedRatios.map((x, i) => (Math.pow(x / (i ? linkedRatios[i - 1] : 1), 12) - 1) * 100);
  const bad = (why: string) => ({ error: why } as const);
  if (nominal.length !== HORIZON || inflation.length !== HORIZON) return bad("not 360 months");
  if (nominal.some((x) => !Number.isFinite(x) || x < -2 || x > 15)) return bad("nominal out of range");
  if (inflation.some((x) => !Number.isFinite(x) || x < -5 || x > 15)) return bad("inflation out of range");
  if (boi) {
    const far = (a: number[], b: number[]) => a.some((x, i) => Math.abs(x - b[i]) > 1.5);
    if (far(nominal, boi.nominal) || far(inflation, boi.inflation)) return bad("more than 1.5 points from the BoI curve");
  }
  const r6 = (x: number) => Math.round(x * 1e6) / 1e6;
  return { nominal: nominal.map(r6), inflation: inflation.map(r6) };
}

const dmy = (d: Date) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

/** SmartNPV's current curve, or null (no key, no answer, or an answer that fails the checks). */
export async function snpvForecast(boi: Forecast | null): Promise<Forecast | null> {
  const key = process.env.SNPV_API_KEY;
  if (!key) return null;
  try {
    const today = dmy(new Date());
    const [p, l] = await Promise.all([ratios(key, PRIME, today), ratios(key, FIXED_LINKED, today)]);
    const v = vectorsFromRatios(p.ratios, l.ratios, boi);
    if ("error" in v) {
      console.warn(`[forecast] SmartNPV curve rejected: ${v.error}`);
      return null;
    }
    const pub = p.published ?? l.published;
    const [y, m, d] = (pub ?? "").split("-");
    return {
      asOf: pub ? `${y}-${m}` : new Date().toISOString().slice(0, 7),
      source: "override",
      label: pub ? `SmartNPV · ${d}/${m}/${y.slice(2)}` : "SmartNPV",
      nominal: v.nominal,
      inflation: v.inflation,
    };
  } catch (e) {
    console.warn(`[forecast] SmartNPV unreachable: ${(e as Error).message}`);
    return null;
  }
}
