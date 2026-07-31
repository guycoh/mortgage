// תדירות שינוי — how often a rate resets, in one vocabulary.
//
// Three sources say it three different ways, and one of them does not say it at
// all:
//
//   A bank statement prints it outright. Leumi and Discount head a column
//   "תדירות שינוי הריבית", Hapoalim adds "בחודשים", and Mizrahi prints it twice
//   — as a field ("30 חודשים") and inside the track sentence ("משתנה לא צמודה
//   כל 2 שנים", "עדכ':3 חודשים"), the field being the one it actually runs on.
//   All four land as BankTranche.resetMonths.
//
//   A חיווי אשראי never prints it. The דוח ריכוז נתונים carries סוג ריבית
//   (201-032), עוגן (201-034) and מרווח (201-035) and no reset interval — the
//   only תדירות in the whole template is תדירות התשלומים (201-044), which is how
//   often the borrower PAYS, not how often the rate moves. So the report gets
//   the two answers it genuinely supports — a fixed rate never resets, a
//   prime-anchored rate moves with the Bank of Israel — and "לא צוין" for the
//   rest, rather than a number nobody printed.
//
// The label is the stored value: change_frequency is a text column, and words an
// advisor would say survive a round-trip through the database better than a code
// only this file understands. `freqMonths` reads them back when the numeric
// anchor_interval has to agree.

/** The rate is fixed for the life of the loan — there is no reset. */
export const FREQ_FIXED = "ללא שינוי";
/** Prime-anchored: it moves whenever the Bank of Israel moves. */
export const FREQ_PRIME = "עם הפריים";
/** The document says the rate varies, but not how often. */
export const FREQ_UNSTATED = "לא צוין";

/** Months between resets → the words an advisor would use. */
export function freqLabel(months: number | null | undefined): string {
  const m = Math.round(Number(months) || 0);
  if (m <= 0) return "";
  if (m === 1) return "כל חודש";
  if (m === 6) return "כל חצי שנה";
  if (m === 12) return "כל שנה";
  if (m % 12 === 0) return `כל ${m / 12} שנים`;
  return `כל ${m} חודשים`;
}

/**
 * A label back to months, for keeping the numeric anchor_interval column honest
 * when someone changes the dropdown by hand. The three non-interval answers have
 * no number, and say so by returning null rather than 0.
 */
export function freqMonths(label: string | null | undefined): number | null {
  const s = (label ?? "").trim();
  if (!s || s === FREQ_FIXED || s === FREQ_PRIME || s === FREQ_UNSTATED) return null;
  if (/חצי\s*שנה/.test(s)) return 6;
  const years = s.match(/(\d+(?:\.\d+)?)\s*שנ/);
  if (years) return Math.round(Number(years[1]) * 12);
  const months = s.match(/(\d+)\s*חוד/);
  if (months) return Number(months[1]);
  if (/כל\s*חודש/.test(s)) return 1;
  return null;
}

/** What the dropdown offers, in the order a mortgage actually comes in. */
export const FREQ_OPTIONS: { value: string; label: string; note?: string }[] = [
  { value: "", label: "—", note: "ללא נתון" },
  { value: FREQ_FIXED, label: FREQ_FIXED, note: "ריבית קבועה לכל התקופה" },
  { value: FREQ_PRIME, label: FREQ_PRIME, note: "משתנה עם ריבית בנק ישראל" },
  { value: "כל חודש", label: "כל חודש" },
  { value: "כל 3 חודשים", label: "כל 3 חודשים" },
  { value: "כל חצי שנה", label: "כל חצי שנה" },
  { value: "כל שנה", label: "כל שנה" },
  { value: "כל 2 שנים", label: "כל 2 שנים" },
  { value: "כל 30 חודשים", label: "כל 30 חודשים", note: "שנתיים וחצי" },
  { value: "כל 3 שנים", label: "כל 3 שנים" },
  { value: "כל 5 שנים", label: "כל 5 שנים" },
  { value: "כל 7 שנים", label: "כל 7 שנים" },
  { value: "כל 10 שנים", label: "כל 10 שנים" },
  { value: FREQ_UNSTATED, label: FREQ_UNSTATED, note: "משתנה, התדירות לא מופיעה בדוח" },
];

/**
 * The dropdown's options plus whatever the row already holds.
 *
 * A lender is free to print an interval nobody expected — 42 months, say — and
 * the import must not silently round it to the nearest option in the list.
 */
export function freqOptionsFor(value: string | null | undefined) {
  const v = (value ?? "").trim();
  if (!v || FREQ_OPTIONS.some((o) => o.value === v)) return FREQ_OPTIONS;
  return [...FREQ_OPTIONS, { value: v, label: v, note: "כפי שנקרא מהמסמך" }];
}
