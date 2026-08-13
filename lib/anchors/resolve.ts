// Row → anchor. Pure, so the same logic answers the API and can be tested without
// a database.
//
// The two halves are deliberately separate: choosing WHICH anchor a row is priced
// off is domain logic that belongs in code, while WHAT that anchor is worth today
// is data that belongs in a table. Mixing them is how a registry ends up with a
// number nobody can date.

import { BANK_RULES, FAMILY_FRESHNESS, FAMILY_LABEL, SNAPSHOT } from "./registry";
import type {
  AnchorFamily,
  AnchorRequestRow,
  AnchorResultRow,
  AnchorRow,
} from "./types";

/**
 * The board's five canonical tracks (PATH_IDS in app/aa102test/lib/credit).
 * Repeated as a local constant rather than imported: lib/ answering an API route
 * should not reach up into a page's module graph for two integers.
 */
const PATH = {
  prime: 1,
  fixedUnlinked: 2,
  fixedLinked: 3,
  varUnlinked: 4,
  varLinked: 5,
} as const;

/** Which published table this row is priced off, or why none applies. */
function familyFor(
  row: AnchorRequestRow
): { family: AnchorFamily } | { status: "NOT_APPLICABLE" | "UNSUPPORTED"; reason: string } {
  // Prime first, and before the bank is even consulted. It is the one anchor that
  // is genuinely identical everywhere — BOI's rate plus a fixed 1.5% — so a prime
  // row from a lender with no pricing rule on record still resolves correctly.
  if (row.pathId === PATH.prime) return { family: "prime" };

  if (row.pathId === PATH.fixedLinked || row.pathId === PATH.fixedUnlinked) {
    return {
      status: "NOT_APPLICABLE",
      reason: "ריבית קבועה — אינה נגזרת מעוגן",
    };
  }

  const rule = BANK_RULES[row.bank?.trim() ?? ""];
  if (!rule) {
    return {
      status: "UNSUPPORTED",
      reason: row.bank
        ? `אין כלל תמחור מתועד עבור ${row.bank}`
        : "השורה אינה מציינת גוף מימון",
    };
  }

  // Bank + track first, bank + linkage second. A per-track override is how a
  // lender that reads a different dataset for one of its products gets recorded
  // — Leumi's annual unlinked off מק"ם is the verified case, and the same slot
  // takes any other once its definition is read off the bank's own page.
  const linkage =
    row.pathId === PATH.varLinked ? "linked" : row.pathId === PATH.varUnlinked ? "unlinked" : null;
  if (!linkage) return { status: "NOT_APPLICABLE", reason: "מסלול שאינו נגזר מעוגן" };

  const override = rule.overrides?.[`${linkage}:${row.resetMonths ?? ""}`];
  if (override) return { family: override };
  return { family: linkage === "linked" ? rule.linked : rule.unlinked };
}

/**
 * The newest published value at or before `asOf`, for one family and reset period.
 *
 * "At or before" rather than "newest overall": the table is a history, and a row
 * dated next week is a scheduled value, not today's.
 */
function pick(
  rows: AnchorRow[],
  family: AnchorFamily,
  resetMonths: number | null,
  asOf: string
): AnchorRow | null {
  const matches = rows.filter(
    (r) =>
      r.family === family &&
      (family === "prime" || r.resetMonths === resetMonths) &&
      r.effectiveAt <= asOf
  );
  if (!matches.length) return null;
  return matches.reduce((best, r) => (r.effectiveAt > best.effectiveAt ? r : best));
}

/** Reset periods a family actually publishes, for the "no such column" message. */
function publishedPeriods(rows: AnchorRow[], family: AnchorFamily): number[] {
  return Array.from(
    new Set(
      rows
        .filter((r) => r.family === family && r.resetMonths !== null)
        .map((r) => r.resetMonths as number)
    )
  ).sort((a, b) => a - b);
}

/** Months as an advisor says them — "כל 5 שנים" — for the messages. */
function periodWords(m: number): string {
  if (m % 12 === 0) return m === 12 ? "שנה" : `${m / 12} שנים`;
  return `${m} חודשים`;
}

/**
 * Resolve one row against a set of published anchors.
 *
 * `available` is the merged table: database rows first, the bundled snapshot
 * behind them. Nothing here reaches the network — by the time this runs the
 * values are already in memory, which is what makes the button feel instant.
 */
export function resolveRow(
  row: AnchorRequestRow,
  available: AnchorRow[],
  asOf: string
): AnchorResultRow {
  const chosen = familyFor(row);
  if ("status" in chosen) {
    return { rowId: row.rowId, status: chosen.status, reason: chosen.reason };
  }
  const { family } = chosen;
  const needsPeriod = family !== "prime";

  if (needsPeriod && (row.resetMonths === null || !Number.isFinite(row.resetMonths) || row.resetMonths <= 0)) {
    return {
      rowId: row.rowId,
      status: "INSUFFICIENT_DATA",
      reason: "השורה אינה מציינת תדירות שינוי — בלעדיה אין עמודה בטבלת העוגנים",
    };
  }

  const hit = pick(available, family, needsPeriod ? row.resetMonths : null, asOf);
  if (!hit) {
    // A reset period with no published column. Interpolating between the
    // neighbouring columns would be inventing a rate, so it says what it has
    // instead — which is also what tells an advisor the row's period is unusual.
    const periods = publishedPeriods(available, family);
    return {
      rowId: row.rowId,
      status: "INSUFFICIENT_DATA",
      reason: periods.length
        ? `${FAMILY_LABEL[family]} אינו מתפרסם לתדירות של ${periodWords(row.resetMonths as number)} (מתפרסם ל־${periods.map(periodWords).join(", ")})`
        : `אין ערך מפורסם עבור ${FAMILY_LABEL[family]}`,
    };
  }

  // The published value, untouched. No bank-level floor is applied: a 0% floor
  // was carried here for מזרחי on the strength of a commentary article, and the
  // bank's own historical anchor tables print negative values across several
  // maturities — so the floor was not a rule, it was a guess wearing one. A
  // clamp belongs here only against an exact contractual source.
  const value = hit.value;

  // Age is judged against the family's OWN cadence — see FAMILY_FRESHNESS. A
  // three-week-old prime is current; a three-week-old bond anchor has had a
  // successor published and should say so. Still returned either way: the latest
  // published value is the right answer even when it is old, and the alternative
  // is refusing to answer over a number that is not wrong.
  const fresh = FAMILY_FRESHNESS[family];
  const ageDays = Math.floor(
    (Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${hit.effectiveAt}T00:00:00Z`)) / 86_400_000
  );

  return {
    rowId: row.rowId,
    status: "RESOLVED",
    anchor: Math.round(value * 1000) / 1000,
    family,
    familyLabel: FAMILY_LABEL[family],
    effectiveAt: hit.effectiveAt,
    source: hit.source,
    verified: hit.verified,
    stale: Number.isFinite(ageDays) && ageDays > fresh.maxAgeDays,
    cadence: fresh.cadence,
  };
}

/**
 * Database rows layered over the bundled snapshot.
 *
 * Both are keyed the same way, so a table row simply shadows the snapshot entry
 * it shares a key with and everything else falls through. That is what lets the
 * feature work before the migration has been run, and lets a half-filled table
 * be an improvement rather than a regression.
 */
export function mergeAnchors(dbRows: AnchorRow[]): AnchorRow[] {
  const key = (r: AnchorRow) => `${r.family}|${r.resetMonths ?? "-"}|${r.effectiveAt}`;
  const seen = new Set(dbRows.map(key));
  return [...dbRows, ...SNAPSHOT.filter((r) => !seen.has(key(r)))];
}

export { SNAPSHOT };
