// POST /api/offer/<id>/unlock — { code } → the offer's session cookie.
//
// Wrong codes are counted on the row; at MAX_TRIES the offer locks for
// LOCK_MINUTES. The answer never says more than "wrong" / "locked" / "expired".

import { NextRequest, NextResponse } from "next/server";
import {
  LOCK_MINUTES,
  MAX_TRIES,
  OFFER_DAYS,
  checkCode,
  cookieName,
  db,
  mintSession,
  readOffer,
  stateOf,
} from "@/app/offer/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { code?: string };
  const code = String(body.code ?? "").replace(/\D/g, "");
  const row = await readOffer(id);
  const state = stateOf(row);
  if (state !== "ok" || !row) return NextResponse.json({ error: state }, { status: state === "missing" ? 404 : 410 });

  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now())
    return NextResponse.json({ error: "locked" }, { status: 429 });

  // A deliberate pause on every answer, so guessing costs time either way.
  await new Promise((r) => setTimeout(r, 350));

  const supabase = db();
  if (code.length !== 6 || !checkCode(code, row.code_hash)) {
    const attempts = (row.attempts ?? 0) + 1;
    const lock = attempts >= MAX_TRIES;
    await supabase
      ?.from("mix_offers")
      .update({
        attempts: lock ? 0 : attempts,
        locked_until: lock ? new Date(Date.now() + LOCK_MINUTES * 60e3).toISOString() : null,
      })
      .eq("id", id);
    return NextResponse.json({ error: lock ? "locked" : "wrong" }, { status: lock ? 429 : 401 });
  }

  if (row.attempts) await supabase?.from("mix_offers").update({ attempts: 0, locked_until: null }).eq("id", id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookieName(id), mintSession(id, new Date(row.expires_at)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    // A client brief lives at /summary/<id>; the cookie opens only that page.
    path: (row.payload as { kind?: string }).kind === "brief" ? `/summary/${id}` : `/offer/${id}`,
    maxAge: OFFER_DAYS * 86400,
  });
  return res;
}
