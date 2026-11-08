// Checks every statement goes through after its reader, whichever bank it is.
//
// A reader knows its template; these know mortgages. Each one rests on an
// identity the letter itself has to satisfy, so a failure is the letter
// contradicting the parse — not a threshold someone tuned. They exist because
// the 2026-11-08 batch found two readers' assumptions that held on every letter
// seen until then and broke on the first that did not fit them:
//
//   - a letter dated ON a payment day, after the debit, counted that day's
//     payment as still owed — every term one month long, totals still closing,
//     nothing on the page contradicting it except the monthly payment;
//   - a gap in the payoff guessed at instead of read.
//
// The first is what this file guards, for every bank at once, so a reader that
// forgets the rule (or a new reader that never knew it) is caught here.

import type { BankStatement, BankTranche } from "./types";
import { paymentsLeft, toDate } from "./text";

/**
 * A letter dated on a payment day, printed after that day's debit.
 *
 * Nothing has accrued since the charge, so every priced part reads zero
 * accrued interest — a 0% part accrues nothing on any day and says nothing
 * either way, so it is not asked. Leumi, FIBI and Mizrahi apply this in their
 * own readers; doing it here as well costs nothing (it only touches a part
 * whose end date falls on the letter's day of the month, and then gives the
 * same answer the reader did) and covers any reader that does not.
 *
 * Only terms the reader derived are touched. A term the bank printed (Discount,
 * Jerusalem) is the bank's count and stands.
 */
export function settlePaymentDay(st: BankStatement): void {
  const asOf = toDate(st.statementDate);
  if (!asOf) return;
  const priced = st.tranches.filter((t) => (t.rate ?? 0) > 0 && t.accruedInterest !== null);
  if (!priced.length || !priced.every((t) => t.accruedInterest === 0)) return;
  for (const t of st.tranches) {
    if (!t.monthsDerived) continue;
    const to = toDate(t.endDate);
    if (to && to.getDate() === asOf.getDate()) t.months = paymentsLeft(asOf, to, true);
  }
}

/**
 * A part priced off prime must be on the prime track.
 *
 * Each reader decides prime from its own wording — "פריים" in a track name,
 * "P + 0.15%" in a Hapoalim basis cell — and the wording has variants the
 * reader may not have met. Hapoalim matched "P +" only, so every "P - 0.50%"
 * מרכיב imported as a variable unlinked track (four of five letters in the
 * corpus, twelve parts). The anchor a reader keeps is the one place both
 * spellings end up, so it is asked here for every bank.
 */
export function primeByAnchor(st: BankStatement): string[] {
  const miss = st.tranches.filter(
    (t) => t.rateKind !== "prime" && (/(^|\s)P\s*[+\-−–]/i.test(t.anchor) || /פריים/.test(t.anchor))
  );
  if (!miss.length) return [];
  const name = (t: BankTranche) => `${t.loanNumber}${t.trancheNumber ? ` חלק ${t.trancheNumber}` : ""}`;
  return [
    `העוגן של ${miss.map(name).join(", ")} הוא פריים, אך המסלול לא זוהה כפריים — יש לבדוק את סוג המסלול.`,
  ];
}

/** Level payment on a שפיצר loan. */
function pmt(balance: number, annualRate: number, n: number): number {
  const i = annualRate / 1200;
  return i ? (balance * i) / (1 - Math.pow(1 + i, -n)) : balance / n;
}

/**
 * Can this part's printed monthly prove its term?
 *
 * Only where the arithmetic is exact. A linked part's printed payment was
 * struck at last month's index and its balance at this month's; a prime part's
 * at the rate before the last prime move; a Hapoalim מרכיב's balance is
 * apportioned, not printed. Each is off by a few tenths of a percent for
 * reasons that have nothing to do with the term — the same size as one
 * month's difference — so asking them would only produce noise. Unlinked
 * fixed and variable parts fit their printed payment to 0.01% on all 46 letters
 * in the corpus.
 */
function provable(t: BankTranche): boolean {
  return (
    t.linkage === "unlinked" &&
    (t.rateKind === "fixed" || t.rateKind === "variable") &&
    !t.balanceApportioned &&
    !/בולט|בוליט|קרן שווה/.test(t.amortization) &&
    (t.rate ?? 0) > 0 &&
    (t.months ?? 0) >= 6 &&
    (t.monthly ?? 0) > 0 &&
    (t.balance ?? 0) > 0
  );
}

/**
 * The term against the bank's own monthly payment.
 *
 * No letter prints how many payments are left; every reader but Discount's and
 * Jerusalem's counts them from the end date. The printed monthly is the one
 * figure that pins the count: balance, rate and the right term amortise to it
 * to the agora, a term one month off misses by a tenth of a percent or more.
 * When the printed payment fits a neighbouring count and not the one derived,
 * the count is wrong — and the advisor is told, because a term that is a month
 * long reprices every part of the mix and closes every total while doing it.
 */
export function termAgainstMonthly(st: BankStatement): string[] {
  const off: { t: BankTranche; fits: number }[] = [];
  for (const t of st.tranches.filter(provable)) {
    const n = t.months!;
    const miss = (k: number) => Math.abs(pmt(t.balance!, t.rate!, k) / t.monthly! - 1);
    const here = miss(n);
    if (here <= 0.0005) continue;
    const best = [n - 1, n + 1].map((k) => ({ k, e: miss(k) })).sort((a, b) => a.e - b.e)[0];
    if (best.e <= 0.0002 && best.e < here / 4) off.push({ t, fits: best.k });
  }
  if (!off.length) return [];
  const name = (t: BankTranche) => `${t.loanNumber}${t.trancheNumber ? ` חלק ${t.trancheNumber}` : ""}`;
  const parts = off.map(({ t, fits }) => `${name(t)}: ${t.months} ← ${fits}`).join("; ");
  return [
    `יתרת התקופה שחושבה אינה מתיישבת עם ההחזר החודשי המודפס — ההחזר מתאים למספר תשלומים אחר (${parts}). ייתכן שהתקופה סטתה בחודש; יש לוודא מול לוח הסילוקין.`,
  ];
}
