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
import { lookupAccount } from "../../lib/fireberry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ fbId: string }> }) {
  const { fbId } = await ctx.params;
  const sp = req.nextUrl.searchParams;

  const deny = (reason: string) =>
    NextResponse.redirect(new URL(`/simulator/denied?r=${reason}`, req.url));

  // If the placeholder in the Fireberry button is wrong, what arrives here is
  // the literal token — "{{accountid}}" — rather than a GUID. That is a
  // configuration mistake, not an access one, and saying so turns a baffling
  // refusal into an instruction.
  const looksLikeGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fbId);
  if (!looksLikeGuid) return deny("notoken");

  const check = verifyLink(fbId, sp.get("n"), sp.get("exp"), sp.get("sig"));
  if (!check.ok) return deny(check.reason === "expired" ? "expired" : "invalid");

  // Ask Fireberry who this is. On an unsigned link the answer is also the
  // gate: the GUID is the only credential such a link carries, so we open the
  // board only for an id Fireberry recognises. A made-up GUID gets nothing and,
  // just as importantly, creates no leads row.
  //
  // "We could not ask" is not "no such account". A signed link is trusted on
  // its signature; an unsigned one is refused, because letting an outage turn
  // into an open door is exactly the failure worth avoiding.
  const found = await lookupAccount(check.fbId);
  if (found.known === false) return deny("invalid");
  if (found.known === "unknown" && !check.signed) return deny("unavailable");

  const name = check.name || (found.known === true ? found.name : null) || "";

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
