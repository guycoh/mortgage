// Session plumbing for the monitoring console (/console). Shared by the auth route
// (which checks credentials and mints the cookie) and the page (which verifies
// it) — a route file may only export HTTP methods, so the logic lives here.
//
// The password never exists in the repo or the env in clear: ADMIN_PASS_HASH
// holds scrypt(salt, password) as `salt:hash`, and login recomputes it.

import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "sim_admin";

/** Username + password against ADMIN_USER / ADMIN_PASS_HASH (salt:hash). */
export function verifyCredentials(user: string, password: string): boolean {
  const wantUser = process.env.ADMIN_USER;
  const stored = process.env.ADMIN_PASS_HASH;
  if (!wantUser || !stored) return false;
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  let computed: string;
  try {
    computed = scryptSync(password, salt, 64).toString("hex");
  } catch {
    return false;
  }
  // Both comparisons are length-safe; user first so the password check always
  // runs against *something* and timing does not reveal which field was wrong.
  const userOk = safeEqual(user, wantUser);
  const passOk = safeEqual(computed, hash);
  return userOk && passOk;
}

function hmac(data: string, secret: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a, "utf8");
  const y = Buffer.from(b, "utf8");
  return x.length === y.length && timingSafeEqual(x, y);
}

/** 30-day admin session: `exp.hmac(admin|exp)`. */
export function mintAdminCookie(secret: string): string {
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  return `${exp}.${hmac(`admin|${exp}`, secret)}`;
}

export function verifyAdminCookie(value: string | undefined, secret: string): boolean {
  if (!value) return false;
  const [expRaw, sig] = value.split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || !sig) return false;
  if (exp * 1000 < Date.now()) return false;
  return safeEqual(hmac(`admin|${exp}`, secret), sig);
}
