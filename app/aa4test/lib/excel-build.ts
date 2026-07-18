// Builds the /aa4test "export to Excel" workbook: everything the importer
// parsed and organised out of one or two credit-data reports, on ONE sheet.
//
// The sheet is a single continuous listing — masthead, then every debt grouped
// into its BDI page-2 family (משכנתאות · הלוואות · מסגרות אשראי וכרטיסים ·
// חשבונות עובר ושב · התחייבויות נוספות), each group closed by its own totals
// row, the whole thing closed by a grand total, and any legal proceedings or
// arrears remarks listed underneath.
//
// Every family shares one column grid, so a debt's row reads the same wherever
// it sits and columns that don't apply to a family simply stay blank. Nothing
// below the header row is merged, which keeps the auto-filter usable.
//
// Kept free of React and of `window` so scripts/test-excel.mts can build and
// inspect the same workbook headlessly.

import type { Workbook, Worksheet } from "exceljs";
import type { LiabilityRow, ReportSlot } from "@/lib/credit-parser/liabilities";
import { CATEGORY_LABEL, CATEGORY_ORDER, rowTotals } from "@/lib/credit-parser/liabilities";
import { parseNum, type LiabilityCategory } from "@/lib/credit-parser/loan-mapping";
import type { Transaction } from "@/lib/credit-parser/types";
import {
  C,
  CATEGORY_COLOR,
  NUM_FMT,
  alignNum,
  alignText,
  boxThin,
  font,
  leadingAccent,
  ruleBottom,
  ruleTotals,
  solid,
  type Fmt,
  type NumFmt,
} from "./excel-theme";

export interface ExportInput {
  slots: ReportSlot[];
  rows: LiabilityRow[];
}

const SHEET_NAME = "פירוט התחייבויות";

/* ========================================================================== */
/* value helpers                                                              */
/* ========================================================================== */

type CellValue = string | number | Date | null;

/** dd/mm/yyyy → a real Excel date, so the column sorts and filters properly. */
function toDate(v?: string): Date | null {
  const m = (v || "").match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** A money figure, or null so the cell stays empty instead of showing a bare 0. */
function money(v: string | number | undefined): number | null {
  const n = typeof v === "number" ? v : parseNum(v || "");
  return n > 0 ? Math.round(n) : null;
}

/** "3.95" → 0.0395, so Excel holds a true percentage under the 0.00% format. */
function pct(v?: string): number | null {
  if (!v) return null;
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n / 100 : null;
}

function int(v?: string | number): number | null {
  const n = typeof v === "number" ? v : parseNum(v || "");
  return n > 0 ? Math.round(n) : null;
}

const text = (v?: string): string | null => (v && v.trim() ? v.trim() : null);

/** A transaction field by code, blank-safe. */
const f = (t: Transaction | undefined, code: string): string => t?.fields[code] ?? "";

const heDate = (d: Date) =>
  d.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "numeric" });

const todayHe = () => heDate(new Date());

const grouped = (n: number) => Math.round(n).toLocaleString("en-US");

/** "151,953 ₪", or "" when there is nothing to show — for prose summaries. */
const shekel = (v?: string) => {
  const n = parseNum(v || "");
  return n > 0 ? `${grouped(n)} ₪` : "";
};

/* ========================================================================== */
/* report lookups                                                             */
/* ========================================================================== */

/** uid → Transaction, per report, so a board row can reach its source record. */
type TxnIndex = Map<string, Transaction>[];

const buildTxnIndex = (slots: ReportSlot[]): TxnIndex =>
  slots.map((s) => new Map((s.report.transactions ?? []).map((t) => [t.uid, t])));

/** Every raw transaction behind a row — two, for a merged joint debt. */
function rowTxns(row: LiabilityRow, idx: TxnIndex): Transaction[] {
  return row.sources
    .map((s) => idx[s.person]?.get(s.loan.uid))
    .filter((t): t is Transaction => !!t);
}

const rowTxn = (row: LiabilityRow, idx: TxnIndex): Transaction | undefined => rowTxns(row, idx)[0];

/** The first source loan — carries parsed extras that never reach LiabilityRow. */
const rowLoan = (row: LiabilityRow) => row.sources[0]?.loan;

const clientName = (slots: ReportSlot[], person: number) =>
  slots[person]?.report.client.name || `דוח ${person + 1}`;

const ownerLabel = (row: LiabilityRow, slots: ReportSlot[]) =>
  `${row.owners.map((o) => clientName(slots, o)).join(" + ")}${row.joint ? " · משותף" : ""}`;

/* ========================================================================== */
/* the column grid                                                            */
/* ========================================================================== */

interface Col {
  header: string;
  width: number;
  fmt?: Fmt;
  /** Paints the family's colour down the row's leading edge. */
  accent?: boolean;
  /** Renders red and bold when the value is non-empty (arrears figures). */
  alert?: boolean;
  /** Sums into the group and grand totals. */
  total?: boolean;
}

/**
 * One grid for every family. A mortgage fills מסלול and חודשים; a card fills
 * מסגרת; a current account fills neither — the cells simply stay empty, which
 * is what keeps a single listing readable across five kinds of debt.
 */
function buildCols(multi: boolean): Col[] {
  return [
    { header: "גורם מדווח", width: 28, accent: true },
    { header: "סוג עסקה", width: 20 },
    { header: "מסלול", width: 17 },
    ...(multi ? [{ header: "בעלות", width: 24 } as Col] : []),
    { header: "תפקיד", width: 9.5 },
    { header: "יתרת חוב (₪)", width: 14, fmt: "money", total: true },
    { header: "מסגרת (₪)", width: 13, fmt: "money", total: true },
    { header: "סכום מקורי (₪)", width: 14, fmt: "money", total: true },
    { header: "ריבית", width: 10, fmt: "pct" },
    { header: "חודשים", width: 9.5, fmt: "int" },
    { header: "החזר חודשי (₪)", width: 14, fmt: "money", total: true },
    { header: "תאריך תחילה", width: 13, fmt: "date" },
    { header: "תאריך סיום", width: 13, fmt: "date" },
    { header: "לא שולם במועד (₪)", width: 15, fmt: "money", total: true, alert: true },
    { header: "טווח ימי פיגור", width: 14, alert: true },
    { header: "סטטוס העסקה", width: 34 },
    { header: "מזהה עסקה", width: 16 },
  ];
}

/** One debt as a row on the shared grid. */
function record(
  row: LiabilityRow,
  multi: boolean,
  slots: ReportSlot[],
  idx: TxnIndex
): CellValue[] {
  const t = rowTxn(row, idx);
  const loan = rowLoan(row);
  const revolving = row.category === "card" || row.category === "overdraft";
  return [
    text(row.bank) ?? "—",
    text(row.typeLabel),
    text(row.track),
    ...(multi ? [ownerLabel(row, slots)] : []),
    row.role === "guarantor" ? "ערב" : "חייב",
    money(row.balance),
    money(row.limit),
    money(loan?.origAmount),
    pct(row.interest),
    // A revolving facility has no amortisation term; leave it blank rather than
    // implying one from a planned end date.
    revolving ? null : int(row.months),
    money(row.monthly),
    toDate(loan?.startDate),
    toDate(row.endDate),
    money(row.overdue),
    text(row.arrearsRange),
    text(f(t, "201-022")),
    text(f(t, "201-029")) ?? (row.manual ? "הוזן ידנית" : null),
  ];
}

/* ========================================================================== */
/* drawing primitives                                                         */
/* ========================================================================== */

const numeric = (c: Col) => !!c.fmt && c.fmt !== "text";

/** Write one styled cell. */
function put(
  ws: Worksheet,
  r: number,
  ci: number,
  col: Col,
  value: CellValue,
  o: { fill: string; bold?: boolean; color?: string; size?: number; border?: object }
): void {
  const cell = ws.getCell(r, ci + 1);
  cell.value = value;
  if (numeric(col) && typeof value !== "string") cell.numFmt = NUM_FMT[col.fmt as NumFmt];
  cell.fill = solid(o.fill);
  cell.font = font({ size: o.size ?? 10, bold: o.bold, color: { argb: o.color ?? C.ink } });
  cell.alignment = numeric(col) ? alignNum() : alignText();
  cell.border = (o.border ?? boxThin()) as never;
}

const sumOf = (records: CellValue[][], ci: number) =>
  records.reduce((s, rec) => s + (typeof rec[ci] === "number" ? (rec[ci] as number) : 0), 0);

/* ========================================================================== */
/* the sheet                                                                  */
/* ========================================================================== */

function liabilitiesSheet(wb: Workbook, input: ExportInput, idx: TxnIndex): void {
  const { slots, rows } = input;
  const multi = slots.length > 1;
  const cols = buildCols(multi);
  const span = cols.length;

  const ws = wb.addWorksheet(SHEET_NAME, {
    views: [{ rightToLeft: true, showGridLines: false }],
    properties: { defaultRowHeight: 18, tabColor: { argb: C.brandDeep } },
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
    },
  });
  cols.forEach((c, i) => (ws.getColumn(i + 1).width = c.width));

  /* ---------------------------------------------------------- masthead --- */

  const totals = rowTotals(rows);
  const banks = new Set(rows.map((x) => x.bank).filter(Boolean));
  const reportDates = Array.from(new Set(slots.map((s) => s.report.meta.reportDate).filter(Boolean)));

  ws.mergeCells(1, 1, 1, span);
  ws.getRow(1).height = 5;
  ws.getCell(1, 1).fill = {
    type: "gradient",
    gradient: "angle",
    degree: 0,
    stops: [
      { position: 0, color: { argb: C.brandDeep } },
      { position: 0.55, color: { argb: C.brandBright } },
      { position: 1, color: { argb: C.pos } },
    ],
  };
  ws.getRow(2).height = 7;

  ws.mergeCells(3, 1, 3, span - 2);
  ws.getCell(3, 1).value = "דוח ריכוז נתונים · פירוט התחייבויות";
  ws.getCell(3, 1).font = font({ size: 9, bold: true, color: { argb: C.ink3 } });
  ws.getCell(3, 1).alignment = alignText();
  ws.mergeCells(3, span - 1, 3, span);
  ws.getCell(3, span - 1).value = todayHe();
  ws.getCell(3, span - 1).font = font({ size: 9, color: { argb: C.ink3 } });
  ws.getCell(3, span - 1).alignment = alignNum();
  ws.getRow(3).height = 16;
  for (let c = 1; c <= span; c++) ws.getCell(3, c).border = ruleBottom(C.line);

  ws.mergeCells(5, 1, 5, span);
  ws.getCell(5, 1).value = "עסקות בהן הלקוח חייב";
  ws.getCell(5, 1).font = font({ size: 22, bold: true });
  ws.getCell(5, 1).alignment = alignText({ vertical: "bottom" });
  ws.getRow(5).height = 34;

  ws.mergeCells(6, 1, 6, span);
  ws.getCell(6, 1).value =
    slots
      .map((s) => `${s.report.client.name || "לקוח"}${s.report.client.idNumber ? ` (${s.report.client.idNumber})` : ""}`)
      .join("  ·  ") || "נתונים שהוזנו ידנית";
  ws.getCell(6, 1).font = font({ size: 11, bold: true, color: { argb: C.ink2 } });
  ws.getCell(6, 1).alignment = alignText();
  ws.getRow(6).height = 18;

  ws.mergeCells(7, 1, 7, span);
  ws.getCell(7, 1).value = [
    reportDates.length ? `על בסיס דוח ריכוז נתונים מ-${reportDates.join(" ו-")}` : "על בסיס דוח ריכוז נתונים",
    `${totals.count} התחייבויות`,
    `${banks.size} גורמים מדווחים`,
    totals.joint > 0 ? `${totals.joint} עסקות משותפות נספרות פעם אחת` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  ws.getCell(7, 1).font = font({ size: 9.5, color: { argb: C.ink4 } });
  ws.getCell(7, 1).alignment = alignText();
  ws.getRow(7).height = 15;

  ws.getRow(8).height = 9;
  for (let c = 1; c <= span; c++) ws.getCell(8, c).border = ruleBottom(C.line2, "double");

  /* ------------------------------------------------------ column heads --- */

  const headerRow = 10;
  ws.getRow(headerRow).height = 30;
  cols.forEach((col, i) => {
    const cell = ws.getCell(headerRow, i + 1);
    cell.value = col.header;
    cell.fill = solid(C.brandDeep);
    cell.font = font({ size: 9.5, bold: true, color: { argb: C.white } });
    cell.alignment = numeric(col) ? alignNum({ wrapText: true }) : alignText({ wrapText: true });
    cell.border = boxThin(C.brandDeep);
  });

  /* ----------------------------------------------------------- groups --- */

  let r = headerRow + 1;
  const allRecords: CellValue[][] = [];

  for (const cat of CATEGORY_ORDER) {
    const list = rows
      .filter((x) => x.category === cat)
      .sort((a, b) => parseNum(b.balance) - parseNum(a.balance));
    if (!list.length) continue;

    const accent = CATEGORY_COLOR[cat];
    const t = rowTotals(list);

    // Group band — the family's name in its own colour. Not merged, so the
    // auto-filter over the listing stays valid.
    ws.getRow(r).height = 25;
    cols.forEach((col, i) => {
      const cell = ws.getCell(r, i + 1);
      cell.value =
        i === 0
          ? CATEGORY_LABEL[cat]
          : i === 1
            ? `${list.length} עסקות`
            : null;
      cell.fill = solid(accent);
      cell.font = font({ size: i === 0 ? 12 : 9.5, bold: true, color: { argb: C.white } });
      cell.alignment = alignText({ vertical: "middle" });
      cell.border = { top: { style: "thin", color: { argb: C.white } } };
    });
    r++;

    const records = list.map((row) => record(row, multi, slots, idx));
    records.forEach((rec, ri) => {
      const row = list[ri];
      ws.getRow(r).height = 17;
      // Joint debts keep the board's green tint; everything else zebra-bands.
      const bg = row.joint ? C.posWash : ri % 2 === 1 ? C.band : C.white;
      cols.forEach((col, ci) => {
        const v = rec[ci] ?? null;
        put(ws, r, ci, col, v, {
          fill: bg,
          bold: !!(col.alert && v),
          color: col.alert && v ? C.negDeep : C.ink,
          border: col.accent ? leadingAccent(accent) : boxThin(),
        });
      });
      r++;
    });

    // Group totals, closed with the accounting double rule.
    ws.getRow(r).height = 22;
    cols.forEach((col, ci) => {
      const sum = col.total ? sumOf(records, ci) : 0;
      put(ws, r, ci, col, ci === 0 ? `סה"כ ${CATEGORY_LABEL[cat]}` : col.total && sum > 0 ? sum : null, {
        fill: C.wash,
        bold: true,
        size: ci === 0 ? 10 : 10.5,
        color: col.alert ? C.negDeep : ci === 0 ? C.ink2 : C.brandDeep,
        border: ruleTotals(),
      });
    });
    r++;

    allRecords.push(...records);
  }

  /* ------------------------------------------------------ grand total --- */

  const lastListRow = r - 1;
  ws.getRow(r).height = 28;
  cols.forEach((col, ci) => {
    const sum = col.total ? sumOf(allRecords, ci) : 0;
    const cell = ws.getCell(r, ci + 1);
    cell.value = ci === 0 ? `סה"כ ${allRecords.length} התחייבויות` : col.total && sum > 0 ? sum : null;
    if (numeric(col) && typeof cell.value === "number") cell.numFmt = NUM_FMT[col.fmt as NumFmt];
    cell.fill = solid(C.brandDeep);
    cell.font = font({
      size: ci === 0 ? 11 : 12,
      bold: true,
      color: { argb: col.alert && sum > 0 ? "FFFFC9C2" : C.white },
    });
    cell.alignment = numeric(col) ? alignNum() : alignText();
    cell.border = { top: { style: "double", color: { argb: C.brandDeep } } };
  });
  r += 2;

  // No frozen pane: the sheet reads as one continuous document, so scrolling
  // carries the masthead and the column heads away with everything else. The
  // heads are still repeated at the top of every printed page.
  ws.pageSetup.printTitlesRow = `${headerRow}:${headerRow}`;
  if (allRecords.length)
    ws.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastListRow, column: span } };

  /* ------------------------------------------- proceedings and remarks --- */

  r = notesSection(ws, r, span, input, idx);

  /* --------------------------------------------------------- footnote --- */

  ws.mergeCells(r, 1, r, span);
  ws.getCell(r, 1).value = `הופק מתוך סימולטור איחוד ההלוואות · ${todayHe()} · הנתונים מבוססים על דוח ריכוז נתונים ממערכת נתוני אשראי ואינם מהווים ייעוץ או הצעה מחייבת`;
  ws.getCell(r, 1).font = font({ size: 8.5, color: { argb: C.ink4 } });
  ws.getCell(r, 1).alignment = alignText();
  for (let c = 1; c <= span; c++)
    ws.getCell(r, c).border = { top: { style: "thin", color: { argb: C.line } } };
}

/* ========================================================================== */
/* proceedings, indicators and remarks — prose, not a second grid             */
/* ========================================================================== */

/**
 * The client-level findings that have no place on a per-debt row: enforcement
 * files, insolvency proceedings, non-payment indicators and coded transaction
 * remarks. Rendered as a label plus one readable sentence so they sit on the
 * same sheet without needing a second column grid.
 */
function notesSection(
  ws: Worksheet,
  start: number,
  span: number,
  input: ExportInput,
  idx: TxnIndex
): number {
  const { slots, rows } = input;
  const notes: { label: string; detail: string; tone: "neg" | "amber" }[] = [];

  const who = (name: string) => (slots.length > 1 && name ? `${name} · ` : "");

  for (const s of slots) {
    const name = s.report.client.name || "";

    for (const e of s.report.execution ?? []) {
      const d = e.fields;
      notes.push({
        label: "תיק הוצאה לפועל",
        tone: "neg",
        detail: [
          `${who(name)}תיק ${d["197-003"] || "—"}`,
          d["197-004"],
          d["197-006"] && `נפתח ${d["197-006"]}`,
          shekel(d["197-007"]) && `חוב במועד פתיחה ${shekel(d["197-007"])}`,
          shekel(d["197-009"]) && `יתרה לפעולה אחרונה ${shekel(d["197-009"])}`,
          d["197-013"] ? `נסגר ${d["197-013"]}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }

    for (const e of s.report.insolvency ?? []) {
      const d = e.fields;
      notes.push({
        label: "הליך חדלות פירעון",
        tone: "neg",
        detail: [
          `${who(name)}${d["151-003"] || "הליך"}`,
          d["151-001"] && `תיק ${d["151-001"]}`,
          d["151-004"] && `מחוז ${d["151-004"]}`,
          d["151-015"] && `סטטוס: ${d["151-015"]}${d["151-016"] ? ` (${d["151-016"]})` : ""}`,
          shekel(d["151-009"]) && `חוב לפי הכרעת נאמן ${shekel(d["151-009"])}`,
          d["151-011"] && `צו פשיטת רגל ${d["151-011"]}`,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }

    for (const n of s.report.nonPaymentIndicators ?? [])
      notes.push({
        label: "אי עמידה בפירעון",
        tone: "neg",
        detail: [
          `${who(name)}${n.source || "—"}`,
          n.id && `מזהה ${n.id}`,
          n.reportDate && `דווח ${n.reportDate}`,
          n.description,
          n.stopsCollection ? "מפסיק איסוף נתונים" : null,
        ]
          .filter(Boolean)
          .join(" · "),
      });

    for (const w of s.report.warnings ?? [])
      notes.push({ label: "אימות נתונים", tone: "amber", detail: `${who(name)}${w}` });
  }

  for (const row of rows)
    for (const t of rowTxns(row, idx))
      for (const rm of t.remarks ?? [])
        notes.push({
          label: "הערת עסקה",
          tone: "amber",
          detail: `${row.bank || "—"}${row.typeLabel ? ` · ${row.typeLabel}` : ""} · ${rm}`,
        });

  if (!notes.length) return start;

  let r = start;
  ws.mergeCells(r, 1, r, span);
  ws.getCell(r, 1).value = `דגלים והליכים  ·  ${notes.length} ממצאים`;
  ws.getCell(r, 1).font = font({ size: 12, bold: true });
  ws.getCell(r, 1).alignment = alignText({ vertical: "bottom" });
  ws.getCell(r, 1).border = { right: { style: "medium", color: { argb: C.neg } } };
  ws.getRow(r).height = 24;
  r++;

  for (const note of notes) {
    const wash = note.tone === "neg" ? C.negWash : C.amberWash;
    const ink = note.tone === "neg" ? C.negDeep : C.amber;
    ws.getRow(r).height = 19;

    const lab = ws.getCell(r, 1);
    lab.value = note.label;
    lab.font = font({ size: 10, bold: true, color: { argb: ink } });
    lab.alignment = alignText();
    lab.fill = solid(wash);
    lab.border = leadingAccent(ink, wash);

    ws.mergeCells(r, 2, r, span);
    ws.getCell(r, 2).value = note.detail;
    ws.getCell(r, 2).font = font({ size: 10, color: { argb: C.ink2 } });
    ws.getCell(r, 2).alignment = alignText();
    for (let c = 2; c <= span; c++) {
      ws.getCell(r, c).fill = solid(wash);
      ws.getCell(r, c).border = boxThin(wash);
    }
    r++;
  }

  return r + 1;
}

/* ========================================================================== */
/* public API                                                                 */
/* ========================================================================== */

/** The workbook's file name: who it is about, and when it was produced. */
export function workbookFileName(slots: ReportSlot[]): string {
  const names = slots
    .map((s) => s.report.client.name?.trim())
    .filter(Boolean)
    .join(" ו-");
  const stamp = todayHe().replace(/[/.]/g, "-");
  // Windows and macOS reject these in file names; Hebrew and spaces are fine.
  const safe = (names || "לקוח").replace(/[\\/:*?"<>|]/g, " ").slice(0, 60);
  return `פירוט התחייבויות - ${safe} - ${stamp}.xlsx`;
}

export async function buildLiabilitiesWorkbook(input: ExportInput): Promise<Workbook> {
  // Dynamic: ExcelJS is ~1MB, and nobody should pay for it until they click.
  // The bundler resolves the package's `browser` build (a UMD bundle) and hoists
  // its exports, while Node hands back the CJS namespace under `default` — so
  // take whichever half of the interop actually carries the constructor.
  const mod = await import("exceljs");
  const ExcelJS = ("Workbook" in mod ? mod : (mod as { default: typeof mod }).default) as typeof mod;
  const wb = new ExcelJS.Workbook();

  const first = input.slots[0]?.report;
  wb.creator = "סימולטור איחוד הלוואות";
  wb.lastModifiedBy = "סימולטור איחוד הלוואות";
  wb.created = new Date();
  wb.modified = new Date();
  wb.title = "פירוט התחייבויות";
  wb.subject = first?.client.name ? `דוח ריכוז נתונים · ${first.client.name}` : "דוח ריכוז נתונים";
  wb.company = "סימולטור איחוד הלוואות";

  liabilitiesSheet(wb, input, buildTxnIndex(input.slots));
  return wb;
}
