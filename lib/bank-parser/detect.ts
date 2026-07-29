// Which lender printed this, and where in the file the data actually is.
//
// Detection runs on markers that are structural rather than cosmetic: the
// wording of a regulated form's heading, a service number in a footer, the name
// of the tranche column. Logos are images and never reach the text layer, and
// letterhead prose gets reworded — but "הנדון: פירוט יתרות ועמלות פירעון מוקדם"
// is the name of a form and does not drift.
//
// Everything is matched on whitespace-stripped, reading-order text, because a
// heading can be split across glyph runs at any letter.
//
// Two of these files are mostly boilerplate: Leumi ships four pages of fee
// explanation before the numbers, and one sample turned out to be two complete
// statements concatenated. So detection also reports which pages carry data and
// how many statements are in the file — parsing two mortgages as one would add
// their balances together.

import type { RawPage } from "@/lib/credit-parser/types";
import { has, pageText } from "./text";
import type { BankId } from "./types";

export interface Detection {
  bank: BankId;
  template: string;
  dataPages: number[];
  documents: { from: number; to: number; dataPages: number[] }[];
  confidence: number;
}

interface Rule {
  bank: BankId;
  template: string;
  /** Every one must appear somewhere in the file. */
  must: string[];
  /** Each raises confidence. */
  hints?: string[];
  /** Marks a page that carries tranche data. */
  dataPage: string[];
  /** Marks the first page of a statement, for splitting concatenated files. */
  docStart?: string;
}

/**
 * Mercantile prints on the same core-banking template as Discount, down to the
 * field labels, so it must be tested first: its own name is the only thing that
 * tells them apart.
 */
const RULES: Rule[] = [
  {
    bank: "mercantile",
    template: "discount-core/mercantile",
    must: ["מרכנתיל", "נתוני הלוואות"],
    hints: ["שאילתה", "פרטי סילוק", "יתרת תקופה בחודשים"],
    dataPage: ["פרטי סילוק"],
    docStart: "תדפיס נתוני ההלוואות",
  },
  {
    bank: "discount",
    template: "discount-core/discount",
    must: ["דיסקונט", "נתוני הלוואות"],
    hints: ["פרטי משכנתא כולל יתרה לסילוק", "פרטי סילוק", "יתרת תקופה בחודשים"],
    dataPage: ["פרטי סילוק"],
    docStart: "פרטי משכנתא כולל יתרה לסילוק",
  },
  {
    bank: "leumi",
    template: "leumi/payoff-detail",
    must: ["לאומי למשכנתאות"],
    hints: ["פירוט יתרות ועמלות פירעון מוקדם", "מספר משנה", "שיטת פירעון ההלוואה"],
    // The fee-explanation pages also say משנה; the grid is the only thing that
    // carries the column header.
    dataPage: ["מספר משנה"],
    docStart: "שאלות ותשובות בנושא ביצוע פרעון מלא",
  },
  {
    bank: "poalim",
    template: "poalim/mishkan-details",
    must: ["פרטי משכנתאות"],
    hints: ["בנק הפועלים", "משכן", "מספר הלוואה ומספר מרכיב", "*2401"],
    dataPage: ["מספר הלוואה ומספר מרכיב"],
    docStart: "הנדון: פרטי משכנתאות",
  },
  {
    bank: "jerusalem",
    template: "jerusalem/full-payoff",
    must: ["נתונים לסילוק מלא של הלוואה"],
    hints: ["8860", "שם החלק בהלוואה", "03-5656621", "הופק באינטרנט"],
    dataPage: ["שם החלק בהלוואה"],
    docStart: "נתונים לסילוק מלא של הלוואה בתיק",
  },
];

/**
 * Identify the lender and locate the data.
 *
 * Returns null rather than a best guess. A wrong template does not fail loudly
 * — it reads the right-looking numbers out of the wrong cells and produces a
 * mortgage that looks plausible and is not the client's.
 */
export function detectBank(pages: RawPage[]): Detection | null {
  const perPage = pages.map((p) => pageText(p));
  const whole = perPage.join("\n");

  for (const rule of RULES) {
    if (!rule.must.every((m) => has(whole, m))) continue;

    const dataPages = pages
      .filter((_, i) => rule.dataPage.some((d) => has(perPage[i], d)))
      .map((p) => p.page);
    if (!dataPages.length) continue;

    const hits = (rule.hints ?? []).filter((h) => has(whole, h)).length;
    const confidence = Math.min(1, 0.65 + 0.09 * hits);

    return {
      bank: rule.bank,
      template: rule.template,
      dataPages,
      documents: splitDocuments(pages, perPage, rule, dataPages),
      confidence,
    };
  }
  return null;
}

/**
 * Split a file into separate statements.
 *
 * One Leumi sample is two complete statements in one PDF — the four pages of fee
 * boilerplate simply start again halfway through. A start marker only opens a
 * new statement once the previous one has produced data; otherwise a header
 * repeated on every page would split the file into single pages.
 */
function splitDocuments(
  pages: RawPage[],
  perPage: string[],
  rule: Rule,
  dataPages: number[]
): { from: number; to: number; dataPages: number[] }[] {
  const all = [{ from: 1, to: pages.length, dataPages }];
  if (!rule.docStart) return all;

  const starts: number[] = [];
  let seenData = false;
  pages.forEach((p, i) => {
    if (has(perPage[i], rule.docStart!) && (starts.length === 0 || seenData)) {
      starts.push(p.page);
      seenData = false;
    }
    if (dataPages.includes(p.page)) seenData = true;
  });

  if (starts.length <= 1) return all;

  return starts.map((from, i) => {
    const to = i + 1 < starts.length ? starts[i + 1] - 1 : pages.length;
    return { from, to, dataPages: dataPages.filter((d) => d >= from && d <= to) };
  });
}
