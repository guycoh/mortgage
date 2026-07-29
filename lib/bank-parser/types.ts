// Mortgage statements, as the four lenders actually print them.
//
// A דוח ריכוז נתונים tells you a mortgage exists and roughly what it costs. The
// bank's own payoff statement tells you what it IS: every tranche, its rate, its
// linkage, its anchor and margin, when the rate next resets, the index it was
// struck at, and what breaking it early would cost. None of that is in the
// credit report, and all of it decides whether a recycle is worth doing.
//
// One model for all four banks. Where a lender does not print a field it stays
// null rather than being guessed at, because a mortgage decision made on an
// invented number is worse than one made on an acknowledged gap.

/** Which lender's template produced this. */
export type BankId = "leumi" | "poalim" | "discount" | "mercantile" | "jerusalem";

export const BANK_LABEL: Record<BankId, string> = {
  leumi: "בנק לאומי",
  poalim: "בנק הפועלים",
  discount: "בנק דיסקונט",
  mercantile: "מרכנתיל דיסקונט",
  jerusalem: "בנק ירושלים",
};

/**
 * How the rate behaves. Deliberately the same five buckets the simulator's
 * tracks use, so a statement can feed the mix without a second translation.
 */
export type RateKind = "fixed" | "variable" | "prime" | "unknown";
export type Linkage = "linked" | "unlinked" | "fx" | "unknown";

/**
 * One tranche of one mortgage — a משנה at Leumi, a מרכיב at Hapoalim, a חלק at
 * Jerusalem, and at Discount a whole loan number (it does not subdivide).
 */
export interface BankTranche {
  /** Stable within the document: loan number + tranche number. */
  uid: string;
  loanNumber: string;
  /** משנה / מרכיב / חלק number as printed, when there is one. */
  trancheNumber: string;

  /* ---- what it is */
  /** The lender's own words, kept verbatim for display and for audit. */
  rawTrack: string;
  rateKind: RateKind;
  linkage: Linkage;
  /** שפיצר / קרן שווה / בולט, as printed. */
  amortization: string;
  purpose: string;

  /* ---- money */
  /** יתרת קרן — principal outstanding, before linkage. */
  principal: number | null;
  /** שיערוך קרן / הצמדת קרן — the index uplift sitting on the principal. */
  indexation: number | null;
  /** Accrued interest to the payoff date. */
  accruedInterest: number | null;
  /** Arrears, where the lender prints them. */
  arrears: number | null;
  /**
   * The number that matters for a mix: principal + indexation. This is the
   * balance a refinance would have to cover, excluding break fees.
   */
  balance: number | null;
  /** יתרה לסילוק — balance plus fees, what it costs to close today. */
  payoff: number | null;
  /** Original advance. */
  originalAmount: number | null;
  /** Monthly repayment for this tranche. */
  monthly: number | null;

  /* ---- price */
  /** Nominal annual %, e.g. 5.9. */
  rate: number | null;
  /** ריבית מתואמת — effective/APR %. */
  effectiveRate: number | null;
  /** שיעור ריבית כוללת חזויה — the lender's forecast all-in cost. */
  forecastRate: number | null;
  /** שיעור ריבית לצורכי השוואה — the regulated comparison figure. */
  comparisonRate: number | null;
  /** Anchor description, e.g. "עוגן בנק ישראל", "פריים". */
  anchor: string;
  /** Margin over the anchor, in points, e.g. 3.25. */
  margin: number | null;
  /** Months between rate resets. */
  resetMonths: number | null;
  /** Next reset date, dd/mm/yyyy. */
  nextReset: string;

  /* ---- dates and term */
  startDate: string;
  firstPaymentDate: string;
  endDate: string;
  /**
   * Months left to run. Printed outright by Discount; derived from the end date
   * against the statement date everywhere else, and marked as such.
   */
  months: number | null;
  monthsDerived: boolean;

  /* ---- linkage arithmetic */
  baseIndex: number | null;
  currentIndex: number | null;

  /* ---- cost of breaking it */
  /** סה"כ עמלת פרעון מוקדם for this tranche. */
  breakFee: number | null;
  /** Its parts, where itemised: היוון / אי הודעה / מדד ממוצע / תפעולית. */
  breakFeeParts: { label: string; amount: number }[];
}

/** A mortgage: one loan number, one or more tranches. */
export interface BankLoan {
  loanNumber: string;
  purpose: string;
  tranches: BankTranche[];
  /** Loan-level totals as the lender printed them, for reconciliation. */
  printed: {
    balance: number | null;
    payoff: number | null;
    monthly: number | null;
    breakFee: number | null;
    forecastRate: number | null;
  };
}

export interface BankStatement {
  bank: BankId;
  bankLabel: string;
  /** Which template variant matched, for diagnostics. */
  template: string;
  /** ליום / תאריך הפקה — the date every balance is stated as of. */
  statementDate: string;
  client: { name: string; idNumber: string; address: string };
  accountNumber: string;
  loans: BankLoan[];
  /**
   * Every tranche, flattened — what the simulator consumes.
   */
  tranches: BankTranche[];
  totals: {
    balance: number;
    payoff: number;
    monthly: number;
    breakFee: number;
  };
  /**
   * Where the parse and the lender's own totals disagree, or a field the
   * template does not carry. Surfaced, never swallowed.
   */
  warnings: string[];
}
