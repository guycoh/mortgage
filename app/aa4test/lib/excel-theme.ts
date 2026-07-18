// Excel design system for the /aa4test export — the workbook counterpart of
// aa4-theme.css. Same cool-neutral canvas, same petrol accent, same semantic
// green/red, so a spreadsheet handed to a client reads as the same document
// family as the on-screen board and the printed customer summary.
//
// Everything here is presentation-only and framework-free, so the builder can
// run headless in a test script as well as in the browser.

import type { Alignment, Borders, Fill, Font } from "exceljs";

/* ------------------------------------------------------------------ palette */

/** ARGB constants mirroring the CSS custom properties in aa4-theme.css. */
export const C = {
  brand: "FF1D75A1",
  brandDeep: "FF135573",
  brandBright: "FF2F92C4",
  /** Petrol washes — the tinted fills for headers, totals and KPI strips. */
  wash: "FFEAF2F7",
  wash2: "FFDAE7EF",

  ink: "FF0F2028",
  ink2: "FF40606C",
  ink3: "FF526872",
  ink4: "FF7A8C95",

  line: "FFDDE4EA",
  line2: "FFC3D0D8",

  white: "FFFFFFFF",
  /** Zebra band — a whisper above white, never grey enough to read as a fill. */
  band: "FFF5F8FA",

  pos: "FF0D8A62",
  posDeep: "FF0A6349",
  posWash: "FFE7F4EF",

  neg: "FFC23B2E",
  negDeep: "FFA02C20",
  negWash: "FFFBEDEB",

  amber: "FFBF7D17",
  amberWash: "FFFBF3E5",
} as const;

/** Debt-family accents — identical to CAT_META in LiabilitiesBoard.tsx. */
export const CATEGORY_COLOR = {
  mortgage: C.brand,
  loan: "FF4F57A6",
  card: "FF0E8A80",
  overdraft: "FF5F7883",
  other: "FF5F7883",
} as const;

/**
 * Arial everywhere: it is the one family guaranteed to carry Hebrew glyphs on
 * both Windows and macOS Excel. A missing webfont in a spreadsheet degrades to
 * whatever the machine picks, which is exactly how a designed file starts
 * looking generic — so we never gamble on IBM Plex being installed.
 */
export const FONT = "Arial";

/* ------------------------------------------------------------- number types */

export type Fmt = "money" | "moneyMark" | "pct" | "int" | "date" | "text";

/**
 * Money carries no currency mark: the ₪ lives in the column head, the way the
 * on-screen tables do it, so columns of figures stay clean. `moneyMark` is for
 * standalone headline figures that have no column head to lean on.
 */
/** "text" is absent by design: it is the absence of a number format. */
export type NumFmt = Exclude<Fmt, "text">;

export const NUM_FMT: Record<NumFmt, string> = {
  money: "#,##0",
  moneyMark: '#,##0 "₪"',
  pct: "0.00%",
  int: "#,##0",
  date: "dd/mm/yyyy",
};

/* --------------------------------------------------------------- primitives */

export const solid = (argb: string): Fill => ({
  type: "pattern",
  pattern: "solid",
  fgColor: { argb },
});

export const font = (o: Partial<Font> = {}): Partial<Font> => ({
  name: FONT,
  size: 10,
  color: { argb: C.ink },
  ...o,
});

/** Hebrew text: right-aligned with an explicit RTL reading order. */
export const alignText = (o: Partial<Alignment> = {}): Partial<Alignment> => ({
  vertical: "middle",
  horizontal: "right",
  readingOrder: "rtl",
  ...o,
});

/**
 * Figures sit on the trailing edge of an RTL cell — the same convention the
 * printed customer summary uses, so a column of numbers forms one clean rule.
 */
export const alignNum = (o: Partial<Alignment> = {}): Partial<Alignment> => ({
  vertical: "middle",
  horizontal: "left",
  ...o,
});

const edge = (color: string, style: "thin" | "medium" | "thick" | "double" = "thin") =>
  ({ style, color: { argb: color } }) as const;

/** Hairline box — the default table-cell border. */
export const boxThin = (color: string = C.line): Partial<Borders> => ({
  top: edge(color),
  left: edge(color),
  bottom: edge(color),
  right: edge(color),
});

/** Bottom hairline only — for the masthead rules between text blocks. */
export const ruleBottom = (
  color: string = C.line2,
  style: "thin" | "medium" | "double" = "thin"
): Partial<Borders> => ({
  bottom: edge(color, style),
});

/**
 * The accounting double rule that closes a totals block — lifted straight from
 * the customer summary's `border-top: 3px double`.
 */
export const ruleTotals = (): Partial<Borders> => ({
  top: edge(C.line2, "double"),
  bottom: edge(C.line, "thin"),
});

/**
 * A category's colour as a thick leading edge. In an RTL sheet the right side
 * is the leading edge, so this paints an accent bar down the start of the row.
 */
export const leadingAccent = (argb: string, rest: string = C.line): Partial<Borders> => ({
  top: edge(rest),
  bottom: edge(rest),
  left: edge(rest),
  right: edge(argb, "medium"),
});
