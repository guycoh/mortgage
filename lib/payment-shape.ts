/**
 * What an instalment does to the principal — the one fact every importer needs
 * and that used to be decided in four places with four regexes.
 *
 * It decides the engine's schedule (1 שפיצר · 2 קרן שווה · 3 בלון חלקי ·
 * 4 בלון מלא), and getting it wrong is silent: the board shows the printed
 * instalment either way, so only the totals, charts and comparisons go wrong.
 * A Leumi credit report spelling its bullet tranches "תשלום בלון" — a value the
 * old interest-only test never matched — priced ₪797,367 as שפיצר at ₪5,877/mo
 * against the ₪3,569 the report printed (2026-10-18).
 *
 * Two independent readings, so a spelling nobody has seen yet cannot do that
 * again on its own:
 *  - the WORDS: every value the credit report can print in 201-047 / 201-044,
 *    mapped exhaustively by type — a phrase added to ENUMS does not compile
 *    until it is placed here;
 *  - the NUMBERS: the printed instalment (201-046) against what each shape
 *    would charge on the row's balance, rate and term. When exactly one shape
 *    reproduces it, that shape wins.
 *
 * Pure arithmetic on numbers already parsed — no I/O, no extra pass.
 */
import { ENUMS } from "./credit-parser/dictionary";

export type PaymentShape = "amortizing" | "interestOnly" | "balloon";

/** Every spelling of a balloon/bullet across the credit report and the five bank templates. */
export const BALLOON_WORD = /בלון|בולי?ט/;
const EQUAL_PRINCIPAL_WORD = /קרן\s*שווה|קש"ש/;

type PaymentType = (typeof ENUMS.paymentType)[number];
type Frequency = (typeof ENUMS.frequency)[number];

/** 201-047 — the report's own words for the instalment. */
export const BY_PAYMENT_TYPE: Record<PaymentType, PaymentShape> = {
  "קרן, ריבית והצמדה": "amortizing",
  "קרן וריבית": "amortizing",
  "תשלום בלון": "balloon",
  // Revolving facilities print plain קרן; on a loan it has always been read as
  // an amortising instalment, and the numbers check below settles the rest.
  "קרן": "amortizing",
  // ריבית without קרן: the instalment is the month's interest (גרייס, or built so).
  "ריבית": "interestOnly",
  "בולט": "balloon",
  "בוליט": "balloon",
};

/**
 * 201-044 — the cadence. "תשלום בלון" here is not a cadence: it is the same
 * bullet the payment type names, and the instalment is still monthly.
 */
export const BY_FREQUENCY: Record<Frequency, "monthly" | "periodic" | "balloon"> = {
  "תשלום בלון": "balloon",
  "דו חודשי": "periodic",
  "רבעוני": "periodic",
  "חודשי": "monthly",
  "שנתי": "periodic",
};

const lookup = <K extends string, V>(map: Record<K, V>, v: string): V | undefined =>
  (map as Record<string, V>)[v.trim()];

/** Shape the words alone give, or null when the report printed none. */
export function wordShape(paymentType: string, frequency = ""): PaymentShape | null {
  const byType = lookup(BY_PAYMENT_TYPE, paymentType);
  if (byType === "balloon" || lookup(BY_FREQUENCY, frequency) === "balloon") return "balloon";
  if (byType) return byType;
  // Outside the enum (a bank letter's free text, or a caller passing raw words).
  return BALLOON_WORD.test(paymentType) ? "balloon" : null;
}

/** A stated cadence other than monthly — the row is priced monthly but must say so. */
export function isPeriodic(frequency: string): boolean {
  return lookup(BY_FREQUENCY, frequency) === "periodic";
}

/** Engine schedule for a bank letter's amortisation wording. שפיצר unless it says otherwise. */
export function scheduleFromText(text: string): 1 | 2 | 3 {
  const t = (text ?? "").replace(/\s+/g, "");
  if (EQUAL_PRINCIPAL_WORD.test(t)) return 2;
  // Leumi spells bullet with a yud ("בוליט - מדד"); the bare בולט missed it.
  if (BALLOON_WORD.test(t)) return 3;
  return 1;
}

/* ------------------------------------------------------------- numbers */

/** Within this of the printed instalment, a shape "reproduces" it. */
const MATCH = 0.05;
/** And the other shape must miss it by at least this — otherwise the numbers are mute. */
const MISS = 0.15;

function annuity(P: number, r: number, n: number): number {
  if (n <= 0) return 0;
  if (r <= 0) return P / n;
  return (P * r) / (1 - Math.pow(1 + r, -n));
}

/**
 * Which shape the printed instalment reproduces, or null when it cannot tell.
 *
 * Mute on purpose when the two candidates sit close together: a 40-year loan at
 * 6% amortises at only 10% over its interest, and there the words must decide.
 * Tolerances leave room for the ~1% the bank's own cycle and a lagging bureau
 * balance put between any printed figure and the engine.
 */
export function numbersShape(
  balance: number,
  monthlyRate: number,
  months: number | null,
  printed: number
): "amortizing" | "interestOnly" | null {
  if (!(printed > 0 && balance > 0 && monthlyRate > 0 && months && months > 0)) return null;
  const io = balance * monthlyRate;
  const amort = annuity(balance, monthlyRate, months);
  const eIo = Math.abs(io - printed) / printed;
  const eAm = Math.abs(amort - printed) / printed;
  if (eIo <= MATCH && eAm >= MISS) return "interestOnly";
  if (eAm <= MATCH && eIo >= MISS) return "amortizing";
  return null;
}

export interface CreditShape {
  /** Engine schedule: 1 שפיצר · 3 בלון חלקי (interest monthly) · 4 בלון מלא (nothing monthly). */
  schedule: 1 | 3 | 4;
  /** The instalment is the month's interest and the principal does not move. */
  interestOnly: boolean;
  /** The principal falls due in one lump at the end. */
  balloon: boolean;
  /** A stated cadence other than monthly (דו חודשי / רבעוני / שנתי). */
  nonMonthly: boolean;
  /** Which reading decided — "numbers" means the printed instalment overrode the words. */
  by: "words" | "numbers" | "default";
}

/** One credit-report transaction's shape. */
export function creditShape(i: {
  paymentType: string;
  frequency: string;
  balance: number;
  /** NaN / 0 when the report priced no track. */
  monthlyRate: number;
  months: number | null;
  /** 201-046; 0 when not printed. */
  printed: number;
}): CreditShape {
  const words = wordShape(i.paymentType, i.frequency);
  const nums = numbersShape(i.balance, i.monthlyRate, i.months, i.printed);
  const nonMonthly = isPeriodic(i.frequency);

  if (words === "balloon") {
    // A balloon that states no monthly instalment pays nothing until the end.
    // A periodic one prints 0 in a MONTHLY field because it has no monthly
    // payment, which says nothing about its interest — leave it to amortise.
    if (!(i.printed > 0)) {
      return nonMonthly
        ? { schedule: 1, interestOnly: false, balloon: true, nonMonthly, by: "default" }
        : { schedule: 4, interestOnly: false, balloon: true, nonMonthly, by: "words" };
    }
    // An instalment that visibly repays principal is a partial balloon the
    // engine has no shape for; amortising is the closer of the two.
    if (nums === "amortizing") return { schedule: 1, interestOnly: false, balloon: true, nonMonthly, by: "numbers" };
    return { schedule: 3, interestOnly: true, balloon: true, nonMonthly, by: "words" };
  }

  if (nums && nums !== words) {
    const io = nums === "interestOnly";
    return { schedule: io ? 3 : 1, interestOnly: io, balloon: false, nonMonthly, by: "numbers" };
  }
  if (words === "interestOnly") return { schedule: 3, interestOnly: true, balloon: false, nonMonthly, by: "words" };
  return { schedule: 1, interestOnly: false, balloon: false, nonMonthly, by: words ? "words" : "default" };
}
