// SmartNPV parity, letter by letter: what SmartNPV builds from a bank payoff
// letter (its "סריקת דוח יתרות", tab משכנתא נוכחית) against what our import
// and engine build from the same PDF, priced on the same forecast.
//
//   npx tsx --tsconfig tsconfig.json scripts/snpv-parity.mts            # every captured letter
//   npx tsx --tsconfig tsconfig.json scripts/snpv-parity.mts "<file>"   # one
//   ... --rows                                                          # print every tranche
//   FORECAST=boi ... --gate      # the regression bar: exit 1 if any letter leaves SmartNPV (see the end)
//
// The letters and SmartNPV's readings of them live OUTSIDE git, beside the
// bank-letter corpus: ../Bank-Templates/*.pdf and ../Bank-Templates/snpv/
// captures.json — real clients' figures. A capture is SmartNPV's own output,
// read off its page after the scan: per tranche the inputs it imported
// (קרן, הצמדה, תקופה, עוגן, תוספת, ריבית, תדירות, הפרשי היוון) and the figures
// it computed (החזר ראשון, תשלומי ריבית והצמדה, שת"פ), plus the mix's totals.
//
// What is compared:
//   · the INPUTS each side read from the letter (a gap here is an import gap)
//   · per tranche, החזר ראשון (today's money) and ריבית והצמדה (Σ payments −
//     balance) on SmartNPV's forecast vectors, with the clock frozen at the
//     capture's day (months-to-reset are counted from today)
//   · the mix: סכום, ריבית והצמדה, עלות כוללת, החזר ראשון, החזר בשיא

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const REPO = process.cwd();
const LETTERS = path.join(REPO, "..", "Bank-Templates");
const CAPTURES = path.join(LETTERS, "snpv", "captures.json");
const FORECAST = path.join(REPO, "scripts", "fixtures", "snpv-forecast-2026-11-21.json");

const args = process.argv.slice(2);
const showRows = args.includes("--rows");
const jsonOut = args.find((a) => a.startsWith("--json="))?.slice(7);
const only = args.filter((a) => !a.startsWith("--"));

type SnpvRow = [
  string, string, string, string, string, string, string, string, string, string,
  string, string, string, string, string, string, number, number, number, number,
];
type Capture = {
  at: string; // yyyy-mm-dd, the day SmartNPV computed it
  bank: string;
  date: string;
  sum: [number, number, number, number, number, number, number, number];
  hdr: string;
  rows: SnpvRow[];
};

const captures: Record<string, Capture> = JSON.parse(fs.readFileSync(CAPTURES, "utf8"));
const files = Object.keys(captures).filter((f) => !only.length || only.includes(f)).sort();

// Freeze the clock per letter BEFORE the engine reads it. Imports read no clock.
const RealDate = Date;
let frozen = RealDate.now();
class FrozenDate extends RealDate {
  constructor(...a: unknown[]) {
    if (a.length === 0) super(frozen);
    else super(...(a as [number]));
  }
  static now() {
    return frozen;
  }
}
globalThis.Date = FrozenDate as DateConstructor;

const repo = (p: string) => pathToFileURL(path.join(REPO, p)).href;
const { parseBankStatement } = await import(repo("lib/bank-parser/index.ts"));
const { bankStatementToLoans } = await import(repo("lib/bank-parser/to-loans.ts"));
const { priceLoan, todayPayment, anchorReading } = await import(repo("app/aa102test/lib/price.ts"));
const { settleBuiltIns } = await import(repo("app/aa102test/lib/builtin.ts"));
const { loadBoi451, releaseOn, forecastFrom451 } = await import(repo("app/aa102test/lib/boi451.ts"));
const { mixFigures } = await import(repo("app/aa102test/lib/compare-metrics.ts"));
const { annualIRR } = await import(repo("app/aa102test/lib/yield.ts"));

const require = createRequire(path.join(REPO, "package.json"));
const pdfjs = await import(pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href);
try {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")).href;
} catch {}
const warn = console.warn;
console.warn = () => {};

const fx = JSON.parse(fs.readFileSync(FORECAST, "utf8"));
// FORECAST=boi prices on the curve the live board uses (our BoI fit, the copy
// in boi-last.json) instead of SmartNPV's own vectors: the gap that is left
// is the two curves, not the import.
const boiLast = JSON.parse(fs.readFileSync(path.join(REPO, "app/api/simulator/forecast/boi-last.json"), "utf8"));
const boiHist = JSON.parse(fs.readFileSync(path.join(REPO, "app/aa102test/lib/boi-snapshot.json"), "utf8")).history;
const forecast = process.env.FORECAST === "boi"
  ? { asOf: boiLast.asOf, source: "boi", label: "BoI", nominal: boiLast.nominal, inflation: boiLast.inflation, history: boiHist }
  : { asOf: "2026-11", source: "override", label: "SmartNPV", nominal: fx.nominal, inflation: fx.inflation, history: fx.history };
const econ = { inflation: 2, forecast };

const num = (s: string | number | null | undefined) => {
  if (s == null || s === "") return null;
  const n = Number(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};
const TRACK: Record<string, number> = { 'פריים': 1, 'קל"צ': 2, 'ק"צ': 3, 'מל"צ': 4, 'מק"מ': 4, 'מ"צ': 5, 'מט"ח דולר': 6, 'מט"ח יורו': 7 };

async function pagesOf(file: string) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path.join(LETTERS, file))), useSystemFonts: true, verbosity: 0 }).promise;
  const pages: any[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    pages.push({ page: n, items: (tc.items as any[]).filter((i) => i.str).map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width })) });
  }
  return pages;
}

type Side = {
  track: number;
  value: number; // קרן
  inflation: number; // הצמדה
  months: number;
  rate: number;
  margin: number | null;
  freq: number;
  fee: number;
  first: number; // החזר ראשון, today's money
  cost: number; // Σ payments − balance
  irr: number | null;
  label?: string;
};

const pad = (s: string | number, n: number) => String(s).padStart(n);
const f0 = (n: number | null | undefined) => (n == null ? "—" : Math.round(n).toLocaleString("en-US"));
const f2 = (n: number | null | undefined) => (n == null ? "—" : n.toFixed(2));

const report: any[] = [];
// BoI's 451 file + calendar, live, as the board reads them. Offline (or NO_451=1)
// the built-ins fall back to the history reading, exactly as the board would.
const boi451 = process.env.NO_451 ? null : await loadBoi451(30_000);
if (!boi451) console.log("(451 file unreachable — built-ins read from the history)");
let worst = 0;

for (const file of files) {
  const cap = captures[file];
  const [dd, mm, yy] = cap.date.split("/").map(Number);
  frozen = process.env.FRAME === "letter" ? new RealDate(yy, mm - 1, dd, 12).getTime() : new RealDate(`${cap.at}T12:00:00`).getTime();

  const st = parseBankStatement(await pagesOf(file));
  const loans = bankStatementToLoans(st, "mix", file).loans.filter((l: any) => Number(l.amount) > 0 && Number(l.months) > 0);
  // As the import does: a Mizrahi letter's built-in is solved on the 451 release
  // in force on the letter's own day (lib/builtin, Simulator#importDocument).
  const letterRow = boi451 ? releaseOn(boi451.rows, boi451.calendar, new RealDate(yy, mm - 1, dd, 12)) : null;
  const letterCurve = letterRow ? forecastFrom451(letterRow) : null;
  const settled = settleBuiltIns(loans, forecast, letterCurve);

  const ours: Side[] = settled.map((l: any) => {
    const r = priceLoan(l, econ);
    const pays = r.schedule.map((x: any) => x.payment);
    const total = pays.reduce((s: number, p: number) => s + p, 0);
    const reading = anchorReading(l, forecast);
    return {
      track: l.path_id,
      value: Number(l.amount) - (Number(l.indexation) || 0),
      inflation: Number(l.indexation) || 0,
      months: Number(l.months),
      rate: Number(l.rate),
      margin: reading ? reading.margin : l.anchor_margin ?? null,
      freq: Number(l.anchor_interval) || 0,
      fee: Number(l.prepayment_fee) || 0,
      first: (() => { const t = priceLoan(l, 2); return t.schedule[0] ? todayPayment(t, t.schedule[0].payment) : 0; })(),
      cost: total - Number(l.amount),
      irr: annualIRR(Number(l.amount), pays),
      label: l.lender_loan_number ?? "",
    };
  });

  const theirs: Side[] = cap.rows.map((r) => ({
    track: TRACK[r[2]] ?? 0,
    value: num(r[3]) ?? 0,
    inflation: num(r[4]) ?? 0,
    months: num(r[6]) ?? 0,
    rate: num(r[9]) ?? 0,
    margin: num(r[8]),
    freq: num(r[11]) ?? 0,
    fee: num(r[13]) ?? 0,
    first: r[16],
    cost: r[17],
    irr: r[18],
  }));

  // Pair rows: same balance (קרן + הצמדה) within ₪5, then nearest.
  const used = new Set<number>();
  const pairs: [Side | null, Side | null][] = [];
  for (const t of theirs) {
    let best = -1;
    let bestD = Infinity;
    ours.forEach((o, i) => {
      if (used.has(i)) return;
      const d = Math.abs(o.value + o.inflation - (t.value + t.inflation)) + Math.abs(o.rate - t.rate) * 1000 + Math.abs(o.months - t.months) * 10;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    if (best >= 0 && bestD < 50_000) {
      used.add(best);
      pairs.push([ours[best], t]);
    } else pairs.push([null, t]);
  }
  ours.forEach((o, i) => !used.has(i) && pairs.push([o, null]));

  // Mix totals.
  const X = mixFigures(settled, econ, 4);
  const oursTot = {
    balance: settled.reduce((s: number, l: any) => s + Number(l.amount), 0),
    cost: ours.reduce((s, o) => s + o.cost, 0),
    first: ours.reduce((s, o) => s + o.first, 0),
    // What the board's החזר חודשי shows: the printed charge per row where the letter gives one (boardMonthly).
    board: settled.reduce((s: number, l: any, i: number) => s + Math.round(Number(l.source_monthly) > 0 ? Number(l.source_monthly) : ours[i].first), 0),
    peak: X?.peak ?? 0,
    months: X?.months ?? 0,
  };
  const [sBal, sFirst, sPeak, , sTotal, sN] = cap.sum;
  const theirsTot = { balance: sBal, cost: sTotal - sBal, first: sFirst, peak: sPeak, months: sN };
  const costGap = oursTot.cost - theirsTot.cost;
  const costPct = (costGap / theirsTot.cost) * 100;
  worst = Math.max(worst, Math.abs(costPct));

  console.log(`\n=== ${file}  (${st.bank}, ${cap.date}, ${theirs.length} SNPV rows / ${ours.length} ours)`);
  console.log(
    `  סכום ${f0(oursTot.balance)} vs ${f0(theirsTot.balance)} | ריבית והצמדה ${f0(oursTot.cost)} vs ${f0(theirsTot.cost)} (${costGap >= 0 ? "+" : ""}${f0(costGap)}, ${costPct.toFixed(2)}%) | החזר ראשון ${f0(oursTot.first)} vs ${f0(theirsTot.first)} | שיא ${f0(oursTot.peak)} vs ${f0(theirsTot.peak)} | חודשים ${oursTot.months} vs ${theirsTot.months}`
  );

  const rowsOut: any[] = [];
  for (const [o, t] of pairs) {
    const issues: string[] = [];
    if (!o) issues.push("MISSING IN OURS");
    else if (!t) issues.push("EXTRA IN OURS");
    else {
      if (o.track !== t.track) issues.push(`track ${o.track}≠${t.track}`);
      if (Math.abs(o.value - t.value) > 1) issues.push(`קרן ${f0(o.value)}≠${f0(t.value)}`);
      if (Math.abs(o.inflation - t.inflation) > 1) issues.push(`הצמדה ${f0(o.inflation)}≠${f0(t.inflation)}`);
      if (o.months !== t.months) issues.push(`חודשים ${o.months}≠${t.months}`);
      if (Math.abs(o.rate - t.rate) > 0.005) issues.push(`ריבית ${o.rate}≠${t.rate}`);
      if (t.margin != null && o.margin != null && Math.abs(o.margin - t.margin) > 0.005 && [1, 4, 5].includes(t.track)) issues.push(`תוספת ${f2(o.margin)}≠${f2(t.margin)}`);
      if (Math.abs(o.fee - t.fee) > 1) issues.push(`היוון ${f0(o.fee)}≠${f0(t.fee)}`);
      if (Math.abs(o.first - t.first) > 1) issues.push(`החזר ${f2(o.first)}≠${f2(t.first)}`);
      const cg = o.cost - t.cost;
      if (Math.abs(cg) > Math.max(50, Math.abs(t.cost) * 0.002)) issues.push(`ריבית+הצמדה ${f0(o.cost)}≠${f0(t.cost)} (${cg > 0 ? "+" : ""}${f0(cg)})`);
    }
    rowsOut.push({ o, t, issues });
    if (showRows || issues.length) {
      const s = o ?? t!;
      console.log(
        `  ${issues.length ? "✗" : "✓"} p${s.track} ${pad(f0((t ?? o)!.value + (t ?? o)!.inflation), 9)} ${pad((t ?? o)!.months, 3)}m ${f2((t ?? o)!.rate)}%  ${issues.join(" · ") || ""}`
      );
    }
  }
  report.push({ file, bank: st.bank, ours: oursTot, theirs: theirsTot, costPct, rows: rowsOut });
}

console.log("\nריבית והצמדה, ours vs SmartNPV (worst first):");
for (const r of [...report].sort((a, b) => Math.abs(b.costPct) - Math.abs(a.costPct)))
  console.log(`  ${(r.costPct >= 0 ? "+" : "") + r.costPct.toFixed(2)}%  ${f0(r.ours.cost - r.theirs.cost).padStart(8)}  ${r.file}`);
const within = report.filter((r) => Math.abs(r.ours.cost - r.theirs.cost) <= 25).length;
console.log(`\n${files.length} letters · ${within} within ₪25 · worst ריבית והצמדה gap ${worst.toFixed(2)}%`);
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(report, null, 1));
console.warn = warn;

/* ------------------------------------------------------------------ gate */
// --gate: the regression bar. Every letter must land on SmartNPV's ריבית והצמדה
// within GATE_ILS or GATE_PCT, whichever is wider — EXCEPT where SmartNPV itself
// misreads the letter, each verified against the PDF and named here with the
// reason, at the size of SmartNPV's error (so a new gap on top still fails).
// Run it before any push that touches the parsers, the engine or the forecast.
const GATE_ILS = 50;
const GATE_PCT = 0.01;
const SNPV_MISREADS: Record<string, { gap: number; why: string }> = {
  // Part 13 (ק"צ 2.70%, ends 10/07/2026, ₪830.55/month) is on the letter and in
  // its own payoff total (₪62,677.73); SmartNPV's import drops it (₪50,976).
  "file.pdf": { gap: 340, why: "SmartNPV drops part 13 the letter lists" },
  // Ends 01/03/2034, letter 29/10/2026, the 01/11 payment still due (₪137.72
  // accrued since 01/10): 89 payments. SmartNPV counts 88 here, though on the
  // sister letter (19) it counts 01/02/2034 as 88 and 01/05/2027 as 7.
  "מזרחי דיין file (20).pdf": { gap: 380, why: "SmartNPV counts one payment short" },
};
if (args.includes("--gate")) {
  let bad = 0;
  for (const r of report) {
    const gap = r.ours.cost - r.theirs.cost;
    const known = SNPV_MISREADS[r.file];
    const limit = known ? Math.abs(known.gap) + GATE_ILS : Math.max(GATE_ILS, (Math.abs(r.theirs.cost) * GATE_PCT) / 100);
    if (Math.abs(gap) > limit) {
      bad++;
      console.log(`GATE FAIL  ${r.file}: ${gap >= 0 ? "+" : ""}${f0(gap)} (limit ±${f0(limit)})${known ? ` — known: ${known.why}` : ""}`);
    }
  }
  console.log(bad ? `\nGATE: ${bad} letter(s) off SmartNPV` : `\nGATE: all ${report.length} letters on SmartNPV (${Object.keys(SNPV_MISREADS).length} known SmartNPV misreads allowed)`);
  process.exit(bad ? 1 : 0);
}
