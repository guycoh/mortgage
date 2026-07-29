// Reading label:value forms, and reading transposed grids.
//
// Two shapes cover all four lenders. Discount and Jerusalem print labels with
// their values beside them, sometimes two independent columns to a line. Leumi
// and Hapoalim transpose the whole thing: the field names run down the page and
// each tranche is a column.
//
// Both need geometry rather than text. In an RTL form the value sits to the LEFT
// of its label, and the only thing separating one column's value from the next
// column's label is an x coordinate.

import type { RawItem } from "@/lib/credit-parser/types";
import { norm, type Line } from "./text";

/**
 * Strip a cell down to its content.
 *
 * These forms draw their table borders with literal pipe glyphs, which land in
 * the text layer between a label and its value, and they hang footnote asterisks
 * off field names. Both end up inside the cell unless removed — "שפיצר |" and
 * "ר.עוגן בנק ישראל **|" are the value plus the furniture around it.
 */
export function clean(s: string): string {
  return s
    .replace(/[|¦]/g, " ")
    .replace(/\*+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/* --------------------------------------------------- label:value, same line */

export interface Found {
  /** Everything between this label and the next thing to its left. */
  value: string;
  items: RawItem[];
  line: Line;
  /** Left edge of the label — values live below this x. */
  x: number;
}

/**
 * Find a label on a line and return what is written to its left.
 *
 * The value ends where the next label begins. Without that bound, a line
 * carrying two independent columns — which is how Discount prints every row —
 * hands the first field the second field's label and value as well.
 */
function valueAfter(line: Line, label: string, otherLabels: string[]): Found | null {
  const target = norm(label);
  // Labels themselves get split across glyph runs ("סוג" / "הלוואה"), so match
  // by walking a normalised concatenation from each starting item.
  for (let i = 0; i < line.items.length; i++) {
    let acc = "";
    let end = i;
    for (let j = i; j < line.items.length && acc.length < target.length + 24; j++) {
      acc += norm(line.items[j].str);
      end = j;
      if (acc === target || acc.startsWith(target)) break;
    }
    if (!(acc === target || acc.startsWith(target))) continue;

    // Items to the left of the matched label, stopping at the next label.
    const rest = line.items.slice(end + 1);
    const out: RawItem[] = [];
    for (let k = 0; k < rest.length; k++) {
      if (isLabelStart(rest, k, otherLabels)) break;
      out.push(rest[k]);
    }
    return {
      value: clean(out.map((o) => o.str).join(" ")),
      items: out,
      line,
      x: line.items[end].x,
    };
  }
  return null;
}

/**
 * Does a run of items starting here spell one of the other field labels?
 *
 * Checked over a growing concatenation because labels are split across glyph
 * runs as freely as values are: "שיעור" + "ריבית" + "שנתית" is one label
 * arriving as three items.
 */
function isLabelStart(rest: RawItem[], at: number, labels: string[]): boolean {
  const wanted = labels.map(norm).filter(Boolean);
  const longest = wanted.reduce((m, l) => Math.max(m, l.length), 0);
  let acc = "";
  for (let j = at; j < rest.length && acc.length <= longest; j++) {
    acc += norm(rest[j].str);
    if (wanted.some((l) => acc === l || acc.startsWith(l))) return true;
  }
  return false;
}

/**
 * Every occurrence of every label in a block of lines.
 *
 * Occurrences, plural: Discount repeats the same field name once per loan, and
 * the caller decides whether it wants the first, the nth, or all of them.
 */
export function readFields(lines: Line[], labels: string[]): Map<string, Found[]> {
  const out = new Map<string, Found[]>();
  for (const label of labels) {
    const others = labels.filter((l) => norm(l) !== norm(label));
    const hits: Found[] = [];
    for (const line of lines) {
      const f = valueAfter(line, label, others);
      if (f && f.value) hits.push(f);
    }
    out.set(label, hits);
  }
  return out;
}

/** First value for a label, or "". */
export function one(found: Map<string, Found[]>, label: string): string {
  return found.get(label)?.[0]?.value ?? "";
}

/* ------------------------------------------------------- transposed columns */

export interface Column {
  /** Index left-to-right as printed; callers usually want reading order. */
  index: number;
  /** Representative x — the centre of the header cell. */
  x: number;
  /** Half-width of the band this column claims. */
  half: number;
  header: string;
}

/**
 * Build columns from a header row.
 *
 * Hapoalim's header is the tranche number line, Leumi's is "משנה 1 … משנה 5".
 * Each column claims a band reaching halfway to its neighbours, so a value that
 * is right-aligned under a wide header still lands in the right column.
 */
export function columnsFrom(headerItems: RawItem[], minGap = 18): Column[] {
  const sorted = [...headerItems].sort((a, b) => b.x - a.x);
  const cols: Column[] = [];
  for (const it of sorted) {
    const prev = cols[cols.length - 1];
    if (prev && Math.abs(prev.x - it.x) < minGap) {
      // same cell, wider than one run
      prev.header = `${prev.header} ${it.str.trim()}`.trim();
      continue;
    }
    cols.push({ index: cols.length, x: it.x + it.w / 2, half: 0, header: it.str.trim() });
  }
  for (let i = 0; i < cols.length; i++) {
    const left = cols[i + 1];
    const right = cols[i - 1];
    const dl = left ? Math.abs(cols[i].x - left.x) / 2 : 60;
    const dr = right ? Math.abs(right.x - cols[i].x) / 2 : 60;
    cols[i].half = Math.max(14, Math.min(dl, dr));
  }
  return cols;
}

/**
 * Values from one row of a transposed grid, one slot per column.
 *
 * A row often carries fewer values than there are columns — Leumi's "ריבית
 * קבועה" row only fills the fixed-rate tranches, and its "מדד בסיס" row only
 * the linked ones. Empty slots stay empty rather than shifting the rest left,
 * which is the whole reason this is done by coordinate and not by order.
 */
export function rowByColumn(line: Line, cols: Column[], labelX?: number): string[] {
  const out: string[] = cols.map(() => "");
  for (const it of line.items) {
    const cx = it.x + it.w / 2;
    // Anything at or right of the label gutter is the field name, not a value.
    if (labelX !== undefined && cx > labelX) continue;
    let best = -1;
    let bestD = Infinity;
    cols.forEach((c, i) => {
      const d = Math.abs(cx - c.x);
      if (d < bestD && d <= c.half * 1.6) {
        bestD = d;
        best = i;
      }
    });
    if (best >= 0) out[best] = `${out[best]} ${it.str.trim()}`.trim();
  }
  return out;
}

/** Find the line whose text contains a phrase, within a block. */
export function lineWith(lines: Line[], phrase: string): Line | undefined {
  const p = norm(phrase);
  return lines.find((l) => norm(l.text).includes(p));
}

/** All lines containing a phrase. */
export function linesWith(lines: Line[], phrase: string): Line[] {
  const p = norm(phrase);
  return lines.filter((l) => norm(l.text).includes(p));
}
