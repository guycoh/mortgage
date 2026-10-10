// The customer offer — what /offer/<id> shows, frozen when the advisor sends it.
//
// A SNAPSHOT, NOT A VIEW OF THE BOARD (owner, 2026-10-10). The client reads the
// numbers they were sent; an edit on the board afterwards is a new offer and a
// new link. So everything the page draws is computed here, once, on the
// advisor's machine, from the same pricing as the comparison card — and stored.
//
// What a customer sees and what they do not: payments, balances, total cost
// and the saving — the DIFFERENCE, never the recipe. Not the new mix's tracks,
// rates or split (owner, 2026-10-10: how the saving is built is the advisor's,
// shown later in the meeting), and not ענ"נ, שת"פ or מח"מ. None of it is even
// stored: a field the page does not draw would still travel in its HTML.

import type { ImportedLoan } from "./credit";
import { atPayment, mixFigures } from "./compare-metrics";
import { asEcon, type Assume } from "./price";

export type OfferSide = {
  principal: number;
  months: number;
  totalPaid: number;
  cost: number;
  perShekel: number;
  firstPayment: number;
  peak: number;
  peakYear: number;
  /** Monthly payment, months 1…N, whole shekels. */
  payments: number[];
  /** Balance owed at the start (index 0) and at the end of every year. */
  balances: number[];
  /** Interest + linkage paid by the end of every year, cumulative. */
  costByYear: number[];
};

export type OfferPayload = {
  v: 1;
  createdAt: string;
  client: string;
  advisor: { name: string; phone: string };
  /** What the future was priced on, in the client's words. */
  basis: string;
  current: OfferSide;
  proposed: OfferSide;
};

const years = (m: number) => Math.round((m / 12) * 10) / 10;

/** "2026-09" → "09/2026", "2026-10-01" → "01/10/2026". */
const asOfLabel = (asOf: string) => asOf.split("-").reverse().join("/");

function side(rows: ImportedLoan[], assume: Assume): OfferSide | null {
  const live = rows.filter((l) => (Number(l.amount) || 0) > 0 && (Number(l.months) || 0) > 0);
  const f = mixFigures(live, assume, 4.5);
  if (!f) return null;
  const yearsN = Math.ceil(f.months / 12);
  return {
    principal: Math.round(f.principal),
    months: f.months,
    totalPaid: Math.round(f.totalPaid),
    cost: Math.round(f.cost),
    perShekel: Math.round(f.perShekel * 100) / 100,
    firstPayment: Math.round(f.firstTyped),
    peak: Math.round(f.peak),
    peakYear: f.peakYear,
    payments: f.payments.map((p) => Math.round(p)),
    balances: [Math.round(f.principal), ...Array.from({ length: yearsN }, (_, i) => Math.round(atPayment(f, (i + 1) * 12).balance))],
    costByYear: Array.from({ length: yearsN }, (_, i) => Math.round(atPayment(f, (i + 1) * 12).costSoFar)),
  };
}

export function buildOffer(
  current: ImportedLoan[],
  proposed: ImportedLoan[],
  assume: Assume,
  meta: { client: string; advisor: { name: string; phone: string } }
): OfferPayload | null {
  const c = side(current, assume);
  const p = side(proposed, assume);
  if (!c || !p) return null;
  const e = asEcon(assume);
  return {
    v: 1,
    createdAt: new Date().toISOString(),
    client: meta.client.trim(),
    advisor: { name: meta.advisor.name.trim(), phone: meta.advisor.phone.trim() },
    // Named for the client as the Bank of Israel forecast it is — a saved curve
    // (SmartNPV's) is that same directive-451 forecast, and a vendor's name has
    // no place on a client's page. Wording reviewed by Astra, 2026-10-10.
    basis: e.forecast
      ? `נתוני בנק ישראל לריבית ולאינפלציה הצפויות (${asOfLabel(e.forecast.asOf)})`
      : `הנחת אינפלציה שנתית של ${e.inflation}%`,
    current: c,
    proposed: p,
  };
}

export { years as monthsToYears };
