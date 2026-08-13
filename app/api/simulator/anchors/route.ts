// עדכון עוגנים — resolve the current anchor for a set of board rows.
//
// ONE request for a whole mix, however many banks are in it. The board sends the
// three facts that price a row (lender, track, reset period) and gets back one
// verdict per row; nothing about a click reaches outside this server.
//
// The values come from `mortgage_anchors`, our own cache, with the dated snapshot
// in lib/anchors/registry.ts behind it — so the button works before the migration
// has been run (see supabase/mortgage-anchors.sql) and keeps working if the table
// is unreachable. Refreshing the cache is a separate, scheduled concern: an
// advisor pressing a button must never wait on six bank websites.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { mergeAnchors, resolveRow } from "@/lib/anchors/resolve";
import type { AnchorFamily, AnchorResponse, AnchorRow } from "@/lib/anchors/types";

export const dynamic = "force-dynamic";

const Body = z.object({
  rows: z
    .array(
      z.object({
        rowId: z.string().trim().min(1).max(64),
        bank: z.string().trim().max(80).default(""),
        pathId: z.number().int().min(0).max(99),
        resetMonths: z.number().int().min(0).max(600).nullable().default(null),
      })
    )
    .min(1)
    .max(200),
});

const FAMILIES: AnchorFamily[] = ["prime", "bond_linked", "bond_unlinked", "makam"];

/**
 * The cache, if it is there.
 *
 * A missing table is not an error worth failing the request over — it is the
 * state every install is in until someone runs the migration, and the snapshot
 * covers it. Anything unexpected is swallowed for the same reason: an anchor
 * button that 500s is worse than one that answers with a dated value and says
 * where it came from.
 */
async function readCache(): Promise<AnchorRow[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const supabase = createClient(url, key);
    const { data, error } = await supabase
      .from("mortgage_anchors")
      .select("family, reset_months, value, effective_at, source, source_url, verified, note")
      .order("effective_at", { ascending: false })
      .limit(1000);
    if (error || !data) return null;
    return data
      .filter((r) => FAMILIES.includes(r.family as AnchorFamily))
      .map((r) => ({
        family: r.family as AnchorFamily,
        resetMonths: r.reset_months === null ? null : Number(r.reset_months),
        value: Number(r.value),
        effectiveAt: String(r.effective_at).slice(0, 10),
        source: r.source ?? "",
        sourceUrl: r.source_url ?? undefined,
        verified: !!r.verified,
        note: r.note ?? undefined,
      }))
      .filter((r) => Number.isFinite(r.value));
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const cached = await readCache();
  const available = mergeAnchors(cached ?? []);
  // Measured against the server's date, not the browser's: an anchor is a dated
  // fact and a client clock that is a week fast would silently promote a
  // scheduled value into today's.
  const asOf = new Date().toISOString().slice(0, 10);

  const rows = body.rows.map((r) => resolveRow(r, available, asOf));

  const usedDb = !!cached?.length;
  const origin: AnchorResponse["origin"] = !usedDb
    ? "snapshot"
    : cached.length >= available.length
      ? "db"
      : "mixed";

  return NextResponse.json({ resolvedAt: new Date().toISOString(), origin, rows } satisfies AnchorResponse);
}
