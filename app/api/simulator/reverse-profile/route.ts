// GET /api/simulator/reverse-profile — the three facts משכנתא הפוכה opens on,
// read from the client's Fireberry card: שווי הנכס, גיל לווה 1, גיל לווה 2.
//
// READ-ONLY against Fireberry, like everything in this app. One GET per open;
// nothing is written back and nothing is cached.
//
// Who is being asked about:
//   · a Fireberry board session (/simulator/board) — the signed fb_sim cookie
//     names the lead, exactly as /api/simulator/mixes trusts it
//   · the open sandbox (/aa102test/<id>) — ?lead=<id>, honoured only if that
//     lead was ever linked to a Fireberry account (leads.fireberry_id)
//
// The field map, from the Account object's own metadata (objecttype 1):
//   שווי הנכס   pcfsystemfield170 (number) → pcfsystemfield196 (number, the
//               נכס-קיים section) → pcfsystemfield19 (legacy text, digits only)
//   גיל לווה 1  pcfAge (number) → derived from תאריך לידה לווה 1 (pcfsystemfield147)
//   גיל לווה 2  pcfsystemfield114 (number) → derived from תאריך לידה לווה 2
//               (pcfsystemfield158)
// A stated age wins over a derived one; a derived one is used only when the
// card carries the birth date and not the age.

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

export type ReverseProfile = {
  /** The lead is linked to a Fireberry account at all. */
  linked: boolean;
  propertyValue: number | null;
  age1: number | null;
  age2: number | null;
};

const EMPTY: ReverseProfile = { linked: false, propertyValue: null, age1: null, age2: null };

/** A number that means something: finite, positive, sane. Fireberry number
 *  fields arrive as numbers, legacy ones as text with separators. */
function money(v: unknown): number | null {
  const n =
    typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
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

    const profile: ReverseProfile = {
      linked: true,
      propertyValue:
        money(rec.pcfsystemfield170) ?? money(rec.pcfsystemfield196) ?? money(rec.pcfsystemfield19),
      age1: age(rec.pcfAge) ?? ageFromBirth(rec.pcfsystemfield147),
      age2: age(rec.pcfsystemfield114) ?? ageFromBirth(rec.pcfsystemfield158),
    };
    return NextResponse.json(profile);
  } catch {
    // An outage or a timeout must not break the tool — it just opens blank,
    // which is exactly what it did before this endpoint existed.
    return NextResponse.json(EMPTY);
  }
}
