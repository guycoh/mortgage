// /simulator/board — the board the Fireberry link leads to.
//
// There is no id in this URL. The lead comes from the httpOnly cookie the
// door handed out, which is the whole point: with nothing to edit, there is
// nothing to enumerate. Lose the cookie (or wait twelve hours) and you go back
// to the record in Fireberry and click again.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Simulator from "@/app/aa100test/Simulator";
import { FB_COOKIE, readCookie } from "../lib/fblink";
import "@fontsource-variable/rubik";
import "@fontsource-variable/archivo";
import "@fontsource/assistant/hebrew-400.css";
import "@fontsource/assistant/hebrew-600.css";
import "@fontsource/assistant/hebrew-700.css";
import "@/app/aa100test/theme.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "סימולטור תמהילים" };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function BoardPage() {
  const leadId = readCookie((await cookies()).get(FB_COOKIE)?.value);
  if (!leadId) redirect("/simulator/denied?r=expired");

  const { data } = await supabase.from("leads").select("id, name").eq("id", leadId).limit(1);
  const lead = data?.[0];
  if (!lead) redirect("/simulator/denied?r=invalid");

  // locked: this session was granted one lead. The picker would navigate to
  // /aa100test/<id>, which is unauthenticated and takes its id from the URL —
  // a door out of the very scoping the cookie exists to enforce.
  return <Simulator lead={lead} endpoint="/api/simulator/mixes" locked />;
}
