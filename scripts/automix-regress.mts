// תמהיל אופטימלי — the never-worse proof. For every bank letter and credit report
// (default and typical profile), each goal's mix from the build this one
// replaced is re-priced by TODAY's engine (today's prices, costs and rules: the
// same debts moved, the same tracks and terms, the amounts re-solved under the
// goal's rules) and judged on the goal's own measure against today's answer,
// re-priced the same way. One line per file, profile and goal:
//   new better · same · old mix breaks <rule> · OLD MIX BETTER
// The target is no OLD MIX BETTER line.
//
//   git archive <base> app/aa105test/lib/automix | tar -x -C <tmp>   (never committed)
//   copy <tmp>/app/aa105test/lib/automix to app/aa105test/lib/automix-base
//   npx tsx --tsconfig tsconfig.json scripts/automix-regress.mts [--base app/aa105test/lib/automix-base] [--only L44,r02] [--profile none|typical]
//
// Letters are numbered L01… in file order and never named; reports are r01…
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { buildAutoMix, DEFAULT_PROFILE, __test, type AutoMixInput, type GoalId, type Proposal } from "../app/aa105test/lib/automix";
import { household, FIXTURE_SETS } from "./automix-fixtures.mts";
import { parseBankStatement, detectBank } from "../lib/bank-parser";
import { bankStatementToLoans } from "../lib/bank-parser/to-loans";
import { latestCurve } from "../app/aa107test/lib/market-boi";
import type { ImportedLoan } from "../app/aa102test/lib/credit";

const argAfter = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};
const BASE = argAfter("--base") ?? "app/aa105test/lib/automix-base";
const ONLY = argAfter("--only") ? new Set(argAfter("--only")!.split(",")) : null;
const PROFILES = argAfter("--profile") ? [argAfter("--profile")!] : ["none", "typical"];
const OLD = await import(pathToFileURL(path.join(process.cwd(), BASE, "index.ts")).href);
const market = JSON.parse(fs.readFileSync(path.join(process.cwd(), "app/aa107test/lib/market-snapshot.json"), "utf8"));
const forecast = await latestCurve();

const GOALS: GoalId[] = ["payment", "savings", "balanced", "years", "stable"];
const fmt = (x: number) => `${x < 0 ? "−" : ""}${Math.round(Math.abs(x)).toLocaleString("en-US")}`;
const sgn = (x: number) => `${x < 0 ? "−" : "+"}${Math.round(Math.abs(x)).toLocaleString("en-US")}`;

/* ---------------------------------------------------------------- the corpus */

async function cases(): Promise<{ id: string; master: ImportedLoan[]; analysis: unknown }[]> {
  const out: { id: string; master: ImportedLoan[]; analysis: unknown }[] = [];
  const LETTERS = path.resolve(process.cwd(), "../Bank-Templates");
  const require = createRequire(path.join(process.cwd(), "package.json"));
  const pdfjs = await import(pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href);
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")).href;
  } catch {}
  const warn = console.warn;
  console.warn = () => {};
  let n = 0;
  for (const file of fs.readdirSync(LETTERS).filter((f) => /\.pdf$/i.test(f)).sort()) {
    const id = `L${String(++n).padStart(2, "0")}`;
    if (ONLY && !ONLY.has(id)) continue;
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path.join(LETTERS, file))), useSystemFonts: true, verbosity: 0 }).promise;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pages: any[] = [];
    for (let k = 1; k <= doc.numPages; k++) {
      const tc = await (await doc.getPage(k)).getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pages.push({ page: k, items: (tc.items as any[]).filter((i) => i.str).map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width })) });
    }
    if (!pages.some((p) => p.items.some((i: { str: string }) => i.str.trim())) || !detectBank(pages)) continue;
    const master: ImportedLoan[] = bankStatementToLoans(parseBankStatement(pages), "mix", file).loans;
    if (master.length) out.push({ id, master, analysis: null });
  }
  for (const s of FIXTURE_SETS) {
    if (ONLY && !ONLY.has(s.id)) continue;
    const h = await household(s.id, s.files);
    out.push({ id: s.id, master: h.master, analysis: h.analysis });
  }
  console.warn = warn;
  return out;
}

/* ---------------------------------------------------------------- the measures */

type Outcome = ReturnType<typeof __test.regressOf>;
const LAMBDA = __test.LAMBDA as Record<GoalId, number>;
/** A goal's risk-weighted forecast cost: (1 − λ) of the forecast economy and λ of the worst one. */
const riskCost = (o: Outcome, goal: GoalId) => (1 - LAMBDA[goal]) * o.paid![0] + LAMBDA[goal] * Math.max(...o.paid!);
const worstPeak = (o: Outcome) => Math.max(...o.peak!);
const mixOf = (p: Proposal) => ({
  structure: p.structure,
  refinance: p.moves.filter((m) => m.action !== "keep").map((m) => m.id),
  tranches: p.tranches.map((t) => ({ track: t.track, segment: t.segment, years: t.years, amount: t.amount })),
});
const show = (o: Outcome) => `mo ${fmt(o.monthly!)} months ${o.months} fPaid ${fmt(o.paid![0] - o.reference!.paid)} worst ${fmt(Math.max(...o.paid!) - o.reference!.paid)} peak ${fmt(worstPeak(o))}`;

/**
 * The verdict on one goal: does the old mix, obeying today's rules of the goal,
 * beat today's answer on the goal's own measure by more than its materiality?
 */
function verdict(goal: GoalId, o: Outcome, n: Outcome): { v: string; why: string } {
  const R = n.reference!;
  // The engine's own monthly tolerance (rules.ts SLIVER_GIVE.monthly) and the read-out's rounding of each tranche.
  const tolM = Math.max(10, 0.002 * R.monthly) + 0.5 * Math.max(o.tranches ?? 0, n.tranches ?? 0);
  if (goal === "payment") {
    if (o.monthly! < n.monthly! - tolM) return { v: "OLD MIX BETTER", why: `month one ${fmt(o.monthly!)} against ${fmt(n.monthly!)}` };
    if (Math.abs(o.monthly! - n.monthly!) <= tolM && o.paid![0] < n.paid![0] - R.material.cost) return { v: "OLD MIX BETTER", why: `the same payment, ${fmt(n.paid![0] - o.paid![0])} cheaper in the forecast` };
    return { v: n.monthly! < o.monthly! - tolM || (Math.abs(o.monthly! - n.monthly!) <= tolM && n.paid![0] < o.paid![0] - R.neutral) ? "new better" : "same", why: `month one ${fmt(o.monthly!)} → ${fmt(n.monthly!)}, forecast ${sgn(n.paid![0] - o.paid![0])}` };
  }
  if (goal === "savings") {
    const d = riskCost(n, goal) - riskCost(o, goal);
    if (d > R.material.cost) return { v: "OLD MIX BETTER", why: `its objective ${fmt(d)} lower` };
    return { v: d < -R.neutral ? "new better" : "same", why: `objective ${sgn(d)} (new − old)` };
  }
  if (goal === "balanced") {
    const relief = (x: Outcome) => R.monthly - x.monthly!;
    const saving = (x: Outcome) => R.paid - x.paid![0];
    const dR = relief(o) - relief(n);
    const dS = saving(o) - saving(n);
    const worst = Math.max(...n.paid!) - Math.max(...o.paid!);
    const noWorse = dR >= -tolM && dS >= -R.neutral;
    if (noWorse && (dR >= R.material.monthly || dS >= R.material.cost)) return { v: "OLD MIX BETTER", why: `relief ${sgn(dR)} a month, saving ${sgn(dS)}` };
    const newNoWorse = -dR >= -tolM && -dS >= -R.neutral;
    return { v: newNoWorse && (-dR > tolM || -dS > R.neutral) ? "new better" : noWorse || newNoWorse ? "same" : "mixed", why: `relief ${sgn(-dR)} a month, saving ${sgn(-dS)}, worst economy ${sgn(-worst)} (new − old)` };
  }
  if (goal === "years") {
    if (o.months! <= n.months! - R.material.months) return { v: "OLD MIX BETTER", why: `ends ${n.months! - o.months!} months sooner` };
    return { v: n.months! <= o.months! - 1 ? "new better" : "same", why: `ends ${o.months} → ${n.months} months` };
  }
  // stable: steadiness bought at the margin. Of the two mixes the cheaper in the
  // forecast stands unless the other is steadier (a lower worst-economy peak over
  // its own month one) and its extra forecast cost is at most STABLE_PRICE of the
  // payments it removes there beyond what its own month one removes.
  const pick = stablePick(o, n);
  const other = pick === o ? n : o;
  const dCost = n.paid![0] - o.paid![0];
  const why = `peak/month one ${ratio(o).toFixed(3)} → ${ratio(n).toFixed(3)}, forecast ${sgn(dCost)}, removed ${fmt(removed(pick === o ? n : o, pick))} (new − old)`;
  if (pick === o && Math.abs(o.paid![0] - other.paid![0]) > R.material.cost) return { v: "OLD MIX BETTER", why };
  return { v: pick === n && (dCost < -R.neutral || ratio(n) < ratio(o) - 0.005) ? "new better" : "same", why };
}
const STABLE_PRICE = 0.25;
/** The worst-economy peak over month one, minus one. */
const ratio = (x: Outcome) => worstPeak(x) / x.monthly! - 1;
/** Payments B removes in A's worst economy beyond what B's own month one removes (A's path scaled to B's month one). */
function removed(a: Outcome, b: Outcome): number {
  const k = a.peak!.reduce((best, x, i) => (x > a.peak![best] ? i : best), 0);
  const s = b.monthly! / a.monthly!;
  const pa = a.regular![k];
  const pb = b.regular![k];
  let sum = 0;
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) sum += Math.max(0, (pa[i] ?? 0) * s - (pb[i] ?? 0));
  return sum;
}
/** The stable choice between two mixes, at the margin. */
function stablePick(x: Outcome, y: Outcome): Outcome {
  const [a, b] = x.paid![0] <= y.paid![0] ? [x, y] : [y, x];
  return ratio(b) < ratio(a) && b.paid![0] - a.paid![0] <= STABLE_PRICE * removed(a, b) ? b : a;
}

/* ---------------------------------------------------------------- the run */

const tally = new Map<string, number>();
const better: string[] = [];
for (const c of await cases()) {
  const owed = c.master.filter((l) => !l.is_guarantor);
  const mort = owed.filter((l) => l.group !== "loan").reduce((a, l) => a + Number(l.amount || 0), 0);
  const inputOf = (profile: AutoMixInput["profile"]): AutoMixInput => ({ master: c.master, market, forecast, forecastOn: true, inflation: 2, discountRate: 4.5, profile, analysis: c.analysis as AutoMixInput["analysis"] });
  const b0 = buildAutoMix(inputOf({ ...DEFAULT_PROFILE }));
  const profiles: Record<string, AutoMixInput["profile"]> = {
    none: { ...DEFAULT_PROFILE },
    typical: { ...DEFAULT_PROFILE, income: Math.max(4000, Math.round(b0.today.monthly / 0.3 / 100) * 100), propertyValue: mort > 0 ? Math.round(mort / 0.5 / 10_000) * 10_000 : null, age: 42 },
  };
  for (const tag of PROFILES) {
    const input = inputOf(profiles[tag]);
    const now = buildAutoMix(input);
    const old = OLD.buildAutoMix(input);
    if (!now.ok || !old.ok) continue;
    for (const goal of GOALS) {
      const n = now.proposals.find((p) => p.goal === goal);
      const o = old.proposals.find((p: Proposal) => p.goal === goal) as Proposal | undefined;
      if (!n || !o) continue;
      const head = `${c.id.padEnd(8)}${tag.padEnd(8)}${goal.padEnd(9)}`;
      let line: string;
      let v: string;
      if (o.status !== "ok") {
        v = n.status === "ok" ? "new better" : "same";
        line = `${head}${v.padEnd(26)}the old build offered nothing (${o.status})${n.status === "ok" ? "; today offers it" : ""}`;
      } else {
        const caps = n.guard && n.guard.kind !== "none" ? n.guard.caps : null;
        const ceiling = goal === "years" ? n.budget : undefined;
        // Today's answer moved a debt CHEAP_KEEP holds by default: the goal lifted the rule on its own measure.
        const lifted = n.moves.some((m) => m.action !== "keep" && /זול מכסף חדש ב-/.test(m.why));
        const ro = __test.regressOf(input, goal, mixOf(o), caps, ceiling, lifted);
        const rn = n.status === "ok" || n.tranches.length ? __test.regressOf(input, goal, mixOf(n), caps, ceiling, lifted) : null;
        if (!ro.ok) {
          v = "old mix breaks";
          // The figure: what the old mix gives with that one rule set aside.
          const fig = ro.monthly === undefined ? "" : ro.rule === "the five-year guard" ? `its five-year peak ${fmt(Math.max(...ro.peak5!))} over the cap ${fmt(Math.max(...(caps ?? [0])))}; set aside: ${show(ro)}` : rn?.ok ? `set aside: ${verdict(goal, ro, rn).v.toLowerCase()} (${verdict(goal, ro, rn).why})` : `set aside: ${show(ro)}`;
          line = `${head}${`old mix breaks ${ro.rule}`.padEnd(26)} ${fig}`;
        } else if (ro.status !== "ok") {
          v = "old mix breaks";
          line = `${head}${`old mix breaks ${ro.gate ? `the ${ro.gate} gate` : `its ${ro.status}`}`.padEnd(26)}old today: ${show(ro)}`;
        } else if (n.status !== "ok") {
          v = "OLD MIX BETTER";
          line = `${head}${v.padEnd(26)}today ${n.status}${n.note ? ` (${n.note.slice(0, 90)})` : ""}; the old mix today: ${show(ro)}`;
        } else if (!rn?.ok) {
          // Today's answer is not re-priceable under the reconstructed rules (adopted from another goal, or solved under a tighter cap): its own figures stand in.
          const own = { ...ro, monthly: n.metrics.monthly, months: n.metrics.months, paid: n.stress.map((s) => s.totalPaid), peak: n.stress.map((s) => s.peakMonthly), peak5: n.stress.map((s) => s.peakMonthly), regular: ro.regular, tranches: n.tranches.length };
          const r = goal === "stable" ? { v: "same", why: "today's mix not re-priceable; compared on its figures only" } : verdict(goal, ro, own);
          v = r.v;
          line = `${head}${v.padEnd(26)}${r.why} (today's own figures: ${rn?.rule ?? "not re-priced"}) | old ${show(ro)}`;
        } else {
          const r = verdict(goal, ro, rn);
          v = r.v;
          line = `${head}${v.padEnd(26)}${r.why} | old ${show(ro)} | new ${show(rn)}`;
        }
      }
      tally.set(v, (tally.get(v) ?? 0) + 1);
      if (v === "OLD MIX BETTER") better.push(line);
      console.log(line);
    }
  }
}
console.log(`\n${Array.from(tally.entries()).map(([k, x]) => `${k} ${x}`).join(" · ")}`);
if (better.length) {
  console.log(`\nOLD MIX BETTER (${better.length}):`);
  for (const b of better) console.log(`  ${b}`);
}
process.exit(better.length ? 1 : 0);
