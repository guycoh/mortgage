// Main parser: turns positioned PDF tokens into a structured CreditReport.
// Tuned to the fixed Israeli "Data Concentration Report" template; values
// differ per client but layout/codes/labels are identical across reports.

import {
  buildPages,
  detectCodes,
  scalarIn,
  scalarOnLine,
  enumByCell,
  detectByBand,
  blockText,
  despace,
  rowByColumns,
  isHebrew,
  type Line,
  type Page,
  type CodeHit,
  type Tok,
} from "./geometry";
import { ENUMS, REMARK_CODES, FIELD_BY_CODE } from "./dictionary";
import type {
  CreditReport,
  Transaction,
  SummaryGroup,
  SummaryBlock,
  SummaryRow,
  InterestTrack,
  Collateral,
  RelatedCorp,
  MonthlyGrid,
  NonPaymentIndicator,
  ExecutionCase,
  InsolvencyCase,
  InquiryByDate,
  NewCreditInquiry,
  InquirySummaryRow,
  AdminAction,
  RawPage,
} from "./types";

const SCALAR_CODES = [
  "201-002", "201-003", "201-006", "201-008", "201-009", "201-010", "201-011",
  "201-016", "201-018", "201-020", "201-023", "201-029", "201-030", "201-044",
  "201-045", "201-046", "201-048", "201-049", "201-051", "201-052", "201-053",
  "201-054", "201-055", "201-072",
];

const DATE_RE = /\b\d{2}\/\d{2}\/\d{4}\b/;
const NAME_JOIN = (toks: Tok[]) =>
  [...toks].sort((a, b) => b.x - a.x).map((t) => t.str).join(" ").replace(/\s+/g, " ").trim();
const RTL_JOIN = (toks: Tok[]) =>
  [...toks].sort((a, b) => b.x - a.x).map((t) => t.str).join("").trim();

interface FlatLine {
  page: number;
  line: Line;
}

function flatten(pages: Page[]): FlatLine[] {
  const out: FlatLine[] = [];
  for (const p of pages) for (const line of p.lines) out.push({ page: p.page, line });
  return out;
}

function lineHas(fl: FlatLine, despacedNeedle: string): boolean {
  return despace(blockText([fl.line])).includes(despacedNeedle);
}

// ---------------------------------------------------------------------------
// Section boundaries
// ---------------------------------------------------------------------------

const SECTION_KW: Record<string, string> = {
  s1: "תמציתנתונילקוח",
  s2: "חשבונותעוברושב",
  s3: "מידעמפורטעלעסקאותפעילות",
  s4: "מידעמפורטעלעסקאותלאפעילות",
  s5: "מידעשהתקבלמרשויות",
  s6: "פניותלקבלתמידעעלהלקוח",
  s7: "פעולותמנהליות",
  s8: "מילוןמונחים",
};

function sectionBounds(flat: FlatLine[]): Record<string, [number, number]> {
  const idx: Record<string, number> = {};
  const order = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"];
  for (const key of order) {
    const kw = SECTION_KW[key];
    // Anchored to the numbered heading, not merely containing the words.
    //
    // §1 carries a sub-heading of its own — "סיכום מידע שהתקבל מרשויות וגופים
    // ציבוריים" — which contains §5's keyword verbatim. A loose match therefore
    // put §5 on page 3 instead of page 33, which made §4's range run backwards
    // and silently dropped every inactive transaction in the report: thirteen of
    // them on a real 37-page file, the closed מזרחי mortgages that the
    // non-payment indicators point at.
    const heading = `.${key.slice(1)}${kw}`;
    for (let i = 0; i < flat.length; i++) {
      if (idx[key] !== undefined) break;
      const fl = flat[i];
      // Skip the table-of-contents page (page 2) — its lines have dot leaders.
      if (fl.page <= 2) continue;
      const txt = despace(blockText([fl.line]));
      if (txt.startsWith(heading)) idx[key] = i;
    }
    // A shorter report may print a section without its number; fall back to the
    // old containment test, but only for a section still unplaced.
    if (idx[key] === undefined) {
      for (let i = 0; i < flat.length; i++) {
        if (idx[key] !== undefined) break;
        const fl = flat[i];
        if (fl.page <= 2) continue;
        if (despace(blockText([fl.line])).includes(kw)) idx[key] = i;
      }
    }
  }
  // Sections run in order. Anything that resolved out of order matched something
  // that only looked like a heading, and is better dropped than trusted.
  let last = -1;
  for (const key of order) {
    if (idx[key] === undefined) continue;
    if (idx[key] < last) delete idx[key];
    else last = idx[key];
  }
  const bounds: Record<string, [number, number]> = {};
  for (let k = 0; k < order.length; k++) {
    const key = order[k];
    if (idx[key] === undefined) continue;
    let end = flat.length;
    for (let n = k + 1; n < order.length; n++) {
      if (idx[order[n]] !== undefined) {
        end = idx[order[n]];
        break;
      }
    }
    bounds[key] = [idx[key], end];
  }
  return bounds;
}

// ---------------------------------------------------------------------------
// Identity & meta
// ---------------------------------------------------------------------------

function parseIdentity(pages: Page[], flat: FlatLine[]) {
  const p1 = pages.find((p) => p.page === 1);
  let name = "";
  let reportDate = "";
  let reportType = "";
  if (p1) {
    for (let i = 0; i < p1.lines.length; i++) {
      const t = despace(blockText([p1.lines[i]]));
      if (t.includes("לכבוד") && i + 1 < p1.lines.length) {
        name = NAME_JOIN(p1.lines[i + 1].toks);
      }
      if (t.includes("תאריךהפקת") || t.includes("הפקתהדוח")) {
        const m = blockText([p1.lines[i]]).match(DATE_RE);
        if (m) reportDate = m[0];
      }
      if (t.includes("הנדון")) {
        const cand = p1.lines[i].toks
          .filter((tk) => !tk.str.includes("הנדון") && tk.str.trim().length > 4)
          .sort((a, b) => b.w - a.w)[0];
        if (cand) reportType = cand.str.trim();
      }
    }
  }

  const get = (needle: string, pick: (l: Line) => string): string => {
    for (const fl of flat) {
      if (fl.page > 2) break;
      if (lineHas(fl, needle)) {
        const v = pick(fl.line);
        if (v) return v;
      }
    }
    return "";
  };

  const idNumber = get("מספרזהות", (l) => {
    const tk = l.toks.find((t) => /^\d{8,9}$/.test(t.str));
    return tk ? tk.str : "";
  });
  const clientType = get("הגדרתהלקוח", (l) => {
    const tk = l.toks.filter(
      (t) => isHebrew(t.str) && !/הגדרת|הלקוח|פרטים|הנתון/.test(despace(t.str))
    )[0];
    return tk ? tk.str.trim() : "";
  });
  const dataCollectionStart = get("תחילתאיסוף", (l) => {
    const m = blockText([l]).match(DATE_RE);
    return m ? m[0] : "";
  });
  const passportCountry = get("ארץהוצאתהדרכון", (l) => {
    const tk = l.toks.filter(
      (t) => isHebrew(t.str) && !/ארץ|פרטים|הנתון|הוצאת|דרכון/.test(despace(t.str))
    )[0];
    return tk ? tk.str.trim() : "";
  });
  // System status (e.g. מעוכב) — look on page 2.
  let systemStatus = "";
  for (const fl of flat) {
    if (fl.page > 2) break;
    if (despace(blockText([fl.line])).includes("מעוכב")) systemStatus = "מעוכב";
  }

  return {
    meta: { reportDate, reportType, generatedFor: name },
    client: {
      name,
      idNumber,
      passportCountry,
      clientType,
      systemStatus,
      dataCollectionStart,
    },
  };
}

// ---------------------------------------------------------------------------
// §1 Summary
// ---------------------------------------------------------------------------

function parseSummary(flat: FlatLine[], bounds: [number, number]): SummaryGroup[] {
  const [start, end] = bounds;
  const groups: SummaryGroup[] = [];
  let group: SummaryGroup | null = null;
  let block: SummaryBlock | null = null;

  // Column centers for the summary tables (stable template positions).
  const COL = { source: 455, c2: 375, c3: 276, debt: 186, overdue: 91 };

  for (let i = start; i < end; i++) {
    const line = flat[i].line;
    const txt = despace(blockText([line]));

    // The summary lives only on its own page; stop at the debt-development page.
    if (txt.includes("התפתחותחוב") || txt.includes("הגרףהבא")) break;

    if (txt.includes("עסקאותפעילותבהןהלקוחחייב")) {
      group = { role: "debtor", title: "עסקאות פעילות בהן הלקוח חייב", blocks: [] };
      groups.push(group);
      block = null;
      continue;
    }
    if (txt.includes("עסקאותפעילותבהןהלקוחערב")) {
      group = { role: "guarantor", title: "עסקאות פעילות בהן הלקוח ערב", blocks: [] };
      groups.push(group);
      block = null;
      continue;
    }
    if (!group) continue;

    // Sub-table header: "סוג עסקה: <type>"
    if (txt.includes("סוגעסקה")) {
      const typeTok = line.toks
        .filter((t) => isHebrew(t.str) && !/סוג|עסקה|:/.test(t.str))
        .sort((a, b) => a.x - b.x);
      const type = NAME_JOIN(typeTok) || RTL_JOIN(line.toks).replace(/.*עסקה:?/, "");
      block = {
        transactionType: type,
        col2Label: "",
        col3Label: "",
        rows: [],
      };
      group.blocks.push(block);
      continue;
    }
    if (!block) continue;

    // Column-header row of a sub-table.
    if (txt.includes("שםמקורהמידעהמדווח")) {
      block.col2Label = txt.includes("מספרעסקאות") ? "מספר עסקאות" : "מזהה עסקה";
      block.col3Label = txt.includes("סכוםהלוואות")
        ? "סכום הלוואות מקורי"
        : txt.includes("גובהמסגרות")
        ? "גובה מסגרות"
        : "גובה מסגרת";
      continue;
    }

    // Data / total row: has a money-ish or count token at the column positions.
    const hasNums = line.toks.some((t) => /^\d[\d,]*$/.test(t.str));
    const isTotal = txt.includes('סה"כ') || txt.includes("סהכ");
    const sourceTok = line.toks.filter((t) => isHebrew(t.str) && t.x > 400);
    // A long source name wraps to its own lines above/below the numbers line
    // (e.g. "כרטיסי אשראי לישראל" / "בע"מ"); pull it from the neighbours.
    if (hasNums && !isTotal && !sourceTok.length) {
      for (const j of [i - 2, i - 1, i + 1, i + 2]) {
        const fl2 = flat[j];
        if (!fl2 || fl2.page !== flat[i].page) continue;
        if (Math.abs(fl2.line.y - line.y) > 9) continue;
        sourceTok.push(...fl2.line.toks.filter((t) => isHebrew(t.str) && t.x > 400));
      }
    }
    sourceTok.sort((a, b) => b.y - a.y || b.x - a.x);
    if (hasNums && (sourceTok.length || isTotal)) {
      const byCol = (cx: number, tol: number) =>
        line.toks
          .filter((t) => Math.abs(t.x - cx) <= tol)
          .sort((a, b) => b.x - a.x)
          .map((t) => t.str)
          .join("")
          .trim();
      const source = isTotal
        ? 'סה"כ'
        : sourceTok.map((t) => t.str).join(" ").replace(/\s+/g, " ").trim();
      // id (single o/s) appears as XX-NNN near c2; counts are single digits.
      const c2raw = line.toks
        .filter((t) => t.x > 330 && t.x < 410 && (/\d/.test(t.str) || t.str === "XX-"))
        .sort((a, b) => a.x - b.x)
        .map((t) => t.str)
        .join("");
      const row: SummaryRow = {
        source,
        idOrCount: c2raw,
        limit: byCol(COL.c3, 26),
        debtBalance: byCol(COL.debt, 26),
        overdue: byCol(COL.overdue, 30),
        isTotal,
      };
      if (row.source || row.limit || row.debtBalance) block.rows.push(row);
    }
  }
  return groups.filter((g) => g.blocks.some((b) => b.rows.length));
}

// ---------------------------------------------------------------------------
// Non-payment indicators (the table on the debt-development page)
// ---------------------------------------------------------------------------

/**
 * נתונים המעידים באופן מובהק על אי עמידה בפירעון — the most damaging table in the
 * report, and the one an underwriter reads first.
 *
 * A row is a case id, a date and two ticks. The id is written three different ways
 * — "X522830-08-18" for enforcement, "70698-03" for an insolvency file, and a
 * masked "XX- 000060400" in two tokens for a lender's account — and the previous
 * detector recognised only the first, so a real report showing THIRTEEN rows
 * reported one. Everything after the first was invisible: eleven court-proceeding
 * debts at מזרחי and one more, none of them counted, none of them named.
 *
 * The date and the ticks are what make a row a row; the id is then whatever sits
 * in the id column beside them, whatever shape it takes. The lender's name is
 * printed once per group and inherited by the rows beneath it, exactly as the page
 * reads.
 */
function parseNonPayment(flat: FlatLine[], s1: [number, number]): NonPaymentIndicator[] {
  // It lives between §1 and §2 (the debt-development page). Scan that window.
  const out: NonPaymentIndicator[] = [];
  void s1;
  const ID_BAND: [number, number] = [370, 450];
  const rows: number[] = [];
  for (let i = 0; i < flat.length; i++) {
    const toks = flat[i].line.toks;
    const hasCheck = toks.some((t) => t.str.includes("ü"));
    const hasDate = toks.some((t) => /^\d{2}\/\d{2}\/\d{4}$/.test(t.str));
    if (hasCheck && hasDate) rows.push(i);
  }

  let lastSource = "";
  rows.forEach((i, n) => {
    const fl = flat[i];
    const line = fl.line;
    const dateTok = line.toks.find((t) => /^\d{2}\/\d{2}\/\d{4}$/.test(t.str))!;

    // Whatever occupies the id column, joined right-to-left. Two tokens on the
    // masked form ("XX-" and the digits), one on the others.
    const id = [...line.toks]
      .filter((t) => t !== dateTok && !isHebrew(t.str) && t.x >= ID_BAND[0] && t.x < ID_BAND[1])
      .sort((a, b) => b.x - a.x)
      .map((t) => t.str)
      .join("")
      .trim();

    // The name sits on the group's first row, sometimes wrapped above it, and is
    // inherited by the rest of the group.
    // The name wraps, and so does the PREVIOUS row's — "חדלות פירעון ושיקום כלכלי"
    // hangs below its own row and sits directly above the next one. Walking up
    // blindly therefore attributes one lender's rows to another. So the search
    // looks for a line that actually opens a lender's name, and reads from there
    // down to this row; anything else is left blank and inherited from the group
    // above, which is how the page itself reads.
    const nameCol = (j: number) =>
      NAME_JOIN(flat[j].line.toks.filter((t) => isHebrew(t.str) && t.x > 450));
    // Openers only. בע"מ is a suffix — treating it as one stopped the search on
    // the name's own last fragment and reported every lender as "בע\"מ".
    const OPENS_NAME = /בנק|חברה|כרטיסי|ישראכרט|מקס|כאל|לאומי|מזרחי|דיסקונט|הפועלים|הבינלאומי|טריא|הוצאה לפועל|הממונה/;
    let source = nameCol(i);
    if (!source) {
      for (let j = i - 1; j >= 0 && j > i - 7 && flat[j].page === fl.page; j--) {
        if (rows.includes(j)) break;
        const up = nameCol(j);
        if (!up || !OPENS_NAME.test(up)) continue;
        const parts = [up];
        for (let k = j + 1; k < i; k++) {
          const mid = nameCol(k);
          if (mid) parts.push(mid);
        }
        source = parts.join(" ").replace(/\s+/g, " ").trim();
        break;
      }
    }
    if (source) lastSource = source;
    else source = lastSource || "הוצאה לפועל";

    const checks = line.toks.filter((t) => t.str.includes("ü"));
    const has = (lo: number, hi: number) => checks.some((t) => t.x >= lo && t.x < hi);

    // Description: the low-x column, bounded by the NEXT indicator row so one
    // row's wording cannot be read onto its neighbour.
    const stop = Math.min(rows[n + 1] ?? flat.length, i + 8);
    const desc: string[] = [];
    for (let j = i; j < stop; j++) {
      if (flat[j].page !== fl.page) break;
      const dt = flat[j].line.toks
        .filter((t) => t.x < 165 && (isHebrew(t.str) || /[₪%\d]/.test(t.str)))
        .sort((a, b) => b.x - a.x)
        .map((t) => t.str)
        .join("");
      if (dt) desc.push(dt);
    }

    out.push({
      source,
      id,
      reportDate: dateTok.str,
      prevents: has(238, 262),
      stopsCollection: has(262, 305),
      allowsBureauTransfer: has(160, 235),
      description: desc.join(" ").replace(/\s+/g, " ").trim(),
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Transactions (§2 current accounts, §3 active, §4 inactive)
// ---------------------------------------------------------------------------

/**
 * The מסלולי ריבית table.
 *
 * Two things make this table harder than it looks, and both were getting fields
 * wrong on real reports.
 *
 * A cell WRAPS onto the lines above and below its own row. A mortgage anchored to
 * "הריבית הממוצעת על משכנתאות צמודות מדד" prints that phrase across four lines
 * with the figures on the middle one, and its "צמוד למדד המחירים לצרכן" linkage
 * across two. Reading only the line carrying the percentages returned an empty
 * linkage — so an index-linked tranche was modelled as unlinked, in the mix maths
 * as well as on the page — and an empty anchor.
 *
 * And the numbers were positional: fourth-from-left was taken as the margin, but
 * only when anchor text happened to fall on the same line. A wrapped anchor
 * therefore also cost the margin. They are read by their own column's x-range
 * now, so a missing column shifts nothing.
 */
const TRACK_BAND = {
  type: [410, 475],
  linkage: [360, 410],
  anchor: [280, 360],
  margin: [230, 290],
  nominal: [165, 228],
  effective: [100, 162],
  utilization: [0, 100],
} as const;

function parseInterestTracks(lines: Line[]): InterestTrack[] {
  /* ---- 1. the table's own extent */
  let start = -1;
  let end = lines.length;
  for (let i = 0; i < lines.length; i++) {
    const txt = despace(blockText([lines[i]]));
    if (start < 0) {
      if (txt.includes("מסלוליריבית")) start = i + 1;
      continue;
    }
    if (
      txt.includes("מסגרתאשראי") ||
      txt.includes("שםמקור") ||
      txt.includes("בטחונות") ||
      txt.includes("פרטיתאגיד") ||
      txt.includes("עסקאותבהן") ||
      txt.includes("היסטורייתפיגורים") ||
      txt.includes("הערות")
    ) {
      end = i;
      break;
    }
  }
  if (start < 0) return [];

  /* ---- 2. the rows carrying the figures, and the headings to ignore */
  const isHeading = (i: number) => {
    const t = despace(blockText([lines[i]]));
    return (
      /\(201-0\d\d\)/.test(blockText([lines[i]])) ||
      (t.includes("מסלול") && t.includes("עוגן")) ||
      (t.includes("נומינלית") && t.includes("מתואמת"))
    );
  };
  const rowAt: number[] = [];
  for (let i = start; i < end; i++) {
    if (isHeading(i)) continue;
    const hasPct = lines[i].toks.some((t) => t.str === "%");
    const idxTok = lines[i].toks.find((t) => t.x > 515 && /^\d{1,2}$/.test(t.str));
    if (hasPct && idxTok) rowAt.push(i);
  }
  if (!rowAt.length) return [];

  /* ---- 3. every other line belongs to the row it sits closest to */
  const own: number[][] = rowAt.map((i) => [i]);
  for (let i = start; i < end; i++) {
    if (rowAt.includes(i) || isHeading(i)) continue;
    if (!lines[i].toks.some((t) => isHebrew(t.str))) continue;
    let best = 0;
    for (let k = 1; k < rowAt.length; k++) {
      if (Math.abs(rowAt[k] - i) < Math.abs(rowAt[best] - i)) best = k;
    }
    own[best].push(i);
  }

  /* ---- 4. read each column out of the block, in document order */
  const tracks: InterestTrack[] = [];
  rowAt.forEach((at, k) => {
    const block = own[k].sort((a, b) => a - b);
    // Line by line, and right-to-left within each line. NAME_JOIN cannot be used
    // across a wrapped cell: it sorts every token by x, so the second line of
    // "אג\"ח מדינה לא / צמודות" comes back as "צמודות אג\"ח מדינה לא" — the words
    // of one phrase reordered by where they happen to start.
    const words = (band: readonly [number, number]) =>
      block
        .map((i) =>
          [...lines[i].toks]
            .filter((t) => isHebrew(t.str) && t.x >= band[0] && t.x < band[1])
            .sort((a, b) => b.x - a.x)
            .map((t) => t.str)
            .join(" ")
        )
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
    const figure = (band: readonly [number, number]) =>
      lines[at].toks.find(
        (t) => /^\d+(\.\d+)?$|^[\d,]+$/.test(t.str) && t.x >= band[0] && t.x < band[1]
      )?.str ?? "";

    // Tested on the figures' own line only. The wrapped anchor above contains the
    // word הריבית, and reading it out of the whole block would report every
    // index-linked mortgage as interest-free.
    const rowText = despace(blockText([lines[at]]));
    const noInterest = rowText.includes("הריבית") || rowText.includes("ללאריבית");

    tracks.push({
      index: lines[at].toks.find((t) => t.x > 515 && /^\d{1,2}$/.test(t.str))!.str,
      type: noInterest ? "ללא ריבית (הריבית = אפס)" : words(TRACK_BAND.type),
      linkage: words(TRACK_BAND.linkage),
      anchor: words(TRACK_BAND.anchor),
      margin: figure(TRACK_BAND.margin),
      nominal: figure(TRACK_BAND.nominal),
      effective: figure(TRACK_BAND.effective),
      utilization: figure(TRACK_BAND.utilization),
    });
  });
  return tracks;
}

/**
 * בטחונות הקשורים לעסקה — the security behind a mortgage, and the denominator of
 * every LTV the analysis can offer.
 *
 * The file id comes in at least two shapes: a plain "1990769056" on a deposit and
 * a hyphenated "12039923-000194802" on a property charge. The old test demanded
 * twelve or more consecutive digits, which matches neither — so no report has ever
 * produced a collateral row, `mortgage.collateralValue` was always 0, and the LTV
 * flag could not fire on any file. The id is simply whatever sits in the id
 * column; its shape is the lender's business.
 */
function parseCollateral(lines: Line[]): Collateral[] {
  const out: Collateral[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!despace(blockText([lines[i]])).includes("בטחונותהקשורים")) continue;
    for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
      const txt = despace(blockText([lines[j]]));
      // The block ends where the next one starts.
      if (txt.includes("מסלוליריבית") || txt.includes("בטחונותהקשורים") || txt.includes("הערות")) break;
      const toks = lines[j].toks;
      const fileId = toks.find((t) => !isHebrew(t.str) && t.x > 430 && /^[\d][\d-]{6,}$/.test(t.str));
      if (!fileId) continue;
      const type = NAME_JOIN(toks.filter((t) => isHebrew(t.str)));
      const value =
        toks
          .filter((t) => /^[\d,]+$/.test(t.str) && t !== fileId && t.x < 260)
          .map((t) => t.str)[0] ?? "";
      out.push({ fileId: fileId.str, type, value });
    }
  }
  return out;
}

function parseRelatedCorps(lines: Line[]): RelatedCorp[] {
  const out: RelatedCorp[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const toks = lines[i].toks;
    const number = toks.find((t) => /^\d{9}$/.test(t.str) && t.x > 440);
    if (!number) continue;
    const heb = toks.filter((t) => isHebrew(t.str)).sort((a, b) => b.x - a.x);
    if (heb.length < 1) continue;
    const name = heb.filter((t) => t.x > 240).map((t) => t.str).join(" ").trim();
    const country = heb.filter((t) => t.x <= 240).map((t) => t.str).join(" ").trim();
    const key = number.str + name;
    if (name && !seen.has(key)) {
      seen.add(key);
      out.push({ number: number.str, name, country });
    }
  }
  return out;
}

// Fallback month-column centers (measured on the reference template); each
// grid's own header line overrides these, since column positions drift a few
// points between report variants.
const MONTH_CENTERS = [478, 441, 400, 362, 323, 286, 246, 208, 166, 129, 91, 50];

const MONTH_NAMES = ["ינו", "פבר", "מרץ", "אפר", "מאי", "יוני", "יולי", "אוג", "ספט", "אוק", "נוב", "דצמ"];

/** Month-column centers measured off a grid's own "חודש ינו' פבר'…" header. */
function monthCentersOf(line: Line): number[] | null {
  const centers: (number | null)[] = Array(12).fill(null);
  let found = 0;
  for (const t of line.toks) {
    const s = t.str.replace(/['׳]/g, "").trim();
    const mi = MONTH_NAMES.indexOf(s);
    if (mi >= 0 && centers[mi] === null) {
      centers[mi] = t.x + t.w / 2;
      found++;
    }
  }
  if (found < 8) return null;
  // Fill any unmatched month from its neighbours (columns are evenly spaced).
  for (let m = 0; m < 12; m++) {
    if (centers[m] !== null) continue;
    let lo = m - 1;
    while (lo >= 0 && centers[lo] === null) lo--;
    let hi = m + 1;
    while (hi < 12 && centers[hi] === null) hi++;
    if (lo >= 0 && hi < 12) {
      centers[m] = centers[lo]! + ((centers[hi]! - centers[lo]!) * (m - lo)) / (hi - lo);
    } else if (lo >= 0 && lo > 0 && centers[lo - 1] !== null) {
      centers[m] = centers[lo]! + (centers[lo]! - centers[lo - 1]!) * (m - lo);
    } else if (hi < 11 && centers[hi + 1] !== null) {
      centers[m] = centers[hi]! - (centers[hi + 1]! - centers[hi]!) * (hi - m);
    } else {
      centers[m] = MONTH_CENTERS[m];
    }
  }
  return centers as number[];
}

/** Assign a row's numeric tokens to month columns by nearest header center. */
function gridRowValues(
  line: Line,
  centers: number[],
  yearTok: Tok | undefined
): (string | null)[] {
  const months: (string | null)[] = Array(12).fill(null);
  // Column tolerance = just under half the narrowest column gap.
  let tol = 18;
  for (let m = 1; m < 12; m++) tol = Math.min(tol, Math.abs(centers[m - 1] - centers[m]) / 2 - 1);
  for (const t of line.toks) {
    if (t === yearTok) continue;
    if (!/^\d{1,3}$/.test(t.str)) continue;
    const tc = t.x + t.w / 2;
    let best = 0;
    let bestD = Infinity;
    for (let m = 0; m < 12; m++) {
      const d = Math.abs(tc - centers[m]);
      if (d < bestD) {
        bestD = d;
        best = m;
      }
    }
    if (bestD <= tol) months[best] = t.str;
  }
  return months;
}

const yearTokOf = (line: Line) => line.toks.find((t) => /^20\d\d$/.test(t.str) && t.x > 420);

/**
 * Coded monthly grids (checks / direct debits, 201-067..070). The year prints
 * only on the first row of each year band — a 201-068/070 row inherits the
 * year of the 201-067/069 row above it.
 */
function parseGrids(lines: Line[]): MonthlyGrid[] {
  const defs: { codes: string[]; label: string }[] = [
    { codes: ["201-067"], label: "מספר שיקים שהוצגו" },
    { codes: ["201-068"], label: 'מספר שיקים שחזרו (אכ"מ)' },
    { codes: ["201-069"], label: "מספר הוראות לחיוב חשבון" },
    { codes: ["201-070"], label: "הוראות לחיוב חשבון שלא כובדו" },
  ];
  const grids: MonthlyGrid[] = defs.map((d) => ({ label: d.label, rows: [] }));
  let centers = MONTH_CENTERS;
  let bandYear = "";
  for (const line of lines) {
    const hdr = monthCentersOf(line);
    if (hdr) {
      centers = hdr;
      bandYear = "";
      continue;
    }
    const codes = detectCodes(line).map((c) => c.code);
    const di = defs.findIndex((d) => d.codes.some((c) => codes.includes(c)));
    if (di < 0) continue;
    const yearTok = yearTokOf(line);
    if (yearTok) bandYear = yearTok.str;
    if (!bandYear) continue;
    const months = gridRowValues(line, centers, yearTok);
    if (months.some((m) => m !== null)) grids[di].rows.push({ year: bandYear, months });
  }
  return grids.filter((g) => g.rows.length);
}

/**
 * The per-transaction "היסטוריית פיגורים לעסקה" grid: uncoded year rows whose
 * values are days-in-arrears buckets (1=30-59 … 6=180 ומעלה).
 */
function parseArrearsGrid(lines: Line[]): MonthlyGrid[] {
  const rows: { year: string; months: (string | null)[] }[] = [];
  let inGrid = false;
  let centers = MONTH_CENTERS;
  for (const line of lines) {
    const txt = despace(blockText([line]));
    if (txt.includes("היסטורייתפיגורים")) {
      inGrid = true;
      continue;
    }
    if (!inGrid) continue;
    if (txt.includes("מקרא")) break;
    const hdr = monthCentersOf(line);
    if (hdr) {
      centers = hdr;
      continue;
    }
    if (detectCodes(line).length) break; // a new sub-section started
    const yearTok = yearTokOf(line);
    if (!yearTok) continue;
    const months = gridRowValues(line, centers, yearTok);
    if (months.some((m) => m !== null)) rows.push({ year: yearTok.str, months });
  }
  return rows.length
    ? [{ label: "היסטוריית פיגורים לעסקה (1=30-59 ימים … 6=180 ומעלה)", rows }]
    : [];
}

function parseContact(lines: Line[]): { phone: string; email: string; address: string } {
  for (const line of lines) {
    const txt = despace(blockText([line]));
    if (!txt.includes("טלפון") && !txt.includes("כתובת")) continue;
    const toks = line.toks;
    const email = toks.find((t) => /@/.test(t.str))?.str ?? "";
    const star = toks.some((t) => t.str === "*");
    const phoneTok = toks.find((t) => /^\d{3,12}$/.test(t.str) && !DATE_RE.test(t.str));
    const phone = phoneTok ? (star ? "*" : "") + phoneTok.str : "";
    const addrTok = toks.filter(
      (t) =>
        isHebrew(t.str) &&
        !/כתובת|טלפון|דוא/.test(t.str) &&
        t.x > 360 &&
        t.str.replace(/["'.״׳|]/g, "").trim().length >= 2
    );
    const address = addrTok.length
      ? [...addrTok].sort((a, b) => b.x - a.x).map((t) => t.str).join(" ").trim()
      : "";
    return { phone, email, address };
  }
  return { phone: "", email: "", address: "" };
}

function buildTransaction(
  section: "current" | "active" | "inactive",
  role: "debtor" | "guarantor",
  source: string,
  contact: { phone: string; email: string; address: string },
  lines: Line[],
  uid: string
): Transaction {
  const fields: Record<string, string> = {};
  for (const code of SCALAR_CODES) {
    const v = scalarIn(lines, code);
    if (v) fields[code] = v;
  }
  // Enums via cell-column phrase detection (handles wrapped values).
  const setEnum = (code: string, phrases: readonly string[], blockFallback = true) => {
    const v = enumByCell(lines, code, phrases, blockFallback);
    if (v) fields[code] = v;
  };
  setEnum("201-022", ENUMS.status);
  // Both of these are printed with an empty value on a large minority of
  // transactions, so neither may fall back to a whole-block search — see
  // enumByCell. An absent purpose is a gap in the report, not "עסק".
  setEnum("201-017", ENUMS.purpose, false);
  setEnum("201-021", ENUMS.currency);
  setEnum("201-044", ENUMS.frequency);
  setEnum("201-047", ENUMS.paymentType, false);
  // Days-in-arrears range (only printed when the transaction is in arrears).
  if (fields["201-051"] || fields["201-052"]) setEnum("201-050", ENUMS.arrearsRange);
  if (section === "current") {
    fields["201-002"] = "חשבון עובר ושב";
  } else {
    const t = detectByBand(lines, "201-002", [363, 420], ENUMS.transactionType);
    if (t) fields["201-002"] = t;
  }

  // Coded remark lines (הערות): the fixed legal wording printed next to the code.
  const remarks: string[] = [];
  for (const line of lines) {
    const rc = detectCodes(line).find((c) => REMARK_CODES.has(c.code));
    if (!rc) continue;
    const text = line.toks
      .filter((t) => isHebrew(t.str) && t.x < rc.xStart - 0.5)
      .sort((a, b) => b.x - a.x)
      .map((t) => t.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (text && !remarks.includes(text)) remarks.push(text);
  }

  return {
    uid,
    section,
    role,
    source,
    contact,
    fields,
    interestTracks: parseInterestTracks(lines),
    collateral: parseCollateral(lines),
    relatedCorps: parseRelatedCorps(lines),
    grids: [...(section === "current" ? parseGrids(lines) : []), ...parseArrearsGrid(lines)],
    remarks,
  };
}

function parseTransactionsSection(
  flat: FlatLine[],
  bounds: [number, number],
  section: "current" | "active" | "inactive"
): Transaction[] {
  const [start, end] = bounds;
  const txns: Transaction[] = [];
  let role: "debtor" | "guarantor" = "debtor";
  let source = "";
  let contact = { phone: "", email: "", address: "" };

  // Find boundaries: each transaction starts at a boundary line.
  interface Seg {
    role: "debtor" | "guarantor";
    source: string;
    contact: { phone: string; email: string; address: string };
    lines: Line[];
  }
  const segs: Seg[] = [];
  let cur: Seg | null = null;
  let pendingSourceLines: Line[] = [];

  for (let i = start; i < end; i++) {
    const line = flat[i].line;
    const txt = despace(blockText([line]));
    const codes = detectCodes(line).map((c) => c.code);

    if (txt.includes("עסקאותבהןהלקוחחייב")) {
      role = "debtor";
      continue;
    }
    if (txt.includes("עסקאותבהןהלקוחערב")) {
      role = "guarantor";
      continue;
    }
    // Track the reporting source (bank) line.
    if (txt.includes("שםמקורהמידעהמדווח")) {
      const heb = line.toks.filter((t) => isHebrew(t.str) && t.x < 440);
      source = NAME_JOIN(heb).replace(/.*המדווח:?/, "").trim() || NAME_JOIN(heb);
      // Use the RTL text after the colon.
      const full = RTL_JOIN(line.toks);
      const after = full.split("המדווח:")[1];
      if (after) source = after.trim();
      pendingSourceLines = [line];
      if (section === "current") {
        cur = { role, source, contact: { phone: "", email: "", address: "" }, lines: [line] };
        segs.push(cur);
      } else {
        cur = null; // wait for (201-002)
      }
      continue;
    }
    // Capture contact line right after a source.
    if ((txt.includes("טלפון") || txt.includes("כתובת")) && (cur || pendingSourceLines.length)) {
      contact = parseContact([line]);
      if (cur) cur.contact = contact;
      pendingSourceLines.push(line);
    }

    const startsTxn = section !== "current" && codes.includes("201-002");
    if (startsTxn) {
      cur = { role, source, contact, lines: [] };
      // The transaction-type label (e.g. "מסגרת אשראי") wraps onto the line
      // just above the code line; pull it into this segment.
      const prevFl = flat[i - 1];
      if (prevFl && prevFl.page === flat[i].page) {
        const prev = prevFl.line;
        const noCode = detectCodes(prev).length === 0;
        const noPct = !prev.toks.some((t) => t.str === "%");
        const inBand = prev.toks.some((t) => isHebrew(t.str) && t.x >= 360 && t.x <= 420);
        if (noCode && noPct && inBand) cur.lines.push(prev);
      }
      segs.push(cur);
    }
    if (cur) cur.lines.push(line);
    else pendingSourceLines.push(line);
  }

  segs.forEach((s, i) => {
    if (!s.lines.length) return;
    if (section !== "current" && !s.contact.email && !s.contact.phone) {
      s.contact = contact;
    }
    txns.push(
      buildTransaction(section, s.role, s.source, s.contact, s.lines, `${section}-${i + 1}`)
    );
  });
  return txns;
}

// ---------------------------------------------------------------------------
// §5 Execution
// ---------------------------------------------------------------------------

function parseExecution(flat: FlatLine[], bounds: [number, number]): ExecutionCase[] {
  const [start, end] = bounds;
  const cases: ExecutionCase[] = [];
  for (let i = start; i < end; i++) {
    const codes = detectCodes(flat[i].line).filter((c) => c.code.startsWith("197-"));
    if (codes.length < 5) continue;
    // Header code row found: one case per data line, until the next block
    // (insolvency / another authority) begins.
    const page = flat[i].page;
    for (let j = i + 1; j < end; j++) {
      if (flat[j].page !== page) break;
      const line = flat[j].line;
      const txt = despace(blockText([line]));
      if (/^\d{1,2}$/.test(txt)) break; // footer page number
      if (txt.includes("פרטיהתקשרות") || txt.includes("הממונה")) break;
      if (detectCodes(line).some((c) => !c.code.startsWith("197-"))) break;
      const valueToks = line.toks.filter((t) => /\d/.test(t.str));
      if (valueToks.length < 2) continue; // wrapped-label fragments
      const fields = rowByColumns(line, codes);
      if (Object.keys(fields).length >= 3) cases.push({ fields });
    }
    break;
  }
  return cases;
}

// ---------------------------------------------------------------------------
// §5 Insolvency proceedings (151-xxx)
// ---------------------------------------------------------------------------

/**
 * The insolvency block prints `(code) <label> <value>` pairs, two per line.
 * Values can be Hebrew (e.g. "פשיטת רגל"), so instead of digit-only scalars we
 * take the whole cell and strip the field's known label off its right edge.
 */
function insolvencyValue(line: Line, me: CodeHit, codes: CodeHit[]): string {
  let leftBound = 0;
  for (const c of codes) {
    if (c.xEnd <= me.xStart + 1 && c.xEnd > leftBound) leftBound = c.xEnd;
  }
  const cell = line.toks
    .filter((t) => t.x < me.xStart - 0.5 && t.x > leftBound - 0.5 && t.str.trim().length > 0)
    .sort((a, b) => b.x - a.x); // RTL: label first, value after
  const label = despace(FIELD_BY_CODE[me.code]?.he ?? "");
  let vi = 0;
  while (vi < cell.length && label.includes(despace(cell[vi].str))) vi++;
  return cell
    .slice(vi)
    .map((t) => t.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseInsolvency(flat: FlatLine[], bounds: [number, number]): InsolvencyCase[] {
  const [start, end] = bounds;
  const out: InsolvencyCase[] = [];
  let fields: Record<string, string> | null = null;
  for (let i = start; i < end; i++) {
    const line = flat[i].line;
    const codes = detectCodes(line).filter((c) => c.code.startsWith("151-"));
    if (!codes.length) continue;
    // A new case starts at its file-id line.
    if (codes.some((c) => c.code === "151-001") || !fields) {
      fields = {};
      out.push({ fields });
    }
    for (const c of codes) {
      const v = insolvencyValue(line, c, codes);
      if (v) fields[c.code] = v;
    }
  }
  return out.filter((c) => Object.keys(c.fields).length > 0);
}

// ---------------------------------------------------------------------------
// §6 Inquiries
// ---------------------------------------------------------------------------

function colCenters(line: Line, labels: { code: string; needle: string }[]): CodeHit[] {
  // Build synthetic column anchors from a header line's tokens.
  const hits: CodeHit[] = [];
  for (const { code, needle } of labels) {
    const tk = line.toks.find((t) => despace(t.str).includes(needle));
    if (tk) hits.push({ code, xStart: tk.x, xEnd: tk.xEnd });
  }
  return hits;
}

function parseInquiries(flat: FlatLine[], bounds: [number, number]) {
  const [start, end] = bounds;
  const byDate: InquiryByDate[] = [];
  const newCredit: NewCreditInquiry[] = [];
  const summary: InquirySummaryRow[] = [];

  // Table 1 header
  let t1Header: CodeHit[] | null = null;
  let t2Header: CodeHit[] | null = null;
  let mode: "t1" | "t2" | "sum" | null = null;

  const dateAnchors: { i: number; y: number; page: number }[] = [];

  for (let i = start; i < end; i++) {
    const line = flat[i].line;
    const txt = despace(blockText([line]));
    if (txt.includes("פירוטפניותלקבלתמידעלפיתאריך")) {
      mode = "t1";
      continue;
    }
    if (txt.includes("לצורךהתקשרותבעסקתאשראיחדשה")) {
      mode = "t2";
      continue;
    }
    if (txt.includes("ריכוזפניותלקבלתמידע") || txt.includes("הפונההמבקש")) {
      mode = "sum";
      continue;
    }
    if (mode === "t1" && txt.includes("תאריךהבקשה") && txt.includes("מטרתהבקשה")) {
      t1Header = colCenters(line, [
        { code: "date", needle: "תאריךהבקשה" },
        { code: "purpose", needle: "מטרתהבקשה" },
        { code: "requester", needle: "שםהגורםהמבקש" },
        { code: "bureau", needle: "לשכתהאשראיהפונה" },
      ]);
      continue;
    }
    if (mode === "t2" && txt.includes("שםמשתמשבנתוני")) {
      // header spread across a couple of lines; build from this + next.
      const merged: Line = { y: line.y, toks: [...line.toks, ...(flat[i + 1]?.line.toks ?? []), ...(flat[i + 2]?.line.toks ?? [])] };
      t2Header = colCenters(merged, [
        { code: "user", needle: "שםמשתמשבנתוני" },
        { code: "type", needle: "סוגעסקה" },
        { code: "date", needle: "תאריךהגשת" },
        { code: "purpose", needle: "מטרת" },
        { code: "amount", needle: "סכוםאשראי" },
        { code: "relation", needle: "סוגהקשר" },
        { code: "plannedStart", needle: "תחילתעסקה" },
      ]);
      continue;
    }

    if (mode === "sum") {
      if (txt.includes("הפונההמבקש")) continue; // header row
      const requesterToks = line.toks.filter((t) => isHebrew(t.str) && t.x > 420);
      const nums = line.toks.filter((t) => /^\d+$/.test(t.str)).map((t) => t.str);
      const name = NAME_JOIN(requesterToks);
      if (name && nums.length) {
        summary.push({ requester: name, counts: nums });
      }
      continue;
    }
  }

  // Table 1 rows: anchor on date tokens in the date column.
  const t1Start = flat.findIndex(
    (_, i) => i >= start && i < end && despace(blockText([flat[i].line])).includes("פירוטפניותלקבלתמידעלפיתאריך")
  );
  if (t1Header) {
    const dateCx = t1Header.find((c) => c.code === "date")!.xStart;
    const anchors: number[] = [];
    for (let i = (t1Start < 0 ? start : t1Start); i < end; i++) {
      const txt = despace(blockText([flat[i].line]));
      if (txt.includes("לצורךהתקשרות")) break;
      const hasDate = flat[i].line.toks.some(
        (t) => DATE_RE.test(t.str) && Math.abs(t.x - dateCx) < 30
      );
      if (hasDate) anchors.push(i);
    }
    for (let a = 0; a < anchors.length; a++) {
      const from = anchors[a];
      const anchorLine = flat[from].line;
      const page = flat[from].page;
      // Each row is 3 text-lines tall with the date in the middle; take a tight
      // vertical window so neighbouring rows don't bleed in.
      const toks: Tok[] = [];
      for (let j = start; j < end; j++) {
        if (flat[j].page !== page) continue;
        if (Math.abs(flat[j].line.y - anchorLine.y) <= 11) toks.push(...flat[j].line.toks);
      }
      const r = rowByColumns({ y: 0, toks }, t1Header);
      const date = (r.date || "").match(DATE_RE)?.[0] ?? "";
      if (date) {
        byDate.push({
          date,
          purpose: r.purpose || "",
          requester: r.requester || "",
          bureau: r.bureau || "",
        });
      }
    }
  }

  // Table 2 rows: anchor on lines holding a date in the date column.
  if (t2Header) {
    const dateCx = t2Header.find((c) => c.code === "date")!.xStart;
    for (let i = start; i < end; i++) {
      const line = flat[i].line;
      const txt = despace(blockText([line]));
      if (txt.includes("שםמשתמשבנתוני") || txt.includes("ריכוזפניות")) continue;
      const dateTok = line.toks.find((t) => DATE_RE.test(t.str) && Math.abs(t.x - dateCx) < 35);
      if (!dateTok) continue;
      // Gather this line plus neighbours within ±11 y for the wrapped name.
      const toks: Tok[] = [...line.toks];
      for (let j = i - 1; j >= start && Math.abs(flat[j].line.y - line.y) < 12; j--)
        if (flat[j].page === flat[i].page) toks.push(...flat[j].line.toks);
      for (let j = i + 1; j < end && Math.abs(flat[j].line.y - line.y) < 12; j++)
        if (flat[j].page === flat[i].page) toks.push(...flat[j].line.toks);
      const r = rowByColumns({ y: 0, toks }, t2Header);
      newCredit.push({
        user: r.user || "",
        transactionType: r.type || "",
        date: (r.date || "").match(DATE_RE)?.[0] ?? dateTok.str,
        purpose: r.purpose || "",
        amount: r.amount || "",
        relation: r.relation || "",
        plannedStart: (r.plannedStart || "").match(DATE_RE)?.[0] ?? "",
      });
    }
  }

  return { byDate, newCredit, summary };
}

// ---------------------------------------------------------------------------
// §7 Admin
// ---------------------------------------------------------------------------

function parseAdmin(flat: FlatLine[], bounds: [number, number]): AdminAction[] {
  const [start, end] = bounds;
  let header: CodeHit[] | null = null;
  const out: AdminAction[] = [];
  for (let i = start; i < end; i++) {
    const line = flat[i].line;
    const txt = despace(blockText([line]));
    if (txt.includes("מספרפנייה") && txt.includes("סטטוסהפנייה")) {
      header = colCenters(line, [
        { code: "ref", needle: "מספרפנייה" },
        { code: "date", needle: "תאריךהפנייה" },
        { code: "type", needle: "סוגפנייה" },
        { code: "status", needle: "סטטוסהפנייה" },
      ]);
      continue;
    }
    if (!header) continue;
    const refTok = line.toks.find((t) => /^\d{10,}$/.test(t.str));
    if (!refTok) continue;
    const r = rowByColumns(line, header);
    out.push({
      ref: refTok.str,
      date: (r.date || "").match(DATE_RE)?.[0] ?? "",
      type: r.type || "",
      status: r.status || "",
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function parseReport(raw: RawPage[]): CreditReport {
  const warnings: string[] = [];
  const pages = buildPages(raw);
  const flat = flatten(pages);
  const bounds = sectionBounds(flat);

  const { meta, client } = safe(() => parseIdentity(pages, flat), { meta: { reportDate: "", reportType: "", generatedFor: "" }, client: { name: "", idNumber: "", passportCountry: "", clientType: "", systemStatus: "", dataCollectionStart: "" } }, warnings, "identity");

  const summary = safe(() => (bounds.s1 ? parseSummary(flat, bounds.s1) : []), [], warnings, "summary");
  const nonPaymentIndicators = safe(() => parseNonPayment(flat, bounds.s1 ?? [0, flat.length]), [], warnings, "indicators");

  const current = safe(() => (bounds.s2 ? parseTransactionsSection(flat, bounds.s2, "current") : []), [], warnings, "current");
  const active = safe(() => (bounds.s3 ? parseTransactionsSection(flat, bounds.s3, "active") : []), [], warnings, "active");
  const inactive = safe(() => (bounds.s4 ? parseTransactionsSection(flat, bounds.s4, "inactive") : []), [], warnings, "inactive");

  const execution = safe(() => (bounds.s5 ? parseExecution(flat, bounds.s5) : []), [], warnings, "execution");
  const insolvency = safe(() => (bounds.s5 ? parseInsolvency(flat, bounds.s5) : []), [], warnings, "insolvency");
  const inq = safe(() => (bounds.s6 ? parseInquiries(flat, bounds.s6) : { byDate: [], newCredit: [], summary: [] }), { byDate: [], newCredit: [], summary: [] }, warnings, "inquiries");
  const adminActions = safe(() => (bounds.s7 ? parseAdmin(flat, bounds.s7) : []), [], warnings, "admin");

  const report: CreditReport = {
    meta,
    client,
    summary,
    nonPaymentIndicators,
    transactions: [...current, ...active, ...inactive],
    execution,
    insolvency,
    inquiriesByDate: inq.byDate,
    newCreditInquiries: inq.newCredit,
    inquirySummary: inq.summary,
    adminActions,
    warnings,
  };
  // Self-validation: cross-check the parsed transactions against the report's
  // own printed §1 totals, so a template drift can never fail silently.
  try {
    warnings.push(...validateReport(report));
  } catch (e) {
    warnings.push(`validate: ${(e as Error).message}`);
  }
  return report;
}

// ---------------------------------------------------------------------------
// Self-validation
// ---------------------------------------------------------------------------

const toNum = (v?: string) => {
  if (!v) return 0;
  const n = Number(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function summaryTypeMatches(blockType: string, txnType: string): boolean {
  const b = despace(blockType);
  const t = despace(txnType);
  if (b.includes("עובר")) return t.includes("עובר");
  if (b.includes("מסגרת")) return t.includes("מסגרת");
  if (b.includes("משכנת") || b.includes("לדיור")) return t.includes("משכנת") || t.includes("לדיור");
  if (b.includes("הלוואה")) return t === "הלוואה";
  return t.includes(b);
}

/**
 * Advisory accuracy checks, appended to `report.warnings`:
 *  1. each §1 block's data rows must add up to its printed סה"כ row;
 *  2. the open transactions of each type must reproduce that printed total.
 */
export function validateReport(r: CreditReport): string[] {
  const warns: string[] = [];
  const open = r.transactions.filter((t) => t.section !== "inactive");
  for (const g of r.summary) {
    for (const b of g.blocks) {
      const total = b.rows.find((x) => x.isTotal);
      if (!total) continue;
      const dataRows = b.rows.filter((x) => !x.isTotal);
      const rowSum = dataRows.reduce((s, x) => s + toNum(x.debtBalance), 0);
      const printed = toNum(total.debtBalance);
      if (rowSum !== printed) {
        warns.push(
          `אימות תמצית: שורות "${b.transactionType}" מסתכמות ל-${rowSum.toLocaleString("en-US")} אך הסה"כ המודפס הוא ${printed.toLocaleString("en-US")}`
        );
      }
      const matched = open.filter(
        (t) => t.role === g.role && summaryTypeMatches(b.transactionType, t.fields["201-002"] ?? "")
      );
      const txnSum = matched.reduce((s, t) => s + toNum(t.fields["201-049"]), 0);
      if (txnSum !== printed) {
        warns.push(
          `אימות עסקאות: יתרות "${b.transactionType}" בפרקים 2-3 מסתכמות ל-${txnSum.toLocaleString("en-US")} אך תמצית הדוח מציינת ${printed.toLocaleString("en-US")}`
        );
      }
      const printedCount = toNum(total.idOrCount);
      const openWithDebt = matched.filter((t) => toNum(t.fields["201-049"]) > 0).length;
      if (printedCount > 0 && printedCount !== openWithDebt) {
        warns.push(
          `אימות ספירה: בתמצית מצוינות ${printedCount} עסקאות "${b.transactionType}" אך חולצו ${openWithDebt}`
        );
      }
    }
  }
  return warns;
}

function safe<T>(fn: () => T, fallback: T, warnings: string[], label: string): T {
  try {
    return fn();
  } catch (e) {
    warnings.push(`${label}: ${(e as Error).message}`);
    return fallback;
  }
}
