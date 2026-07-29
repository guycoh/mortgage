// לאומי למשכנתאות — "פירוט יתרות ועמלות פירעון מוקדם בהלוואה".
//
// Transposed, one column per משנה, labels in a right-hand gutter on the same
// line as their values. Columns are right-aligned, so they are identified by
// where content ends.
//
// Three things make this the fiddliest of the four:
//
//   · The grid runs across two pages. Page one ends with "המשך בדף הבא" and page
//     two adds the remaining tranches plus a "סה"כ להלוואה" column. That last
//     column is the lender's own total — counted as a tranche it would double
//     the mortgage, so it is found and excluded, then used to check the sum.
//   · Rate rows are split by rate type. "שיעור ריבית מתואמת" appears twice, once
//     under "ריבית קבועה" and once under "ריבית משתנה", each filling only the
//     columns of its own kind. Read as one row the second would overwrite the
//     first with blanks.
//   · Rows are only as wide as they need to be. "שיערוך קרן )הצמדה(" carries two
//     figures on a four-column grid because only two tranches are index-linked.
//     Nothing but the x coordinate says which two.

import type { RawItem, RawPage } from "@/lib/credit-parser/types";
import { date, has, norm, num, pageLines, pct, toDate, monthsBetween, type Line } from "../text";
import { clean } from "../fields";
import type { BankLoan, BankStatement, BankTranche, Linkage, RateKind } from "../types";
import { BANK_LABEL } from "../types";

const rightOf = (i: RawItem) => i.x + i.w;

interface Grid {
  /** Tranche numbers, right-to-left as printed. */
  numbers: string[];
  /** Right edge of each tranche column. */
  edges: number[];
  /** label text → one cell per column. */
  rows: { label: string; cells: string[] }[];
  /** The lender's own "סה"כ להלוואה" column, when this page carries it. */
  totalsColumn: { edge: number; cells: Map<string, string> } | null;
}

/**
 * Read one page of the grid.
 *
 * The label gutter is everything right of the last tranche column. Deriving it
 * from the columns rather than from a fixed x keeps it correct when a page
 * carries fewer tranches and the grid is narrower.
 */
function readGrid(page: RawPage): Grid | null {
  const lines = pageLines(page, 2.5);
  const headerAt = lines.findIndex((l) => has(l.text, "מספר משנה"));
  if (headerAt < 0) return null;
  const header = lines[headerAt];

  // Each tranche column is headed by the word משנה. "המשך בדף הבא" and
  // "סה"כ להלוואה" sit on the same line and are not tranches.
  const marks = header.items.filter((i) => norm(i.str) === "משנה");
  if (!marks.length) return null;

  // Only a משנה that carries a NUMBER is a real tranche. The last page prints
  // the grid at full width regardless — four slots for one remaining tranche —
  // and the empty slots sit right where the "סה"כ להלוואה" figures land, so
  // keeping them turned the lender's own total into a phantom tranche.
  const numbered = marks
    .map((mk) => {
      const e = rightOf(mk);
      const digit = header.items.find(
        (i) => i.x < e && e - rightOf(i) < 30 && /^\d+$/.test(i.str.trim())
      );
      return { edge: e, number: digit?.str.trim() ?? "" };
    })
    .filter((c) => c.number)
    .sort((a, b) => b.edge - a.edge);
  if (!numbered.length) return null;

  const edges = numbered.map((c) => c.edge);
  const numbers = numbered.map((c) => c.number);

  const boundary = Math.max(...edges) + 18;
  const totalsItem = header.items.find((i) => has(i.str, "סה\"כ להלוואה") || has(i.str, 'סה"כ'));
  const totalsEdge = totalsItem && rightOf(totalsItem) < Math.min(...edges) - 20 ? rightOf(totalsItem) : null;

  // Columns claim a BAND, not a point.
  //
  // Numbers are right-aligned and sit within a few points of their column's
  // edge, but text is not: "פריים-קרן על בסיס שפ" is wider than the column and
  // arrives as four separate runs spread across it. Matching on the right edge
  // alone found the last run and silently dropped the rest, which left the
  // linkage cell empty and every such tranche classified as unknown.
  const allEdges = marks.map(rightOf).sort((a, b) => b - a);
  const spacing =
    allEdges.length > 1
      ? Math.min(...allEdges.slice(1).map((e, k) => allEdges[k] - e))
      : 130;
  const bands = edges.map((e) => ({ from: e - spacing + 4, to: e + 10 }));

  const cellFor = (i: RawItem, extra: number[] = []) => {
    const c = i.x + i.w / 2;
    for (let k = 0; k < bands.length; k++) {
      if (c > bands[k].from && c <= bands[k].to) return k;
    }
    // Left of every tranche column: the lender's own totals column.
    for (let k = 0; k < extra.length; k++) {
      if (Math.abs(rightOf(i) - extra[k]) <= spacing) return edges.length + k;
    }
    return -1;
  };

  const rows: Grid["rows"] = [];
  const totalCells = new Map<string, string>();

  for (const line of lines.slice(headerAt + 1)) {
    const labelItems = line.items.filter((i) => i.x >= boundary);
    const valueItems = line.items.filter((i) => i.x < boundary);
    const label = clean(labelItems.map((i) => i.str).join(" "));
    if (!label && !valueItems.length) continue;

    const extra = totalsEdge !== null ? [totalsEdge] : [];
    const cells = edges.map(() => "");
    let total = "";
    for (const it of valueItems) {
      const c = cellFor(it, extra);
      if (c < 0) continue;
      if (c < edges.length) cells[c] = clean(`${cells[c]} ${it.str}`);
      else total = clean(`${total} ${it.str}`);
    }

    // A label with no values is a heading or a continuation; a row of values
    // with no label belongs to the label above it.
    if (label) {
      rows.push({ label, cells });
      if (total) totalCells.set(label, total);
    } else if (rows.length) {
      const prev = rows[rows.length - 1];
      prev.cells = prev.cells.map((p, i) => clean([p, cells[i]].filter(Boolean).join(" ")));
    }
  }

  return {
    numbers,
    edges,
    rows,
    totalsColumn: totalsEdge !== null ? { edge: totalsEdge, cells: totalCells } : null,
  };
}

/** First row whose label contains the phrase. */
function row(grid: Grid, phrase: string): string[] {
  const hit = grid.rows.find((r) => has(r.label, phrase));
  return hit ? hit.cells : grid.numbers.map(() => "");
}

/** All rows whose label contains the phrase — the rate rows appear twice. */
function rowsAll(grid: Grid, phrase: string): string[][] {
  return grid.rows.filter((r) => has(r.label, phrase)).map((r) => r.cells);
}

/** Per column, the first of several rows that actually filled that column. */
function merge(sets: string[][], width: number): string[] {
  const out = Array.from({ length: width }, () => "");
  for (const s of sets) {
    for (let i = 0; i < width; i++) if (!out[i] && s[i]) out[i] = s[i];
  }
  return out;
}

function readRate(sugRibit: string, basis: string): { kind: RateKind; linkage: Linkage } {
  const t = norm(sugRibit);
  const b = norm(basis);
  // Leumi writes prime into the linkage cell: "פריים-קרן על בסיס שפ".
  const kind: RateKind = /פריים/.test(b)
    ? "prime"
    : /משתנה/.test(t)
      ? "variable"
      : /קבוע/.test(t)
        ? "fixed"
        : "unknown";
  const linkage: Linkage = /הצמדהלמדד|צמודמדד/.test(b)
    ? "linked"
    : /פריים|לאצמוד|שקל/.test(b)
      ? "unlinked"
      : /דולר|אירו|מט"ח/.test(b)
        ? "fx"
        : "unknown";
  return { kind, linkage };
}

export function parseLeumi(pages: RawPage[], dataPages: number[]): BankStatement {
  const warnings: string[] = [];
  const grids = pages
    .filter((p) => dataPages.includes(p.page))
    .map((p) => ({ page: p.page, grid: readGrid(p) }))
    .filter((g): g is { page: number; grid: Grid } => g.grid !== null);

  const dataText = pages
    .filter((p) => dataPages.includes(p.page))
    .flatMap((p) => pageLines(p))
    .map((l) => l.text)
    .join("\n");

  const loanNumber = (dataText.match(/בהלוואה\s+([\d-]{8,})/) ?? [])[1] ?? "";
  const asOf = date((dataText.match(/ליום:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/) ?? [])[1] ?? "");
  const purpose = clean((dataText.match(/מטרת ההלוואה\s*(.+)/) ?? [])[1] ?? "");
  const asOfDate = toDate(asOf);

  // The appendix names the borrower; the grid pages do not.
  const wholeText = pages.flatMap((p) => pageLines(p)).map((l) => l.text).join("\n");
  const name = clean((wholeText.match(/שם הלווים\s*(.+?)\s*מספר הלוואה/) ?? [])[1] ?? "");

  const tranches: BankTranche[] = [];
  let printedTotalBalance: number | null = null;
  let printedTotalMonthly: number | null = null;

  for (const { grid } of grids) {
    const width = grid.numbers.length;
    const g = {
      original: row(grid, "סכום מתן"),
      start: row(grid, "תאריך מתן"),
      first: row(grid, "מועד תשלום ראשון"),
      end: row(grid, "תאריך סיום"),
      monthly: row(grid, "החזר"),
      rate: row(grid, "ריבית שנתית להלוואה"),
      amort: row(grid, "שיטת פירעון ההלוואה"),
      linkage: row(grid, "בסיס הצמדה"),
      baseIndex: row(grid, "מדד בסיס"),
      rateType: row(grid, "סוג ריבית"),
      // The current effective rate is printed under the rate-type headings
      // "ריבית קבועה" and "ריבית משתנה", each filling only its own columns. The
      // row actually LABELLED "שיעור ריבית מתואמת" is the heading and is empty,
      // and "שיעור ריבית מתואמת מקורית" is the rate at origination — a different
      // number that must not be mistaken for today's.
      effective: merge(
        [...rowsAll(grid, "ריבית קבועה"), ...rowsAll(grid, "ריבית משתנה")].filter(Boolean),
        width
      ),
      anchor: row(grid, "התוספת/הפחתה"),
      resetFreq: row(grid, "תדירות שינוי הריבית"),
      nextReset: row(grid, "מועד שינוי הריבית הקרוב"),
      forecast: row(grid, "שיעור ריבית כוללת חזויה"),
      comparison: row(grid, "שיעור ריבית לצורכי השוואה"),
      principal: row(grid, "יתרת קרן"),
      indexation: row(grid, "שיערוך קרן"),
      interest: row(grid, "ריבית לסילוק"),
      arrears: row(grid, "חוב פיגורים"),
      payoff: row(grid, 'סה"כ יתרה לסילוק'),
      breakFee: row(grid, 'סה"כ עמלות פירעון מוקדם'),
      noticeFee: row(grid, "עמלת אי הודעה"),
      /** The rate used to discount, not an amount — kept for display only. */
      discountRate: row(grid, "ריבית להיוון"),
    };

    if (grid.totalsColumn) {
      printedTotalBalance =
        num(grid.totalsColumn.cells.get(Array.from(grid.totalsColumn.cells.keys()).find((k) => has(k, 'סה"כ יתרה לסילוק')) ?? "") ?? "") ??
        printedTotalBalance;
      const monthlyKey = Array.from(grid.totalsColumn.cells.keys()).find((k) => has(k, "החזר"));
      printedTotalMonthly = num(grid.totalsColumn.cells.get(monthlyKey ?? "") ?? "") ?? printedTotalMonthly;
    }

    for (let c = 0; c < width; c++) {
      const principal = num(g.principal[c]);
      const indexation = num(g.indexation[c]);
      const payoff = num(g.payoff[c]);
      // An empty column is a place the grid reserved and never filled — page
      // two prints five slots for one remaining tranche.
      if (principal === null && payoff === null) continue;

      const balance = (principal ?? 0) + (indexation ?? 0) || payoff;
      if (!balance || balance <= 0) continue;

      let { kind, linkage } = readRate(g.rateType[c], g.linkage[c]);
      if (linkage === "unknown") {
        // This template leaves בסיס הצמדה blank on some tranches. A tranche that
        // is index-linked carries a base index and an indexation balance; one
        // that is not carries neither. Inferred rather than left unknown, since
        // unknown would land the row in the wrong track.
        const idx = num(g.baseIndex[c]) ?? 0;
        const uplift = num(g.indexation[c]) ?? 0;
        linkage = idx > 0 || uplift > 0 ? "linked" : "unlinked";
      }
      const endDate = date(g.end[c]);
      const to = toDate(endDate);
      const fees = [{ label: "עמלת אי הודעה", amount: num(g.noticeFee[c]) }].filter(
        (f): f is { label: string; amount: number } => f.amount !== null && f.amount > 0
      );

      tranches.push({
        uid: `${loanNumber}#${grid.numbers[c] || c + 1}`,
        loanNumber,
        trancheNumber: grid.numbers[c] ?? "",
        rawTrack: clean(`${g.rateType[c]} ${g.linkage[c]}`),
        rateKind: kind,
        linkage,
        amortization: g.amort[c],
        purpose,
        principal,
        indexation,
        accruedInterest: num(g.interest[c]),
        arrears: num(g.arrears[c]),
        balance,
        payoff,
        originalAmount: num(g.original[c]),
        monthly: num(g.monthly[c]),
        rate: pct(g.rate[c]),
        effectiveRate: pct(g.effective[c]),
        forecastRate: pct(g.forecast[c]),
        comparisonRate: pct(g.comparison[c]),
        anchor: clean(g.anchor[c]),
        margin: pct((g.anchor[c].match(/([+-]?\d+(?:\.\d+)?)\s*%/) ?? [])[1] ?? ""),
        resetMonths: num(g.resetFreq[c]),
        nextReset: date(g.nextReset[c]),
        startDate: date(g.start[c]),
        firstPaymentDate: date(g.first[c]),
        endDate,
        months: asOfDate && to ? monthsBetween(asOfDate, to) : null,
        monthsDerived: true,
        baseIndex: num(g.baseIndex[c]),
        currentIndex: null,
        breakFee: num(g.breakFee[c]),
        breakFeeParts: fees,
      });
    }
  }

  if (!tranches.length) warnings.push("לא נמצאו משנים בפירוט ההלוואה.");

  const balance = tranches.reduce((s, t) => s + (t.balance ?? 0), 0);
  // The lender prints its own total; a gap means a column was misread.
  if (printedTotalBalance !== null && Math.abs(printedTotalBalance - tranches.reduce((s, t) => s + (t.payoff ?? 0), 0)) > 5) {
    const gap = Math.round(printedTotalBalance - tranches.reduce((s2, t) => s2 + (t.payoff ?? 0), 0));
    warnings.push(
      `סך היתרה לסילוק המודפס (${Math.round(printedTotalBalance).toLocaleString("en-US")} ₪) גבוה ב-${gap.toLocaleString("en-US")} ₪ מסכום המשנים — ככל הנראה עמלה תפעולית ברמת ההלוואה, שאינה משויכת למשנה.`
    );
  }

  const loan: BankLoan = {
    loanNumber,
    purpose,
    tranches,
    printed: {
      balance: printedTotalBalance,
      payoff: printedTotalBalance,
      monthly: printedTotalMonthly,
      breakFee: null,
      forecastRate: null,
    },
  };

  return {
    bank: "leumi",
    bankLabel: BANK_LABEL.leumi,
    template: "leumi/payoff-detail",
    statementDate: asOf,
    client: { name, idNumber: "", address: "" },
    accountNumber: loanNumber,
    loans: tranches.length ? [loan] : [],
    tranches,
    totals: {
      balance,
      payoff: tranches.reduce((s, t) => s + (t.payoff ?? 0), 0),
      monthly: tranches.reduce((s, t) => s + (t.monthly ?? 0), 0),
      breakFee: tranches.reduce((s, t) => s + (t.breakFee ?? 0), 0),
    },
    warnings,
  };
}

/** Debug hook: the grid as parsed, for validating label lookups. */
export function __leumiGrid(page: RawPage) {
  return readGrid(page);
}
