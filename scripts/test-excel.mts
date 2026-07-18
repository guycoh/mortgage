// Builds the /aa4test Excel export headlessly, writes it to disk and reads it
// back to assert the structure survived the round-trip.
//
//   npx tsx scripts/test-excel.mts <parsed-report.json> [out.xlsx] [--spouse]
//
// --spouse clones the report with drifted balances, exercising the joint-debt
// columns and the two-client cover exactly as a second upload would.

import { writeFileSync } from "node:fs";
import { readFileSync } from "node:fs";
import ExcelJS from "exceljs";
import { extractLoans, parseNum } from "../lib/credit-parser/loan-mapping";
import { buildLiabilities, type ReportSlot } from "../lib/credit-parser/liabilities";
import type { CreditReport } from "../lib/credit-parser/types";
import { buildLiabilitiesWorkbook, workbookFileName } from "../app/aa4test/lib/excel-build";

const args = process.argv.slice(2).filter((a) => a !== "--spouse");
const withSpouse = process.argv.includes("--spouse");
const path = args[0] ?? "../credit-report-viewer/src/lib/sample-report.json";
const out = args[1] ?? "test-export.xlsx";

const report: CreditReport = JSON.parse(readFileSync(path, "utf8"));

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

const slots: ReportSlot[] = [
  { id: "a", fileName: "a.pdf", report, loans: extractLoans(report) },
];

if (withSpouse) {
  const spouse: CreditReport = JSON.parse(JSON.stringify(report));
  spouse.client = { ...spouse.client, name: "רות חרמון", idNumber: "000000018" };
  for (const txn of spouse.transactions) {
    const bal = Number((txn.fields["201-049"] || "0").replace(/[^\d.]/g, ""));
    if (bal) txn.fields["201-049"] = Math.round(bal * 1.01).toLocaleString("en-US");
  }
  slots.push({ id: "b", fileName: "b.pdf", report: spouse, loans: extractLoans(spouse) });
}

const { rows } = buildLiabilities(slots);
console.log(
  `\nsource: ${path}\nclients: ${slots.map((s) => s.report.client.name).join(" + ")}\nliability rows: ${rows.length}\n`
);

const wb = await buildLiabilitiesWorkbook({ slots, rows });
const buffer = await wb.xlsx.writeBuffer();
writeFileSync(out, Buffer.from(buffer));
console.log(`wrote ${out} (${(buffer.byteLength / 1024).toFixed(0)} KB)`);
console.log(`download name: ${workbookFileName(slots)}\n`);

// --- read it back: whatever Excel will see, we see -------------------------
const back = new ExcelJS.Workbook();
await back.xlsx.load(buffer as ArrayBuffer);

const names = back.worksheets.map((w) => w.name);
console.log(`sheets: ${names.join(" | ")}\n`);

check("everything lands on exactly one sheet", back.worksheets.length === 1, `${back.worksheets.length} sheets`);
check("the sheet is the liabilities listing", names[0] === "פירוט התחייבויות", names[0]);
check("sheet name is Excel-legal", names.every((n) => n.length <= 31 && !/[[\]:*?/\\]/.test(n)));
check("sheet is right-to-left", back.worksheets.every((w) => w.views[0]?.rightToLeft === true));
check("gridlines are off", back.worksheets.every((w) => w.views[0]?.showGridLines === false));

// --- the listing must carry every row, grouped, with real numbers ----------
const master = back.worksheets[0];
let headerRow = 0;
master.eachRow((row, n) => {
  if (!headerRow && row.getCell(1).value === "גורם מדווח") headerRow = n;
});
check("column header found", headerRow > 0, `row ${headerRow}`);
check("auto-filter covers the listing", !!master.autoFilter, JSON.stringify(master.autoFilter));

// every populated family gets its own band and its own totals row
const cellTexts: string[] = [];
master.eachRow((row) => row.eachCell((c) => typeof c.value === "string" && cellTexts.push(c.value)));
const families = [
  ["mortgage", "משכנתאות"],
  ["loan", "הלוואות"],
  ["card", "מסגרות אשראי וכרטיסים"],
  ["overdraft", "חשבונות עובר ושב"],
  ["other", "התחייבויות נוספות"],
] as const;
for (const [cat, label] of families) {
  if (!rows.some((r) => r.category === cat)) continue;
  check(`group band for ${label}`, cellTexts.includes(label));
  check(`totals row for ${label}`, cellTexts.includes(`סה"כ ${label}`));
}
check("grand total row present", cellTexts.some((t) => /^סה"כ \d+ התחייבויות$/.test(t)));
check(
  "no group band for an empty family",
  families.every(([cat, label]) => rows.some((r) => r.category === cat) || !cellTexts.includes(label))
);

const balanceCol = (() => {
  let found = 0;
  master.getRow(headerRow).eachCell((c, n) => {
    if (String(c.value ?? "").startsWith("יתרת חוב")) found = n;
  });
  return found;
})();
check("balance column found", balanceCol > 0, `col ${balanceCol}`);

// Data rows are everything between the header and the grand total that is not a
// group band or a totals row — identified by their first cell.
const bandLabels = new Set<string>(families.map(([, l]) => l));
const dataBalances: number[] = [];
let sawGrandTotal = false;
master.eachRow((row, n) => {
  if (n <= headerRow || sawGrandTotal) return;
  const first = String(row.getCell(1).value ?? "");
  if (/^סה"כ \d+ התחייבויות$/.test(first)) {
    sawGrandTotal = true;
    return;
  }
  if (bandLabels.has(first) || first.startsWith('סה"כ')) return;
  const v = row.getCell(balanceCol).value;
  if (typeof v === "number") dataBalances.push(v);
});

check("every liability has a numeric balance", dataBalances.length === rows.filter((r) => parseNum(r.balance) > 0).length,
  `${dataBalances.length} rows`);

const expected = rows.reduce((s, r) => s + parseNum(r.balance), 0);
const got = dataBalances.reduce((s, v) => s + v, 0);
check("listed balances tie out to the board", Math.abs(got - expected) <= rows.length, `${got} vs ${expected}`);

// group totals + grand total must agree with the rows above them
const grandRow = (() => {
  let found = 0;
  master.eachRow((row, n) => {
    if (/^סה"כ \d+ התחייבויות$/.test(String(row.getCell(1).value ?? ""))) found = n;
  });
  return found;
})();
const grandBalance = master.getRow(grandRow).getCell(balanceCol).value;
check("grand total equals the sum of the rows", grandBalance === got, `${grandBalance} vs ${got}`);

let groupSum = 0;
master.eachRow((row, n) => {
  if (n <= headerRow || n >= grandRow) return;
  const first = String(row.getCell(1).value ?? "");
  if (!first.startsWith('סה"כ')) return;
  const v = row.getCell(balanceCol).value;
  if (typeof v === "number") groupSum += v;
});
check("group totals add up to the grand total", groupSum === got, `${groupSum} vs ${got}`);

// --- formats and styling actually landed -----------------------------------
const firstBalance = master.getRow(headerRow + 2).getCell(balanceCol);
check("money cells carry a thousands format", firstBalance.numFmt === "#,##0", String(firstBalance.numFmt));
const hdrCell = master.getRow(headerRow).getCell(1);
check("header band is filled", (hdrCell.fill as any)?.fgColor?.argb?.length === 8, JSON.stringify(hdrCell.fill));
check("header text is white and bold", hdrCell.font?.bold === true && hdrCell.font?.color?.argb === "FFFFFFFF");
check("panes are not frozen — the sheet scrolls as one document", master.views[0]?.state !== "frozen",
  JSON.stringify(master.views[0]));
check("column heads still repeat on printed pages", !!master.pageSetup?.printTitlesRow, master.pageSetup?.printTitlesRow);
check("letterhead is a gradient", (master.getCell(1, 1).fill as any)?.type === "gradient");
check("sheet has a tab colour", !!(master.properties as any)?.tabColor?.argb);

// nothing below the header may be merged, or the auto-filter breaks
const merges: string[] = (master.model as any).merges ?? [];
const badMerge = merges.filter((m) => {
  const rowNums = m.match(/\d+/g)?.map(Number) ?? [];
  return rowNums.some((n) => n >= headerRow && n <= grandRow);
});
check("no merged cells inside the filterable listing", badMerge.length === 0, badMerge.join(","));

// --- dates round-trip as dates, percentages as fractions -------------------
let dateCells = 0;
let pctCells = 0;
back.worksheets.forEach((w) =>
  w.eachRow((row) =>
    row.eachCell((c) => {
      if (c.value instanceof Date) dateCells++;
      if (c.numFmt === "0.00%" && typeof c.value === "number") pctCells++;
    })
  )
);
check("dates are real Excel dates", dateCells > 0, `${dateCells} cells`);
check("rates are stored as true percentages", pctCells > 0, `${pctCells} cells`);

// --- no cell holds an accidental "[object Object]" or undefined ------------
let bad = 0;
back.worksheets.forEach((w) =>
  w.eachRow((row) =>
    row.eachCell((c) => {
      const s = typeof c.value === "string" ? c.value : "";
      if (s.includes("[object") || s === "undefined" || s === "null" || s === "NaN") bad++;
    })
  )
);
check("no stringified junk in any cell", bad === 0, `${bad} bad cells`);

console.log(failures ? `\n${failures} FAILURES` : "\nALL PASS");
process.exit(failures ? 1 : 0);
