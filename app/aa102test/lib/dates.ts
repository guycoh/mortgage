// Date arithmetic for the mix grid.
//
// תאריך סיום and חודשים describe the same fact — when the debt ends — so the
// grid keeps them in lockstep: pick a date and the month count follows; type a
// month count and the date follows. That is what removes the "row imported
// with a past end date and no term" hole the old grid left open.

export const HE_MONTHS = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
];

/** Sunday-first, as the Israeli week runs. */
export const HE_DOW = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

/** dd/mm/yyyy or yyyy-mm-dd → Date, tolerating both orders. */
export function parseDate(v?: string | Date | null): Date | null {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  const part = String(v).split("T")[0].trim();
  const sep = part.includes("-") ? "-" : "/";
  const raw = part.split(sep);
  const bits = raw.map(Number);
  if (bits.length === 3 && !bits.some(Number.isNaN)) {
    const [a, b, c] = bits;
    // a four-digit leading group means yyyy-mm-dd, otherwise dd/mm/yyyy
    const d = raw[0].length === 4 ? new Date(a, b - 1, c) : new Date(c, b - 1, a);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(part);
  return isNaN(d.getTime()) ? null : d;
}

export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const fmtDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getFullYear(), from.getMonth() + months, from.getDate());
  // 31 Jan + 1 month must not spill into March
  if (d.getDate() !== from.getDate()) d.setDate(0);
  return d;
}

/** Whole months from `from` to `to`, floored at 0. */
export function monthsBetween(from: Date, to: Date): number {
  let m = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) m -= 1;
  return Math.max(0, m);
}

/** The 42 cells (6 weeks) a month grid needs, Sunday-first. */
export function monthGrid(year: number, month: number): { date: Date; out: boolean }[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date, out: date.getMonth() !== month };
  });
}

/**
 * The year range the picker offers. A mortgage end date is always in the
 * future, but imported reports carry recently-elapsed ones too — so the list
 * runs from a decade back to forty years out, which covers every real term.
 */
export function yearRange(anchor: number): number[] {
  const now = new Date().getFullYear();
  const from = Math.min(now - 10, anchor - 1);
  const to = Math.max(now + 40, anchor + 1);
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}
