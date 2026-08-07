// משכנתא הפוכה — the arithmetic, lifted whole from the original calculator.
//
// Source: app/home/calculators/reverse_calculator/ —
//   ReverseMortgageCalculator.tsx        the eligibility rule
//   ReverseMortgageLoanComparison.tsx    the two products' summaries
//   ReverseMortgageAmortizationTable.tsx the month-by-month build
//
// Not one figure changed. What changed is where it lives: those three files
// each carried their own copy of the loop, so a product card and the schedule
// it opened were two implementations that merely happened to agree. Here the
// rows are built once and the summary is SUMMED FROM THE ROWS, which makes the
// agreement structural rather than lucky.
//
// Everything is nominal shekels — the index is capitalised onto the balance
// exactly as the original does, never discounted back.

/** A borrower under this is not eligible, and neither is the couple. */
export const MIN_AGE = 55;

/** The floor of the funding rate, before the age bonus. Written 15 + 5 in the
 *  original; kept as one number here, with the split recorded. */
export const BASE_PERCENT = 20;

/** The defaults the original form opens on, and the ones נקה טופס restores. */
export const DEFAULTS = { months: "360", interestRate: "4.5", indexRate: "2" } as const;

/**
 * A 50-year ceiling on the term.
 *
 * The original passed `Number(months) || 360` straight into a for-loop, so a
 * mistyped "36000" built thirty-six thousand rows and hung the tab. The UI
 * caps the field at 600; this is the second door, for anything that reaches
 * the maths another way.
 */
export const MAX_MONTHS = 600;

export type Eligibility =
  | { ok: true; decidingAge: number; percent: number; loan: number }
  /** Not enough typed in yet to say anything — not an error, just silence. */
  | { ok: false; reason: "empty" }
  | { ok: false; reason: "age1" | "age2" };

/**
 * THE ELIGIBILITY RULE.
 *
 * Takes the raw field strings rather than numbers, deliberately: the original
 * tests `age2 &&` on the string, so a typed "0" in גיל לווה 2 is a stated age
 * of zero and fails the check, while an empty field means "single borrower".
 * Converting to numbers first would quietly merge those two cases.
 *
 *   deciding age = the YOUNGER of the two, or the only one
 *   percent      = 20 + one point per year over 55
 *   loan         = the property's value at that percent
 */
export function eligibility(propertyValue: string, age1: string, age2: string): Eligibility {
  const value = Number(propertyValue);
  const borrower1 = Number(age1);
  const borrower2 = Number(age2);

  if (!value || !borrower1) return { ok: false, reason: "empty" };
  if (borrower1 < MIN_AGE) return { ok: false, reason: "age1" };
  if (age2 && borrower2 < MIN_AGE) return { ok: false, reason: "age2" };

  const decidingAge = age2 ? Math.min(borrower1, borrower2) : borrower1;
  const percent = BASE_PERCENT + Math.max(0, decidingAge - MIN_AGE);

  return { ok: true, decidingAge, percent, loan: value * (percent / 100) };
}

export type PlanKind = "balloon" | "grace";

export type ReverseRow = {
  month: number;
  startBalance: number;
  interest: number;
  index: number;
  payment: number;
  endBalance: number;
};

export type Plan = {
  kind: PlanKind;
  /** בלון מלא pays nothing monthly; גרייס pays the first month's interest. */
  monthly: number;
  /** בלון: the balance at the end. גרייס: that balance plus everything paid. */
  total: number;
  interest: number;
  index: number;
  /** interest + index — what the credit costs on top of the principal. */
  cost: number;
  /** The final balance to be settled from the property. */
  endBalance: number;
  /** Month 0 is the drawdown, so rows.length === months + 1. */
  rows: ReverseRow[];
};

/** Effective monthly rates — the twelfth root, not a twelfth. */
export function monthlyRates(interestRate: number, indexRate: number) {
  return {
    monthlyInterest: Math.pow(1 + interestRate / 100, 1 / 12) - 1,
    monthlyIndex: Math.pow(1 + indexRate / 100, 1 / 12) - 1,
  };
}

/**
 * ONE PASS, both products.
 *
 * בלון מלא   nothing is paid. Interest compounds onto the debt, then the index
 *            reprices the whole of it — including the interest just added,
 *            which is the order the original uses and the reason the curve
 *            climbs the way it does.
 * גרייס      the month's interest is paid out of pocket, so the principal never
 *            capitalises interest; it still grows, by the index alone.
 */
export function reversePlans(
  loan: number,
  interestRate: number,
  indexRate: number,
  months: number
): { balloon: Plan; grace: Plan } {
  const principal = Number(loan) || 0;
  const n = Math.max(0, Math.min(MAX_MONTHS, Math.round(Number(months) || 0)));
  const { monthlyInterest, monthlyIndex } = monthlyRates(interestRate, indexRate);

  // Month 0 is the drawdown: nothing has accrued, the balance is the principal.
  const opening = (): ReverseRow => ({
    month: 0,
    startBalance: 0,
    interest: 0,
    index: 0,
    payment: 0,
    endBalance: principal,
  });

  /* ------------------------------------------------------- 1. בלון מלא */
  const balloonRows: ReverseRow[] = [opening()];
  let balloonBalance = principal;
  let balloonInterest = 0;
  let balloonIndex = 0;

  for (let m = 1; m <= n; m++) {
    const startBalance = balloonBalance;

    const interest = startBalance * monthlyInterest;
    balloonBalance += interest;

    // the index reprices the balance the interest has already joined
    const index = balloonBalance * monthlyIndex;
    balloonBalance += index;

    balloonInterest += interest;
    balloonIndex += index;
    balloonRows.push({ month: m, startBalance, interest, index, payment: 0, endBalance: balloonBalance });
  }

  /* --------------------------------------------- 2. גרייס — ריבית בלבד */
  const graceRows: ReverseRow[] = [opening()];
  let graceBalance = principal;
  let gracePaid = 0;
  let graceIndex = 0;

  for (let m = 1; m <= n; m++) {
    const startBalance = graceBalance;

    // paid this month, out of pocket, so it never joins the debt
    const interestPayment = startBalance * monthlyInterest;

    // the principal is not paid down, so the index keeps repricing it
    const index = startBalance * monthlyIndex;
    graceBalance += index;

    gracePaid += interestPayment;
    graceIndex += index;
    graceRows.push({
      month: m,
      startBalance,
      interest: interestPayment,
      index,
      payment: interestPayment,
      endBalance: graceBalance,
    });
  }

  return {
    balloon: {
      kind: "balloon",
      monthly: 0,
      total: balloonBalance,
      interest: balloonInterest,
      index: balloonIndex,
      cost: balloonInterest + balloonIndex,
      endBalance: balloonBalance,
      rows: balloonRows,
    },
    grace: {
      kind: "grace",
      // the first month's interest, before the index has moved anything
      monthly: graceRows[1]?.payment ?? 0,
      // everything paid along the way, plus the indexed principal at the end
      total: graceBalance + gracePaid,
      interest: gracePaid,
      index: graceIndex,
      cost: gracePaid + graceIndex,
      endBalance: graceBalance,
      rows: graceRows,
    },
  };
}

/** The first month the debt passes the property's value, or null if it never
 *  does inside the term. Today's value, held flat — no appreciation is assumed
 *  anywhere on this page, and the chart says so out loud. */
export function crossoverMonth(rows: ReverseRow[], propertyValue: number): number | null {
  if (!(propertyValue > 0)) return null;
  for (const r of rows) if (r.endBalance > propertyValue) return r.month;
  return null;
}

/** Twelve months to a line: the year's flows summed, its balances taken from
 *  the ends. Same rows, read at a distance. */
export function byYear(rows: ReverseRow[]): ReverseRow[] {
  const out: ReverseRow[] = [];
  // month 0 is the drawdown and belongs to no year
  const body = rows.filter((r) => r.month > 0);
  for (let i = 0; i < body.length; i += 12) {
    const chunk = body.slice(i, i + 12);
    if (!chunk.length) continue;
    out.push({
      month: Math.ceil(chunk[chunk.length - 1].month / 12),
      startBalance: chunk[0].startBalance,
      interest: chunk.reduce((s, r) => s + r.interest, 0),
      index: chunk.reduce((s, r) => s + r.index, 0),
      payment: chunk.reduce((s, r) => s + r.payment, 0),
      endBalance: chunk[chunk.length - 1].endBalance,
    });
  }
  return out;
}
