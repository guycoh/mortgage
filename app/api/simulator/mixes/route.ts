// The board API for Fireberry-linked sessions.
//
// The one difference from /api/aa100/mixes, and the whole point of this route:
// the lead comes from the signed httpOnly cookie, never from the request. There
// is no lead parameter to change, so a caller cannot reach a board their link
// did not grant — which is the hole a signed page URL alone would leave open,
// since the API sits behind no such check.
//
// The heavy lifting is shared with /api/aa100/mixes so the two can never drift
// apart on how a board is read or written.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { FB_COOKIE, readCookie } from "@/app/simulator/lib/fblink";
import { loadBoard, saveBoard, type BoardMix } from "@/app/api/aa100/mixes/board";

async function leadFromCookie(): Promise<number | null> {
  const jar = await cookies();
  return readCookie(jar.get(FB_COOKIE)?.value);
}

const denied = () =>
  NextResponse.json({ error: "הקישור פג תוקף. חזרו לכרטיס הלקוח ולחצו שוב." }, { status: 401 });

export async function GET() {
  const lead = await leadFromCookie();
  if (!lead) return denied();
  try {
    return NextResponse.json(await loadBoard(lead));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const lead = await leadFromCookie();
  if (!lead) return denied();
  try {
    const body = (await req.json()) as { mixes?: BoardMix[] };
    if (!Array.isArray(body.mixes)) {
      return NextResponse.json({ error: "payload לא תקין" }, { status: 400 });
    }
    // note: body.lead, if present, is ignored on purpose
    return NextResponse.json(await saveBoard(lead, body.mixes));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "שגיאה" }, { status: 500 });
  }
}
