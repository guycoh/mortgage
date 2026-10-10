// Parity check: the forecast engine against SmartNPV, on a real client board.
//
//   npx tsx --tsconfig tsconfig.json scripts/check-forecast.ts
//
// The fixture holds SmartNPV's 01/10/26 forecast vectors and the BoI zero
// points for 2026-09. The expectations below were READ OFF SmartNPV's own
// schedules for the client (שני בדוסה, Mizrahi-Tefahot, balance date 08/10/26):
// the rate at every reset, payments at sample months, and each tranche's total.
// They are not derived from our engine, so a regression cannot agree with
// itself here.

import fs from "node:fs";
import path from "node:path";
import { priceLoan, mixFullTotals, ratePath, type Econ } from "../app/aa102test/lib/price";
import { bondAnchor, fitForecast, type Forecast } from "../app/aa102test/lib/forecast";
import type { Loan } from "../app/private/crm/leads/simulators/components/calculate/loanCalculators";
import { buildMixLine } from "../app/aa102test/lib/timeline";
import type { ImportedLoan } from "../app/aa102test/lib/credit";

const fx = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/snpv-forecast-2026-10-01.json"), "utf8")
) as {
  nominal: number[];
  inflation: number[];
  boi_2026_09: { nominal: [number, number][]; real: [number, number][] };
};

const smart: Forecast = { asOf: "2026-09", source: "override", label: "SmartNPV 01/10/26", nominal: fx.nominal, inflation: fx.inflation };
const econ: Econ = { inflation: 2, forecast: smart };

let fails = 0;
const ok = (cond: boolean, msg: string) => {
  console.log(`${cond ? "  ok " : "FAIL "} ${msg}`);
  if (!cond) fails++;
};
const near = (a: number, b: number, tol: number, msg: string) =>
  ok(Math.abs(a - b) <= tol, `${msg}: ${a.toFixed(2)} vs ${b.toFixed(2)} (±${tol})`);

const row = (o: Partial<Loan> & Record<string, unknown>): Loan =>
  ({ id: String(Math.random()), mix_id: "m", amortization_schedule_id: 1, ...o }) as Loan;

// Next reset as a date ~52 calendar months ahead of today, so `s` = 52 as on
// SmartNPV's board (08/10/26 → 01/02/31). Built relative to today so the check
// does not rot.
const t = new Date();
const reset = new Date(t.getFullYear(), t.getMonth() + 52, 1);
const resetIso = `${reset.getFullYear()}-${String(reset.getMonth() + 1).padStart(2, "0")}-01`;

const mz = row({ path_id: 5, amount: 373970, months: 293, rate: 5.26, anchor: 1.76, anchor_margin: 3.5, anchor_interval: 60, next_reset: resetIso });
const prime = row({ path_id: 1, amount: 319561, months: 293, rate: 4.45, anchor_margin: -0.3 });
const kz1 = row({ path_id: 3, amount: 187704, months: 233, rate: 2.4 });
const kz2 = row({ path_id: 3, amount: 169241, months: 233, rate: 2.2 });
const mlz = row({ path_id: 4, amount: 373970, months: 288, rate: 4.72, anchor: 3.42, anchor_margin: 1.3, anchor_interval: 24 });

console.log("\nRATE PATHS (SmartNPV's schedule, 2 decimals)");
const mlzRates = ratePath(mlz as never, smart, 288);
const want24: Record<number, number> = { 1: 4.72, 25: 5.12, 49: 5.47, 73: 5.72, 97: 5.89, 121: 6.0, 145: 6.07, 169: 6.11, 193: 6.13, 217: 6.14, 241: 6.15, 265: 6.16 };
for (const [m, r] of Object.entries(want24)) near(mlzRates[+m - 1], r, 0.005, `מל"צ ×24 month ${m}`);
ok(mlzRates[23] === 4.72 && mlzRates[47] === mlzRates[24], "מל\"צ holds between resets");
const mzRates = ratePath(mz as never, smart, 293);
const want60: Record<number, number> = { 52: 5.26, 53: 5.81, 113: 6.15, 173: 6.26, 233: 6.3 };
for (const [m, r] of Object.entries(want60)) near(mzRates[+m - 1], r, 0.005, `מ"צ ×60 month ${m}`);
const primeRates = ratePath(prime as never, smart, 293);
near(primeRates[0], 4.44, 0.005, "prime month 1");
near(primeRates[1], 4.45, 0.005, "prime month 2");
near(primeRates[119], fx.nominal[119] + 1.2, 1e-9, "prime month 120 = curve + 1.5 − 0.3");

// The Mizrahi letter's own figures for the same tranche: anchor 3.46 + margin
// 1.8. 3.46 is nowhere near the curve's real 5y anchor (~1.78), so today's
// spread is measured from the curve and the 2031 reset lands where SmartNPV's
// (1.76 + 3.5) does, within the 0.02 the two "todays" differ by.
const mzLetter = row({ path_id: 5, amount: 373970, months: 293, rate: 5.26, anchor: 3.46, anchor_margin: 1.8, anchor_interval: 60, next_reset: resetIso });
near(ratePath(mzLetter as never, smart, 293)[52], 5.81, 0.03, 'מ"צ from the bank letter (3.46 + 1.8) month 53 — spread kept');

console.log("\nTRANCHE TOTALS (Σ payments; SmartNPV prints whole shekels)");
const tot = (l: Loan) => priceLoan(l, econ).totalPaid;
near(tot(mz), 902303, 902303 * 0.0005, 'מ"צ 373,970 · 293m');
near(tot(prime), 582953, 582953 * 0.0005, "פריים 319,561 · 293m");
near(tot(kz1), 285760, 285760 * 0.0005, 'ק"צ 187,704 · 233m');
near(tot(kz2), 253049, 253049 * 0.0005, 'ק"צ 169,241 · 233m');
near(tot(mlz), 682097, 682097 * 0.0005, 'מל"צ 373,970 · 288m');

console.log("\nSAMPLE PAYMENTS");
const pay = (l: Loan, m: number) => priceLoan(l, econ).schedule[m - 1].payment;
const samples: [Loan, string, Record<number, number>][] = [
  [mz, 'מ"צ', { 1: 2272, 53: 2578, 120: 2947, 288: 3916 }],
  [prime, "פריים", { 1: 1788, 60: 1945, 200: 2034 }],
  [kz1, 'ק"צ 2.4', { 1: 1010, 120: 1225, 233: 1477 }],
  [mlz, 'מל"צ', { 1: 2172, 25: 2252, 120: 2390, 288: 2422 }],
];
for (const [l, name, pts] of samples) for (const [m, p] of Object.entries(pts)) near(pay(l, +m), p, 2.5, `${name} month ${m}`);

console.log("\nMIXES");
const existing = mixFullTotals([mz, prime, kz1, kz2], econ);
const proposal = mixFullTotals([mlz, prime, kz1, kz2], econ);
near(existing.totalPayment, 2024064.42, 2024064 * 0.0005, "קיימת total paid");
near(proposal.totalPayment, 1803858.58, 1803858 * 0.0005, "מוצעת total paid");
near(existing.totalPayment - existing.originalLoanAmount, 973588, 1000, "קיימת interest+indexation");
near(proposal.totalPayment - proposal.originalLoanAmount, 753383, 1000, "מוצעת interest+indexation");
near(
  existing.totalPayment - proposal.totalPayment,
  220205,
  1000,
  "חיסכון באחוזים base (the ₪220,205 SmartNPV's השוואה shows)"
);

console.log("\nCHART SERIES (SmartNPV's graph data)");
const lx = buildMixLine([mz, prime, kz1, kz2] as ImportedLoan[], econ)!;
const lp = buildMixLine([mlz, prime, kz1, kz2] as ImportedLoan[], econ)!;
near(lx.yearCost[0], 54493.73, 60, "קיימת year-1 interest+linkage (תרשים חסכון input)");
near(lp.yearCost[0], 45923.84, 60, "מוצעת year-1 interest+linkage");
near(
  lx.yearCost.reduce((a, b) => a + b, 0) - lp.yearCost.reduce((a, b) => a + b, 0),
  220205,
  1000,
  "Σ yearly saving = חסכון מצטבר end"
);
near(lp.rate[0][1], 4.45758, 0.01, "מוצעת ריבית ממוצעת month 1");

console.log("\nBoI REBUILD vs SmartNPV's curves");
const boi = fitForecast(fx.boi_2026_09.nominal, fx.boi_2026_09.real);
const rebuilt: Forecast = { asOf: "2026-09", source: "boi", label: "BoI 09/2026", ...boi };
let dI = 0;
let dF = 0;
for (let i = 0; i < 360; i++) {
  dI = Math.max(dI, Math.abs(boi.nominal[i] - fx.nominal[i]));
  dF = Math.max(dF, Math.abs(boi.inflation[i] - fx.inflation[i]));
}
ok(dI < 0.06, `nominal curve within 0.06% everywhere (max ${dI.toFixed(3)})`);
ok(dF < 0.04, `inflation curve within 0.04% everywhere (max ${dF.toFixed(3)})`);
let dA = 0;
for (let s = 0; s <= 300; s += 12) {
  dA = Math.max(dA, Math.abs(bondAnchor(rebuilt, s, 24, false) - bondAnchor(smart, s, 24, false)));
  dA = Math.max(dA, Math.abs(bondAnchor(rebuilt, s, 60, true) - bondAnchor(smart, s, 60, true)));
}
ok(dA < 0.035, `every 2y nominal / 5y real forward anchor within 0.035% (max ${dA.toFixed(3)})`);
const e2: Econ = { inflation: 2, forecast: rebuilt };
const p2 = mixFullTotals([mlz, prime, kz1, kz2], e2).totalPayment;
const x2 = mixFullTotals([mz, prime, kz1, kz2], e2).totalPayment;
ok(Math.abs(p2 / 1803858.58 - 1) < 0.005, `מוצעת on the rebuilt curves within 0.5% of SmartNPV (${p2.toFixed(0)})`);
ok(Math.abs(x2 / 2024064.42 - 1) < 0.005, `קיימת on the rebuilt curves within 0.5% of SmartNPV (${x2.toFixed(0)})`);
ok(Math.abs(boi.inflation[359] - 2) < 0.01, "inflation converges to the 2% target");

console.log("\nFLAT MODE UNCHANGED");
const flat = priceLoan(kz1, 2);
ok(flat.rates.every((r) => r === 2.4), "flat: rate as typed throughout");

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
