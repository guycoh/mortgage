// תמהיל אוטומטי — read one fixture's proposals the way an advisor would: every
// debt's decision with its reason, the new tranches, reasons, caveats, checks
// and the stress table. Figures and lender names only — no client identity.
//
//   npx tsx --tsconfig tsconfig.json scripts/automix-review.mts r04 [goal]
//   ALLMOVES=1 … also lists the locked (state-eligibility) rows
import { household, FIXTURE_SETS } from "./automix-fixtures.mts";
import { buildAutoMix, DEFAULT_PROFILE } from "../app/aa105test/lib/automix";
import snapshot from "../app/aa107test/lib/market-snapshot.json" with { type: "json" };
import { latestCurve } from "../app/aa107test/lib/market-boi";
const f = await latestCurve();
const fmt = (x: number) => Math.round(x).toLocaleString("en-US");
const [id, goal] = process.argv.slice(2);
const s = FIXTURE_SETS.find(x => x.id === id)!;
const h = await household(s.id, s.files);
const r = buildAutoMix({ master: h.master, market: snapshot as any, forecast: f, forecastOn: true, inflation: 2, discountRate: 4.5, profile: DEFAULT_PROFILE, analysis: h.analysis });
console.log(`== ${id} ${r.ms.toFixed(0)}ms tier ${r.pricing.tier}: ${r.pricing.tierWhy}`);
console.log("pricing", r.pricing.rows.map(x => `${x.label} ${x.rate10}/${x.rate20}/${x.rate30}`).join(" | "));
if (!goal) { for (const x of r.findings) console.log(`  F[${x.severity}] ${x.title} — ${x.detail} ${x.annualCost ? "(₪" + fmt(x.annualCost) + "/yr)" : ""}`); for (const x of r.skipped) console.log("  skip", x.label, x.why); }
for (const p of r.proposals.filter(p => !goal || p.goal === goal)) {
  console.log(`\n-- ${p.goal} ${p.status} ${p.sameAs ?? ""} ${p.note ?? ""}`);
  console.log(`   mo ${fmt(r.today.monthly)}→${fmt(p.metrics.monthly)}  months ${r.today.months}→${p.metrics.months}  int ${fmt(r.today.totalInterest)}→${fmt(p.metrics.totalInterest)}  peak ${fmt(p.metrics.peakMonthly)}  fixed ${(p.metrics.fixedShare*100).toFixed(0)}% linked ${(p.metrics.linkedShare*100).toFixed(0)}%  fees ${fmt(p.costs.prepaymentFees)} setup ${fmt(p.costs.setup)} be ${p.costs.breakEvenMonths} target ${fmt(p.target)}`);
  for (const m of p.moves.filter(m => process.env.ALLMOVES || m.action !== "keep" || !m.why.includes("זכאות"))) console.log(`   ${m.action.padEnd(11)} ${m.label.padEnd(20)} ${fmt(m.balance).padStart(9)} ${m.rate}% ${m.months}m — ${m.why}`);
  for (const t of p.tranches) console.log(`   NEW ${t.track}/${t.segment} ${fmt(t.amount)} ${t.years}y ${t.rate}% → ${fmt(t.monthly)}/mo`);
  for (const x of p.reasons) console.log("   R:", x);
  for (const x of p.caveats) console.log("   C:", x);
  for (const x of p.checks) console.log(`   ${x.ok ? "✓" : "✗"} ${x.label}: ${x.value}`);
  for (const x of p.stress) console.log(`   S ${x.label}: peak ${fmt(x.peakMonthly)} (today ${fmt(x.todayPeakMonthly)}) paid ${fmt(x.totalPaid)} (today ${fmt(x.todayTotalPaid)})`);
}
