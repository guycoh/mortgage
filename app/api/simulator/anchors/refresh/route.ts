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

/**
 * Two callers, two credentials, one door.
 *
 * Vercel's scheduler sends `Authorization: Bearer $CRON_SECRET`, and that is not
 * negotiable — a cron entry cannot carry a custom header. A person verifying a
 * deploy by hand sends `x-refresh-secret`. Either is sufficient; neither has a
 * default, so an unconfigured environment refuses rather than opening.
 */
function authorized(req: NextRequest): boolean {
  const cron = process.env.CRON_SECRET;
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) return true;
  const manual = process.env.ANCHOR_REFRESH_SECRET;
  if (manual && req.headers.get("x-refresh-secret") === manual) return true;
  return false;
}

/**
 * Vercel cron invokes the path with a **GET**. Exporting only POST is how a cron
 * entry looks perfectly correct in vercel.json and answers 405 every night.
 */
export async function GET(req: NextRequest) {
  return refresh(req);
}

export async function POST(req: NextRequest) {
  return refresh(req);
}

async function refresh(req: NextRequest) {
  if (!authorized(req)) {
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
