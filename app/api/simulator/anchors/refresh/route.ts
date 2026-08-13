// Refill the anchor cache from source. Run on a schedule, never from a click.
//
// This is the ONLY place in the feature that talks to the outside world, and it
// is deliberately not on the path an advisor waits on: pressing עדכון עוגנים
// reads `mortgage_anchors`, and this route is what keeps that table worth
// reading. Splitting them is the difference between a button that answers in
// 40ms and one that answers when six websites feel like it.
//
// What it can refresh today:
//
//   prime  — from the Bank of Israel's own published rate. Authoritative,
//            structured, and the arithmetic on top of it (BOI + 1.5%) is fixed
//            by convention across every lender.
//
// What it cannot, yet:
//
//   bond_linked / bond_unlinked / makam — these derive from the zero yield curve
//            BOI publishes as SDMX dataflow ZCM (and מק"ם yields). The dataflow
//            is identified and its structure endpoint verified; the data endpoint
//            form is not, so nothing here pretends to read it. Those families are
//            maintained by inserting rows — see docs/mortgage-anchor-sources.md —
//            and the resolver already prefers the newest row at or before today,
//            so a hand-entered value and a fetched one behave identically.
//
// Nothing is ever written from a guess: a source that fails to parse leaves the
// previous value in place, which is the correct behaviour for a number that
// walks into a repayment schedule.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/** The Bank of Israel's published rate, as structured JSON. */
const BOI_RATE_URL = "https://boi.org.il/PublicApi/GetInterest";
/** Prime is the Bank of Israel's rate plus a spread fixed across all lenders. */
const PRIME_SPREAD = 1.5;

interface Written {
  family: string;
  value: number;
  effectiveAt: string;
  source: string;
}

/**
 * BOI rate → prime.
 *
 * `lastPublishedDate` is when the rate was published, which is the date the
 * anchor took effect — not today. Stamping it with today would make an
 * eight-week-old rate look like this morning's and defeat the freshness rules
 * the board shows.
 */
async function readPrime(): Promise<Written | { error: string }> {
  try {
    const res = await fetch(BOI_RATE_URL, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    if (!res.ok) return { error: `בנק ישראל החזיר ${res.status}` };
    const json: unknown = await res.json();
    const rate = (json as { currentInterest?: unknown })?.currentInterest;
    const published = (json as { lastPublishedDate?: unknown })?.lastPublishedDate;
    if (typeof rate !== "number" || !Number.isFinite(rate) || rate < -5 || rate > 25) {
      return { error: "ריבית בנק ישראל לא נקראה מהתשובה" };
    }
    const effectiveAt =
      typeof published === "string" && /^\d{4}-\d{2}-\d{2}/.test(published)
        ? published.slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    return {
      family: "prime",
      value: Math.round((rate + PRIME_SPREAD) * 1000) / 1000,
      effectiveAt,
      source: `ריבית בנק ישראל ${rate}% + ${PRIME_SPREAD}%`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "כשל בפנייה לבנק ישראל" };
  }
}

export async function POST(req: NextRequest) {
  // A write endpoint on a public route needs a shared secret, not merely to be
  // hard to guess. Absent the env var it refuses rather than defaulting open.
  const secret = process.env.ANCHOR_REFRESH_SECRET;
  const given = req.headers.get("x-refresh-secret");
  if (!secret || given !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return NextResponse.json({ error: "supabase not configured" }, { status: 500 });
  }

  const prime = await readPrime();
  if ("error" in prime) {
    return NextResponse.json({ written: [], errors: [prime.error] }, { status: 502 });
  }

  const supabase = createClient(url, key);
  const { error } = await supabase.from("mortgage_anchors").upsert(
    {
      family: prime.family,
      reset_months: null,
      value: prime.value,
      effective_at: prime.effectiveAt,
      source: prime.source,
      source_url: BOI_RATE_URL,
      verified: true,
    },
    // Same key as the unique index. Re-running on a day BOI has not moved is a
    // no-op rather than a duplicate row.
    { onConflict: "family,reset_months,effective_at", ignoreDuplicates: false }
  );

  if (error) {
    return NextResponse.json({ written: [], errors: [error.message] }, { status: 500 });
  }

  return NextResponse.json({
    written: [prime],
    // Named, so a cron log says what is still hand-maintained rather than
    // implying the whole table just refreshed.
    notRefreshed: ["bond_linked", "bond_unlinked", "makam"],
  });
}
