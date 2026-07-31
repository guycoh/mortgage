// Statement-level fields for every template: who, when, which account, and what
// each tranche carries in the slots that are easy to leave null.
// Run: npx tsx scripts/audit-statement.mts [extra.pdf ...]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseBankStatement } from "../lib/bank-parser";
import type { RawPage } from "../lib/credit-parser/types";

const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
try {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")
  ).href;
} catch {}

async function pagesOf(p: string): Promise<RawPage[]> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(p)), useSystemFonts: true })
    .promise;
  const out: RawPage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const pg = await doc.getPage(n);
    const tc = await pg.getTextContent();
    out.push({
      page: n,
      items: (tc.items as any[])
        .filter((it) => it.str)
        .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width })),
    });
  }
  return out;
}

const DIR = "C:/Users/noama/OneDrive/Desktop/Credit Data System report extractor/Bank-Templates";
const files = [
  ...fs.readdirSync(DIR).filter((f) => /\.pdf$/i.test(f)).map((f) => path.join(DIR, f)),
  ...process.argv.slice(2).filter((a) => /\.pdf$/i.test(a)),
];

let issues = 0;
const bad = (m: string) => {
  console.log(`    !! ${m}`);
  issues++;
};

for (const f of files) {
  const st = parseBankStatement(await pagesOf(f));
  console.log(`\n### ${path.basename(f)}  [${st.bank}]`);
  console.log(`  date="${st.statementDate}"  account="${st.accountNumber}"`);
  console.log(
    `  client name="${st.client.name}" id="${st.client.idNumber}" address="${st.client.address}"`
  );
  if (!st.statementDate) bad("no statement date — every balance is as-of nothing");
  if (!st.accountNumber) bad("no account/file number");
  if (!st.client.name) bad("no borrower name");

  for (const l of st.loans) {
    const p = l.printed;
    console.log(
      `  printed[${l.loanNumber}] payoff=${p.payoff ?? "-"} balance=${p.balance ?? "-"} monthly=${p.monthly ?? "-"} breakFee=${p.breakFee ?? "-"} forecast=${p.forecastRate ?? "-"} opFee=${p.operationalFee ?? "-"}`
    );
    // The lender's own total against the sum of the parts. The two conventions
    // both exist and both are right: Leumi rolls the flat ₪60 into the loan's
    // "סה"כ עמלות פירעון מוקדם" while the per-משנה figures exclude it, and
    // Mizrahi and Discount keep it out of both. So the printed total must equal
    // the parts either with the flat charge or without it — anything else is a
    // misread column.
    const parts = l.tranches.reduce((s, t) => s + (t.breakFee ?? 0), 0);
    const flat = p.operationalFee ?? 0;
    if (
      p.breakFee !== null &&
      Math.abs(p.breakFee - parts) > 1 &&
      Math.abs(p.breakFee - parts - flat) > 1
    )
      bad(
        `loan break fee ${p.breakFee} matches neither the parts (${parts.toFixed(2)}) nor the parts plus the flat charge (${(parts + flat).toFixed(2)})`
      );
  }

  for (const t of st.tranches) {
    const gaps: string[] = [];
    if (t.balance === null) gaps.push("balance");
    if (t.rate === null) gaps.push("rate");
    if (!t.months) gaps.push("months");
    if (!t.endDate) gaps.push("endDate");
    if (!t.startDate) gaps.push("startDate");
    if (t.monthly === null) gaps.push("monthly");
    if (t.originalAmount === null) gaps.push("originalAmount");
    if (t.linkage === "linked" && t.baseIndex === null) gaps.push("baseIndex(linked)");
    if (t.linkage === "fx" && t.baseIndex === null) gaps.push("baseIndex(fx)");
    if (t.rateKind === "variable" && t.resetMonths === null) gaps.push("resetMonths(variable)");
    if (t.rateKind === "variable" && t.margin === null) gaps.push("margin(variable)");
    if (t.rateKind === "variable" && !t.nextReset) gaps.push("nextReset(variable)");
    console.log(
      `    ${t.uid.padEnd(24)} ${t.rateKind.padEnd(8)} ${t.linkage.padEnd(8)} ${gaps.length ? `gaps: ${gaps.join(", ")}` : "complete"}`
    );
  }
  st.warnings.forEach((w) => console.log(`    ~ ${w}`));
}

console.log(`\n${issues ? `${issues} STATEMENT-LEVEL ISSUES` : "NO STATEMENT-LEVEL ISSUES"}`);
