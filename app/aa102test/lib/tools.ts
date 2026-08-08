// WHICH INSTRUMENTS THIS SURFACE CARRIES, and how a URL names one.
//
// Deliberately NOT inside ToolSwitch.tsx: that file is "use client", and four
// SERVER components resolve `?tool=` before the first frame — /aa102test, the
// legacy ?lead= redirect, /aa102test/<id> and /simulator/board. A server
// component cannot call into a client module, so the list lives here, in a
// module with no directive at all, and both sides import it.
//
// One place decides this, because a fifth tool added to a list of three of
// those routes is a link that silently opens the wrong instrument.

export type Tool = "mix" | "reverse" | "ability";

/** The order the nav band reads in. In RTL the first entry is the rightmost —
 *  and it is also what tells the surface which way a switch travelled. */
export const TOOLS: Tool[] = ["mix", "reverse", "ability"];

/** ?tool= → a tool. Anything unrecognised, absent or malformed is the ledger,
 *  which is the default this app opens on. */
export function parseTool(v: string | null | undefined): Tool {
  return (TOOLS as string[]).includes(v ?? "") ? (v as Tool) : "mix";
}
