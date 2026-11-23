// Refresh app/aa102test/lib/boi-snapshot.json (anchor + policy-rate history)
// from the Bank of Israel — the copy the forecast route falls back on when BoI is unreachable from the server
// (see lib/boi.ts). Run from a machine that reaches edge.boi.org.il, before a push:
//
//   npx tsx --tsconfig tsconfig.json scripts/refresh-boi-snapshot.mts

import fs from "node:fs";
import path from "node:path";
import { historyFromZcm } from "../app/aa102test/lib/forecast";
import { policyChanges } from "../app/aa102test/lib/boi";

const BASE = "https://edge.boi.org.il/FusionEdgeServer/sdmx/v2/data/dataflow/BOI.STATISTICS";
const get = async (url: string) => {
  for (let k = 0; k < 3; k++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (r.ok) return await r.text();
    } catch {}
  }
  throw new Error(`BoI did not answer: ${url}`);
};

const [hist, policy] = await Promise.all([
  get(`${BASE}/ZCM/1.0/?startPeriod=2011-01&format=csv`),
  get(`${BASE}/BR/1.0/MNT_RIB_BOI_D?startPeriod=2010-01&format=csv`),
]);

const snap = {
  fetchedAt: new Date().toISOString(),
  history: historyFromZcm(hist),
  policy: policyChanges(policy),
};
if (!snap.history || snap.policy.length < 10) throw new Error("incomplete BoI data — snapshot left as it was");

const out = path.join(process.cwd(), "app/aa102test/lib/boi-snapshot.json");
fs.writeFileSync(out, JSON.stringify(snap));
const last = snap.policy[snap.policy.length - 1];
console.log(`history ${snap.history.from}…+${snap.history.real.length} months · policy rate ${last[1]}% (to ${last[0]})`);
