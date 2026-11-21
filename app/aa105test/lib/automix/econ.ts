// תמהיל אוטומטי — pricing. Every number the engine optimises on or reports goes
// through here, and through the board's own engine underneath.
//
// THREE VIEWS OF ONE ROW.
//
//   typed     — what the board's grid and read-out show: priceLoan(row,
//               {inflation, forecast: null}) — the rate as entered, CPI at the
//               board's one %. Month one is boardMonthly (the document's printed
//               payment while the row is unedited), rounded per row, exactly as
//               the `totals` memo in Simulator.tsx sums it.
//   forecast  — directive 451: priceLoan(row, {forecast}). Prime re-anchors to
//               the curve every month (so a prime row printed at the report
//               date's prime is priced at TODAY's), bond tracks reset to forward
//               anchors, CPI-linked rows index along expected CPI.
//   stress    — the forecast with the BoI's own historical forecast error
//               applied (history.json, scripts/automix-history.mts): rates
//               higher / lower, CPI higher / lower. Priced by `scheduleOn`, a
//               line-for-line twin of the board's forecast schedule that takes
//               the rate path and the index factors as inputs — with the
//               forecast's own paths it reproduces priceLoan to the agora
//               (scripts/automix-check.mts proves it on every row).

import { priceLoan, ratePath, intervalOf, firstResetOf, todayPayment, type Econ } from "@/app/aa102test/lib/price";
import { indexFactor, inflationAt, nominalAt, type Forecast } from "@/app/aa102test/lib/forecast";
import { boardMonthly, type ImportedLoan } from "@/app/aa102test/lib/credit";
import history from "./history.json";

/* --------------------------------------------------------- economies */

export type EconomyId = "base" | "rateUp" | "rateDown" | "cpiUp" | "cpiDown";

export type Economy = {
  id: EconomyId;
  label: string;
  /** Shift to the nominal forward rate, pp, once fully phased in. */
  dRate: number;
  /** Shift to expected CPI, pp a year, once fully phased in. */
  dCpi: number;
};

const S = history.shocks;
const pp = (x: number) => `${x > 0 ? "+" : x < 0 ? "−" : ""}${Math.abs(x).toFixed(2)}`;

/**
 * The five economies. The shocks are the 10th/90th percentiles of how far the
 * BoI's own 5-year market expectation missed, 2008–2021 windows (see
 * scripts/automix-history.mts). A rate shock moves the whole nominal curve
 * (real rates move with it, CPI does not); a CPI shock moves CPI and the
 * nominal curve together (Fisher — real rates unchanged), which is what makes a
 * CPI-linked track and an unlinked one react differently to the same world.
 * Each shock phases in linearly over the first twelve months.
 */
export const ECONOMIES: Economy[] = [
  { id: "base", label: "תחזית בנק ישראל", dRate: 0, dCpi: 0 },
  { id: "rateUp", label: `ריבית גבוהה מהצפוי (${pp(S.rateUp)} נק׳)`, dRate: S.rateUp, dCpi: 0 },
  { id: "rateDown", label: `ריבית נמוכה מהצפוי (${pp(S.rateDown)} נק׳)`, dRate: S.rateDown, dCpi: 0 },
  { id: "cpiUp", label: `אינפלציה גבוהה מהצפוי (${pp(S.cpiUp)} נק׳)`, dRate: S.cpiUp, dCpi: S.cpiUp },
  { id: "cpiDown", label: `אינפלציה נמוכה מהצפוי (${pp(S.cpiDown)} נק׳)`, dRate: S.cpiDown, dCpi: S.cpiDown },
];

/** The BoI rate cannot go below its historical floor (0.1%, 2015–2022). */
const NOMINAL_FLOOR = 0.1;

const ramp = (m: number) => Math.min(1, Math.max(0, (m - 1) / 12));

/** A whole shocked forecast — used for pricing that needs a Forecast object (new-loan anchors). */
export function shockedForecast(f: Forecast, e: Economy): Forecast {
  if (e.id === "base") return f;
  return {
    ...f,
    label: `${f.label}, ${e.label}`,
    nominal: f.nominal.map((x, i) => Math.max(NOMINAL_FLOOR, x + e.dRate * ramp(i + 1))),
    inflation: f.inflation.map((x, i) => x + e.dCpi * ramp(i + 1)),
  };
}

/* ----------------------------------------------------- the amortizer */

export type Sched = {
  /** Nominal payment per month. */
  pay: number[];
  /** Nominal closing balance per month. */
  bal: number[];
  totalPaid: number;
  totalInterest: number;
};

type Extra = ImportedLoan & { reset_fresh?: boolean };

/**
 * The board's forecast schedule (lib/price.ts forecastSchedule), with the rate
 * path and the monthly CPI factors as inputs. Same grace handling, same
 * re-amortisation on every rate change, same balloon shapes.
 */
export function scheduleOn(l: ImportedLoan, rates: number[], factors: number[]): Sched {
  const n = Math.max(0, Math.round(Number(l.months) || 0));
  const P = Number(l.amount) || 0;
  const sched = Number(l.amortization_schedule_id) || 1;
  const legacyType = l.grace_type_id ?? 1;
  const legacyMonths = Math.max(Math.floor(l.grace_months ?? 0), 0);
  const wantFull = Math.max(Math.floor(l.grace_full_months ?? (legacyType === 3 ? legacyMonths : 0)), 0);
  const wantPartial = Math.max(Math.floor(l.grace_partial_months ?? (legacyType === 2 ? legacyMonths : 0)), 0);
  const room = n > 1 ? n - 1 : 0;
  const gPartial = sched <= 2 ? Math.min(wantPartial, room) : 0;
  const gFull = sched <= 2 ? Math.min(wantFull, room - gPartial) : 0;
  const g = gFull + gPartial;

  const pay: number[] = [];
  const bal: number[] = [];
  let real = P;
  let cum = 1;
  let pmtReal = 0;
  let lastRate = NaN;
  let equalPrincipal = 0;
  let totalPaid = 0;
  let totalInterest = 0;
  for (let m = 1; m <= n; m++) {
    cum *= factors[m - 1];
    const r = rates[m - 1] / 12 / 100;
    const opening = real;
    const interestReal = opening * r;
    let principalReal = 0;
    let paymentReal = 0;
    if (m <= g) {
      if (m <= gFull) {
        principalReal = -interestReal;
        paymentReal = 0;
      } else paymentReal = interestReal;
    } else if (sched === 3) {
      principalReal = m === n ? opening : 0;
      paymentReal = interestReal + principalReal;
    } else if (sched === 4) {
      principalReal = m === n ? opening + interestReal : -interestReal;
      paymentReal = m === n ? opening + interestReal : 0;
    } else if (sched === 2) {
      if (m === g + 1) equalPrincipal = opening / (n - g);
      principalReal = Math.min(equalPrincipal, opening);
      paymentReal = principalReal + interestReal;
    } else {
      if (m === g + 1 || rates[m - 1] !== lastRate) {
        const k = n - m + 1;
        pmtReal = k <= 0 ? opening : r === 0 ? opening / k : (opening * r) / (1 - Math.pow(1 + r, -k));
      }
      paymentReal = pmtReal;
      principalReal = paymentReal - interestReal;
    }
    lastRate = rates[m - 1];
    real = Math.max(opening - principalReal, 0);
    if (m === n) real = 0;
    pay.push(paymentReal * cum);
    bal.push(real * cum);
    totalPaid += paymentReal * cum;
    totalInterest += interestReal * cum;
  }
  return { pay, bal, totalPaid, totalInterest };
}

const isLinked = (path: number) => path === 3 || path === 5;

/**
 * The rate path and CPI factors of a row in an economy: the base path from the
 * board's own ratePath, then the shock where the row's rate can move — prime
 * from month 2, a bond track at each reset (by the shock averaged over the new
 * window; a CPI-linked bond track only by the REAL part, which a CPI shock
 * leaves alone), a fixed track never.
 */
export function pathsIn(l: ImportedLoan, f: Forecast, e: Economy): { rates: number[]; factors: number[] } {
  const n = Math.max(0, Math.round(Number(l.months) || 0));
  const path = Number(l.path_id);
  const base = ratePath(l as Extra, f, n);
  const linked = isLinked(path);
  const factors: number[] = [];
  for (let m = 1; m <= n; m++) {
    if (!linked) factors.push(1);
    else {
      const pi = inflationAt(f, m) + e.dCpi * ramp(m);
      factors.push(Math.pow(1 + pi / 100, 1 / 12));
    }
  }
  if (e.id === "base" || path === 2 || path === 3) return { rates: base, factors };
  // The nominal shock actually felt at month m, after the floor.
  const dNom = (m: number) => Math.max(NOMINAL_FLOOR, nominalAt(f, m) + e.dRate * ramp(m)) - nominalAt(f, m);
  if (path === 1) return { rates: base.map((r, i) => (i === 0 ? r : r + dNom(i + 1))), factors };
  const V = intervalOf(l as Extra);
  const s = firstResetOf(l as Extra, V);
  const real = path === 5;
  const rates: number[] = [];
  let shift = 0;
  for (let m = 1; m <= n; m++) {
    if (m > s && (m - s - 1) % V === 0) {
      let acc = 0;
      for (let k = m; k < m + V; k++) acc += dNom(k) - (real ? e.dCpi * ramp(k) : 0);
      shift = acc / V;
    }
    rates.push(m > s ? base[m - 1] + shift : base[m - 1]);
  }
  return { rates, factors };
}

/** The base-economy schedule built by the twin — must equal priceLoan(row, {forecast}). */
export function scheduleIn(l: ImportedLoan, f: Forecast, e: Economy): Sched {
  const { rates, factors } = pathsIn(l, f, e);
  return scheduleOn(l, rates, factors);
}

/* ------------------------------------------------------ typed pricing */

export const typedEcon = (inflation: number): Econ => ({ inflation, forecast: null });

/** One row on the board's read-out: החזר חודשי (rounded, document-first), סה״כ ריבית, the schedule. */
export function typedRow(l: ImportedLoan, inflation: number) {
  const r = priceLoan(l, typedEcon(inflation));
  return {
    // Month one in TODAY's money, exactly as the read-out's `totals` memo in
    // Simulator.tsx states it (todayPayment: without the month of CPI the
    // schedule has already grown a צמוד row by).
    monthly: Math.round(boardMonthly(l, todayPayment(r))),
    totalInterest: r.totalInterest,
    totalPaid: r.totalPaid,
    pay: r.schedule.map((x) => x.payment),
    bal: r.schedule.map((x) => x.closingBalance),
  };
}

/** Present value of a payment stream at an annual effective rate. */
export function pvOf(pay: number[], annual: number): number {
  const d = Math.pow(1 + annual / 100, 1 / 12);
  let k = 1;
  let pv = 0;
  for (let m = 0; m < pay.length; m++) {
    k /= d;
    pv += pay[m] * k;
  }
  return pv;
}

/** Index factor helper re-exported for the fee model. */
export { indexFactor };
