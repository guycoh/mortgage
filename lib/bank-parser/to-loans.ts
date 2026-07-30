// A bank statement, as rows in the mix.
//
// The statement is richer than the credit report on the one mortgage it covers:
// it names each tranche's linkage and rate basis outright instead of leaving
// them to be inferred from a track label. So the mapping onto the simulator's
// five tracks is a lookup here rather than the pattern-matching the credit
// report needs.
//
// Everything the mix cannot model — break fees, reset dates, the index a tranche
// was struck at — is carried through on the row rather than dropped, because it
// is the reason an advisor opened the statement in the first place.

import { PATH_IDS, type ImportedLoan, type ImportSummary } from "@/app/aa100test/lib/credit";
import type { Loan } from "@/app/private/crm/leads/simulators/components/LoanTable";
import { FREQ_FIXED, FREQ_PRIME, FREQ_UNSTATED, freqLabel } from "@/lib/rate-frequency";
import { monthsBetween, toDate } from "./text";
import type { BankStatement, BankTranche } from "./types";

/**
 * Which of the five canonical tracks this tranche is.
 *
 * Prime is its own track and is tested first: a prime tranche is variable and
 * unlinked, so testing linkage first would file it as מל"צ and lose the fact
 * that it moves with the Bank of Israel rate.
 */
function pathIdOf(t: BankTranche): number {
  if (t.rateKind === "prime") return PATH_IDS.prime;
  const linked = t.linkage === "linked";
  if (t.rateKind === "variable") return linked ? PATH_IDS.varLinked : PATH_IDS.varUnlinked;
  // Anything not explicitly variable amortises at a fixed rate, which is what
  // the forms mean by קבועה and by an unpriced tranche.
  return linked ? PATH_IDS.fixedLinked : PATH_IDS.fixedUnlinked;
}

/** שפיצר unless the statement says otherwise. */
function amortizationId(text: string): number {
  const t = text.replace(/\s+/g, "");
  if (/קרןשווה|קש"ש/.test(t)) return 2;
  if (/בולט|בלון/.test(t)) return 3;
  return 1;
}

/** dd/mm/yyyy → yyyy-mm-dd, the shape the picker and the API both expect. */
function iso(dmy: string): string | null {
  const m = dmy.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/**
 * Months left to run.
 *
 * Only the Discount template prints this. Everywhere else it is the distance
 * from the statement date to the tranche's end date — measured from the
 * statement rather than from today, so a statement pulled three months ago
 * still describes the mortgage it described when it was printed.
 */
function termOf(t: BankTranche, statementDate: string): number {
  if (t.months && t.months > 0) return t.months;
  const from = toDate(statementDate) ?? new Date();
  const to = toDate(t.endDate);
  return to ? monthsBetween(from, to) : 0;
}

/**
 * תדירות שינוי for one tranche.
 *
 * The printed interval wins wherever there is one. Prime is named rather than
 * given a number even when the lender prints "1": Hapoalim's own column says one
 * month, but the rate does not actually change monthly — it changes when the Bank
 * of Israel changes, which is the thing an advisor needs to hear.
 */
function frequencyOf(t: BankTranche): string {
  if (t.rateKind === "prime") return FREQ_PRIME;
  if (t.resetMonths && t.resetMonths > 0) return freqLabel(t.resetMonths);
  // A fixed rate has no reset by definition, so a blank column is a fact here
  // rather than a gap. On a variable tranche the same blank is a gap, and says so.
  if (t.rateKind === "fixed") return FREQ_FIXED;
  return t.rateKind === "variable" ? FREQ_UNSTATED : "";
}

/**
 * The anchor's own rate.
 *
 * Only Discount prints it. Everywhere else it is the rate the borrower pays less
 * the margin over the anchor — both printed, on the same row, by every template
 * that quotes a margin at all.
 *
 * This is arithmetic on printed figures, not a guess, and Discount proves it:
 * that template prints anchor, margin AND rate, and anchor + margin reproduces
 * the rate to the agora on all seven of its priced tranches. Run backwards on the
 * others it lands on the numbers it should — a Leumi prime tranche at 5.80% with
 * a margin of −0.20% gives 6.00%, which is the prime rate those statements were
 * printed under.
 *
 * Null when there is no margin: a fixed-rate tranche is not anchored to anything,
 * and subtracting nothing from its rate would dress the rate up as an anchor.
 */
function anchorRateOf(t: BankTranche): number | null {
  // A fixed rate is not anchored to anything — it was set once and does not
  // track. Discount still fills its base-rate column on those loans, with the
  // loan's own rate and no margin beside it, which put "עוגן 2.80%" on a קל"צ
  // and made it look like it repriced. Half a sum is worse than no sum.
  if (t.rateKind === "fixed") return null;
  if (t.anchorRate !== null && t.anchorRate !== undefined) return t.anchorRate;
  if (t.margin === null || t.rate === null) return null;
  return Math.round((t.rate - t.margin) * 100) / 100;
}

/**
 * The anchor, as words — kept for provenance, not for the grid.
 *
 * Every lender writes it differently, and two of them write it into the same cell
 * as the margin — Leumi "עוגן+0.95%", Hapoalim "P + 0.15%". The margin is already
 * its own number on the tranche, so it comes out here rather than being shown
 * twice, and what is left is the lender's own name for the anchor.
 */
function anchorNameOf(t: BankTranche): string {
  // Prime is prime at all four banks, however they abbreviate it — "P", "פריי",
  // "ר.פריים". Naming it once beats carrying four spellings onto the board.
  if (t.rateKind === "prime") return "ריבית פריים";
  // Nothing to name on a fixed tranche — see anchorRateOf.
  if (t.rateKind === "fixed") return "";

  const s = t.anchor
    .replace(/[+\-−]\s*\d+(?:\.\d+)?\s*%?/g, " ") // the margin sharing the cell
    .replace(/[|*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^ר\.?\s*(?=עוגן)/, ""); // Discount abbreviates "ריבית עוגן" to "ר.עוגן"

  if (!s || /^[-–—.]+$/.test(s)) return "";
  // Hapoalim names its bond anchor with a single letter. Left bare it is a
  // riddle; saying it IS the anchor keeps the lender's own code and the meaning.
  if (/^[A-Za-z]{1,2}$/.test(s)) return `עוגן ${s.toUpperCase()}`;
  // Discount spells the central bank out in full, which does not fit the column
  // beside a margin field. ב"י is what the trade writes and says (ריבית ב"י);
  // the lender's untouched wording is still on the row in source_track.
  return s.replace(/בנק\s+ישראל/g, 'ב"י');
}

function toRow(t: BankTranche, mixId: string, st: BankStatement): ImportedLoan {
  const end = iso(t.endDate);
  return {
    id: crypto.randomUUID(),
    mix_id: mixId,
    path_id: pathIdOf(t),
    amount: Math.round(t.balance ?? 0),
    rate: t.rate ?? 0,
    months: termOf(t, st.statementDate),
    loan_end_date: end,
    end_date: end,
    amortization_schedule_id: amortizationId(t.amortization),
    grace_type_id: 1,
    grace_months: 0,
    // Numeric: the anchor's own rate, printed where a lender prints it and
    // derived from rate − margin where one does not. Its name is words and lives
    // in source_anchor, off the grid.
    anchor: anchorRateOf(t),
    anchor_margin: t.margin ?? null,
    anchor_interval: t.resetMonths ?? null,
    change_frequency: frequencyOf(t),
    source_anchor: anchorNameOf(t),
    group: "mortgage",
    is_guarantor: false,
    source_bank: st.bankLabel,
    source_type: "משכנתה",
    source_track: t.rawTrack || trackLabelOf(t),
  } as ImportedLoan & { anchor_margin: number | null; anchor_interval: number | null };
}

/** A readable track name when the lender's own wording is missing. */
function trackLabelOf(t: BankTranche): string {
  if (t.rateKind === "prime") return "פריים";
  const kind = t.rateKind === "variable" ? "משתנה" : "קבועה";
  const link = t.linkage === "linked" ? "צמודה" : t.linkage === "fx" ? 'מט"ח' : "לא צמודה";
  return `${kind} ${link}`;
}

/**
 * Build the board from a statement.
 *
 * Shaped exactly like the credit-report importer's result so the page does not
 * care which document it was handed — the two are alternatives, never both.
 */
export function bankStatementToLoans(
  st: BankStatement,
  mixId: string,
  fileName = ""
): ImportSummary {
  const live = st.tranches.filter((t) => (t.balance ?? 0) > 0);
  const loans = live
    .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))
    .map((t) => toRow(t, mixId, st));

  const totalMonthly = live.reduce((s, t) => s + (t.monthly ?? 0), 0);

  return {
    loans,
    mortgages: loans,
    others: [],
    clientName: st.client.name,
    clientId: st.client.idNumber,
    reportDate: st.statementDate,
    fileName,
    bank: st,
    kind: "bank",
    // A mortgage statement covers one mortgage. Cards, overdrafts and consumer
    // loans are simply not in it, which is not the same as the client not
    // having any — said plainly rather than implied by an empty list.
    skipped: [],
    guaranteed: 0,
    totalBalance: loans.reduce((s, l) => s + (Number(l.amount) || 0), 0),
    totalMonthly,
  };
}

export type { Loan };
