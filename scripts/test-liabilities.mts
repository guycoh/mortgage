// Logic test for the liabilities board: categories, track labels, totals and
// spouse cross-matching. Run:  npx tsx scripts/test-liabilities.mts <parsed-report.json>
import { readFileSync } from "node:fs";
import { extractLoans } from "../lib/credit-parser/loan-mapping";
import {
  buildLiabilities,
  mergeRows,
  splitRow,
  rowTotals,
  CATEGORY_LABEL,
  type ReportSlot,
} from "../lib/credit-parser/liabilities";
import type { CreditReport } from "../lib/credit-parser/types";

const path = process.argv[2] ?? "../credit-report-viewer/src/lib/sample-report.json";
const report: CreditReport = JSON.parse(readFileSync(path, "utf8"));

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

const loans = extractLoans(report);
const slotA: ReportSlot = { id: "a", fileName: "a.pdf", report, loans };

// --- single report -----------------------------------------------------------
const single = buildLiabilities([slotA]);
console.log("\n--- single report ---");
for (const r of single.rows) {
  console.log(
    `  [${CATEGORY_LABEL[r.category]}] ${r.bank} · ${r.typeLabel} · track="${r.track}" · balance=${r.balance} · monthly=${r.monthly}`
  );
}
check("every open debt got a row", single.rows.length === loans.length, `${single.rows.length}/${loans.length}`);
check("no joint rows on a single report", single.rows.every((r) => !r.joint));
check(
  "mortgage rows carry a track label",
  single.rows.filter((r) => r.category === "mortgage").every((r) => r.track.length > 0)
);
check(
  "loan/mortgage rows carry a monthly repayment",
  single.rows.filter((r) => r.category === "loan" || r.category === "mortgage").every((r) => r.monthly !== "")
);
const t = rowTotals(single.rows);
const expectedBalance = loans.reduce((s, l) => s + l.balance, 0);
check("total balance matches the report", Math.abs(t.balance - expectedBalance) < 1, `${t.balance} vs ${expectedBalance}`);
const expectedMonthly = loans.reduce((s, l) => s + l.displayMonthly, 0);
check("total monthly matches the sum of repayments", Math.abs(t.monthly - expectedMonthly) < 1, `${t.monthly}`);

// --- spouse report: clone with a different client + drifted balances ---------
const spouse: CreditReport = JSON.parse(JSON.stringify(report));
spouse.client = { ...spouse.client, name: "בת זוג לבדיקה", idNumber: "000000018" };
// Drift every open balance by 1% (same debts seen a few days later) except one
// card, which we change beyond recognition so it must NOT match or suggest.
const oddUid = loans.find((l) => l.category === "card")!.uid;
for (const txn of spouse.transactions) {
  const bal = Number((txn.fields["201-049"] || "0").replace(/[^\d.]/g, ""));
  if (!bal) continue;
  const next = txn.uid === oddUid ? bal * 3 + 50_000 : Math.round(bal * 1.01);
  txn.fields["201-049"] = next.toLocaleString("en-US");
}
const slotB: ReportSlot = {
  id: "b",
  fileName: "b.pdf",
  report: spouse,
  loans: extractLoans(spouse),
};

const dual = buildLiabilities([slotA, slotB]);
console.log("\n--- two reports (spouse = 1% drifted clone) ---");
for (const r of dual.rows) {
  console.log(
    `  [${CATEGORY_LABEL[r.category]}] ${r.bank} · owners=${r.owners.join("+")} · joint=${r.joint} · balance=${r.balance}`
  );
}
console.log(`  suggestions: ${dual.suggestions.length}`);

// The sample has 1 loan (end date + orig amount → certain match) and 1 current
// account (identical balance + limit → joint account). The three cards must
// stay separate: two as suggestions, the mangled one silently.
check(
  "loan + joint account auto-merged",
  dual.rows.filter((r) => r.joint).length === 2,
  `${dual.rows.filter((r) => r.joint).length} joint`
);
check("merged rows disappear from the flat list", dual.rows.length === loans.length * 2 - 2, `${dual.rows.length} rows`);
check("similar cards offered as suggestions only", dual.suggestions.length === 2, `${dual.suggestions.length}`);
const dualTotals = rowTotals(dual.rows);
check(
  "joint debts counted once (dual total < naive double)",
  dualTotals.balance < expectedBalance * 2,
  `${dualTotals.balance} vs naive ${expectedBalance * 2}`
);

// --- merge / split round-trip -------------------------------------------------
const singles = dual.rows.filter((r) => !r.joint && !r.manual);
if (singles.length >= 2) {
  const [x, y] = singles;
  const merged = mergeRows(dual.rows, x.id, y.id);
  check("manual merge produces one joint row", merged.length === dual.rows.length - 1);
  const back = splitRow(merged, x.id);
  check("split restores two rows", back.length === dual.rows.length);
}

console.log(failures ? `\n${failures} FAILURES` : "\nALL PASS");
process.exit(failures ? 1 : 0);
