// The mix's timeline — the one computation the four charts read.
//
// Pure, so it can be checked outside a browser: given the rows and the
// inflation assumption it returns, per month, the balance and the payment by
// track, the balance-weighted rate, and per year the payment split three ways.
// Every figure comes from calculateLoan's own schedule, so the charts and the
// grid can never disagree about the maths.

import { calculateLoan } from "@/app/private/crm/leads/simulators/components/calculate/loanCalculators";
import { isIndexedPath, type ImportedLoan } from "./credit";

/**
 * STACK ORDER. The five track hues are the page's identity and are not up for
 * revision here — but which of them sit next to each other in a stack is. This
 * order keeps every adjacent pair apart for normal vision and clear of the
 * hard floor for the common colour deficiencies (validated with the dataviz
 * palette script; the 6–8 ΔE band is legal with the legend, the tooltip and
 * the surface gaps the chart draws between segments).
 */
export const STACK: number[] = [3, 1, 5, 2, 4];

/** One month-based series per track: [month, value] pairs. */
export type TrackSeries = { id: number; points: [number, number][] };

export type Timeline = {
  maxMonth: number;
  balance: TrackSeries[];
  payment: TrackSeries[];
  /** [month, weighted %] */
  rate: [number, number][];
  /** per year (1-based): the three parts of that year's payments */
  years: { year: number; principal: number; indexation: number; interest: number }[];
  first: number;
  peak: number;
  rateNow: number;
  totalBalance: number;
};

export function buildTimeline(loans: ImportedLoan[], annualInflation: number): Timeline | null {
  const priced = loans.filter((l) => (Number(l.amount) || 0) > 0 && (Number(l.months) || 0) > 0);
  if (!priced.length) return null;
  const rows = priced.map((l) => ({
    loan: l,
    res: calculateLoan(l, annualInflation),
    indexed: isIndexedPath(Number(l.path_id)),
    rate: Number(l.rate) || 0,
  }));
  const maxMonth = rows.reduce((m, r) => Math.max(m, r.res.schedule.length), 0);
  if (!maxMonth) return null;

  const infl = annualInflation / 12 / 100;
  const byTrack = new Map<number, typeof rows>();
  for (const r of rows) {
    const id = Number(r.loan.path_id);
    if (!byTrack.has(id)) byTrack.set(id, []);
    byTrack.get(id)!.push(r);
  }

  const balance: TrackSeries[] = [];
  const payment: TrackSeries[] = [];
  for (const id of STACK) {
    const mine = byTrack.get(id);
    if (!mine?.length) continue;
    const b: [number, number][] = [];
    const p: [number, number][] = [];
    // Month 0 is the opening position: the balance as it stands, no payment yet.
    b.push([0, mine.reduce((s, r) => s + (r.res.schedule[0]?.openingBalance ?? 0), 0)]);
    for (let m = 1; m <= maxMonth; m++) {
      let bal = 0;
      let pay = 0;
      for (const r of mine) {
        const row = r.res.schedule[m - 1];
        if (!row) continue;
        bal += row.closingBalance;
        pay += row.payment;
      }
      b.push([m, Math.max(0, Math.round(bal))]);
      p.push([m, Math.max(0, Math.round(pay))]);
    }
    balance.push({ id, points: b });
    payment.push({ id, points: p });
  }

  // Balance-weighted rate: what a shekel of the outstanding mix costs, per
  // year, this month. Fixed rows keep their rate; the average moves because
  // the weights do — a mix that front-loads its cheap tranche gets dearer.
  const rate: [number, number][] = [];
  for (let m = 1; m <= maxMonth; m++) {
    let num = 0;
    let den = 0;
    for (const r of rows) {
      const row = r.res.schedule[m - 1];
      if (!row || row.openingBalance <= 0) continue;
      num += r.rate * row.openingBalance;
      den += row.openingBalance;
    }
    if (den <= 0) break;
    rate.push([m, Math.round((num / den) * 100) / 100]);
  }

  // The payment, taken apart. Every nominal figure on an indexed row is its
  // real figure grown by the index to that month, so the linkage inside a
  // payment is exactly the part that grew: pay − pay/(1+i)^m. Principal and
  // interest are stated in real shekels so the three parts add back to the
  // payment — a reader summing the bar gets the number in the החזר panel.
  const yearCount = Math.ceil(maxMonth / 12);
  const years = Array.from({ length: yearCount }, (_, i) => ({
    year: i + 1,
    principal: 0,
    indexation: 0,
    interest: 0,
  }));
  for (const r of rows) {
    r.res.schedule.forEach((row, i) => {
      const m = i + 1;
      const y = years[Math.floor(i / 12)];
      if (!y) return;
      const factor = r.indexed ? Math.pow(1 + infl, m) : 1;
      const link = row.payment - row.payment / factor;
      y.indexation += link;
      y.principal += row.principal / factor;
      y.interest += row.interest / factor;
    });
  }
  for (const y of years) {
    y.principal = Math.round(y.principal);
    y.indexation = Math.round(y.indexation);
    y.interest = Math.round(y.interest);
  }

  const totalAt = (series: TrackSeries[], m: number) =>
    series.reduce((s, t) => s + (t.points.find((p) => p[0] === m)?.[1] ?? 0), 0);
  let peak = 0;
  for (let m = 1; m <= maxMonth; m++) peak = Math.max(peak, totalAt(payment, m));

  return {
    maxMonth,
    balance,
    payment,
    rate,
    years,
    first: totalAt(payment, 1),
    peak,
    rateNow: rate[0]?.[1] ?? 0,
    totalBalance: totalAt(balance, 0),
  };
}

