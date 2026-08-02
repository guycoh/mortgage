// The only way into the admin panel: GET /simulator/admin/auth?key=<secret>.
//
// A right key mints a signed, httpOnly cookie and lands on the dashboard with
// a clean URL — the secret never sits in the address bar afterwards. A wrong
// key 404s, exactly like every other path under /simulator that doesn't
// exist, so probing this route teaches an outsider nothing.

import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, mintAdminCookie, safeEqual } from "../../lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.SIMULATOR_ADMIN_KEY;
  const key = req.nextUrl.searchParams.get("key") ?? "";

  if (!secret || !key || !safeEqual(key, secret)) {
    return new NextResponse(null, { status: 404 });
  }

  const res = NextResponse.redirect(new URL("/simulator/admin", req.url));
  res.cookies.set(ADMIN_COOKIE, mintAdminCookie(secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/simulator/admin",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
