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

/**
 * The שם לקוח for an account, or null if we cannot get it — a missing name is
 * never a reason to refuse entry, only a reason to show a placeholder.
 */
export async function accountName(fbId: string): Promise<string | null> {
  const token = process.env.FIREBERRY_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(`${BASE}/api/record/${ACCOUNT}/${encodeURIComponent(fbId)}`, {
      headers: { tokenid: token, accept: "application/json" },
      // the record is the point of the request; never serve a stale name
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;

    const body = (await res.json()) as {
      data?: { Record?: Record<string, unknown>; record?: Record<string, unknown> };
    };
    const rec = body.data?.Record ?? body.data?.record;
    const name = rec?.accountname;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  } catch {
    // A timeout or an expired token must not stop someone opening their board.
    return null;
  }
}
