// POST /api/offer — freeze an offer and hand back its link and code.
//
// Body: { payload: OfferPayload, leadId?: number }. The payload is computed on
// the board (lib/offer#buildOffer) and stored as is; the server adds the id, the
// 6-digit code (returned once, stored only as a hash) and the 14-day expiry.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OFFER_DAYS, db, hashCode, newCode, newId } from "@/app/offer/lib/store";

export const dynamic = "force-dynamic";

const nums = z.array(z.number().finite()).max(800);
const Side = z.object({
  principal: z.number(),
  months: z.number().int().min(1).max(600),
  totalPaid: z.number(),
  cost: z.number(),
  perShekel: z.number(),
  firstPayment: z.number(),
  peak: z.number(),
  peakYear: z.number().int(),
  payments: nums,
  balances: nums,
  costByYear: nums,
});
const Body = z.object({
  leadId: z.number().int().positive().optional(),
  payload: z.object({
    v: z.literal(1),
    createdAt: z.string().max(40),
    client: z.string().max(80),
    advisor: z.object({ name: z.string().max(60), phone: z.string().max(30) }),
    basis: z.string().max(160),
    current: Side,
    proposed: Side,
  }),
});

export async function POST(req: NextRequest) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "הנתונים להצעה אינם תקינים" }, { status: 400 });
  const supabase = db();
  if (!supabase) return NextResponse.json({ error: "אין חיבור למסד הנתונים" }, { status: 500 });

  const id = newId();
  const code = newCode();
  const expires = new Date(Date.now() + OFFER_DAYS * 864e5);
  const { error } = await supabase.from("mix_offers").insert({
    id,
    expires_at: expires.toISOString(),
    lead_id: parsed.data.leadId ?? null,
    client_name: parsed.data.payload.client || null,
    payload: parsed.data.payload,
    code_hash: hashCode(code),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const origin = host ? `${proto}://${host}` : new URL(req.url).origin;
  return NextResponse.json({ id, code, url: `${origin}/offer/${id}`, expiresAt: expires.toISOString() });
}
