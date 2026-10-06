// Every threshold that decides whether a number is worth mentioning, in one file.
//
// Two engines read two different documents — a חיווי אשראי and a bank mortgage
// statement — and four components render what they produce. Until this file
// existed, "expensive" was defined in five places with three different values,
// and "more than half the balance reprices" in three with two. So the same
// mortgage could be an urgent finding on the advisor page and unremarkable on the
// client page, and a rate could be painted red in the table and called ordinary
// in the summary.
//
// The rule here is that a threshold ships with the function that applies it.
// A bare exported number still drifts in HOW it is compared — `>= 0.66` in one
// place and `>= 0.5 ? "medium" : >= 0.75 ? "high"` in another is two different
// verdicts from one constant. Exporting the predicate removes that freedom.

export type Severity = "critical" | "high" | "medium" | "info";
export type Heat = "hot" | "warm" | null;
export type DebtFamily = "mortgage" | "loan" | "card";

/* ------------------------------------------------------------------- rates */

/**
 * Where a mortgage rate stops being ordinary, per track.
 *
 * Prime is tested above the anchor rather than at it. Every statement in
 * Bank-Templates was printed against a 6.00% prime — Discount at −0.60 → 5.40,
 * Mercantile −0.40 → 5.60, Leumi −0.20 → 5.80, Hapoalim +0.15 → 6.15 — so a flat
 * 6.0 would brand a zero-margin prime tranche expensive for being exactly at the
 * market. An index-linked rate is judged hardest because the printed rate is only
 * part of its cost: the CPI is charged on top of it.
 */
export const DEAR_RATE = { prime: 6.5, linked: 4.5, unlinked: 6.0 } as const;

/**
 * Consumer credit. The parsed rates across both real reports are 8.00% (טריא)
 * and 11.10% (כאל); Israeli revolving tracks in the same reports run 11.75-17.90%.
 * 10 is above the Bank of Israel's published average for unindexed household
 * credit and catches the כאל loan; 13 is the escalation.
 */
export const DEAR_RATE_CONSUMER = 10;
export const DEAR_RATE_CONSUMER_HIGH = 13;

/** A rate worth a second look, one step below dear. */
const WARM_RATE_CONSUMER = 8;
const WARM_RATE_MORTGAGE = 5.5;

/** Is this mortgage tranche priced above its track's norm? */
export function isDearRate(
  rate: number | null | undefined,
  kind: "prime" | "variable" | "fixed" | "unknown",
  linkage: "linked" | "unlinked" | "fx" | "unknown"
): boolean {
  const r = Number(rate);
  if (rate === null || rate === undefined || !Number.isFinite(r) || r <= 0) return false;
  if (kind === "prime") return r >= DEAR_RATE.prime;
  // FX is priced in another currency's rate; comparing it to a shekel norm says
  // nothing, so it is judged on the unlinked bar rather than the linked one.
  if (linkage === "linked") return r >= DEAR_RATE.linked;
  return r >= DEAR_RATE.unlinked;
}

/**
 * Row colour. Same ladder for the ledger's inputs, the advisor's tables and the
 * client page, so one rate cannot be red in one place and plain in another.
 *
 * A card is judged on the consumer ladder: revolving credit and a personal loan
 * compete for the same shekel and there is no reason to hold them to different
 * bars.
 */
export function rateHeat(rate: number | null | undefined, family: DebtFamily): Heat {
  const r = Number(rate);
  if (rate === null || rate === undefined || !Number.isFinite(r) || r <= 0) return null;
  const [warm, hot] =
    family === "mortgage"
      ? [WARM_RATE_MORTGAGE, DEAR_RATE.prime]
      : [WARM_RATE_CONSUMER, DEAR_RATE_CONSUMER];
  if (r >= hot) return "hot";
  if (r >= warm) return "warm";
  return null;
}

/* --------------------------------------------------------------- exposure */

/**
 * Rate exposure. Two questions, both fair, one name each.
 *
 * The escalation sits at two thirds because a mix with less than a third fixed
 * and unlinked could not be originated under the Bank of Israel's composition
 * rules today — it is not merely high, it is a mix the regulator would refuse.
 * Four of the seven real statements land between the two bars, which is exactly
 * the band the credit surface used to pass over in silence.
 */
export const VARIABLE_SHARE_NOTE = 0.5;
export const VARIABLE_SHARE_HIGH = 0.66;

export function variableSeverity(share: number): Severity | null {
  if (!(share >= VARIABLE_SHARE_NOTE)) return null;
  return share >= VARIABLE_SHARE_HIGH ? "high" : "medium";
}

/**
 * Index linkage. The lower of the two values previously in use, so nothing that
 * was flagged stops being flagged.
 */
export const LINKED_SHARE_TRIGGER = 0.4;
export const linkedIsHigh = (share: number) => share >= LINKED_SHARE_TRIGGER;

/** Any foreign-currency exposure at all is worth saying out loud. */
export const fxIsHigh = (share: number) => share > 0;

/** Index uplift already added to the principal, as a share of that principal. */
export const INDEXATION_DRAG_HIGH = 0.1;

/* -------------------------------------------------------------- revolving */

/**
 * How hard a facility is being used. One pair for the row colour and for the
 * aggregate finding, so a table cell and the findings list cannot rank the same
 * card differently.
 *
 * Both take a FRACTION (0-1). DebtLine.utilization is stored as a percentage, so
 * callers divide by 100 — the one conversion, named here rather than guessed at
 * each call site.
 */
export const UTILISATION_WARM = 0.75;
export const UTILISATION_HOT = 0.9;

export function utilisationHeat(fraction: number | null | undefined): Heat {
  if (fraction === null || fraction === undefined || !Number.isFinite(fraction)) return null;
  if (fraction >= UTILISATION_HOT) return "hot";
  if (fraction >= UTILISATION_WARM) return "warm";
  return null;
}

/** Peak draw during the month, against the facility's own ceiling. */
export const UTILISATION_PEAK_RATIO = 0.9;
export const UTILISATION_PEAK_EXCESS = 1.15;

/* ------------------------------------------------------- behaviour, terms */

/** Bucket 4 is 120 days — the point at which arrears stop being a slip. */
export const ARREARS_BUCKET_HIGH = 4;
export const ARREARS_BUCKET_DAYS: Record<number, string> = {
  1: "30-59",
  2: "60-89",
  3: "90-119",
  4: "120-149",
  5: "150-179",
  6: "180+",
};

export const DISHONOURED_COUNT_HIGH = 3;
export const INQUIRY_WINDOW_MONTHS = 3;
export const APPLICATIONS_IN_WINDOW_TRIGGER = 3;
export const CONSUMER_MONTHLY_SHARE_TRIGGER = 0.4;

/** The Bank of Israel's cap for a first home, and the level above every cap. */
export const LTV_TRIGGER = 0.75;
export const LTV_HIGH = 0.9;

/* ------------------------------------------------------------ break fees */

/** A break fee worth this many months of the tranche's own interest is cheap. */
export const FEE_MONTHS_OF_INTEREST_CHEAP = 3;
export const BREAK_FEE_RATIO_MEDIUM = 0.005;
export const BREAK_FEE_RATIO_HIGH = 0.02;
export const RESET_HORIZON_MONTHS = 12;
export const RESET_SHARE_HIGH = 0.4;
export const LONG_TERM_MONTHS = 300;

/* --------------------------------------------------------- what a client hears */

/**
 * Whether a finding reaches the client, and in what words.
 *
 * Deliberately not optional on Flag/Finding. A new finding cannot be added
 * without the author deciding, in the same diff, whether the client is told —
 * and when the answer is no, writing down why. Five of nine critical and high
 * findings had quietly never reached the client page before this existed.
 */
export interface ClientNote {
  /** One sentence in the client's language. No ratios, no field codes. */
  say: string;
  /**
   * The rows that must be on screen for the sentence to be checkable.
   *
   * The sentence's own number is summed over these rows by the view builder
   * rather than passed in beside them. That is what stops a page announcing
   * ₪372,873 of arrears above rows that account for ₪33,825.
   */
  uids?: string[];
  /**
   * A factual heading for the line — what it is about, not how bad it is.
   * Falls back to the finding's own title when absent.
   */
  title?: string;
  /**
   * The next check, as its own sentence. `say` carries the figure; this says
   * what to find out about it. Kept apart so two findings about the same debt
   * can be merged into one line without repeating "יש לברר…" twice.
   */
  next?: string;
}

export type ClientDisposition =
  | { show: ClientNote }
  | { silent: true; because: string };

export const show = (
  say: string,
  uids?: string[],
  extra?: { title?: string; next?: string }
): ClientDisposition => ({ show: { say, uids, ...extra } });
export const silent = (because: string): ClientDisposition => ({ silent: true, because });

/** Reads on a disposition without every call site unpacking the union. */
export const noteOf = (d: ClientDisposition): ClientNote | null => ("show" in d ? d.show : null);

/* ------------------------------------------------- how the client page groups them */

/**
 * Which group a client line sits in.
 *
 * Severity is not urgency. "100% of the mortgage is variable" is a high-severity
 * fact about how the debt is built — worth checking, not something to resolve this
 * week — while an open enforcement file is both. So the group starts from the
 * severity and is then capped at "check" for findings that describe the shape of
 * the debt rather than something that went wrong with it.
 */
export type WorryGroup = "act" | "check" | "info";

export const WORRY_GROUP_ORDER: WorryGroup[] = ["act", "check", "info"];
export const WORRY_GROUP_LABEL: Record<WorryGroup, string> = {
  act: "לטיפול בעדיפות גבוהה",
  check: "לבדיקה",
  info: "מידע נוסף",
};

/** Findings about how the debt is structured or priced — never "act" on their own. */
const STRUCTURAL = new Set([
  "variable",
  "linked",
  "ltv",
  "fx",
  "balloon",
  "interest-only",
  "non-monthly",
  "resets",
  "recycle",
  "expensive",
  "consumer-weight",
  "pending",
  "indexation",
  "breakfee",
  "term",
  "free",
  "fee-unreported",
  "card-charge",
  "shopping",
]);

export function worryGroup(id: string, severity: Severity): WorryGroup {
  const bySeverity: WorryGroup = severity === "critical" || severity === "high" ? "act" : severity === "medium" ? "check" : "info";
  return bySeverity === "act" && STRUCTURAL.has(id) ? "check" : bySeverity;
}

/** One line on a client page: a heading, the figure, and what to check next. */
export interface ClientWorry {
  id: string;
  title: string;
  say: string;
  next?: string;
  severity: Severity;
  group: WorryGroup;
  uids?: string[];
}

const SEV_RANK: Severity[] = ["critical", "high", "medium", "info"];

/** A finding with a client note, as a client line. Silent findings give null. */
export function worryOf(f: { id: string; title: string; severity: Severity; client: ClientDisposition }): ClientWorry | null {
  const n = noteOf(f.client);
  if (!n) return null;
  return {
    id: f.id,
    title: n.title ?? f.title,
    say: n.say,
    next: n.next,
    severity: f.severity,
    group: worryGroup(f.id, f.severity),
    uids: n.uids,
  };
}

/**
 * Fold findings that describe the same debts into one line, keeping every fact.
 *
 * Each spec names findings that overlap; when two or more of them are present
 * they become a single line at the position of the first, under the spec's
 * heading, with their figures in order and each distinct next-check once. The
 * worst severity and the most urgent group win — merging must never quieten a
 * finding.
 */
export function mergeWorries(items: ClientWorry[], specs: { ids: string[]; title: string }[]): ClientWorry[] {
  let out = items.slice();
  for (const spec of specs) {
    // In the spec's order, so the merged sentence reads the same way on every
    // document regardless of which finding happened to rank higher.
    const hit = spec.ids
      .map((id) => out.find((w) => w.id === id))
      .filter((w): w is ClientWorry => w !== undefined);
    if (hit.length < 2) continue;
    const nexts = hit.map((w) => w.next).filter((x): x is string => !!x);
    const merged: ClientWorry = {
      id: hit.map((w) => w.id).join("+"),
      title: spec.title,
      say: hit.map((w) => w.say).join(" "),
      next: nexts.filter((x, i) => nexts.indexOf(x) === i).join(" ") || undefined,
      severity: hit.map((w) => w.severity).sort((a, b) => SEV_RANK.indexOf(a) - SEV_RANK.indexOf(b))[0],
      group: hit.map((w) => w.group).sort((a, b) => WORRY_GROUP_ORDER.indexOf(a) - WORRY_GROUP_ORDER.indexOf(b))[0],
      uids: Array.from(new Set(hit.flatMap((w) => w.uids ?? []))),
    };
    const at = Math.min(...hit.map((w) => out.indexOf(w)));
    out = out.filter((w) => !hit.includes(w));
    out.splice(Math.min(at, out.length), 0, merged);
  }
  return out;
}

/** Group first, then severity; stable inside each, so the engine's order holds. */
export function orderWorries(items: ClientWorry[]): ClientWorry[] {
  return items
    .map((w, i) => ({ w, i }))
    .sort(
      (a, b) =>
        WORRY_GROUP_ORDER.indexOf(a.w.group) - WORRY_GROUP_ORDER.indexOf(b.w.group) ||
        SEV_RANK.indexOf(a.w.severity) - SEV_RANK.indexOf(b.w.severity) ||
        a.i - b.i
    )
    .map((x) => x.w);
}
