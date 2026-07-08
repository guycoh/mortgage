// Geometry primitives. The report is a fixed-column template; values live in
// predictable positions relative to their (201-xxx)/(197-xxx) field codes.
// These helpers reconstruct lines and codes from raw positioned tokens.

import type { RawItem, RawPage } from "./types";

export interface Tok {
  str: string;
  x: number;
  y: number;
  w: number;
  xEnd: number;
}

export interface Line {
  y: number;
  toks: Tok[]; // sorted by x ascending (geometric left -> right)
}

export interface Page {
  page: number;
  lines: Line[];
}

export interface CodeHit {
  code: string; // normalized e.g. "201-020"
  xStart: number;
  xEnd: number;
}

const Y_TOL = 3;

const HE = /[֐-׿]/;

export function isHebrew(s: string): boolean {
  return HE.test(s);
}

/** Cluster a page's tokens into visual lines (top -> bottom). */
export function buildPage(raw: RawPage): Page {
  const toks: Tok[] = raw.items
    .filter((it) => it.str.length > 0)
    .map((it) => ({ str: it.str, x: it.x, y: it.y, w: it.w, xEnd: it.x + it.w }));

  const sorted = [...toks].sort((a, b) => b.y - a.y);
  const lines: Line[] = [];
  for (const t of sorted) {
    let line = lines.find((l) => Math.abs(l.y - t.y) <= Y_TOL);
    if (!line) {
      line = { y: t.y, toks: [] };
      lines.push(line);
    }
    line.toks.push(t);
  }
  lines.sort((a, b) => b.y - a.y);
  for (const l of lines) l.toks.sort((a, b) => a.x - b.x);
  return { page: raw.page, lines };
}

export function buildPages(raw: RawPage[]): Page[] {
  return raw.map(buildPage);
}

/**
 * Detect field codes on a line, reconstructing both intact tokens like
 * "(201-029)" and codes split across tokens like "(" "201-0" "20" ")".
 */
export function detectCodes(line: Line): CodeHit[] {
  const toks = line.toks;
  const hits: CodeHit[] = [];
  const used = new Set<number>();

  for (let i = 0; i < toks.length; i++) {
    if (used.has(i)) continue;
    const s = toks[i].str;
    // Intact code, possibly with surrounding text glued on, e.g. "(201-029)מזהה".
    const intact = s.match(/\((201|197|151)-(\d{3})\)/);
    if (intact) {
      hits.push({
        code: `${intact[1]}-${intact[2]}`,
        xStart: toks[i].x,
        xEnd: toks[i].xEnd,
      });
      used.add(i);
      continue;
    }
    // Split-code seed: a token containing the "201-" / "197-" / "151-" stem.
    const seed = s.match(/(201|197|151)-(\d{1,3})/);
    if (!seed) continue;
    const prefix = seed[1];
    let digits = seed[2];
    let xStart = toks[i].x;
    let xEnd = toks[i].xEnd;
    used.add(i);
    // Gather following adjacent pure-digit / paren tokens (within a small gap).
    let j = i + 1;
    let prevEnd = toks[i].xEnd;
    while (j < toks.length && digits.length < 3) {
      const tj = toks[j];
      if (tj.x - prevEnd > 16) break;
      if (/^\d{1,3}$/.test(tj.str)) {
        digits += tj.str;
        xEnd = tj.xEnd;
        prevEnd = tj.xEnd;
        used.add(j);
        j++;
      } else if (tj.str === ")" || tj.str === "(") {
        xEnd = tj.xEnd;
        prevEnd = tj.xEnd;
        used.add(j);
        j++;
      } else {
        break;
      }
    }
    // Include an opening "(" immediately to the left.
    if (i > 0) {
      const prev = toks[i - 1];
      if (prev.str === "(" && xStart - prev.xEnd < 6) xStart = prev.x;
    }
    digits = (digits + "000").slice(0, 3);
    hits.push({ code: `${prefix}-${digits}`, xStart, xEnd });
  }
  hits.sort((a, b) => a.xStart - b.xStart);
  return hits;
}

const VALUE_RE = /\d|^[A-Za-z@._]|XX/;

function isValueTok(s: string): boolean {
  // Value-like tokens: contain a digit, or are Latin (ids/emails), or "XX-".
  return VALUE_RE.test(s) && s !== "*";
}

/**
 * Extract the scalar value (number / date / id / percent) belonging to `code`
 * on a single line, using the cell between this code and the previous code to
 * its left. Hebrew label tokens are ignored.
 */
export function scalarOnLine(line: Line, code: string): string | null {
  const codes = detectCodes(line);
  const idx = codes.findIndex((c) => c.code === code);
  if (idx < 0) return null;
  const me = codes[idx];
  // Left boundary = the nearest code ending at-or-before my start.
  let leftBound = 0;
  for (const c of codes) {
    if (c.xEnd <= me.xStart + 1 && c.xEnd > leftBound) leftBound = c.xEnd;
  }
  const cell = line.toks
    .filter((t) => t.x < me.xStart - 0.5 && t.x > leftBound - 0.5)
    .filter((t) => isValueTok(t.str))
    .sort((a, b) => a.x - b.x);
  if (!cell.length) return null;
  const joined = cell.map((t) => t.str).join("").trim();
  return joined.length ? joined : null;
}

/** Find the first scalar value for `code` across a set of lines. */
export function scalarIn(lines: Line[], code: string): string | null {
  for (const l of lines) {
    const v = scalarOnLine(l, code);
    if (v !== null) return v;
  }
  return null;
}

/** De-spaced RTL text of a set of lines, for fixed-phrase (enum) detection. */
export function blockText(lines: Line[]): string {
  return lines
    .map((l) =>
      [...l.toks].sort((a, b) => b.x - a.x).map((t) => t.str).join("")
    )
    .join("\n");
}

export function despace(s: string): string {
  return s.replace(/[\s‏‎]/g, "");
}

/**
 * Normalization for enum-phrase matching: beyond whitespace, strip punctuation
 * whose direction/shape varies between the canonical phrase and the PDF's RTL
 * token stream (parentheses are mirrored, commas/hyphens split into tokens).
 */
export function normEnum(s: string): string {
  return s.replace(/[\s‏‎().,;:־–-]/g, "");
}

/** Find which of `phrases` appears in the block (normalized match). */
export function matchEnum(lines: Line[], phrases: readonly string[]): string {
  const hay = normEnum(blockText(lines));
  for (const p of phrases) {
    if (hay.includes(normEnum(p))) return p;
  }
  return "";
}

/**
 * Resolve an enum-valued field whose text may wrap across several lines. The
 * value lives in the column to the left of the field's label (which itself sits
 * just left of the code). We isolate that column across nearby lines so other
 * fields don't interleave, then look for a known phrase.
 */
export function enumByCell(
  lines: Line[],
  code: string,
  phrases: readonly string[]
): string {
  let codeLine: Line | null = null;
  let me: CodeHit | null = null;
  let codes: CodeHit[] = [];
  for (const l of lines) {
    const cs = detectCodes(l);
    const hit = cs.find((c) => c.code === code);
    if (hit) {
      codeLine = l;
      me = hit;
      codes = cs;
      break;
    }
  }
  if (!codeLine || !me) return matchEnum(lines, phrases);

  // Left boundary = the nearest code starting to the left (its xStart, so the
  // adjacent value column is included).
  let leftBound = 0;
  for (const c of codes) {
    if (c.xStart < me.xStart - 1 && c.xStart > leftBound) leftBound = c.xStart;
  }
  // Label = the right-most contiguous Hebrew cluster in the cell on the code
  // line; the value is everything to its left.
  const cellHeb = codeLine.toks
    .filter((t) => isHebrew(t.str) && t.x > leftBound && t.x < me.xStart)
    .sort((a, b) => b.x - a.x);
  let labelX = me.xStart;
  if (cellHeb.length) {
    labelX = cellHeb[0].x;
    for (let k = 1; k < cellHeb.length; k++) {
      if (labelX - cellHeb[k].x <= 40) labelX = cellHeb[k].x;
      else break;
    }
  }
  const valToks: Tok[] = [];
  for (const l of lines) {
    if (Math.abs(l.y - codeLine.y) > 22) continue;
    for (const t of l.toks) {
      if (!isHebrew(t.str)) continue;
      if (t.x > leftBound - 1 && t.x < labelX - 0.5) valToks.push(t);
    }
  }
  valToks.sort((a, b) => b.y - a.y || b.x - a.x);
  const hay = normEnum(valToks.map((t) => t.str).join(""));
  for (const p of phrases) if (hay.includes(normEnum(p))) return p;
  return matchEnum(lines, phrases);
}

/** Transaction type (201-002) sits in a narrow column; detect it directly. */
export function detectByBand(
  lines: Line[],
  anchorCode: string,
  band: [number, number],
  phrases: readonly string[]
): string {
  let codeLine: Line | null = null;
  for (const l of lines) {
    if (detectCodes(l).some((c) => c.code === anchorCode)) {
      codeLine = l;
      break;
    }
  }
  if (!codeLine) return matchEnum(lines, phrases);
  const toks: Tok[] = [];
  for (const l of lines) {
    if (Math.abs(l.y - codeLine.y) > 26) continue;
    for (const t of l.toks) {
      if (isHebrew(t.str) && t.x >= band[0] && t.x <= band[1]) toks.push(t);
    }
  }
  toks.sort((a, b) => b.y - a.y || b.x - a.x);
  const hay = normEnum(toks.map((t) => t.str).join(""));
  for (const p of phrases) if (hay.includes(normEnum(p))) return p;
  return matchEnum(lines, phrases);
}

/** Assign each value token of a data row to the nearest column-header code. */
export function rowByColumns(
  line: Line,
  headerCodes: CodeHit[]
): Record<string, string> {
  const out: Record<string, string> = {};
  const buckets: Record<string, Tok[]> = {};
  for (const t of line.toks) {
    if (!isValueTok(t.str) && !isHebrew(t.str)) continue;
    const tc = t.x + t.w / 2; // token centre, robust for wide multi-word values
    let best: string | null = null;
    let bestD = Infinity;
    for (const c of headerCodes) {
      const cx = (c.xStart + c.xEnd) / 2;
      const d = Math.abs(tc - cx);
      if (d < bestD) {
        bestD = d;
        best = c.code;
      }
    }
    if (best) (buckets[best] ||= []).push(t);
  }
  for (const [code, ts] of Object.entries(buckets)) {
    out[code] = ts
      .sort((a, b) => b.y - a.y || b.x - a.x) // top->bottom, then RTL within a line
      .map((t) => t.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return out;
}
