// בנק ירושלים — "נתונים לסילוק מלא של הלוואה בתיק".
//
// One חלק per page, and two independent columns on it: נתונים כלליים on the
// right (terms) and נתונים לסילוק on the left (what it costs to close). Read as
// whole lines the two interleave — a label from one column lands beside a value
// from the other — so the page is split by x before anything is looked up.
//
// The split is clean: the payoff column's labels are right-aligned at x≈244 and
// its figures sit at x≈66-112, while the general column's labels reach x≈480
// with values from x≈298. Nothing crosses x≈270.
//
// This lender also puts the whole track description in one string —
// "משתנה לא צמודה כל 2 שנים על בסיס אג"ח ממשלתי" — which is the richest wording
// of the four and carries the reset interval that the others print as a number.

import type { RawItem, RawPage } from "@/lib/credit-parser/types";
import { date, has, norm, num, pageLines, pct, toDate, monthsBetween } from "../text";
import { clean } from "../fields";
import type { BankLoan, BankStatement, BankTranche, Linkage, RateKind } from "../types";
import { BANK_LABEL } from "../types";

/** Everything left of this is the payoff column. */
const SPLIT_X = 270;

const GENERAL = [
  "שם החלק בהלוואה",
  "סוג סילוק",
  "סוג ההלוואה",
  "שיטת פרעון חלק זה בהלוואה",
  "סכום חלק זה בעת הביצוע",
  "תאריך הביצוע",
  "תאריך חיוב ראשון",
  "תאריך סיום חלק זה של ההלוואה",
  "סוג הריבית",
  "שיעור הריבית בחלק זה",
  "שיעור הריבית המתואמת",
  "סוג ההצמדה",
  "מדד הבסיס לחישוב ההצמדה",
  "סכום החיוב החודשי בגין חלק זה",
  "שיעור ריבית ממוצעת במועד הסילוק",
  "הריבית הכוללת החזויה",
  "שיעור הריבית לצרכי השוואה",
];

const PAYOFF = [
  "יתרת הקרן",
  "הפרשי הצמדה על הקרן",
  "הפרשי הצמדה על הריבית",
  "ריבית",
  "סיכום ביניים",
  "עמלת אי הודעה",
  "פיצוי מדד",
  "הפרשי היוון",
  "סה\"כ עמלת פרעון מוקדם",
  "סכום הסילוק",
];

/**
 * The track, from the lender's own sentence.
 *
 * "ריבית קבועה צמודה למדד, שפיצר" and "משתנה לא צמודה כל 2 שנים על בסיס אג"ח
 * ממשלתי" carry rate kind, linkage and reset interval in one line, so this is
 * the primary source and the separate סוג הריבית / סוג ההצמדה fields only fill
 * what it leaves out.
 */
function readTrack(
  name: string,
  rateType: string,
  linkageField: string
): { kind: RateKind; linkage: Linkage; resetMonths: number | null } {
  const n = norm(name);
  const t = norm(rateType);
  const l = norm(linkageField);

  const kind: RateKind = /פריים/.test(n) || /פריים/.test(t)
    ? "prime"
    : /משתנה/.test(n) || /משתנה/.test(t)
      ? "variable"
      : /קבוע/.test(n) || /קבוע/.test(t)
        ? "fixed"
        : "unknown";

  // "לא צמוד" has to be tested before the "צמוד" it contains.
  const src = `${n}${l}`;
  const linkage: Linkage = /לאצמוד/.test(src)
    ? "unlinked"
    : /צמודמדד|צמודהלמדד|צמוד/.test(src)
      ? "linked"
      : /דולר|אירו|מט"ח/.test(src)
        ? "fx"
        : "unknown";

  // "כל 2 שנים" / "כל 5 שנים" — the reset interval, stated in years.
  const years = name.match(/כל\s*(\d+)\s*שנ/);
  const months = name.match(/כל\s*(\d+)\s*חוד/);
  const resetMonths = years
    ? Number(years[1]) * 12
    : months
      ? Number(months[1])
      : kind === "prime"
        ? 1
        : null;

  return { kind, linkage, resetMonths };
}


/**
 * A value beside its label, found by coordinate rather than by line.
 *
 * This template sets label and value on baselines a few points apart —
 * "יתרת הקרן:" at y 583.7, its figure at 579.2 — which no fixed line-grouping
 * survives: any bucket width puts some pair either side of a boundary. Rows are
 * about 14 points apart, so a window of 6 catches the pair and cannot reach the
 * neighbouring row.
 */
function beside(items: RawItem[], phrase: string, dy = 6): string {
  const label = items.find((i) => has(i.str, phrase));
  if (!label) return "";

  const pick = (lo: number, hi: number, leftOnly: boolean) => {
    const near = items.filter(
      (i) =>
        i !== label &&
        (!leftOnly || i.x + i.w <= label.x + 2) &&
        label.y - i.y >= lo &&
        label.y - i.y <= hi
    );
    if (!near.length) return "";
    // Take only the row closest to the label, not everything in the window.
    // Two fields can sit four points apart here — "סכום החיוב החודשי" and
    // "שיעור ריבית ממוצעת" — and a window wide enough to catch a value offset
    // from its own label also reaches the next field's value. Reading both gave
    // the monthly payment as 3.48, which is the average rate.
    // The unit sits on the label's own baseline while the figure is a few points
    // below it, so anchoring on the nearest item of any kind picks "ש"ח" and
    // then discards the number. Units carry no content and cannot anchor.
    const isUnit = (t: string) => /^\s*(ש"ח|ש״ח|%|נקודות)\s*$/.test(t);
    const anchors = near.filter((i) => !isUnit(i.str));
    if (!anchors.length) return "";
    const anchorY = anchors.reduce(
      (best, i) => (Math.abs(i.y - label.y) < Math.abs(best - label.y) ? i.y : best),
      anchors[0].y
    );
    return clean(
      near
        .filter((i) => Math.abs(i.y - anchorY) <= 2)
        .sort((a, b) => b.x - a.x)
        .map((i) => i.str)
        .join(" ")
    );
  };

  // Beside it first: the common case, a couple of points off the same baseline.
  const same = pick(-dy, dy, true);
  if (same) return same;

  // Some cells put the value on the line BELOW the label instead — the track
  // description sits about sixteen points down, wider than its own label. Rows
  // are roughly fourteen apart, so this reaches exactly one line further and no
  // constraint on x, because the value is wider than the label above it.
  return pick(dy, 20, false);
}

/**
 * The file-level table on page one: four labels on one line, their figures on
 * the next, matched by column rather than by order in the text.
 */
function headerFigure(items: RawItem[], phrase: string): number | null {
  const label = items.find((i) => has(i.str, phrase));
  if (!label) return null;
  const centre = label.x + label.w / 2;
  const below = items
    .filter((i) => i.y < label.y - 2 && label.y - i.y < 26 && /[\d,]+\.\d{2}/.test(i.str))
    .sort((a, b) => Math.abs(a.x + a.w / 2 - centre) - Math.abs(b.x + b.w / 2 - centre));
  return below.length ? num(below[0].str) : null;
}

export function parseJerusalem(pages: RawPage[], dataPages: number[]): BankStatement {
  const warnings: string[] = [];
  const head = pageLines(pages[0], 5);
  const headText = head.map((l) => l.text).join("\n");

  const fileNo = headText.match(/מס'\s*תיק\s*:?\s*(\d{6,12})/) ?? headText.match(/(\d{9})\s*$/m);
  const asOf = date(
    (headText.match(/נכונים לתחילת יום עסקים\s*(\d{1,2}\/\d{1,2}\/\d{4})/) ?? [])[1] ??
      (headText.match(/(\d{4})\s*\/\s*(\d{2})\s*\/\s*(\d{2})/) ?? []).slice(1).reverse().join("/") ??
      ""
  );
  const asOfDate = toDate(asOf);

  // "לכבוד" then one line per borrower.
  const atFor = head.findIndex((l) => has(l.text, "לכבוד"));
  const names: string[] = [];
  for (let i = atFor + 1; i < head.length && i <= atFor + 3; i++) {
    const t = clean(head[i].text);
    if (!t || has(t, "הנדון") || /\d{4}/.test(t)) break;
    names.push(t);
  }

  const purpose = clean((headText.match(/מטרת הלוואה\s*(.+)/) ?? [])[1] ?? "");
  const loanNumber = fileNo?.[1] ?? "";

  const tranches: BankTranche[] = [];

  dataPages.forEach((pageNo, idx) => {
    const page = pages.find((p) => p.page === pageNo);
    if (!page) return;

    // Split first: whole lines interleave the two columns.
    const left = { ...page, items: page.items.filter((i: RawItem) => i.x < SPLIT_X) };
    const right = { ...page, items: page.items.filter((i: RawItem) => i.x >= SPLIT_X) };
    const G = (k: string) => beside(right.items, k);
    const P = (k: string) => beside(left.items, k);

    const principal = num(P("יתרת הקרן"));
    const indexation = num(P("הפרשי הצמדה על הקרן"));
    // "סכום הסילוק" / "בחלק זה של ההלוואה:" — the figure is beside the second line.
    const payoff = num(P("בחלק זה של ההלוואה")) ?? num(P("סכום הסילוק"));
    const balance = (principal ?? 0) + (indexation ?? 0);
    if (!balance || balance <= 0) return;

    // The part-number box printed beside this cell leaves stray "0 0" runs in
    // front of the description.
    const trackName = clean(G("שם החלק בהלוואה").replace(/^[\d\s]+/, ""));
    const { kind, linkage, resetMonths } = readTrack(trackName, G("סוג הריבית"), G("סוג ההצמדה"));
    const endDate = date(G("תאריך סיום חלק זה של ההלוואה"));
    const to = toDate(endDate);

    const fees = [
      { label: "עמלת אי הודעה", amount: num(P("עמלת אי הודעה")) },
      { label: "פיצוי מדד", amount: num(P("פיצוי מדד")) },
      { label: "הפרשי היוון", amount: num(P("הפרשי היוון")) },
    ].filter((f): f is { label: string; amount: number } => f.amount !== null && f.amount > 0);

    tranches.push({
      uid: `${loanNumber}#${idx + 1}`,
      loanNumber,
      trancheNumber: String(idx + 1),
      rawTrack: trackName,
      rateKind: kind,
      linkage,
      amortization: G("שיטת פרעון חלק זה בהלוואה"),
      purpose,
      principal,
      indexation,
      accruedInterest: num(P("ריבית")),
      arrears: null,
      balance,
      payoff,
      originalAmount: num(G("סכום חלק זה בעת הביצוע")),
      monthly: num(G("סכום החיוב החודשי בגין חלק זה")) ?? num(G("החיוב החודשי בגין חלק זה")),
      rate: pct(G("שיעור הריבית בחלק זה")),
      effectiveRate: pct(G("שיעור הריבית המתואמת")),
      forecastRate: pct(G("הריבית הכוללת החזויה")),
      comparisonRate: pct(G("שיעור הריבית לצרכי השוואה")),
      anchor: clean(trackName.replace(/^.*?על בסיס\s*/, "")) || "",
      margin: null,
      resetMonths,
      nextReset: "",
      startDate: date(G("תאריך הביצוע")),
      firstPaymentDate: date(G("תאריך חיוב ראשון")),
      endDate,
      months: asOfDate && to ? monthsBetween(asOfDate, to) : null,
      monthsDerived: true,
      baseIndex: num(G("מדד הבסיס לחישוב ההצמדה")),
      currentIndex: null,
      breakFee: num(P('סה"כ עמלת פרעון מוקדם')),
      breakFeeParts: fees,
    });
  });

  if (!tranches.length) warnings.push("לא נמצאו חלקי הלוואה בתדפיס.");
  // The bank prints the whole-file position on page 1; a gap means a חלק page
  // was missed rather than that the arithmetic is wrong.
  const printedPayoff = headerFigure(pages[0].items, "היתרה לסילוק בתיק");
  const sumPayoff = tranches.reduce((s, t) => s + (t.payoff ?? 0), 0);
  if (printedPayoff && Math.abs(printedPayoff - sumPayoff) > 5) {
    warnings.push(
      `היתרה לסילוק בתיק המודפסת (${Math.round(printedPayoff).toLocaleString("en-US")} ₪) שונה מסכום החלקים (${Math.round(sumPayoff).toLocaleString("en-US")} ₪) — ייתכן שחלק מהעמודים לא נקראו.`
    );
  }

  const loan: BankLoan = {
    loanNumber,
    purpose,
    tranches,
    printed: {
      balance: null,
      payoff: printedPayoff,
      monthly: headerFigure(pages[0].items, "ההחזר החודשי"),
      breakFee: null,
      forecastRate: null,
    },
  };

  return {
    bank: "jerusalem",
    bankLabel: BANK_LABEL.jerusalem,
    template: "jerusalem/full-payoff",
    statementDate: asOf,
    client: { name: names.join(", "), idNumber: "", address: "" },
    accountNumber: loanNumber,
    loans: tranches.length ? [loan] : [],
    tranches,
    totals: {
      balance: tranches.reduce((s, t) => s + (t.balance ?? 0), 0),
      payoff: sumPayoff,
      monthly: tranches.reduce((s, t) => s + (t.monthly ?? 0), 0),
      breakFee: tranches.reduce((s, t) => s + (t.breakFee ?? 0), 0),
    },
    warnings,
  };
}
