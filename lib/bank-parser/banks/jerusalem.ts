// Bank Jerusalem — "פירוט סילוקית בתיק …".
//
// A fixed-pitch printout, one block per loan, headed
// "הלוואה 616251 - סילוק מלא , הסכם לתיוק 500109384". Every line of a block
// carries two unrelated label/value pairs split by a literal "||" glyph: פרטים
// כלליים (the loan's terms) on the right, פרטי הסילוק (what closing it costs) on
// the left. The "||" sits at the same x on every line, so the split is done by
// coordinate — and within each half the label is one whole glyph run and its
// value the next, which makes exact label matching safe. Prefix matching is NOT:
// "ריבית" (accrued interest, left half) is a prefix of half the right-hand labels.
//
// Jerusalem files the tranches of one mortgage under a הסכם — the 616251/616252
// pair is the fixed and variable halves of one advance — so the agreement is the
// loan and each הלוואה number is a tranche of it.
//
// A block can run over a page break (the last five lines land on the next page,
// which carries no header), so blocks are cut from the whole file's lines in
// order, not page by page. The summary page ("סיכום הסילוקית") ends the data.
//
// Dates are dd.mm.yy with dots; remaining term is printed outright
// (תשלומים שנותרו), so nothing is derived from the end date.

import type { RawPage } from "@/lib/credit-parser/types";
import { date, has, norm, num, pageLines, pct, type Line } from "../text";
import { clean } from "../fields";
import type { BankLoan, BankStatement, BankTranche, Linkage, RateKind } from "../types";
import { BANK_LABEL } from "../types";
import { classifyPurpose } from "../purpose";

const HEADER = /הלוואה\s+(\d{4,})\s*-\s*סילוק/;
const AGREEMENT = /הסכם\s*לתיוק\s*(\d{4,})/;

/** dd.mm.yy → dd/mm/yyyy. */
const dotDate = (s: string) => date(s.replace(/\./g, "/"));

/**
 * One line's two halves as label → value.
 *
 * Each half reads right-to-left: leading text runs form the label, the first
 * run after them is the value. "סה"כ | לסילוק | 105,556.68" is a two-run label;
 * "מדד בסיסי | 107.0640 | (2022)" keeps the value and drops the index base year.
 */
function pairs(line: Line): [string, string][] {
  const sep = line.items.find((i) => i.str.trim() === "||");
  if (!sep) return [];
  const right = line.items.filter((i) => i.x > sep.x);
  const left = line.items.filter((i) => i.x < sep.x);
  const out: [string, string][] = [];
  for (const half of [right, left]) {
    const runs = half.map((i) => clean(i.str)).filter(Boolean);
    const at = runs.findIndex((r) => /^[-+]?[\d,.]+\s*%?$/.test(r) || /^\d{2}\.\d{2}\.\d{2,4}$/.test(r));
    if (at > 0) out.push([runs.slice(0, at).join(" "), runs[at]]);
    else if (runs.length >= 2) out.push([runs[0], runs[1]]);
  }
  return out;
}

/**
 * Labels as keys: spacing gone, and the fee lines' printed rate dropped —
 * "עמלת היוון )% 100(" is the same field whatever percentage it states.
 */
const key = (label: string) => norm(label.replace(/\)[^()]*\(|\([^()]*\)/g, ""));

function readRate(sugRibit: string, linkage: string, baseIndex: number | null): { kind: RateKind; linkage: Linkage } {
  const s = norm(sugRibit);
  const kind: RateKind = /פריים/.test(s) ? "prime" : /משתנה/.test(s) ? "variable" : /קבוע/.test(s) ? "fixed" : "unknown";
  // "אופן הצמדה: חודשי" with a base index printed = linked to the CPI. An
  // unlinked tranche prints no index at all.
  const l = norm(linkage);
  const link: Linkage = /לאצמוד|ללא/.test(l)
    ? "unlinked"
    : /מט"ח|דולר|אירו/.test(l)
      ? "fx"
      : l || baseIndex !== null
        ? "linked"
        : "unknown";
  return { kind, linkage: link };
}

export function parseJerusalem(pages: RawPage[]): BankStatement {
  const warnings: string[] = [];
  const lines = pages.flatMap((p) => pageLines(p));
  const text = lines.map((l) => l.text).join("\n");

  // ---- letterhead: "לכבוד" / name / street / city, then "הנדון : פירוט סילוקית בתיק N ליום dd.mm.yy"
  const subject = text.match(/סילוקית\s*בתיק\s*(\d+)\s*(?:ע"ש\s*.+?\s*)?ליום\s*(\d{2}\.\d{2}\.\d{2,4})/);
  const toAt = lines.findIndex((l) => has(l.text, "לכבוד"));
  const name = toAt >= 0 ? clean(lines[toAt + 1]?.text ?? "") : "";
  const address = toAt >= 0
    ? [lines[toAt + 2]?.text, lines[toAt + 3]?.text].map((s) => clean(s ?? "")).filter(Boolean).join(", ")
    : "";

  // ---- blocks, in file order, until the summary
  const end = lines.findIndex((l) => has(l.text, "סיכום הסילוקית"));
  const body = end >= 0 ? lines.slice(0, end) : lines;
  const marks = body
    .map((l, i) => ({ i, m: l.text.match(HEADER), a: l.text.match(AGREEMENT) }))
    .filter((x) => x.m);

  const byAgreement = new Map<string, BankLoan>();
  for (let n = 0; n < marks.length; n++) {
    const { i, m, a } = marks[n];
    const loanNumber = m![1];
    const agreement = a?.[1] ?? loanNumber;
    const block = body.slice(i + 1, n + 1 < marks.length ? marks[n + 1].i : body.length);

    const f = new Map<string, string>();
    for (const l of block) for (const [k, v] of pairs(l)) if (!f.has(key(k))) f.set(key(k), v);
    const g = (label: string) => f.get(key(label)) ?? "";

    const principal = num(g("קרן"));
    const indexation = num(g("הצמדת קרן"));
    const balance = principal !== null || indexation !== null ? (principal ?? 0) + (indexation ?? 0) : null;
    // A settled loan still prints its block, every figure at zero.
    if (!balance || balance <= 0) continue;

    const baseIndex = num(g("מדד בסיסי"));
    const { kind, linkage } = readRate(g("סוג ריבית"), g("אופן הצמדה"), baseIndex);
    const accrued = (num(g("ריבית")) ?? 0) + (num(g("הצמדת ריבית")) ?? 0);

    const feeParts = [
      { label: "עמלת פיצוי מדד", amount: num(g("עמלת פיצוי מדד")) },
      { label: "עמלת היוון", amount: num(g("עמלת היוון")) },
      { label: "עמלת העדר הודעה מראש", amount: num(g("עמלת העדר הודעה מראש")) },
    ].filter((p): p is { label: string; amount: number } => p.amount !== null && p.amount > 0);

    const loanType = g("סוג הלוואה");
    const purpose = g("מטרת הלוואה");
    const months = num(g("תשלומים שנותרו"));

    const tranche: BankTranche = {
      uid: `${agreement}-${loanNumber}`,
      loanNumber: agreement,
      trancheNumber: loanNumber,
      // The loan type ("הל' לכל מטרה בשעבוד דירת מגורים") names the product, not
      // the track; the track label is composed from the rate and linkage instead.
      rawTrack: "",
      rateKind: kind,
      linkage,
      amortization: g("סוג לוח"),
      purpose,
      // "מטרה אחרת" on its own reads as אחר, but the loan type beside it says
      // לכל מטרה — a mortgage against the home spent elsewhere. Both are read.
      purposeKind: classifyPurpose(`${loanType} ${purpose}`),
      fundingSource: "",
      funding: "unknown",
      principal,
      indexation,
      accruedInterest: accrued || null,
      arrears: null,
      balance,
      payoff: num(g("סה\"כ לסילוק")),
      originalAmount: num(g("סכום מקורי")),
      // חיוב אחרון — the last instalment actually collected; the summary page
      // lists the same figures as פרטי גביה אחרונה.
      monthly: num(g("חיוב אחרון הלוואה")),
      rate: pct(g("ריבית נוכחית")),
      effectiveRate: pct(g("ריבית נוכחית מתואמת")),
      forecastRate: pct(g("ריבית כוללת חזויה")),
      comparisonRate: pct(g("ריבית לצרכי השוואה")),
      // Jerusalem names no anchor; it prints the base rate's current level and
      // the margin off it. The name stays blank rather than invented.
      anchor: kind === "fixed" ? "" : "ריבית בסיס",
      anchorRate: pct(g("ריבית בסיס נוכחית")),
      margin: pct(g("שיעור התוספת/הפחתה")),
      resetMonths: num(g("תדירות שינוי הריבית")),
      nextReset: dotDate(g("מועד שינוי הריבית הקרוב")),
      startDate: dotDate(g("תאריך ביצוע")),
      firstPaymentDate: dotDate(g("תאריך תשלום 1")),
      endDate: dotDate(g("תאריך סיום")),
      months,
      monthsDerived: false,
      baseIndex,
      currentIndex: num(g("מדד נוכחי")),
      breakFee: num(g("סה\"כ עמלות")),
      breakFeeParts: feeParts,
    };

    // The block prints its own subtotal: principal + linkage + interest + its
    // linkage = "סה"כ". Checked here so a misread cell surfaces on the tranche.
    const sub = num(g("סה\"כ"));
    if (sub !== null && Math.abs(balance + accrued - sub) > 0.05) {
      warnings.push(`הלוואה ${loanNumber}: סכום הרכיבים (${(balance + accrued).toFixed(2)}) שונה מסיכום הביניים המודפס (${sub.toFixed(2)}).`);
    }

    let loan = byAgreement.get(agreement);
    if (!loan) {
      loan = {
        loanNumber: agreement,
        purpose,
        purposeKind: tranche.purposeKind,
        funding: "unknown",
        tranches: [],
        printed: { balance: null, payoff: null, monthly: null, breakFee: null, forecastRate: null, operationalFee: null },
      };
      byAgreement.set(agreement, loan);
    }
    loan.tranches.push(tranche);
  }

  const loans = [...byAgreement.values()];
  const tranches = loans.flatMap((l) => l.tranches);
  if (!tranches.length) warnings.push("לא נמצאו הלוואות פעילות עם יתרה בסילוקית.");

  // ---- the summary page: one ₪60 operational fee on the file, the grand
  // total, and the per-agreement forecast/comparison rates.
  const tail = end >= 0 ? lines.slice(end) : [];
  const tailText = tail.map((l) => l.text).join("\n");
  const opFee = num((tailText.match(/עמלת\s*תפעול\s*\|?\s*([\d,]+\.\d{2})/) ?? [])[1] ?? "");
  const printedTotal = num((tailText.match(/סה"כ\s*לתשלום\s*\|?\s*([\d,]+\.\d{2})/) ?? [])[1] ?? "");
  for (const loan of loans) {
    const row = tail.find((l) => l.text.includes(loan.loanNumber) && /%/.test(l.text));
    const rates = row?.text.match(/(\d+(?:\.\d+)?)\s*%/g) ?? [];
    loan.printed = {
      balance: loan.tranches.reduce((s, t) => s + (t.balance ?? 0), 0),
      payoff: loan.tranches.reduce((s, t) => s + (t.payoff ?? 0), 0),
      monthly: loan.tranches.reduce((s, t) => s + (t.monthly ?? 0), 0),
      breakFee: loan.tranches.reduce((s, t) => s + (t.breakFee ?? 0), 0),
      forecastRate: rates[0] ? pct(rates[0]) : null,
      operationalFee: null,
    };
  }
  if (opFee !== null && loans.length) loans[0].printed.operationalFee = opFee;

  if (printedTotal !== null) {
    const computed = tranches.reduce((s, t) => s + (t.payoff ?? 0), 0) + (opFee ?? 0);
    if (Math.abs(computed - printedTotal) > 0.5) {
      warnings.push(`סכום הסילוק המחושב (${computed.toFixed(2)}) שונה מהמודפס בסילוקית (${printedTotal.toFixed(2)}).`);
    }
  }

  return {
    bank: "jerusalem",
    bankLabel: BANK_LABEL.jerusalem,
    template: "jerusalem/payoff",
    statementDate: dotDate(subject?.[2] ?? ""),
    client: { name, idNumber: "", address },
    accountNumber: subject?.[1] ?? "",
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
