// Reading a client's name back from Fireberry.
//
// The button signs (id + name + expiry), but getting the name out of a
// Fireberry HTML widget depends on template tokens we cannot rely on being
// there. So the name is optional: a button that can only supply the record id
// signs an empty name, and we look it up here instead. One fewer thing for the
// button to get right is one fewer way for it to open the wrong client.
//
// Read-only, always. Nothing in this app writes to Fireberry.

const BASE = "https://api.fireberry.com";
const ACCOUNT = 1; // objecttype for לקוח

export type Lookup =
  /** Fireberry answered and the account is real. */
  | { known: true; name: string | null }
  /** Fireberry answered and there is no such account. */
  | { known: false }
  /** We could not ask — no token, a timeout, an outage. */
  | { known: "unknown" };

/**
 * Look an account up by GUID.
 *
 * Two jobs. The obvious one is reading שם לקוח. The load-bearing one is telling
 * a real account from an invented GUID: an unsigned link is trusted only as far
 * as Fireberry confirms the id, so a stranger POSTing random UUIDs gets nothing
 * and — this is the part that matters — creates no junk leads rows.
 *
 * The third state is deliberate. "We could not ask" must not read as "does not
 * exist", or an expired token would lock every client out of their own board.
 */
export async function lookupAccount(fbId: string): Promise<Lookup> {
  const token = process.env.FIREBERRY_TOKEN;
  if (!token) return { known: "unknown" };

  try {
    const res = await fetch(`${BASE}/api/record/${ACCOUNT}/${encodeURIComponent(fbId)}`, {
      headers: { tokenid: token, accept: "application/json" },
      // the record is the point of the request; never serve a stale name
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    // Fireberry answers an unknown record id with 400 and a generic message,
    // not 404 — so a rejected id means "no such account", while an auth or
    // server failure has to stay "could not ask".
    if (res.status === 400 || res.status === 404) return { known: false };
    if (res.status === 401 || res.status === 403) return { known: "unknown" };
    if (!res.ok) return { known: "unknown" };

    const body = (await res.json()) as {
      success?: boolean;
      data?: { Record?: Record<string, unknown>; record?: Record<string, unknown> };
    };
    const rec = body.data?.Record ?? body.data?.record;
    if (!rec || Object.keys(rec).length === 0) return { known: false };

    const name = rec.accountname;
    return { known: true, name: typeof name === "string" && name.trim() ? name.trim() : null };
  } catch {
    // A timeout or an expired token must not stop someone opening their board.
    return { known: "unknown" };
  }
}
