// /offer/<id> — the client's page for one mix offer.
//
// No login: a 6-digit code opens it once per device (app/api/offer/<id>/unlock
// mints a cookie scoped to this path). Until then the page shows the code
// screen and nothing else — not the client's name, not a figure. Never indexed.

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cookieName, readOffer, stateOf, verifySession } from "../lib/store";
import OfferView from "./OfferView";
import Unlock from "./Unlock";
import Gone from "./Gone";
import "@fontsource-variable/inter";
import "@fontsource/assistant/hebrew-300.css";
import "@fontsource/assistant/hebrew-400.css";
import "@fontsource/assistant/hebrew-600.css";
import "@fontsource/assistant/hebrew-700.css";
import "../offer.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "הצעת המשכנתא שלכם · מורגי",
  robots: { index: false, follow: false, nocache: true },
  openGraph: { title: "הצעת המשכנתא שלכם", siteName: "מורגי", images: [] },
};

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await readOffer(id);
  const state = stateOf(row);
  if (state !== "ok" || !row) return <Gone state={state === "ok" ? "missing" : state} />;

  const jar = await cookies();
  if (!verifySession(id, jar.get(cookieName(id))?.value)) return <Unlock id={id} />;

  // Only what the page draws crosses to the browser. An offer stored before the
  // composition was dropped still carries `tracks` — never send them.
  const strip = <T extends object>(side: T) => {
    const { tracks: _t, ...rest } = side as T & { tracks?: unknown };
    return rest as T;
  };
  const offer = { ...row.payload, current: strip(row.payload.current), proposed: strip(row.payload.proposed) };
  return <OfferView offer={offer} expiresAt={row.expires_at} />;
}
