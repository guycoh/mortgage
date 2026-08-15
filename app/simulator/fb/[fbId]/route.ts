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
import {
  FB_COOKIE,
  signCookie,
  verifyLink,
  type OperatorSource,
} from "../../lib/fblink";
import { leadForFireberry } from "../../lib/lead";
import { lookupAccount } from "../../lib/fireberry";
import { recordEvent, requestIp, requestUa } from "../../lib/telemetry";

export const dynamic = "force-dynamic";

const GUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

export async function GET(req: NextRequest, ctx: { params: Promise<{ fbId: string }> }) {
  const { fbId: raw } = await ctx.params;
  const sp = req.nextUrl.searchParams;

  // Take the GUID from ANYWHERE in the segment rather than demanding the whole
  // segment be one.
  //
  // Fireberry's HTML widget strips <script>, so the record id can only arrive
  // through a placeholder — and its syntax is not documented anywhere we can
  // reach: the REST API exposes objects and fields but no views or layouts, and
  // the widget markup is not stored on the record. Testing candidates one at a
  // time is a slow loop for whoever is holding the CRM.
  //
  // So the button may list several candidate placeholders in one path. Whichever
  // one Fireberry actually substitutes becomes a GUID; the rest stay literal
  // text and are simply ignored here. One paste, and it either works or reports
  // that none of them substituted.
  const hit = raw.match(GUID);
  const fbId = hit ? hit[0] : raw;

  // Who clicked, when the button knows. The questionnaire passes the Fireberry
  // login that opened it as ?u=, and ?us=user to say so; ?us=owner means it
  // could not read the live login and fell back to the record's מנהל לקוח, who
  // may well be someone else entirely. Absent on old buttons, and never trusted
  // for anything but attribution.
  const operator = (sp.get("u") || "").trim().slice(0, 80);
  const rawSource = (sp.get("us") || "").trim();
  const operatorSource: OperatorSource =
    operator && (rawSource === "user" || rawSource === "owner") ? rawSource : "";

  // The Fireberry record page, so the console can offer the trip back.
  //
  // This ends up as an href in an admin panel, and anyone can put anything in a
  // query string — so it is not stored unless it parses as an absolute https URL
  // on fireberry.com itself. That rules out javascript: and data: by
  // construction, and rules out this parameter being used to point staff at
  // somebody else's site.
  const recordUrl = (() => {
    const param = (sp.get("ru") || "").trim();
    if (!param || param.length > 300) return null;
    try {
      const u = new URL(param);
      if (u.protocol !== "https:") return null;
      if (u.hostname !== "fireberry.com" && !u.hostname.endsWith(".fireberry.com")) return null;
      return u.toString();
    } catch {
      return null;
    }
  })();

  const deny = (reason: string) => {
    void recordEvent({
      ts: new Date().toISOString(),
      event: "door_denied",
      fb_id: hit ? fbId : null,
      operator: operator || null,
      error: reason,
      ip: requestIp(req),
      ua: requestUa(req),
    });
    return NextResponse.redirect(new URL(`/simulator/denied?r=${reason}`, req.url));
  };

  // If the placeholder in the Fireberry button is wrong, what arrives here is
  // the literal token — "{{accountid}}" — rather than a GUID. That is a
  // configuration mistake, not an access one, and saying so turns a baffling
  // refusal into an instruction.
  if (!hit) {
    // Echo back what actually arrived. Trying placeholder syntaxes is otherwise
    // a guessing game against a page that only ever says "no"; seeing the raw
    // value tells you immediately whether Fireberry substituted anything.
    // Reflected into JSX, which escapes it, and only ever reached by a value
    // that is definitionally not a real account id.
    const got = raw.slice(0, 80);
    return NextResponse.redirect(
      new URL(`/simulator/denied?r=notoken&got=${encodeURIComponent(got)}`, req.url)
    );
  }

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
  if (found.known === "unknown" && !check.signed) {
    // A missing token is a deployment that was never rebuilt, not an outage.
    // Naming it is safe: it says nothing about this client, only about us.
    return deny(found.why === "no-token" ? "noenv" : "unavailable");
  }

  const name = check.name || (found.known === true ? found.name : null) || "";

  let lead;
  try {
    lead = await leadForFireberry(check.fbId, name);
  } catch {
    return deny("server");
  }
  if (!lead) return deny("server");

  // signCookie fails for one reason only: no FB_LINK_SECRET. That is a
  // deployment that was never configured, not a fault the client can retry
  // their way out of, so it says so rather than hiding behind "משהו השתבש".
  const cookie = signCookie(lead.id, operator, operatorSource);
  if (!cookie) return deny("nosecret");

  // The session that was just minted, with everything only this route knows.
  void recordEvent({
    ts: new Date().toISOString(),
    event: "door_entry",
    surface: "board",
    fb_id: fbId,
    lead_id: lead.id,
    lead_name: name || null,
    operator: operator || null,
    // Both ride in `data` rather than columns of their own: adding one needs
    // DDL against production, and neither is a dimension anybody groups by.
    data:
      operatorSource || recordUrl
        ? {
            ...(operatorSource ? { operator_source: operatorSource } : {}),
            ...(recordUrl ? { record_url: recordUrl } : {}),
          }
        : null,
    ip: requestIp(req),
    ua: requestUa(req),
  });

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
