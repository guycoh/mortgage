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
// Nothing here can fail the board: no BoI, no table, no network → the answer
// says so and the board stays on flat inflation.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fitForecast, HORIZON, parseVectors, type Forecast, type ZeroPoint } from "@/app/aa102test/lib/forecast";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/app/simulator/lib/admin-auth";

export const dynamic = "force-dynamic";

const BOI_URL =
  "https://edge.boi.org.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS/ZCM/1.0/?lastNObservations=3&format=csv";

// The maturities the BoI publishes. Nominal stops at 15 years; real reaches 20.
const NOMINAL = [1, 2, 3, 4, 5, 7, 10, 15];
const REAL = [1, 2, 3, 4, 5, 7, 10, 15, 20];
const code = (kind: "N" | "R", y: number) => `ZC_TSB_Z${kind}D_${String(y).padStart(2, "0")}Y_MA`;

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
  // A failure is cached briefly too, so a BoI outage is not hammered per click.
  boiCache = { at: value ? Date.now() : Date.now() - 6 * 3600_000 + 300_000, value };
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

export async function GET() {
  const [boi, saved] = await Promise.all([fromBoi(), readSaved()]);
  return NextResponse.json({ forecast: boi, boi, saved }, { headers: { "Cache-Control": "private, max-age=300" } });
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
