// תמהיל אוטומטי — the corpus and the fuzzer. Exits non-zero on any failure.
//
//   npx tsx --tsconfig tsconfig.json scripts/automix-corpus.mts [--n 400] [--seed 7] [--only letters|reports|fuzz]
//
//   L. every bank payoff letter in ../Bank-Templates (real clients' letters, outside
//      every repo), read exactly the way the Bay reads them, under a grid of client
//      profiles (none, typical, tight, override at a non-bank, the letter's own bank,
//      a budget below and above today, flat mode, inflation 0 and 5)
//   R. every credit report (and the household) under the same grid
//   Z. seeded random households: any track, schedule, grace, balance, rate, term,
//      lender, guarantee, eligibility loan, stated fee, CPI indexation, past-due
//      row, report arrears, enforcement, insolvency, and any client profile
//
//   On every build: the proof's invariants (automix-verify.mts), no NaN/Infinity
//   anywhere, no "undefined"/"NaN" in a shown string, determinism, and two
//   metamorphic laws: re-ordering the master changes no figure, and a larger
//   budget never makes a budget goal worse.
//
// Prints figures only. Letters are numbered, never named: their file names
// carry client names.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { household, FIXTURE_SETS } from "./automix-fixtures.mts";
import { verifier } from "./automix-verify.mts";
import { buildAutoMix, DEFAULT_PROFILE, __test, type AutoMixInput, type AutoMixResult, type ClientProfile, type GoalId } from "../app/aa105test/lib/automix";
import { parseBankStatement, detectBank } from "../lib/bank-parser/index";
import { bankStatementToLoans } from "../lib/bank-parser/to-loans";
import { latestCurve } from "../app/aa107test/lib/market-boi";
import type { MarketSnapshot, BankId } from "../app/aa107test/lib/market";
import type { ImportedLoan } from "../app/aa102test/lib/credit";
import snapshotJson from "../app/aa107test/lib/market-snapshot.json" with { type: "json" };

const argAfter = (flag: string) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : null;
};
const N = Number(argAfter("--n") ?? 400);
const SEED = Number(argAfter("--seed") ?? 7);
const ONLY = argAfter("--only");
const DUMP = argAfter("--dump");
const FAILS = argAfter("--fails");
if (DUMP) fs.mkdirSync(DUMP, { recursive: true });
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
const V = verifier(market, forecast);
const { check, failures, verify, verifyOverride, lint, basketLaw } = V;
const fmt = (x: number) => Math.round(x).toLocaleString("en-US");
const section = (s: string) => console.log(`\n### ${s}`);
const BUDGET_GOALS: GoalId[] = ["years", "savings", "stable", "balanced", "consolidate"];

const inputOf = (master: ImportedLoan[], over: Partial<AutoMixInput> = {}, profile: Partial<ClientProfile> = {}): AutoMixInput => ({
  master,
  market,
  forecast,
  forecastOn: true,
  inflation: 2,
  discountRate: 4.5,
  profile: { ...DEFAULT_PROFILE, ...profile },
  analysis: null,
  ...over,
});

/* ------------------------------------------------------------ the laws on one build */

/** Every number finite, every shown string free of "NaN"/"undefined"/"Infinity". */
function sane(name: string, r: AutoMixResult) {
  const bad: string[] = [];
  const walk = (x: unknown, at: string) => {
    if (typeof x === "number") {
      if (!Number.isFinite(x)) bad.push(`${at}=${x}`);
    } else if (typeof x === "string") {
      if (/NaN|undefined|Infinity|\[object/.test(x)) bad.push(`${at}: ${x.slice(0, 90)}`);
    } else if (Array.isArray(x)) x.forEach((v, i) => walk(v, `${at}[${i}]`));
    else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) if (k !== "rows") walk(v, `${at}.${k}`);
  };
  walk({ ...r, ms: 0 }, "r");
  check(bad.length === 0, `${name}: not finite or broken text: ${bad.slice(0, 3).join(" | ")}`);
}

/** What a build shows, without ids (the parser and the fuzzer mint them). */
function figures(r: AutoMixResult) {
  return JSON.stringify({
    ok: r.ok,
    today: [r.today.monthly, r.today.months, Math.round(r.today.totalPaid)],
    p: r.proposals.map((p) => [p.goal, p.status, p.metrics.monthly, p.metrics.months, Math.round(p.metrics.totalPaid), Math.round(p.metrics.totalCost), p.tranches.map((t) => `${t.track}/${t.segment}/${t.amount}/${t.years}`).sort().join(",")]),
  });
}

/** One build under every law; returns it for the caller's own checks. */
function run(name: string, input: AutoMixInput, opts: { ok?: boolean; laws?: boolean } = {}): AutoMixResult | null {
  let r: AutoMixResult;
  try {
    r = buildAutoMix(input);
  } catch (e) {
    check(false, `${name}: threw ${(e as Error).message?.slice(0, 160)}`);
    return null;
  }
  sane(name, r);
  // 4 s (3 s before audit 3's fixes): מאוזן's point is refined on the whole problem, which costs the largest
  // household 0.3 s (r02 typical 2.6 → 3.0 s idle) and buys ₪25–30k of forecast saving at the same relief on r01
  // and r01+r02 typical. The 3 s limit left 45 ms of room and failed under a second process.
  check(r.ms < 4000, `${name}: ${r.ms.toFixed(0)}ms`);
  if (r.ok) verify(name, input, r, { ok: opts.ok ?? r.ok });
  else {
    lint(name, r);
    check(!!r.reason, `${name}: not ok without a reason`);
  }
  verifyOverride(name, input, r);
  if (opts.laws === false || !r.ok) return r;
  // Determinism, and order: the master read in reverse shows the same figures.
  const again = buildAutoMix(input);
  check(JSON.stringify({ ...again, ms: 0 }) === JSON.stringify({ ...r, ms: 0 }), `${name}: two runs differ`);
  const rev = buildAutoMix({ ...input, master: [...input.master].reverse() });
  check(figures(rev) === figures(r), `${name}: re-ordering the master changes the figures`);
  return r;
}

/**
 * A larger budget only widens what a budget goal may build: it can never come
 * out worse on its own measure. The default budget is the reference payment.
 */
/** Law comparisons set aside by a documented exemption (printed with the tallies). */
const LAW_SKIPS = { guardTier: 0, cheapLift: 0 };
function budgetLaw(name: string, input: AutoMixInput, r: AutoMixResult) {
  if (!r.ok || input.profile.budget) return;
  const base = r.dueNow?.budget ?? r.today.monthly;
  // Above every default ceiling, קיצור שנים's (today's payment + YEARS_STRETCH) included.
  const wide = buildAutoMix({ ...input, profile: { ...input.profile, budget: Math.round(base * 1.1 + 1500) } });
  for (const g of BUDGET_GOALS) {
    const a = r.proposals.find((p) => p.goal === g);
    const b = wide.proposals.find((p) => p.goal === g);
    if (!a || !b || a.status !== "ok") continue;
    const tag = `${name}/${g} budget +1,500`;
    // The goal's OWN objective may never get worse. Its status may: the
    // break-even gate sits outside the solve, and a wider budget can buy a mix
    // whose costs come back later. Only "years" holds its status (its objective
    // is the months themselves), unless the wider answer sits on "no more in
    // total than the reference" (fuzz Z312: the same 144 months, ₪829 over on
    // ₪1.2M paid, where the lower ceiling's mix had passed).
    if (g === "years") check(b.status === "ok" || V.nearThreshold(b, wide), `${tag}: was ok, now ${b.status}`);
    if (b.status === "unavailable") {
      check(false, `${tag}: was ok, now unavailable`);
      continue;
    }
    // CHEAP_KEEP is lifted only when the goal has no answer with it (rules.ts):
    // the lower ceiling may have had to move a cheap debt the higher one keeps,
    // and moving it can lower the goal's own objective (fuzz Z36 savings: two
    // debts moved at the lower ceiling and kept at the higher, 1.2% apart). The
    // objectives are compared when both answers hold the same debts.
    if (b.moves.some((m) => m.heldCheap !== undefined && a.moves.find((x) => x.id === m.id)?.action !== "keep")) {
      LAW_SKIPS.cheapLift++;
      continue;
    }
    // The five-year guard is tiered (absolute, then relative to today's own
    // peak): a higher ceiling can bring the absolute guard within reach, and
    // the stronger guard may end later than the relative one did at the lower
    // ceiling (fuzz Z327: relative 252 months, absolute 312). The end is
    // compared under the same guard only.
    if (g === "years" && a.guard?.kind !== b.guard?.kind) LAW_SKIPS.guardTier++;
    else if (g === "years") check(b.metrics.months <= a.metrics.months, `${tag}: ends later ${b.metrics.months} > ${a.metrics.months}`);
    // Savings minimises its own objective (forecast paid, ¾ base + ¼ worst economy), not the typed cost.
    const J = (p: (typeof a)) => 0.75 * p.stress[0].totalPaid + 0.25 * Math.max(...p.stress.map((x) => x.totalPaid));
    if (g === "savings") check(J(b) <= J(a) * 1.0005 + 500, `${tag}: savings objective worse ${fmt(J(b))} > ${fmt(J(a))}`);
    // Stability's own objective is the rise of its payment in the worst economy, then the cost within STABLE_BAND
    // of the least rise (rules.ts): a wider budget may buy a steadier mix at a higher cost (fuzz Z402: rise ₪148 → ₪1,
    // +0.3% on the cost), and that is not compared on cost. The rise itself is not compared: the solver holds each
    // track's own peak summed, a bound on the mix's peak, and a lower bound can come with a higher true peak on the
    // rows (Z27: ₪120 → ₪189 on the rows at ₪26k less cost).
    const W = (p: (typeof a)) => 0.05 * p.stress[0].totalPaid + 0.95 * Math.max(...p.stress.map((x) => x.totalPaid));
    const rise = (p: (typeof a)) => Math.max(...p.stress.map((x) => x.peakMonthly)) - p.metrics.monthly;
    if (g === "stable" && rise(b) >= rise(a) - Math.max(20, 0.005 * base)) check(W(b) <= W(a) * 1.0005 + 500, `${tag}: stable objective worse ${fmt(W(b))} > ${fmt(W(a))}`);
  }
}

/**
 * מאוזן's status does not flip on a 0.05-point change in the price of new money
 * (profile.negotiated ±0.05), unless the proposal sits at a threshold the
 * change genuinely crosses (verify nearThreshold). Audit W2: with the solve
 * aimed exactly at its own gate, L02, L16, L18, L43 and L44 went ok → no-gain and
 * L01, L21 the other way, and the recommendation moved with them.
 */
function negotiatedLaw(name: string, input: AutoMixInput, r: AutoMixResult) {
  if (!r.ok) return;
  const a = r.proposals.find((p) => p.goal === "balanced");
  if (!a || a.status === "unavailable") return;
  for (const dn of [0.05, -0.05]) {
    const s = buildAutoMix({ ...input, profile: { ...input.profile, negotiated: (input.profile.negotiated || 0) + dn } });
    const b = s.proposals.find((p) => p.goal === "balanced");
    if (!b || b.status === a.status) continue;
    check(V.nearThreshold(a, r, Math.abs(dn)) || V.nearThreshold(b, s, Math.abs(dn)), `${name}/balanced negotiated ${dn > 0 ? "+" : ""}${dn}: ${a.status} → ${b.status} away from every threshold (${b.note ?? a.note ?? ""})`);
  }
}

/**
 * Input equivalence (audit S1): leaving the budget empty and typing today's
 * payment into it are the same instruction, so every goal but קיצור שנים (whose
 * +10% stretch is by design for an empty budget only) shows the same answer.
 * Savings is compared on its own objective within DISPLAY_GIVE, the rest on
 * their figures.
 */
const EQUIV = { n: 0, differ: 0 };
function budgetEquivalenceLaw(name: string, input: AutoMixInput, r: AutoMixResult) {
  if (!r.ok || input.profile.budget) return;
  const today = r.dueNow?.reference.monthly ?? r.today.monthly;
  const typed = buildAutoMix({ ...input, profile: { ...input.profile, budget: today } });
  EQUIV.n++;
  let differ = false;
  for (const a of r.proposals) {
    if (a.goal === "years") continue;
    const b = typed.proposals.find((p) => p.goal === a.goal);
    if (!b) continue;
    const tag = `${name}/${a.goal} budget empty vs ₪${fmt(today)}`;
    check(a.status === b.status, `${tag}: ${a.status} → ${b.status}`);
    if (a.status !== b.status) differ = true;
    if (a.status === "unavailable" || b.status === "unavailable") continue;
    const J = (p: (typeof a)) => 0.75 * p.stress[0].totalPaid + 0.25 * Math.max(...p.stress.map((x) => x.totalPaid));
    const give = 0.001 * (a.stress[0]?.todayTotalPaid ?? 0);
    if (a.goal === "savings") {
      check(Math.abs(J(a) - J(b)) <= give + 1, `${tag}: savings objective ${fmt(J(a))} → ${fmt(J(b))}`);
      if (Math.abs(J(a) - J(b)) > give + 1) differ = true;
    } else if (a.metrics.monthly !== b.metrics.monthly || Math.abs(a.stress[0].totalPaid - b.stress[0].totalPaid) > give + 1) {
      check(false, `${tag}: ₪${fmt(a.metrics.monthly)}/${fmt(a.stress[0].totalPaid)} → ₪${fmt(b.metrics.monthly)}/${fmt(b.stress[0].totalPaid)}`);
      differ = true;
    }
  }
  if (differ) EQUIV.differ++;
}

/**
 * A bankPremium client at the bank that holds the mortgage pays the bank's
 * difference or the premium, never both (audit U4): picking that bank in the
 * profile prices the new money exactly as the automatic internal refinance does.
 */
function ownBankLaw(name: string, none: AutoMixResult | null, own: AutoMixResult | null, bank: BankId) {
  if (!none?.ok || !own?.ok || none.pricing.tier !== "bankPremium" || bank === "system" || none.pricing.bank !== bank) return;
  check(JSON.stringify(none.pricing.rows) === JSON.stringify(own.pricing.rows), `${name}: own bank picked prices new money differently from the internal refinance (${JSON.stringify(own.pricing.rows[0])} vs ${JSON.stringify(none.pricing.rows[0])})`);
}

/* ------------------------------------------------------------ the profile grid */

const BANK_OF: [RegExp, BankId][] = [
  [/פועלים/, "Hapoalim"],
  [/לאומי/, "Leumi"],
  [/מרכנתיל/, "Mercantile"],
  [/דיסקונט/, "Discount"],
  [/מזרחי|טפחות/, "Mizrahi Tefahot"],
  [/בינלאומי/, "Habeinleumi"],
  [/ירושלים/, "Jerusalem"],
];
const bankOf = (l: ImportedLoan[]): BankId => {
  const s = l.find((x) => x.group === "mortgage")?.source_bank ?? "";
  return BANK_OF.find(([re]) => re.test(s))?.[1] ?? "system";
};

type Grid = { tag: string; over?: Partial<AutoMixInput>; profile?: Partial<ClientProfile>; laws?: boolean };
function grid(master: ImportedLoan[], monthly: number): Grid[] {
  const owed = master.filter((l) => !l.is_guarantor);
  const mort = owed.filter((l) => l.group !== "loan").reduce((a, l) => a + Number(l.amount || 0), 0);
  const prop = (ltv: number) => (mort > 0 ? Math.round(mort / ltv / 10_000) * 10_000 : null);
  const inc = (pti: number) => Math.max(4_000, Math.round(monthly / pti / 100) * 100);
  return [
    { tag: "none" },
    { tag: "typical", profile: { income: inc(0.3), propertyValue: prop(0.5), age: 42 } },
    { tag: "tight", profile: { income: inc(0.47), propertyValue: prop(0.72), age: 58 }, laws: false },
    { tag: "own-bank", profile: { bank: bankOf(master) }, laws: false },
    { tag: "nonbank+override", profile: { tier: "nonbank", override: true, propertyValue: prop(0.55) }, laws: false },
    { tag: "budget-low", profile: { budget: Math.max(500, Math.round(monthly - 700)) }, laws: false },
    { tag: "flat", over: { forecastOn: false }, laws: false },
    { tag: "infl0", over: { inflation: 0 }, laws: false },
    { tag: "infl5", over: { inflation: 5 }, laws: false },
  ];
}

const status = (r: AutoMixResult | null) =>
  !r ? "THREW" : !r.ok ? `!ok ${r.reason?.slice(0, 40)}` : r.proposals.map((p) => `${p.goal.slice(0, 4)}:${p.status === "ok" ? "ok" : p.status === "no-gain" ? "ng" : "na"}${p.status === "ok" ? `(${fmt(p.delta.monthly)})` : ""}`).join(" ");

/* ================================================================ L. bank letters */

const LETTERS = path.resolve(process.cwd(), "../Bank-Templates");
if (!ONLY || ONLY === "letters") {
  section("L. bank payoff letters (numbered, never named)");
  const require = createRequire(path.join(process.cwd(), "package.json"));
  const pdfjs = await import(pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href);
  try {
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")).href;
  } catch {}
  const warn = console.warn;
  console.warn = () => {};
  const files = fs.readdirSync(LETTERS).filter((f) => /\.pdf$/i.test(f)).sort();
  let n = 0;
  let read = 0;
  for (const file of files) {
    const id = `L${String(++n).padStart(2, "0")}`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path.join(LETTERS, file))), useSystemFonts: true, verbosity: 0 }).promise;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pages: any[] = [];
    for (let k = 1; k <= doc.numPages; k++) {
      const tc = await (await doc.getPage(k)).getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pages.push({ page: k, items: (tc.items as any[]).filter((i) => i.str).map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width })) });
    }
    if (!pages.some((p) => p.items.some((i: { str: string }) => i.str.trim())) || !detectBank(pages)) {
      console.log(`  ${id} not a readable letter (image or unknown bank)`);
      continue;
    }
    const st = parseBankStatement(pages);
    const master: ImportedLoan[] = bankStatementToLoans(st, "mix", file).loans;
    if (!master.length) {
      console.log(`  ${id} ${st.bank}: no rows`);
      continue;
    }
    read++;
    const base = buildAutoMix(inputOf(master));
    let none: AutoMixResult | null = null;
    for (const g of grid(master, base.today.monthly)) {
      const input = inputOf(master, g.over, g.profile);
      const r = run(`${id}/${g.tag}`, input, { laws: g.laws });
      if (g.tag === "none" && r) {
        none = r;
        budgetLaw(`${id}/${g.tag}`, input, r);
        negotiatedLaw(`${id}/${g.tag}`, input, r);
        budgetEquivalenceLaw(`${id}/${g.tag}`, input, r);
      }
      if (g.tag === "own-bank") ownBankLaw(`${id}/own-bank`, none, r, bankOf(master));
      if ((g.tag === "none" || g.tag === "typical") && r) basketLaw(`${id}/${g.tag}`, input, r);
      if (g.tag === "none" || g.tag === "typical") console.log(`  ${id} ${String(st.bank).padEnd(10)} ${String(master.length).padStart(2)} rows ${fmt(base.today.monthly).padStart(7)}/mo ${g.tag.padEnd(8)} ${r?.pricing.tier ?? ""} ${(r?.ms ?? 0).toFixed(0).padStart(4)}ms ${status(r)}`);
    }
  }
  console.warn = warn;
  console.log(`  ${read} letters built under ${grid([], 1).length} profiles each`);
  check(read >= 30, `only ${read} letters read`);
}

/* ================================================================ R. credit reports */

if (!ONLY || ONLY === "reports") {
  section("R. credit reports under the profile grid");
  for (const s of FIXTURE_SETS) {
    const h = await household(s.id, s.files);
    const base = buildAutoMix(inputOf(h.master, { analysis: h.analysis }));
    let none: AutoMixResult | null = null;
    for (const g of grid(h.master, base.today.monthly)) {
      const input = inputOf(h.master, { analysis: h.analysis, ...g.over }, g.profile);
      const r = run(`${s.id}/${g.tag}`, input, { laws: g.laws });
      if (g.tag === "none" && r) {
        none = r;
        budgetLaw(`${s.id}/${g.tag}`, input, r);
        negotiatedLaw(`${s.id}/${g.tag}`, input, r);
        budgetEquivalenceLaw(`${s.id}/${g.tag}`, input, r);
      }
      if (g.tag === "own-bank") ownBankLaw(`${s.id}/own-bank`, none, r, bankOf(h.master));
      if ((g.tag === "none" || g.tag === "typical") && r) basketLaw(`${s.id}/${g.tag}`, input, r);
      if (g.tag === "typical" || g.tag === "tight") console.log(`  ${s.id.padEnd(8)} ${g.tag.padEnd(8)} ${r?.pricing.tier ?? ""} ${(r?.ms ?? 0).toFixed(0).padStart(4)}ms ${status(r)}`);
    }
  }
}

/* ================================================================ Z. fuzz */

if (!ONLY || ONLY === "fuzz") {
  section(`Z. ${N} random households (seed ${SEED})`);
  let s = SEED >>> 0;
  const rnd = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const chance = (p: number) => rnd() < p;
  const between = (a: number, b: number) => a + (b - a) * rnd();
  const logU = (a: number, b: number) => Math.round(Math.exp(between(Math.log(a), Math.log(b))));
  const LENDERS = ['בנק הפועלים בע"מ', 'בנק לאומי לישראל בע"מ', 'בנק מזרחי טפחות בע"מ', 'בנק דיסקונט לישראל בע"מ', 'הבנק הבינלאומי הראשון לישראל בע"מ', 'בנק ירושלים בע"מ', 'בנק מרכנתיל דיסקונט בע"מ'];
  const CONSUMER = ["מקס איט פיננסים", "כרטיסי אשראי לישראל", "ישראכרט", "מימון ישיר", "בנק לאומי לישראל בע\"מ", ""];
  let seq = 0;
  const date = () => `01/${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}/${2004 + Math.floor(rnd() * 23)}`;
  const mortgageRow = (bank: string): ImportedLoan => {
    const path_id = pick([1, 1, 2, 2, 3, 3, 4, 5]);
    const amount = chance(0.03) ? pick([1, 50, 999]) : logU(8_000, 2_400_000);
    const linked = path_id === 3 || path_id === 5;
    const rate = chance(0.04) ? pick([0, 0.01, 14.5]) : Math.round(between(linked ? 0.5 : 1.8, linked ? 5.5 : 8.2) * 100) / 100;
    const sched = chance(0.88) ? 1 : pick([2, 3, 4]);
    const grace = chance(0.06) ? pick([2, 3]) : 1;
    return {
      id: `z${++seq}`,
      mix_id: "m",
      group: "mortgage",
      path_id,
      amount,
      rate,
      months: chance(0.04) ? 0 : chance(0.03) ? 1 : Math.floor(between(6, 420)),
      amortization_schedule_id: sched,
      grace_type_id: grace,
      grace_months: grace === 1 ? 0 : Math.floor(between(1, 36)),
      anchor_margin: path_id === 1 || path_id === 4 || path_id === 5 ? Math.round(between(-1.2, 3) * 100) / 100 : null,
      source_bank: bank,
      source_start_date: chance(0.9) ? date() : undefined,
      indexation: linked && chance(0.6) ? Math.round(amount * between(0, 0.18)) : undefined,
      prepayment_fee: chance(0.15) ? Math.round(amount * between(0, 0.06)) : undefined,
      source_eligibility: path_id === 3 && chance(0.12) ? true : undefined,
      is_guarantor: chance(0.03) ? true : undefined,
    } as unknown as ImportedLoan;
  };
  const loanRow = (): ImportedLoan =>
    ({
      id: `z${++seq}`,
      mix_id: "m",
      group: "loan",
      path_id: pick([1, 2, 2, 2]),
      amount: chance(0.05) ? pick([1, 120, 700]) : logU(1_000, 450_000),
      rate: chance(0.04) ? pick([0, 24.9]) : Math.round(between(3.5, 17) * 100) / 100,
      months: chance(0.06) ? 0 : Math.floor(between(1, 120)),
      amortization_schedule_id: chance(0.93) ? 1 : pick([2, 4]),
      grace_type_id: 1,
      grace_months: 0,
      anchor_margin: null,
      source_bank: pick(CONSUMER),
      source_start_date: chance(0.8) ? date() : undefined,
      is_guarantor: chance(0.06) ? true : undefined,
    }) as unknown as ImportedLoan;
  type LineIn = { balance: number; overdue?: number; arrearsRange?: string; category?: string; bank?: string; chargeNotPaid?: boolean };
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

  const tally = { ok: 0, notOk: 0, threw: 0, okGoals: 0, ngGoals: 0, naGoals: 0, slow: 0 };
  let worstMs = 0;
  for (let k = 0; k < N; k++) {
    const bank = pick(LENDERS);
    const nm = chance(0.08) ? 0 : 1 + Math.floor(rnd() * 7);
    const nl = chance(0.4) ? 0 : 1 + Math.floor(rnd() * 5);
    const master = [...Array.from({ length: nm }, () => mortgageRow(chance(0.92) ? bank : pick(LENDERS))), ...Array.from({ length: nl }, loanRow)];
    if (!master.length) master.push(loanRow());
    if (nm && chance(0.15)) (master[0] as ImportedLoan & { source_refs?: string[] }).source_refs = ["r#0"];
    const shape = rnd();
    const analysis =
      shape < 0.72
        ? null
        : shape < 0.8
          ? analysisOf({ lines: [{ balance: logU(2_000, 120_000), overdue: logU(500, 40_000), arrearsRange: pick(["30-59", "60-89", "90-119", "120+"]) }], flags: ["arrears-now"], overdue: 9_000, arrearsMonths: 2 })
          : shape < 0.86
            ? analysisOf({ execution: logU(3_000, 250_000), flags: ["execution"] })
            : shape < 0.9
              ? analysisOf({ insolvency: pick(["insolvency", "bankruptcy"] as const) })
              : shape < 0.95 && master[0]?.group === "mortgage"
                ? analysisOf({ lines: [{ balance: Number(master[0].amount), overdue: logU(2_000, 30_000), arrearsRange: pick(["30-59", "90-119"]), category: "mortgage", bank: "מזרחי טפחות" }], flags: ["arrears-now"], overdue: 8_000, arrearsMonths: 3 })
                : analysisOf({});
    const mort = master.filter((l) => l.group === "mortgage" && !l.is_guarantor).reduce((a, l) => a + Number(l.amount), 0);
    const profile: Partial<ClientProfile> = {
      income: chance(0.5) ? logU(3_000, 90_000) : null,
      propertyValue: chance(0.55) && mort > 0 ? Math.round(mort / between(0.15, 0.95)) : chance(0.1) ? logU(300_000, 6_000_000) : null,
      propertyType: pick(["single", "single", "replacement", "investment"] as const) as ClientProfile["propertyType"],
      age: chance(0.5) ? Math.floor(between(21, 92)) : null,
      bank: chance(0.2) ? pick(["Hapoalim", "Leumi", "Discount", "Mizrahi Tefahot", "Habeinleumi", "Mercantile", "Jerusalem"] as BankId[]) : "system",
      negotiated: chance(0.2) ? Math.round(between(0, 0.6) * 100) / 100 : 0,
      budget: chance(0.2) ? logU(800, 40_000) : null,
      consolidate: chance(0.85),
      tier: chance(0.75) ? "auto" : pick(["bank", "bankPremium", "nonbank"] as const),
      override: chance(0.35),
    };
    const over: Partial<AutoMixInput> = {
      analysis,
      forecastOn: chance(0.85),
      inflation: pick([0, 1.5, 2, 2, 3, 6]),
      discountRate: pick([3, 4.5, 4.5, 6]),
      ...(chance(0.04) ? { forecast: null } : {}),
    };
    const input = inputOf(master, over, profile);
    const name = `Z${k}`;
    const r = run(name, input, { laws: k % 3 === 0, ok: undefined });
    if (!r) {
      tally.threw++;
      continue;
    }
    worstMs = Math.max(worstMs, r.ms);
    if (r.ms > 2000) tally.slow++;
    if (r.ok) {
      tally.ok++;
      for (const p of r.proposals) p.status === "ok" ? tally.okGoals++ : p.status === "no-gain" ? tally.ngGoals++ : tally.naGoals++;
      if (k % 3 === 0) budgetLaw(name, input, r);
    } else tally.notOk++;
    // A failing case is written out (synthetic figures only) so it can be rebuilt: --dump DIR.
    if (DUMP && failures.some((f) => f.startsWith(`${name}:`) || f.startsWith(`${name}/`)))
      fs.writeFileSync(path.join(DUMP, `${name}.json`), JSON.stringify({ seed: SEED, k, input: { ...input, market: undefined, forecast: input.forecast ? "curve" : null } }, null, 1));
  }
  console.log(`  built ${tally.ok} · not ok ${tally.notOk} · threw ${tally.threw} · goals ok ${tally.okGoals} / no-gain ${tally.ngGoals} / unavailable ${tally.naGoals} · slowest ${worstMs.toFixed(0)}ms (${tally.slow} over 2s)`);
}

{
  const t = V.tally;
  console.log(`\n  slivers on the board: ${t.slivers} (${t.slivMarked} with a reason) · מאוזן with both measures: ${t.balanced}, t lowest ${t.tN ? t.tLow.toFixed(3) : "-"}, mean ${t.tN ? (t.tSum / t.tN).toFixed(3) : "-"}`);
  const z = __test.SLIVER_STATS;
  console.log(`  sliver pass: ${z.dropped} answers changed, at most ₪${fmt(z.cost)} (cost goals, risk-weighted) and ₪${fmt(z.monthly)} a month (payment) given up`);
  const w = V.wave;
  console.log(`  wave 2: gates refused / then passed in the search, by goal and gate: ${Object.entries(__test.GATE_STATS.by as Record<string, { refused: number; passed: number }>).sort().map(([k, x]) => `${k} ${x.refused}/${x.passed}`).join(", ") || "none"}`);
  console.log(`  wave 2: gates held in the search ${__test.GATE_STATS.n} · savings kept over the display repair ${__test.DISPLAY_STATS.held} · payment cost stage ${__test.PAYMENT_STAGE.n} answers, at most ₪${fmt(__test.PAYMENT_STAGE.saved)} saved · payment swap repair ${__test.SWAP_STATS.n} · terms aligned ${__test.ALIGN_STATS.n}`);
  console.log(`  wave 2: relative guard ${w.guardRelative} · no guard ${w.guardNone} · debts held cheap ${w.heldCheap} · move groups ${w.moveGroups} · stale-prime words ${w.staleWords} · no recommendation with ok goals ${w.recNull} · budget equivalence ${EQUIV.n - EQUIV.differ}/${EQUIV.n} identical · years ends not compared across guard tiers ${LAW_SKIPS.guardTier} · budget objectives not compared where the lower ceiling lifted CHEAP_KEEP ${LAW_SKIPS.cheapLift}`);
}
console.log(`\n${V.passed()} checks passed, ${failures.length} failed`);
const groups = new Map<string, string[]>();
for (const f of failures) {
  const key = f.replace(/^[^:]*:\s*/, "").replace(/[\d,.]+/g, "#").slice(0, 70);
  groups.set(key, [...(groups.get(key) ?? []), f]);
}
for (const [, fs_] of [...groups].sort((a, b) => b[1].length - a[1].length).slice(0, 40)) console.log(`  ✗ ×${fs_.length} ${fs_[0].slice(0, 260)}`);
if (FAILS) fs.writeFileSync(FAILS, failures.join(String.fromCharCode(10)));
process.exit(failures.length ? 1 : 0);
