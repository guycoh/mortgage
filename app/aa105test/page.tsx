// /aa105test — the /aa102test board with the client brief and the analyses
// presented full-screen (app/aa105test/components). Everything else on the
// board is the same Simulator; only the four reading views differ.

import { redirect } from "next/navigation";
import Simulator from "@/app/aa102test/Simulator";
import { parseTool } from "@/app/aa102test/lib/tools";

export default async function Aa105TestPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; tool?: string }>;
}) {
  const { lead, tool } = await searchParams;
  const initialTool = parseTool(tool);

  const id = Number(lead);
  if (Number.isFinite(id) && id > 0) {
    redirect(`/aa105test/${id}${initialTool === "mix" ? "" : `?tool=${initialTool}`}`);
  }

  return <Simulator lead={null} initialTool={initialTool} variant="v105" base="/aa105test" />;
}
