// Sign-in for /console. POST with form fields `user` + `pass`; a correct pair
// mints a signed, httpOnly, 30-day cookie scoped to /console and redirects to
// the panel. A wrong pair goes back to the form with a flag — after a
// deliberate pause, so guessing costs time.
//
// The signing secret is SIMULATOR_ADMIN_KEY; the credentials live only as
// ADMIN_USER + ADMIN_PASS_HASH (scrypt salt:hash). Nothing here echoes what
// was wrong: a bad username and a bad password come back identically, so the
// form cannot be used to discover which names exist.

import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  mintAdminCookie,
  verifyCredentials,
} from "@/app/simulator/lib/admin-auth";

export const dynamic = "force-dynamic";

/** Per-IP failure memory: after 5 misses, a 30-second cold shoulder. */
const failures = new Map<string, { n: number; until: number }>();

function ipOf(req: NextRequest): string {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "local";
}

export async function POST(req: NextRequest) {
  const back = (flag: string) =>
    NextResponse.redirect(new URL(`/console?e=${flag}`, req.url), 303);

  const secret = process.env.SIMULATOR_ADMIN_KEY;
  if (!secret) return back("cfg");

  const ip = ipOf(req);
  const jail = failures.get(ip);
  if (jail && jail.until > Date.now()) return back("wait");

  let user = "";
  let pass = "";
  try {
    const form = await req.formData();
    user = String(form.get("user") ?? "");
    pass = String(form.get("pass") ?? "");
  } catch {
    return back("bad");
  }

  if (!verifyCredentials(user, pass)) {
    // A flat second per miss keeps humans unbothered and scripts slow.
    await new Promise((r) => setTimeout(r, 1000));
    const n = (jail?.n ?? 0) + 1;
    failures.set(ip, { n, until: n >= 5 ? Date.now() + 30_000 : 0 });
    return back("bad");
  }

  failures.delete(ip);
  const res = NextResponse.redirect(new URL("/console", req.url), 303);
  res.cookies.set(ADMIN_COOKIE, mintAdminCookie(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/console",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}

/** Sign out: drop the cookie, land back on the form. */
export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/console", req.url), 303);
  if (req.nextUrl.searchParams.get("logout") !== null) {
    res.cookies.set(ADMIN_COOKIE, "", { path: "/console", maxAge: 0 });
  }
  return res;
}
