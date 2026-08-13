// Refill the anchor cache from source. Run on a schedule.
//
// The sources themselves live in lib/anchors/sources.ts, shared with the
// freshness gate on the read path — two copies of "where does prime come from"
// is how the scheduled job and the live request end up disagreeing.
//
// This route exists so refreshing can be driven on a cron without waiting for
// somebody to press a button, and so a deploy can be verified by calling it.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { refreshFromSources, UNREFRESHABLE } from "@/lib/anchors/sources";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // A write endpoint on a public route needs a shared secret, not merely to be
  // hard to guess. Absent the env var it refuses rather than defaulting open.
  const secret = process.env.ANCHOR_REFRESH_SECRET;
  if (!secret || req.headers.get("x-refresh-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  }

  const written = await refreshFromSources();
  if (!written.length) {
    return NextResponse.json({ written: [], notRefreshed: UNREFRESHABLE }, { status: 502 });
  }

  const supabase = createClient(url, key);
  const { error } = await supabase
    .from("mortgage_anchors")
    // Same key as the unique index. Re-running on a day nothing moved is a
    // no-op rather than a duplicate row.
    .upsert(written, { onConflict: "family,reset_months,effective_at" });

  if (error) return NextResponse.json({ written: [], errors: [error.message] }, { status: 500 });

  // Named, so a cron log says what is still hand-maintained rather than
  // implying the whole table just refreshed.
  return NextResponse.json({ written, notRefreshed: UNREFRESHABLE });
}
