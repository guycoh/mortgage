// /aa105test/<leadId> — one lead's board, with the full-screen reading views.
// Same lead resolution as /aa102test/<leadId>.

import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import Simulator from "@/app/aa102test/Simulator";
import { parseTool } from "@/app/aa102test/lib/tools";
import "../board.css";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  searchParams: Promise<{ tool?: string }>;
}) {
  const { leadId } = await params;
  const { tool } = await searchParams;
  const id = Number(leadId);
  if (!Number.isFinite(id) || id <= 0) notFound();

  const { data, error } = await supabase.from("leads").select("id, name").eq("id", id).limit(1);
  if (error || !data?.length) notFound();

  return <Simulator lead={data[0]} initialTool={parseTool(tool)} variant="v105" base="/aa105test" />;
}
