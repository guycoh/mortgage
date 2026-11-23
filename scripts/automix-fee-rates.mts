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
import { writeFileSync } from "node:fs";
import { feeTables, FEE_SOURCES, type FeeTable } from "../app/aa107test/lib/market-boi";

// The reading itself lives in market-boi.ts (feeTables): the market route calls
// it too, and carries the newest rows in every snapshot, so the tables committed
// here are the history and the fallback, not the only source.
const { notes, ...tables } = await feeTables();
for (const n of notes) console.log(n);
const out = { builtAt: new Date().toISOString(), sources: FEE_SOURCES, ...tables };
const span = (t: FeeTable) => `${t.rows.length} rows ${t.rows[t.rows.length - 1]?.effective} … ${t.rows[0]?.effective} latest ${JSON.stringify(t.rows[0]?.rates)}`;
console.log("unlinked   ", span(tables.unlinked));
console.log("unlinkedOld", span(tables.unlinkedOld));
console.log("linked     ", span(tables.linked));
console.log("linkedOld  ", span(tables.linkedOld));
if (process.argv.includes("--write")) {
  writeFileSync("app/aa105test/lib/automix/fee-rates.json", JSON.stringify(out) + "\n");
  console.log("wrote app/aa105test/lib/automix/fee-rates.json");
}
