// Session plumbing for the admin panel. Shared by the auth route (which mints
// the cookie) and the page (which checks it) — a route file may only export
// HTTP methods, so the logic lives here.

import { createHmac, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE = "sim_admin";

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
