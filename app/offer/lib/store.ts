// Server-only plumbing for /offer/<id>: the table, the 6-digit code, the cookie.
//
// An offer is a frozen payload in `mix_offers` (service role only — RLS on, no
// policies), opened by a 6-digit code the advisor sends beside the link. The
// code is stored as scrypt(salt, code); a right answer mints a signed cookie
// scoped to that offer's path, so the client types it once per device. Eight
// wrong answers lock the offer for 15 minutes — a 6-digit space is a million
// guesses, and the lock makes it a year's work.

import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { OfferPayload } from "@/app/aa102test/lib/offer";

export const OFFER_DAYS = 14;
export const MAX_TRIES = 8;
export const LOCK_MINUTES = 15;

export function db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
}

/** Signing key for the session cookie — its own env var, else derived from the service key. */
function secret(): string {
  const own = process.env.OFFER_SECRET;
  if (own) return own;
  const base = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return createHmac("sha256", base).update("mix-offer-cookie-v1").digest("hex");
}

const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** 12 characters from a 57-letter alphabet without look-alikes (~70 bits). */
export function newId(): string {
  const bytes = randomBytes(12);
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(code: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(code, salt, 32).toString("hex")}`;
}

export function checkCode(code: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const got = scryptSync(code, salt, 32);
  const want = Buffer.from(hash, "hex");
  return got.length === want.length && timingSafeEqual(got, want);
}

export const cookieName = (id: string) => `ofr_${id}`;

export function mintSession(id: string, expiresAt: Date): string {
  const exp = Math.floor(Math.min(expiresAt.getTime(), Date.now() + OFFER_DAYS * 864e5) / 1000);
  return `${exp}.${createHmac("sha256", secret()).update(`${id}|${exp}`).digest("hex")}`;
}

export function verifySession(id: string, value: string | undefined): boolean {
  if (!value) return false;
  const [expRaw, sig] = value.split(".");
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || !sig || exp * 1000 < Date.now()) return false;
  const want = createHmac("sha256", secret()).update(`${id}|${exp}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

export type OfferRow = {
  id: string;
  expires_at: string;
  client_name: string | null;
  payload: OfferPayload;
  code_hash: string;
  attempts: number;
  locked_until: string | null;
  revoked: boolean;
};

export async function readOffer(id: string): Promise<OfferRow | null> {
  if (!/^[A-Za-z0-9]{8,24}$/.test(id)) return null;
  const supabase = db();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("mix_offers")
    .select("id, expires_at, client_name, payload, code_hash, attempts, locked_until, revoked")
    .eq("id", id)
    .limit(1);
  if (error || !data?.length) return null;
  return data[0] as OfferRow;
}

export type OfferState = "ok" | "missing" | "expired" | "revoked";
export function stateOf(row: OfferRow | null): OfferState {
  if (!row) return "missing";
  if (row.revoked) return "revoked";
  if (new Date(row.expires_at).getTime() < Date.now()) return "expired";
  return "ok";
}
