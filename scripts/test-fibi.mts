// הבנק הבינלאומי reader: the real letter field by field, then the same letter
// mutated into what another client's letter could look like — different
// figures, fees, prime with a negative margin, runs that arrive in logical
// rather than visual order, a later statement date — and the safety net (a
// misread figure must surface as a warning, not as a quiet wrong number).
// Run: npx tsx --tsconfig tsconfig.json scripts/test-fibi.mts [letter.pdf]
import fs from "node:fs";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseBankStatement, detectBank } from "../lib/bank-parser";
import { bankStatementToLoans } from "../lib/bank-parser/to-loans";
import type { RawPage } from "../lib/credit-parser/types";

const require = createRequire(import.meta.url);
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
try {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs")
  ).href;
} catch {}

const FILE =
  process.argv[2] ??
  "C:/Users/noama/OneDrive/Desktop/reports/דוח יתרות הבינלאומי  אמיר הרוש 21.10.26.pdf";

const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(FILE)), useSystemFonts: true }).promise;
const base: RawPage[] = [];
for (let n = 1; n <= doc.numPages; n++) {
  const tc = await (await doc.getPage(n)).getTextContent();
  base.push({
    page: n,
    items: (tc.items as any[])
      .filter((it) => it.str)
      .map((it) => ({ str: it.str, x: it.transform[4], y: it.transform[5], w: it.width })),
  });
}

let fails = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  const ok = typeof want === "number" && typeof got === "number" ? Math.abs(got - want) < 0.005 : got === want;
  if (!ok) {
    fails++;
    console.log(`  FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
  }
};
const clone = (): RawPage[] => base.map((p) => ({ page: p.page, items: p.items.map((i) => ({ ...i })) }));
/** Replace text inside items; `nth` picks one occurrence (0-based) across the file. */
function edit(pages: RawPage[], from: string, to: string, nth?: number) {
  let seen = 0;
  for (const p of pages)
    for (const it of p.items)
      if (it.str.includes(from)) {
        if (nth === undefined || seen === nth) it.str = it.str.replace(from, to);
        seen++;
      }
  if (!seen) throw new Error(`mutation target not found: ${from}`);
}
const run = (title: string, pages: RawPage[]) => {
  console.log(`\n— ${title}`);
  const st = parseBankStatement(pages);
  return { st, t: st.tranches, w: st.warnings };
};

// ---------------------------------------------------------------- 1. as printed
{
  const { st, t, w } = run("the letter as printed", clone());
  eq("detected", detectBank(base)?.bank, "fibi");
  eq("date", st.statementDate, "19/10/2026");
  eq("name", st.client.name, "הרוש מאיר יעק ונטלי");
  eq("borrower", st.accountNumber, "6541670");
  eq("live tranches (the refinanced משנה 02 is skipped)", t.length, 3);
  eq("warnings", w.length, 0);
  eq("payoff = printed סה\"כ לסילוק", st.totals.payoff, 1308707.21);

  const [a, b, c] = t;
  eq("A loan", a.loanNumber, "41-6541670-02-50");
  eq("A principal", a.principal, 603110.8);
  eq("A indexation", a.indexation, 0);
  eq("A accrued", a.accruedInterest, 586.37);
  eq("A original", a.originalAmount, 628337.96);
  eq("A rate", a.rate, 3.943);
  eq("A effective", a.effectiveRate, 4.015);
  eq("A anchor", a.anchorRate, 3.348);
  eq("A margin", a.margin, 0.595);
  eq("A kind", `${a.rateKind}/${a.linkage}`, "variable/unlinked");
  eq("A reset", a.resetMonths, 24);
  eq("A next reset", a.nextReset, "10/07/2028");
  eq("A start", a.startDate, "15/07/2024");
  eq("A first payment", a.firstPaymentDate, "10/08/2024");
  eq("A end", a.endDate, "10/06/2052");
  eq("A months", a.months, 308);
  eq("A monthly (unlinked: as printed)", a.monthly, 3116.32);
  eq("A forecast", a.forecastRate, 4.937);
  eq("A comparison", a.comparisonRate, 4.937);

  eq("B kind", `${b.rateKind}/${b.linkage}`, "fixed/linked");
  eq("B principal", b.principal, 433441.61);
  eq("B indexation", b.indexation, 65962.36);
  eq("B accrued", b.accruedInterest, 222.89);
  eq("B start (single-digit day)", b.startDate, "04/05/2022");
  eq("B base index", b.baseIndex, 105.30028);
  eq("B months", b.months, 307);
  eq("B margin (fixed: none)", b.margin, null);
  // 1,764.94 printed on the bare principal × (קרן+הצמדה)/קרן.
  eq("B monthly (linked: indexed)", b.monthly, 2033.53);

  eq("C principal", c.principal, 194379.09);
  eq("C indexation", c.indexation, 10875.43);
  eq("C anchor + margin = rate", Math.round(((c.anchorRate ?? 0) + (c.margin ?? 0)) * 1000) / 1000, c.rate);
  eq("C monthly", c.monthly, 907.97);

  // Spitzer on the bare principal over the payments left reproduces the
  // printed figure — proves both the term and the indexless-payment reading.
  for (const [x, printed] of [[a, 3116.32], [b, 1764.94], [c, 859.86]] as const) {
    const r = x.rate! / 1200, n = x.months!;
    // Within one agora: the bank's own rounding.
    const pmt = (x.principal! * r) / (1 - (1 + r) ** -n);
    eq(`${x.loanNumber} printed payment from term`, Math.abs(pmt - printed) <= 0.011, true);
  }

  const rows = bankStatementToLoans(st, "m").loans as any[];
  eq("board rows", rows.length, 3);
  eq("board tracks", rows.map((r) => r.path_id).join(","), "4,3,5");
  eq("board total", rows.reduce((s, r) => s + r.amount, 0), 1307770);
}

// ------------------------------------------- 2. runs in logical order instead
// A generator that cuts "603,110.80 :.......הקרן" as separate runs puts the
// value where it sits on the page — left of the label — and the line rebuilds
// as "יתרת הקרן :....... 603,110.80". Every visual run is split that way here.
{
  const pages = clone();
  for (const p of pages) {
    const out: typeof p.items = [];
    for (const it of p.items) {
      const m = it.str.match(/^([\d,./]+(?: %)?) (:[.]*(?:\(\*+\))?) ?(.+)$/);
      if (!m) { out.push(it); continue; }
      // value leftmost, colon run, then the label furthest right.
      out.push({ ...it, str: m[1], x: it.x });
      out.push({ ...it, str: m[2], x: it.x + 30 });
      out.push({ ...it, str: m[3], x: it.x + 60 });
    }
    p.items = out;
  }
  const { st, t, w } = run("visual runs split into logical order", pages);
  eq("warnings", w.length, 0);
  eq("tranches", t.length, 3);
  eq("A principal", t[0].principal, 603110.8);
  eq("A start", t[0].startDate, "15/07/2024");
  eq("A forecast", t[0].forecastRate, 4.937);
  eq("B accrued", t[1].accruedInterest, 222.89);
  eq("payoff", st.totals.payoff, 1308707.21);
}

// ------------------------------------------------- 3. different figures, consistent
{
  const pages = clone();
  // Tranche A 603,110.80 → 1,203,110.80 everywhere it is printed, totals to match.
  for (const [f, to] of [
    ["603,110.80", "1,203,110.80"],
    ["603,697.17", "1,203,697.17"],
    ["1,230,931.50", "1,830,931.50"],
    ["1,308,707.21", "1,908,707.21"],
  ])
    for (let i = 0; i < 5; i++) try { edit(pages, f, to, 0); } catch { break; }
  const { st, t, w } = run("seven-figure balance", pages);
  eq("warnings", w.length, 0);
  eq("A principal", t[0].principal, 1203110.8);
  eq("payoff", st.totals.payoff, 1908707.21);
}

// ------------------------------------------------------- 4. break fees printed
{
  const pages = clone();
  edit(pages, "עמלת היוון בגין הפרשי ריבית:", "עמלת היוון בגין הפרשי ריבית: 12,345.67", 0);
  edit(pages, "עמלת אי מתן הודעה..........:", "עמלת אי מתן הודעה..........: 1,234.50", 0);
  // Loan-level fees on loan 64-…-43 (two משנים, one live): .00 → a figure.
  const fee43 = pages[1].items.find((i) => i.str === ".00" && Math.abs(i.y - 360) < 2)!;
  fee43.str = "2,000.00";
  edit(pages, "1,308,707.21", "1,324,287.38");
  const { st, t, w } = run("break fees itemised per משנה and per loan", pages);
  eq("warnings", w.length, 0);
  eq("A היוון", t[0].capitalizationFee, 12345.67);
  eq("A fee total", t[0].breakFee, 13580.17);
  eq("A payoff", t[0].payoff, 603697.17 + 13580.17);
  eq("B fee from the loan total (single live משנה)", t[1].capitalizationFee, 2000);
  eq("payoff", st.totals.payoff, 1324287.38);
  const rows = bankStatementToLoans(st, "m").loans as any[];
  eq("board הפרשי היוון", rows[0].prepayment_fee, 12346);
}

// ------------------------------------------- 5. prime, negative margin, trailing minus
{
  const pages = clone();
  edit(pages, "משתנה-תשואת אג\"ח ממשלתית", "פריים", 0);
  edit(pages, "0.595", "-0.655");
  edit(pages, "0.882", "0.250-");
  const { t } = run("prime with a negative margin; trailing-minus margin", pages);
  eq("A kind", t[0].rateKind, "prime");
  eq("A margin", t[0].margin, -0.655);
  eq("C margin (trailing minus)", t[2].margin, -0.25);
}

// --------------------------------------------------------- 6. a later statement date
{
  const pages = clone();
  edit(pages, "19/10/2026", "11/11/2026");
  const { st, t } = run("statement after the November payment", pages);
  eq("date", st.statementDate, "11/11/2026");
  eq("A months", t[0].months, 307);
  eq("B months", t[1].months, 306);
}

// ------------------------------------------------------ 7. the safety net fires
{
  const pages = clone();
  edit(pages, "603,110.80", "608,110.80", 0); // a misread digit on the tranche only
  const { w } = run("a misread principal must be flagged", pages);
  eq("flagged", w.some((x) => x.includes("41-6541670-02-50")), true);
}

// ------------------------------------------------ 8. only the first pages sent
{
  const pages = clone().slice(0, 2);
  const { t, w } = run("first two pages only (no signature, no grand total)", pages);
  eq("detected without the bank's name", detectBank(pages)?.bank, "fibi");
  eq("tranches on those pages", t.length, 3);
  eq("C has a rate", t[2].rate, 2.542);
  eq("the unverifiable loan is said so", w.some((x) => x.includes("64-6541670-02-42")), true);
}

// ---------------------------------------------- 9. no other template is taken
{
  const DIR = "C:/Users/noama/OneDrive/Desktop/Credit Data System report extractor/Bank-Templates";
  console.log("\n— other lenders' letters are not read as בינלאומי");
  for (const f of fs.readdirSync(DIR).filter((x) => /\.pdf$/i.test(x))) {
    const d = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(`${DIR}/${f}`)), useSystemFonts: true }).promise;
    const pages: RawPage[] = [];
    for (let n = 1; n <= d.numPages; n++) {
      const tc = await (await d.getPage(n)).getTextContent();
      pages.push({ page: n, items: (tc.items as any[]).filter((i) => i.str).map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width })) });
    }
    const bank = detectBank(pages)?.bank ?? "none";
    console.log(`  ${f}: ${bank}`);
    if (bank === "fibi") { fails++; console.log("  FAIL taken as fibi"); }
  }
}

console.log(fails ? `\n${fails} FAILED` : "\nall passed");
process.exit(fails ? 1 : 0);
