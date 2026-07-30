// Does the export still build, and do the new עוגן / תדירות שינוי columns land in
// the right cells with the right formats? Written from a real bank statement so
// the values are the ones the board actually holds.
//   npx tsx scripts/test-excel-freq.mts
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseBankStatement } from "../lib/bank-parser";
import { bankStatementToLoans } from "../lib/bank-parser/to-loans";
import { buildMixWorkbook } from "../app/aa100test/lib/excel";
import type { RawPage } from "../lib/credit-parser/types";

const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
try {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")
  ).href;
} catch {}

const PDF =
  "C:/Users/noama/OneDrive/Desktop/Credit Data System report extractor/Bank-Templates/MORTGAGE_RECYCLE_11052025_1745.pdf";

const data = new Uint8Array(fs.readFileSync(PDF));
const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
const pages: RawPage[] = [];
for (let n = 1; n <= doc.numPages; n++) {
  const pg = await doc.getPage(n);
  const tc = await pg.getTextContent();
  pages.push({
    page: n,
    items: (tc.items as any[])
      .filter((it) => it.str)
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width })),
  });
}

const st = parseBankStatement(pages);
const sum = bankStatementToLoans(st, "mix", "statement.pdf");

const wb = await buildMixWorkbook({
  mixName: "בדיקת ייצוא",
  loans: sum.loans,
  annualInflation: 2,
  clients: [{ name: st.client.name, id: st.client.idNumber, reportDate: st.statementDate }],
});

const out = path.join(process.env.TEMP ?? ".", "aa100-freq-export.xlsx");
const buf = await wb.xlsx.writeBuffer();
fs.writeFileSync(out, Buffer.from(buf));
console.log(`wrote ${out}  (${(buf as ArrayBuffer).byteLength} bytes)`);

// Read it back and prove the columns are where the code thinks they are.
const back = new (await import("exceljs")).default.Workbook();
await back.xlsx.readFile(out);
const ws = back.getWorksheet("תמהיל")!;

let headerRow = 0;
ws.eachRow((row, n) => {
  if (!headerRow && String(row.getCell(1).value ?? "") === "סוג") headerRow = n;
});
const headers: string[] = [];
ws.getRow(headerRow).eachCell({ includeEmpty: true }, (c) => headers.push(String(c.value ?? "")));
console.log(`\nheader row ${headerRow}:`);
headers.forEach((h, i) => console.log(`  col ${i + 1}: ${h}`));

const at = (name: string) => headers.indexOf(name) + 1;
const cols = {
  amount: at("יתרה (₪)"),
  rate: at("ריבית"),
  anchor: at("עוגן"),
  margin: at("מרווח"),
  freq: at("תדירות שינוי"),
  monthly: at("החזר חודשי (₪)"),
};
console.log("\nresolved columns:", cols);
let issues = 0;
for (const [k, v] of Object.entries(cols)) {
  if (v === 0) {
    console.log(`  !! column "${k}" not found in the sheet`);
    issues++;
  }
}

console.log("\ndata rows:");
for (let r = headerRow + 1; r <= ws.rowCount; r++) {
  const fam = String(ws.getCell(r, 1).value ?? "");
  if (fam !== "משכנתא" && fam !== "הלוואה") continue;
  const g = (c: number) => ws.getCell(r, c);
  const pct = (c: number) => {
    const v = g(c).value;
    return typeof v === "number" ? `${(v * 100).toFixed(2)}%` : v === null ? "—" : String(v);
  };
  console.log(
    `  ${fam}  amount=${String(g(cols.amount).value).padStart(8)} rate=${pct(cols.rate).padStart(7)} anchor=${pct(cols.anchor).padStart(7)} margin=${pct(cols.margin).padStart(7)} freq="${g(cols.freq).value ?? ""}" monthly=${g(cols.monthly).value}`
  );
  // formats: the two money columns and the two percent columns must keep theirs
  for (const [name, c] of [["עוגן", cols.anchor], ["מרווח", cols.margin], ["ריבית", cols.rate]]) {
    if (g(c).value !== null && !String(g(c).numFmt ?? "").includes("%")) {
      console.log(`     !! ${name} cell has no percent format (${g(c).numFmt})`);
      issues++;
    }
    if (g(c).value !== null && typeof g(c).value !== "number") {
      console.log(`     !! ${name} is not numeric (${typeof g(c).value})`);
      issues++;
    }
  }
  if (typeof g(cols.amount).value !== "number") {
    console.log("     !! יתרה is not a number");
    issues++;
  }
}

// the group subtotal formulas must still point at the money columns
console.log("\nsubtotal / total formulas:");
for (let r = headerRow + 1; r <= ws.rowCount; r++) {
  const a = String(ws.getCell(r, 1).value ?? "");
  if (!a.startsWith('סה"כ')) continue;
  const parts: string[] = [];
  for (const [k, c] of Object.entries({ amount: cols.amount, monthly: cols.monthly })) {
    const v = ws.getCell(r, c).value as { formula?: string; result?: number } | null;
    parts.push(`${k}=${v?.formula ?? "(none)"} → ${v?.result ?? "(none)"}`);
  }
  console.log(`  ${a}: ${parts.join("  ")}`);
  const amt = ws.getCell(r, cols.amount).value as { formula?: string } | null;
  if (!amt?.formula) {
    console.log("     !! subtotal lost its SUM formula");
    issues++;
  }
}

const expectedAmount = sum.loans.reduce((s, l) => s + (Number(l.amount) || 0), 0);
console.log(`\nboard total ₪${expectedAmount.toLocaleString("en-US")}`);
console.log(issues ? `\n${issues} ISSUES` : "\nNO ISSUES");
