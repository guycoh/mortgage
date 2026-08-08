// /simulator/board — the board the Fireberry link leads to.
//
// There is no id in this URL. The lead comes from the httpOnly cookie the
// door handed out, which is the whole point: with nothing to edit, there is
// nothing to enumerate. Lose the cookie (or wait twelve hours) and you go back
// to the record in Fireberry and click again.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
// /aa102test — the ledger — is the design and behaviour of record for this
// board. It is imported whole rather than copied: one simulator, rendered here
// with the lead fixed instead of chosen. Fonts and theme.css travel with the
// component (see its own imports), so this route declares neither.
import Simulator from "@/app/aa102test/Simulator";
import { FB_COOKIE, readCookieSession } from "../lib/fblink";
import { recordEvent } from "../lib/telemetry";

export const dynamic = "force-dynamic";
export const metadata = { title: "סימולטור תמהילים" };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function BoardPage({
  searchParams,
}: {
  /** ?tool=reverse opens straight on משכנתא הפוכה, so a Fireberry button can
   *  point at the reverse calculator for a client rather than landing on the
   *  ledger and asking the advisor to switch. The other two routes that render
   *  this component already honour it; this one was the odd one out. */
  searchParams: Promise<{ tool?: string }>;
}) {
  const { tool } = await searchParams;
  const session = readCookieSession((await cookies()).get(FB_COOKIE)?.value);
  if (!session) redirect("/simulator/denied?r=expired");
  const leadId = session.leadId;

  const { data } = await supabase.from("leads").select("id, name").eq("id", leadId).limit(1);
  const lead = data?.[0];
  if (!lead) redirect("/simulator/denied?r=invalid");

  // The render itself is the "someone actually reached the board" event —
  // door_entry only proves the link worked.
  void recordEvent({
    ts: new Date().toISOString(),
    event: "board_view",
    surface: "board",
    lead_id: lead.id,
    lead_name: lead.name ?? null,
    operator: session.operator || null,
  });

  // locked: this session was granted one lead. The picker would navigate to
  // /aa102test/<id>, which is unauthenticated and takes its id from the URL —
  // a door out of the very scoping the cookie exists to enforce.
  return (
    <Simulator
      lead={lead}
      endpoint="/api/simulator/mixes"
      locked
      initialTool={tool === "reverse" ? "reverse" : "mix"}
    />
  );
}
