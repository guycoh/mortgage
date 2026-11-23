// תמהיל אופטימלי — הפרשי היוון: the estimator (app/aa105test/lib/automix/fees.ts)
// against the fees bank payoff letters PRINT. Exits non-zero on any failure.
//
//   npx tsx --tsconfig tsconfig.json scripts/automix-fees-check.mts [--rows]
//
//   T. the ground truth: every letter in ../Bank-Templates (real clients' letters,
//      outside every repo), read the way the Bay reads them; one unit per printed
//      part, one per LOAN at Hapoalim (it prints the fee per loan, and its figure
//      holds the 0.1% notice fee and, on days 1–15, the CPI-averaging fee, both
//      taken off here); every fee estimated AS OF ITS LETTER'S DATE
//   L. letter mode: the row as the letter gives it, its printed fee removed
//   R. report mode: the row cut down to what a credit report carries (balance,
//      rate, months left, schedule, day given, final payment) — the error the
//      engine runs with; and the same without the day given
//   H. the alternatives: each FeeReading choice flipped, and "as of today"
//   O. out of sample: the reading chosen without the held-out letter (and
//      without the held-out bank), then the held-out part's error; FEE_BAND
//      rebuilt without each letter and whether it held that letter's ratios
//   W. stated fees: a printed negative difference is a stated zero (§7(ב))
//
// Per table: units, Σ printed, Σ estimate, Σ |error|, and over units with a
// printed fee of ₪100 or more the median and 10–90% band of estimate ÷ printed.
// Thresholds sit just above the figures this run achieved on 2026-11-23.
//
// Prints figures only. Letters are numbered by sorted file index (L01…L47, as
// automix-corpus.mts numbers them), never named: their file names carry names.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseBankStatement, detectBank } from "../lib/bank-parser/index";
import { bankStatementToLoans } from "../lib/bank-parser/to-loans";
import type { BankStatement, BankTranche } from "../lib/bank-parser/types";
import { prepaymentFee, READING, FEE_BAND, type FeeReading } from "../app/aa105test/lib/automix/fees";
import type { ImportedLoan } from "../app/aa102test/lib/credit";

const ROWS = process.argv.includes("--rows");
const fmt = (x: number) => Math.round(x).toLocaleString("en-US");
const failures: string[] = [];
let passed = 0;
const check = (ok: boolean, what: string) => (ok ? passed++ : failures.push(what));
const section = (s: string) => console.log(`\n### ${s}`);

/* ================================================================ T. ground truth */

const TRACK: Record<number, string> = { 1: "P", 2: "klz", 3: "kz", 4: "mlz", 5: "mz" };
type Unit = { letter: string; bank: string; asOf: Date; track: string; rows: ImportedLoan[]; printed: number };

const dmy = (s: string) => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : null;
};

/** הפרשי היוון alone, as a part prints it: the itemised line, else the total less the procedural lines. */
function printedOf(t: BankTranche): number | null {
  if (t.capitalizationFee !== null && t.capitalizationFee !== undefined) return t.capitalizationFee;
  if (t.breakFee === null) return null;
  const procedural = t.breakFeeParts.filter((p) => !/היוון|פערי ריבית/.test(p.label)).reduce((a, p) => a + p.amount, 0);
  return t.breakFee - procedural;
}

const require = createRequire(path.join(process.cwd(), "package.json"));
const pdfjs = await import(pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.mjs")).href);
try {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")).href;
} catch {}
const DIR = path.resolve(process.cwd(), "../Bank-Templates");
const files = fs.readdirSync(DIR).filter((f) => /\.pdf$/i.test(f)).sort();
const warn = console.warn;
console.warn = () => {};
const letters: { id: string; st: BankStatement; rows: ImportedLoan[]; trancheOf: BankTranche[] }[] = [];
let n = 0;
for (const file of files) {
  const id = `L${String(++n).padStart(2, "0")}`;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path.join(DIR, file))), useSystemFonts: true, verbosity: 0 }).promise;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pages: any[] = [];
  for (let k = 1; k <= doc.numPages; k++) {
    const tc = await (await doc.getPage(k)).getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pages.push({ page: k, items: (tc.items as any[]).filter((i) => i.str).map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width })) });
  }
  if (!pages.some((p) => p.items.some((i: { str: string }) => i.str.trim())) || !detectBank(pages)) continue;
  const st = parseBankStatement(pages);
  const rows = bankStatementToLoans(st, "mix", "").loans;
  if (!rows.length) continue;
  // to-loans.ts makes one row per live tranche, largest balance first.
  const live = st.tranches.filter((t) => (t.balance ?? 0) > 0).sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0));
  letters.push({ id, st, rows, trancheOf: live });
}
console.warn = warn;

// §5 on a Hapoalim loan dated 1–15: amount × ½ × the average monthly CPI change.
// Hapoalim folds it into its figure unitemised; the letters that itemise it in
// the same months (Mizrahi "פיצוי מדד", Jerusalem) give its share of the balance.
const cpiShares: number[] = [];
for (const L of letters)
  L.trancheOf.forEach((t) => {
    const p = t.breakFeeParts.find((x) => /פיצוי מדד|מדד ממוצע/.test(x.label));
    if (p && (t.balance ?? 0) > 10_000) cpiShares.push(p.amount / (t.balance ?? 1));
  });
const median = (xs: number[]) => {
  const a = [...xs].sort((x, y) => x - y);
  return a.length ? (a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2) : NaN;
};
const CPI_SHARE = median(cpiShares);

const units: Unit[] = [];
for (const L of letters) {
  const asOf = dmy(L.st.statementDate);
  if (!asOf) continue;
  if (L.st.bank === "poalim") {
    for (const loan of L.st.loans) {
      const rows = L.rows.filter((_, k) => loan.tranches.includes(L.trancheOf[k]));
      if (!rows.length || loan.printed.breakFee === null) continue;
      const balance = rows.reduce((a, r) => a + Number(r.amount), 0);
      const linked = rows.filter((r) => r.path_id === 3 || r.path_id === 5).reduce((a, r) => a + Number(r.amount), 0);
      const procedural = balance * 0.001 + (asOf.getDate() <= 15 ? linked * CPI_SHARE : 0);
      const tracks = [...new Set(rows.map((r) => TRACK[r.path_id]))];
      const left = loan.printed.breakFee - procedural;
      units.push({ letter: L.id, bank: L.st.bank, asOf, track: tracks.length === 1 ? tracks[0] : "mixed", rows, printed: left < 5 ? 0 : left });
    }
    continue;
  }
  L.rows.forEach((r, k) => {
    if (r.prepayment_fee === null || r.prepayment_fee === undefined) return;
    const p = printedOf(L.trancheOf[k]);
    if (p === null) return;
    units.push({ letter: L.id, bank: L.st.bank, asOf, track: TRACK[r.path_id], rows: [r], printed: Math.max(0, p) });
  });
}
section("T. ground truth");
const nRows = letters.reduce((a, L) => a + L.rows.length, 0);
const nPrinted = letters.reduce((a, L) => a + L.rows.filter((r) => r.prepayment_fee !== null && r.prepayment_fee !== undefined).length, 0);
console.log(`  ${letters.length} letters, ${nRows} rows, ${nPrinted} with a printed fee → ${units.length} units (Hapoalim by loan); ${units.filter((u) => u.printed >= 100).length} with ₪100 or more`);
console.log(`  §5 share of balance on the letters that itemise it: median ${(CPI_SHARE * 100).toFixed(4)}% (n=${cpiShares.length})`);
const byBank = new Map<string, number>();
for (const u of units) byBank.set(`${u.bank}/${u.track}`, (byBank.get(`${u.bank}/${u.track}`) ?? 0) + 1);
console.log("  " + [...byBank].sort().map(([k, v]) => `${k} ${v}`).join(" · "));
check(letters.length >= 40, `only ${letters.length} letters read`);
check(units.length >= 160, `only ${units.length} units`);

/* ================================================================ the estimator, per mode */

type Mode = "letter" | "report" | "report-nostart" | "today";
/** What a credit report carries of a letter row (lib/credit-parser → toLoanRow): no reset date or interval, no indexation split. */
const asReport = (r: ImportedLoan, start: boolean): ImportedLoan =>
  ({ ...r, prepayment_fee: null, indexation: null, next_reset: null, anchor_interval: null, change_frequency: "", reset_fresh: undefined, source_start_date: start ? r.source_start_date : undefined }) as ImportedLoan;
function estimate(u: Unit, mode: Mode, reading: FeeReading = READING): number {
  let s = 0;
  for (const r of u.rows) {
    const row = mode === "report" ? asReport(r, true) : mode === "report-nostart" ? asReport(r, false) : ({ ...r, prepayment_fee: null } as ImportedLoan);
    s += prepaymentFee(row, mode === "today" ? undefined : u.asOf, reading).fee;
  }
  return s;
}

/* ================================================================ tables */

const q = (xs: number[], p: number) => {
  if (!xs.length) return NaN;
  const a = [...xs].sort((x, y) => x - y);
  const k = (a.length - 1) * p;
  return a[Math.floor(k)] + (a[Math.ceil(k)] - a[Math.floor(k)]) * (k - Math.floor(k));
};
type Stat = { n: number; P: number; E: number; abs: number; nr: number; med: number; p10: number; p90: number };
function stat(pairs: { u: Unit; e: number }[]): Stat {
  const r = pairs.filter((x) => x.u.printed >= 100).map((x) => x.e / x.u.printed);
  return {
    n: pairs.length,
    P: pairs.reduce((a, x) => a + x.u.printed, 0),
    E: pairs.reduce((a, x) => a + x.e, 0),
    abs: pairs.reduce((a, x) => a + Math.abs(x.e - x.u.printed), 0),
    nr: r.length,
    med: q(r, 0.5),
    p10: q(r, 0.1),
    p90: q(r, 0.9),
  };
}
const line = (name: string, s: Stat) =>
  `  ${name.padEnd(16)} n=${String(s.n).padStart(3)}  Σprinted ${fmt(s.P).padStart(8)}  Σest ${fmt(s.E).padStart(8)}  Σ|err| ${fmt(s.abs).padStart(7)}  | est÷printed n=${String(s.nr).padStart(2)} median ${s.med.toFixed(3)}  10–90% ${s.p10.toFixed(2)}–${s.p90.toFixed(2)}`;
function table(title: string, pairs: { u: Unit; e: number }[]) {
  console.log(`  -- ${title}`);
  const all = stat(pairs);
  console.log(line("all", all));
  for (const t of ["kz", "klz", "mz", "mlz", "mixed", "P"]) {
    const xs = pairs.filter((x) => x.u.track === t);
    if (xs.length) console.log(line(`track ${t}`, stat(xs)));
  }
  for (const b of [...new Set(pairs.map((x) => x.u.bank))].sort()) console.log(line(`bank ${b}`, stat(pairs.filter((x) => x.u.bank === b))));
  return all;
}
const run = (mode: Mode, reading: FeeReading = READING) => units.map((u) => ({ u, e: estimate(u, mode, reading) }));

/* ================================================================ L / R */

section("L. letter mode, in sample (each fee as of its letter's date)");
const L1 = run("letter");
const Ls = table("letter mode", L1);
section("R. report mode, in sample");
const R1 = run("report");
const Rs = table("report mode", R1);
const RN = run("report-nostart");
const RNs = table("report mode, no day given (C unknown → R)", RN);
if (ROWS) {
  section("rows (letter mode | report mode), figures only");
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.printed < 1 && L1[i].e < 1 && R1[i].e < 1) continue;
    const r = u.rows[0];
    console.log(`  ${u.letter} ${u.bank.padEnd(10)} ${u.track.padEnd(5)} ${u.rows.length}r ₪${fmt(u.rows.reduce((a, x) => a + Number(x.amount), 0)).padStart(9)} ${r.rate}% ${r.months}m sch${r.amortization_schedule_id} printed ${fmt(u.printed).padStart(7)} letter ${fmt(L1[i].e).padStart(7)} report ${fmt(R1[i].e).padStart(7)}`);
  }
}

/* ================================================================ H. alternatives */

section("H. each alternative reading (letter mode, Σ|err| over all units; the shipped reading first)");
const ALTS: { name: string; reading: FeeReading }[] = [
  { name: "READING", reading: READING },
  { name: "full precision", reading: { ...READING, published: false } },
  { name: "A, C as e/12", reading: { ...READING, conversion: "nominal" } },
  { name: "C when given (var)", reading: { ...READING, cOnVariable: "given" } },
  { name: "C by elapsed+left", reading: { ...READING, cTerm: "elapsedPlusLeft" } },
  { name: "compare at R", reading: { ...READING, compareAt: "contract" } },
  { name: "compare at C", reading: { ...READING, compareAt: "given" } },
  { name: "no §8 discount", reading: { ...READING, seniority: false } },
  { name: "n = payments", reading: { ...READING, toChange: "payments" } },
];
const perAlt = ALTS.map((a) => ({ ...a, pairs: a.name === "READING" ? L1 : run("letter", a.reading) }));
for (const a of perAlt) console.log(line(a.name, stat(a.pairs)));
const todayPairs = run("today");
console.log(line("as of today", stat(todayPairs)));
for (const a of perAlt.slice(1)) check(stat(a.pairs).abs > Ls.abs, `alternative "${a.name}" beats the shipped reading (${fmt(stat(a.pairs).abs)} ≤ ${fmt(Ls.abs)})`);
check(stat(todayPairs).abs > Ls.abs * 3, "estimating as of today should be far worse than as of the letter's date");

/* ================================================================ O. out of sample */

section("O. out of sample (leave one letter out)");
// The reading: for every held-out letter, the alternative with the least Σ|err|
// on the other letters, then the held-out letter's estimate under it.
const ids = [...new Set(units.map((u) => u.letter))];
const oos: { u: Unit; e: number }[] = [];
const chosen = new Map<string, number>();
for (const id of ids) {
  let best = 0;
  let bestAbs = Infinity;
  perAlt.forEach((a, k) => {
    const abs = a.pairs.reduce((s, x) => s + (x.u.letter === id ? 0 : Math.abs(x.e - x.u.printed)), 0);
    if (abs < bestAbs) [best, bestAbs] = [k, abs];
  });
  chosen.set(perAlt[best].name, (chosen.get(perAlt[best].name) ?? 0) + 1);
  for (const x of perAlt[best].pairs) if (x.u.letter === id) oos.push(x);
}
console.log(`  reading chosen per fold: ${[...chosen].map(([k, v]) => `${k} ×${v}`).join(", ")}`);
const Os = table("letter mode, out of sample", oos);
// The same with a whole bank held out: a bank's own way of printing cannot pick
// the reading it is then scored on.
const banks = [...new Set(units.map((u) => u.bank))];
const oosBank: { u: Unit; e: number }[] = [];
const byBankChoice = banks.map((b) => {
  let best = 0;
  let bestAbs = Infinity;
  perAlt.forEach((a, k) => {
    const abs = a.pairs.reduce((s, x) => s + (x.u.bank === b ? 0 : Math.abs(x.e - x.u.printed)), 0);
    if (abs < bestAbs) [best, bestAbs] = [k, abs];
  });
  for (const x of perAlt[best].pairs) if (x.u.bank === b) oosBank.push(x);
  return `${b} → ${perAlt[best].name}`;
});
console.log(`  reading chosen with each bank held out: ${byBankChoice.join(", ")}`);
const OBs = table("letter mode, each bank out of sample", oosBank);

// The band: FEE_BAND's construction (report mode, printed ÷ estimate over
// estimates of ₪100 or more, 10th–90th percentile per track) without the held-out letter.
const TRACKS = ["kz", "klz", "mz", "mlz"] as const;
type Band = { n: number; lo: number; median: number; hi: number };
// Edges rounded outward to 2 decimals, as FEE_BAND ships them.
function bandOf(pairs: { u: Unit; e: number }[]): Record<string, Band> {
  const out: Record<string, Band> = {};
  for (const t of TRACKS) {
    const r = pairs.filter((x) => x.u.track === t && x.e >= 100).map((x) => x.u.printed / x.e);
    out[t] = { n: r.length, lo: Math.floor(q(r, 0.1) * 100) / 100, median: Math.round(q(r, 0.5) * 100) / 100, hi: Math.ceil(q(r, 0.9) * 100) / 100 };
  }
  return out;
}
const band = bandOf(R1);
console.log("  FEE_BAND as measured now (report mode, printed ÷ estimate, estimates ≥ ₪100):");
for (const t of TRACKS) {
  const b = band[t];
  const shipped = FEE_BAND[t];
  console.log(`    ${t.padEnd(4)} n=${String(b.n).padStart(2)} lo ${b.lo.toFixed(2)} median ${b.median.toFixed(2)} hi ${b.hi.toFixed(2)}   shipped n=${shipped.n} ${shipped.lo.toFixed(2)}/${shipped.median.toFixed(2)}/${shipped.hi.toFixed(2)}`);
  check(shipped.n === b.n && shipped.lo === b.lo && shipped.hi === b.hi && shipped.median === b.median, `FEE_BAND.${t} is stale: measured n=${b.n} ${b.lo}/${b.median}/${b.hi}`);
}
let inside = 0;
let tested = 0;
for (const id of ids) {
  const b = bandOf(R1.filter((x) => x.u.letter !== id));
  for (const x of R1.filter((y) => y.u.letter === id && y.e >= 100 && (TRACKS as readonly string[]).includes(y.u.track))) {
    const k = b[x.u.track];
    if (!(k.n >= 3)) continue;
    tested++;
    const ratio = x.u.printed / x.e;
    if (ratio >= k.lo - 1e-9 && ratio <= k.hi + 1e-9) inside++;
  }
}
console.log(`  the band rebuilt without each letter held ${inside} of ${tested} held-out ratios (${((100 * inside) / Math.max(1, tested)).toFixed(0)}%; a 10–90 band aims at 80%)`);
const zeroMiss = R1.filter((x) => x.e < 100 && x.u.printed >= 100);
console.log(`  report mode: ${zeroMiss.length} units estimated under ₪100 where the letter prints ₪100 or more (Σ printed ${fmt(zeroMiss.reduce((a, x) => a + x.u.printed, 0))})`);

/* ================================================================ W. stated fees */

section("W. stated fees");
const negatives = letters.flatMap((L) => L.rows.filter((r) => Number(r.prepayment_fee) < 0).map((r) => ({ L, r })));
for (const { L, r } of negatives) {
  const qt = prepaymentFee(r);
  console.log(`  ${L.id} ${TRACK[r.path_id]} printed ${r.prepayment_fee} → fee ${qt.fee}, ${qt.estimated ? "estimated" : "stated"}`);
  check(qt.fee === 0 && !qt.estimated, `${L.id}: a printed negative difference must be a stated zero`);
}
check(negatives.length >= 2, "the two negative printed differences (L35) were not found");
for (const L of letters)
  for (const r of L.rows) {
    if (!(Number(r.prepayment_fee) >= 0) || r.prepayment_fee === null) continue;
    const qt = prepaymentFee(r);
    check(qt.fee === Math.round(Number(r.prepayment_fee)) && !qt.estimated, `${L.id}: a printed fee must win`);
  }

/* ================================================================ thresholds */

section("thresholds (2026-11-23 figures plus a margin)");
const T = (ok: boolean, what: string) => {
  console.log(`  ${ok ? "ok " : "XX "} ${what}`);
  check(ok, what);
};
const S = (pairs: { u: Unit; e: number }[], f: (u: Unit) => boolean) => stat(pairs.filter((x) => f(x.u)));
// Achieved: letter 12,788 (10–90% 1.00–1.13), each bank held out 13,252;
// Mizrahi + Jerusalem 306; report 30,130, kz 1.00–1.15, klz 1.00–1.03; 45 of 63
// held out. The estimator this replaced erred by 112,955 as of today and 50,418
// as of each letter's date.
T(Ls.abs <= 13_500, `letter mode Σ|err| ${fmt(Ls.abs)} ≤ 13,500`);
T(Ls.p10 >= 0.97 && Ls.p90 <= 1.16, `letter mode 10–90% ${Ls.p10.toFixed(2)}–${Ls.p90.toFixed(2)} within 0.97–1.16`);
const exact = S(L1, (u) => u.bank === "mizrahi" || u.bank === "jerusalem");
T(exact.abs <= 350, `Mizrahi + Jerusalem letter mode Σ|err| ${fmt(exact.abs)} ≤ 350 (the reading reproduces their fees)`);
T(Os.abs <= Ls.abs * 1.05 + 1, `out of sample Σ|err| ${fmt(Os.abs)} within 5% of in sample`);
T(OBs.abs <= Ls.abs * 1.1 + 1, `each bank out of sample Σ|err| ${fmt(OBs.abs)} within 10% of in sample`);
T(Rs.abs <= 32_000, `report mode Σ|err| ${fmt(Rs.abs)} ≤ 32,000`);
for (const t of ["kz", "klz"]) {
  const s = S(R1, (u) => u.track === t);
  T(s.p10 >= 0.97 && s.p90 <= 1.2, `report mode ${t} 10–90% ${s.p10.toFixed(2)}–${s.p90.toFixed(2)} within 0.97–1.20`);
}
T(inside >= 40, `the out-of-sample band held ${inside} held-out ratios ≥ 40`);
// Without the day given the order's lower comparison cannot be made: the fee is
// §3(3)'s ceiling, printed here so its size stays visible, never thresholded.
console.log(`  ..  report mode without the day given: Σ|err| ${fmt(RNs.abs)}, median est÷printed ${RNs.med.toFixed(2)}`);

console.log(`\n${passed} checks passed, ${failures.length} failed`);
for (const f of failures.slice(0, 60)) console.log("  ✗ " + f);
process.exit(failures.length ? 1 : 0);
