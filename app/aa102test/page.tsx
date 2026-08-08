// /aa102test with no lead — the same surface, on a blank board.
//
// It used to reopen whichever lead was looked at last out of localStorage, so
// this URL was never actually empty and two people opening the same link saw
// different boards. The lead now lives in the path (/aa102test/3) and nowhere
// else, which leaves this route free to be what it should be: a working
// surface with nothing in it yet.
//
// You can drag a report in and edit here. Saving needs a lead, because the
// server is the only store — the button says so until one is picked.
//
// ?lead=3 was the old shape and still works; the redirect is done here on the
// server rather than in an effect, so a legacy link never paints a blank board
// first. ?tool= picks the instrument and survives that redirect.

import { redirect } from "next/navigation";
import Simulator from "./Simulator";
import { parseTool } from "./lib/tools";

export default async function Aa102TestPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; tool?: string }>;
}) {
  const { lead, tool } = await searchParams;
  const initialTool = parseTool(tool);

  const id = Number(lead);
  if (Number.isFinite(id) && id > 0) {
    redirect(`/aa102test/${id}${initialTool === "mix" ? "" : `?tool=${initialTool}`}`);
  }

  return <Simulator lead={null} initialTool={initialTool} />;
}
