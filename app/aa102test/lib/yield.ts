// שת"פ (IRR) and ע.נ.נ (NPV) for one row of the mix.
//
// Both read the schedule the engine already produced rather than re-deriving
// anything: whatever the row does — שפיצר, קרן שווה, a balloon, two grace
// periods, indexation — arrives here as a vector of monthly payments, and these
// two functions only discount it. That is the whole point of measuring them off
// `LoanResult.schedule`: a schedule shape nobody anticipated still gets a
// correct IRR, because nothing here knows or cares which shape it was.
//
// Deliberately NOT in calculate/loanCalculators.ts: that module is shared by
// /aa100test, /aa101test and the CRM simulator, and none of them ask for these.

import type { LoanResult } from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";

/** Present value of a monthly payment vector at a monthly rate. */
function pv(payments: number[], monthlyRate: number): number {
  let sum = 0;
  // t starts at 1: the instalment is paid at the END of its month, which is the
  // same convention the engine amortises on.
  for (let t = 0; t < payments.length; t += 1) {
    sum += payments[t] / Math.pow(1 + monthlyRate, t + 1);
  }
  return sum;
}

/**
 * The monthly rate at which the payments are worth exactly the principal.
 *
 * Bisection rather than Newton: the objective is smooth and strictly decreasing
 * in r over the bracket, so bisection cannot diverge or land on a second root,
 * and 200 halvings of a bracket this wide is exact to far beyond the 2 decimals
 * anyone reads. Newton would be faster and occasionally wrong.
 */
export function monthlyIRR(principal: number, payments: number[]): number | null {
  if (!(principal > 0) || !payments.length) return null;
  const total = payments.reduce((s, p) => s + p, 0);
  if (!(total > 0)) return null;

  const f = (r: number) => pv(payments, r) - principal;

  // A borrower repaying less in total than they received has a negative return;
  // one repaying more has a positive one. The bracket has to cover both, and
  // -1 is the vertical asymptote so the low end stops just short of it.
  let lo = -0.9999;
  let hi = 1; // 100% a month — no credit product on this board comes near it
  if (f(lo) < 0) return null; // no sign change: nothing to solve
  if (f(hi) > 0) return null; // payments so large the rate is off the scale

  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * שת"פ — the annual effective rate the row actually returns to its lender.
 *
 * Compounded, (1+r)^12 − 1, not r×12. That is what IRR means everywhere it is
 * defined, and it is also what makes the figure legible on this board: a plain
 * שפיצר row quoted at a nominal 4.40% comes back 4.49%, which is precisely the
 * ריבית מתואמת the credit report prints beside the nominal one. The number has
 * an independent check built into the source document.
 *
 * Where it stops agreeing with the quoted rate is where it earns its place —
 * indexation, grace, a balloon, or a payment the bank set by its own cycle.
 */
export function annualIRR(principal: number, payments: number[]): number | null {
  const r = monthlyIRR(principal, payments);
  if (r === null) return null;
  const annual = (Math.pow(1 + r, 12) - 1) * 100;
  return Number.isFinite(annual) ? annual : null;
}

/**
 * ע.נ.נ — what the payment stream is worth today, less the principal it retires.
 *
 * NPV = PV(payments at the board's שיעור היוון) − יתרת קרן.
 *
 * SIGN, because it is the whole meaning of the column: POSITIVE means the row
 * costs more than money costs — its payments discount back to more than the debt
 * it clears, so the borrower is paying above the discount rate. NEGATIVE means
 * the opposite, and a row at exactly the discount rate reads ₪0.
 *
 * This is the same quantity Israeli practice calls היוון when pricing an exit:
 * a fixed loan struck below today's rates has a negative ע.נ.נ and no penalty,
 * one struck above has a positive ע.נ.נ and that is what the עמלה is made of.
 * The board's הפרשי היוון column stays what it is — a figure typed off a payoff
 * letter — and this is the computed sibling beside it.
 */
export function npv(
  principal: number,
  payments: number[],
  annualDiscountPct: number
): number | null {
  if (!(principal > 0) || !payments.length) return null;
  // NOMINAL, /12 — and deliberately NOT the inverse of annualIRR's compounding.
  //
  // The two look like they should round-trip and they do not, so this is worth
  // stating before someone "fixes" it. שת"פ is an IRR and an IRR is effective by
  // definition, so it compounds. שיעור היוון is a rate an advisor TYPES, and
  // every rate typed on this board — ריבית, עוגן, תוספת — is nominal annual
  // compounded monthly, because that is how an Israeli mortgage is quoted. A
  // discount rate that meant something different from the ריבית column while
  // sitting two columns away from it would be the worse trap.
  //
  // Consequence: discounting a row at the שת"פ it reports lands near zero but
  // not on it (about ₪2k on a ₪212k row). Feed the nominal equivalent —
  // monthlyIRR × 1200 — and it is exact.
  const d = annualDiscountPct / 12 / 100;
  if (!Number.isFinite(d) || d <= -1) return null;
  const value = pv(payments, d) - principal;
  if (!Number.isFinite(value)) return null;
  // A row priced exactly at the discount rate lands on a tiny negative, and
  // Math.round of that is -0, which prints as "₪-0". Zero has no sign here.
  return Math.abs(value) < 0.5 ? 0 : value;
}

export interface RowYield {
  /** שת"פ, annual effective %, or null when the row cannot produce one. */
  irr: number | null;
  /** ע.נ.נ in shekels, or null. */
  npv: number | null;
}

/**
 * Both figures for one priced row.
 *
 * A row with no term, no balance or no payments (an empty starter row, a
 * past-due debt imported without a schedule) has neither, and says so with null
 * rather than a misleading 0 — see the ledger, which prints "—".
 */
export function rowYield(
  principal: number,
  res: Pick<LoanResult, "schedule">,
  annualDiscountPct: number
): RowYield {
  const payments = (res.schedule ?? []).map((s) => s.payment);
  return {
    irr: annualIRR(principal, payments),
    npv: npv(principal, payments, annualDiscountPct),
  };
}
