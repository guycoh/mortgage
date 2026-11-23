// Bank of Israel history the engine dates old rates against, with a copy in
// the repo.
//
// WHY A COPY. The anchor history (lib/forecast#historyFromZcm — what a bond
// anchor WAS in the month a bank fixed it) and the policy-rate history (what
// prime WAS on a letter's date) come from BoI's SDMX feed on edge.boi.org.il,
// which the forecast route could not reach on 23/11/2026: /api/simulator/
// forecast answered with no history at all, so every Mizrahi built-in margin
// ("תוספת מיכונית") went unread on the live site. The route still asks BoI
// first; this copy stands in when it cannot (the curves themselves have their
// own copy, app/api/simulator/forecast/boi-last.json). Refresh before a push:
//
//   npx tsx --tsconfig tsconfig.json scripts/refresh-boi-snapshot.mts
//
// The policy rate moves eight times a year at most; primeAt refuses to answer
// for dates past the copy's reach rather than quote a rate that may have
// changed since (POLICY_REACH_DAYS).

import snapshot from "./boi-snapshot.json";
import type { AnchorHistory } from "./forecast";

export type BoiSnapshot = {
  /** When the copy was taken (ISO). */
  fetchedAt: string;
  history: AnchorHistory | null;
  /** BoI policy-rate changes, [effective date "yyyy-mm-dd", rate %], oldest first; the last entry is the last day observed. */
  policy: [string, number][];
};

export const BOI_SNAPSHOT = snapshot as unknown as BoiSnapshot;

/** BoI's daily policy-rate series (MNT_RIB_BOI_D) → its change points. */
export function policyChanges(csv: string): [string, number][] {
  const lines = csv.trim().split(/\r?\n/);
  const head = (lines[0] ?? "").split(",");
  const iCode = head.indexOf("SERIES_CODE");
  const iTime = head.indexOf("TIME_PERIOD");
  const iVal = head.indexOf("OBS_VALUE");
  if (iTime < 0 || iVal < 0) return [];
  const rows = lines
    .slice(1)
    .map((l) => l.split(","))
    .filter((c) => (iCode < 0 || c[iCode] === "MNT_RIB_BOI_D") && /^\d{4}-\d{2}-\d{2}$/.test(c[iTime] ?? "") && Number.isFinite(Number(c[iVal])))
    .map((c) => [c[iTime], Number(c[iVal])] as [string, number])
    .sort((a, b) => a[0].localeCompare(b[0]));
  const out: [string, number][] = [];
  for (const r of rows) if (!out.length || out[out.length - 1][1] !== r[1]) out.push(r);
  // The last observation date, so primeAt knows how far the series reaches.
  if (rows.length && out[out.length - 1][0] !== rows[rows.length - 1][0]) out.push(rows[rows.length - 1]);
  return out;
}

/** How long past the series' last observation a rate may still be quoted. */
const POLICY_REACH_DAYS = 45;

/**
 * Prime (BoI rate + 1.5) in force on `d`, or null when the series does not
 * reach that day (before 2010, or past the snapshot by more than
 * POLICY_REACH_DAYS — a decision may have happened since).
 */
export function primeAt(d: Date, policy: [string, number][] = BOI_SNAPSHOT.policy): number | null {
  if (!policy.length) return null;
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (day < policy[0][0]) return null;
  const last = new Date(`${policy[policy.length - 1][0]}T00:00:00`);
  if (d.getTime() - last.getTime() > POLICY_REACH_DAYS * 86_400_000) return null;
  let rate = policy[0][1];
  for (const [at, r] of policy) {
    if (at > day) break;
    rate = r;
  }
  return Math.round((rate + 1.5) * 100) / 100;
}
