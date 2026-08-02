// The beacon the simulator client fires events at.
//
// Writes go through here so the browser never holds a key that can touch the
// telemetry table: the client sends a small JSON blob, this route validates
// it hard with zod, stamps it with what only the server knows (lead + operator
// from the httpOnly cookie, ip, user-agent) and inserts with the service role.
//
// sendBeacon posts as text/plain to stay preflight-free, so the body is read
// as text and parsed manually.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { FB_COOKIE, readCookieSession } from "@/app/simulator/lib/fblink";
import {
  EVENT_NAMES,
  recordEvent,
  requestIp,
  requestUa,
  type SimEvent,
} from "@/app/simulator/lib/telemetry";

export const dynamic = "force-dynamic";

const str = (max: number) => z.string().trim().max(max);

const Body = z.object({
  event: z.enum(EVENT_NAMES),
  session_id: str(64).optional(),
  kind: z.enum(["credit", "bank"]).optional(),
  bank: str(60).optional(),
  client_name: str(120).optional(),
  client_id: str(20).optional(),
  file_name: str(160).optional(),
  pages: z.number().int().min(0).max(2000).optional(),
  ok: z.boolean().optional(),
  duration_ms: z.number().int().min(0).max(600_000).optional(),
  mortgages: z.number().int().min(0).max(200).optional(),
  loans: z.number().int().min(0).max(200).optional(),
  skipped: z.number().int().min(0).max(200).optional(),
  total_balance: z.number().min(0).max(1e10).optional(),
  total_monthly: z.number().min(0).max(1e8).optional(),
  error: str(400).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  let parsed: z.infer<typeof Body>;
  try {
    parsed = Body.parse(JSON.parse(await req.text()));
  } catch {
    // Malformed beacons are dropped silently — nothing here is worth a retry
    // loop on the client, and an attacker learns nothing from a flat 204.
    return new NextResponse(null, { status: 204 });
  }

  // The panel monitors /simulator/board and nothing else. A board session is
  // the proof the beacon came from there — no cookie, no row. This also keeps
  // the dev surface (/aa102test) out of the statistics by construction.
  const session = readCookieSession(req.cookies.get(FB_COOKIE)?.value);
  if (!session) return new NextResponse(null, { status: 204 });

  const row: SimEvent = {
    ts: new Date().toISOString(),
    ...parsed,
    surface: "board",
    lead_id: session.leadId,
    operator: session.operator || null,
    ip: requestIp(req),
    ua: requestUa(req),
  };

  await recordEvent(row);
  return new NextResponse(null, { status: 204 });
}
