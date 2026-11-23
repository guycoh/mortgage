// תמהיל אוטומטי — the proof. Exits non-zero on any failure.
//
//   npx tsx --tsconfig tsconfig.json scripts/automix-check.mts [--quick]
//
//   A. parity       the stress amortizer (econ.scheduleOn) reproduces the board's
//                   forecast engine (priceLoan) on every fixture row and every
//                   new-loan column, to the agora
//   B. real reports the seven fixtures + the r01+r02 household, every goal, a
//                   compact table (figures only — no names, no IDs)
//   C. synthetic    the edge households
//   D. invariants   on every proposal of B and C (see `verify`)
//   E. determinism  same input → byte-identical output
//   F. stability    ±1% balances, ±0.05pp rates → no wholesale flip
//   G. optimality   the solver against brute force on small cases
//   H. timing       all goals, every report; the 26-tranche case
import { household, FIXTURE_SETS } from "./automix-fixtures.mts";
import { buildAutoMix, DEFAULT_PROFILE, __test, type AutoMixInput, type AutoMixResult, type ClientProfile, type GoalId, type Proposal } from "../app/aa105test/lib/automix";
import { ECONOMIES, scheduleIn } from "../app/aa105test/lib/automix/econ";
import { MIN_TRANCHE, FIXED_MIN, LINKED_MAX, TRACK_SHARE_MAX, TRACK_SHARE_EXEMPT, LTV_MAX, PTI_MAX } from "../app/aa105test/lib/automix/rules";
import { NONBANK_LTV, resolveTier, loanEvents, pricingRecord, EVENT_SHARE } from "../app/aa105test/lib/automix/tiers";
import { averageRateIn } from "../app/aa105test/lib/automix/fees";
import { EARLY } from "../app/aa105test/lib/automix/solve";
import { priceLoan } from "../app/aa102test/lib/price";
import { boardMonthly, foldMasterRow, owedOnly, type ImportedLoan } from "../app/aa102test/lib/credit";
import { latestCurve } from "../app/aa107test/lib/market-boi";
import type { MarketSnapshot } from "../app/aa107test/lib/market";
import { verifier } from "./automix-verify.mts";
import snapshotJson from "../app/aa107test/lib/market-snapshot.json" with { type: "json" };

const QUICK = process.argv.includes("--quick");
/**
 * Golden outputs: `--write-golden DIR` stores every case's result (minus `ms`
 * and `blocks`); `--golden DIR` compares against them byte for byte. The
 * engine reads today's date and the live curve, so a golden set is valid on the
 * day and market it was written — a regression tool for a change, kept outside
 * the repo (it holds client figures).
 */
const argAfter = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};
const WRITE_GOLDEN = argAfter("--write-golden");
const READ_GOLDEN = argAfter("--golden");
const { writeFileSync: wf, readFileSync: rf, existsSync: ex, mkdirSync: mk } = await import("node:fs");
function golden(name: string, r: AutoMixResult, input: AutoMixInput) {
  const { ms: _ms, blocks: _b, ...rest } = r as AutoMixResult & { blocks?: unknown };
  void _ms;
  void _b;
  // Fields added after the golden copy was written (additive contract fields) are not part of the comparison.
  const ADDED = new Set(["structure", "structureWhy", "dueNow", "cure", "due"]);
  // The parser gives every row a fresh random id: compare by position in the master instead.
  let json = JSON.stringify(rest, (k, v) => (ADDED.has(k) ? undefined : v));
  input.master.forEach((l, i) => (json = json.split(l.id).join(`#row${i}`)));
  const file = (d: string) => `${d}/${name.replace(/[^a-z0-9+-]/gi, "_")}.json`;
  if (WRITE_GOLDEN) {
    mk(WRITE_GOLDEN, { recursive: true });
    wf(file(WRITE_GOLDEN), json);
  }
  if (READ_GOLDEN) {
    const f = file(READ_GOLDEN);
    const scope = GOLDEN_SCOPE[name];
    if (!scope) {
      check(ex(f) && rf(f, "utf8") === json, `${name}: output differs from the golden copy (override off must be unchanged)`);
      return;
    }
    if (scope.drop.includes("*")) {
      console.log(`  golden ${name}: not compared (${scope.why})`);
      return;
    }
    const cut = (x: Record<string, unknown>) => {
      for (const path of scope.drop) {
        const keys = path.split(".");
        let o = x as Record<string, unknown>;
        for (const k of keys.slice(0, -1)) o = (o?.[k] ?? {}) as Record<string, unknown>;
        delete o[keys[keys.length - 1]];
      }
      return JSON.stringify(x);
    };
    check(ex(f) && cut(JSON.parse(rf(f, "utf8"))) === cut(JSON.parse(json)), `${name}: output differs from the golden copy beyond ${scope.drop.join(", ")}`);
    console.log(`  golden ${name}: compared without ${scope.drop.join(", ")} (${scope.why})`);
  }
}
/**
 * Where override-off output is MEANT to differ from the shipped engine: the
 * non-bank model was this round's subject. Every bank-tier file stays byte-identical.
 */
const GOLDEN_SCOPE: Record<string, { drop: string[]; why: string }> = {
  r05: { drop: ["pricing.tierWhy", "pricing.rows"], why: "grade D ladder prices; every goal still unavailable" },
  "tier-nonbank": { drop: ["*"], why: "the non-bank model changed by design: ladder, second or first lien, Fair Credit law instead of 329, file fee" },
};
const market = snapshotJson as unknown as MarketSnapshot;
// The BoI curve is fetched live; a network blip retries (twice, 3s apart) instead of failing the run.
const forecast = await (async () => {
  for (let k = 0; ; k++) {
    try {
      return await latestCurve();
    } catch (e) {
      if (k >= 2) throw e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
})();
const fmt = (x: number) => Math.round(x).toLocaleString("en-US");
const V = verifier(market, forecast);
const { check, failures, verify, verifyOverride, guardOk, shareCapOk, BUDGET_GOALS } = V;
const section = (s: string) => console.log(`\n### ${s}`);

/**
 * A clean file under the override equals the same file without it, except the
 * proposals the cost-share gate (rules.ts REFI_COST_MAX) refused without it:
 * the override builds those, and each says so in a caveat. Their status can
 * move the recommendation and the folding of identical mixes, so those two are
 * compared only when no goal was gated.
 */
function sameUnderOverride(on: AutoMixResult, off: AutoMixResult): boolean {
  const gated = new Set(off.proposals.filter((p) => (p.note ?? "").startsWith("הכסף החדש")).map((p) => p.goal));
  for (const p of on.proposals) if (gated.has(p.goal) && p.status === "ok") check(p.caveats.some((c) => c.includes("גבוהות מדי ביחס לחוב")), `${p.goal}: built past the cost share without saying so`);
  const cut = (x: AutoMixResult) =>
    JSON.stringify({ ...x, ms: 0, ...(gated.size ? { recommended: null } : {}), proposals: x.proposals.map((p) => (gated.has(p.goal) ? { goal: p.goal } : gated.size ? { ...p, sameAs: undefined } : p)) });
  return cut(on) === cut(off);
}

const inputOf = (master: ImportedLoan[], over: Partial<AutoMixInput> = {}, profile: Partial<ClientProfile> = {}): AutoMixInput => ({
  master,
  market,
  forecast,
  forecastOn: true,
  inflation: 2,
  discountRate: 4.5,
  profile: { ...DEFAULT_PROFILE, ...profile },
  ...over,
});
const typed = (inflation: number) => ({ inflation, forecast: null });

/* ================================================================ A. parity */

section("A. parity — stress amortizer vs the board's forecast engine");
{
  let rows = 0;
  let worst = 0;
  const all: ImportedLoan[] = [];
  for (const s of FIXTURE_SETS) all.push(...(await household(s.id, s.files)).master.filter((l) => !l.is_guarantor && Number(l.months) > 0));
  // New-loan columns too: every track at a few terms.
  const prep = __test.prepare(inputOf(all.slice(0, 3)), forecast, []);
  if (!("fail" in prep)) for (const c of prep.ctx.cols.filter((c) => c.years % 7 === 2)) all.push(__test.trancheRow(c.track, c.years, c.segment, 500_000, c.price, c.key));
  for (const l of all) {
    const a = scheduleIn(l, forecast, ECONOMIES[0]).pay;
    const b = priceLoan(l, { inflation: 2, forecast }).schedule.map((x) => x.payment);
    let d = a.length === b.length ? 0 : Infinity;
    for (let i = 0; i < Math.min(a.length, b.length); i++) d = Math.max(d, Math.abs(a[i] - b[i]));
    worst = Math.max(worst, d);
    rows++;
  }
  console.log(`  ${rows} rows · worst monthly difference ₪${worst.toExponential(2)}`);
  check(worst < 0.01, `parity: scheduleOn differs from priceLoan by ₪${worst}`);
}

/* ================================================================ D. invariants */

/* ================================================================ B. real reports */

section("B. real reports (figures only)");
const table: string[] = [];
const head = "report   rows tier         today ₪/mo  months | goal        status   ₪/mo      Δ₪/mo   Δmonths  Δinterest   Δforecast-paid  fees   b/e   ms";
console.log(head);
const reals: { id: string; input: AutoMixInput; r: AutoMixResult }[] = [];
for (const s of FIXTURE_SETS) {
  const h = await household(s.id, s.files);
  const input = inputOf(h.master, { analysis: h.analysis });
  const r = buildAutoMix(input);
  reals.push({ id: s.id, input, r });
  golden(s.id, r, input);
  verify(s.id, input, r);
  const first = `${s.id.padEnd(8)} ${String(h.master.length).padStart(4)} ${r.pricing.tier.padEnd(12)} ${fmt(r.today.monthly).padStart(10)} ${String(r.today.months).padStart(7)}`;
  r.proposals.forEach((p, i) => {
    const fp = p.metrics.outlook && r.today.outlook ? p.metrics.outlook.totalPaid - r.today.outlook.totalPaid : 0;
    const line = `${i ? " ".repeat(first.length) : first} | ${p.goal.padEnd(11)} ${(p.status + (p.sameAs ? "=" + p.sameAs.slice(0, 3) : "")).padEnd(8)} ${fmt(p.metrics.monthly).padStart(7)} ${fmt(p.delta.monthly).padStart(8)} ${String(p.delta.months).padStart(8)} ${fmt(p.delta.totalInterest).padStart(10)} ${fmt(fp).padStart(16)} ${fmt(p.costs.prepaymentFees).padStart(6)} ${String(p.costs.breakEvenMonths ?? "—").padStart(5)} ${i ? "" : r.ms.toFixed(0).padStart(4)}`;
    console.log(line);
    table.push(line);
  });
  console.log(" ".repeat(first.length) + ` | recommended: ${r.recommended ?? "—"} · findings: ${r.findings.map((f) => f.id).join(", ")}`);
  verifyOverride(s.id, input, r);
  // The same report with the override: a clean file is unchanged; a blocked one is built past its blocks.
  const inputO = inputOf(h.master, { analysis: h.analysis }, { override: true });
  const rO = buildAutoMix(inputO);
  verify(`${s.id}+override`, inputO, rO);
  verifyOverride(`${s.id}+override`, inputO, rO);
  if (!r.blocks.length) check(sameUnderOverride(rO, r), `${s.id}: a clean file changed under the override`);
  else reals.push({ id: `${s.id}+override`, input: inputO, r: rO });
}

section("B2. r05 under the override, at every tier");
{
  const s = FIXTURE_SETS.find((x) => x.id === "r05")!;
  const h = await household(s.id, s.files);
  for (const tier of ["auto", "nonbank", "bankPremium", "bank"] as const) {
    const input = inputOf(h.master, { analysis: h.analysis }, { override: true, tier });
    const r = buildAutoMix(input);
    verify(`r05+override/${tier}`, input, r);
    verifyOverride(`r05+override/${tier}`, input, r);
    check(r.proposals.some((p) => p.status === "ok"), `r05+override/${tier}: no proposal built`);
    console.log(
      `  ${tier.padEnd(12)} ${r.pricing.tier.padEnd(12)} ${r.ms.toFixed(0).padStart(4)}ms due ${fmt(r.dueNow?.total ?? 0)} ref ${fmt(r.dueNow?.reference.monthly ?? 0)} | ` +
        r.proposals.map((p) => `${p.goal.slice(0, 4)}:${p.status === "ok" ? "ok" : p.status === "no-gain" ? "ng" : "na"}${p.status === "unavailable" ? "" : `(${fmt(p.metrics.monthly)} ${p.structure ?? ""})`}`).join(" ")
    );
  }
}

/* ================================================================ C. synthetic */

section("C. synthetic households");
let seq = 0;
const row = (p: Partial<ImportedLoan>): ImportedLoan =>
  ({ id: `s${++seq}`, mix_id: "m", path_id: 1, amount: 0, rate: 0, months: 0, amortization_schedule_id: 1, grace_type_id: 1, grace_months: 0, group: "mortgage", source_bank: "בנק מזרחי טפחות בע\"מ", ...p }) as ImportedLoan;
const mortgage = () => [
  row({ path_id: 1, amount: 420_000, rate: 5.5, months: 300, anchor_margin: 0.75, source_start_date: "01/05/2024" }),
  row({ path_id: 2, amount: 380_000, rate: 6.1, months: 300, source_start_date: "01/11/2023" }),
  row({ path_id: 3, amount: 260_000, rate: 2.4, months: 240, source_start_date: "01/03/2020" }),
  row({ path_id: 5, amount: 150_000, rate: 3.6, months: 264, anchor_margin: 1.9, source_start_date: "01/01/2022" }),
];
const loans = () => [
  row({ group: "loan", path_id: 1, amount: 98_000, rate: 9.1, months: 72, anchor_margin: 4.35, source_bank: "בנק לאומי לישראל בע\"מ" }),
  row({ group: "loan", path_id: 2, amount: 45_000, rate: 12.9, months: 40, source_bank: "מקס איט פיננסים" }),
];
type Case = { name: string; master: ImportedLoan[]; over?: Partial<AutoMixInput>; profile?: Partial<ClientProfile>; expect?: (r: AutoMixResult) => [boolean, string][] };
const by = (r: AutoMixResult, g: GoalId) => r.proposals.find((p) => p.goal === g);
const cases: Case[] = [
  { name: "mortgage-only", master: mortgage(), expect: (r) => [[by(r, "balanced")?.status !== "unavailable", "balanced is never unavailable when other goals solve"], [!by(r, "consolidate"), "no consolidate goal without consumer debt"], [r.proposals.some((p) => p.status === "ok"), 'a dear קל"צ at 6.1% must give some goal a gain']] },
  {
    name: "loans-no-property",
    master: loans(),
    expect: (r) => [
      [by(r, "consolidate")?.status === "unavailable", "consolidate unavailable without a property"],
      [r.proposals.filter((p) => p.goal !== "consolidate").every((p) => p.status !== "ok"), "nothing can move without collateral"],
    ],
  },
  {
    name: "stated-fee",
    master: [row({ path_id: 2, amount: 600_000, rate: 6.4, months: 276, prepayment_fee: 41_250, source_start_date: "01/08/2023" }), row({ path_id: 1, amount: 300_000, rate: 5.0, months: 276, anchor_margin: 0.25 })],
    expect: (r) => {
      const mv = r.proposals.flatMap((p) => p.moves).filter((m) => m.rate === 6.4 && m.action !== "keep");
      return [[mv.every((m) => m.fee === 41_250 && !m.feeEstimated), "the stated fee is used as stated"]];
    },
  },
  {
    name: "all-cheap",
    master: [row({ path_id: 2, amount: 500_000, rate: 3.2, months: 240, source_start_date: "01/06/2021" }), row({ path_id: 3, amount: 300_000, rate: 1.9, months: 240, source_start_date: "01/06/2021" }), row({ path_id: 1, amount: 250_000, rate: 4.0, months: 240, anchor_margin: -0.75, source_start_date: "01/06/2021" })],
    expect: (r) => [[["savings", "years", "stable", "balanced"].every((g) => by(r, g as GoalId)?.status !== "ok"), "a mortgage priced below today's market must not be refinanced for savings"]],
  },
  {
    name: "balloons",
    master: [...mortgage().slice(0, 2), row({ path_id: 3, amount: 400_000, rate: 4.9, months: 200, amortization_schedule_id: 3, source_start_date: "01/03/2025" })],
    expect: (r) => [[r.findings.some((f) => f.id === "interest-only"), "the balloon is a finding"], [by(r, "payment")!.moves.find((m) => m.balance === 400_000)?.action === "keep" || by(r, "payment")!.caveats.some((c) => c.includes("בלון")), "payment goal keeps the balloon or says it converts it"]],
  },
  { name: "guarantee", master: [...mortgage(), row({ group: "loan", path_id: 2, amount: 150_000, rate: 4.1, months: 30, is_guarantor: true })], expect: (r) => [[r.today.balance === mortgage().reduce((a, l) => a + l.amount, 0), "guarantee out of today's total"], [r.findings.some((f) => f.id === "guarantees"), "guarantee finding"]] },
  {
    name: "past-due",
    master: [...mortgage(), row({ group: "loan", path_id: 2, amount: 32_000, rate: 11, months: 0 }), row({ group: "loan", path_id: 2, amount: 1_500, rate: 8, months: 0 })],
    expect: (r) => [[r.skipped.length === 2, "two past-due rows skipped"], [r.findings.some((f) => f.id === "past-due"), "past-due finding"]],
  },
  { name: "tiny-balances", master: [...mortgage(), row({ group: "loan", path_id: 1, amount: 3_100, rate: 13, months: 14 }), row({ group: "loan", path_id: 2, amount: 800, rate: 9, months: 5 })] },
  {
    name: "26-tranches",
    master: Array.from({ length: 26 }, (_, i) =>
      row({ path_id: [1, 2, 3, 4, 5][i % 5], amount: 18_000 + ((i * 7919) % 40_000), rate: [5.9, 5.6, 3.1, 5.2, 3.8][i % 5] + (i % 3) * 0.2, months: 200 + ((i * 37) % 140), anchor_margin: i % 5 === 0 ? 1.15 : i % 5 === 3 ? 0.9 : i % 5 === 4 ? 1.7 : null, source_start_date: `01/0${1 + (i % 9)}/202${2 + (i % 3)}` })
    ),
  },
  { name: "elderly", master: mortgage(), profile: { age: 68 }, expect: (r) => [[r.proposals.every((p) => p.tranches.every((t) => t.years <= 12)), "68 + term ≤ 80"]] },
  { name: "pti-binds", master: [...mortgage(), ...loans()], profile: { income: 17_000 }, expect: (r) => [[r.proposals.filter((p) => p.status === "ok").every((p) => p.checks.some((c) => c.label === "שיעור החזר מהכנסה" && c.ok)), "PTI reported and holding"]] },
  {
    // Mortgage ₪1.21M on ₪2.0M = 60.5%: housing refinance fits under 75%, but all-purpose money may only
    // take the property's credit to min(70%, 50% + ₪200k) = 60% — already exceeded, so no consolidation.
    name: "ltv-binds",
    master: [...mortgage(), ...loans()],
    profile: { propertyValue: 2_000_000 },
    expect: (r) => [
      [r.proposals.filter((p) => p.status === "ok").every((p) => p.checks.some((c) => c.label.startsWith("שיעור מימון") && c.ok)), "LTV reported and holding"],
      [r.proposals.every((p) => p.tranches.every((t) => t.segment === "housing")), "no all-purpose money above the §10א cap"],
      [r.proposals.some((p) => p.status === "ok"), "housing moves stay possible"],
    ],
  },
  { name: "over-ltv-today", master: mortgage(), profile: { propertyValue: 1_400_000 }, expect: (r) => [[r.proposals.every((p) => p.status !== "ok" || p.tranches.reduce((a, t) => a + t.amount, 0) <= p.moves.filter((m) => m.action !== "keep").reduce((a, m) => a + m.balance, 0)), "an over-LTV mortgage is not enlarged"]] },
  { name: "flat-mode", master: [...mortgage(), ...loans()], over: { forecastOn: false }, expect: (r) => [[r.today.outlook === null && r.proposals.every((p) => p.metrics.outlook === null), "no outlook in flat mode"]] },
  { name: "no-forecast", master: mortgage(), over: { forecast: null } },
  { name: "move-to-discount", master: [...mortgage(), ...loans()], profile: { bank: "Discount" }, expect: (r) => [[r.proposals.every((p) => { const m = p.moves.filter((x) => x.group === "mortgage"); return m.every((x) => x.action === "keep") || m.every((x) => x.action !== "keep"); }), "moving banks moves the whole mortgage"]] },
  { name: "tier-nonbank", master: [...mortgage(), ...loans()], profile: { tier: "nonbank" }, expect: (r) => [[r.pricing.tier === "nonbank" && r.proposals.every((p) => p.tranches.every((t) => t.track === "prime" || t.track === "kz")), "non-bank menu"]] },
  { name: "budget-tight", master: [...mortgage(), ...loans()], profile: { budget: 6000 }, expect: (r) => [[["years", "savings", "stable"].every((g) => by(r, g as GoalId)?.status === "unavailable"), "an impossible budget is unavailable, not violated"]] },
];
for (const c of cases) {
  const input = inputOf(c.master, c.over ?? {}, c.profile ?? {});
  const r = buildAutoMix(input);
  golden(c.name, r, input);
  verify(c.name, input, r, { ok: c.name !== "no-forecast" });
  for (const [ok, what] of c.expect?.(r) ?? []) check(ok, `${c.name}: ${what}`);
  console.log(
    `  ${c.name.padEnd(17)} ${r.ok ? "" : "!ok "}${r.ms.toFixed(0).padStart(4)}ms ` +
      r.proposals.map((p) => `${p.goal.slice(0, 4)}:${p.status === "ok" ? "ok" : p.status === "no-gain" ? "ng" : "na"}${p.status === "unavailable" ? "" : `(${fmt(p.delta.monthly)})`}`).join(" ")
  );
  if (c.name === "26-tranches") check(r.ms < 2000, `26-tranche build took ${r.ms.toFixed(0)}ms`);
}

/* ================================================================ C2. bad shape */

section("C2. bad-shape households (override on, and off)");
// The parts of the board's analysis the engine reads (condition.ts, tiers.ts, findings).
type LineIn = { balance: number; overdue?: number; arrearsRange?: string; chargeNotPaid?: boolean; remarks?: string[]; category?: string; bank?: string };
const analysisOf = (o: { lines?: LineIn[]; execution?: number; insolvency?: "insolvency" | "bankruptcy"; flags?: string[]; overdue?: number; arrearsMonths?: number }) =>
  ({
    flags: (o.flags ?? []).map((id) => ({ id })),
    totals: { overdue: o.overdue ?? 0 },
    behaviour: { arrearsMonths: o.arrearsMonths ?? 0 },
    legal: {
      insolvency: o.insolvency ? [{ "151-003": o.insolvency === "bankruptcy" ? "פשיטת רגל" : "חדלות פירעון", "151-015": o.insolvency === "bankruptcy" ? "צו כינוס" : "צו לפתיחת הליכים", "151-016": "01/03/2025", "151-009": "240000" }] : [],
      executionOpen: o.execution ? [{ "197-003": "77" }] : [],
      executionDebt: o.execution ?? 0,
    },
    mortgage: { collateralValue: 0 },
    lines: (o.lines ?? []).map((l, i) => ({ uid: `u:${i}`, role: "debtor", overdue: 0, arrearsRange: "", chargeNotPaid: false, remarks: [], category: "card", bank: "ישראכרט", ...l })),
  }) as unknown as AutoMixInput["analysis"];
// The first mortgage row carries a report reference, so the analysis can point at it.
const tagged = () => {
  const m = mortgage();
  m[0] = { ...m[0], source_refs: ["r#0"] } as ImportedLoan;
  return m;
};
type BadCase = { name: string; master: ImportedLoan[]; analysis?: AutoMixInput["analysis"]; profile?: Partial<ClientProfile>; expect?: (on: AutoMixResult, off: AutoMixResult) => [boolean, string][] };
const bad: BadCase[] = [
  {
    // 90+ days on the mortgage itself: the bank is calling it — it is cleared in full, so only a first lien can stand.
    name: "mortgage-90-days",
    master: tagged(),
    analysis: analysisOf({ lines: [{ balance: 420_000, overdue: 14_000, arrearsRange: "90-119", category: "mortgage", bank: "מזרחי טפחות" }], flags: ["arrears-now"], overdue: 14_000, arrearsMonths: 4 }),
    expect: (on, off) => [
      [off.pricing.tier === "nonbank" && off.blocks.some((b) => b.id === "arrears" && !b.overridden), "off: arrears block standing, non-bank pricing"],
      [on.proposals.filter((p) => p.status !== "unavailable").every((p) => p.moves.find((m) => m.balance === 420_000)?.action !== "keep"), "the called tranche is cleared in every proposal"],
      [on.proposals.filter((p) => p.status !== "unavailable").every((p) => p.structure === "firstLien"), "nothing stands behind a called mortgage: first lien only"],
      [!!on.dueNow && on.dueNow.items.some((x) => x.kind === "called" && x.balance === 420_000), "the called tranche is due now"],
      [by(on, "payment")?.status === "ok", "the lowest payment that clears it is a proposal"],
    ],
  },
  {
    // 30–59 days on the mortgage: kept, it is brought current from the new money.
    name: "mortgage-30-days",
    master: tagged(),
    analysis: analysisOf({ lines: [{ balance: 420_000, overdue: 6_200, arrearsRange: "30-59", category: "mortgage", bank: "מזרחי טפחות" }], flags: ["arrears-now"], overdue: 6_200, arrearsMonths: 1 }),
    expect: (on) => [
      [!!on.dueNow && on.dueNow.cures.some((c) => c.overdue === 6_200), "the arrears are a cure in dueNow"],
      [on.proposals.filter((p) => p.status !== "unavailable").every((p) => { const m = p.moves.find((x) => x.balance === 420_000); return !!m && (m.action !== "keep" || m.cure === 6_200); }), "kept, the tranche is cured; else it is refinanced"],
      [by(on, "payment")?.caveats.some((c) => c.includes("קטנה בהרבה מהמקובל")) ?? false, "a cure-only loan says it is far below what lenders write"],
    ],
  },
  {
    // An enforcement file no account line covers: due now in full.
    name: "enforcement-file",
    master: mortgage(),
    analysis: analysisOf({ execution: 45_000, flags: ["execution"] }),
    expect: (on, off) => [
      [off.proposals.every((p) => !p.moves.some((m) => m.due)), "off: the file is not in the mix"],
      [!!on.dueNow && on.dueNow.items.some((x) => x.kind === "enforcement" && x.balance === 45_000), "on: the file is due now"],
      [on.proposals.some((p) => p.status === "ok"), "on: a proposal clears it"],
    ],
  },
  {
    name: "insolvency-2018-law",
    master: mortgage(),
    analysis: analysisOf({ insolvency: "insolvency", flags: ["insolvency"] }),
    expect: (on, off) => [
      [off.proposals.every((p) => p.status === "unavailable"), "off: every goal unavailable"],
      // A bank mortgage priced well, and nothing due: at grade D nothing beats it, and each goal says so.
      [on.proposals.every((p) => p.status !== "unavailable" && !!p.note), "on: every goal built, each no-gain with its reason"],
      [on.proposals.every((p) => p.caveats[0].includes("סעיף 123")), "on: the Commissioner's approval (§123) leads"],
      [on.proposals.filter((p) => p.status !== "unavailable").every((p) => p.caveats.some((c) => c.includes("לא נמצא מלווה"))), "on: no published lender, said"],
    ],
  },
  {
    // Only debts past their term, no property known.
    name: "past-due-only",
    master: [row({ group: "loan", path_id: 2, amount: 52_000, rate: 11, months: 0, source_bank: "כאל" }), row({ group: "loan", path_id: 2, amount: 9_000, rate: 8, months: 0, source_bank: "טריא" })],
    expect: (on, off) => [
      [!off.ok, "off: nothing to build from"],
      [on.ok && on.proposals.some((p) => p.status === "ok"), "on: the due debt is cleared by an all-purpose loan"],
      [on.blocks.some((b) => b.id === "no-collateral" && b.overridden && /₪[\d,]+/.test(b.condition)), "on: the property it needs is named with a value"],
    ],
  },
  {
    name: "no-property",
    master: loans(),
    profile: { tier: "nonbank" },
    expect: (on, off) => [
      [off.proposals.every((p) => p.status !== "ok"), "off: nothing moves without collateral"],
      [on.proposals.some((p) => p.goal === "consolidate" && p.status === "ok"), "on: consolidation against a property to be pledged"],
    ],
  },
  {
    name: "elderly-override",
    master: mortgage(),
    profile: { age: 68 },
    expect: (on, off) => [
      [off.proposals.every((p) => p.tranches.every((t) => t.years <= 12)), "off: 68 + term ≤ 80"],
      [on.proposals.some((p) => p.tranches.some((t) => t.years > 12)), "on: the age limit (practice, not law) is lifted"],
    ],
  },
  {
    // 86% LTV at a bank: 329 is law for the bank, so the override does not lift it.
    name: "ltv-over-ceiling",
    master: mortgage(),
    profile: { propertyValue: 1_400_000 },
    expect: (on) => [
      [on.blocks.some((b) => b.id === "ltv" && b.law && !b.overridden), "on: the LTV block stands (law)"],
      [on.proposals.every((p) => p.status !== "ok" || p.tranches.reduce((a, t) => a + t.amount, 0) <= p.moves.filter((m) => m.action !== "keep").reduce((a, m) => a + m.balance, 0)), "on: not enlarged"],
    ],
  },
  {
    // A clean non-bank client with a property that leaves ₪7k above the combined cap after the mortgage.
    name: "second-lien-ltv-binds",
    master: [...mortgage(), ...loans()],
    profile: { tier: "nonbank", propertyValue: 1_700_000 },
    expect: (on, off) => [
      [!off.blocks.length, "off: a clean non-bank file has no blocks"],
      [off.proposals.filter((p) => p.structure === "secondLien" && p.status === "ok").every((p) => p.checks.some((c) => c.label === "שיעור מימון, שעבוד ראשון ושני" && c.ok)), "off: combined LTV reported and holding"],
    ],
  },
  {
    name: "clean-nonbank",
    master: [...mortgage(), ...loans()],
    profile: { tier: "nonbank" },
    expect: (on, off) => [
      [!off.blocks.length && sameUnderOverride(on, off), "no blocks, and the override changes nothing but the cost-share gate"],
      [off.proposals.filter((p) => p.tranches.length).every((p) => p.checks.some((c) => c.label === "תקרת העלות בחוק אשראי הוגן")), "every proposal with new money checks the Fair Credit ceiling"],
      [off.proposals.some((p) => p.status === "ok"), "a clean non-bank file builds"],
    ],
  },
  {
    // A bank tier forced on a client in enforcement: built, and the first caveat says a bank would normally refuse.
    name: "forced-bank-on-enforcement",
    master: mortgage(),
    analysis: analysisOf({ execution: 45_000, flags: ["execution"] }),
    profile: { tier: "bank" },
    expect: (on) => [[on.pricing.tier === "bank" && on.proposals.some((p) => p.status === "ok"), "on: computed at bank prices"]],
  },
];
for (const c of bad) {
  const res: AutoMixResult[] = [];
  for (const override of [false, true]) {
    const input = inputOf(c.master, { analysis: c.analysis ?? null }, { ...(c.profile ?? {}), override });
    const r = buildAutoMix(input);
    res.push(r);
    const name = `${c.name}${override ? "+override" : ""}`;
    verify(name, input, r, { ok: r.ok || c.name === "past-due-only" ? r.ok : true });
    verifyOverride(name, input, r);
    const again = buildAutoMix(input);
    check(JSON.stringify({ ...again, ms: 0 }) === JSON.stringify({ ...r, ms: 0 }), `${name}: two runs differ`);
    console.log(
      `  ${name.padEnd(36)} ${r.ok ? "" : "!ok "}${r.pricing.tier.padEnd(11)} ${r.ms.toFixed(0).padStart(4)}ms [${r.blocks.map((b) => b.id + (b.overridden ? "*" : "")).join(",")}] ` +
        r.proposals.map((p) => `${p.goal.slice(0, 4)}:${p.status === "ok" ? "ok" : p.status === "no-gain" ? "ng" : "na"}${p.status === "unavailable" ? "" : `(${fmt(p.metrics.monthly)}${p.structure && p.structure !== "bank" ? " " + p.structure : ""})`}`).join(" ")
    );
  }
  for (const [ok, what] of c.expect?.(res[1], res[0]) ?? []) check(ok, `${c.name}: ${what}`);
}

/* ================================================================ T. the pricing record */

section("T. the pricing record (tiers.ts) — loan events, size, term");
{
  const MZ = 'בנק מזרחי טפחות בע"מ';
  const LM = 'בנק לאומי לישראל בע"מ';
  const nominal = (e: number) => (Math.pow(1 + e / 100, 1 / 12) - 1) * 1200;
  // a fixed unlinked track priced exactly at the BoI average for its month and term, plus `over` points
  const klz = (over: number, start: string, end: string, orig: number, bank = MZ, extra: Partial<ImportedLoan> = {}) => {
    const [d, m, y] = start.split("/").map(Number);
    const [ey, em] = end.split("-").map(Number);
    const term = (ey - y) * 12 + (em - m);
    const avg = averageRateIn(false, term, `${y}-${String(m).padStart(2, "0")}`);
    if (avg === null) throw new Error(`no BoI table for ${start}`);
    void d;
    return row({ path_id: 2, amount: orig * 0.9, source_orig_amount: orig, rate: Math.round((nominal(avg) + over) * 1000) / 1000, months: 200, source_start_date: start, loan_end_date: end, end_date: end, source_bank: bank, purpose: "housing", ...extra });
  };
  const P = { ...DEFAULT_PROFILE } as ClientProfile;
  const tierOf = (rows: ImportedLoan[], size?: number) => resolveTier(rows, null, P, { size });

  // events: same lender within 45 days is one decision; 60 days or another lender is another
  const a = [klz(0, "01/03/2024", "2044-03", 200_000), klz(0, "25/03/2024", "2044-03", 100_000)];
  check(loanEvents(a, pricingRecord(a)).length === 1, "record: two tracks of one lender 24 days apart are one loan event");
  const b = [klz(0, "01/03/2024", "2044-03", 200_000), klz(0, "15/05/2024", "2044-05", 100_000)];
  check(loanEvents(b, pricingRecord(b)).length === 2, "record: 75 days apart are two loan events");
  const c = [klz(0, "01/03/2024", "2044-03", 200_000), klz(0, "01/03/2024", "2044-03", 100_000, LM)];
  check(loanEvents(c, pricingRecord(c)).length === 2, "record: two lenders on one day are two loan events");
  const ev1 = loanEvents(a, pricingRecord(a))[0];
  check(Math.abs(ev1.orig - 300_000) < 1, "record: an event's size is the sum of its tracks' original amounts");

  // term for term: a track at the BoI average of its month and term reads as zero
  const t0 = pricingRecord([klz(0, "15/06/2023", "2048-06", 400_000)]);
  check(t0.length === 1 && Math.abs(t0[0].excess) < 0.02, `record: a track at its month-and-term average reads 0 (read ${t0[0]?.excess})`);

  // a large loan at market, a small one dear (this client's shape): bank, with a warning, never a premium
  const mixed = [klz(-0.2, "13/03/2024", "2043-03", 463_000), klz(2.6, "21/01/2026", "2041-02", 150_000)];
  const tm = tierOf(mixed, 672_000);
  check(tm.tier === "bank" && tm.premium === 0, `record: a large loan at market outweighs a small dear one (got ${tm.tier} ${tm.premium})`);
  check(!!tm.smaller && tm.smaller.level >= 2.5, "record: the dear small loan is kept as a warning");
  // the same client borrowing a small sum: the small loan speaks for it
  const ts = tierOf(mixed, 120_000);
  check(ts.record !== null && ts.record.level > tm.record!.level, "record: for small new money the small dear loan weighs more");

  // a large loan priced high: premium, clamped to [0.5, 2.5]
  const dear = tierOf([klz(2.7, "17/07/2023", "2046-08", 322_000)], 300_000);
  check(dear.tier === "bankPremium" && dear.premium === 2.5, `record: one large dear loan prices a premium, clamped at 2.5 (got ${dear.tier} ${dear.premium})`);
  const mild = tierOf([klz(0.9, "17/07/2023", "2046-08", 322_000)], 300_000);
  check(mild.tier === "bankPremium" && Math.abs(mild.premium - 0.9) < 0.03, `record: a 0.9 record prices 0.9 (got ${mild.premium})`);
  const under = tierOf([klz(0.6, "17/07/2023", "2046-08", 322_000)], 300_000);
  check(under.tier === "bank", "record: under 0.75 is market pricing");

  // only small dear loans, large new money: market with a warning (the back-test's verdict)
  const smalls = [klz(2.4, "15/07/2022", "2052-08", 27_000), klz(2.1, "21/04/2024", "2054-05", 80_000), klz(3.0, "15/04/2025", "2055-04", 31_000)];
  const tsm = tierOf(smalls, 1_000_000);
  check(tsm.tier === "bank" && !!tsm.smaller && tsm.record === null, "record: small dear loans alone do not price a large refinance");

  // no cliff at the cut: an event just under it weighs nearly as much as one just over it
  const cut = EVENT_SHARE * 1_200_000;
  const over = tierOf([klz(0.9, "15/03/2018", "2048-03", 550_000), klz(-0.8, "29/04/2019", "2049-04", cut + 1_000)], 1_200_000).record!.level;
  const below = tierOf([klz(0.9, "15/03/2018", "2048-03", 550_000), klz(-0.8, "29/04/2019", "2049-04", cut - 1_000)], 1_200_000).record!.level;
  check(Math.abs(over - below) < 0.05, `record: no cliff at the cut (${over} vs ${below})`);

  // what is not evidence: eligibility loans, undated rows, guarantees, consumer loans
  const none = tierOf([
    klz(3, "13/03/2024", "2043-03", 400_000, MZ, { source_eligibility: true }),
    klz(3, "13/03/2024", "2043-03", 400_000, MZ, { source_start_date: undefined }),
    klz(3, "13/03/2024", "2043-03", 400_000, MZ, { is_guarantor: true }),
    klz(3, "13/03/2024", "2043-03", 400_000, MZ, { group: "loan" }),
  ]);
  check(none.events.length === 0 && none.tier === "bank" && none.record === null, "record: eligibility, undated, guaranteed and consumer rows are not evidence");

  // the order of the rows changes nothing
  const fwd = tierOf([...mixed, ...smalls], 672_000);
  const rev = tierOf([...mixed, ...smalls].reverse(), 672_000);
  check(fwd.tier === rev.tier && fwd.record?.level === rev.record?.level && fwd.smaller?.level === rev.smaller?.level, "record: row order changes nothing");

  // a tier set in the profile wins
  check(resolveTier(smalls, null, { ...P, tier: "bank" } as ClientProfile, { size: 50_000 }).tier === "bank", "record: a tier set in the profile wins over the record");
  console.log(`  events, size, term, cut and evidence rules checked`);
}

/* ================================================================ E. determinism */

section("E. determinism");
for (const { id, input, r } of reals) {
  const again = buildAutoMix(input);
  const strip = (x: AutoMixResult) => JSON.stringify({ ...x, ms: 0 });
  check(strip(again) === strip(r), `${id}: two runs differ`);
}
console.log(`  ${reals.length} reports rebuilt — ${failures.some((f) => f.includes("two runs")) ? "DIFFER" : "identical"}`);

/* ================================================================ F. stability */

section("F. stability — ±1% balances, ±0.05pp rates");
const ties: string[] = [];
if (!QUICK)
  for (const { id, input, r } of reals) {
    if (!r.ok) continue;
    for (const [db, dr] of [[1.01, 0], [0.99, 0], [1, 0.05], [1, -0.05]] as const) {
      const master = input.master.map((l) => ({ ...l, amount: Math.round((Number(l.amount) || 0) * db), rate: Math.max(0, Math.round(((Number(l.rate) || 0) + (Number(l.rate) > 0 ? dr : 0)) * 100) / 100), source_monthly_basis: undefined, source_monthly: undefined }));
      const base = buildAutoMix({ ...input, master: input.master.map((l) => ({ ...l, source_monthly_basis: undefined, source_monthly: undefined })) });
      const s = buildAutoMix({ ...input, master });
      for (const p of base.proposals) {
        const q = s.proposals.find((x) => x.goal === p.goal);
        // מאוזן's status holds unless a threshold is genuinely crossed (audit W2: the solve sat on its own gate).
        if (q && p.goal === "balanced" && p.status !== q.status && p.status !== "unavailable" && q.status !== "unavailable")
          check(V.nearThreshold(p, base) || V.nearThreshold(q, s), `${id}/balanced @ balance×${db} rate${dr >= 0 ? "+" : ""}${dr}: status ${p.status} → ${q.status} away from every threshold`);
        if (!q || p.status !== "ok") continue;
        const moved = (x: Proposal) => new Map(x.moves.filter((m) => m.action !== "keep").map((m) => [input.master.findIndex((l) => l.id === m.id), m.balance]));
        const a = moved(p);
        const b = moved(q);
        const inter = Array.from(a.keys()).filter((k) => b.has(k)).reduce((t, k) => t + (a.get(k) ?? 0), 0);
        const union = Array.from(new Set([...Array.from(a.keys()), ...Array.from(b.keys())])).reduce((t, k) => t + (a.get(k) ?? b.get(k) ?? 0), 0);
        const jacc = union ? inter / union : 1;
        const share = (x: Proposal) => {
          const N = x.tranches.reduce((t, y) => t + y.amount, 0) || 1;
          const m = new Map<string, number>();
          for (const t of x.tranches) m.set(`${t.track}${t.segment}`, (m.get(`${t.track}${t.segment}`) ?? 0) + t.amount / N);
          return m;
        };
        const sa = share(p);
        const sb = share(q);
        const keys = new Set([...Array.from(sa.keys()), ...Array.from(sb.keys())]);
        const l1 = Array.from(keys).reduce((t, k) => t + Math.abs((sa.get(k) ?? 0) - (sb.get(k) ?? 0)), 0);
        const dMonthly = Math.abs(q.metrics.monthly - p.metrics.monthly * db) / Math.max(1, p.metrics.monthly);
        const changed = jacc < 0.75 || l1 > 0.4;
        // A structure change between two mixes that cost the same (to 0.3%) at
        // nearly the same payment is a tie the optimum sits on, not a flip.
        const dPaid = Math.abs(q.stress[0].totalPaid - p.stress[0].totalPaid * db) / Math.max(1, p.stress[0].totalPaid);
        const costTie = changed && dPaid < 0.003 && dMonthly <= 0.03;
        // מאוזן's own measure is t, the share of each anchor it gets: within the
        // search's own stopping tolerance (BALANCED_TOL, 0.03) two structures tie
        // on it (r04 at +0.05pp: t 0.661 against 0.643, two structures 4% apart in cost).
        const tTie = changed && p.goal === "balanced" && !!p.balance && !!q.balance && Math.abs(p.balance.t - q.balance.t) <= 0.03 && dMonthly <= 0.03;
        // קיצור שנים ends on a whole year: with its payment at its ceiling, a
        // ceiling that moves with today's payment crosses a year's boundary
        // (r01 at −0.05pp: 15 years at ₪12,582 of ₪12,583, then 16 years).
        // Its five-year guard is held at the same ceiling, so a guard that binds within the same 1% is the same threshold (r02 at −0.05pp: 20 years with the stress peak at the ceiling, then 21).
        const binds = (x: Proposal) => x.budget !== undefined && (x.metrics.monthly >= x.budget - Math.max(100, 0.01 * x.budget) || !guardOk(x.rows, input.inflation, x.budget - Math.max(100, 0.01 * x.budget)));
        const yearStep = p.goal === "years" && [p, q].some(binds) && (Math.abs(q.metrics.months - p.metrics.months) >= 12 || dPaid < 0.03);
        const tie = costTie || tTie || yearStep;
        if (tie) ties.push(`${id}/${p.goal} @ balance×${db} rate${dr >= 0 ? "+" : ""}${dr} (${yearStep ? "a whole year at the ceiling, " : tTie ? `t ${p.balance!.t} vs ${q.balance!.t}, ` : ""}cost Δ ${(dPaid * 100).toFixed(2)}%, payment Δ ${(dMonthly * 100).toFixed(1)}%)`);
        const flip = (changed && !tie) || (dMonthly > 0.03 && !yearStep);
        check(!flip, `${id}/${p.goal} @ balance×${db} rate${dr >= 0 ? "+" : ""}${dr}: moved-overlap ${jacc.toFixed(2)}, track-shift ${l1.toFixed(2)}, payment Δ ${(dMonthly * 100).toFixed(1)}%, cost Δ ${(dPaid * 100).toFixed(2)}%`);
      }
    }
  }
console.log(`  ${failures.filter((f) => f.includes("@ balance")).length} unstable answers · ${ties.length} near-ties (same cost, different structure):`);
for (const t of ties) console.log(`    ~ ${t}`);

/* ============================================ F2. monotonicity in the price of new money */

section("F2. monotonicity — new money 0.5 points dearer never improves a status (audit W1)");
{
  const rank = (s: Proposal["status"]) => (s === "ok" ? 0 : s === "no-gain" ? 1 : 2);
  let probes = 0;
  for (const { id, input, r } of reals) {
    if (!r.ok) continue;
    const dear = buildAutoMix({ ...input, profile: { ...input.profile, negotiated: (input.profile.negotiated || 0) - 0.5 } });
    for (const p of r.proposals) {
      const q = dear.proposals.find((x) => x.goal === p.goal);
      if (!q) continue;
      probes++;
      check(rank(q.status) >= rank(p.status), `${id}/${p.goal}: ${p.status} at market, ${q.status} with new money 0.5 points dearer`);
    }
  }
  console.log(`  ${probes} goal answers probed · ${failures.filter((f) => f.includes("0.5 points dearer")).length} improved with dearer money`);
}

/* ================================================================ G. optimality */

section("G. optimality — solver vs brute force (small cases)");
{
  const master = [
    row({ path_id: 1, amount: 300_000, rate: 6.2, months: 240, anchor_margin: 1.45, source_start_date: "01/06/2023" }),
    row({ path_id: 2, amount: 240_000, rate: 6.0, months: 264, source_start_date: "01/12/2023" }),
    row({ group: "loan", path_id: 1, amount: 90_000, rate: 10.5, months: 60, anchor_margin: 5.75, source_bank: "בנק לאומי" }),
  ];
  const input = inputOf(master);
  const prep = __test.prepare(input, forecast, []);
  if ("fail" in prep) check(false, "brute: prepare failed");
  else {
    const { ctx } = prep;
    const YEARS = [10, 20, 30];
    const cols = ctx.cols.filter((c) => YEARS.includes(c.years) && (c.segment === "allPurpose" ? c.track === "prime" || c.track === "klz" : c.track === "prime" || c.track === "klz" || c.track === "kz"));
    for (const goal of ["savings", "payment", "stable"] as GoalId[]) {
      const spec = __test.specFor(ctx, goal === "payment" ? { wMonthly: 1, wCost: 1e-3, lambda: 0, budget: null } : { wMonthly: 0, wCost: 1, lambda: __test.LAMBDA[goal], budget: ctx.budget, shareCap: goal !== "stable" });
      const plan = __test.solveTermsRaw(ctx.debts, cols, spec, []);
      // The same objective, evaluated directly.
      const lam = spec.lambda;
      const evalPlan = (z: boolean[], xs: { c: (typeof cols)[number]; a: number }[]) => {
        const paid = ECONOMIES.map((_, k) => ctx.debts.reduce((t, d, j) => t + (z[j] ? 0 : d.paid[k]), 0) + xs.reduce((t, x) => t + x.c.paid[k] * x.a, 0));
        const monthly = ctx.debts.reduce((t, d, j) => t + (z[j] ? 0 : d.monthly), 0) + xs.reduce((t, x) => t + x.c.monthly * x.a, 0);
        return { obj: spec.wMonthly * monthly + (spec.wCost * ((1 - lam) * paid[0] + lam * Math.max(...paid))) / 1000, monthly };
      };
      const solved = evalPlan(
        ctx.debts.map((d) => plan.refinance.includes(d.id)),
        Object.entries(plan.amounts).map(([k, a]) => ({ c: cols.find((c) => c.key === k)!, a }))
      );
      // Brute force: every refinance subset × one term per track × housing shares on a 5% grid × one all-purpose tranche.
      let best = Infinity;
      const H = ["prime", "klz", "kz"] as const;
      for (let mask = 0; mask < 1 << ctx.debts.length; mask++) {
        const z = ctx.debts.map((_, j) => !!(mask & (1 << j)));
        const needH = ctx.debts.reduce((t, d, j) => t + (z[j] && d.group === "mortgage" ? d.balance + d.fee : 0), 0);
        const needAp = ctx.debts.reduce((t, d, j) => t + (z[j] && d.group === "loan" ? d.balance + d.fee : 0), 0);
        const NH = needH ? needH + spec.setupHousing : 0;
        // The appraisal is one for the property: with the housing file open, the all-purpose one pays file and lien only.
        const NA = needAp ? needAp + spec.setupAp - (needH ? spec.setupApShared ?? 0 : 0) : 0;
        const apOptions = NA ? cols.filter((c) => c.segment === "allPurpose") : [null];
        for (const ap of apOptions)
          for (const y0 of YEARS)
            for (const y1 of YEARS)
              for (const y2 of YEARS)
                for (let a = 0; a <= 20; a++)
                  for (let b = 0; a + b <= 20; b++) {
                    const sh = [a / 20, b / 20, (20 - a - b) / 20];
                    const xs: { c: (typeof cols)[number]; a: number }[] = [];
                    let okk = true;
                    if (NH) {
                      [y0, y1, y2].forEach((y, i) => {
                        if (!sh[i]) return;
                        const c = cols.find((c) => c.segment === "housing" && c.track === H[i] && c.years === y);
                        if (!c) okk = false;
                        else xs.push({ c, a: sh[i] * NH });
                      });
                      const fixed = sh[1] + sh[2];
                      if (fixed < FIXED_MIN - 1e-9 || sh[2] > LINKED_MAX + 1e-9) okk = false;
                      if (spec.shareCap && sh.some((x, i) => !TRACK_SHARE_EXEMPT.includes(H[i]) && x * NH > TRACK_SHARE_MAX * NH + (1 - TRACK_SHARE_MAX) * 2 * MIN_TRANCHE)) okk = false;
                      const open = xs.filter((x) => x.a > 0);
                      if (open.length > 1 && open.some((x) => x.a < MIN_TRANCHE)) okk = false;
                    } else if (a || b) continue;
                    if (!okk) continue;
                    if (ap) {
                      if (ap.track !== "klz") continue; // one AP tranche must itself be ≥ ⅓ fixed
                      xs.push({ c: ap, a: NA });
                    }
                    const e = evalPlan(z, xs);
                    if (spec.budget !== null && e.monthly > spec.budget) continue;
                    if (e.obj < best) best = e.obj;
                  }
      }
      const gap = (solved.obj - best) / Math.abs(best);
      console.log(`  ${goal.padEnd(8)} solver ${solved.obj.toFixed(2)} · brute force ${best.toFixed(2)} · gap ${(gap * 100).toFixed(3)}%`);
      check(gap <= 0.0005, `optimality ${goal}: solver ${solved.obj} worse than brute force ${best} by ${(gap * 100).toFixed(3)}%`);
    }
  }
}

/* ================================================================ H. timing */

section("H. timing (Node)");
{
  const times = reals.map(({ id, input }) => {
    const t = performance.now();
    buildAutoMix(input);
    return [id, performance.now() - t] as const;
  });
  console.log("  " + times.map(([id, ms]) => `${id} ${ms.toFixed(0)}ms`).join(" · "));
  for (const [id, ms] of times) check(ms < 2000, `${id}: ${ms.toFixed(0)}ms`);
}

{
  const t = V.tally;
  const z = __test.SLIVER_STATS;
  console.log(`\n  slivers on the board: ${t.slivers} (${t.slivMarked} with a reason) · sliver pass: ${z.dropped} answers changed, at most ₪${fmt(z.cost)} (cost goals) and ₪${fmt(z.monthly)} a month (payment) given up`);
  console.log(`  מאוזן with both measures: ${t.balanced}, t lowest ${t.tN ? t.tLow.toFixed(3) : "-"}, mean ${t.tN ? (t.tSum / t.tN).toFixed(3) : "-"}`);
  const w = V.wave;
  console.log(`  wave 2: gates held in the search ${__test.GATE_STATS.n} · savings kept over the display repair ${__test.DISPLAY_STATS.held} · payment cost stage ${__test.PAYMENT_STAGE.n} answers, at most ₪${fmt(__test.PAYMENT_STAGE.saved)} · terms aligned ${__test.ALIGN_STATS.n} · relative guard ${w.guardRelative} · no guard ${w.guardNone} · held cheap ${w.heldCheap} · move groups ${w.moveGroups}`);
}
console.log(`\n${V.passed()} checks passed, ${failures.length} failed`);
for (const f of failures.slice(0, 80)) console.log("  ✗ " + f);
process.exit(failures.length ? 1 : 0);
