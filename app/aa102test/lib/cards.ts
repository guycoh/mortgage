// THE CREDIT CARDS A REPORT LISTS, AND WHICH OF THEM ARE REALLY LOANS.
//
// A דוח ריכוז נתונים files every card under one transaction type — מסגרת אשראי
// מתחדשת — whether it is the ordinary monthly bill or ₪50,000 of instalment
// credit the card company spread over four years. The import used to drop the
// whole type, so the second kind vanished from the board: a real household's
// Max card held ₪52,732 at 11–13.5% paying ₪1,394 a month, and none of it was
// in the mix or in the board's monthly total.
//
// The card list under the charts shows every card-related debt and lets the
// advisor decide; this file is the default it starts from.

import { extractLoans, type ExtractedLoan } from "@/lib/credit-parser/loan-mapping";
import type { CreditReport } from "@/lib/credit-parser/types";
import { lenderOf } from "./lenders";

/**
 * Is this card facility an instalment loan rather than a monthly bill?
 *
 * The report has no field that says so. What it does say is how big the
 * monthly charge is against the balance: a bill asks for most of the balance
 * every month (₪10,761 against ₪11,873), credit spread into instalments asks
 * for a small slice of it (₪1,394 against ₪52,732) — and it carries interest,
 * where a bill's drawn money sits on the 0% track. Both have to hold.
 *
 * `reason` is the advisor's answer to "why is this ticked / not ticked" in the
 * list's own words, so it is written for the screen.
 */
export function loanLikeCard(l: ExtractedLoan): { ok: boolean; reason: string } {
  return instalmentCredit({
    category: l.category,
    role: l.role,
    balance: l.balance,
    overdue: l.overdue,
    payment: l.knownPayment,
    rate: Number(l.interest) || 0,
    months: Number(l.months) || 0,
  });
}

/**
 * The rule itself, on plain figures — so the board's import (ExtractedLoan) and
 * the client summary (analysis DebtLine) cannot disagree about which card is a
 * loan. `payment` is the PRINTED 201-046 only; a computed figure is not evidence.
 */
export function instalmentCredit(x: {
  category: string;
  role: "debtor" | "guarantor";
  balance: number;
  overdue: number;
  payment: number;
  rate: number;
  months: number;
}): { ok: boolean; reason: string } {
  if (x.category !== "card") return { ok: false, reason: "" };
  if (x.role === "guarantor") return { ok: false, reason: "הלקוח ערב לחוב" };
  if (x.balance <= 0) return { ok: false, reason: "אין יתרה" };
  if (x.overdue > 0) return { ok: false, reason: "בפיגור — אין לוח תשלומים מדווח" };
  if (!(x.payment > 0)) return { ok: false, reason: "לא דווח חיוב חודשי" };
  if (x.payment >= x.balance * 0.5 || x.months <= 2)
    return { ok: false, reason: "חיוב שוטף — החיוב החודשי קרוב ליתרה כולה" };
  if (x.rate <= 0) return { ok: false, reason: "היתרה בריבית אפס" };
  return { ok: true, reason: `תשלומים בריבית — כ־${x.months} חודשים לסיום` };
}

export interface CardItem {
  /** `docKey#uid` — matches `source_refs` on the rows it became. */
  ref: string;
  /** Whose report listed it. */
  clientName: string;
  loan: ExtractedLoan;
  /** A card facility, or a loan the card company gave. */
  kind: "facility" | "loan";
  /** What the import does with it by default — the auto-selection. */
  suggested: boolean;
  reason: string;
}

export interface CardDoc {
  report: CreditReport;
  clientName: string;
  /** docKey of the report, as credit.ts builds it. */
  key: string;
}

/**
 * Every card-related debt across the loaded reports: the card facilities
 * themselves, and the loans a card company gave (Max, Cal, Isracard), which
 * come in as ordinary loans and are listed here so the whole card picture is
 * in one place.
 */
export function cardItems(docs: CardDoc[]): CardItem[] {
  const items: CardItem[] = [];
  for (const d of docs) {
    for (const l of extractLoans(d.report)) {
      const facility = l.category === "card";
      const issuerLoan = l.category === "loan" && lenderOf(l.source).kind === "card";
      if (!facility && !issuerLoan) continue;
      const verdict = facility ? loanLikeCard(l) : { ok: true, reason: "הלוואה מחברת כרטיסי אשראי" };
      items.push({
        ref: `${d.key}#${l.uid}`,
        clientName: d.clientName,
        loan: l,
        kind: facility ? "facility" : "loan",
        suggested: verdict.ok,
        reason: verdict.reason,
      });
    }
  }
  // Loans first (they are already rows), then facilities biggest-first.
  items.sort(
    (a, b) =>
      Number(a.kind === "facility") - Number(b.kind === "facility") || b.loan.balance - a.loan.balance
  );
  return items;
}
