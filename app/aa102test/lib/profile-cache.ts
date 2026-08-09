// ONE GET PER PROFILE, PER SITTING.
//
// Both tools open by reading the client's card (reverse-profile /
// ability-profile), and both are unmounted whole on every tool switch — so a
// bare fetch in the mount effect re-asked Fireberry the same question every
// time the advisor crossed the tabs, and the prefill landed a beat after the
// view did. The promise itself is cached here, module-scope, so:
//
//   · a switch back opens with the answer already in hand — no refetch, no
//     late-landing figures;
//   · the ToolSwitch's preload hook can WARM a profile while the pointer is
//     still travelling to the tab, the same way it warms the code chunk;
//   · two callers racing for one URL share a single request.
//
// A failed read deletes itself, so one bad response never poisons the session
// — the next mount simply asks again. The card is read-only reference data on
// this surface; nothing here can write, so staleness within one sitting is the
// card's own edit latency, which the old per-mount fetch had too.

const inFlight = new Map<string, Promise<unknown>>();

export function readProfile<T>(url: string): Promise<T> {
  let p = inFlight.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.json());
    inFlight.set(url, p);
    p.catch(() => inFlight.delete(url));
  }
  return p as Promise<T>;
}

/** Fire-and-forget: start the read so a later readProfile finds it done. */
export function warmProfile(url: string) {
  readProfile(url).catch(() => {});
}
