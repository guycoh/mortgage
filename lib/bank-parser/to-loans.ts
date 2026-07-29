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
    // The anchor rate itself is a number in this column; the statement gives a
    // description ("ר.עוגן בנק ישראל"), which belongs on the label, not here.
    anchor: null,
    anchor_margin: t.margin ?? null,
    anchor_interval: t.resetMonths ?? null,
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
