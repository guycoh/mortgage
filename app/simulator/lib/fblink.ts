// Signed deep links from Fireberry.
//
// A Fireberry record button hands us an account GUID. On its own that is just
// a number in a URL: change it and you get someone else's board. So the button
// signs (id + name + expiry) with a shared secret and we verify it here.
//
// What this does and does not buy:
//   · it does stop someone editing the id in the address bar
//   · it does NOT stop someone who can read the button's source, because the
//     secret has to live in that page to be computed there. It is a boundary
//     against tampering, not against a determined insider — the real boundary
//     is that Fireberry itself is behind a login.
//
// The signature covers the expiry too, so a leaked link stops working rather
// than living forever in someone's browser history.

import { createHmac, timingSafeEqual } from "node:crypto";

export const FB_COOKIE = "fb_sim";

/** Canonical string that gets signed. Order matters on both sides. */
function payload(fbId: string, name: string, exp: number): string {
  return `${fbId}|${name}|${exp}`;
}

function hmac(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

/** Length-safe comparison — a plain === leaks timing on a hex compare. */
function equal(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

export type LinkCheck =
  | { ok: true; fbId: string; name: string }
  | { ok: false; reason: "no-secret" | "missing" | "expired" | "bad-signature" };

/**
 * Verify a link built by the Fireberry button.
 * `exp` is a unix timestamp in seconds.
 */
export function verifyLink(
  fbId: string,
  name: string | null,
  exp: string | null,
  sig: string | null
): LinkCheck {
  const secret = process.env.FB_LINK_SECRET;
  // Fail closed. A missing secret in production must not mean "let everyone in".
  if (!secret) return { ok: false, reason: "no-secret" };
  if (!fbId || !exp || !sig) return { ok: false, reason: "missing" };

  const expNum = Number(exp);
  if (!Number.isFinite(expNum)) return { ok: false, reason: "missing" };
  if (expNum * 1000 < Date.now()) return { ok: false, reason: "expired" };

  const expected = hmac(payload(fbId, name ?? "", expNum), secret);
  if (!equal(expected, sig)) return { ok: false, reason: "bad-signature" };

  return { ok: true, fbId, name: name ?? "" };
}

/** Build a link — used by the test helper and by anything server-side. */
export function signLink(fbId: string, name: string, ttlSeconds = 12 * 60 * 60) {
  const secret = process.env.FB_LINK_SECRET;
  if (!secret) throw new Error("FB_LINK_SECRET is not set");
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = hmac(payload(fbId, name, exp), secret);
  return { exp, sig, query: `n=${encodeURIComponent(name)}&exp=${exp}&sig=${sig}` };
}

/* ------------------------------------------------------------------ cookie */

/**
 * Once a link checks out we drop a signed, httpOnly cookie naming the lead it
 * unlocked. The API reads the lead FROM the cookie and ignores any id in the
 * request, so there is no parameter left to tamper with — you can only ever
 * reach the board your link was for.
 */
export function signCookie(leadId: number): string | null {
  const secret = process.env.FB_LINK_SECRET;
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60;
  return `${leadId}.${exp}.${hmac(`${leadId}|${exp}`, secret)}`;
}

/** The lead a cookie grants, or null if it is absent, stale or forged. */
export function readCookie(value: string | undefined): number | null {
  const secret = process.env.FB_LINK_SECRET;
  if (!secret || !value) return null;
  const [idRaw, expRaw, sig] = value.split(".");
  const id = Number(idRaw);
  const exp = Number(expRaw);
  if (!Number.isFinite(id) || !Number.isFinite(exp) || !sig) return null;
  if (exp * 1000 < Date.now()) return null;
  if (!equal(hmac(`${id}|${exp}`, secret), sig)) return null;
  return id;
}
