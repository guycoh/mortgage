// Does the /aa102test export keep the client's own debt apart from the debt they
// merely guarantee — and do its totals still add up?
//   npx tsx scripts/test-excel-surety.mts
//
// The bug this guards: a row from "עסקאות בהן הלקוח ערב" used to be filed under
// הלוואות and summed into the family subtotal, the grand total, the KPI strip,
// the track composition and עלות לשקל, marked only by a word in the last column.
// On the sample report that put ₪44,003 of somebody else's loan — and ₪516 a
// month of somebody else's repayment — into the figure the sheet exists to state.
//
// It also guards the arithmetic underneath: every subtotal is a live SUM over
// already-rounded cells, so the cached value written beside the formula has to
// be Σ round(x), not round(Σ x). Get that wrong and the file shows one number
// until Excel recalculates and another afterwards.

import { buildMixWorkbook } from "../app/aa102test/lib/excel";
import type { ImportedLoan } from "../app/aa102test/lib/credit";
import type { Worksheet } from "exceljs";

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!ok) failures += 1;
}

/* ------------------------------------------------------------------ fixture */

let seq = 0;
const row = (over: Partial<ImportedLoan>): ImportedLoan =>
  ({
    id: `r${(seq += 1)}`,
    mix_id: "m",
    path_id: 1,
    amount: 100_000,
    rate: 5,
    months: 120,
    amortization_schedule_id: 1,
    grace_type_id: 1,
    grace_months: 0,
    loan_end_date: null,
    end_date: null,
    group: "mortgage",
    source_bank: 'בנק לאומי לישראל בע"מ',
    ...over,
  }) as ImportedLoan;

const build = (loans: ImportedLoan[]) =>
  buildMixWorkbook({ mixName: "בדיקה", loans, annualInflation: 2, clients: [{ name: "לקוח", id: "1" }] })
    .then((wb) => wb.getWorksheet("תמהיל")!);

/* ------------------------------------------------------------------ readers */

const COL = { family: 1, standing: 2, amount: 6, monthly: 13, interest: 14, cost: 15 };

const raw = (v: unknown): number | string => {
  if (v && typeof v === "object" && "result" in (v as object)) return (v as { result: number }).result;
  return (v ?? "") as string;
};

/** The row whose column A starts with `label`, or -1. */
function findRow(ws: Worksheet, label: string): number {
  let hit = -1;
  ws.eachRow((r, n) => {
    if (hit === -1 && String(raw(r.getCell(1).value)).startsWith(label)) hit = n;
  });
  return hit;
}

const figure = (ws: Worksheet, label: string, col: number): number =>
  Number(raw(ws.getRow(findRow(ws, label)).getCell(col).value)) || 0;

/** Add up a SUM formula from the cells it actually names — what Excel will do. */
function recompute(ws: Worksheet, rowNo: number, col: number): number {
  const cell = ws.getRow(rowNo).getCell(col).value as { formula?: string } | null;
  if (!cell?.formula) return NaN;
  return cell.formula
    .replace(/^SUM\(/, "")
    .replace(/\)$/, "")
    .split(",")
    .reduce((total, range) => {
      const [a, b] = range.split(":");
      const lo = Number(a.replace(/[A-Z]/g, ""));
      const hi = Number((b ?? a).replace(/[A-Z]/g, ""));
      let s = 0;
      for (let i = lo; i <= hi; i += 1) s += Number(raw(ws.getRow(i).getCell(col).value)) || 0;
      return total + s;
    }, 0);
}

/* -------------------------------------------------- 1. the guarantee is out */

{
  const ws = await build([
    row({ amount: 300_000 }),
    row({ group: "loan", amount: 50_000 }),
    row({ group: "loan", amount: 44_003, is_guarantor: true, source_bank: "בנק יהב לעובדי המדינה" }),
  ]);

  check(
    "the client's total excludes the guaranteed loan",
    figure(ws, 'סה"כ התחייבויות הלקוח', COL.amount) === 350_000,
    `${figure(ws, 'סה"כ התחייבויות הלקוח', COL.amount)}`
  );
  check(
    "the loans subtotal excludes it too",
    figure(ws, 'סה"כ הלוואות', COL.amount) === 50_000,
    `${figure(ws, 'סה"כ הלוואות', COL.amount)}`
  );
  check(
    "the guarantee gets its own total",
    figure(ws, 'סה"כ בערבות', COL.amount) === 44_003,
    `${figure(ws, 'סה"כ בערבות', COL.amount)}`
  );
  check("the guarantee band names its count", findRow(ws, "בערבות   (1)") > 0);
  check(
    "the guarantee block sits AFTER the client's grand total",
    findRow(ws, "בערבות   (1)") > findRow(ws, 'סה"כ התחייבויות הלקוח')
  );
  check(
    "the KPI strip leads with the client's own balance",
    Number(raw(ws.getRow(findRow(ws, 'סה"כ התחייבויות הלקוח') > 0 ? 6 : 6).getCell(1).value)) === 350_000
  );
  check("the exclusion is stated under the KPI strip", findRow(ws, "בנוסף:") > 0);

  // the מעמד column, row by row
  const standings: string[] = [];
  ws.eachRow((r) => {
    const v = String(raw(r.getCell(COL.standing).value));
    if (v === "ערב" || v === "חייב") standings.push(v);
  });
  check(
    "every data row states חייב or ערב",
    standings.length === 3 && standings.filter((s) => s === "ערב").length === 1,
    standings.join(",")
  );

  // subtotals reconcile with the grand total, and with what Excel would compute
  for (const [name, col] of Object.entries({
    amount: COL.amount,
    monthly: COL.monthly,
    interest: COL.interest,
    cost: COL.cost,
  })) {
    const parts = figure(ws, 'סה"כ משכנתאות', col) + figure(ws, 'סה"כ הלוואות', col);
    const grand = figure(ws, 'סה"כ התחייבויות הלקוח', col);
    check(`${name}: subtotals add to the grand total`, parts === grand, `${parts} vs ${grand}`);

    for (const label of ['סה"כ משכנתאות', 'סה"כ הלוואות', 'סה"כ התחייבויות הלקוח', 'סה"כ בערבות']) {
      const n = findRow(ws, label);
      const cached = Number(raw(ws.getRow(n).getCell(col).value));
      const live = recompute(ws, n, col);
      check(`${name}: "${label}" cached value is what its formula computes`, cached === live, `${cached} vs ${live}`);
    }
  }
}

/* ------------------------------------- 2. a guaranteed MORTGAGE, not a loan */

{
  const ws = await build([
    row({ amount: 200_000 }),
    row({ group: "mortgage", amount: 70_000, is_guarantor: true }),
  ]);
  check(
    "a guaranteed mortgage leaves the mortgage subtotal alone",
    figure(ws, 'סה"כ משכנתאות', COL.amount) === 200_000,
    `${figure(ws, 'סה"כ משכנתאות', COL.amount)}`
  );
  check(
    "and still reads as a משכנתא inside the guarantee block",
    String(raw(ws.getRow(findRow(ws, "בערבות") + 1).getCell(COL.family).value)) === "משכנתא"
  );
}

/* --------------------------------------------- 3. nothing but guarantees */

{
  const ws = await build([row({ is_guarantor: true }), row({ group: "loan", is_guarantor: true })]);
  check("no grand total when the client owes nothing", findRow(ws, 'סה"כ התחייבויות הלקוח') === -1);
  check("the guarantee block still prints", figure(ws, 'סה"כ בערבות', COL.amount) === 200_000);
  check(
    "no invented cost per shekel",
    !String(raw(ws.getRow(3).getCell(1).value)).includes("עלות לשקל"),
    String(raw(ws.getRow(3).getCell(1).value))
  );
}

/* ------------------------------------------------ 4. no guarantees at all */

{
  const ws = await build([row({}), row({ group: "loan", amount: 50_000 })]);
  check("no guarantee band when there are none", findRow(ws, "בערבות") === -1);
  check("no aside either", findRow(ws, "בנוסף:") === -1);
  check("the client's total is everything", figure(ws, 'סה"כ התחייבויות הלקוח', COL.amount) === 150_000);
}

console.log(failures ? `\n${failures} failure(s).` : "\n✓ guarantees stay out of the client's totals, and the totals reconcile.");
process.exit(failures ? 1 : 0);
