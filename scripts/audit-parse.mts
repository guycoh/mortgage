// Parser audit harness: extract the real PDF, run the parser, dump raw text +
// parsed JSON, and cross-check the parsed data against the report's own
// printed totals and internal consistency rules.
// Run: npx tsx scripts/audit-parse.mts "<pdf path>" <out-dir>
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseReport } from "../lib/credit-parser/parse";
import { buildPages, blockText } from "../lib/credit-parser/geometry";
import type { RawPage } from "../lib/credit-parser/types";

const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
try {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")
  ).href;
} catch {}

async function extract(p: string): Promise<RawPage[]> {
  const data = new Uint8Array(fs.readFileSync(p));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const pages: RawPage[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const tc = await page.getTextContent();
    const items = (tc.items as any[])
      .filter((it) => it.str !== undefined && it.str.length > 0)
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width }));
    pages.push({ page: n, items });
  }
  return pages;
}

const pdfPath = process.argv[2];
const outDir = process.argv[3] ?? ".";
fs.mkdirSync(outDir, { recursive: true });

const raw = await extract(pdfPath);
const report = parseReport(raw);

// ---- dump raw text (RTL-joined per line, with coordinates) ------------------
const pages = buildPages(raw);
let dump = "";
for (const pg of pages) {
  dump += `\n================ PAGE ${pg.page} ================\n`;
  for (const line of pg.lines) {
    const rtl = [...line.toks].sort((a, b) => b.x - a.x).map((t) => t.str).join(" | ");
    dump += `y=${line.y.toFixed(1).padStart(7)}  ${rtl}\n`;
  }
}
fs.writeFileSync(path.join(outDir, "raw-lines.txt"), dump, "utf8");
fs.writeFileSync(path.join(outDir, "parsed.json"), JSON.stringify(report, null, 2), "utf8");

// ---- helpers ----------------------------------------------------------------
const num = (v?: string) => {
  if (!v) return 0;
  const n = Number(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

let issues = 0;
const log = (s: string) => console.log(s);
const problem = (s: string) => {
  issues++;
  console.log(`  !! ${s}`);
};
const check = (name: string, ok: boolean, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) issues++;
};

// ---- 1. raw field-code census vs extracted ----------------------------------
log("\n=== 1. field-code census (codes printed in PDF vs captured) ===");
const rawCodes = new Map<string, number>();
for (const pg of raw) {
  const text = pg.items.map((i) => i.str).join(" ");
  for (const m of text.matchAll(/\((201|197|151)-(\d{3})\)/g)) {
    const c = `${m[1]}-${m[2]}`;
    rawCodes.set(c, (rawCodes.get(c) ?? 0) + 1);
  }
}
const capturedCodes = new Set<string>();
for (const t of report.transactions) for (const c of Object.keys(t.fields)) capturedCodes.add(c);
for (const e of report.execution) for (const c of Object.keys(e.fields)) capturedCodes.add(c);
for (const e of report.insolvency) for (const c of Object.keys(e.fields)) capturedCodes.add(c);
// codes handled structurally rather than as scalar fields
const STRUCTURAL = new Set([
  "201-032", "201-033", "201-034", "201-035", "201-036", "201-037", "201-038", // interest tracks
  "201-064", "201-065", "201-076", // collateral
  "201-024", "201-025", "201-026", // related corps
  "201-067", "201-068", "201-069", "201-070", // monthly grids
  "201-047", "201-017", "201-021", "201-022", "201-044", "201-002", "201-050", // enums
  "201-056", "201-057", "201-058", "201-059", "201-060", "201-061", "201-062", "201-063", // remarks
]);
const remarkCaptured = new Set(report.transactions.flatMap((t) => t.remarks));
// Codes whose value column is genuinely blank in this report (verified by hand
// against the raw dump) — "not captured" is the correct outcome for them.
const BLANK_IN_REPORT = new Set([
  "201-003", "197-013", "197-014",
  "151-005", "151-011", "151-012", "151-013", "151-014",
]);
const missing: string[] = [];
for (const [code, count] of [...rawCodes.entries()].sort()) {
  const got = capturedCodes.has(code) || STRUCTURAL.has(code);
  const blank = !got && BLANK_IN_REPORT.has(code);
  log(`  ${code}  printed x${count}  ${got ? "captured" : blank ? "blank in report" : "NOT CAPTURED"}`);
  if (!got && !blank) missing.push(code);
}
if (missing.length) problem(`codes never captured anywhere: ${missing.join(", ")}`);

// ---- 2. summary (§1) totals vs the report's own printed סה"כ ---------------
log('\n=== 2. §1 summary blocks: parsed rows vs printed סה"כ ===');
for (const g of report.summary) {
  for (const b of g.blocks) {
    const dataRows = b.rows.filter((r) => !r.isTotal);
    const totalRow = b.rows.find((r) => r.isTotal);
    if (!totalRow) {
      log(`  [${g.role}] ${b.transactionType}: ${dataRows.length} rows, no total row printed`);
      continue;
    }
    const sums = {
      limit: dataRows.reduce((s, r) => s + num(r.limit), 0),
      debt: dataRows.reduce((s, r) => s + num(r.debtBalance), 0),
      overdue: dataRows.reduce((s, r) => s + num(r.overdue), 0),
    };
    const ok =
      sums.limit === num(totalRow.limit) &&
      sums.debt === num(totalRow.debtBalance) &&
      sums.overdue === num(totalRow.overdue);
    log(
      `  [${g.role}] ${b.transactionType}: rows=${dataRows.length} sum(limit)=${sums.limit} printed=${num(totalRow.limit)} | sum(debt)=${sums.debt} printed=${num(totalRow.debtBalance)} ${ok ? "OK" : "MISMATCH"}`
    );
    if (!ok) problem(`summary block "${b.transactionType}" rows don't add up to its printed total`);
  }
}

// ---- 3. §1 summary vs parsed transactions -----------------------------------
log("\n=== 3. §1 printed totals vs §2/§3 parsed transactions ===");
const activeTxns = report.transactions.filter((t) => t.section !== "inactive");
for (const g of report.summary) {
  for (const b of g.blocks) {
    const totalRow = b.rows.find((r) => r.isTotal) ?? b.rows[b.rows.length - 1];
    if (!totalRow) continue;
    const typeKey = b.transactionType.replace(/\s/g, "");
    const match = activeTxns.filter((t) => {
      if (t.role !== g.role) return false;
      const tt = (t.fields["201-002"] ?? "").replace(/\s/g, "");
      if (typeKey.includes("עובר")) return tt.includes("עובר");
      if (typeKey.includes("מסגרת")) return tt.includes("מסגרת");
      if (typeKey.includes("משכנת") || typeKey.includes("לדיור")) return tt.includes("משכנת") || tt.includes("לדיור");
      if (typeKey.includes("הלוואה")) return tt === "הלוואה";
      return tt.includes(typeKey);
    });
    const txnDebt = match.reduce((s, t) => s + num(t.fields["201-049"]), 0);
    const printed = num(totalRow.debtBalance);
    const ok = txnDebt === printed;
    log(
      `  [${g.role}] ${b.transactionType}: txns=${match.length} sum(201-049)=${txnDebt} vs summary=${printed} ${ok ? "OK" : "MISMATCH"}`
    );
    if (!ok) problem(`transactions of type "${b.transactionType}" don't reproduce the §1 total`);
  }
}

// ---- 4. per-transaction internal consistency ---------------------------------
log("\n=== 4. per-transaction consistency ===");
const DATE = /^\d{2}\/\d{2}\/\d{4}$/;
report.transactions.forEach((t) => {
  const id = `${t.uid} ${t.source} ${t.fields["201-002"] ?? "?"}`;
  const f = t.fields;
  // dates well-formed
  for (const c of ["201-003", "201-006", "201-016", "201-018", "201-023", "201-053", "201-054", "201-055"]) {
    if (f[c] && !DATE.test(f[c])) problem(`${id}: ${c} not a date: "${f[c]}"`);
  }
  // date ordering
  const d = (c: string) => {
    if (!f[c]) return null;
    const [dd, mm, yy] = f[c].split("/").map(Number);
    return new Date(yy, mm - 1, dd).getTime();
  };
  const start = d("201-016");
  const end = d("201-018");
  if (start && end && end < start) problem(`${id}: planned end before start`);
  // money fields numeric
  for (const c of ["201-020", "201-045", "201-046", "201-048", "201-049", "201-072"]) {
    if (f[c] && !/^[\d,]+(\.\d+)?$/.test(f[c])) problem(`${id}: ${c} not money-like: "${f[c]}"`);
  }
  // balance vs original: flag only wild ratios (interest accrual can exceed a bit)
  if (num(f["201-049"]) > 0 && num(f["201-045"]) > 0 && num(f["201-049"]) > num(f["201-045"]) * 1.5)
    problem(`${id}: balance ${f["201-049"]} way above original ${f["201-045"]}`);
  // interest tracks sanity
  for (const tr of t.interestTracks) {
    const nom = parseFloat(tr.nominal);
    const eff = parseFloat(tr.effective);
    if (tr.nominal && (!Number.isFinite(nom) || nom < 0 || nom > 30))
      problem(`${id}: track ${tr.index} nominal odd: "${tr.nominal}"`);
    if (tr.effective && (!Number.isFinite(eff) || eff < 0 || eff > 35))
      problem(`${id}: track ${tr.index} effective odd: "${tr.effective}"`);
    if (Number.isFinite(nom) && Number.isFinite(eff) && eff + 0.001 < nom)
      problem(`${id}: track ${tr.index} effective ${tr.effective} < nominal ${tr.nominal}`);
  }
  // utilization vs limit/balance
  const util = t.interestTracks.reduce((s, tr) => s + num(tr.utilization), 0);
  const bal = num(f["201-049"]);
  if (util > 0 && bal > 0 && Math.abs(util - bal) / Math.max(util, bal) > 0.02)
    log(`  note ${id}: sum(track utilization)=${util} vs balance=${bal}`);
});

// ---- 4b. new structures: arrears, remarks, grids, insolvency ------------------
log("\n=== 4b. arrears / remarks / grids / insolvency ===");
for (const t of report.transactions) {
  const f = t.fields;
  const id = `${t.uid} ${t.source}`;
  if (f["201-051"]) {
    log(`  ${id}: unpaid=${f["201-051"]} range="${f["201-050"] ?? ""}" firstDefault=${f["201-052"] ?? "-"}`);
    if (!f["201-050"]) problem(`${id}: arrears amount captured but no days-range`);
  }
  if (t.remarks.length) log(`  ${id}: remarks: ${t.remarks.join(" // ")}`);
  for (const g of t.grids) {
    const cells = g.rows.reduce((s, r) => s + r.months.filter(Boolean).length, 0);
    log(`  ${id}: grid "${g.label}" rows=${g.rows.length} cells=${cells}`);
  }
}
// Cross-check: grid cell counts vs raw numeric tokens on the year rows.
// (raw 2024 direct-debit row for יהב prints 12 values — all must survive.)
const yahav = report.transactions.find((t) => t.source.includes("יהב"));
if (yahav) {
  const dd = yahav.grids.find((g) => g.label.includes("הוראות לחיוב חשבון") && !g.label.includes("לא כובדו"));
  const r2024 = dd?.rows.find((r) => r.year === "2024");
  const got = r2024 ? r2024.months.filter(Boolean).length : 0;
  check("יהב 2024 direct-debit row keeps all 12 values", got === 12, `${got}/12`);
  const dishon = yahav.grids.find((g) => g.label.includes("לא כובדו"));
  check("יהב dishonored-debits grid captured (year inherited)", !!dishon && dishon.rows.length >= 2, `${dishon?.rows.length ?? 0} rows`);
}
const arrearsGrids = report.transactions.filter((t) => t.grids.some((g) => g.label.includes("פיגורים")));
check("arrears-history grids captured on transactions in arrears", arrearsGrids.length >= 4, `${arrearsGrids.length} txns`);
check(
  "insolvency case captured with type+status",
  report.insolvency.length === 1 &&
    report.insolvency[0].fields["151-003"] === "פשיטת רגל" &&
    report.insolvency[0].fields["151-015"] === "צו כינוס" &&
    report.insolvency[0].fields["151-009"] === "468,145",
  JSON.stringify(report.insolvency[0]?.fields ?? {})
);
check(
  "execution row is clean (no cross-table junk)",
  report.execution.length === 1 &&
    Object.values(report.execution[0].fields).every((v) => v.length <= 30) &&
    report.execution[0].fields["197-007"] === "151,953",
  JSON.stringify(report.execution[0]?.fields ?? {})
);
check("inquiry summary captured (non-bank requester)", report.inquirySummary.length >= 1, JSON.stringify(report.inquirySummary));
check("self-validation produced no accuracy warnings", report.warnings.length === 0, report.warnings.join(" | "));

// ---- 5. inventory ------------------------------------------------------------
log("\n=== 5. inventory ===");
log(`  client: ${report.client.name} (${report.client.idNumber}), report date ${report.meta.reportDate}`);
log(`  transactions: ${report.transactions.length} (current=${report.transactions.filter((t) => t.section === "current").length}, active=${report.transactions.filter((t) => t.section === "active").length}, inactive=${report.transactions.filter((t) => t.section === "inactive").length})`);
report.transactions.forEach((t) =>
  log(
    `    ${t.uid}: [${t.role}] ${t.fields["201-002"] ?? "?"} · ${t.source} · id=${t.fields["201-029"] ?? "-"} · bal=${t.fields["201-049"] ?? "-"} · limit=${t.fields["201-020"] ?? "-"} · pay=${t.fields["201-046"] ?? "-"} · tracks=${t.interestTracks.length} · status="${t.fields["201-022"] ?? ""}" · purpose="${t.fields["201-017"] ?? ""}"`
  )
);
log(`  summary groups: ${report.summary.length}, indicators: ${report.nonPaymentIndicators.length}, execution: ${report.execution.length}`);
log(`  inquiries byDate=${report.inquiriesByDate.length} newCredit=${report.newCreditInquiries.length} summaryRows=${report.inquirySummary.length} admin=${report.adminActions.length}`);
if (report.warnings.length) log(`  parser warnings: ${report.warnings.join(" | ")}`);

log(`\n${issues ? `${issues} ISSUES FOUND` : "NO ISSUES"}`);
