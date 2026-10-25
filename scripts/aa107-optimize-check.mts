// /aa107test optimizer — numbers, constraints and a brute-force optimality check.
//   npx tsx --tsconfig tsconfig.json scripts/aa107-optimize-check.mts
import snapshot from "../app/aa107test/lib/market-snapshot.json" with { type: "json" };
import { latestCurve } from "../app/aa107test/lib/market-boi";
import { newRate, TRACKS, TRACK_SHORT, type MarketSnapshot } from "../app/aa107test/lib/market";
import { run, DEFAULT_SETTINGS, candidates, debtsOf, type Settings } from "../app/aa107test/lib/optimize";
import type { ImportedLoan } from "../app/aa102test/lib/credit";

const m = snapshot as unknown as MarketSnapshot;
const f = await latestCurve();
const econ = { inflation: 2, forecast: { ...f, label: `בנק ישראל · ${f.asOf}` } };
const opt = { bank: "system" as const, discount: 0 };

console.log(`curve ${f.asOf}; BoI ${m.boi.rate} prime ${m.boi.prime}`);
console.log("rate table (housing, system):");
for (const t of TRACKS) {
  const cells = [5, 10, 15, 20, 25, 30].map((y) => newRate(m, f, t, y * 12, "housing", opt).rate.toFixed(2));
  console.log(`  ${TRACK_SHORT[t].padEnd(6)} ${cells.join("  ")}`);
}
console.log("published avg:", m.housing.avg);

let id = 0;
const row = (p: Partial<ImportedLoan>): ImportedLoan =>
  ({ id: `d${++id}`, mix_id: "m", path_id: 1, amount: 0, rate: 0, months: 0, amortization_schedule_id: 1, grace_type_id: 1, grace_months: 0, group: "mortgage", ...p }) as ImportedLoan;

// A realistic household: a 2020 mortgage with a cheap ק"צ, a dear 2023 קל"צ, prime and מ"צ, plus consumer loans.
const master: ImportedLoan[] = [
  row({ path_id: 1, amount: 400_000, rate: 4.25, months: 300, source_bank: "מזרחי טפחות", anchor_margin: -0.5 }),
  row({ path_id: 3, amount: 300_000, rate: 2.2, months: 240, source_bank: "מזרחי טפחות", source_start_date: "01/03/2020" }),
  row({ path_id: 2, amount: 350_000, rate: 5.9, months: 300, source_bank: "מזרחי טפחות", source_start_date: "01/06/2023" }),
  row({ path_id: 5, amount: 200_000, rate: 3.4, months: 264, source_bank: "מזרחי טפחות", anchor_interval: 60, source_start_date: "01/01/2022" }),
  row({ path_id: 1, amount: 98_000, rate: 7.1, months: 72, group: "loan", source_bank: "לאומי" }),
  row({ path_id: 1, amount: 52_000, rate: 10.15, months: 46, group: "loan", source_bank: "מקס" }),
  row({ path_id: 1, amount: 50_000, rate: 11.5, months: 93, group: "loan", source_bank: "מקס" }),
];

const fmt = (x: number) => Math.round(x).toLocaleString("en-US");
const show = (label: string, s: Settings) => {
  const r = run(master, econ, m, s);
  console.log(`
=== ${label}  (${r.ms.toFixed(0)}ms, ${r.candidates} candidates) ok=${r.ok} pass=${r.plan.pass} ${r.plan.reason ?? ""} ${r.reason ?? ""}`);
  if (!r.ok) return r;
  const sc = (t: typeof r.totals) => t.scen.map((x) => fmt(x.pv)).join("/");
  console.log("baseline : pay", fmt(r.baseline.firstPayment), "| total", fmt(r.baseline.total), "| pv", fmt(r.baseline.pv), "| months", r.baseline.months, "| scen pv", sc(r.baseline));
  console.log("optimized: pay", fmt(r.totals.firstPayment), "| total", fmt(r.totals.total), "| pv", fmt(r.totals.pv), "| months", r.totals.months, "| scen pv", sc(r.totals));
  for (const d of r.debts) if (r.plan.refinance[d.id] < 1) console.log(`  keep ${d.label.padEnd(18)} ${fmt(d.balance).padStart(9)} @${d.rate}% → keep ${((1 - r.plan.refinance[d.id]) * 100).toFixed(0)}%`);
  for (const t of r.plan.tranches) console.log(`  new ${TRACK_SHORT[t.track].padEnd(5)} ${t.segment.padEnd(10)} ${String(t.years).padStart(2)}y ${fmt(t.amount).padStart(9)} @${t.rate.toFixed(2)}%`);
  for (const c of r.checks) console.log(`  check ${c.ok ? "✓" : "✗"} ${c.label}: ${c.value}`);
  console.log("  frontier", r.frontier.map((p) => `${fmt(p.pay)}→${fmt(p.cost)}${p.chosen ? "*" : ""}`).join("  "));
  return r;
};

// Parity: with every shock at 0, each scenario must reproduce the engine's own base numbers.
{
  const s0: Settings = { ...DEFAULT_SETTINGS, shockScale: 0 };
  const { debts } = debtsOf(master, econ, econ, m, s0);
  const cands = candidates(m, econ, econ, s0, ["housing"], 30).filter((c) => c.years % 5 === 0);
  let worst = 0;
  for (const c of [...cands.map((c) => c.coef), ...debts.map((d) => d.coef)])
    for (let k = 1; k < c.pv.length; k++) worst = Math.max(worst, Math.abs(c.pv[k] - c.pv[0]) / c.pv[0], Math.abs(c.total[k] - c.total[0]) / c.total[0]);
  console.log(`
parity (zero shocks vs engine): max relative diff ${worst.toExponential(2)} → ${worst < 1e-6 ? "OK" : "MISMATCH"}`);
}

const base = run(master, econ, m, DEFAULT_SETTINGS);
const capNow = Math.round(base.baseline.firstPayment);
for (const risk of [0, 0.35, 1]) show(`PV, payment ≤ today, risk ${risk}`, { ...DEFAULT_SETTINGS, paymentCap: capNow, risk });
for (const outlook of ["flat", "blend"] as const) for (const risk of [0, 0.35]) show(`PV, cap today, outlook ${outlook}, risk ${risk}`, { ...DEFAULT_SETTINGS, paymentCap: capNow, outlook, risk });
show("lowest payment", { ...DEFAULT_SETTINGS, objective: "payment" });
show("total paid, cap today, no consolidation", { ...DEFAULT_SETTINGS, objective: "total", paymentCap: capNow, consolidate: false });
show("PV, cap today, Discount bank", { ...DEFAULT_SETTINGS, paymentCap: capNow, bank: "Discount" });
show("PV, cap today, income 30k + value 2.4M + age 52", { ...DEFAULT_SETTINGS, paymentCap: capNow, income: 30000, propertyValue: 2_400_000, age: 52 });
show("infeasible: cap 5,000", { ...DEFAULT_SETTINGS, paymentCap: 5000 });

// Brute force on a reduced problem: everything refinanced into klz/prime, 4 terms, 1% grid, risk 0.
const s: Settings = { ...DEFAULT_SETTINGS, allowKeep: false, consolidate: false, risk: 0, tracks: { prime: true, klz: true, kz: false, mlz: false, mz: false }, minYears: 15, maxYears: 30, minTrack: 0, paymentCap: null };
const small = master.filter((r) => r.group === "mortgage");
const { debts } = debtsOf(small, econ, econ, m, s);
const cands = candidates(m, econ, econ, s, ["housing"], 30);
const need = debts.reduce((a, d) => a + d.balance + d.fee, 0);
const E = (c: (typeof cands)[number]) => c.coef.pv.reduce((a, x, i) => a + x * [0.4, 0.15, 0.15, 0.15, 0.15][i], 0);
let best = Infinity;
for (const a of cands) for (const b of cands) {
  if (a.track !== "klz" || b.track !== "prime") continue;
  for (let k = 34; k <= 100; k++) {
    const fx = k / 100;
    best = Math.min(best, need * (fx * E(a) + (1 - fx) * E(b)));
  }
}
const r = run(small, econ, m, s);
console.log(`
brute force (all term pairs, 1% grid) ${fmt(best)}  vs LP ${fmt(r.plan.objective)}  → LP ≤ brute: ${r.plan.objective <= best + 1}`);
