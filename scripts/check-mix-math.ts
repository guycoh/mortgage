/*
 * Closed-form checks for the two things added to /aa102test's arithmetic:
 * grace as two sequential periods, and שת"פ / ע.נ.נ.
 *
 *   npx tsx --tsconfig tsconfig.json scripts/check-mix-math.ts
 *
 * Not in app/: nothing here ships. Every expectation is derived by hand from the
 * standard annuity identities rather than from a previous run of this code, so a
 * regression cannot agree with its own bug.
 */
import {
  calculateLoan,
  type Loan,
} from "../app/private/crm/leads/simulators/components/calculate/loanCalculators";
import { annualIRR, monthlyIRR, npv } from "../app/aa102test/lib/yield";

let failures = 0;
let checks = 0;

function ok(name: string, pass: boolean, detail = "") {
  checks += 1;
  if (!pass) {
    failures += 1;
    console.log(`FAIL  ${name}${detail ? "  — " + detail : ""}`);
  } else {
    console.log(`ok    ${name}${detail ? "  — " + detail : ""}`);
  }
}

const near = (a: number, b: number, eps = 0.5) => Math.abs(a - b) <= eps;
const f2 = (n: number) => Math.round(n * 100) / 100;

/** path 2 = קל"צ (not indexed); path 5 = מ"צ (indexed). See app/data/paths. */
const loan = (over: Partial<Loan>): Loan => ({
  id: "x",
  mix_id: "m",
  path_id: 2,
  amount: 100_000,
  rate: 6,
  months: 120,
  amortization_schedule_id: 1,
  ...over,
});

/* ---------------------------------------------------------------- annuities */

/** The textbook Spitzer instalment, written out rather than imported. */
function annuity(P: number, r: number, n: number) {
  return r === 0 ? P / n : (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

console.log("\n--- שפיצר without grace, against the closed form ---");
{
  const l = loan({});
  const res = calculateLoan(l, 0);
  const want = annuity(100_000, 0.005, 120);
  ok("monthly = annuity(100k, 0.5%/mo, 120)", near(res.monthlyPayment, want, 0.01),
    `${f2(res.monthlyPayment)} vs ${f2(want)}`);
  ok("schedule has n rows", res.schedule.length === 120);
  ok("balance retires to 0", near(res.schedule[119].closingBalance, 0, 0.01));
  ok("paid = principal + interest", near(res.totalPaid, res.totalPrincipal + res.totalInterest, 0.01));
}

/* -------------------------------------------------------------------- grace */

console.log("\n--- grace: the two new fields reproduce the two legacy ones ---");
{
  const legacyPartial = calculateLoan(loan({ grace_type_id: 2, grace_months: 12 }), 0);
  const newPartial = calculateLoan(loan({ grace_partial_months: 12 }), 0);
  ok("partial grace: new fields == legacy type 2",
    near(legacyPartial.totalPaid, newPartial.totalPaid, 0.01) &&
    near(legacyPartial.monthlyPayment, newPartial.monthlyPayment, 0.01));

  const legacyFull = calculateLoan(loan({ grace_type_id: 3, grace_months: 12 }), 0);
  const newFull = calculateLoan(loan({ grace_full_months: 12 }), 0);
  ok("full grace: new fields == legacy type 3",
    near(legacyFull.totalPaid, newFull.totalPaid, 0.01) &&
    near(legacyFull.monthlyPayment, newFull.monthlyPayment, 0.01));

  const none = calculateLoan(loan({}), 0);
  const zeroed = calculateLoan(loan({ grace_full_months: 0, grace_partial_months: 0 }), 0);
  ok("zero grace == no grace", near(none.totalPaid, zeroed.totalPaid, 0.01));
}

console.log("\n--- grace: full then partial, month by month ---");
{
  const P = 100_000, r = 0.005, gF = 6, gP = 12, n = 120;
  const res = calculateLoan(loan({ grace_full_months: gF, grace_partial_months: gP }), 0);

  // Full-grace months: nothing is paid and the balance compounds.
  const afterFull = P * Math.pow(1 + r, gF);
  ok("full-grace months pay nothing",
    res.schedule.slice(0, gF).every((s) => s.payment === 0));
  ok("balance compounds through full grace",
    near(res.schedule[gF - 1].closingBalance, afterFull, 0.01),
    `${f2(res.schedule[gF - 1].closingBalance)} vs ${f2(afterFull)}`);

  // Partial-grace months: interest only, on the balance full grace left behind.
  const interestOnly = afterFull * r;
  ok("partial-grace months pay exactly the interest",
    res.schedule.slice(gF, gF + gP).every((s) => near(s.payment, interestOnly, 0.01)),
    `expected ${f2(interestOnly)}`);
  ok("balance is flat through partial grace",
    near(res.schedule[gF + gP - 1].closingBalance, afterFull, 0.01));

  // Then it amortises the remaining term.
  const want = annuity(afterFull, r, n - gF - gP);
  ok("amortising instalment = annuity(balance after grace, n − g)",
    near(res.schedule[gF + gP].payment, want, 0.01),
    `${f2(res.schedule[gF + gP].payment)} vs ${f2(want)}`);
  ok("retires to 0 at n", near(res.schedule[n - 1].closingBalance, 0, 0.01));
  ok("paid = principal + interest", near(res.totalPaid, res.totalPrincipal + res.totalInterest, 0.01));
  ok("order is full-then-partial (first month is the free one)",
    res.schedule[0].payment === 0 && res.schedule[gF].payment > 0);
}

console.log("\n--- grace: clamped to the term, full gives way first ---");
{
  const n = 24;
  const res = calculateLoan(loan({ months: n, grace_full_months: 20, grace_partial_months: 10 }), 0);
  const paying = res.schedule.filter((s) => s.payment > 0).length;
  ok("at least one amortising month survives", paying >= 1);
  ok("schedule is still n rows", res.schedule.length === n);
  ok("retires to 0", near(res.schedule[n - 1].closingBalance, 0, 0.01));
  const free = res.schedule.filter((s) => s.payment === 0).length;
  ok("partial kept in full, full truncated", free === n - 1 - 10, `free months = ${free}`);
}

console.log("\n--- grace on קרן שווה ---");
{
  const res = calculateLoan(
    loan({ amortization_schedule_id: 2, grace_full_months: 3, grace_partial_months: 6 }),
    0
  );
  ok("first 3 months free", res.schedule.slice(0, 3).every((s) => s.payment === 0));
  ok("next 6 are interest-only", res.schedule.slice(3, 9).every((s) => s.principal === 0 && s.payment > 0));
  ok("retires to 0", near(res.schedule[119].closingBalance, 0, 0.01));
  ok("paid = principal + interest", near(res.totalPaid, res.totalPrincipal + res.totalInterest, 0.01));
}

/* ---------------------------------------------------------------------- IRR */

console.log("\n--- שת\"פ (IRR) ---");
{
  // A plain loan returns exactly its own rate. Monthly 0.5% → (1.005)^12 − 1.
  const res = calculateLoan(loan({}), 0);
  const payments = res.schedule.map((s) => s.payment);
  const m = monthlyIRR(100_000, payments)!;
  ok("monthly IRR = the loan's own monthly rate", near(m, 0.005, 1e-9), `${m}`);
  const wantAnnual = (Math.pow(1.005, 12) - 1) * 100;
  ok("annual IRR = (1+r)^12 − 1", near(annualIRR(100_000, payments)!, wantAnnual, 1e-6),
    `${f2(annualIRR(100_000, payments)!)}% vs ${f2(wantAnnual)}%`);

  // THE CHECK THE SOURCE DOCUMENT PROVIDES: a tranche the credit report quotes
  // at 4.40% nominal is printed by the same report as 4.49% מתואמת. An effective
  // IRR must reproduce that number without being told it.
  const t = calculateLoan(loan({ amount: 212_143, rate: 4.4, months: 334 }), 0);
  const irr = annualIRR(212_143, t.schedule.map((s) => s.payment))!;
  ok("4.40% nominal → 4.49% effective, as the report prints it",
    f2(irr) === 4.49, `${f2(irr)}%`);
}
{
  const res = calculateLoan(loan({ rate: 0 }), 0);
  const irr = annualIRR(100_000, res.schedule.map((s) => s.payment));
  ok("a 0% loan returns 0%", irr !== null && near(irr, 0, 1e-6), `${irr}`);
}
{
  // בלון חלקי: interest every month, the whole principal at the end. Its IRR is
  // the loan's own rate too — which is the invariant that says the balloon
  // schedule and the annuity schedule are being measured on the same footing.
  const res = calculateLoan(loan({ amortization_schedule_id: 3, rate: 4, months: 60 }), 0);
  const irr = annualIRR(100_000, res.schedule.map((s) => s.payment))!;
  const want = (Math.pow(1 + 0.04 / 12, 12) - 1) * 100;
  ok("בלון חלקי IRR = its own rate", near(irr, want, 1e-6), `${f2(irr)}% vs ${f2(want)}%`);
}
{
  // Grace does not change what the money costs — only when it is paid. An
  // interest-capitalising grace still returns the contract rate.
  const res = calculateLoan(loan({ grace_full_months: 6, grace_partial_months: 12 }), 0);
  const irr = annualIRR(100_000, res.schedule.map((s) => s.payment))!;
  const want = (Math.pow(1.005, 12) - 1) * 100;
  ok("grace does not move the IRR", near(irr, want, 1e-4), `${f2(irr)}% vs ${f2(want)}%`);
}
{
  ok("no schedule → null", annualIRR(100_000, []) === null);
  ok("no principal → null", annualIRR(0, [100, 100]) === null);
  ok("payments all zero → null", annualIRR(100_000, [0, 0, 0]) === null);
}
{
  // An indexed row is repaid in inflating shekels, so its nominal return is
  // above its contract rate — the case that makes the column worth having.
  const res = calculateLoan(loan({ path_id: 5, rate: 3 }), 2.4);
  const irr = annualIRR(100_000, res.schedule.map((s) => s.payment))!;
  const flat = (Math.pow(1 + 0.03 / 12, 12) - 1) * 100;
  ok("indexed row returns more than its nominal rate", irr > flat + 2,
    `${f2(irr)}% vs ${f2(flat)}% unindexed`);
}

/* ---------------------------------------------------------------------- NPV */

console.log("\n--- ע.נ.נ (NPV) ---");
{
  const res = calculateLoan(loan({}), 0);
  const payments = res.schedule.map((s) => s.payment);
  ok("discounting at the loan's own rate gives 0",
    near(npv(100_000, payments, 6)!, 0, 0.01), `${f2(npv(100_000, payments, 6)!)}`);
  ok("a lower discount rate makes it positive (row costs more than money)",
    npv(100_000, payments, 3)! > 0, `${f2(npv(100_000, payments, 3)!)}`);
  ok("a higher discount rate makes it negative",
    npv(100_000, payments, 9)! < 0, `${f2(npv(100_000, payments, 9)!)}`);
  ok("NPV is monotonically decreasing in the discount rate",
    npv(100_000, payments, 3)! > npv(100_000, payments, 6)! &&
    npv(100_000, payments, 6)! > npv(100_000, payments, 9)!);
  ok("no schedule → null", npv(100_000, [], 5) === null);
}
{
  // NPV at the IRR is zero by definition — the two functions agreeing is the
  // strongest single check on both of them. It has to be fed the NOMINAL
  // equivalent of the monthly IRR, because npv() de-annualises by /12 while
  // annualIRR() compounds; see the note in yield.ts on why that asymmetry is
  // deliberate. This assertion is also what pins it: change either convention
  // and this line fails.
  const res = calculateLoan(loan({ amount: 212_143, rate: 4.4, months: 334, grace_partial_months: 24 }), 0);
  const payments = res.schedule.map((s) => s.payment);
  const m = monthlyIRR(212_143, payments)!;
  const atIrr = npv(212_143, payments, m * 1200)!;
  ok("NPV(at the IRR, nominal) = 0, even with grace", near(atIrr, 0, 1), `${f2(atIrr)}`);

  // And the documented consequence, asserted so it stays true and small.
  const effective = annualIRR(212_143, payments)!;
  const gap = npv(212_143, payments, effective)!;
  ok("discounting at the EFFECTIVE IRR is close to zero but not zero",
    gap < 0 && Math.abs(gap) < 4000, `${f2(gap)} on ₪212,143`);
}

console.log(`\n${checks - failures}/${checks} checks passed`);
process.exit(failures ? 1 : 0);
