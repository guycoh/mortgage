// הבנק הבינלאומי — "הנדון: אישור פרטי הלוואה/ות".
//
// A fixed-pitch printout, one block per משנה, headed
// "מספר_הלוואה.....: 41-6541670-02-50 מספר_משנה......: 01 … סכום משנה 628,337.96".
// Each line carries one to three "label....: value" pairs.
//
// The text layer is partly in VISUAL order. pdf.js hands back a run like
// "603,110.80 :.......הקרן" (the label's first word "יתרת" in its own run) for
// "יתרת הקרן.......: 603,110.80", "00." for ".00", "מתן.ת" for "ת.מתן". Which
// runs come out reversed depends on how the generator happened to cut them, so
// nothing here assumes one order: `pick` reads a field whether its value comes
// after the label, before it, or in the middle of it — and only across
// punctuation, never across another word, so a blank field reads as blank
// rather than borrowing its neighbour's figure.
//
// After the last משנה of a loan comes "סה"כ <loan> :....להלוואה" and a loan-level
// block (balances again, the three fee lines with values, "סה"כ להלוואה"); after
// the last loan, "סה"כ ללווה" and the file's grand total and עמלה תפעולית.
// A block can run over a page break with nothing marking the continuation, so
// blocks are cut from the whole file's lines in order, like Jerusalem. Every
// printed subtotal is checked against the parts read, so a misread surfaces as a
// warning on the receipt instead of a wrong number on the board.
//
// Two traps:
//   · "תשלום תקופתי" is printed WITHOUT indexation — footnote (*) says so
//     ("ע"ח קרן ו/או ריבית בלבד ללא הצמדה ונלווים"), and on a צמוד tranche it is
//     the payment on the bare principal. Amortising the bare principal at the
//     printed rate over the payments left reproduces it to the agora (Harosh
//     19/10/2026, all three tranches). The charge the client actually pays is
//     that figure times the index uplift, (קרן + הצמדה) / קרן.
//   · A משנה refinanced away still prints its header and dates (end date in the
//     past) but no balance lines — it is skipped, not read as a zero tranche.

import type { RawPage } from "@/lib/credit-parser/types";
import { date, num, pageLines, pct, signedPct, toDate, paymentsLeft } from "../text";
import { clean } from "../fields";
import type { BankLoan, BankStatement, BankTranche, Linkage, RateKind } from "../types";
import { BANK_LABEL } from "../types";
import { classifyPurpose } from "../purpose";

/** Between label words and between label and value: punctuation, footnote marks, never a word. */
const SEP = String.raw`[ \t.:()*%]*`;
/** Between a value and the label it precedes — the colon is what makes it that label's value. */
const COLON = String.raw`[ \t%]*:[ \t.()*%]*`;
/** A whole figure: "1,230,931.50", "00.", ".00", "0.01-". Never the tail of a longer number or a date. */
const NUM = String.raw`(?<![\d,./-])(-?\d[\d,]*(?:\.\d*)?-?|\.\d+)(?![\d/]|-\d)`;
const SIGNED = String.raw`(?<![\d,./])([-+]?[ \t]*\d[\d,]*(?:\.\d*)?-?)(?![\d/])`;
const DATE = String.raw`(?<![\d/])(\d{1,2}\/\d{1,2}\/\d{2,4})(?![\d/])`;
const LOAN_NO = String.raw`(\d+(?:-\d+){2,})`;

/**
 * A field's value, whichever way round the run came out.
 *
 * `label` is the label's words as regex fragments. Tried in turn: label then
 * value ("תקופה מקורית ...: 335"), value inside the label ("יתרת 603,110.80
 * :.......הקרן"), value then label ("603,697.17 :..(**)יתרת משנה"). Line-scoped:
 * SEP does not cross a newline.
 */
function pick(text: string, label: string[], value = NUM): string {
  const forms: RegExp[] = [new RegExp(label.join(SEP) + SEP + value)];
  for (let k = 1; k < label.length; k++) {
    forms.push(new RegExp(label.slice(0, k).join(SEP) + SEP + value + COLON + label.slice(k).join(SEP)));
  }
  forms.push(new RegExp(value + COLON + label.join(SEP)));
  for (let i = 0; i < forms.length; i++) {
    const m = text.match(forms[i]);
    // Label-first needs its colon somewhere in the match, or a stray figure
    // after a heading would read as that heading's value.
    if (m && (i > 0 || m[0].includes(":"))) return m[1].trim();
  }
  return "";
}
const pickNum = (t: string, label: string[]) => num(pick(t, label));
const pickPct = (t: string, label: string[]) => pct(pick(t, label));
const pickDate = (t: string, label: string[]) => date(pick(t, label, DATE));

/** A word-valued field ("סוג ריבית.......: ריבית קבועה"), up to the next label on the line. */
function words(text: string, label: string, stop?: string): string {
  const re = new RegExp(label + String.raw`[ \t.]*:[ \t]*(.*?)[ \t]*(?:` + (stop ? stop + "|" : "") + "$)", "m");
  return clean((text.match(re) ?? [])[1] ?? "");
}

/** Quotes, dashes and direction marks the way every pattern here expects them. */
const tidy = (s: string) =>
  s
    .replace(/[‎‏‪-‮]/g, "")
    .replace(/ /g, " ")
    .replace(/[״”“]/g, '"')
    .replace(/[׳’‘]/g, "'")
    .replace(/[–—−]/g, "-");

const FEES = [
  { label: "עמלת אי מתן הודעה", words: ["עמלת", "אי", "מתן", "הודעה"] },
  { label: "עמלת מדד ממוצע", words: ["עמלת", "מדד", "ממוצע"] },
  // Per משנה it is "עמלת היוון בגין הפרשי ריבית", on the loan total "עמלת היוון".
  { label: "עמלת היוון", words: ["עמלת", "היוון(?:[ \\t]*בגין[ \\t]*הפרשי[ \\t]*ריבית)?"] },
];
const readFees = (t: string) => FEES.map((f) => ({ label: f.label, amount: pickNum(t, f.words) }));

function readRate(sugRibit: string, sugHatzmada: string, baseIndex: number | null, resetMonths: number | null) {
  const kind: RateKind = /פריים/.test(sugRibit)
    ? "prime"
    : /משתנה/.test(sugRibit)
      ? "variable"
      : /קבוע/.test(sugRibit)
        ? "fixed"
        : resetMonths
          ? "variable"
          : "unknown";
  const linkage: Linkage = /לא\s*צמוד|ללא\s*הצמדה/.test(sugHatzmada)
    ? "unlinked"
    : /מט"ח|דולר|אירו|מטבע|שער/.test(sugHatzmada)
      ? "fx"
      : /צמוד|מדד/.test(sugHatzmada) || baseIndex !== null
        ? "linked"
        : sugHatzmada
          ? "unknown"
          : "unlinked";
  return { kind, linkage };
}

/** The FIBI group prints one core template; the signature says which bank. */
function lenderOf(text: string): string {
  if (/אוצר\s*החייל/.test(text)) return "בנק אוצר החייל";
  if (/בנק\s*מסד/.test(text)) return "בנק מסד";
  return BANK_LABEL.fibi;
}

export function parseFibi(pages: RawPage[]): BankStatement {
  const warnings: string[] = [];
  const lines = pages.flatMap((p) => pageLines(p)).map((l) => tidy(l.text));
  const text = lines.join("\n");

  // ---- letterhead: date, "לכבוד <code>", name, street, city
  const statementDate =
    date(pick(text, ["נכון", "ליום"], DATE)) ||
    date((text.match(new RegExp(DATE)) ?? [])[1] ?? "");
  const asOf = toDate(statementDate);
  const toAt = lines.findIndex((l) => /^לכבוד/.test(l));
  // The name sometimes shares the לכבוד line; a customer code (H061305A) does not count.
  const sameLine = toAt >= 0 ? clean(lines[toAt].replace(/^לכבוד/, "").replace(/\b[A-Z]*\d+[A-Z]*\b/g, "")) : "";
  const nameAt = sameLine ? toAt : toAt + 1;
  const name = toAt >= 0 ? sameLine || clean(lines[nameAt] ?? "") : "";
  const address =
    toAt >= 0
      ? [lines[nameAt + 1], lines[nameAt + 2]]
          .map((s) => clean(s ?? ""))
          .filter((s) => s && !/^א\.?ג\.?נ|^הנדון/.test(s))
          .join(", ")
      : "";
  const indexlessPayment = /ללא[_\s]*הצמדה/.test(text.replace(/\n/g, " "));

  // ---- cut the file into tranche blocks and loan-total blocks
  type Mark = { i: number; kind: "tranche" | "loan" | "borrower"; loan: string; sub: string };
  const HEADER = new RegExp(String.raw`מספר[_\s]*הלוואה[ \t.]*:[ \t]*${LOAN_NO}[ \t]*מספר[_\s]*משנה[ \t.]*:[ \t]*(\d+)`);
  const marks: Mark[] = [];
  lines.forEach((l, i) => {
    const h = l.match(HEADER);
    if (h) return void marks.push({ i, kind: "tranche", loan: h[1], sub: h[2] });
    const t = pick(l, ['סה"כ', "להלוואה"], LOAN_NO);
    if (t) return void marks.push({ i, kind: "loan", loan: t, sub: "" });
    const b = pick(l, ['סה"כ', "ללווה"], String.raw`(\d{4,})`);
    if (b) marks.push({ i, kind: "borrower", loan: b, sub: "" });
  });
  const blockOf = (n: number) =>
    lines.slice(marks[n].i, n + 1 < marks.length ? marks[n + 1].i : lines.length).join("\n");

  const byLoan = new Map<string, BankLoan>();
  const loanTotals = new Map<string, { payoff: number | null; fees: { label: string; amount: number | null }[] }>();
  let borrower = { number: "", text: "" };

  for (let n = 0; n < marks.length; n++) {
    const mk = marks[n];
    const bt = blockOf(n);

    if (mk.kind === "loan") {
      loanTotals.set(mk.loan, { payoff: pickNum(bt, ['סה"כ', "להלוואה"]), fees: readFees(bt) });
      continue;
    }
    if (mk.kind === "borrower") {
      borrower = { number: mk.loan, text: bt };
      continue;
    }

    const principal = pickNum(bt, ["יתרת", "הקרן"]);
    const indexation = pickNum(bt, ["הצמדת", "הקרן"]);
    // A משנה refinanced or repaid prints its header and nothing to owe.
    if (principal === null && indexation === null) continue;
    const balance = (principal ?? 0) + (indexation ?? 0);
    if (balance <= 0) continue;

    const accrued = (pickNum(bt, ["יתרת", "ריבית"]) ?? 0) + (pickNum(bt, ["הצמדת", "ריבית"]) ?? 0);
    const sugHatzmada = words(bt, String.raw`סוג\s*הצמדה`);
    const sugRibit = words(bt, String.raw`סוג\s*ריבית`, String.raw`שי?עור\s*התוספת`);
    const baseIndex = num(pick(bt, ["מדד", "יסודי", "לפי", "בסיס"], String.raw`(?:\d{4}[ \t]+)?(\d+\.\d+)`));
    const resetMonths = pickNum(bt, ["תדירות", "שינוי", "הריבית"]);
    const { kind, linkage } = readRate(sugRibit, sugHatzmada, baseIndex, resetMonths);
    const purpose = words(bt, String.raw`מטרת\s*ההלוואה`);
    const marginRaw = pick(bt, ["שי?עור", "התוספת/הפחתה"], SIGNED);
    const margin = kind === "fixed" ? null : signedPct(marginRaw) ?? pct(marginRaw);

    const endDate = pickDate(bt, ["ת\\.סיום/סילוק", "משנה", "בפועל"]);
    const end = toDate(endDate);
    // Dated on a payment day after the charge: nothing has accrued since it.
    const months = asOf && end ? paymentsLeft(asOf, end, accrued === 0) : null;

    // See the header: the printed payment excludes indexation.
    const printedPayment = pickNum(bt, ["תשלום", "תקופתי"]);
    const monthly =
      printedPayment !== null && indexlessPayment && linkage === "linked" && principal && indexation
        ? Math.round(printedPayment * (balance / principal) * 100) / 100
        : printedPayment;

    const subBalance = pickNum(bt, ["יתרת", "משנה"]);
    if (subBalance !== null && Math.abs(balance + accrued - subBalance) > 0.05) {
      warnings.push(
        `${mk.loan} משנה ${mk.sub}: סכום הרכיבים (${(balance + accrued).toFixed(2)}) שונה מיתרת המשנה המודפסת (${subBalance.toFixed(2)}).`
      );
    }

    const fees = readFees(bt);
    const anyFee = fees.some((f) => f.amount !== null);
    const loanType = words(bt, String.raw`סוג\s*הלוואה`, String.raw`סוג\s*הצמדה`);

    const tranche: BankTranche = {
      uid: `${mk.loan}-${mk.sub}`,
      loanNumber: mk.loan,
      trancheNumber: mk.sub,
      rawTrack: clean(`${sugRibit} ${sugHatzmada}`),
      rateKind: kind,
      linkage,
      amortization: words(bt, String.raw`שיטת\s*פי?רעון\s*ההלוואה`) || clean(loanType.replace(/^פרטית\s*/, "")),
      purpose,
      purposeKind: classifyPurpose(purpose),
      fundingSource: "",
      funding: "unknown",
      principal,
      indexation,
      accruedInterest: accrued || null,
      arrears: pickNum(bt, ["פיגורים/עודף"]),
      balance,
      // Fees are added below, once the loan-level block has been read.
      payoff: subBalance ?? balance + accrued,
      originalAmount: pickNum(bt, ["סכום", "משנה"]),
      monthly,
      rate: pickPct(bt, ["ריבית", "נוכחית", "ליום", "מסירת", "המידע"]),
      effectiveRate: pickPct(bt, ["ריבית", "נוכחית", "מתואמת", "ליום", "מסירת", "המידע"]),
      forecastRate: pickPct(bt, ["הריבית", "הכוללת", "החזויה"]),
      comparisonRate: pickPct(bt, ["שי?עור", "הריבית", "לצורכי", "השוואה"]),
      // "משתנה-תשואת אג"ח ממשלתית" — the anchor is named after the dash.
      anchor: kind === "fixed" || !sugRibit.includes("-") ? "" : clean(sugRibit.replace(/^[^-]*-/, "")),
      anchorRate: kind === "fixed" ? null : pickPct(bt, ["בסיס", "קביעת", "הריבית", "עוגן", "ליום", "מסירת", "המידע"]),
      margin,
      resetMonths,
      nextReset: pickDate(bt, ["מועד", "שינוי", "ריבית", "קרוב"]),
      startDate: pickDate(bt, ["(?:ת\\.מתן|מתן\\.ת)"]),
      firstPaymentDate: pickDate(bt, ["ת\\.פי?רעון", "ראשון"]),
      endDate,
      months,
      monthsDerived: true,
      baseIndex,
      currentIndex: null,
      breakFee: anyFee ? fees.reduce((s, f) => s + (f.amount ?? 0), 0) : null,
      capitalizationFee: fees[2].amount,
      breakFeeParts: fees.filter((f): f is { label: string; amount: number } => !!f.amount),
    };

    let loan = byLoan.get(mk.loan);
    if (!loan) {
      loan = {
        loanNumber: mk.loan,
        purpose,
        purposeKind: tranche.purposeKind,
        funding: "unknown",
        tranches: [],
        printed: { balance: null, payoff: null, monthly: null, breakFee: null, forecastRate: null, operationalFee: null },
      };
      byLoan.set(mk.loan, loan);
    }
    loan.tranches.push(tranche);
  }

  // ---- fees: printed per משנה when the bank itemises them, otherwise only on
  // the loan. A loan-level zero is a zero for every משנה under it; a loan-level
  // fee on a single live משנה is that משנה's; anything else stays unattributed.
  for (const loan of Array.from(byLoan.values())) {
    const tot = loanTotals.get(loan.loanNumber);
    for (const t of loan.tranches) {
      if (t.breakFee !== null || !tot) continue;
      const known = tot.fees.filter((f) => f.amount !== null);
      if (!known.length) continue;
      const sum = known.reduce((s, f) => s + (f.amount ?? 0), 0);
      if (sum === 0 || loan.tranches.length === 1) {
        t.breakFee = sum;
        t.capitalizationFee = tot.fees[2].amount;
        t.breakFeeParts = known.filter((f) => f.amount).map((f) => ({ label: f.label, amount: f.amount! }));
      } else {
        warnings.push(`הלוואה ${loan.loanNumber}: עמלות פירעון מוקדם מודפסות להלוואה כולה ולא לכל משנה — יש לשייך ידנית.`);
        break;
      }
    }
    for (const t of loan.tranches) t.payoff = (t.payoff ?? 0) + (t.breakFee ?? 0);

    loan.printed = {
      balance: loan.tranches.reduce((s, t) => s + (t.balance ?? 0), 0),
      payoff: tot?.payoff ?? null,
      monthly: loan.tranches.reduce((s, t) => s + (t.monthly ?? 0), 0),
      breakFee: loan.tranches.reduce((s, t) => s + (t.breakFee ?? 0), 0),
      forecastRate: loan.tranches.length === 1 ? loan.tranches[0].forecastRate : null,
      operationalFee: null,
    };
    // "סה"כ להלוואה" is principal + indexation + accrued interest, fees excluded.
    if (tot?.payoff != null) {
      const sum = loan.tranches.reduce((s, t) => s + (t.balance ?? 0) + (t.accruedInterest ?? 0), 0);
      if (Math.abs(sum - tot.payoff) > 0.5) {
        warnings.push(`הלוואה ${loan.loanNumber}: סכום המשנים (${sum.toFixed(2)}) שונה מהמודפס להלוואה (${tot.payoff.toFixed(2)}).`);
      }
    } else {
      warnings.push(`הלוואה ${loan.loanNumber}: לא נמצא הסיכום המודפס להלוואה — לא ניתן לאמת את היתרות.`);
    }
  }

  const loans = Array.from(byLoan.values());
  const tranches = loans.flatMap((l) => l.tranches);
  if (!tranches.length) warnings.push("לא נמצאו משנים פעילים עם יתרה במסמך.");

  // ---- the borrower block: one עמלה תפעולית on the file and the grand total.
  const opFee = pickNum(borrower.text, ["עמלה", "תפעולית"]);
  const printedTotal = pickNum(borrower.text, ['סה"כ', "לסילוק"]);
  if (opFee !== null && loans.length) loans[0].printed.operationalFee = opFee;
  if (printedTotal !== null) {
    const computed = tranches.reduce((s, t) => s + (t.payoff ?? 0), 0) + (opFee ?? 0);
    if (Math.abs(computed - printedTotal) > 0.5) {
      warnings.push(`סכום הסילוק המחושב (${computed.toFixed(2)}) שונה מהמודפס במסמך (${printedTotal.toFixed(2)}).`);
    }
  }

  return {
    bank: "fibi",
    bankLabel: lenderOf(text),
    template: "fibi/loan-details",
    statementDate,
    client: { name, idNumber: "", address },
    accountNumber: borrower.number,
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
