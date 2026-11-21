// /aa107test — the /aa105test board plus תמהיל אופטימלי, the goal-driven mix
// builder (app/aa105test/components/AutoMix). Everything else is the same
// Simulator; /aa105test itself does not offer the builder.

import { redirect } from "next/navigation";
import Simulator from "@/app/aa102test/Simulator";
import { parseTool } from "@/app/aa102test/lib/tools";
import "../aa105test/board.css";

export default async function Aa107TestPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; tool?: string }>;
}) {
  const { lead, tool } = await searchParams;
  const initialTool = parseTool(tool);

  const id = Number(lead);
  if (Number.isFinite(id) && id > 0) {
    redirect(`/aa107test/${id}${initialTool === "mix" ? "" : `?tool=${initialTool}`}`);
  }

  return <Simulator lead={null} initialTool={initialTool} variant="v105" base="/aa107test" autoMix />;
}
