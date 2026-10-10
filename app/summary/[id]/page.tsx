// /summary/<id> — the client's own copy of the סיכום ללקוח.
//
// The same door as /offer: a 6-digit code opens it once per device (the unlock
// route mints a cookie scoped to this path). Until then the page shows the code
// screen and nothing else — not the client's name, not a figure. Never indexed.

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cookieName, readOffer, stateOf, verifySession } from "@/app/offer/lib/store";
import Unlock from "@/app/offer/[id]/Unlock";
import Gone from "@/app/offer/[id]/Gone";
import type { BriefPayload } from "@/app/aa105test/lib/brief";
import SummaryView from "./SummaryView";
import "@fontsource-variable/inter";
import "@fontsource/assistant/hebrew-300.css";
import "@fontsource/assistant/hebrew-400.css";
import "@fontsource/assistant/hebrew-600.css";
import "@fontsource/assistant/hebrew-700.css";
import "@/app/offer/offer.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "סיכום החובות שלכם · מורגי",
  robots: { index: false, follow: false, nocache: true },
  openGraph: { title: "סיכום החובות שלכם", siteName: "מורגי", images: [] },
};

const WORDS = {
  expired: "תוקף הקישור פג.",
  revoked: "הסיכום כבר לא זמין.",
  missing: "לא מצאנו את הסיכום.",
};

export default async function SummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await readOffer(id);
  const state = stateOf(row);
  const next = "לקבלת סיכום מעודכן, פנו ליועץ שלכם.";
  if (state !== "ok" || !row) return <Gone state={state === "ok" ? "missing" : state} words={WORDS} next={next} />;
  const payload = row.payload as unknown as BriefPayload;
  if (payload.kind !== "brief") return <Gone state="missing" words={WORDS} next={next} />;

  const jar = await cookies();
  if (!verifySession(id, jar.get(cookieName(id))?.value))
    return <Unlock id={id} title="סיכום החובות שלכם" words={WORDS} />;

  return <SummaryView payload={payload} expiresAt={row.expires_at} />;
}
