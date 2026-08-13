// The vocabulary the anchor resolver speaks, shared by the API route and the board.

/** Which published table a track is priced off. See docs/mortgage-anchor-sources.md. */
export type AnchorFamily = "prime" | "bond_linked" | "bond_unlinked" | "makam";

/** One published anchor: what it is worth, when, and on whose authority. */
export interface AnchorRow {
  family: AnchorFamily;
  /** Reset period in months. null for prime, which has no cycle — it moves with BOI. */
  resetMonths: number | null;
  /** Annual percent, e.g. 3.34 — the same unit as the board's עוגן field. */
  value: number;
  /** ISO date the value took effect. Shown to the advisor; never inferred. */
  effectiveAt: string;
  source: string;
  sourceUrl?: string;
  /**
   * Read off the bank's own price list or a Bank of Israel series, rather than a
   * secondary aggregator. False is not "wrong" — it is "say so in the tooltip".
   */
  verified: boolean;
  note?: string;
}

/**
 * How often a family republishes, and when a value stops being "current".
 *
 * Per family, never global: prime moves only on a Bank of Israel decision (eight
 * or so a year, on dates published a year ahead), the bond curves twice a month,
 * מק"ם monthly. A single staleness rule would either cry stale at a perfectly
 * current prime or stay quiet on a bond anchor two cycles behind.
 */
export interface Freshness {
  /** Human cadence, for the tooltip. */
  cadence: string;
  /** Past this age the value is still the latest published, but says it is old. */
  maxAgeDays: number;
}

/**
 * How one bank prices its variable tracks.
 *
 * The defaults say which dataset the bank's linked and unlinked tracks read in
 * the ordinary case; `overrides` says where a PARTICULAR track departs from it.
 * That second level is not decoration — banks genuinely differ per track, not
 * merely per linkage, and a registry that could only express "this bank uses the
 * nominal curve" would have no way to record a single track that does not.
 */
export interface BankRule {
  /** Family for משתנה צמודה, absent a more specific rule. */
  linked: AnchorFamily;
  /** Family for משתנה לא צמודה, absent a more specific rule. */
  unlinked: AnchorFamily;
  /**
   * Per-track departures, keyed `"linked:60"` / `"unlinked:12"`.
   *
   * Only ever populated from the lender's own published definition. An empty
   * overrides map means "no departure has been VERIFIED", which is a different
   * claim from "there is none" — and the tooltip says as much by carrying the
   * source's `verified: false` through to the advisor.
   */
  overrides?: Record<string, AnchorFamily>;
}

/**
 * Why a row did or did not get an anchor.
 *
 * Every non-RESOLVED case leaves the row exactly as it was. There is no status
 * that means "we guessed" — an anchor nobody published is an anchor this feature
 * does not have, and saying so is the only honest answer on a number that walks
 * straight into a repayment schedule.
 */
export type AnchorStatus =
  | "RESOLVED"
  /** Fixed-rate row, or anything not priced off an external anchor. Not an error. */
  | "NOT_APPLICABLE"
  /** No pricing rule on record for this lender — every non-bank lands here. */
  | "UNSUPPORTED"
  /** The row does not say enough: no reset period, or one no table has a column for. */
  | "INSUFFICIENT_DATA"
  | "ERROR";

/** One row of the board, reduced to what pricing it actually needs. */
export interface AnchorRequestRow {
  rowId: string;
  /** Short lender name as lib/lenders.ts resolves it — "מזרחי טפחות", "לאומי". */
  bank: string;
  /** The board's canonical track id (PATH_IDS in app/aa102test/lib/credit). */
  pathId: number;
  /** תדירות שינוי in months. null when the document never stated one. */
  resetMonths: number | null;
}

export interface AnchorResultRow {
  rowId: string;
  status: AnchorStatus;
  /** Present only when status is RESOLVED. */
  anchor?: number;
  family?: AnchorFamily;
  familyLabel?: string;
  effectiveAt?: string;
  source?: string;
  verified?: boolean;
  /** Older than its family republishes. Still the latest published value. */
  stale?: boolean;
  /** "פעמיים בחודש", "בכל החלטת ריבית של בנק ישראל" — for the tooltip. */
  cadence?: string;
  /** Why, in Hebrew, for anything that did not resolve. Shown on the row's tooltip. */
  reason?: string;
}

export interface AnchorResponse {
  resolvedAt: string;
  /** Where the values came from — the table, or the bundled snapshot behind it. */
  origin: "db" | "snapshot" | "mixed";
  rows: AnchorResultRow[];
}
