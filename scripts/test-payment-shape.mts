// Table test for lib/payment-shape: every value the credit report can print in
// 201-047 / 201-044, plus the printed-instalment cross-check. No PDFs needed.
// Run: npx tsx --tsconfig tsconfig.json scripts/test-payment-shape.mts
import { ENUMS } from "@/lib/credit-parser/dictionary";
import {
  BY_PAYMENT_TYPE,
  BY_FREQUENCY,
  creditShape,
  numbersShape,
  scheduleFromText,
  wordShape,
} from "@/lib/payment-shape";

let failed = 0;
function eq(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`);
}

// Every enum value is mapped (the Record type enforces it; this guards a cast).
for (const v of ENUMS.paymentType) eq(`201-047 "${v}" mapped`, v in BY_PAYMENT_TYPE, true);
for (const v of ENUMS.frequency) eq(`201-044 "${v}" mapped`, v in BY_FREQUENCY, true);

// Words alone.
eq("קרן, ריבית והצמדה", wordShape("קרן, ריבית והצמדה"), "amortizing");
eq("קרן וריבית", wordShape("קרן וריבית"), "amortizing");
eq("ריבית", wordShape("ריבית"), "interestOnly");
eq("תשלום בלון (type)", wordShape("תשלום בלון"), "balloon");
eq("תשלום בלון (frequency only)", wordShape("", "תשלום בלון"), "balloon");
eq("בולט", wordShape("בולט"), "balloon");
eq("בוליט", wordShape("בוליט"), "balloon");
eq("blank", wordShape(""), null);

// Bank letters' free text.
eq("letter שפיצר", scheduleFromText("שפיצר"), 1);
eq("letter קרן שווה", scheduleFromText("קרן שווה"), 2);
eq("letter בוליט - מדד", scheduleFromText("בוליט - מדד"), 3);
eq("letter בלון", scheduleFromText("בלון"), 3);

const r = 0.054 / 12;
// The report that started this: Leumi bullet, ₪797,367 at 5.4%, 210 months, printed ₪3,569.
const leumi = { balance: 797367, monthlyRate: r, months: 210, printed: 3569 };
eq("Leumi bullet, words+numbers", creditShape({ ...leumi, paymentType: "תשלום בלון", frequency: "תשלום בלון" }), {
  schedule: 3, interestOnly: true, balloon: true, nonMonthly: false, by: "words",
});
// The same tranche under a spelling nobody mapped: the instalment alone catches it.
eq("unmapped spelling, numbers catch it", creditShape({ ...leumi, paymentType: "", frequency: "" }), {
  schedule: 3, interestOnly: true, balloon: false, nonMonthly: false, by: "numbers",
});
eq("words say amortizing, instalment is interest", creditShape({ ...leumi, paymentType: "קרן וריבית", frequency: "חודשי" }).schedule, 3);
// A plain amortizing mortgage stays שפיצר.
const amort = { balance: 500000, monthlyRate: 0.045 / 12, months: 300, printed: 2779 };
eq("ordinary שפיצר", creditShape({ ...amort, paymentType: "קרן, ריבית והצמדה", frequency: "חודשי" }), {
  schedule: 1, interestOnly: false, balloon: false, nonMonthly: false, by: "words",
});
// Interest-only words whose instalment amortizes: the numbers win.
eq("ריבית but instalment amortizes", creditShape({ ...amort, paymentType: "ריבית", frequency: "חודשי" }).schedule, 1);
// Interest-only words with a matching instalment.
eq("ריבית, instalment = interest", creditShape({ ...amort, printed: 1875, paymentType: "ריבית", frequency: "חודשי" }).schedule, 3);
// Mute when the two candidates are close: 40 years at 6% amortizes only ~10% above interest.
eq("40y@6% is ambiguous", numbersShape(500000, 0.06 / 12, 480, 2751), null);
eq("40y@6% keeps the words", creditShape({ balance: 500000, monthlyRate: 0.06 / 12, months: 480, printed: 2751, paymentType: "קרן וריבית", frequency: "חודשי" }).schedule, 1);
// No rate / no term / no instalment: numbers are mute, words decide.
eq("no rate", numbersShape(100000, NaN, 120, 900), null);
eq("no term", numbersShape(100000, r, null, 900), null);
eq("no instalment", numbersShape(100000, r, 120, 0), null);
// A balloon that pays nothing monthly is בלון מלא.
eq("balloon, nothing monthly", creditShape({ ...leumi, printed: 0, paymentType: "תשלום בלון", frequency: "" }).schedule, 4);
// A balloon whose instalment visibly repays principal amortizes.
eq("balloon repaying principal", creditShape({ ...leumi, printed: 5877, paymentType: "תשלום בלון", frequency: "" }).schedule, 1);
// Cadence.
eq("שנתי is non-monthly", creditShape({ ...amort, printed: 0, paymentType: "קרן וריבית", frequency: "שנתי" }).nonMonthly, true);
eq("דו חודשי is non-monthly", creditShape({ ...amort, printed: 0, paymentType: "קרן וריבית", frequency: "דו חודשי" }).nonMonthly, true);
eq("חודשי is monthly", creditShape({ ...amort, paymentType: "קרן וריבית", frequency: "חודשי" }).nonMonthly, false);
eq("periodic balloon with no monthly figure amortizes", creditShape({ ...leumi, printed: 0, paymentType: "תשלום בלון", frequency: "שנתי" }).schedule, 1);

console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
