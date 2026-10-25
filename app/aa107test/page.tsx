// /aa107test — the /aa105test board plus the optimal-mix generator
// (app/aa107test/components/Optimizer). Everything else is the same Simulator.

import { redirect } from "next/navigation";
import Simulator from "@/app/aa102test/Simulator";
import { parseTool } from "@/app/aa102test/lib/tools";
import "../aa105test/board.css";
import "./board.css";

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

  return <Simulator lead={null} initialTool={initialTool} variant="v105" base="/aa107test" optimizer />;
}
