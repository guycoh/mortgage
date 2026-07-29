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
  // Currency first: "צמוד אירו" contains צמוד and would otherwise be filed as
  // index-linked, which is a different risk and a different track entirely.
  const linkage: Linkage = /דולר|אירו|מט"ח|יורו/.test(src)
    ? "fx"
    : /לאצמוד/.test(src)
      ? "unlinked"
      : /צמודמדד|צמודהלמדד|צמוד/.test(src)
        ? "linked"
        : "unknown";

  // "כל 2 שנים" / "כל 5 שנים" — the reset interval, stated in years. Half-years
  // are real ("כל 2.5 שנים"), so the number is not assumed to be whole.
  const years = name.match(/כל\s*(\d+(?:\.\d+)?)\s*שנ/);
  // "כל 3 חודשים", and the abbreviated form this template uses on its foreign-
  // currency tranches — "עדכ':3 חודשים". Same fact, written as an update note
  // rather than as a period, and missed entirely when only כל is looked for.
  const months = name.match(/(?:כל|עדכ(?:ון)?['׳’]?\s*:?)\s*(\d+)\s*חוד/);
  const resetMonths = years
    ? Math.round(Number(years[1]) * 12)
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

  // Some cells are a single run holding both: "סכום החיוב החודשי בגין חלק זה:
  // 637.81". Nothing sits beside them, so looking outward reaches into the next
  // row and returns its value instead — this field was coming back as the
  // average interest rate.
  // The separator that follows a label is not a value: "יתרת הקרן:" leaves a
  // bare colon behind, which is truthy and short-circuited every other field.
  const inline = clean(afterPhrase(label.str, phrase)).replace(/^[:\s]+/, "");
  if (/[\d֐-׿]/.test(inline)) return inline;

  // Candidates start LEFT of the label's left edge, not left of its right edge.
  // The track description is wider than its own label and overhangs it, so a
  // right-edge test rejected the value and forced a looser rule that then let
  // the part-number box's stray digits in.
  const pick = (lo: number, hi: number) => {
    const near = items.filter(
      (i) => i !== label && i.x < label.x - 1 && label.y - i.y >= lo && label.y - i.y <= hi
    );
    if (!near.length) return "";
    // "ש"ח" and "%" sit on the label's own baseline while the figure is a few
    // points below, so a unit must never anchor the row.
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

  // Beside it first, then one row below — the track description sits about
  // sixteen points down from its label.
  return pick(-dy, dy) || pick(dy, 20);
}

/**
 * Same lookup, but the label must BE the phrase rather than merely contain it.
 *
 * This template names the same field two ways depending on the rate type — a
 * fixed tranche says "שיעור הריבית בחלק זה:", a variable one just
 * "שיעור הריבית:" — and a loose match on the shorter form would hit
 * "שיעור הריבית לצרכי השוואה" or "שיעור הריבית המתואמת" first and read the
 * wrong number.
 */
function besideExact(items: RawItem[], phrase: string, dy = 6): string {
  const want = norm(phrase).replace(/:$/, "");
  const label = items.find((i) => {
    const n = norm(i.str).replace(/[:*]+$/, "");
    return n === want;
  });
  if (!label) return "";
  return beside([label, ...items.filter((i) => i !== label)], i0(label.str), dy);
}

/** The phrase a run spells, for feeding back into `beside`. */
const i0 = (s2: string) => s2;

const isUnit = (t: string) => /^\s*(ש"ח|ש״ח|%|נקודות)\s*$/.test(t);

/** Whatever a run says after the label it starts with. */
function afterPhrase(text: string, phrase: string): string {
  const n = norm(text);
  const p = norm(phrase);
  const at = n.indexOf(p);
  if (at < 0) return "";
  // Walk the original string, counting only the characters norm() keeps, so the
  // cut lands in the right place despite the spaces it removed.
  let kept = 0;
  for (let i = 0; i < text.length; i++) {
    if (norm(text[i])) kept += 1;
    if (kept === at + p.length) return text.slice(i + 1);
  }
  return "";
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
      rate:
        pct(besideExact(right.items, "שיעור הריבית בחלק זה:")) ??
        pct(besideExact(right.items, "שיעור הריבית:")),
      effectiveRate:
        pct(besideExact(right.items, "שיעור הריבית המתואמת:")) ??
        pct(besideExact(right.items, "המתואמת:")),
      forecastRate: pct(G("הריבית הכוללת החזויה")),
      comparisonRate: pct(G("שיעור הריבית לצרכי השוואה")),
      // Only what follows "על בסיס" is an anchor. Where the sentence has no such
      // clause it is describing the track and nothing else — returning the whole
      // sentence put "לא צמוד, ריבית פריים, שפיצר" in the עוגן column.
      anchor: clean((trackName.match(/על בסיס\s*(.+)$/) ?? ["", ""])[1]),
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
  // A small gap is the file-level operational fee, which this lender adds to the
  // whole-file position without attributing it to any one חלק. A large one means
  // a חלק page really was missed, and those are different problems.
  if (printedPayoff) {
    const gap = printedPayoff - sumPayoff;
    if (Math.abs(gap) > Math.max(200, printedPayoff * 0.005)) {
      warnings.push(
        `היתרה לסילוק בתיק המודפסת (${Math.round(printedPayoff).toLocaleString("en-US")} ₪) שונה מסכום החלקים ב-${Math.round(gap).toLocaleString("en-US")} ₪ — ייתכן שלא כל עמודי החלקים נקראו.`
      );
    } else if (Math.abs(gap) > 1) {
      warnings.push(
        `היתרה לסילוק בתיק כוללת עמלה תפעולית של ${Math.round(gap).toLocaleString("en-US")} ₪ ברמת התיק, שאינה משויכת לחלק.`
      );
    }
  }

  // This lender names the fee only in its explanatory pages ("תשלום חד פעמי שלא
  // יעלה על ₪ 60 … בגין העלות התפעולית"), never as a field. The residual between
  // its printed file payoff and the sum of the parts IS that fee, and the cap
  // stated in the document is what makes the identification safe rather than a
  // guess: anything larger is a missed page and is reported as one.
  const residual = printedPayoff ? Math.round((printedPayoff - sumPayoff) * 100) / 100 : 0;
  const operationalFee = residual > 0 && residual <= 200 ? residual : null;

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
      operationalFee,
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
      breakFee: tranches.reduce((s, t) => s + (t.breakFee ?? 0), 0) + (operationalFee ?? 0),
    },
    warnings,
  };
}
