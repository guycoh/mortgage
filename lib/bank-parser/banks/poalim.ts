// משכן / בנק הפועלים — "הנדון: פרטי משכנתאות".
//
// Landscape, and transposed: field names run down a right-hand gutter and each
// מרכיב is a column. Values are right-aligned at fixed edges, so a column is
// identified by where its numbers END, not where they start — a wide date and a
// narrow "בנק" in the same column share nothing but their right edge.
//
// Labels sit two to six points above their values, and a label that wraps puts
// its second line BELOW them ("מועד צפוי לתשלום" / value / "אחרון / תאריך
// סילוק"). So a value row belongs to the nearest label ABOVE it, which reads
// both cases correctly where a nearest-by-distance rule would not.
//
// The awkward part is that this lender never prints a balance per מרכיב. Page 1
// gives קרן and הצמדת קרן per LOAN; pages 2+ give the terms per מרכיב. Splitting
// the balance evenly would be invention, so each tranche is amortised from its
// own original amount, rate and term, and the results are then scaled to add
// back to the printed loan balance. Anchored arithmetic rather than a guess —
// and still marked as apportioned.

import type { RawItem, RawPage } from "@/lib/credit-parser/types";
import {
  date,
  has,
  norm,
  num,
  pageLines,
  pct,
  signedPct,
  toDate,
  monthsBetween,
  type Line,
} from "../text";
import { clean } from "../fields";
import type { BankLoan, BankStatement, BankTranche, Linkage, RateKind } from "../types";
import { BANK_LABEL } from "../types";

/** Field labels on the transposed pages, in the lender's own wording. */
const L = {
  purpose: "מטרת הלוואה",
  original: "סכום הלוואה מקורי",
  start: "מועד ביצוע ההלוואה",
  first: "מועד התשלום הראשון",
  end: "מועד צפוי לתשלום",
  kind: "סוג הלוואה",
  amort: "שיטת פירעון ההלוואה",
  rateType: "סוג ריבית",
  basis: "בסיס לקביעת הריבית ותוספת",
  nominal: "שיעור ריבית נומינלית ליום מכתבנו זה",
  effAtStart: "שיעור ריבית מתואמת ליום הביצוע",
  effNow: "שיעור ריבית מתואמת ליום מכתבנו זה",
  resetFreq: "תדירות שינוי הריבית בחודשים",
  nextReset: "מועד שינוי הריבית הקרוב",
  linkage: "בסיס ההצמדה",
  baseIndex: "מדד / שער בסיס של ההלוואה",
  lastIndex: "מדד / שער אחרון ידוע",
  forecast: "שיעור ריבית הכוללת החזויה",
  comparison: "שיעור ריבית לצורכי השוואה",
};

const LOAN_RE = /\d{2}\/\d{2}\/\d{6}\/\d{3}/;

/** The right edge of a cell — the only coordinate a right-aligned column shares. */
const rightOf = (i: RawItem) => i.x + i.w;

/** Identical duplicate runs: this template emits every label twice. */
function dedupe(items: RawItem[]): RawItem[] {
  const seen = new Set<string>();
  return items.filter((i) => {
    const k = `${Math.round(i.x)}|${Math.round(i.y)}|${i.str}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* --------------------------------------------------------------- page 1 */

export interface LoanTotals {
  loanNumber: string;
  /** The bank account the loan is collected from, printed under its number. */
  accountNumber: string;
  principal: number | null;
  indexation: number | null;
  arrears: number | null;
  interest: number | null;
  breakFee: number | null;
  payoff: number | null;
  monthly: number | null;
}

/** "87374-544" on a line of its own — the account, never anything else here. */
const ACCOUNT_RE = /^\s*(\d{4,7}-\d{2,4})\s*$/;

/**
 * The summary table: one row per loan, nine figures in printed order.
 *
 * Positional rather than by column x, because the row is a simple ordered
 * sequence and the header spans three wrapped lines that no single y groups.
 *
 * The first column is headed "מספר הלוואה ומספר חשבון" and is two lines deep:
 * the loan number, then the account it is collected from on the line below. The
 * second line was skipped, so every Hapoalim statement imported with no account
 * number at all.
 */
function readTotals(lines: Line[]): LoanTotals[] {
  const out: LoanTotals[] = [];
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const m = line.text.match(LOAN_RE);
    if (!m) continue;
    const below = lines[li + 1];
    const account =
      below && line.y - below.y < 24 ? (below.text.match(ACCOUNT_RE) ?? [])[1] ?? "" : "";
    const nums = line.items
      .map((i) => i.str)
      .filter((s) => /[\d,]+\.\d{2}-?$/.test(s.trim()))
      .map((s) => num(s));
    if (nums.length < 9) continue;
    const [principal, indexation, arrears, interest, , , breakFee, payoff, monthly] = nums;
    out.push({
      loanNumber: m[0],
      accountNumber: account,
      principal,
      indexation,
      arrears,
      interest,
      breakFee,
      payoff,
      monthly,
    });
  }
  return out;
}

/* ------------------------------------------------------- transposed pages */

interface Grid {
  loanNumbers: string[];
  trancheNumbers: string[];
  /** label → one value per column. */
  rows: Map<string, string[]>;
}

/**
 * Read one transposed page.
 *
 * The header row carries the loan number once per column; the row under it
 * carries the מרכיב number. Everything after is a field.
 */
function readGrid(page: RawPage): Grid | null {
  const items = dedupe(page.items.filter((i) => i.str.trim()));
  const lines = pageLines({ ...page, items });

  const headerAt = lines.findIndex((l) => has(l.text, "מספר הלוואה ומספר מרכיב"));
  if (headerAt < 0) return null;

  // The label gutter starts where the header label sits; anything at or right
  // of it on any line is a field name.
  const labelX = Math.min(...lines[headerAt].items.map((i) => i.x)) - 4;

  const valueRows = lines
    .slice(headerAt + 1)
    .map((l) => ({ line: l, cells: l.items.filter((i) => rightOf(i) <= labelX + 4) }))
    .filter((r) => r.cells.length > 0);

  const loanRow = valueRows.find((r) => LOAN_RE.test(r.line.text));
  if (!loanRow) return null;

  // Columns are the right edges of the loan-number cells.
  const edges = loanRow.cells.map(rightOf).sort((a, b) => b - a);
  const cellFor = (i: RawItem) => {
    const r = rightOf(i);
    let best = -1;
    let bestD = Infinity;
    edges.forEach((e, k) => {
      const d = Math.abs(r - e);
      if (d < bestD && d <= 40) {
        bestD = d;
        best = k;
      }
    });
    return best;
  };

  const rowCells = (line: Line): string[] => {
    const out = edges.map(() => "");
    for (const it of line.items) {
      if (rightOf(it) > labelX + 4) continue;
      const c = cellFor(it);
      if (c >= 0) out[c] = clean(`${out[c]} ${it.str}`);
    }
    return out;
  };

  const loanNumbers = rowCells(loanRow.line);
  const after = valueRows.filter((r) => r.line.y < loanRow.line.y);
  const trancheNumbers = after.length ? rowCells(after[0].line) : edges.map(() => "");

  // Labels: lines whose content sits in the gutter.
  const labelLines = lines
    .slice(headerAt + 1)
    .map((l) => ({
      y: l.y,
      text: clean(l.items.filter((i) => rightOf(i) > labelX + 4).map((i) => i.str).join(" ")),
    }))
    .filter((l) => l.text);

  const rows = new Map<string, string[]>();
  // A value row belongs to the nearest label above it.
  for (const vr of after.slice(1)) {
    const owner = labelLines
      .filter((l) => l.y >= vr.line.y - 1)
      .sort((a, b) => a.y - b.y)[0];
    if (!owner) continue;
    const cells = rowCells(vr.line);
    const prev = rows.get(owner.text);
    // A field can span two value lines: this lender prints the "%" signs on one
    // line and the figures on the next, so keeping only the first would leave
    // every rate as a bare percent sign. Joining keeps both, and the numeric
    // readers ignore the decoration.
    rows.set(
      owner.text,
      prev ? prev.map((p, i) => clean([p, cells[i]].filter(Boolean).join(" "))) : cells
    );
  }

  return { loanNumbers, trancheNumbers, rows };
}

/** Look a field up in a grid, tolerating the lender's line wrapping. */
function field(grid: Grid, label: string): string[] {
  for (const [k, v] of Array.from(grid.rows)) if (has(k, label)) return v;
  return grid.loanNumbers.map(() => "");
}

function readRate(rateType: string, basis: string, linkage: string): { kind: RateKind; linkage: Linkage } {
  const t = norm(rateType);
  const b = norm(basis);
  const l = norm(linkage);
  // "P + 0.15%" is prime; "F + 3.00%" is the bond anchor and is not. Matched on
  // the raw cell rather than the normalised one, so the letter still stands
  // alone — and anchored to a word boundary so it cannot be caught mid-token.
  const kind: RateKind = /(^|\s)P\s*\+/i.test(basis) || /פריים/.test(b) || /פריים/.test(l)
    ? "prime"
    : /משתנה/.test(t)
      ? "variable"
      : /קבוע/.test(t)
        ? "fixed"
        : "unknown";
  const lk: Linkage = /לאצמוד/.test(l)
    ? "unlinked"
    : /מדדהמחיריםלצרכן|צמוד/.test(l)
      ? "linked"
      : /דולר|אירו|מט"ח/.test(l)
        ? "fx"
        : "unknown";
  return { kind, linkage: lk };
}

/**
 * Remaining principal on a שפיצר loan after `paid` payments.
 *
 * Used only to divide a printed loan balance between its tranches in proportion
 * to what each actually still owes — a tranche at 6.15% over 25 years has run
 * down far less than one at 1.51% over 14, and splitting by original amount
 * would misstate both.
 */
function outstanding(original: number, annualRate: number, termMonths: number, paid: number): number {
  if (!(original > 0) || !(termMonths > 0)) return 0;
  const n = Math.max(0, Math.min(termMonths, paid));
  const r = annualRate / 100 / 12;
  if (r <= 0) return original * (1 - n / termMonths);
  const g = Math.pow(1 + r, termMonths);
  const gn = Math.pow(1 + r, n);
  return original * ((g - gn) / (g - 1));
}

export function parsePoalim(pages: RawPage[], dataPages: number[]): BankStatement {
  const warnings: string[] = [];
  const first = pageLines(pages[0]);
  const headText = first.map((l) => l.text).join("\n");

  const stamped = headText.match(/תאריך:\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
  const asOf = headText.match(/נכון ליום\s*(\d{1,2}\/\d{1,2}\/\d{4})/);
  const idNum = headText.match(/מספר זהות:\s*(\d{7,9})/);
  // "לכבוד" shares its line with the date; the borrower is named on the line
  // that carries the ID.
  const nameLine = first.find((l) => has(l.text, "מספר זהות")) ?? first.find((l) => has(l.text, "לכבוד"));
  const statementDate = date(asOf?.[1] ?? stamped?.[1] ?? "");
  const asOfDate = toDate(statementDate);

  const totals = readTotals(first);
  if (!totals.length) warnings.push("לא נמצאה טבלת הסיכום בעמוד הראשון.");

  // Tranche terms, gathered across every transposed page.
  const byLoan = new Map<string, BankTranche[]>();
  for (const p of pages.filter((x) => dataPages.includes(x.page))) {
    const grid = readGrid(p);
    if (!grid) continue;

    const g = {
      purpose: field(grid, L.purpose),
      original: field(grid, L.original),
      start: field(grid, L.start),
      first: field(grid, L.first),
      end: field(grid, L.end),
      amort: field(grid, L.amort),
      rateType: field(grid, L.rateType),
      basis: field(grid, L.basis),
      nominal: field(grid, L.nominal),
      effNow: field(grid, L.effNow),
      effStart: field(grid, L.effAtStart),
      resetFreq: field(grid, L.resetFreq),
      nextReset: field(grid, L.nextReset),
      linkage: field(grid, L.linkage),
      baseIndex: field(grid, L.baseIndex),
      lastIndex: field(grid, L.lastIndex),
      forecast: field(grid, L.forecast),
      comparison: field(grid, L.comparison),
    };

    grid.loanNumbers.forEach((loanNumber, c) => {
      if (!loanNumber || !LOAN_RE.test(loanNumber)) return;
      const { kind, linkage } = readRate(g.rateType[c], g.basis[c], g.linkage[c]);
      const endDate = date(g.end[c]);
      const to = toDate(endDate);
      const t: BankTranche = {
        uid: `${loanNumber}#${grid.trancheNumbers[c] || c + 1}`,
        loanNumber,
        trancheNumber: grid.trancheNumbers[c] ?? "",
        rawTrack: clean(`${g.rateType[c]} ${g.linkage[c]}`),
        rateKind: kind,
        linkage,
        amortization: g.amort[c],
        purpose: g.purpose[c],
        principal: null,
        indexation: null,
        accruedInterest: null,
        arrears: null,
        balance: null,
        payoff: null,
        originalAmount: num(g.original[c]),
        monthly: null,
        rate: pct(g.nominal[c]),
        effectiveRate: pct(g.effNow[c]) ?? pct(g.effStart[c]),
        forecastRate: pct(g.forecast[c]),
        comparisonRate: pct(g.comparison[c]),
        // The template prints a bare "%" in the cell of any tranche that has no
        // anchor, and prepends one to those that do. Neither is the anchor.
        anchor: clean(g.basis[c].replace(/(^|\s)%(\s|$)/g, " ")),
        // "P + 0.15%" / "F + 3.00%" — the number after the sign is the margin,
        // and the sign is part of it: a tranche priced under its anchor prints
        // "P - 0.20%", and capturing only the digits turns the discount into a
        // premium of the same size.
        margin: signedPct((g.basis[c].match(/([+-]\s*[\d.]+)/) ?? [])[1] ?? ""),
        resetMonths: num(g.resetFreq[c]),
        nextReset: date(g.nextReset[c]),
        startDate: date(g.start[c]),
        firstPaymentDate: date(g.first[c]),
        endDate,
        months: asOfDate && to ? monthsBetween(asOfDate, to) : null,
        monthsDerived: true,
        baseIndex: num(g.baseIndex[c]),
        currentIndex: num(g.lastIndex[c]),
        breakFee: null,
        breakFeeParts: [],
      };
      const at = byLoan.get(loanNumber);
      if (at) at.push(t);
      else byLoan.set(loanNumber, [t]);
    });
  }

  /* ---- give each tranche its share of the loan's printed balance */
  const loans: BankLoan[] = [];
  for (const tot of totals) {
    const tranches = byLoan.get(tot.loanNumber) ?? [];
    const loanBalance = (tot.principal ?? 0) + (tot.indexation ?? 0);
    if (!tranches.length) {
      warnings.push(`הלוואה ${tot.loanNumber}: נמצאה בסיכום אך לא נמצאו מרכיבים בפירוט.`);
      continue;
    }

    const modelled = tranches.map((t) => {
      const startD = toDate(t.startDate);
      const paid = startD && asOfDate ? monthsBetween(startD, asOfDate) : 0;
      const term = startD && toDate(t.endDate) ? monthsBetween(startD, toDate(t.endDate)!) : 0;
      return outstanding(t.originalAmount ?? 0, t.rate ?? 0, term, paid);
    });
    const modelSum = modelled.reduce((s, v) => s + v, 0);

    tranches.forEach((t, i) => {
      const share = modelSum > 0 ? modelled[i] / modelSum : 1 / tranches.length;
      t.balance = Math.round(loanBalance * share);
      t.principal = Math.round((tot.principal ?? 0) * share);
      t.indexation = Math.round((tot.indexation ?? 0) * share);
      t.payoff = tot.payoff !== null ? Math.round(tot.payoff * share) : null;
      t.monthly = tot.monthly !== null ? Math.round(tot.monthly * share * 100) / 100 : null;
      t.breakFee = tot.breakFee !== null ? Math.round(tot.breakFee * share * 100) / 100 : null;
      t.arrears = i === 0 ? tot.arrears : null;
      t.accruedInterest = i === 0 ? tot.interest : null;
      t.balanceApportioned = tranches.length > 1;
    });

    if (tranches.length > 1) {
      warnings.push(
        `הלוואה ${tot.loanNumber}: הבנק אינו מפרט יתרה לכל מרכיב — היתרה חולקה בין ${tranches.length} המרכיבים לפי לוח הסילוקין של כל אחד, וסך החלקים שווה ליתרה המודפסת.`
      );
    }

    loans.push({
      loanNumber: tot.loanNumber,
      purpose: tranches[0]?.purpose ?? "",
      tranches,
      printed: {
        balance: loanBalance || null,
        payoff: tot.payoff,
        monthly: tot.monthly,
        breakFee: tot.breakFee,
        forecastRate: null,
        // Folded into the loan's printed עמלת פירעון מוקדם; not stated separately.
        operationalFee: null,
      },
    });
  }

  const tranches = loans.flatMap((l) => l.tranches);
  if (!tranches.length) warnings.push("לא נמצאו מרכיבי משכנתא בתדפיס.");

  return {
    bank: "poalim",
    bankLabel: BANK_LABEL.poalim,
    template: "poalim/mishkan-details",
    statementDate,
    client: {
      name: clean((nameLine?.text ?? "").replace(/לכבוד/g, "").replace(/מספר זהות.*$/, "").replace(/תאריך.*$/, "")),
      idNumber: idNum?.[1] ?? "",
      address: "",
    },
    // Every loan in one file is collected from the same account, so the first
    // one that states it names the statement.
    accountNumber: totals.find((t) => t.accountNumber)?.accountNumber ?? "",
    loans,
    tranches,
    totals: {
      balance: tranches.reduce((s, t) => s + (t.balance ?? 0), 0),
      payoff: loans.reduce((s, l) => s + (l.printed.payoff ?? 0), 0),
      monthly: loans.reduce((s, l) => s + (l.printed.monthly ?? 0), 0),
      breakFee: loans.reduce((s, l) => s + (l.printed.breakFee ?? 0), 0),
    },
    warnings,
  };
}
