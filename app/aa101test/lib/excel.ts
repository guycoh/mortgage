// The /aa101test Excel export.
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
import { FAMILY, PATH_LABEL, type DebtGroup, type ImportedLoan } from "./credit";

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
  { header: "מקור / גורם מדווח", width: 26 },
  { header: "מסלול", width: 17 },
  { header: "לוח סילוקין", width: 12.5 },
  { header: "יתרה (₪)", width: 14, fmt: "money", total: true },
  { header: "ריבית", width: 9.5, fmt: "pct" },
  { header: "עוגן", width: 9.5, fmt: "pct" },
  { header: "מרווח", width: 9, fmt: "pct" },
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

type Priced = { l: ImportedLoan; res: ReturnType<typeof calculateLoan> };

/** Which column is which, by name, so inserting one cannot silently move a sum. */
const CI = {
  family: 0,
  amount: COLS.findIndex((c) => c.header.startsWith("יתרה")),
  rate: COLS.findIndex((c) => c.header === "ריבית"),
  anchor: COLS.findIndex((c) => c.header === "עוגן"),
  frequency: COLS.findIndex((c) => c.header.startsWith("תדירות שינוי")),
  monthly: COLS.findIndex((c) => c.header.startsWith("החזר")),
  interest: COLS.findIndex((c) => c.header.startsWith('סה"כ ריבית')),
} as const;

/** The cached result for a SUM over one of the totalled columns. */
function columnTotal(rows: Priced[], colIndex: number): number {
  const pick = (x: Priced) =>
    colIndex === CI.amount
      ? Number(x.l.amount) || 0
      : colIndex === CI.monthly
        ? x.res.monthlyPayment
        : colIndex === CI.interest
          ? x.res.totalInterest
          : x.res.totalPaid;
  return Math.round(rows.reduce((s, x) => s + pick(x), 0));
}

function costPerShekel(loans: ImportedLoan[], inflation: number): number {
  const amount = loans.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  if (!amount) return 0;
  const paid = loans.reduce((s, l) => s + calculateLoan(l, inflation).totalPaid, 0);
  return paid / amount;
}

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
  const perShekel = costPerShekel(loans, annualInflation);
  stamp.value = `הופק ב-${dd}   ·   אינפלציה שנתית בהנחה: ${annualInflation}%   ·   עלות לשקל: ${perShekel.toFixed(2)}`;
  stamp.font = { name: FONT, size: 9, color: { argb: C.ink3 } };
  stamp.alignment = { horizontal: "right", vertical: "middle" };
  ws.getRow(r).height = 14;
  r += 1;
  ws.getRow(r).height = 5; // hairline of air, not a whole empty row
  r += 1;

  /* ------------------------------------------------------------ totals --- */

  const per = loans.map((l) => ({ l, res: calculateLoan(l, annualInflation) }));
  const sum = (f: (x: (typeof per)[number]) => number) => per.reduce((s, x) => s + f(x), 0);

  const totalAmount = sum(({ l }) => Number(l.amount) || 0);
  const totalMonthly = sum(({ res }) => res.monthlyPayment);
  const totalInterest = sum(({ res }) => res.totalInterest);
  const totalCost = sum(({ res }) => res.totalPaid);

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
  ws.getRow(kpiStart + 2).height = 6;
  r = kpiStart + 3;

  /* -------------------------------------------------- composition ------ */

  const tracks = [1, 2, 3, 4, 5]
    .map((id) => {
      const rows = per.filter((x) => x.l.path_id === id);
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
    cell.alignment = { horizontal: i <= 3 || i === SPAN - 1 ? "right" : "center", vertical: "middle", wrapText: true };
  });
  ws.getRow(headRow).height = 24;
  r += 1;

  const famOf = (l: ImportedLoan): DebtGroup => (l.group === "loan" ? "loan" : "mortgage");
  const groups: DebtGroup[] = ["mortgage", "loan"];

  // Each family's data rows, so the grand total can sum THEM and skip the
  // subtotal rows sitting between them — a single first..last span would count
  // every mortgage twice.
  const dataRanges: [number, number][] = [];

  for (const g of groups) {
    const rows = per.filter((x) => famOf(x.l) === g);
    if (!rows.length) continue;

    const accent = g === "mortgage" ? C.mortgage : C.loan;
    const wash = g === "mortgage" ? C.mortgageWash : C.loanWash;

    // Group band, left unmerged so a column can still be copied out cleanly.
    const band = ws.getCell(r, 1);
    band.value = `${FAMILY[g].plural}   (${rows.length})`;
    band.font = { name: FONT, size: 10.5, bold: true, color: { argb: accent } };
    band.fill = solid(wash);
    band.alignment = { horizontal: "right", vertical: "middle" };
    for (let c = 1; c <= SPAN; c += 1) ws.getCell(r, c).fill = solid(wash);
    ws.getCell(r, 1).border = { right: { style: "medium", color: { argb: accent } } };
    ws.getRow(r).height = 19;
    r += 1;

    const groupFirst = r;
    rows.forEach((x, i) => {
      const { l, res } = x;
      const notes = [
        l.is_shared ? "מופיע בשני הדוחות" : "",
        l.is_guarantor ? "בערבות" : "",
        res.isIndexed ? "צמוד מדד" : "",
      ]
        .filter(Boolean)
        .join(" · ");

      const values: (string | number | Date | null)[] = [
        FAMILY[g].label,
        (l.source_bank ?? "").trim() || "—",
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
          color: { argb: ci === 0 ? accent : C.ink2 },
          bold: ci === CI.family || ci === CI.amount || ci === CI.monthly,
        };
        cell.alignment = {
          // words right, figures centred
          horizontal: ci <= 3 || ci === SPAN - 1 ? "right" : "center",
          vertical: "middle",
        };
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
      if (hot)
        ws.getCell(r, CI.rate + 1).font = { name: FONT, size: 10, bold: true, color: { argb: C.amber } };
      r += 1;
    });

    dataRanges.push([groupFirst, r - 1]);

    // group subtotal — a live formula, with the value cached so the figure is
    // already there the moment the file opens, before any recalculation
    const groupLast = r - 1;
    COLS.forEach((c, ci) => {
      const cell = ws.getCell(r, ci + 1);
      if (ci === 0) cell.value = `סה"כ ${FAMILY[g].plural}`;
      else if (c.total)
        cell.value = {
          formula: `SUM(${colLetter(ci + 1)}${groupFirst}:${colLetter(ci + 1)}${groupLast})`,
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
  }

  /* ---------------------------------------------------- grand total ----- */

  if (dataRanges.length) {
    COLS.forEach((c, ci) => {
      const cell = ws.getCell(r, ci + 1);
      if (ci === 0) cell.value = 'סה"כ התמהיל';
      else if (c.total) {
        const L = colLetter(ci + 1);
        // the raw rows of each family, never the subtotal rows between them
        const args = dataRanges.map(([a, b]) => `${L}${a}:${L}${b}`).join(",");
        cell.value = { formula: `SUM(${args})`, result: columnTotal(per, ci) };
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
