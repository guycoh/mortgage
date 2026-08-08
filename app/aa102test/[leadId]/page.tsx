// /aa102test/<leadId> — one lead's board.
//
// The lead is resolved on the server so the header carries the right name on
// first paint (no flash of "בחרו ליד"), and an id that does not exist 404s
// instead of rendering an empty board that would happily save itself.

import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Simulator from "../Simulator";
import { parseTool } from "../lib/tools";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Leads change under us; never serve this from the build cache.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ leadId: string }> }) {
  const { leadId } = await params;
  return { title: `סימולטור תמהילים · ליד ${leadId}` };
}

export default async function LeadBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ leadId: string }>;
  /** ?tool= picks the instrument — resolved here so a deep link paints the
   *  right one on the first frame instead of showing the ledger and swapping
   *  it out. */
  searchParams: Promise<{ tool?: string }>;
}) {
  const { leadId } = await params;
  const { tool } = await searchParams;
  const id = Number(leadId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const { data, error } = await supabase.from("leads").select("id, name").eq("id", id).limit(1);
  if (error || !data?.length) notFound();

  return <Simulator lead={data[0]} initialTool={parseTool(tool)} />;
}
