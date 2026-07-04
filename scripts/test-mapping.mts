// Standalone check of the loan-mapping logic against a parsed report JSON.
// Run: npx tsx scripts/test-mapping.mts <parsed-report.json>
// Reproduces the calculator's own calcPayment so we can confirm the injected
// rows actually amortize to a sensible monthly payment.

import { readFileSync } from "node:fs";
import {
  extractLoans,
  toLoanRows,
  extractMortgageBalances,
} from "../lib/credit-parser/loan-mapping.ts";
import type { CreditReport } from "../lib/credit-parser/types.ts";

const path = process.argv[2];
if (!path) throw new Error("usage: tsx test-mapping.mts <report.json>");
const report = JSON.parse(readFileSync(path, "utf8")) as CreditReport;

// ---- mirror of app/aa4/page.tsx calcPayment -------------------------------
const parse = (v: string) => Number(String(v).replace(/,/g, "") || 0);
const calcPayment = (balance: string, interest: string, months: string) => {
  const amount = parse(balance);
  const r = parseFloat(interest) / 100 / 12;
  const m = Number(months);
  if (!amount || !m || !r) return 0;
  return amount * (r / (1 - Math.pow(1 + r, -m)));
};

const loans = extractLoans(report);
console.log(`report as-of: ${report.meta.reportDate}   client: ${report.client.name}`);
console.log(`extracted ${loans.length} open debt(s):\n`);

const pad = (s: string, n: number) => s.padEnd(n);
console.log(
  pad("uid", 11) + pad("role", 9) + pad("type", 22) +
    pad("balance", 10) + pad("int%", 7) + pad("mo", 5) +
    pad("calc/mo", 10) + pad("reported/mo", 12) + pad("loan?", 7) + "default?"
);
console.log("-".repeat(103));

let assertFails = 0;
for (const l of loans) {
  const calc = Math.round(calcPayment(l.balanceStr, l.interest, l.months));
  console.log(
    pad(l.uid, 11) +
      pad(l.role === "debtor" ? "חייב" : "ערב", 9) +
      pad(l.type.slice(0, 20), 22) +
      pad(l.balanceStr, 10) +
      pad(l.interest || "—", 7) +
      pad(l.months || "—", 5) +
      pad(String(calc), 10) +
      pad(String(l.knownPayment || "—"), 12) +
      pad(l.isLoanOrMortgage ? (l.isMortgage ? "משכ׳" : "הלוו׳") : "—", 7) +
      (l.defaultInclude ? "✓" : "")
  );

  // Sanity: for an interest-bearing installment loan (rate > 0 with a term),
  // the recomputed payment must be positive and — when the report stated a
  // monthly payment — land in the right ballpark of it. (0%-interest drawn
  // balances legitimately compute to 0: the calculator's formula returns 0 when
  // the rate is 0, so we don't assert a positive payment for them.)
  const rate = parseFloat(l.interest || "0");
  if (rate > 0 && l.months && l.balance > 0) {
    if (calc <= 0) {
      console.error(`  ✗ ${l.uid}: expected positive computed payment`);
      assertFails++;
    }
    if (l.knownPayment > 0) {
      const ratio = calc / l.knownPayment;
      if (ratio < 0.6 || ratio > 1.6) {
        console.error(
          `  ⚠ ${l.uid}: computed ${calc} vs reported ${l.knownPayment} (ratio ${ratio.toFixed(2)})`
        );
      }
    }
  }
}

const defaults = loans.filter((l) => l.defaultInclude);
const rows = toLoanRows(defaults);
const totalBalance = defaults.reduce((s, l) => s + l.balance, 0);
const totalOld = rows.reduce((s, r) => s + calcPayment(r.balance, r.interest, r.months), 0);

console.log("\n— default injection into the loans table —");
console.log(`rows: ${rows.length}`);
console.log(`total balance: ${totalBalance.toLocaleString()} ₪`);
console.log(`total current monthly: ${Math.round(totalOld).toLocaleString()} ₪`);
console.log(`mortgage boxes: [${extractMortgageBalances(loans).join(", ") || "—"}]`);

// Invariants that must always hold: defaults are the client's own active loans
// & mortgages only (no revolving facilities / overdrafts / guarantees).
for (const l of defaults) {
  if (l.role !== "debtor") { console.error(`✗ default includes non-debtor ${l.uid}`); assertFails++; }
  if (l.section !== "active") { console.error(`✗ default includes non-active ${l.uid}`); assertFails++; }
  if (!l.isLoanOrMortgage) { console.error(`✗ default includes non-loan/mortgage ${l.uid} (${l.type})`); assertFails++; }
  if (l.balance <= 0) { console.error(`✗ default includes zero-balance ${l.uid}`); assertFails++; }
}
console.log(assertFails === 0 ? "\n✅ all invariants passed" : `\n❌ ${assertFails} failure(s)`);
process.exit(assertFails === 0 ? 0 : 1);
