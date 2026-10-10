// POST /api/summary — freeze a client brief and hand back its link and code.
//
// Body: { payload: BriefPayload, leadId?: number }. The brief is built on the
// board (app/aa105test/lib/brief) and stored as is, in the same table and under
// the same rules as a mix offer: a 6-digit code (returned once, stored hashed),
// a 14-day expiry, service-role only. `payload.kind = "brief"` is what keeps
// /offer and /summary from ever rendering each other's rows.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { OFFER_DAYS, db, hashCode, newCode, newId } from "@/app/offer/lib/store";

export const dynamic = "force-dynamic";

const text = (n: number) => z.string().max(n);
const money = z.number().finite();
const Figure = z.object({ kind: z.enum(["money", "share", "rate", "count", "years"]), value: money }).nullable();
const Pain = z.object({
  id: text(80),
  tone: z.enum(["critical", "high", "medium", "info"]),
  group: z.enum(["act", "check", "info"]),
  figure: Figure,
  good: z.boolean().optional(),
  title: text(120),
  say: text(900),
  next: text(400).optional(),
});
const Fact = z.object({ text: text(160), heat: z.enum(["hot", "warm"]).optional() });
const Row = z.object({
  key: text(400),
  source: text(160),
  name: text(120),
  kind: text(120).optional(),
  dot: text(20).optional(),
  facts: z.array(Fact).max(12),
  balance: money,
  balanceHeat: z.enum(["hot", "warm"]).optional(),
  monthly: money.nullable(),
  monthlyLabel: text(40).optional(),
  monthlyHeat: z.enum(["hot", "warm"]).optional(),
  monthlyNotes: z.array(text(120)).max(4),
  alarm: z.boolean().optional(),
});
const BookRow = z.object({
  key: text(400),
  source: text(160),
  name: text(120),
  dot: text(20).optional(),
  balance: money,
  monthly: money.nullable(),
  monthlyLabel: text(40).optional(),
  rate: text(40).nullable(),
  hot: z.boolean().optional(),
  late: z.boolean().optional(),
});
const BookGroup = z.object({
  key: text(20),
  title: text(60),
  color: text(20),
  rows: z.array(BookRow).max(40),
  total: z.object({ balance: money, monthly: money }),
});
const Slice = z.object({ key: text(40), label: text(60), color: text(20), balance: money, monthly: money, interest: money });
const Doc = z.object({
  source: z.enum(["credit", "bank"]),
  who: text(120),
  asOf: text(40),
  lender: text(80).optional(),
  balance: money,
  monthly: money.nullable(),
  yearlyInterest: money.nullable(),
  futureInterest: money.nullable(),
  interestShare: money.nullable(),
  ends: z.object({ label: text(10), years: z.number().int() }).nullable(),
  count: z.object({ debts: z.number().int(), lenders: z.number().int() }),
  slices: z.array(Slice).max(10),
  skew: z
    .object({ label: text(60), color: text(20), balanceShare: money, lens: z.enum(["monthly", "interest"]), lensShare: money })
    .nullable(),
  pains: z.array(Pain).max(40),
  book: z.array(BookGroup).max(4),
  groups: z
    .array(
      z.object({
        key: text(20),
        title: text(60),
        color: text(20),
        rows: z.array(Row).max(60),
        lines: z.array(text(200)).max(6),
        total: z.object({ balance: money, monthly: money }),
      })
    )
    .max(6),
  cards: money,
  payoff: z
    .object({ balance: money, accrued: money, fee: money, operational: money, payoff: money, feeMissing: z.number().int(), free: money })
    .nullable(),
  notes: z.array(text(300)).max(10),
});
const Body = z.object({
  leadId: z.number().int().positive().optional(),
  payload: z.object({
    kind: z.literal("brief"),
    v: z.literal(1),
    createdAt: text(40),
    client: text(80),
    advisor: z.object({ name: text(60), phone: text(30) }),
    doc: Doc,
  }),
});

export async function POST(req: NextRequest) {
  // Created from the board only — a page on this domain is not a form for strangers.
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (origin && host && new URL(origin).host !== host)
    return NextResponse.json({ error: "בקשה ממקור לא מוכר" }, { status: 403 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "נתוני הסיכום אינם תקינים" }, { status: 400 });
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

  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const base = host ? `${proto}://${host}` : new URL(req.url).origin;
  return NextResponse.json({ id, code, url: `${base}/summary/${id}`, expiresAt: expires.toISOString() });
}
