// /aa107test market data — what new loans cost today, from the Bank of Israel.
//
// GET → { snapshot, origin, stale }
//   1. memory (six hours),
//   2. the newest row in `mortgage_market_snapshots` if under three days old,
//   3. a live build from the BoI (lib/market-boi.ts), stored as a new snapshot
//      plus its raw observations in `mortgage_market_rates`,
//   4. whatever is stored, however old, or the snapshot committed with the code.
// Nothing here can fail the board: the committed snapshot is always an answer.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buildMarket, type MarketBuild } from "@/app/aa107test/lib/market-boi";
import type { MarketSnapshot } from "@/app/aa107test/lib/market";
import fallback from "@/app/aa107test/lib/market-snapshot.json";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FRESH_MS = 3 * 24 * 3600_000;
let memory: { at: number; snapshot: MarketSnapshot; origin: string } | null = null;

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

async function stored(): Promise<{ snapshot: MarketSnapshot; builtAt: string } | null> {
  const supabase = db();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from("mortgage_market_snapshots")
      .select("built_at, snapshot")
      .order("built_at", { ascending: false })
      .limit(1);
    if (error || !data?.length) return null;
    return { snapshot: data[0].snapshot as MarketSnapshot, builtAt: data[0].built_at as string };
  } catch {
    return null;
  }
}

async function store(b: MarketBuild): Promise<void> {
  const supabase = db();
  if (!supabase) return;
  try {
    await supabase.from("mortgage_market_snapshots").insert({
      built_at: b.snapshot.builtAt,
      level_period: b.snapshot.levelPeriod,
      bank_period: b.snapshot.bankPeriod,
      snapshot: b.snapshot,
    });
    const L = b.level;
    const rows = [
      ...b.banks.rows.map((r) => ({ source: "boi_compare", period: b.banks.period, bank: r.bank, track: r.track, segment: "housing", metric: r.metric, value: r.value })),
      ...[
        ["klz", "housing", "rate", L.klz],
        ["kz", "housing", "rate", L.kz],
        ["kz", "housing", "term", L.kzTerm],
        ["mz", "housing", "margin", L.mzMargin],
        ["mz", "housing", "benchmark", L.mzBench],
        ["klz", "all_purpose", "rate", L.ap.klz],
        ["kz", "all_purpose", "rate", L.ap.kz],
        ["mz", "all_purpose", "margin", L.ap.mzMargin],
      ].map(([track, segment, metric, value]) => ({ source: "boi_bir_mrtg", period: L.period, bank: "system", track, segment, metric, value })),
      { source: "boi_rate", period: b.snapshot.boi.since, bank: "system", track: "all", segment: "housing", metric: "rate", value: b.snapshot.boi.rate },
    ];
    await supabase.from("mortgage_market_rates").upsert(rows, { onConflict: "source,period,bank,track,segment,metric" });
  } catch {
    /* the table may not exist yet — the snapshot is still served */
  }
}

export async function GET(req: Request) {
  const force = new URL(req.url).searchParams.has("refresh");
  if (!force && memory && Date.now() - memory.at < 6 * 3600_000) return NextResponse.json({ snapshot: memory.snapshot, origin: memory.origin, stale: false });

  const saved = await stored();
  if (!force && saved && Date.now() - Date.parse(saved.builtAt) < FRESH_MS) {
    memory = { at: Date.now(), snapshot: saved.snapshot, origin: "db" };
    return NextResponse.json({ snapshot: saved.snapshot, origin: "db", stale: false });
  }

  try {
    const built = await buildMarket();
    await store(built);
    memory = { at: Date.now(), snapshot: built.snapshot, origin: "live" };
    return NextResponse.json({ snapshot: built.snapshot, origin: "live", stale: false });
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    const snapshot = saved?.snapshot ?? (fallback as unknown as MarketSnapshot);
    // A failure is remembered briefly so the BoI is not hammered per click.
    memory = { at: Date.now() - 6 * 3600_000 + 600_000, snapshot, origin: saved ? "db-stale" : "bundled" };
    return NextResponse.json({ snapshot, origin: memory.origin, stale: true, reason });
  }
}
