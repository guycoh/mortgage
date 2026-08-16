// The /aa102test Excel export.
//
// One sheet, read top to bottom the way the page reads: who this is, what the
// mix costs, how it splits by track, then every row grouped into its family
// with its own subtotal, closed by a grand total.
//
// The design rules are the page's rules, translated:
//   · one column grid for both families, so a row reads the same wherever it is
//   · money carries no ₪ in the cell — the mark lives in the column head, so
//     columns of figures stay clean and stay sortable as numbers
//   · no freeze panes and no auto-filter: this is a document to read and hand
//     over, not a grid to sort — nothing sticks while you scroll
//   · Arial, because it is the one family guaranteed to carry Hebrew glyphs on
//     both Windows and macOS Excel
//
// Framework-free: no React, no `window`, so it can also be built headlessly.

import type { Workbook, Worksheet } from "exceljs";
import { calculateLoan } from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import { schedules } from "@/app/data/amortization_schedules";
import {
  FAMILY,
  PATH_LABEL,
  isSurety,
  perShekel as perShekelOf,
  type DebtGroup,
  type ImportedLoan,
} from "./credit";
import { lenderOf } from "./lenders";

/* ------------------------------------------------------------------ palette */

const C = {
  ink: "FF0E1524",
  ink2: "FF384257",
  ink3: "FF657189",
  white: "FFFFFFFF",
  line: "FFDCE0EA",
  line2: "FFB9C0D0",
  band: "FFF7F8FB",
  wash: "FFEEECFD",

  mortgage: "FF6B53D8",
  mortgageWash: "FFF2EFFE",
  loan: "FFC4681A",
  loanWash: "FFFDF3E6",
  primary: "FF4238C9",
  amber: "FFA06000",

  // The guarantee block. Deliberately NOT amber — amber is the sheet's one
  // alarm, reserved for a rate above its family's norm, and a guarantee is not
  // an alarm. It is a different category of fact, so it gets a category colour:
  // slate, which reads as an aside rather than as a warning or as a third
  // family of the client's own debt.
  surety: "FF4E5A70",
  suretyWash: "FFF1F3F7",
} as const;

const TRACK_ARGB: Record<number, string> = {
  1: "FF2563EB",
  2: "FF0D8B9B",
  3: "FF14905A",
  4: "FFAD7804",
  5: "FFC62370",
};

const FONT = "Arial";
const MONEY = "#,##0";
const PCT = "0.00%";

/* ------------------------------------------------------------------ inputs */

export interface ExcelInput {
  mixName: string;
  loans: ImportedLoan[];
  annualInflation: number;
  /** Names and IDs from the imported reports, in import order. */
  clients: { name: string; id: string; reportDate?: string }[];
}

type Col = {
  header: string;
  width: number;
  fmt?: "money" | "pct" | "int" | "date";
  /** Included in the subtotal and grand-total rows. */
  total?: boolean;
};

const COLS: Col[] = [
  { header: "סוג", width: 11 },
  // WHOSE DEBT THIS IS. A guarantee is not a smaller loan, it is somebody
  // else's loan — so it gets a column of its own rather than a word buried in
  // הערות, where it could be sorted away from the row it qualifies.
  { header: "מעמד הלקוח", width: 11 },
  { header: "מקור / גורם מדווח", width: 26 },
  { header: "מסלול", width: 17 },
  { header: "לוח סילוקין", width: 12.5 },
  { header: "יתרה (₪)", width: 14, fmt: "money", total: true },
  { header: "ריבית", width: 9.5, fmt: "pct" },
  { header: "עוגן", width: 9.5, fmt: "pct" },
  { header: "תוספת", width: 9, fmt: "pct" },
  { header: "תדירות שינוי (ח׳)", width: 15, fmt: "int" },
  { header: "חודשים", width: 9.5, fmt: "int" },
  { header: "תאריך סיום", width: 13, fmt: "date" },
  { header: "החזר חודשי (₪)", width: 15, fmt: "money", total: true },
  { header: 'סה"כ ריבית (₪)', width: 15, fmt: "money", total: true },
  { header: "עלות כוללת (₪)", width: 15, fmt: "money", total: true },
  { header: "הערות", width: 16 },
];

const SPAN = COLS.length;

/* ----------------------------------------------------------------- helpers */

const solid = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

const thin = (argb: string) => ({ style: "thin" as const, color: { argb } });

/** dd/mm/yyyy or yyyy-mm-dd → a real Excel date, so the column sorts. */
function toDate(v?: string | null): Date | null {
  if (!v) return null;
  const part = String(v).split("T")[0];
  const sep = part.includes("-") ? "-" : "/";
  const bits = part.split(sep);
  if (bits.length !== 3) return null;
  const [a, b, c] = bits.map(Number);
  if ([a, b, c].some(Number.isNaN)) return null;
  const d = bits[0].length === 4 ? new Date(a, b - 1, c) : new Date(c, b - 1, a);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Blank instead of a bare 0, so an empty cell reads as "no value". */
const num = (n: number) => (Math.round(n) !== 0 ? Math.round(n) : null);

/** A percentage column's value: Excel wants the fraction, absent stays absent. */
const pctOrNull = (v: number | string | null | undefined) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n / 100 : null;
};

const scheduleName = (id: number) => schedules.find((s) => s.id === id)?.schedule_name ?? "";

/**
 * Words right, figures centred — derived from whether the column has a number
 * format, not from its position. It used to be `i <= 3 || i === SPAN - 1`, which
 * is the same answer written as a pair of indices; adding one word column at the
 * front then silently centred הערות and right-aligned a money column.
 */
const alignOf = (ci: number) => (COLS[ci].fmt ? ("center" as const) : ("right" as const));

type Priced = { l: ImportedLoan; res: ReturnType<typeof calculateLoan> };

/** Which column is which, by name, so inserting one cannot silently move a sum. */
const CI = {
  family: 0,
  standing: COLS.findIndex((c) => c.header.startsWith("מעמד")),
  amount: COLS.findIndex((c) => c.header.startsWith("יתרה")),
  rate: COLS.findIndex((c) => c.header === "ריבית"),
  anchor: COLS.findIndex((c) => c.header === "עוגן"),
  frequency: COLS.findIndex((c) => c.header.startsWith("תדירות שינוי")),
  monthly: COLS.findIndex((c) => c.header.startsWith("החזר")),
  interest: COLS.findIndex((c) => c.header.startsWith('סה"כ ריבית')),
  cost: COLS.findIndex((c) => c.header.startsWith("עלות כוללת")),
} as const;

/** The figure a totalled column carries on one row, before rounding. */
function cellValue(x: Priced, colIndex: number): number {
  if (colIndex === CI.amount) return Number(x.l.amount) || 0;
  if (colIndex === CI.monthly) return x.res.monthlyPayment;
  if (colIndex === CI.interest) return x.res.totalInterest;
  return x.res.totalPaid;
}

/**
 * The cached result for a SUM over one of the totalled columns.
 *
 * ROUNDS PER ROW, then adds — because that is what the formula beside it will
 * do. Every money cell is written through `num()`, which rounds, so `SUM(M18:M31)`
 * adds fourteen ALREADY-ROUNDED shekels. Summing the raw values here and
 * rounding once at the end is a different number: the two disagreed by a shekel
 * on this report, so `13,870 + 20,999` came to `34,868`. Worse, the cached value
 * is only what the file *shows until Excel recalculates* — the first edit
 * anywhere would have quietly moved the total to the formula's answer.
 *
 * One rule for the whole sheet: what is stored is what Excel would compute.
 */
function columnTotal(rows: Priced[], colIndex: number): number {
  return rows.reduce((s, x) => s + Math.round(cellValue(x, colIndex)), 0);
}

// The split that governs this sheet lives in ./credit — see isSurety there.

/* -------------------------------------------------------------------- sheet */

function buildSheet(wb: Workbook, input: ExcelInput): void {
  const { loans, annualInflation, clients } = input;

  const ws = wb.addWorksheet("תמהיל", {
    views: [{ rightToLeft: true, showGridLines: false }],
    properties: { defaultRowHeight: 17, tabColor: { argb: C.primary } },
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });
  COLS.forEach((c, i) => (ws.getColumn(i + 1).width = c.width));

  /* ------------------------------------------------------------ figures --- */
  // Priced once, split once, above every row that prints — the masthead quotes
  // החזר לשקל and the strip below it quotes four totals, and all of them have to
  // be the same arithmetic as the table at the bottom of the sheet.

  const per = loans.map((l) => ({ l, res: calculateLoan(l, annualInflation) }));
  // The split that governs the whole sheet — see isSurety.
  const owed = per.filter((x) => !isSurety(x.l));
  const sureties = per.filter((x) => isSurety(x.l));

  // Through columnTotal, so the four headline figures ARE the grand-total row
  // further down rather than a second, independently-rounded opinion of it.
  const totalAmount = columnTotal(owed, CI.amount);
  const totalMonthly = columnTotal(owed, CI.monthly);
  const totalInterest = columnTotal(owed, CI.interest);
  const totalCost = columnTotal(owed, CI.cost);

  const suretyAmount = columnTotal(sureties, CI.amount);
  const suretyMonthly = columnTotal(sureties, CI.monthly);

  // החזר לשקל, through the one definition in ./credit — the sheet, the board's
  // rail and the comparison table all print this under the same name, so they
  // cannot be allowed to divide by different denominators. Note it is NOT
  // totalCost / totalAmount: a row with no term pays nothing, and leaving its
  // balance in the denominator makes a mix look cheaper the more unschedulable
  // debt it carries.
  const perShekel = perShekelOf(
    owed.map((x) => x.l),
    annualInflation
  ).value;

  let r = 1;

  /* --------------------------------------------------------- masthead --- */

  // a 4px rule of the brand colour, the sheet's version of the page's rail
  ws.mergeCells(r, 1, r, SPAN);
  ws.getRow(r).height = 4;
  ws.getCell(r, 1).fill = solid(C.primary);
  r += 1;

  // Title on the right, who this is on the left — one row instead of two.
  const half = Math.ceil(SPAN / 2);
  ws.mergeCells(r, 1, r, half);
  const title = ws.getCell(r, 1);
  title.value = "סימולטור תמהילים";
  title.font = { name: FONT, size: 16, bold: true, color: { argb: C.ink } };
  title.alignment = { horizontal: "right", vertical: "middle" };

  ws.mergeCells(r, half + 1, r, SPAN);
  const sub = ws.getCell(r, half + 1);
  const who = clients.map((c) => (c.id ? `${c.name} (${c.id})` : c.name)).filter(Boolean).join("  ·  ");
  sub.value = [input.mixName, who].filter(Boolean).join("   ·   ");
  sub.font = { name: FONT, size: 10.5, color: { argb: C.ink3 } };
  sub.alignment = { horizontal: "left", vertical: "middle" };
  ws.getRow(r).height = 24;
  r += 1;

  ws.mergeCells(r, 1, r, SPAN);
  const stamp = ws.getCell(r, 1);
  const d = new Date();
  const dd = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  // A board of nothing but guarantees has no cost per shekel — the client is not
  // paying any of them. 0.00 would be a figure where there is no figure.
  stamp.value = [
    `הופק ב-${dd}`,
    `אינפלציה שנתית בהנחה: ${annualInflation}%`,
    totalAmount ? `החזר לשקל: ${perShekel.toFixed(2)}` : "",
  ]
    .filter(Boolean)
    .join("   ·   ");
  stamp.font = { name: FONT, size: 9, color: { argb: C.ink3 } };
  stamp.alignment = { horizontal: "right", vertical: "middle" };
  ws.getRow(r).height = 14;
  r += 1;
  ws.getRow(r).height = 5; // hairline of air, not a whole empty row
  r += 1;

  /* ------------------------------------------------------------ totals --- */

  const kpis: [string, number][] = [
    ["סכום התמהיל", totalAmount],
    ["החזר חודשי", totalMonthly],
    ['סה"כ ריבית', totalInterest],
    ["עלות כוללת", totalCost],
  ];

  // Four figures across twelve columns: three each, so the strip lands exactly
  // on the grid the detail table below it uses.
  const KPI_W = Math.floor(SPAN / kpis.length);
  const kpiStart = r;
  kpis.forEach((k, i) => {
    const c1 = 1 + i * KPI_W;
    const c2 = i === kpis.length - 1 ? SPAN : c1 + KPI_W - 1;

    ws.mergeCells(kpiStart, c1, kpiStart, c2);
    const lab = ws.getCell(kpiStart, c1);
    lab.value = k[0];
    lab.font = { name: FONT, size: 9, bold: true, color: { argb: C.ink3 } };
    lab.alignment = { horizontal: "right", vertical: "middle" };

    ws.mergeCells(kpiStart + 1, c1, kpiStart + 1, c2);
    const val = ws.getCell(kpiStart + 1, c1);
    val.value = Math.round(k[1]);
    val.numFmt = MONEY;
    val.font = { name: FONT, size: 15, bold: true, color: { argb: i === 1 ? C.primary : C.ink } };
    val.alignment = { horizontal: "right", vertical: "middle" };

    for (let c = c1; c <= c2; c += 1) {
      ws.getCell(kpiStart, c).fill = solid(C.band);
      ws.getCell(kpiStart + 1, c).fill = solid(C.band);
      ws.getCell(kpiStart + 1, c).border = { bottom: thin(C.line2) };
    }
  });
  ws.getRow(kpiStart).height = 14;
  ws.getRow(kpiStart + 1).height = 23;
  r = kpiStart + 2;

  // What those four figures leave out, said immediately under them rather than
  // 40 rows down where the guarantees are actually listed. A headline number
  // with a silent exclusion is the same defect as one with a silent inclusion.
  if (sureties.length) {
    ws.mergeCells(r, 1, r, SPAN);
    const aside = ws.getCell(r, 1);
    aside.value =
      `בנוסף: ${sureties.length} ${sureties.length === 1 ? "התחייבות" : "התחייבויות"} בערבות ` +
      `בסך ${Math.round(suretyAmount).toLocaleString("en-US")} ₪ ` +
      `(החזר ${Math.round(suretyMonthly).toLocaleString("en-US")} ₪ לחודש) — ` +
      `חוב של אחר שהלקוח ערב לו, ואינו נכלל בסיכומים שלמעלה. מפורט בסוף הגיליון.`;
    aside.font = { name: FONT, size: 9, bold: true, color: { argb: C.surety } };
    aside.alignment = { horizontal: "right", vertical: "middle" };
    aside.fill = solid(C.suretyWash);
    ws.getRow(r).height = 15;
    r += 1;
  }

  ws.getRow(r).height = 6;
  r += 1;

  /* -------------------------------------------------- composition ------ */

  // The client's own mix. A track composition that counts a guaranteed loan is
  // describing a mix the client cannot refinance.
  const tracks = [1, 2, 3, 4, 5]
    .map((id) => {
      const rows = owed.filter((x) => x.l.path_id === id);
      return {
        id,
        amount: rows.reduce((s, x) => s + (Number(x.l.amount) || 0), 0),
        monthly: rows.reduce((s, x) => s + x.res.monthlyPayment, 0),
        count: rows.length,
      };
    })
    .filter((t) => t.amount > 0);

  if (tracks.length) {
    const head = ws.getCell(r, 1);
    head.value = "הרכב לפי מסלול";
    head.font = { name: FONT, size: 11, bold: true, color: { argb: C.ink } };
    head.alignment = { horizontal: "right" };
    r += 1;

    const cHead = ["מסלול", "שורות", "יתרה (₪)", "% מהתמהיל", "החזר חודשי (₪)"];
    cHead.forEach((h, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value = h;
      cell.font = { name: FONT, size: 9, bold: true, color: { argb: C.ink2 } };
      cell.alignment = { horizontal: i === 0 ? "right" : "center", vertical: "middle" };
      cell.fill = solid(C.band);
      cell.border = { bottom: thin(C.line2) };
    });
    r += 1;

    for (const t of tracks) {
      const cells = [
        PATH_LABEL[t.id],
        t.count,
        Math.round(t.amount),
        totalAmount ? t.amount / totalAmount : 0,
        Math.round(t.monthly),
      ];
      cells.forEach((v, i) => {
        const cell = ws.getCell(r, i + 1);
        cell.value = v as string | number;
        cell.font = { name: FONT, size: 10, color: { argb: C.ink2 }, bold: i === 0 };
        cell.alignment = { horizontal: i === 0 ? "right" : "center", vertical: "middle" };
        if (i === 2 || i === 4) cell.numFmt = MONEY;
        if (i === 3) cell.numFmt = "0%";
        cell.border = { bottom: thin(C.line) };
      });
      // the track's colour, as a swatch on the leading edge
      ws.getCell(r, 1).border = { bottom: thin(C.line), right: { style: "thick", color: { argb: TRACK_ARGB[t.id] } } };
      r += 1;
    }
    ws.getRow(r).height = 6;
    r += 1;
  }

  /* --------------------------------------------------- the detail table -- */

  const headRow = r;
  COLS.forEach((c, i) => {
    const cell = ws.getCell(headRow, i + 1);
    cell.value = c.header;
    cell.font = { name: FONT, size: 9.5, bold: true, color: { argb: C.white } };
    cell.fill = solid(C.ink);
    cell.alignment = { horizontal: alignOf(i), vertical: "middle", wrapText: true };
  });
  ws.getRow(headRow).height = 24;
  r += 1;

  const famOf = (l: ImportedLoan): DebtGroup => (l.group === "loan" ? "loan" : "mortgage");
  const groups: DebtGroup[] = ["mortgage", "loan"];

  /** One data row of the detail table, in the family's colours. */
  const writeRow = (x: Priced, i: number, accent: string): void => {
    const { l, res } = x;
    const g = famOf(l);
    const notes = [l.is_shared ? "מופיע בשני הדוחות" : "", res.isIndexed ? "צמוד מדד" : ""]
      .filter(Boolean)
      .join(" · ");

    const values: (string | number | Date | null)[] = [
      FAMILY[g].label,
      isSurety(l) ? "ערב" : "חייב",
      // The document's own wording, kept in full — this column is the audit
      // trail, and the grid is where the name is shortened. Only the reversed
      // bracket pdf.js leaves in an RTL run is repaired; see repairName.
      lenderOf(l.source_bank).full || "—",
      PATH_LABEL[l.path_id] ?? "",
      scheduleName(l.amortization_schedule_id),
      num(Number(l.amount) || 0),
      (Number(l.rate) || 0) / 100,
      // Both anchor fields are percentages; blank stays blank, because 0% and
      // "not anchored" are different facts about a row.
      pctOrNull(l.anchor),
      pctOrNull(l.anchor_margin),
      // Months, so the column sorts and filters like the number it is.
      Number(l.anchor_interval) > 0 ? Number(l.anchor_interval) : null,
      Number(l.months) || null,
      toDate(l.loan_end_date ?? l.end_date),
      num(res.monthlyPayment),
      num(res.totalInterest),
      num(res.totalPaid),
      notes || null,
    ];

    values.forEach((v, ci) => {
      const cell = ws.getCell(r, ci + 1);
      cell.value = v as string | number | Date | null;
      cell.font = {
        name: FONT,
        size: 10,
        color: { argb: ci === CI.family ? accent : ci === CI.standing ? C.surety : C.ink2 },
        bold: ci === CI.family || ci === CI.standing || ci === CI.amount || ci === CI.monthly,
      };
      cell.alignment = { horizontal: alignOf(ci), vertical: "middle" };
      const fmt = COLS[ci].fmt;
      if (fmt === "money") cell.numFmt = MONEY;
      if (fmt === "pct") cell.numFmt = PCT;
      if (fmt === "int") cell.numFmt = "#,##0";
      if (fmt === "date") cell.numFmt = "dd/mm/yyyy";
      cell.border = { bottom: thin(C.line) };
      if (i % 2 === 1) cell.fill = solid(C.band);
    });
    // the spine, in the family's colour
    ws.getCell(r, 1).border = { bottom: thin(C.line), right: { style: "medium", color: { argb: accent } } };
    // a high rate is the one thing the sheet flags, same rule as the screen
    const rate = Number(l.rate) || 0;
    const hot = g === "loan" ? rate >= 10 : rate >= 6.5;
    if (hot) ws.getCell(r, CI.rate + 1).font = { name: FONT, size: 10, bold: true, color: { argb: C.amber } };
    r += 1;
  };

  /** A band naming the block below it, painted across the grid. */
  const writeBand = (label: string, accent: string, wash: string): void => {
    const band = ws.getCell(r, 1);
    band.value = label;
    band.font = { name: FONT, size: 10.5, bold: true, color: { argb: accent } };
    band.alignment = { horizontal: "right", vertical: "middle" };
    for (let c = 1; c <= SPAN; c += 1) ws.getCell(r, c).fill = solid(wash);
    ws.getCell(r, 1).border = { right: { style: "medium", color: { argb: accent } } };
    ws.getRow(r).height = 19;
    r += 1;
  };

  /**
   * A subtotal under the rows it totals — a live formula with the value cached,
   * so the figure is already there the moment the file opens.
   */
  const writeSubtotal = (
    label: string,
    rows: Priced[],
    first: number,
    last: number,
    accent: string,
    wash: string
  ): void => {
    COLS.forEach((c, ci) => {
      const cell = ws.getCell(r, ci + 1);
      if (ci === 0) cell.value = label;
      else if (c.total)
        cell.value = {
          formula: `SUM(${colLetter(ci + 1)}${first}:${colLetter(ci + 1)}${last})`,
          result: columnTotal(rows, ci),
        };
      cell.font = { name: FONT, size: 10.5, bold: true, color: { argb: ci === 0 ? accent : C.ink } };
      cell.alignment = { horizontal: ci === 0 ? "right" : "center", vertical: "middle" };
      if (c.fmt === "money") cell.numFmt = MONEY;
      cell.fill = solid(wash);
      cell.border = { top: thin(accent), bottom: thin(C.line2) };
    });
    ws.getRow(r).height = 20;
    r += 1;
    ws.getRow(r).height = 6;
    r += 1;
  };

  // Each family's data rows, so the grand total can sum THEM and skip the
  // subtotal rows sitting between them — a single first..last span would count
  // every mortgage twice.
  const dataRanges: [number, number][] = [];

  for (const g of groups) {
    const rows = owed.filter((x) => famOf(x.l) === g);
    if (!rows.length) continue;

    const accent = g === "mortgage" ? C.mortgage : C.loan;
    const wash = g === "mortgage" ? C.mortgageWash : C.loanWash;

    // Group band, left unmerged so a column can still be copied out cleanly.
    writeBand(`${FAMILY[g].plural}   (${rows.length})`, accent, wash);

    const groupFirst = r;
    rows.forEach((x, i) => writeRow(x, i, accent));
    dataRanges.push([groupFirst, r - 1]);

    writeSubtotal(`סה"כ ${FAMILY[g].plural}`, rows, groupFirst, r - 1, accent, wash);
  }

  /* ---------------------------------------------------- grand total ----- */

  if (dataRanges.length) {
    COLS.forEach((c, ci) => {
      const cell = ws.getCell(r, ci + 1);
      // Named, not just "סה\"כ התמהיל": with a guarantee block underneath, the
      // total has to say WHOSE debt it adds up, or the reader supplies the
      // wrong answer from the rows nearest to it.
      if (ci === 0) cell.value = 'סה"כ התחייבויות הלקוח';
      else if (c.total) {
        const L = colLetter(ci + 1);
        // the raw rows of each family, never the subtotal rows between them —
        // and never the guarantees, which are not the client's to repay
        const args = dataRanges.map(([a, b]) => `${L}${a}:${L}${b}`).join(",");
        cell.value = { formula: `SUM(${args})`, result: columnTotal(owed, ci) };
      }
      cell.font = { name: FONT, size: 11.5, bold: true, color: { argb: C.white } };
      cell.alignment = { horizontal: ci === 0 ? "right" : "center", vertical: "middle" };
      if (c.fmt === "money") cell.numFmt = MONEY;
      cell.fill = solid(C.ink);
    });
    ws.getRow(r).height = 24;
    r += 1;
    ws.getRow(r).height = 6;
    r += 1;
  }

  /* ------------------------------------------------------ guarantees ---- */

  // AFTER the grand total, deliberately. Placed before it, a reader running
  // their eye down the column to the ink bar would still land on a sum that
  // appears to include these rows. Placed after it, the structure of the sheet
  // says what the labels say: the total closed, and this is something else.
  if (sureties.length) {
    writeBand(`בערבות   (${sureties.length})`, C.surety, C.suretyWash);

    const first = r;
    sureties.forEach((x, i) => writeRow(x, i, C.surety));
    writeSubtotal('סה"כ בערבות — אינו נכלל בסיכום', sureties, first, r - 1, C.surety, C.suretyWash);

    ws.mergeCells(r, 1, r, SPAN);
    const note = ws.getCell(r, 1);
    note.value =
      "התחייבויות שהלקוח ערב להן ואינו הלווה בהן. הן מופיעות בדוח ריכוז הנתונים תחת " +
      '"עסקאות בהן הלקוח ערב", ואינן חלק מההחזר החודשי שלו — אך הן חשיפה קיימת לכל דבר ' +
      "ובנק בוחן אותן באישור אשראי.";
    note.font = { name: FONT, size: 8.5, italic: true, color: { argb: C.ink3 } };
    note.alignment = { horizontal: "right", vertical: "middle", wrapText: true };
    ws.getRow(r).height = 14;
    r += 1;
  }
}

/** 1 → A, 27 → AA. */
function colLetter(n: number): string {
  let s = "";
  let x = n;
  while (x > 0) {
    const m = (x - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    x = Math.floor((x - m) / 26);
  }
  return s;
}

/* --------------------------------------------------------------- workbook */

export function workbookFileName(input: ExcelInput): string {
  const who = input.clients.map((c) => c.name).filter(Boolean).join(" + ");
  const d = new Date();
  const stamp = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  const safe = (who || input.mixName || "תמהיל").replace(/[\\/:*?"<>|]/g, " ").slice(0, 60);
  return `תמהיל - ${safe} - ${stamp}.xlsx`;
}

export async function buildMixWorkbook(input: ExcelInput): Promise<Workbook> {
  // Dynamic: ExcelJS is ~1MB, and nobody should pay for it until they click.
  // The bundler resolves the package's `browser` build (a UMD bundle) and hoists
  // its exports, while Node hands back the CJS namespace under `default` — so
  // take whichever half of the interop actually carries the constructor.
  const mod = await import("exceljs");
  const ExcelJS = ("Workbook" in mod ? mod : (mod as { default: typeof mod }).default) as typeof mod;
  const wb = new ExcelJS.Workbook();

  wb.creator = "סימולטור תמהילים";
  wb.lastModifiedBy = "סימולטור תמהילים";
  wb.created = new Date();
  wb.modified = new Date();
  wb.title = `תמהיל · ${input.mixName}`;
  wb.subject = input.clients.map((c) => c.name).filter(Boolean).join(" + ") || "תמהיל משכנתא";

  buildSheet(wb, input);
  return wb;
}

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/**
 * Builds the workbook and hands it to the user. Everything happens in the tab —
 * the credit report never leaves the browser, which is the promise the intake
 * bay makes.
 */
export async function exportMixToExcel(input: ExcelInput): Promise<void> {
  const wb = await buildMixWorkbook(input);
  const buffer = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: XLSX_MIME }));

  const a = document.createElement("a");
  a.href = url;
  a.download = workbookFileName(input);
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Safari needs the object URL to outlive the click before it is reclaimed.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export type { Worksheet };
