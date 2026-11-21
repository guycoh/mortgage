// Parity check: an existing bond-anchored tranche is reset on the margin the
// bank really charges — read against the market of the month its rate was
// fixed, with a lender's built-in margin (Mizrahi's "תוספת מיכונית") settled
// from the letter's own projection.
//
//   npx tsx --tsconfig tsconfig.json scripts/check-builtin.ts
//
// The board's figures are checked against SmartNPV's טבלה משווה for a real
// Mizrahi-Tefahot payoff letter dated 10/11/2026, column קיימת (their שכפול
// משכנתה נוכחית with הפרשי היוון folded in), priced on SmartNPV's default
// forecast as its board served it on 21/11/2026 (fixtures/snpv-forecast-2026-11-21.json,
// which also carries the BoI zero-yield history). The expectations are READ OFF
// SmartNPV's screen, not derived from our engine. The clock is frozen at
// 21/11/2026 because a tranche's months-to-reset are counted from today.
//
// Before this check existed the board showed ריבית והצמדה ₪682,578 against
// SmartNPV's ₪701,139: the two 2013 tranches print anchor 1.76 + margin 1.00,
// the engine compared 1.76 with TODAY's curve (1.9, "close enough") and reset
// them on 1.00 — while the rate was fixed in May 2023 against a market anchor
// of 1.13, and the bank (and SmartNPV) reset them on 1.70.

import fs from "node:fs";
import path from "node:path";
import { anchorReading, priceLoan, lastResetYm } from "../app/aa102test/lib/price";
import { marketAnchorAt, type Forecast } from "../app/aa102test/lib/forecast";
import { settleBuiltIns } from "../app/aa102test/lib/builtin";
import { foldMasterRow, type ImportedLoan } from "../app/aa102test/lib/credit";
import { mixFigures } from "../app/aa102test/lib/compare-metrics";
import { annualIRR } from "../app/aa102test/lib/yield";


// Imports read no clock; every "today" in the engine is taken at call time,
// so freezing Date here, after them, freezes it for every figure below.
const FROZEN = new Date(2026, 10, 21, 12).getTime();
const RealDate = Date;
class FrozenDate extends RealDate {
  constructor(...args: unknown[]) {
    if (args.length === 0) super(FROZEN);
    else super(...(args as [number]));
  }
  static now() {
    return FROZEN;
  }
}
globalThis.Date = FrozenDate as DateConstructor;

const fx = JSON.parse(fs.readFileSync(path.join(__dirname, "fixtures/snpv-forecast-2026-11-21.json"), "utf8"));
const smart: Forecast = { asOf: "2026-11", source: "override", label: "SmartNPV 21/11/26", nominal: fx.nominal, inflation: fx.inflation, history: fx.history };
const noHistory: Forecast = { ...smart, history: undefined };

let fails = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? "  ok " : "FAIL "} ${msg}`);
  if (!cond) fails++;
};
const near = (a: number, b: number, tol: number, msg: string) =>
  ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(3)} vs ${b.toFixed(3)} (±${tol})`);

const row = (o: Record<string, unknown>) =>
  ({ id: String(Math.random()), mix_id: "m", amortization_schedule_id: 1, grace_type_id: 1, grace_months: 0, group: "mortgage", ...o }) as unknown as ImportedLoan;

// The letter's five tranches as the import reads them (lib/bank-parser/to-loans).
const letter = [
  row({ path_id: 3, amount: 342881, indexation: 12846, prepayment_fee: 8965, rate: 5.6, months: 206, source_monthly: 2594.38, source_monthly_basis: "342881|5.6|206|1|0|0", source_forecast_rate: 7.83 }),
  row({ path_id: 5, amount: 239969, indexation: 42243, prepayment_fee: 0, rate: 2.76, months: 199, anchor: 1.76, anchor_margin: 1, anchor_interval: 60, next_reset: "2028-05-10", source_start_date: "24/05/2013", source_monthly: 1504.17, source_monthly_basis: "239969|2.76|199|1|0|0", source_forecast_rate: 5.98 }),
  row({ path_id: 5, amount: 215633, indexation: 7383, prepayment_fee: 0, rate: 5.85, months: 217, anchor: 1.95, anchor_margin: 3.9, anchor_interval: 60, next_reset: "2029-12-10", source_start_date: "01/12/2024", source_monthly: 1612.5, source_monthly_basis: "215633|5.85|217|1|0|0", source_forecast_rate: 8.53 }),
  row({ path_id: 1, amount: 55978, indexation: 0, prepayment_fee: 0, rate: 3.95, months: 199, anchor: 4.75, anchor_margin: -0.8, anchor_interval: 1, source_start_date: "11/06/2013", source_monthly: 386.02, source_monthly_basis: "55978|3.95|199|1|0|0", source_forecast_rate: 5.03 }),
  row({ path_id: 5, amount: 12416, indexation: 2180, prepayment_fee: 0, rate: 2.8, months: 199, anchor: 1.8, anchor_margin: 1, anchor_interval: 60, next_reset: "2028-06-10", source_start_date: "11/06/2013", source_monthly: 78.07, source_monthly_basis: "12416|2.8|199|1|0|0", source_forecast_rate: 5.98 }),
];

console.log("\nTHE MARKET WHEN THE RATE WAS FIXED");
ok(lastResetYm(letter[1] as never, 60) === "2023-05", `2013 tranche last fixed ${lastResetYm(letter[1] as never, 60)} (reset 10/05/2023)`);
near(marketAnchorAt(smart, "2023-05", 60, true)!, 1.129, 0.005, "BoI 5y CPI-linked zero, Apr–May 2023");
near(anchorReading(letter[1], smart)!.builtIn, 0.63, 0.01, "history reads 1.76 as 0.63 above that market");
near(anchorReading(letter[2], smart)!.builtIn, 0, 1e-9, "the 2024 tranche's 1.95 IS the market's (no built-in)");

console.log("\nSETTLED FROM THE LETTER'S OWN PROJECTION (SmartNPV: תוספת מיכונית 0.7%, סך התוספת 1.7%)");
const settled = settleBuiltIns(letter, smart);
ok(settled[1].built_in_margin === 0.7, `2013 tranche A built-in ${settled[1].built_in_margin}`);
ok(settled[4].built_in_margin === 0.7, `2013 tranche B built-in ${settled[4].built_in_margin}`);
ok(settled[2].built_in_margin === undefined, "2024 tranche: none");
ok(settled[0].built_in_margin === undefined && settled[3].built_in_margin === undefined, "fixed and prime rows: not bond tracks, untouched");
near(anchorReading(settled[1], smart)!.margin, 1.7, 1e-9, "reset margin A");
near(anchorReading(settled[4], smart)!.margin, 1.7, 1e-9, "reset margin B");
ok(settleBuiltIns(letter, noHistory)[1].built_in_margin === undefined, "no history → nothing settled (the engine could not honour it)");

console.log("\nSmartNPV's קיימת = שכפול משכנתה נוכחית עם הפרשי היוון");
const copy = settled.map((l) => foldMasterRow(l, true, "copy"));
const econ = { inflation: 2, forecast: smart };
const irr = (l: ImportedLoan) => annualIRR(Number(l.amount), priceLoan(l, econ).schedule.map((r) => r.payment))!;
const smartRows: [number, number, number][] = [
  // [row, SmartNPV שת"פ, SmartNPV החזר לשקל]
  [3, 5.02, 1.47],
  [1, 5.98, 1.61],
  [4, 5.98, 1.61],
  [0, 7.81, 1.85],
  [2, 8.54, 2.02],
];
for (const [i, want, ps] of smartRows) {
  near(irr(copy[i]), want, 0.006, `tranche ${i} שת"פ`);
  const p = priceLoan(copy[i], econ);
  near(p.totalPaid / Number(copy[i].amount), ps, 0.006, `tranche ${i} החזר לשקל`);
}
const X = mixFigures(copy, econ, 4)!;
near(X.cost, 701139, 701139 * 0.0002, "תשלומי ריבית והצמדה");
near(X.totalPaid, 1576976, 1576976 * 0.0002, "עלות כוללת");
near(X.irr!, 7.33, 0.005, 'שת"פ');
near(X.npv, 215720, 150, "ע.נ.נ");
near(X.peak, 8913, 3, "החזר בשיא");
ok(X.peakYear === 17, `החזר בשיא in year ${X.peakYear} (SmartNPV: 17)`);
near(X.perShekel, 1.8, 0.005, "החזר לשקל");
near(X.firstTyped, 6241, 1, "החזר ראשון (today's money, as SmartNPV quotes it)");
near(X.months / 12, 18.1, 0.05, "תקופת ההלוואה");
// KNOWN DIFFERENCE: SmartNPV truncates every component when it duplicates
// (parseInt on קרן, הצמדה, ריבית נדחית, הפרשי היוון); we round the balance.
near(X.principal, 875837, 10, "סכום הלוואה (SmartNPV floors each part)");
// KNOWN DIFFERENCE: SmartNPV's מרווח שוק is "updated daily from government-bond
// trading data" — not the Z-spread over the forecast curve we compute.
console.log(`  info מרווח מעל אג"ח ${X.spread!.toFixed(2)} (SmartNPV מרווח שוק 3.65 — live bond data)`);

console.log("\nWHAT THE BOARD SHOWED BEFORE (no history, today's curve as the yardstick)");
const before = mixFigures(letter.map((l) => foldMasterRow(l, true, "copy")), { inflation: 2, forecast: noHistory }, 4)!;
// On this curve; on the board's own BoI curve the same reading was the ₪682,578
// the owner saw against SmartNPV's ₪701,139.
near(before.cost, 683409, 5, "ריבית והצמדה, old reading (1.00 margin on the 2013 tranches)");

console.log("\nTHE MASTER (the debt itself: the letter's printed charges)");
const M = mixFigures(settled, econ, 4)!;
ok(Math.round(M.firstTyped) === 6175, `החזר ראשון = Σ printed charges ${Math.round(M.firstTyped)} (386.02 + 1,504.17 + 78.07 + 2,594.38 + 1,612.50)`);

console.log("\nEVERY OTHER KIND OF ROW");
// A rate fixed in a year of negative real yields keeps its printed margin. The
// old yardstick (today's curve, ~1.9) priced this −1.08 + 3.05 tranche on 0.07.
const neg = row({ path_id: 5, amount: 200000, months: 240, rate: 1.97, anchor: -1.08, anchor_margin: 3.05, anchor_interval: 60, next_reset: "2026-02-15", source_start_date: "08/02/2021" });
ok(lastResetYm(neg as never, 60) === "2021-02", `a letter's printed rate is dated by its own next reset (${lastResetYm(neg as never, 60)})`);
near(anchorReading(neg, smart)!.margin, 3.05, 1e-9, "2021 CPI-linked −1.08 + 3.05: margin 3.05");
// The Mizrahi letter behind check-forecast's fixture: 3.46 + 1.8, fixed 02/2026.
const mz = row({ path_id: 5, amount: 373970, months: 293, rate: 5.26, anchor: 3.46, anchor_margin: 1.8, anchor_interval: 60, next_reset: "2031-02-01" });
near(anchorReading(mz, smart)!.margin, 3.5, 0.03, "Mizrahi 3.46 + 1.8 (2026): SmartNPV resets on 3.5");
// A credit report's anchor below the market of the month we date it to is an
// older reading — the printed margin stands, never a negative "built-in".
const bdi = row({ path_id: 4, amount: 300000, months: 240, rate: 4.4, anchor: 3.5, anchor_margin: 0.9, anchor_interval: 60, source_start_date: "15/06/2019" });
near(anchorReading(bdi, smart)!.margin, 0.9, 1e-9, "report row 3.5 + 0.9 under a 4.5 market: margin 0.9");
// עדכון עוגנים writes today's anchor: measured against today's curve.
const refreshed = row({ path_id: 5, amount: 200000, months: 199, rate: 2.86, anchor: 1.86, anchor_margin: 1, anchor_interval: 60, next_reset: "2028-05-10", anchor_asof: "2026-11-01" });
near(anchorReading(refreshed, smart)!.margin, 1, 1e-9, "a refreshed anchor is today's: margin 1.00");
// A new proposal track: no calendar, fixed now.
const fresh = row({ path_id: 4, amount: 300000, months: 300, rate: 5.2, anchor: 3.7, anchor_margin: 1.5, anchor_interval: 60 });
ok(lastResetYm(fresh as never, 60) === null, "a new track is fixed now");
near(anchorReading(fresh, smart)!.margin, 1.5, 1e-9, "new מל\"צ 3.70 + 1.50 (curve ~3.9): margin 1.50");
// Without the history the engine is what it was: today's curve decides.
near(anchorReading(letter[1], noHistory)!.margin, 1.0, 1e-9, "no history: today's curve (the old reading)");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
