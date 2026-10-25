// /aa107test optimizer runs — every mix the optimizer proposed or an advisor applied.
//
// POST { leadId?, marketBuiltAt?, settings, input, result, applied } → { id } | { stored: false }
// GET  ?lead=N → the lead's last 20 runs (newest first)
//
// Same-origin only on POST. Without the table (migration not applied yet) the
// board keeps working; the answer just says nothing was stored.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

export const dynamic = "force-dynamic";

function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

const Body = z.object({
  leadId: z.number().int().positive().nullable().optional(),
  marketBuiltAt: z.string().max(40).nullable().optional(),
  settings: z.record(z.string(), z.unknown()),
  input: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()),
  applied: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const raw = await req.text();
  if (raw.length > 400_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  const parsed = Body.safeParse(JSON.parse(raw || "null"));
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const supabase = db();
  if (!supabase) return NextResponse.json({ stored: false, reason: "no database" });
  const p = parsed.data;
  const { data, error } = await supabase
    .from("mix_optimizer_runs")
    .insert({
      lead_id: p.leadId ?? null,
      market_built_at: p.marketBuiltAt ?? null,
      settings: p.settings,
      input: p.input,
      result: p.result,
      applied: p.applied,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ stored: false, reason: error.message });
  return NextResponse.json({ stored: true, id: data.id });
}

export async function GET(req: NextRequest) {
  const lead = Number(req.nextUrl.searchParams.get("lead"));
  if (!Number.isFinite(lead) || lead <= 0) return NextResponse.json({ runs: [] });
  const supabase = db();
  if (!supabase) return NextResponse.json({ runs: [] });
  const { data, error } = await supabase
    .from("mix_optimizer_runs")
    .select("id, created_at, settings, result, applied")
    .eq("lead_id", lead)
    .order("created_at", { ascending: false })
    .limit(20);
  return NextResponse.json({ runs: error ? [] : data ?? [] });
}
