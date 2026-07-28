// The door a Fireberry record button knocks on.
//
//   GET /simulator/fb/<accountid>?n=<name>&exp=<unix>&sig=<hmac>
//
// This is a route handler rather than a page for two reasons. The mechanical
// one: only a route handler (or a Server Action) may set a cookie, and the
// signed link has to become a session somehow. The better one: it lets us hand
// the browser a final URL with no id in it at all — /simulator/board — so once
// you are through the door there is no longer any parameter to edit.
//
// Failure never explains itself in detail. "Which lead exists" is not something
// an unsigned caller should be able to learn by watching error messages, so a
// forged signature and an unknown account come back the same way.

import { NextRequest, NextResponse } from "next/server";
import { FB_COOKIE, signCookie, verifyLink } from "../../lib/fblink";
import { leadForFireberry } from "../../lib/lead";
import { accountName } from "../../lib/fireberry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ fbId: string }> }) {
  const { fbId } = await ctx.params;
  const sp = req.nextUrl.searchParams;

  const deny = (reason: string) =>
    NextResponse.redirect(new URL(`/simulator/denied?r=${reason}`, req.url));

  const check = verifyLink(fbId, sp.get("n"), sp.get("exp"), sp.get("sig"));
  if (!check.ok) return deny(check.reason === "expired" ? "expired" : "invalid");

  // The name is optional in the link — a button that can only supply the record
  // id signs an empty one, and we read שם לקוח from Fireberry instead. Failing
  // to get it is not a reason to refuse entry.
  const name = check.name || (await accountName(check.fbId)) || "";

  let lead;
  try {
    lead = await leadForFireberry(check.fbId, name);
  } catch {
    return deny("server");
  }
  if (!lead) return deny("server");

  const cookie = signCookie(lead.id);
  if (!cookie) return deny("server");

  const res = NextResponse.redirect(new URL("/simulator/board", req.url));
  res.cookies.set(FB_COOKIE, cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
  return res;
}
