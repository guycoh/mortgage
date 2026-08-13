// WHERE CURRENT ANCHORS COME FROM.
//
// One module, so the scheduled refresh and the freshness gate on the read path
// cannot drift into fetching different things. Each source returns rows ready to
// upsert, or nothing — a source that cannot be parsed writes nothing rather than
// writing a guess, because the previous value is always a better answer than an
// invented one.
//
// Status, as tested 2026-08-13 (see docs/mortgage-anchor-sources.md):
//
//   prime          ✅ the Bank of Israel's published rate + 1.5%.
//   bond_linked    ✅ BOI zero curve, real series      (dataflow ZCM)
//   bond_unlinked  ✅ BOI zero curve, nominal series   (dataflow ZCM)
//   makam          ✅ the one-year nominal point of that same curve.
//
// All four are read from the Bank of Israel directly, which is what makes them
// `verified: true` — no republished table, no aggregator, no reading a PDF.
//
// THE ENDPOINT, because it cost an afternoon: this host runs Fusion Edge Server,
// which serves STRUCTURE under /sdmx/v2/ and DATA under a different prefix
// entirely. Every documented SDMX REST data path under /sdmx/v2/ returns 404.
// The data lives at:
//
//   /FusionEdgeServer/ws/public/sdmxapi/rest/data/{agency},{flow},{version}
//
// Ask for `application/vnd.sdmx.data+csv` — the default XML for one dataflow is
// 10MB, the CSV for the same query is 4KB. `?lastNObservations=1` gives the
// current value of every series in the flow in one request, which is why a whole
// curve costs exactly one fetch.

import type { AnchorFamily } from "./types";

/** A row shaped for the `mortgage_anchors` table. */
export interface AnchorUpsert {
  family: AnchorFamily;
  reset_months: number | null;
  value: number;
  effective_at: string;
  source: string;
  source_url: string;
  verified: boolean;
}

const BOI_RATE_URL = "https://boi.org.il/PublicApi/GetInterest";
/** Prime is the Bank of Israel's rate plus a spread fixed across all lenders. */
const PRIME_SPREAD = 1.5;

/**
 * ריבית פריים, from the rate decision itself.
 *
 * `lastPublishedDate` is the anchor's effective date, not today. Stamping it
 * with today would make an eight-week-old rate look like this morning's and
 * defeat the very freshness check that calls this.
 */
async function fetchPrime(): Promise<AnchorUpsert[]> {
  const res = await fetch(BOI_RATE_URL, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BOI ${res.status}`);
  const json: unknown = await res.json();
  const rate = (json as { currentInterest?: unknown })?.currentInterest;
  const published = (json as { lastPublishedDate?: unknown })?.lastPublishedDate;
  // A rate outside this range is a parse failure wearing a number's clothes.
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate < -5 || rate > 25) {
    throw new Error("unparseable rate");
  }
  const effective_at =
    typeof published === "string" && /^\d{4}-\d{2}-\d{2}/.test(published)
      ? published.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  return [
    {
      family: "prime",
      reset_months: null,
      value: Math.round((rate + PRIME_SPREAD) * 1000) / 1000,
      effective_at,
      source: `ריבית בנק ישראל ${rate}% + ${PRIME_SPREAD}%`,
      source_url: BOI_RATE_URL,
      verified: true,
    },
  ];
}

/**
 * THE ZERO CURVE — what every bond anchor is actually made of.
 *
 * The banks say so themselves: the anchor is "התשואה הנגזרת מאמידת עקום אפס".
 * That curve is published by the Bank of Israel as dataflow ZCM, two series per
 * maturity:
 *
 *   ZC_TSB_ZRD_{n}Y_MA   real / צמוד מדד      → bond_linked
 *   ZC_TSB_ZND_{n}Y_MA   nominal / לא צמוד    → bond_unlinked
 *
 * Reading the curve directly rather than a republished table is what makes these
 * `verified: true`, and it also fills maturities no aggregator prints — a row
 * resetting every three years used to resolve to INSUFFICIENT_DATA because no
 * table had a 3-year column. The curve has one.
 */
const ZCM_URL =
  "https://edge.boi.gov.il/FusionEdgeServer/ws/public/sdmxapi/rest/data/BOI.STATISTICS,ZCM,1.0?lastNObservations=1";

/** `ZC_TSB_ZND_05Y_MA` / `ZC_TSB_ZRD_7Y_MA` — the maturity is not zero-padded consistently. */
const ZC_SERIES = /^ZC_TSB_Z([RN])D_(\d{1,2})Y_MA$/;

async function fetchZeroCurve(): Promise<AnchorUpsert[]> {
  const res = await fetch(ZCM_URL, {
    headers: { accept: "application/vnd.sdmx.data+csv" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`BOI ZCM ${res.status}`);
  const csv = await res.text();
  const lines = csv.trim().split("\n");
  const head = lines[0].split(",");
  const iCode = head.indexOf("SERIES_CODE");
  const iPeriod = head.indexOf("TIME_PERIOD");
  const iValue = head.indexOf("OBS_VALUE");
  if (iCode < 0 || iPeriod < 0 || iValue < 0) throw new Error("ZCM header changed");

  const out: AnchorUpsert[] = [];
  for (const line of lines.slice(1)) {
    const c = line.split(",");
    const m = ZC_SERIES.exec(c[iCode]?.trim() ?? "");
    if (!m) continue;
    const value = Number(c[iValue]);
    if (!Number.isFinite(value) || value < -10 || value > 30) continue;
    // The series is monthly and stamped "2026-07". An anchor is a dated fact, so
    // it takes the first of that month rather than today — see the note on
    // prime's effective date.
    const period = (c[iPeriod] ?? "").trim();
    const effective_at = /^\d{4}-\d{2}$/.test(period)
      ? `${period}-01`
      : /^\d{4}-\d{2}-\d{2}$/.test(period)
        ? period
        : "";
    if (!effective_at) continue;

    out.push({
      family: m[1] === "R" ? "bond_linked" : "bond_unlinked",
      reset_months: Number(m[2]) * 12,
      value: Math.round(value * 1000) / 1000,
      effective_at,
      source:
        m[1] === "R"
          ? `בנק ישראל — עקום אפס ריאלי, ${m[2]} שנים`
          : `בנק ישראל — עקום אפס נומינלי, ${m[2]} שנים`,
      source_url: ZCM_URL,
      verified: true,
    });
  }
  if (!out.length) throw new Error("ZCM returned no zero-curve series");
  return out;
}

/**
 * עוגן מק"ם — the 12-month bill.
 *
 * Taken from the ONE-YEAR NOMINAL point of the same curve. מק"ם is a one-year
 * government bill issued by the Bank of Israel, so the one-year nominal
 * government yield is that instrument's yield rather than a stand-in for it.
 * Kept as its own family because the mapping is per bank — Leumi prices annual
 * unlinked off מק"ם where others use the bond curve — and collapsing the two
 * would lose that distinction even though the number agrees.
 */
async function fetchMakam(): Promise<AnchorUpsert[]> {
  const curve = await fetchZeroCurve();
  const oneYear = curve.find((r) => r.family === "bond_unlinked" && r.reset_months === 12);
  if (!oneYear) throw new Error("no 1Y nominal point on the curve");
  return [
    {
      ...oneYear,
      family: "makam",
      source: 'בנק ישראל — עקום אפס נומינלי לשנה (תשואת מק"ם ל־12 חודשים)',
    },
  ];
}

/**
 * `covers` is declared rather than inferred from what came back: one fetch of
 * the curve answers for two families, and a source that returns nothing on a bad
 * afternoon must still count as the thing responsible for them — otherwise a
 * transient failure would silently reclassify a family as unrefreshable.
 */
const SOURCES: { covers: AnchorFamily[]; fetch: () => Promise<AnchorUpsert[]> }[] = [
  { covers: ["prime"], fetch: fetchPrime },
  { covers: ["bond_linked", "bond_unlinked"], fetch: fetchZeroCurve },
  { covers: ["makam"], fetch: fetchMakam },
];

/** Which families no source can refresh — for the operator, not the UI. Empty. */
export const UNREFRESHABLE: AnchorFamily[] = (
  ["prime", "bond_linked", "bond_unlinked", "makam"] as AnchorFamily[]
).filter((f) => !SOURCES.some((s) => s.covers.includes(f)));

/**
 * Every source that answers, gathered. One failing source never stops the
 * others: they are independent publications and a bad afternoon at one of them
 * is not a reason to leave the rest behind.
 */
export async function refreshFromSources(): Promise<AnchorUpsert[]> {
  const settled = await Promise.allSettled(SOURCES.map((s) => s.fetch()));
  const out: AnchorUpsert[] = [];
  settled.forEach((r, i) => {
    if (r.status === "fulfilled") out.push(...r.value);
    else console.warn(`[anchors] ${SOURCES[i].covers.join('/')} refresh failed:`, r.reason);
  });
  return out;
}
