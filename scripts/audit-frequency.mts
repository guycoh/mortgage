// Reset-frequency audit: every tranche of every bank template, and every
// liability of a חיווי אשראי, with the תדירות שינוי the row will carry.
// Run: npx tsx scripts/audit-frequency.mts
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseBankStatement } from "../lib/bank-parser";
import { bankStatementToLoans } from "../lib/bank-parser/to-loans";
import { parseReport } from "../lib/credit-parser/parse";
import { extractLoans } from "../lib/credit-parser/loan-mapping";
import { importReportToLoans } from "../app/aa100test/lib/credit";
import { freqLabel } from "../lib/rate-frequency";
import type { RawPage } from "../lib/credit-parser/types";

const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
try {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")
  ).href;
} catch {}

async function pagesOf(p: string): Promise<RawPage[]> {
  const data = new Uint8Array(fs.readFileSync(p));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
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
let issues = 0;

console.log("================ BANK STATEMENTS ================");
for (const f of fs.readdirSync(DIR).filter((f) => /\.pdf$/i.test(f))) {
  const st = parseBankStatement(await pagesOf(path.join(DIR, f)));
  const sum = bankStatementToLoans(st, "mix");
  console.log(`\n### ${f}  [${st.bankLabel} / ${st.template}]`);
  st.tranches.forEach((t, i) => {
    const row = sum.loans.find(
      (l) => Math.round(t.balance ?? 0) === Math.round(Number(l.amount) || 0) && (l as any).source_track === (t.rawTrack || undefined)
    );
    console.log(
      `  ${String(i + 1).padStart(2)}. ${t.loanNumber}${t.trancheNumber ? `/${t.trancheNumber}` : ""}  kind=${t.rateKind.padEnd(8)} link=${t.linkage.padEnd(8)} reset=${String(t.resetMonths ?? "-").padStart(4)} next=${(t.nextReset || "-").padEnd(10)} anchor="${t.anchor}" track="${t.rawTrack}"`
    );
    if (t.rateKind === "variable" && t.resetMonths === null && !t.nextReset) {
      console.log("      !! variable tranche with no reset interval and no next-reset date");
      issues++;
    }
    // Where the lender prints the anchor's own level, anchor + margin must
    // reproduce the rate the borrower pays. This is the one arithmetic check that
    // proves the עוגן column is reading the right cell.
    if (t.anchorRate !== null && t.anchorRate !== undefined && t.rate !== null) {
      const sum = t.anchorRate + (t.margin ?? 0);
      const gap = Math.abs(sum - t.rate);
      console.log(
        `      anchor ${t.anchorRate} + margin ${t.margin ?? 0} = ${sum.toFixed(2)} vs printed rate ${t.rate}  gap ${gap.toFixed(2)}`
      );
      if (gap > 0.02) {
        console.log("      !! anchor + margin does not reproduce the printed rate");
        issues++;
      }
    }
  });
  console.log(`  rows: ${sum.loans.length}`);
  for (const l of sum.loans) {
    console.log(
      `      amount=${String(l.amount).padStart(9)} path=${l.path_id} freq="${(l as any).change_frequency ?? ""}" interval=${String((l as any).anchor_interval ?? "-").padStart(3)} anchor="${(l as any).source_anchor ?? ""}" rate=${String(l.anchor ?? "-").padStart(5)} margin=${String(l.anchor_margin ?? "-").padStart(5)}`
    );
    // The column is months now. Blank is a valid answer — a fixed rate has no
    // reset cycle — so what must hold is that the two shapes of the field agree,
    // and that a variable tranche whose lender printed an interval kept it.
    const iv = (l as any).anchor_interval as number | null;
    const label = ((l as any).change_frequency as string) ?? "";
    if (label !== freqLabel(iv)) {
      console.log(`      !! change_frequency "${label}" does not match interval ${iv}`);
      issues++;
    }
    if (iv !== null && !(Number.isInteger(iv) && iv > 0)) {
      console.log(`      !! interval is not a positive whole number of months: ${iv}`);
      issues++;
    }
  }
}

console.log("\n\n================ CREDIT REPORTS ================");
const REPORTS = [
  "C:/Users/noama/OneDrive/Desktop/דוח ריכוז נתונים - 04-04-2025.pdf",
  "C:/Users/noama/OneDrive/Desktop/Credit Data System report extractor/דוח אשראי.pdf",
];
for (const p of REPORTS) {
  if (!fs.existsSync(p)) continue;
  const rep = parseReport(await pagesOf(p));
  const ex = extractLoans(rep);
  const sum = importReportToLoans(rep, "mix", path.basename(p));
  console.log(`\n### ${path.basename(p)}  (${rep.transactions.length} txns)`);
  for (const l of ex) {
    const tracks = rep.transactions.find((t) => t.uid === l.uid)?.interestTracks ?? [];
    console.log(
      `  ${l.uid.padEnd(11)} ${(l.type || "?").padEnd(22)} bal=${String(l.balance).padStart(9)} track="${l.trackLabel}" freq="${l.changeFrequency}" anchor="${l.anchorName}" margin=${l.anchorMargin ?? "-"}  [tracks: ${tracks.map((t) => `${t.type}|${t.anchor}|m=${t.margin}|util=${t.utilization}`).join("  ") || "none"}]`
    );
  }
  console.log("  --- rows on the board ---");
  for (const l of sum.loans) {
    console.log(
      `      ${(l.group ?? "").padEnd(9)} amount=${String(l.amount).padStart(9)} path=${l.path_id} freq="${(l as any).change_frequency ?? ""}" anchor="${(l as any).source_anchor ?? ""}" margin=${String(l.anchor_margin ?? "-")}`
    );
  }
}

console.log(`\n${issues ? `${issues} ISSUES` : "NO ISSUES"}`);
