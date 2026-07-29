// Turning a page of positioned glyph runs back into readable lines.
//
// pdf.js hands back items in content-stream order, which for these Hebrew forms
// is not reading order and sometimes not even word order — "הנדון:תדפיס" can
// arrive several items away from "נתוני הלוואות". Any detection or field lookup
// done on the raw join will miss headings that are plainly there on the page.
//
// So everything downstream reads lines rebuilt from coordinates: group by
// baseline, then order right-to-left within the line.

import type { RawItem, RawPage } from "@/lib/credit-parser/types";

export interface Line {
  /** Baseline, PDF user space (increases upward). */
  y: number;
  items: RawItem[];
  /** Items joined right-to-left with single spaces. */
  text: string;
}

/**
 * Group items into lines. `tol` is how far apart two baselines can be and still
 * count as one line — these forms set label and value a point or two apart, and
 * superscripts drift further, so it is deliberately loose.
 */
export function pageLines(page: RawPage, tol = 3): Line[] {
  const buckets = new Map<number, RawItem[]>();
  for (const it of page.items) {
    if (!it.str.trim()) continue;
    const k = Math.round(it.y / tol);
    const at = buckets.get(k);
    if (at) at.push(it);
    else buckets.set(k, [it]);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([k, items]) => {
      const ordered = [...items].sort((a, b) => b.x - a.x);
      return {
        y: k * tol,
        items: ordered,
        text: ordered.map((i) => i.str.trim()).filter(Boolean).join(" "),
      };
    });
}

/** All of a page's text, in reading order. */
export function pageText(page: RawPage, tol = 3): string {
  return pageLines(page, tol).map((l) => l.text).join("\n");
}

/**
 * Comparison form: no whitespace, unified quotes and dashes.
 *
 * A heading can be split across items anywhere, so matching has to survive
 * spaces appearing or vanishing between any two letters. Hebrew forms also mix
 * the ASCII and typographic gershayim freely — "ש"ח" and "ש״ח" are the same
 * word to a reader and must be to us.
 */
export function norm(s: string): string {
  return s
    .replace(/[״״"]/g, '"')
    .replace(/[׳׳']/g, "'")
    .replace(/[–—−]/g, "-")
    .replace(/\s+/g, "");
}

/** Does this text contain the phrase, ignoring all spacing? */
export function has(text: string, phrase: string): boolean {
  return norm(text).includes(norm(phrase));
}

/* ------------------------------------------------------------------ numbers */

/**
 * A money or rate figure as these forms print it.
 *
 * Thousands separators, two decimals, and — the one that bites — a TRAILING
 * minus: Hapoalim prints "0.01-" for an overpayment. A leading-minus parse
 * reads that as positive and quietly loses the sign.
 */
export function num(s: string | undefined | null): number | null {
  if (s == null) return null;
  const t = s.replace(/[‎‏]/g, "").trim();
  if (!t || /^-+$/.test(t) || t === "----" || t === "אין") return null;
  const m = t.match(/-?[\d,]+(?:\.\d+)?-?/);
  if (!m) return null;
  const raw = m[0];
  const trailingNeg = raw.endsWith("-");
  const v = Number(raw.replace(/,/g, "").replace(/-/g, ""));
  if (!Number.isFinite(v)) return null;
  return trailingNeg || raw.startsWith("-") ? -v : v;
}

/** A percentage, however the form decorates it. */
export function pct(s: string | undefined | null): number | null {
  if (s == null) return null;
  const v = num(s.replace(/%/g, ""));
  return v === null ? null : v;
}

/** dd/mm/yyyy or dd/mm/yy → dd/mm/yyyy. */
export function date(s: string | undefined | null): string {
  if (!s) return "";
  const m = s.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{2,4})/);
  if (!m) return "";
  const d = m[1].padStart(2, "0");
  const mo = m[2].padStart(2, "0");
  let y = m[3];
  if (y.length === 2) {
    // These are mortgage dates: a two-digit year in the 70s means 2070, not
    // 1970 — every one of them is a maturity or an origination inside the
    // window the product exists in.
    const n = Number(y);
    y = String(n <= 79 ? 2000 + n : 1900 + n);
  }
  return `${d}/${mo}/${y}`;
}

/** Whole months from a to b, floored at zero. */
export function monthsBetween(a: Date, b: Date): number {
  const m =
    (b.getFullYear() - a.getFullYear()) * 12 +
    (b.getMonth() - a.getMonth()) +
    (b.getDate() >= a.getDate() ? 0 : -1);
  return Math.max(0, m);
}

/** dd/mm/yyyy → Date, or null. */
export function toDate(s: string): Date | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  return Number.isNaN(d.getTime()) ? null : d;
}
