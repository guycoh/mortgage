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
import { calculateLoan } from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import type { Loan } from "@/app/private/crm/leads/simulators/components/LoanTable";
import { creditReportPurpose } from "@/lib/bank-parser/purpose";
import { purposeFrom, type PurposeId } from "./purposes";

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

/**
 * החזר לשקל — what the mix repays for every shekel it borrowed.
 *
 * ONE DEFINITION, because three surfaces quote it under one name: the rail at
 * the top of the board, the last row of השוואת תמהילים, and the export's
 * masthead. Two of them computing it two ways is the same number disagreeing
 * with itself in front of a client.
 *
 * The numerator is every shekel that leaves the account — `totalPaid`, not
 * amount + interest, because an indexed track repays its PRINCIPAL in indexed
 * shekels too and only totalPaid carries that.
 *
 * The denominator is the principal that produced those payments, which is not
 * always the whole balance. A credit report imports a defaulted debt with no
 * term at all — deliberately, so nothing fabricates a repayment for it — and
 * such a row carries a balance while paying nothing. Divided by the whole
 * balance, a mix would report a BETTER ratio the more unschedulable debt the
 * client has. A quality figure that improves as the client's position worsens
 * is worse than no figure, so the denominator is exactly the set of rows the
 * numerator came from, and `unpriced` counts what that leaves out so the
 * surface can say so.
 *
 * Takes the rows it is given and filters nothing: every caller has already
 * decided what belongs in its total — guarantees never do, see isSurety.
 */
export function perShekel(
  rows: ImportedLoan[],
  annualInflation: number
): { value: number; paid: number; principal: number; unpriced: number } {
  let paid = 0;
  let principal = 0;
  let unpriced = 0;
  for (const l of rows) {
    const amount = Math.round(Number(l.amount) || 0);
    const res = calculateLoan(l, annualInflation);
    if (res.totalPaid > 0) {
      paid += res.totalPaid;
      principal += amount;
    } else if (amount > 0) {
      unpriced += 1;
    }
  }
  return { value: principal ? paid / principal : 0, paid, principal, unpriced };
}


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
  /**
   * מטרת ההלוואה on the board's own list (see lib/purposes) — what the row IS
   * for, as one of eleven words. Filled from the document on import (through
   * purposeFrom), editable in the מטרה column, persisted in `loans.purpose`.
   * Null on rows saved before the column existed: the cell shows a dash rather
   * than inventing a purpose for a mortgage nobody classified.
   */
  purpose?: PurposeId | null;
  /** True when the document says this is state money — a הלוואת זכאות. */
  source_eligibility?: boolean;

  /* --- WHAT MAKES A DEBT THE SAME DEBT IN SOMEBODY ELSE'S REPORT ------------

     A household's joint mortgage is printed IN FULL on both spouses' reports,
     and the two reports are almost never pulled on the same morning. So the
     figures that describe the debt TODAY — the balance, the months left — are
     different in the two documents by exactly the amortisation between them,
     and they cannot identify it. What can: the day the loan was taken, the day
     it is due to end, and how much was borrowed. None of the three moves.

     Both come straight off the credit report (201-016, 201-018, 201-045) and
     off a bank letter's tranche. They are what `loanKey` keys on; see it for
     what happens when a document prints none of them. --- */
  /** תאריך פתיחה — 201-016, as printed (dd/mm/yyyy). */
  source_start_date?: string;
  /** סכום מקורי — 201-045. 0 when the document did not print one. */
  source_orig_amount?: number;
  /**
   * Whose documents this row was found in, in load order.
   *
   * A merged row is one debt that two people's reports both listed; naming them
   * is what lets the משותף tag say WHO, rather than leaving the advisor to
   * guess which pair of documents agreed.
   */
  shared_with?: string[];

  /* --- THE MASTER'S SPLIT — what the client owes, the way the bank prints it.

     `amount` stays the balance every calculation reads: principal PLUS the
     linkage that has accrued on it, which is the sum a payoff letter calls
     יתרה and the sum a recycle has to cover. The two fields below take that one
     figure apart on the master mix only, where the row is a fact read off a
     document rather than a proposal:

       יתרת קרן   = amount − indexation     (the nominal principal)
       הצמדת קרן  = indexation              (שיערוך / הפרשי הצמדה on it)

     Kept as the INDEXATION rather than as the principal so that a row carrying
     neither — a credit-report import, a hand-typed line, every row saved before
     this existed — is unchanged: no indexation, so the principal IS the amount,
     and nothing downstream has to learn a second field. See principalOf. --- */
  /** הצמדת קרן — the part of `amount` that is linkage uplift, not principal. */
  indexation?: number | null;
  /**
   * הפרשי היוון — עמלת פרעון מוקדם, what breaking this tranche costs today.
   *
   * NOT part of `amount`: it is not owed until the tranche is repaid early, so
   * it prices nothing on the master. It exists for the one moment it matters —
   * duplicating the master into a proposal, where the advisor chooses whether
   * the new mortgage has to fund it (שכפול עם עמלות) or not.
   */
  prepayment_fee?: number | null;
  /**
   * On a row that came out of שכפול עם עמלות: how much of `amount` is the fee
   * that was folded in. Provenance for the copy — it lets the proposal say
   * "כולל הפרשי היוון ₪12,400" under a balance that is bigger than the
   * master's. Session-only, like the anchor_* fields: the amount is what is
   * saved, and the amount is right.
   */
  fee_folded?: number;

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
  /**
   * The family key behind `anchor_source`, kept because the LABEL is prose and
   * this is an identity. It answers the one question the refresh cannot answer
   * from the number alone: is this row still priced off the same table it was
   * priced off last time? A prime anchor and a bond anchor that happen to be
   * worth the same today are not the same anchor, and treating them as one is
   * how "already current" ends up stamped on a row that was never priced.
   */
  anchor_family?: string;
  /**
   * The track changed under the anchor, so the anchor was dropped.
   *
   * Not the same as "never had one": this row HAD an anchor and it belonged to
   * the track it used to be. The flag is what lets the cell say so — a warned,
   * empty field — instead of quietly reading as a row nobody ever priced.
   */
  anchor_void?: boolean;
  /** False when the value came from a secondary source rather than the bank's own. */
  anchor_verified?: boolean;
  /** Older than its family republishes — still the latest published value. */
  anchor_stale?: boolean;
  /** How often that family republishes, which is what dates the value. */
  anchor_cadence?: string;
  /** Why the refresh declined to price this row. Shown on the עוגן cell's tooltip. */
  anchor_note?: string;
};

/* ------------------------------------------------------ the master's split */

const money = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** הצמדת קרן on the row — 0 where the document (or the advisor) stated none. */
export const indexationOf = (l: ImportedLoan) => Math.max(0, Math.round(money(l.indexation)));
/** הפרשי היוון on the row — 0 where none was stated. */
export const feeOf = (l: ImportedLoan) => Math.max(0, Math.round(money(l.prepayment_fee)));
/**
 * יתרת קרן — the nominal principal, which is the balance less the linkage on
 * it. Floored at 0: an indexation typed larger than the balance is a data-entry
 * slip, not a negative principal, and the cell shows 0 until it is corrected.
 */
export const principalOf = (l: ImportedLoan) =>
  Math.max(0, Math.round(money(l.amount)) - indexationOf(l));

/**
 * The master's money, added up the way its columns are laid out. `balance` is
 * Σamount — the same figure the rail and the totals row already state — and the
 * three parts are what the duplicate dialog quotes back before it acts.
 */
export function masterTotals(rows: ImportedLoan[]) {
  let principal = 0;
  let indexation = 0;
  let fee = 0;
  let balance = 0;
  for (const l of rows) {
    principal += principalOf(l);
    indexation += indexationOf(l);
    fee += feeOf(l);
    balance += Math.round(money(l.amount));
  }
  return { principal, indexation, fee, balance, withFees: balance + fee };
}

/**
 * ONE ROW OF THE MASTER, AS A ROW OF A PROPOSAL.
 *
 * The bank prints יתרת קרן and הצמדת קרן apart; a proposal borrows one sum. So
 * the copy's amount is the two added back together — which is what `amount`
 * already holds — plus, when the advisor said so, the עמלת פרעון מוקדם the new
 * mortgage will have to fund. The split and the fee are the master's facts and
 * do not travel: a proposal that still carried a "fee" would look, on a
 * reload, like a master with a fee to fold in.
 *
 * `fee_folded` is the receipt — see the field's note.
 */
export function foldMasterRow(l: ImportedLoan, withFees: boolean, mixId: string): ImportedLoan {
  const fee = withFees ? feeOf(l) : 0;
  // `amount` IS principal + indexation — the balance the rail already states —
  // so it is taken as it stands rather than re-derived from the two parts.
  const balance = Math.round(money(l.amount));
  const { indexation: _i, prepayment_fee: _f, fee_folded: _ff, ...rest } = l;
  void _i;
  void _f;
  void _ff;
  return {
    ...rest,
    id: crypto.randomUUID(),
    mix_id: mixId,
    amount: balance + fee,
    ...(fee > 0 ? { fee_folded: fee } : {}),
  };
}

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
    // What identifies this debt in the spouse's report too — see loanKey.
    source_start_date: src.startDate,
    source_orig_amount: src.origAmount || undefined,
    source_purpose: src.purpose,
    // The report's coarse 201-017, read the way the parsers read it (a
    // mortgage's צריכה פרטית is כל מטרה), then placed on the board's list.
    purpose: purposeFrom(creditReportPurpose(src.purpose, src.type), src.purpose, group),
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
 * A household's two reports overlap, and that is the whole problem.
 *
 * A jointly-held mortgage is listed IN FULL on both spouses' דוח ריכוז נתונים.
 * Import both naively and the board says the couple owes twice what they owe —
 * the two numbers this page exists to state.
 *
 * WHAT CANNOT IDENTIFY A DEBT: what it looks like today. The two documents are
 * almost never pulled on the same morning, so between them the balance has
 * amortised and the remaining term is shorter. A key built on balance + months
 * (which is what this used to be, bucketed to ₪50) misses the joint mortgage in
 * every real household: six weeks apart, a ₪900,000 tranche is ₪896,540 with
 * 239 months left instead of 240, and the two rows key differently. Verified —
 * that is how a ₪1.32M mortgage came to be shown as ₪2.63M.
 *
 * WHAT CAN: when it was taken, when it ends, and how much was borrowed. None of
 * the three moves between two readings of the same debt, and together they are
 * specific enough to keep two tranches of one mortgage apart. Both documents
 * carry them — the credit report as 201-016 / 201-018 / 201-045, a bank letter
 * on the tranche itself.
 *
 * `null` when the document printed too little to identify the row this way; the
 * caller then falls back to matching by shape, with tolerances — see
 * `looseMatch`. A hand-added row has no identity at all and never merges.
 */
export function loanKey(l: ImportedLoan): string | null {
  const start = (l.source_start_date ?? "").trim();
  const end = (l.loan_end_date ?? l.end_date ?? "").trim();
  const orig = Math.round(Number(l.source_orig_amount) || 0);
  // Two of the three, at least: an end date alone is shared by every tranche of
  // one mortgage, and an original amount alone repeats across round-numbered
  // consumer loans. Two together have not collided on any real report here.
  const stated = [start, end, orig > 0 ? String(orig) : ""].filter(Boolean);
  if (stated.length < 2) return null;
  return [
    l.group ?? "mortgage",
    (l.source_bank ?? "").replace(/\s+/g, ""),
    start,
    end,
    orig,
  ].join("|");
}

/**
 * The fallback, for rows whose document printed no dates and no original sum.
 *
 * Same lender, same family, same track, and figures close enough to be one debt
 * read on two days: the balance within 3% (a month of amortisation on a
 * mortgage is well under 1%, and the two documents are rarely more than a
 * quarter apart), the term within six months, the rate to the tenth. It is
 * deliberately unwilling — a false merge hides a real debt from the client,
 * which is worse than showing one twice — so it also refuses to match anything
 * with no balance at all.
 */
function looseMatch(a: ImportedLoan, b: ImportedLoan): boolean {
  const bank = (x: ImportedLoan) => (x.source_bank ?? "").replace(/\s+/g, "");
  if (!bank(a) || bank(a) !== bank(b)) return false;
  if ((a.group ?? "mortgage") !== (b.group ?? "mortgage")) return false;
  if ((a.source_track ?? "").replace(/\s+/g, "") !== (b.source_track ?? "").replace(/\s+/g, "")) return false;
  const av = Math.round(Number(a.amount) || 0);
  const bv = Math.round(Number(b.amount) || 0);
  if (av <= 0 || bv <= 0) return false;
  // A term is what makes two figures comparable at all. Without one there is
  // nothing to amortise and nothing to bound the drift by, and two unrelated
  // balances that happen to sit close would fold into one.
  if ((Number(a.months) || 0) <= 0 || (Number(b.months) || 0) <= 0) return false;
  if (Math.abs(av - bv) > Math.max(av, bv) * 0.03) return false;
  if (Math.abs((Number(a.months) || 0) - (Number(b.months) || 0)) > 6) return false;
  if (Math.abs((Number(a.rate) || 0) - (Number(b.rate) || 0)) > 0.1) return false;
  return true;
}

/**
 * Fold a further report's rows into the mix.
 *
 * A debt already on the board is marked shared rather than added again, and the
 * count comes back so the UI can say what it did instead of silently dropping
 * rows. Matching is ONE-TO-ONE: a matched row is consumed, so a couple who both
 * hold two identical ₪250,000 tranches end up with two rows and not one — the
 * old map never removed its hit, and every incoming twin folded onto the same
 * existing row, losing a debt each time.
 *
 * The row that stays is the one already on the board, figures and all. It may
 * carry the advisor's own edits by now, and overwriting those with a second
 * document's view of the same debt would undo work without saying so.
 */
export function mergeReportLoans(
  existing: ImportedLoan[],
  incoming: ImportedLoan[],
  /** Whose report the incoming rows came from — recorded on what they match. */
  from = ""
): { merged: ImportedLoan[]; duplicates: number } {
  const merged = existing.map((l) => ({ ...l }));
  /** Indices still available to match against — one debt, one partner. */
  const free = new Set(merged.map((_, i) => i));

  const byKey = new Map<string, number[]>();
  merged.forEach((l, i) => {
    const k = loanKey(l);
    if (!k) return;
    const list = byKey.get(k);
    if (list) list.push(i);
    else byKey.set(k, [i]);
  });

  const claim = (i: number, l: ImportedLoan) => {
    free.delete(i);
    const seen = merged[i].shared_with ?? [];
    // ROLE IS RESOLVED, NOT INHERITED. One spouse can guarantee the very loan
    // the other owes, and both reports print it. Whichever document arrived
    // first used to decide: drop the guarantor's report first and the debt was
    // filed as a guarantee — which isSurety keeps out of every total, so the
    // household's loan silently vanished from the board's balance and monthly.
    // A debt anybody in the household OWES is owed.
    const owed = !l.is_guarantor || !merged[i].is_guarantor;
    merged[i] = {
      ...merged[i],
      is_guarantor: !owed,
      is_shared: true,
      shared_with: from && !seen.includes(from) ? [...seen, from] : seen,
    };
  };

  let duplicates = 0;
  for (const l of incoming) {
    const k = loanKey(l);
    const slot = k ? (byKey.get(k) ?? []).find((i) => free.has(i)) : undefined;
    if (slot !== undefined) {
      claim(slot, l);
      duplicates += 1;
      continue;
    }
    // Nothing identified it. Try the shape, against rows nobody has claimed.
    const loose = k === null ? Array.from(free).find((i) => looseMatch(merged[i], l)) : undefined;
    if (loose !== undefined) {
      claim(loose, l);
      duplicates += 1;
      continue;
    }
    // ONLY ACROSS DOCUMENTS. An appended row is NOT registered as a candidate,
    // so two debts that look alike inside the SAME report stay two debts. The
    // old map registered them, and a report holding two ₪200,000 tranches at
    // one bank came in as one row — a lost debt, reported to the advisor as a
    // household overlap that never happened.
    merged.push(l);
  }
  return { merged, duplicates };
}
