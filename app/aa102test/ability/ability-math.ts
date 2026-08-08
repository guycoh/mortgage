// יכולת החזר — the arithmetic, and nothing else.
//
// Every rule below is the /aa1 calculator's, kept to the digit. The tool around
// it was rebuilt; the numbers it produces were not, because an advisor quotes
// these to a client and the two pages must never disagree.
//
// THE RULES, as /aa1 states them:
//   · אחוז מימון מקסימלי is a property of the purpose (75/70/50/50/70).
//   · משכנתא מבוקשת = שווי הנכס − הון עצמי, floored at 0. It is derived, never
//     typed — which is why nothing in the UI offers to edit it.
//   · הון עצמי מינימלי = שווי הנכס × (100 − maxLtv)%, and השלמה is the distance
//     left to it.
//   · A guarantor's income counts at 50%. Everyone else's counts in full.
//   · הכנסה פנויה = כל ההכנסות המוכרות − החזרי ההלוואות.
//   · תקרת החזר: 35% מומלצת, 40% מקסימלית, both of the free income.
//   · החזר חודשי is שפיצר on the requested mortgage.
//
// WHAT CHANGED, and it is only what /aa1 got wrong:
//   · ריבית 0 divided by zero and printed NaN across the whole card. A zero
//     rate is a legitimate thing to type into a mortgage calculator, so it is
//     answered rather than crashed: principal ÷ months.
//   · תקופה is clamped to MAX_MONTHS. A mistyped 36000 in the sibling tool used
//     to hang the tab; there is no schedule loop here, but a 3,000-year term is
//     not a number anyone means.
//
// WHAT WAS ADDED, at the owner's request: a second income line per borrower —
// הכנסה חודשית נוספת — which Fireberry carries and /aa1 had no field for. It is
// income; it is summed with the salary and nothing else about the maths moves.

export type Purpose = "single" | "replacement" | "investment" | "any" | "self_build";

/** In the order the original's dropdown listed them. */
export const PURPOSES: { id: Purpose; label: string; full: string; maxLtv: number }[] = [
  { id: "single", label: "דירה יחידה", full: "דירה יחידה", maxLtv: 75 },
  { id: "replacement", label: "דירה חלופית", full: "דירה חלופית", maxLtv: 70 },
  { id: "investment", label: "דירה נוספת", full: "דירה נוספת (השקעה)", maxLtv: 50 },
  { id: "any", label: "כל מטרה", full: "כל מטרה", maxLtv: 50 },
  { id: "self_build", label: "בניה עצמית", full: "בניה עצמית", maxLtv: 70 },
];

export const PURPOSE_BY_ID = Object.fromEntries(PURPOSES.map((p) => [p.id, p])) as Record<
  Purpose,
  (typeof PURPOSES)[number]
>;

export const DEFAULTS = { months: "360", interest: "4.8" };

/** 40 years. Longer than any Israeli lender writes and short enough that a
 *  slipped keystroke cannot produce a figure nobody notices is nonsense. */
export const MAX_MONTHS = 480;

/** The two ceilings, exactly as /aa1 draws them. */
export const RECOMMENDED_RATIO = 0.35;
export const MAX_RATIO = 0.4;

/** A guarantor is not a borrower. Half of their income is what a lender will
 *  look at, and the sheet says so out loud rather than halving it silently. */
export const GUARANTOR_SHARE = 0.5;

/** Digits out of anything a person can type into a money field. */
export const num = (s: string | number | null | undefined): number => {
  if (typeof s === "number") return Number.isFinite(s) ? s : 0;
  const n = Number(String(s ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/**
 * שפיצר — a constant monthly payment over `months` at `annualPct`.
 *
 * The closed form /aa1 uses, with the zero-rate branch it lacked: at r = 0 the
 * annuity factor is 0/0, and the limit of it is simply the principal spread
 * evenly across the term.
 */
export function spitzer(principal: number, annualPct: number, months: number): number {
  if (!(principal > 0) || !(months > 0)) return 0;
  const r = annualPct / 100 / 12;
  if (!(r > 0)) return principal / months;
  return principal * (r / (1 - Math.pow(1 + r, -months)));
}

export type AbilityInput = {
  purpose: Purpose;
  assetValue: string;
  equity: string;
  /** בן זוג ראשי — the only column that carries the household's loans. */
  mainAge: string;
  mainIncome: string;
  mainExtra: string;
  loans: string;
  /** בן זוג משני */
  secondAge: string;
  secondIncome: string;
  secondExtra: string;
  /** ערבים */
  guarantorAge: string;
  guarantorIncome: string;
  months: string;
  interest: string;
};

/** Where the payment falls against the two ceilings. */
export type Verdict = "ok" | "warn" | "over";

export type Assessment = {
  /* the deal */
  asset: number;
  equity: number;
  maxLtv: number;
  maxMortgage: number;
  requested: number;
  equityPercent: number;
  minEquityPercent: number;
  minEquity: number;
  equityGap: number;

  /* the household */
  mainTotal: number;
  secondTotal: number;
  guarantorRaw: number;
  guarantorCounted: number;
  totalIncome: number;
  totalLoans: number;
  freeIncome: number;

  /* the ceilings and the cost */
  recommendedCap: number;
  maxCap: number;
  months: number;
  rate: number;
  monthlyPayment: number;
  /** ההחזר כאחוז מההכנסה הפנויה. null while there is no free income to divide by. */
  ratio: number | null;

  /** Enough is on the sheet for the verdict to mean something. */
  ready: boolean;
  /** Income was entered and the loans swallow it — the ceilings are unusable. */
  noCapacity: boolean;
  verdict: Verdict | null;
};

export function assess(i: AbilityInput): Assessment {
  const maxLtv = PURPOSE_BY_ID[i.purpose].maxLtv;

  const asset = num(i.assetValue);
  const equity = num(i.equity);
  const maxMortgage = asset * (maxLtv / 100);
  const requested = Math.max(asset - equity, 0);
  const equityPercent = asset > 0 ? (equity / asset) * 100 : 0;
  const minEquityPercent = 100 - maxLtv;
  const minEquity = asset * (minEquityPercent / 100);
  const equityGap = Math.max(minEquity - equity, 0);

  const mainTotal = num(i.mainIncome) + num(i.mainExtra);
  const secondTotal = num(i.secondIncome) + num(i.secondExtra);
  const guarantorRaw = num(i.guarantorIncome);
  const guarantorCounted = guarantorRaw * GUARANTOR_SHARE;

  const totalIncome = mainTotal + secondTotal + guarantorCounted;
  const totalLoans = num(i.loans);
  const freeIncome = totalIncome - totalLoans;

  const recommendedCap = Math.max(freeIncome, 0) * RECOMMENDED_RATIO;
  const maxCap = Math.max(freeIncome, 0) * MAX_RATIO;

  const months = Math.min(MAX_MONTHS, Math.max(0, Math.round(num(i.months))));
  const rate = num(i.interest);
  const monthlyPayment = spitzer(requested, rate, months);

  const ratio = freeIncome > 0 ? (monthlyPayment / freeIncome) * 100 : null;

  // Something was said about the household's money and the answer is that there
  // is none left. Keyed on either side of the subtraction: a sheet carrying only
  // a loan repayment has a negative free income and has to say so, rather than
  // showing a payment with no gauge and no explanation for its absence.
  const noCapacity = (totalIncome > 0 || totalLoans > 0) && freeIncome <= 0;
  const ready = monthlyPayment > 0 && freeIncome > 0;

  return {
    asset,
    equity,
    maxLtv,
    maxMortgage,
    requested,
    equityPercent,
    minEquityPercent,
    minEquity,
    equityGap,
    mainTotal,
    secondTotal,
    guarantorRaw,
    guarantorCounted,
    totalIncome,
    totalLoans,
    freeIncome,
    recommendedCap,
    maxCap,
    months,
    rate,
    monthlyPayment,
    ratio,
    ready,
    noCapacity,
    verdict: !ready
      ? null
      : monthlyPayment <= recommendedCap
        ? "ok"
        : monthlyPayment <= maxCap
          ? "warn"
          : "over",
  };
}
