// The Bank of Israel's average mortgage rates for early-repayment fees, as the
// fee order (צו הבנקאות (עמלות פירעון מוקדם), התשס"ב-2002, §7(א) and the Second
// Schedule) uses them: one table per sector, a rate per bucket of REMAINING
// term, republished monthly, each row effective from a stated day.
//
//   npx tsx --tsconfig tsconfig.json scripts/automix-fee-rates.mts [--write]
//
// Sources (published at https://www.boi.org.il/information/interestrates/mortgage/):
//   https://www.boi.org.il/boi_files/Pikuah/mashfix.xls   unlinked (הריבית הממוצעת על משכנתאות במגזר השקלי הלא צמוד)
//   https://www.boi.org.il/boi_files/Pikuah/pribmash.xls  CPI-linked (הריבית הממוצעת על משכנתאות צמודות למדד)
//
// Both files carry their whole history. Unlinked: by bucket for loans given from
// 01/03/2013, a single rate before. CPI-linked: today's buckets (RESULT sheet)
// and the pre-2011 buckets (RESULT_OLD) — kept with their own bucket edges.
// The rates are EFFECTIVE annual rates (the files ship an effective→nominal
// converter); fees.ts states them the way the banks' letters do (2 decimals,
// monthly-compounded nominal at 2 decimals) and divides by 12.
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

const require = createRequire(process.cwd() + "/package.json");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require("xlsx");

const BASE = "https://www.boi.org.il/boi_files/Pikuah";
async function book(name: string) {
  const res = await fetch(`${BASE}/${name}.xls`, { headers: { "user-agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`${name} ${res.status}`);
  return XLSX.read(new Uint8Array(await res.arrayBuffer()), { type: "array" });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowsOf = (wb: any, sheet: string): unknown[][] => XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, raw: true });

/** Excel serial or "dd/mm/yyyy" → "yyyy-mm-dd". */
function day(v: unknown): string | null {
  if (typeof v === "number" && v > 20000 && v < 80000) {
    const d = new Date(Date.UTC(1899, 11, 30) + v * 86400000);
    return d.toISOString().slice(0, 10);
  }
  const m = String(v ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 10000) / 10000 : null);

/** One table: bucket upper edges in months (Infinity = open), rows newest first. */
export type FeeTable = { edges: number[]; rows: { effective: string; report: string | null; rates: number[] }[] };

function table(rows: unknown[][], edges: number[], firstBucketCol: number, lastBucketCol: number, effCol: number, repCol: number): FeeTable {
  const out: FeeTable = { edges, rows: [] };
  for (const r of rows) {
    const eff = day(r[effCol]);
    if (!eff) continue;
    // Columns run from the longest bucket (left) to the shortest (right).
    const rates: number[] = [];
    for (let c = lastBucketCol; c >= firstBucketCol; c--) rates.push(num(r[c]) ?? NaN);
    if (rates.some((x) => !Number.isFinite(x))) continue;
    out.rows.push({ effective: eff, report: day(r[repCol]), rates });
  }
  out.rows.sort((a, b) => (a.effective < b.effective ? 1 : -1));
  return out;
}

const fix = await book("mashfix");
const cpi = await book("pribmash");

// Unlinked from 03/2013: [avg, >25, 20–25, 15–20, 10–15, 5–10, 1–5, ≤1, effective, report]
const unlinked = table(rowsOf(fix, "הלוואות שניתנו מ-01.03.2013"), [12, 60, 120, 180, 240, 300, Infinity], 1, 7, 8, 9);
// Unlinked to 02/2013: [loans up to, effective, rate] — one rate, every term.
const unlinkedOld: FeeTable = { edges: [Infinity], rows: [] };
for (const r of rowsOf(fix, "הלוואות שניתנו עד-28.02.2013")) {
  const eff = day(r[1]);
  const rate = num(r[2]);
  if (eff && rate !== null) unlinkedOld.rows.push({ effective: eff, report: day(r[0]), rates: [rate] });
}
unlinkedOld.rows.sort((a, b) => (a.effective < b.effective ? 1 : -1));
// CPI-linked now: [avg, >25, 20–25, 15–20, 10–15, 5–10, ≤5, effective, report]
const linked = table(rowsOf(cpi, "RESULT"), [60, 120, 180, 240, 300, Infinity], 1, 6, 7, 8);
// CPI-linked before 08/2011: [avg, >20, 17–20, 15–17, 12–15, 5–12, ≤5, effective, report]
const linkedOld = table(rowsOf(cpi, "RESULT_OLD"), [60, 144, 180, 204, 240, Infinity], 1, 6, 7, 8);

// Both files are published together, so one report month takes effect on one
// day in both. Where they disagree and one date is out of order (later than the
// NEXT report's), it is a typo and the other file's date stands: mashfix dates
// report 31/08/2026 to 31/10/2026, after report 30/09/2026 took effect on
// 19/10/2026; pribmash dates it 15/09/2026, and the A printed on letters of
// 04/10/2026 and 18/10/2026 is that report's.
function repair(t: FeeTable, twin: FeeTable, name: string) {
  const byReport = [...t.rows].sort((a, b) => ((a.report ?? "") < (b.report ?? "") ? -1 : 1));
  byReport.forEach((r, i) => {
    const next = byReport[i + 1];
    if (!next || r.effective <= next.effective) return;
    const other = twin.rows.find((x) => x.report === r.report);
    if (!other || other.effective > next.effective) return console.warn(`${name}: report ${r.report} effective ${r.effective} is out of order and has no usable twin`);
    console.log(`${name}: report ${r.report} effective ${r.effective} → ${other.effective} (twin file)`);
    r.effective = other.effective;
  });
  t.rows.sort((a, b) => (a.effective < b.effective ? 1 : -1));
}
repair(unlinked, linked, "unlinked");
repair(linked, unlinked, "linked");

const out = {
  builtAt: new Date().toISOString(),
  sources: { unlinked: `${BASE}/mashfix.xls`, linked: `${BASE}/pribmash.xls`, page: "https://www.boi.org.il/information/interestrates/mortgage/" },
  unlinked,
  unlinkedOld,
  linked,
  linkedOld,
};
const span = (t: FeeTable) => `${t.rows.length} rows ${t.rows[t.rows.length - 1]?.effective} … ${t.rows[0]?.effective} latest ${JSON.stringify(t.rows[0]?.rates)}`;
console.log("unlinked   ", span(unlinked));
console.log("unlinkedOld", span(unlinkedOld));
console.log("linked     ", span(linked));
console.log("linkedOld  ", span(linkedOld));
if (process.argv.includes("--write")) {
  writeFileSync("app/aa105test/lib/automix/fee-rates.json", JSON.stringify(out) + "\n");
  console.log("wrote app/aa105test/lib/automix/fee-rates.json");
}
