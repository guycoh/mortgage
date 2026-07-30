// Discount and Mercantile — "תדפיס נתוני הלוואות בחשבון משכנתא".
//
// Both banks run the same core banking system and print a byte-identical form;
// only the letterhead differs. One parser, two lenders.
//
// The form gives a block per loan, headed "מספר הלוואה : 0-026-0691-00-116105",
// and splits each block into two label:value columns side by side — פרטים כללים
// on the right, פרטי סילוק on the left. Every line therefore carries two
// unrelated fields, which is why values have to be bounded by the next label
// rather than by the end of the line.
//
// Discount does not subdivide a loan: each loan number already has one rate and
// one linkage, so a loan IS a tranche here. That makes it the only one of the
// four where the tranche list needs no column geometry at all.
//
// It is also the only template that prints יתרת תקופה בחודשים — remaining term —
// outright, so it is the one place we do not have to derive it.

import type { RawPage } from "@/lib/credit-parser/types";
import { date, has, norm, num, pageLines, pct, type Line } from "../text";
import { clean, one, readFields } from "../fields";
import type { BankId, BankLoan, BankStatement, BankTranche, Linkage, RateKind } from "../types";
import { BANK_LABEL } from "../types";

/** Right column — the loan's terms. */
const GENERAL = [
  "סוג הלוואה",
  "סוג ריבית",
  "שיטת פרעון",
  "תאריך מתן הלוואה",
  "סכום מקורי",
  "מועד תשלום ראשון",
  "מועד תשלום אחרון",
  "שיעור ריבית שנתית",
  "בסיס לקביעת ריבית",
  "ריבית בסיס)עוגן(מקורית",
  "ריבית בסיס)עוגן(עדכנית",
  "שיעור תוספת/הפחתה",
  "ריבית מתואמת מקורית",
  "ריבית מתואמת עדכנית",
  "תדירות שינוי ריבית",
  "תאריך שינוי קרוב",
  "מטרת הלוואה",
  "ביטוח EMI",
  "שיעור ריבית כוללת חזויה",
  "שיעור ריבית לצרכי השוואה",
];

/** Left column — what it takes to close it. */
const PAYOFF = [
  "מדד בסיס",
  "מדד נוכחי ידוע",
  "ריבית ממוצעת",
  "יתרת תקופה בחודשים",
  "חיוב אחרון בהלוואה",
  "יתרת קרן",
  "יתרת הצמדת קרן",
  "ריבית צבורה",
  "הצמדת ריבית",
  "יתרת פיגור",
  "ריבית פיגורים",
  "סה\"כ יתרה",
  "עמלה תיפעולית",
  "עמלת מדד ממוצע",
  "עמלת פערי ריבית",
  "עמלת העדר הודעה מוקדמת",
  "סה\"כ עמלת פרעון מוקדם",
  "סה\"כ יתרה לסילוק",
];

const ALL = [...GENERAL, ...PAYOFF];

/**
 * "משתנה,צמוד מדד" — the one field carrying both facts.
 *
 * Prime is not spelled "פריים" here; it shows up as an anchor of "ר.פריים" or a
 * base description mentioning it, so the anchor has to be consulted too.
 */
function readRate(sugRibit: string, basis: string): { kind: RateKind; linkage: Linkage } {
  const s = norm(sugRibit);
  const b = norm(basis);
  const prime = /פריים/.test(s) || /פריים/.test(b);
  const kind: RateKind = prime
    ? "prime"
    : /משתנה/.test(s)
      ? "variable"
      : /קבוע/.test(s)
        ? "fixed"
        : "unknown";
  const linkage: Linkage = /לאצמוד/.test(s)
    ? "unlinked"
    : /צמודמדד|צמוד/.test(s)
      ? "linked"
      : /מט"ח|דולר|אירו/.test(s)
        ? "fx"
        : "unknown";
  return { kind, linkage };
}

/** Split the data pages into one block of lines per loan. */
function loanBlocks(lines: Line[]): { loanNumber: string; lines: Line[] }[] {
  const marks: { i: number; loanNumber: string }[] = [];
  lines.forEach((l, i) => {
    if (!has(l.text, "מספר") || !has(l.text, "הלוואה")) return;
    // "מספר | 0-026-0691-00-115559 : הלוואה" — the number is the only thing on
    // the line shaped like a loan id.
    const m = l.text.match(/\d-\d{3}-\d{3,4}-\d{2}-\d{4,7}/);
    if (m) marks.push({ i, loanNumber: m[0] });
  });
  return marks.map((mk, n) => ({
    loanNumber: mk.loanNumber,
    lines: lines.slice(mk.i, n + 1 < marks.length ? marks[n + 1].i : lines.length),
  }));
}

/**
 * The borrower's name.
 *
 * Discount addresses the letter ("לכבוד ..."); Mercantile just prints the name
 * on its own line above the ת"ז. Working backwards from the ת"ז finds it in both,
 * and skipping lines that carry dates or branch numbers keeps the letterhead out.
 */
function clientName(head: Line[]): string {
  const at = head.findIndex((l) => /ת"ז|מספר זהות/.test(l.text));
  if (at > 0) {
    for (let i = at - 1; i >= 0 && i >= at - 4; i--) {
      const t = clean(head[i].text.replace(/לכבוד/g, ""));
      if (t && /[֐-׿]/.test(t) && !/\d{3}|תאריך|שאילתה|סניף|טלפון|פקס|הדפסה|לוגו/.test(t)) {
        return t;
      }
    }
  }
  const l = head.find((x) => has(x.text, "לכבוד"));
  return clean((l?.text ?? "").replace(/לכבוד/g, ""));
}

export function parseDiscount(
  pages: RawPage[],
  bank: BankId,
  dataPages: number[]
): BankStatement {
  const warnings: string[] = [];
  const all = pages.map((p) => pageLines(p));
  const head = all[0] ?? [];
  const headText = head.map((l) => l.text).join("\n");

  const idMatch = headText.match(/ת"ז\s*:?\s*(\d{7,9})/) ?? headText.match(/(\d{9})/);
  const acct = headText.match(/משכנתא\s*(?:מספר)?\s*(\d{4}-\d{6,12})/);
  const stamped = headText.match(/תאריך\s*הדפסה\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/);

  // Only the data pages, concatenated — the fee boilerplate uses some of the
  // same words and would otherwise contribute phantom fields.
  const body = pages
    .filter((p) => dataPages.includes(p.page))
    .flatMap((p) => pageLines(p));

  const loans: BankLoan[] = [];
  for (const block of loanBlocks(body)) {
    const f = readFields(block.lines, ALL);
    const g = (k: string) => one(f, k);

    const principal = num(g("יתרת קרן"));
    const indexation = num(g("יתרת הצמדת קרן"));
    const total = num(g('סה"כ יתרה'));
    const payoff = num(g('סה"כ יתרה לסילוק')) ?? total;

    const balance =
      principal !== null || indexation !== null
        ? (principal ?? 0) + (indexation ?? 0)
        : total;

    // A settled loan is still printed, with every figure at zero. Carrying it
    // into a mix would add a tranche the client does not have.
    if (!balance || balance <= 0) continue;

    const { kind, linkage } = readRate(g("סוג ריבית"), g("בסיס לקביעת ריבית"));
    const months = num(g("יתרת תקופה בחודשים"));

    const feeParts = [
      { label: "עמלה תיפעולית", amount: num(g("עמלה תיפעולית")) },
      { label: "עמלת מדד ממוצע", amount: num(g("עמלת מדד ממוצע")) },
      { label: "עמלת פערי ריבית", amount: num(g("עמלת פערי ריבית")) },
      { label: "עמלת העדר הודעה מוקדמת", amount: num(g("עמלת העדר הודעה מוקדמת")) },
    ].filter((p): p is { label: string; amount: number } => p.amount !== null && p.amount > 0);

    const tranche: BankTranche = {
      uid: block.loanNumber,
      loanNumber: block.loanNumber,
      trancheNumber: "",
      rawTrack: g("סוג ריבית"),
      rateKind: kind,
      linkage,
      amortization: g("שיטת פרעון"),
      purpose: g("מטרת הלוואה"),
      principal,
      indexation,
      accruedInterest: num(g("ריבית צבורה")),
      arrears: (num(g("יתרת פיגור")) ?? 0) + (num(g("ריבית פיגורים")) ?? 0) || null,
      balance,
      payoff,
      originalAmount: num(g("סכום מקורי")),
      monthly: num(g("חיוב אחרון בהלוואה")),
      rate: pct(g("שיעור ריבית שנתית")),
      effectiveRate: pct(g("ריבית מתואמת עדכנית")) ?? pct(g("ריבית מתואמת מקורית")),
      forecastRate: pct(g("שיעור ריבית כוללת חזויה")),
      comparisonRate: pct(g("שיעור ריבית לצרכי השוואה")),
      anchor: g("בסיס לקביעת ריבית"),
      // The current level of the anchor, not the rate the borrower pays. This is
      // the only template that prints it, and it is what makes the row's rate
      // legible: 4.09% = an anchor of 2.89% plus a margin of 1.20%.
      anchorRate: pct(g("ריבית בסיס)עוגן(עדכנית")) ?? pct(g("ריבית בסיס)עוגן(מקורית")),
      margin: pct(g("שיעור תוספת/הפחתה")),
      resetMonths: num(g("תדירות שינוי ריבית")),
      nextReset: date(g("תאריך שינוי קרוב")),
      startDate: date(g("תאריך מתן הלוואה")),
      firstPaymentDate: date(g("מועד תשלום ראשון")),
      endDate: date(g("מועד תשלום אחרון")),
      months,
      monthsDerived: false,
      baseIndex: num(g("מדד בסיס")),
      currentIndex: num(g("מדד נוכחי ידוע")),
      breakFee: num(g('סה"כ עמלת פרעון מוקדם')),
      breakFeeParts: feeParts,
    };

    if (months === null) warnings.push(`הלוואה ${block.loanNumber}: לא נמצאה יתרת תקופה בחודשים`);
    if (tranche.rate === null) warnings.push(`הלוואה ${block.loanNumber}: לא נמצא שיעור ריבית`);

    loans.push({
      loanNumber: block.loanNumber,
      purpose: tranche.purpose,
      tranches: [tranche],
      printed: {
        balance,
        payoff,
        monthly: tranche.monthly,
        breakFee: tranche.breakFee,
        forecastRate: tranche.forecastRate,
        // This template itemises it per loan, so there is nothing to reconcile.
        operationalFee: num(g("עמלה תיפעולית")),
      },
    });
  }

  const tranches = loans.flatMap((l) => l.tranches);
  if (!tranches.length) warnings.push("לא נמצאו הלוואות פעילות עם יתרה בתדפיס.");

  return {
    bank,
    bankLabel: BANK_LABEL[bank],
    template: `discount-core/${bank}`,
    statementDate: date(stamped?.[1] ?? ""),
    client: {
      name: clientName(head),
      idNumber: idMatch?.[1] ?? "",
      address: "",
    },
    accountNumber: acct?.[1] ?? "",
    loans,
    tranches,
    totals: {
      balance: tranches.reduce((s, t) => s + (t.balance ?? 0), 0),
      payoff: tranches.reduce((s, t) => s + (t.payoff ?? 0), 0),
      monthly: tranches.reduce((s, t) => s + (t.monthly ?? 0), 0),
      breakFee: tranches.reduce((s, t) => s + (t.breakFee ?? 0), 0),
    },
    warnings,
  };
}
