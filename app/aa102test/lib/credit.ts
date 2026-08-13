// Turns a parsed credit report (חיווי אשראי / דוח ריכוז נתונים) into simulator
// rows. The report gives us balance, rate, remaining term and a track label per
// debt; the simulator wants Loan rows carrying a path_id. The only real work is
// matching the report's Hebrew track wording onto the five standard tracks in
// app/data/paths.
//
// Everything runs client-side — the PDF is decoded in the browser by the same
// parser /aa4test uses, and nothing is uploaded.

import { paths as STATIC_PATHS } from "@/app/data/paths";
import type { CreditReport } from "@/lib/credit-parser/types";
import type { BankStatement } from "@/lib/bank-parser/types";
import { extractLoans, type ExtractedLoan } from "@/lib/credit-parser/loan-mapping";
import type { Loan } from "@/app/private/crm/leads/simulators/components/LoanTable";

/** Which family a row belongs to. */
export type DebtGroup = "mortgage" | "loan";

/**
 * A DEBT THE CLIENT GUARANTEES IS NOT A DEBT THE CLIENT PAYS.
 *
 * The דוח ריכוז נתונים keeps its own section for them — "עסקאות בהן הלקוח ערב" —
 * and the parser carries that all the way onto the row. Everything downstream
 * used to lose it: a guaranteed loan was filed under its family, summed into the
 * subtotal, the grand total, the rail, the composition chart, the runoff and the
 * comparison, marked only by a small ערב tag. That is somebody else's balance
 * and somebody else's monthly repayment presented as the client's, which is the
 * one number this whole surface exists to state.
 *
 * So the split lives here, in one predicate, and every surface that adds money
 * up goes through it. They are still real exposure — a bank weighs them at
 * underwriting — so they are shown, and totalled, on their own.
 */
export const isSurety = (l: ImportedLoan) => !!l.is_guarantor;

/** The client's own debts — what every total on the page is about. */
export const owedOnly = (loans: ImportedLoan[]) => loans.filter((l) => !isSurety(l));


/** A Loan plus the provenance the UI colour-codes and labels by. */
export type ImportedLoan = Loan & {
  group?: DebtGroup;
  /** The client guarantees this debt rather than owing it. Still real exposure,
   *  so it is imported — but marked, because it is not their own repayment. */
  is_guarantor?: boolean;
  /** The same debt was found in more than one report — counted once. */
  is_shared?: boolean;
  source_bank?: string;
  source_type?: string;
  source_track?: string;
  /**
   * עוגן, as the document names it — "ריבית פריים", "עוגן בנק ישראל אג\"ח".
   *
   * A name, not a rate: the `anchor` column is numeric and holds the anchor's own
   * level, which only Discount's template prints. The two are different facts
   * about the same thing and both are worth keeping.
   */
  source_anchor?: string;
  /**
   * מטרת ההלוואה, in the words of whichever document supplied the row.
   *
   * A bank payoff letter states it outright and specifically ("רכישת דירה יד
   * שניה", "כל מטרה", "הרחבה"). The credit report only has field 201-017, whose
   * five values merge a purchase with a renovation, so a row imported from it
   * carries the coarser answer. Both are the lender's claim, not ours.
   */
  source_purpose?: string;
  /** True when the document says this is state money — a הלוואת זכאות. */
  source_eligibility?: boolean;

  /* --- עדכון עוגנים. Session fields: the save route writes an explicit column
     whitelist, so none of these need a migration and none of them survive a
     reload — which is right. A refreshed anchor is a simulation of what the
     tranche would cost if it repriced today, and the thing worth persisting is
     the resulting mix, not the provenance of one input to it. --- */
  /**
   * The anchor the DOCUMENT stated, kept when the refresh replaced it.
   *
   * `undefined` means never refreshed; `null` means refreshed a row that had no
   * anchor at all. The two are different and the restore has to tell them apart.
   */
  anchor_original?: number | null;
  /** ISO date the refreshed anchor took effect — the "נכון ל־" on the tooltip. */
  anchor_asof?: string;
  /** Which published table it came from: "עוגן אג"ח צמוד מדד", "ריבית פריים". */
  anchor_source?: string;
  /** False when the value came from a secondary source rather than the bank's own. */
  anchor_verified?: boolean;
  /** Older than its family republishes — still the latest published value. */
  anchor_stale?: boolean;
  /** How often that family republishes, which is what dates the value. */
  anchor_cadence?: string;
  /** Why the refresh declined to price this row. Shown on the עוגן cell's tooltip. */
  anchor_note?: string;
};

/* ------------------------------------------------------------------ paths */

/** id → the five canonical tracks, by their short names. */
export const PATH_IDS = {
  prime: 1, // פריים
  fixedUnlinked: 2, // קלצ
  fixedLinked: 3, // קצ
  varUnlinked: 4, // מלצ
  varLinked: 5, // מצ
} as const;

/** Long, human names for the short codes the data file uses. */
export const PATH_LABEL: Record<number, string> = {
  1: "פריים",
  2: "קבועה לא צמודה",
  3: "קבועה צמודה",
  4: "משתנה לא צמודה",
  5: "משתנה צמודה",
};

/** The trade's own shorthand — what a broker actually says out loud. */
export const PATH_SHORT: Record<number, string> = {
  1: "פריים",
  2: 'קל"צ',
  3: 'ק"צ',
  4: 'מל"צ',
  5: 'מ"צ',
};

/**
 * Where a rate stops being ordinary. A mortgage and a consumer loan live on
 * completely different scales, so the thresholds are per family — 6.5% is
 * expensive for a mortgage and cheap for a credit-card loan.
 */
export function rateHeat(rate: number, group: DebtGroup): "hot" | "warm" | null {
  const r = Number(rate) || 0;
  const [warm, hot] = group === "loan" ? [8, 10] : [5.5, 6.5];
  if (r >= hot) return "hot";
  if (r >= warm) return "warm";
  return null;
}

/**
 * Track colours by path id — one source for dots, dropdowns, charts, rail.
 *
 * FIVE DISTINCT HUES, not a ramp. A single-hue ramp keeps the page's palette
 * tighter, but five steps of one violet are five things an advisor has to
 * compare by lightness — and at 8px, in a legend, on a stacked bar, that is
 * exactly the comparison the eye is worst at. The five tracks are a
 * categorical scale and they get categorical colours.
 *
 * These sit in a different register from the two family colours on purpose:
 * families are identity (which debt is this), tracks are classification
 * (how is it priced). They never appear as alternatives to one another —
 * the family is a chip with a word, the track is a dot with a word.
 *
 * Must match --t1..--t5 in theme.css.
 */
export const TRACK_HEX: Record<number, string> = {
  1: "#2563eb", // פריים
  2: "#0d8b9b", // קבועה לא צמודה
  3: "#14905a", // קבועה צמודה
  4: "#ad7804", // משתנה לא צמודה
  5: "#c62370", // משתנה צמודה
};
/**
 * Family colours — must match theme.css.
 *
 * A confident violet-blue for the mortgage, a strong warm orange for the loan.
 * These are the loudest things on the page on purpose: the materials around
 * them are hairlines and near-invisible shadows, so colour is what has to carry
 * meaning across a desk. Loud, but not neon — both are dark enough to set text
 * in and to survive being printed.
 *
 * `tint` is the anchor over white at 12% (chips, badges, group bands), `tint2`
 * at 20% (hover, the recalculation pulse), `line` at 30% (borders), `wash` at
 * ~4% (a whole-row background, where 12% would be a slab). `ring` is the 2px
 * focus bloom.
 *
 * `text` is the same identity, darkened until it clears 4.5:1 — and it is not
 * optional. A strong warm orange is a fine 8px dot and an unreadable 11px word:
 * #E07B39 on white is 2.97:1. So `color` fills (accents, dots, chart segments,
 * meters) and `text` sets type. They are near enough to read as one colour and
 * far enough apart that the word is legible, which is the only way to have a
 * loud identity and a page that passes AA.
 *
 * Colour is never the only signal — every chip carries an icon and the word —
 * which is what keeps the two families apart under deuteranopia and
 * protanopia, where a violet and an orange are the safest pair available.
 */
export const FAMILY = {
  mortgage: {
    color: "#5b54d6",
    text: "#4f46c8", // 6.9:1 on white, 5.9:1 on its own tint
    tint: "#ebeafa",
    tint2: "#deddf7",
    line: "#ceccf3",
    wash: "#f5f4fd",
    ring: "rgba(91, 84, 214, 0.45)",
    label: "משכנתא",
    plural: "משכנתאות",
  },
  loan: {
    color: "#e07b39",
    text: "#a8511a", // 5.5:1 on white, 4.9:1 on its own tint
    tint: "#fbefe7",
    tint2: "#f9e5d7",
    line: "#f5d5c0",
    wash: "#fdf8f4",
    ring: "rgba(224, 123, 57, 0.5)",
    label: "הלוואה",
    plural: "הלוואות",
  },
} as const;

/**
 * Map the report's track wording onto a path id. The parser emits labels like
 * "פריים", "קבועה לא צמודה", "משתנה +1" — so test for prime first, then decide
 * fixed-vs-variable and linked-vs-unlinked independently.
 */
export function pathIdFromTrack(track: string | undefined, isMortgage: boolean): number {
  const t = (track ?? "").trim();
  if (!t) return isMortgage ? PATH_IDS.prime : PATH_IDS.fixedUnlinked;

  if (/פריים/.test(t)) return PATH_IDS.prime;

  // "לא צמוד" must be tested before the bare "צמוד" it contains.
  const unlinked = /לא\s*צמוד/.test(t);
  const linked = !unlinked && /צמוד/.test(t);
  const variable = /משתנה/.test(t);

  if (variable) return linked ? PATH_IDS.varLinked : PATH_IDS.varUnlinked;
  // Anything not explicitly variable is treated as fixed, which is what the
  // report means by "קבועה" and by an unpriced/interest-free track.
  return linked ? PATH_IDS.fixedLinked : PATH_IDS.fixedUnlinked;
}

export const isIndexedPath = (pathId: number) =>
  STATIC_PATHS.find((p) => p.id === pathId)?.indexed ?? false;

/* ------------------------------------------------------------- conversion */

/**
 * The anchor's own rate: what is left of the quoted rate once the margin over the
 * anchor is taken out. Null without a margin — an unanchored fixed rate is not an
 * anchor, and returning the rate itself would present it as one.
 */
function anchorRate(rate: number, margin: number | null): number | null {
  if (margin === null || !Number.isFinite(rate) || !Number.isFinite(margin)) return null;
  return Math.round((rate - margin) * 100) / 100;
}

/** dd/mm/yyyy → yyyy-mm-dd, the shape both the picker and the API expect. */
function toIso(dmy: string | undefined): string | null {
  const m = (dmy ?? "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function toLoanRow(src: ExtractedLoan, mixId: string, group: DebtGroup): ImportedLoan {
  const guarantor = src.role === "guarantor";
  const pathId = pathIdFromTrack(src.trackLabel, group === "mortgage");
  const iso = toIso(src.endDate);
  return {
    id: crypto.randomUUID(),
    mix_id: mixId,
    path_id: pathId,
    amount: Math.round(src.balance),
    rate: Number(src.interest) || 0,
    months: Number(src.months) || 0,
    // The picker reads loan_end_date; the save route persists end_date. Set
    // both so an imported date survives a round-trip.
    loan_end_date: iso,
    end_date: iso,
    amortization_schedule_id: 1, // שפיצר — what a bank mortgage almost always is
    grace_type_id: 1, // ללא
    grace_months: 0,
    // The numeric column is the anchor's own RATE. The report does not print it,
    // but it prints both sides of it: the nominal rate (201-036) and the margin
    // over the anchor (201-035). A prime facility quoted at 17.60% with a margin
    // of 11.60% is anchored at 6.00% — the prime rate, exactly.
    anchor: anchorRate(Number(src.interest), src.anchorMargin),
    anchor_margin: src.anchorMargin,
    // The credit report states no reset interval at all (see lib/rate-frequency),
    // so both shapes of the field are empty rather than one of them guessing.
    anchor_interval: null,
    change_frequency: "",
    source_anchor: src.anchorName,
    group,
    is_guarantor: guarantor,
    source_bank: src.source,
    source_type: src.type,
    source_track: src.trackLabel,
    // The report's own words where it printed any. Where it printed none, the
    // column stays empty rather than showing the normalised guess — a credit
    // report that does not state a purpose has not stated one.
    source_purpose: src.purpose,
    source_eligibility: src.eligibility,
  };
}

export interface ImportSummary {
  loans: ImportedLoan[];
  mortgages: ImportedLoan[];
  others: ImportedLoan[];
  clientName: string;
  clientId: string;
  reportDate: string;
  fileName: string;
  /**
   * Which document produced this. A user drops one or the other, never both:
   * a חיווי אשראי covers every liability shallowly, a bank statement covers one
   * mortgage in full. Both fill the same board.
   */
  kind?: "credit" | "bank";
  /**
   * The whole parsed report, kept rather than discarded after the rows are
   * built. The mix needs four numbers per debt; the analysis needs arrears
   * history, remarks, proceedings and inquiries — none of which survive the
   * conversion to Loan rows.
   *
   * Absent when the source was a bank statement.
   *
   * Client-side only. Only `mixes` is ever sent to the API.
   */
  report?: CreditReport;
  /** The parsed mortgage statement, when that is what was dropped. */
  bank?: BankStatement;
  /** The dropped PDF itself, so it can be read on screen without re-uploading. */
  file?: File;
  /** Debts present in the report but not carried over (cards, overdrafts…). */
  skipped: { label: string; count: number; balance: number }[];
  /** How many imported rows are guaranteed rather than owed. */
  guaranteed: number;
  totalBalance: number;
  totalMonthly: number;
}

/**
 * Build simulator rows from a parsed report: mortgages first, then consumer
 * loans, each biggest-first. Revolving facilities and current accounts are
 * deliberately left out — they have no term or amortization and would corrupt
 * the mix maths — but they are reported back so the UI can say what it dropped.
 */
export function importReportToLoans(
  report: CreditReport,
  mixId: string,
  fileName = ""
): ImportSummary {
  const extracted = extractLoans(report).filter((l) => l.balance > 0);

  // The client's own debts first, guaranteed ones after, each biggest-first.
  const byOwnThenSize = (a: ExtractedLoan, b: ExtractedLoan) =>
    Number(a.role === "guarantor") - Number(b.role === "guarantor") || b.balance - a.balance;

  const mortgages = extracted
    .filter((l) => l.category === "mortgage")
    .sort(byOwnThenSize)
    .map((l) => toLoanRow(l, mixId, "mortgage"));

  const others = extracted
    .filter((l) => l.category === "loan")
    .sort(byOwnThenSize)
    .map((l) => toLoanRow(l, mixId, "loan"));

  const skippedMap = new Map<string, { count: number; balance: number }>();
  for (const l of extracted) {
    if (l.category === "mortgage" || l.category === "loan") continue;
    const key =
      l.category === "card"
        ? "מסגרות אשראי וכרטיסים"
        : l.category === "overdraft"
          ? "חשבונות עובר ושב"
          : "התחייבויות נוספות";
    const cur = skippedMap.get(key) ?? { count: 0, balance: 0 };
    skippedMap.set(key, { count: cur.count + 1, balance: cur.balance + l.balance });
  }

  const loans = [...mortgages, ...others];
  return {
    loans,
    mortgages,
    others,
    clientName: report.client?.name ?? "",
    clientId: report.client?.idNumber ?? "",
    reportDate: report.meta?.reportDate ?? "",
    fileName,
    report,
    kind: "credit",
    skipped: Array.from(skippedMap.entries()).map(([label, v]) => ({ label, ...v })),
    guaranteed: loans.filter((l) => l.is_guarantor).length,
    totalBalance: loans.reduce((s, l) => s + l.amount, 0),
    totalMonthly: extracted
      .filter((l) => l.category === "mortgage" || l.category === "loan")
      .reduce((s, l) => s + l.displayMonthly, 0),
  };
}

/* ----------------------------------------------------- more than one report */

/**
 * A household's two reports overlap. A jointly-held mortgage is listed in full
 * on both spouses' דוח ריכוז נתונים, so importing both naively doubles the
 * balance and the monthly payment — the two numbers this whole page is about.
 *
 * The identity of a debt across two reports is the lender plus the shape of the
 * obligation: same bank, same balance, same rate, same remaining term, same
 * track. The balance is bucketed to ₪50 because two reports are rarely pulled
 * the same morning and a month of amortization moves it slightly; anything
 * coarser started merging genuinely separate loans from the same bank.
 */
export function loanKey(l: ImportedLoan): string {
  return [
    l.group ?? "mortgage",
    (l.source_bank ?? "").replace(/\s+/g, ""),
    Math.round((Number(l.amount) || 0) / 50),
    (Number(l.rate) || 0).toFixed(2),
    Number(l.months) || 0,
    (l.source_track ?? "").replace(/\s+/g, ""),
  ].join("|");
}

/**
 * Fold a further report's rows into the mix. Anything already present is
 * marked shared rather than added again, and the count comes back so the UI
 * can say what it did instead of silently dropping rows.
 */
export function mergeReportLoans(
  existing: ImportedLoan[],
  incoming: ImportedLoan[]
): { merged: ImportedLoan[]; duplicates: number } {
  const at = new Map<string, number>();
  const merged = existing.map((l, i) => {
    at.set(loanKey(l), i);
    return { ...l };
  });

  let duplicates = 0;
  for (const l of incoming) {
    const k = loanKey(l);
    const hit = at.get(k);
    if (hit !== undefined) {
      merged[hit] = { ...merged[hit], is_shared: true };
      duplicates += 1;
      continue;
    }
    at.set(k, merged.length);
    merged.push(l);
  }
  return { merged, duplicates };
}
