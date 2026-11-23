// תחזית ריבית ואינפלציה — the curves the board prices variable and linked rows on.
//
// GET  → { forecast, boi, saved }
//        `boi` is rebuilt from the Bank of Israel's published zero-coupon points
//        (SDMX flow BOI.STATISTICS/ZCM, monthly averages) by lib/forecast's
//        fitForecast — the same construction directive 451 prescribes and
//        SmartNPV runs. It is the default (`forecast`).
//        `saved` are exact vectors kept in `mortgage_forecasts` — SmartNPV's own
//        curve, pasted vectors — newest first, one per label. The board offers
//        them as alternatives; none of them replaces the default by itself.
// POST → save or clear the override. Console admin session only (/console).
//
// Nothing here can fail the board: no table, no network → the answer says so.
// The BoI's data service does go down (2026-11-23 evening: no connection for
// hours, and with `boi: null` תמהיל אופטימלי cannot price at all), so the last
// curves it published ride in the bundle (boi-last.json, refreshed by
// scripts/forecast-snapshot.mts) and stand in, labelled as the saved copy.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  fitForecast,
  historyFromZcm,
  HORIZON,
  parseVectors,
  type AnchorHistory,
  type Forecast,
  type ZeroPoint,
} from "@/app/aa102test/lib/forecast";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/app/simulator/lib/admin-auth";
import boiLast from "./boi-last.json";
import { BOI_SNAPSHOT } from "@/app/aa102test/lib/boi";
import { snpvForecast } from "@/app/aa102test/lib/snpv-forecast";

export const dynamic = "force-dynamic";
// Room for the SmartNPV probe calls (lib/snpv-forecast) on a cold start.
export const maxDuration = 60;

const BOI_URL =
  "https://edge.boi.org.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/ZCM/1.0/?lastNObservations=3&format=csv";

// The maturities the BoI publishes. Nominal stops at 15 years; real reaches 20.
const NOMINAL = [1, 2, 3, 4, 5, 7, 10, 15];
const REAL = [1, 2, 3, 4, 5, 7, 10, 15, 20];
const code = (kind: "N" | "R", y: number) => `ZC_TSB_Z${kind}D_${String(y).padStart(2, "0")}Y_MA`;

/** The newest BoI curves this build shipped with, for when the BoI cannot be reached. */
function lastKnown(): Forecast | null {
  const { asOf, nominal, inflation } = boiLast as { asOf: string; nominal: number[]; inflation: number[] };
  if (!/^\d{4}-\d{2}$/.test(asOf) || nominal.length !== HORIZON || inflation.length !== HORIZON) return null;
  const [yy, mm] = asOf.split("-");
  return { asOf, source: "boi", label: `בנק ישראל · ${mm}/${yy} (עותק שמור)`, nominal, inflation };
}

/** Six hours in memory — the BoI publishes twice a month. */
let boiCache: { at: number; value: Forecast | null } | null = null;

async function fromBoi(): Promise<Forecast | null> {
  if (boiCache && Date.now() - boiCache.at < 6 * 3600_000) return boiCache.value;
  let value: Forecast | null = null;
  try {
    const res = await fetch(BOI_URL, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (res.ok) {
      const lines = (await res.text()).trim().split(/\r?\n/);
      const head = lines[0].split(",");
      const iCode = head.indexOf("SERIES_CODE");
      const iTime = head.indexOf("TIME_PERIOD");
      const iVal = head.indexOf("OBS_VALUE");
      const obs = new Map<string, number>(); // `${code}|${period}` → value
      const periods = new Set<string>();
      for (const l of lines.slice(1)) {
        const c = l.split(",");
        if (!c[iCode]?.startsWith("ZC_TSB_")) continue;
        const v = Number(c[iVal]);
        if (!Number.isFinite(v)) continue;
        obs.set(`${c[iCode]}|${c[iTime]}`, v);
        periods.add(c[iTime]);
      }
      // The newest month for which EVERY maturity is published — a half-filled
      // month would bend the curve towards whichever points happened to land.
      for (const p of Array.from(periods).sort().reverse()) {
        const nom = NOMINAL.map((y) => obs.get(`${code("N", y)}|${p}`));
        const real = REAL.map((y) => obs.get(`${code("R", y)}|${p}`));
        if (nom.some((x) => x === undefined) || real.some((x) => x === undefined)) continue;
        const fit = fitForecast(
          NOMINAL.map((y, i) => [y, nom[i]!] as ZeroPoint),
          REAL.map((y, i) => [y, real[i]!] as ZeroPoint)
        );
        const [yy, mm] = p.split("-");
        value = { asOf: p, source: "boi", label: `בנק ישראל · ${mm}/${yy}`, ...fit };
        break;
      }
    }
  } catch {
    value = null;
  }
  // A failure is cached briefly too, so a BoI outage is not hammered per click;
  // meanwhile the board runs on the last curves the BoI published.
  const live = !!value;
  value ??= lastKnown();
  boiCache = { at: live ? Date.now() : Date.now() - 6 * 3600_000 + 300_000, value };
  return value;
}

/**
 * The market's anchors as they WERE — every month since 2011 — so the engine can
 * judge an anchor a bank fixed years ago against the market of that day (see
 * marginOf in lib/price). Fetched apart from the fit: it is large, changes once a
 * month, and a failure here must cost only this, never the curves.
 */
const HISTORY_URL =
  "https://edge.boi.org.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/ZCM/1.0/?startPeriod=2011-01&format=csv";
let historyCache: { at: number; value: AnchorHistory | null } | null = null;

async function boiHistory(): Promise<AnchorHistory | null> {
  if (historyCache && Date.now() - historyCache.at < 12 * 3600_000) return historyCache.value;
  let value: AnchorHistory | null = null;
  try {
    const res = await fetch(HISTORY_URL, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (res.ok) value = historyFromZcm(await res.text());
  } catch {
    value = null;
  }
  const live = !!value;
  // Unreachable → the copy in the bundle (lib/boi): without a history every
  // lender's built-in margin goes unread and old anchors are judged against
  // today's curve, which is what the live site did on 23/11/2026.
  value ??= BOI_SNAPSHOT.history;
  historyCache = { at: live ? Date.now() : Date.now() - 12 * 3600_000 + 300_000, value };
  return value;
}

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
}

async function readSaved(): Promise<Forecast[]> {
  const supabase = db();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from("mortgage_forecasts")
      .select("as_of, label, nominal, inflation, active, created_at")
      .order("created_at", { ascending: false })
      .limit(40);
    if (error || !data) return [];
    // Newest row per label decides; a clearing row (active=false) retires it.
    const seen = new Set<string>();
    const out: Forecast[] = [];
    for (const r of data as { as_of: string; label: string; nominal: number[]; inflation: number[]; active: boolean }[]) {
      if (seen.has(r.label)) continue;
      seen.add(r.label);
      if (!r.active || r.nominal?.length !== HORIZON || r.inflation?.length !== HORIZON) continue;
      out.push({ asOf: r.as_of, source: "override", label: r.label, nominal: r.nominal.map(Number), inflation: r.inflation.map(Number) });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * SmartNPV republishes on the 1st and 15th; an hour in memory keeps the board
 * on its newest curve within the hour, at 12 API calls per warm instance per
 * hour. A failure is remembered for ten minutes, so an outage is not hammered.
 */
let snpvCache: { at: number; ttl: number; value: Forecast | null } | null = null;
async function fromSnpv(boi: Forecast | null): Promise<Forecast | null> {
  if (!process.env.SNPV_API_KEY) return null;
  if (snpvCache && Date.now() - snpvCache.at < snpvCache.ttl) return snpvCache.value;
  const value = await snpvForecast(boi);
  snpvCache = { at: Date.now(), ttl: value ? 3600_000 : 600_000, value };
  return value;
}

export async function GET() {
  const [fit, savedRaw, history] = await Promise.all([fromBoi(), readSaved(), boiHistory()]);
  // The history is the market's past, not a forecast, so every curve carries
  // the same one — a pasted SmartNPV curve judges an old anchor exactly as the
  // BoI rebuild does.
  const withHistory = (f: Forecast): Forecast => (history ? { ...f, history } : f);
  const boi = fit ? withHistory(fit) : null;
  const saved = savedRaw.map(withHistory);
  // The default is SmartNPV's own curve whenever its API answers (and passes
  // the checks in lib/snpv-forecast): the yardstick every advisor compares the
  // board with. BoI stays the fallback, and stays in `boi` either way.
  const snpv = await fromSnpv(fit);
  const forecast = snpv ? withHistory(snpv) : boi;
  return NextResponse.json({ forecast, boi, saved }, { headers: { "Cache-Control": "private, max-age=300" } });
}

const Body = z.union([
  z.object({ clear: z.literal(true), label: z.string().trim().min(1).max(60) }),
  z.object({
    raw: z.string().min(1).max(200_000),
    label: z.string().trim().min(1).max(60),
    asOf: z.string().trim().regex(/^\d{4}-\d{2}(-\d{2})?$/),
  }),
]);

export async function POST(req: NextRequest) {
  const secret = process.env.SIMULATOR_ADMIN_KEY;
  if (!secret || !verifyAdminCookie(req.cookies.get(ADMIN_COOKIE)?.value, secret))
    return NextResponse.json({ error: "נדרשת כניסת מנהל (/console)" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  const supabase = db();
  if (!supabase) return NextResponse.json({ error: "אין חיבור למסד הנתונים" }, { status: 500 });

  if ("clear" in parsed.data) {
    // Clearing is an insert too: the table is a history, and "back to the BoI
    // curves from <date>" is itself a fact worth keeping.
    const { error } = await supabase
      .from("mortgage_forecasts")
      .insert({ as_of: new Date().toISOString().slice(0, 7), label: parsed.data.label, nominal: [], inflation: [], active: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  const vec = parseVectors(parsed.data.raw);
  if ("error" in vec) return NextResponse.json({ error: vec.error }, { status: 400 });
  const { error } = await supabase.from("mortgage_forecasts").insert({
    as_of: parsed.data.asOf,
    label: parsed.data.label,
    nominal: vec.nominal,
    inflation: vec.inflation,
    active: true,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
