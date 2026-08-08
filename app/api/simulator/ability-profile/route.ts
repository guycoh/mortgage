// GET /api/simulator/ability-profile — the facts יכולת החזר opens on, read from
// the client's Fireberry card: שווי הנכס, both ages, both salaries, both
// additional-income lines and the existing monthly loan repayment.
//
// READ-ONLY against Fireberry, like everything in this app. One GET per open;
// nothing is written back and nothing is cached.
//
// Who is being asked about — the same two doors as /api/simulator/reverse-profile:
//   · a Fireberry board session (/simulator/board) — the signed fb_sim cookie
//     names the lead, exactly as /api/simulator/mixes trusts it
//   · the open sandbox (/aa102test/<id>) — ?lead=<id>, honoured only if that
//     lead was ever linked to a Fireberry account (leads.fireberry_id)
//
// THE FIELD MAP, from the Account object's own metadata (objecttype 1). The
// labels are quoted because this schema is full of near-identical decoys and
// the label is the only thing that tells them apart:
//   שווי הנכס              pcfsystemfield170 (number) → pcfsystemfield196
//                          (number, the נכס-קיים block) → pcfsystemfield19
//                          (legacy text, digits only)
//   גיל לווה 1             pcfAge → derived from pcfsystemfield147 (תאריך לידה)
//   גיל לווה 2             pcfsystemfield114 → derived from pcfsystemfield158
//   הכנסה לווה 1           pcfSalary            "הכנסה חודשית נטו מעבודה לווה 1"
//   הכנסה לווה 2           pcfsystemfield164    "הכנסה חודשית נטו מעבודה לווה 2"
//                          → pcfsystemfield115  "הכנסה של בן/בת הזוג" (legacy text)
//   הכנסה נוספת לווה 1     pcfsystemfield163 + pcfsystemfield232
//   הכנסה נוספת לווה 2     pcfsystemfield168 + pcfsystemfield234
//   החזר הלוואות           pcfsystemfield117  "החזר חודשי של ההלואות (לא כולל
//                          המשכנתא)" — a text field holding a number
//
// WHY THE TWO ADDITIONAL-INCOME FIELDS ARE SUMMED. Fireberry carries a client's
// non-salary income as two lines per borrower — "הכנסה ממקורות נוספים" and
// "הכנסה ממקור שני נוסף" — and the calculator has one field for it. Taking only
// the first would silently understate a household that filled in both, which is
// the one kind of error a capacity check must not make. Note the asymmetry in
// the schema: pcfsystemfield168 is a TEXT field even though every one of its
// siblings is a number, so it is parsed rather than read.
//
// Nothing here is authoritative. Every figure lands in an editable field and an
// advisor overrides it by typing.

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { FB_COOKIE, readCookieSession } from "@/app/simulator/lib/fblink";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BASE = "https://api.fireberry.com";
const ACCOUNT = 1; // objecttype for לקוח

export type AbilityProfile = {
  /** The lead is linked to a Fireberry account at all. */
  linked: boolean;
  propertyValue: number | null;
  age1: number | null;
  age2: number | null;
  income1: number | null;
  income2: number | null;
  extraIncome1: number | null;
  extraIncome2: number | null;
  loanRepayment: number | null;
};

const EMPTY: AbilityProfile = {
  linked: false,
  propertyValue: null,
  age1: null,
  age2: null,
  income1: null,
  income2: null,
  extraIncome1: null,
  extraIncome2: null,
  loanRepayment: null,
};

/** A number that means something: finite, positive, sane. Fireberry number
 *  fields arrive as numbers, legacy ones as text with separators. */
function money(v: unknown): number | null {
  const n =
    typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** A MONTHLY figure. Real cards carry junk — the reverse tool met a לווה-2 age
 *  of 43432 in production — so anything past a million a month is treated as a
 *  typo rather than prefilled into a capacity calculation. */
function monthly(v: unknown): number | null {
  const n = money(v);
  return n !== null && n < 1_000_000 ? n : null;
}

/** The two additional-income lines, as one figure. Null when neither is set, so
 *  an untouched card leaves the field genuinely empty rather than showing ₪0. */
function sumMonthly(...vs: unknown[]): number | null {
  let total = 0;
  let any = false;
  for (const v of vs) {
    const n = monthly(v);
    if (n !== null) {
      total += n;
      any = true;
    }
  }
  return any ? total : null;
}

function age(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 && n < 130 ? Math.floor(n) : null;
}

/** Age from a birth date, the way a bank counts it — full years completed. */
function ageFromBirth(v: unknown): number | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  if (Number.isNaN(+d)) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a > 0 && a < 130 ? a : null;
}

export async function GET(req: NextRequest) {
  // The cookie is the stronger claim and wins when both are present.
  const session = readCookieSession((await cookies()).get(FB_COOKIE)?.value);
  const queryLead = Number(req.nextUrl.searchParams.get("lead"));
  const leadId = session?.leadId ?? (Number.isFinite(queryLead) && queryLead > 0 ? queryLead : null);
  if (!leadId) return NextResponse.json(EMPTY);

  const token = process.env.FIREBERRY_TOKEN;
  if (!token) return NextResponse.json(EMPTY);

  try {
    const { data } = await supabase.from("leads").select("fireberry_id").eq("id", leadId).limit(1);
    const fbId = data?.[0]?.fireberry_id;
    if (!fbId || typeof fbId !== "string") return NextResponse.json(EMPTY);

    const res = await fetch(`${BASE}/api/record/${ACCOUNT}/${encodeURIComponent(fbId)}`, {
      headers: { tokenid: token, accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return NextResponse.json({ ...EMPTY, linked: true });

    const body = (await res.json()) as {
      data?: { Record?: Record<string, unknown>; record?: Record<string, unknown> };
    };
    const rec = body.data?.Record ?? body.data?.record;
    if (!rec) return NextResponse.json({ ...EMPTY, linked: true });

    const profile: AbilityProfile = {
      linked: true,
      propertyValue:
        money(rec.pcfsystemfield170) ?? money(rec.pcfsystemfield196) ?? money(rec.pcfsystemfield19),
      age1: age(rec.pcfAge) ?? ageFromBirth(rec.pcfsystemfield147),
      age2: age(rec.pcfsystemfield114) ?? ageFromBirth(rec.pcfsystemfield158),
      income1: monthly(rec.pcfSalary),
      income2: monthly(rec.pcfsystemfield164) ?? monthly(rec.pcfsystemfield115),
      extraIncome1: sumMonthly(rec.pcfsystemfield163, rec.pcfsystemfield232),
      extraIncome2: sumMonthly(rec.pcfsystemfield168, rec.pcfsystemfield234),
      loanRepayment: monthly(rec.pcfsystemfield117),
    };
    return NextResponse.json(profile);
  } catch {
    // An outage or a timeout must not break the tool — it just opens blank,
    // which is exactly what it did before this endpoint existed.
    return NextResponse.json(EMPTY);
  }
}
