// The board API for /aa100test, where the lead is named in the request.
//
// This is the sandbox route: it takes the lead as a parameter and does not ask
// who is calling. Anything reached from Fireberry goes through
// /api/simulator/mixes instead, which takes the lead from a signed cookie and
// so cannot be pointed at a board it was not granted.
//
// Both share ./board, so what a board IS never differs between them.

import { NextRequest, NextResponse } from "next/server";
import { loadBoard, saveBoard, type BoardMix } from "./board";

export async function GET(req: NextRequest) {
  const lead = Number(req.nextUrl.searchParams.get("lead"));
  if (!Number.isFinite(lead) || lead <= 0) {
    return NextResponse.json({ error: "lead חסר או לא תקין" }, { status: 400 });
  }
  try {
    return NextResponse.json(await loadBoard(lead));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בטעינה" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { lead?: number; mixes?: BoardMix[] };
    const lead = Number(body.lead);
    if (!Number.isFinite(lead) || lead <= 0 || !Array.isArray(body.mixes)) {
      return NextResponse.json({ error: "payload לא תקין" }, { status: 400 });
    }
    return NextResponse.json(await saveBoard(lead, body.mixes));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "שגיאה בשמירה" },
      { status: 500 }
    );
  }
}
