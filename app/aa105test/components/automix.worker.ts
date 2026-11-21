// תמהיל אופטימלי — the solver, off the main thread.
//
// A 27-row report takes about a second to solve for every goal (several MILPs
// per goal, two bank structures on some files). On the main thread that is a
// second in which the sheet cannot paint, scroll or take a keystroke. The
// engine is pure — no DOM, no window, plain data in and out — so it runs here
// unchanged, and the sheet stays live while it does.
//
// One request at a time is all the sheet ever wants answered; a newer request
// simply carries a higher id and the sheet ignores answers to older ones.

import { buildAutoMix } from "../lib/automix";
import type { AutoMixInput, AutoMixResult } from "../lib/automix/types";

export type SolveRequest = { id: number; input: AutoMixInput };
export type SolveReply = { id: number; result?: AutoMixResult; error?: string };

const scope = self as unknown as {
  onmessage: ((e: MessageEvent<SolveRequest>) => void) | null;
  postMessage: (m: SolveReply) => void;
};

scope.onmessage = (e) => {
  const { id, input } = e.data;
  try {
    scope.postMessage({ id, result: buildAutoMix(input) });
  } catch (err) {
    scope.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
