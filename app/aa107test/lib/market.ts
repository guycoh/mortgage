// What a bank would charge for a NEW loan today — by track, term, bank and
// purpose — built only from data the Bank of Israel publishes.
//
// SOURCES, EACH FOR WHAT IT IS BEST AT (all fetched by lib/market-boi.ts,
// stored in `mortgage_market_rates`, snapshotted in market-snapshot.json).
// Since version 2 the LEVEL of every track and each bank's distance from the
// system come from the Supervisor's TamInt010 workbook (current month, the
// same series the Power BI shows — which stopped at 10/2025), converted from
// the BoI's effective ("adjusted") rate to the nominal rate a loan quotes.
// The original three, still used for what they alone give:
//
//   1. SDMX flow BIR_MRTG_99 — "Interest rates and business volume, housing
//      loans", new business, whole banking system, monthly. The LEVEL: the
//      average fixed unlinked rate, fixed CPI-linked rate (and its average term),
//      the CPI-linked variable track split into benchmark + margin, and the same
//      for "consumer loans with housing collateral" (הלוואה לכל מטרה).
//   2. The BoI's "Interest Rate Comparisons — Housing Loans" (a public Power BI
//      report over BoI series BNK_<bank>_LC_BIR_MRTG_*): the rate of every track
//      at every bank, prime and non-prime variable separately. The MARGINS the
//      SDMX flow does not split out (prime, 5-year unlinked), and how far each
//      bank sits from the system on each track.
//   3. SDMX flow ZCM — the zero-coupon curves the board's forecast already runs
//      on. The TERM STRUCTURE: a fixed-rate loan is funded along the curve, so a
//      10-year קל"צ and a 25-year one differ by what the curve says, and the
//      published average pins the level.
//
// Everything here is pure — the board, the optimizer and Node checks share it.

import { bondAnchor, nominalAt, realAt, type Forecast } from "@/app/aa102test/lib/forecast";

/** The five tracks a mix is built from — the board's static path ids. */
export type TrackKey = "prime" | "klz" | "kz" | "mlz" | "mz";
export const TRACKS: TrackKey[] = ["prime", "klz", "kz", "mlz", "mz"];
export const TRACK_PATH: Record<TrackKey, number> = { prime: 1, klz: 2, kz: 3, mlz: 4, mz: 5 };
export const TRACK_LABEL: Record<TrackKey, string> = {
  prime: "פריים",
  klz: 'קבועה לא צמודה',
  kz: "קבועה צמודה",
  mlz: "משתנה לא צמודה",
  mz: "משתנה צמודה",
};
export const TRACK_SHORT: Record<TrackKey, string> = { prime: "פריים", klz: 'קל"צ', kz: 'ק"צ', mlz: 'מל"צ', mz: 'מ"צ' };
/** Directive 329: a rate that may change during the term is variable — prime AND the 5-year tracks. */
export const IS_FIXED: Record<TrackKey, boolean> = { prime: false, klz: true, kz: true, mlz: false, mz: false };
export const IS_LINKED: Record<TrackKey, boolean> = { prime: false, klz: false, kz: true, mlz: false, mz: true };
/** The reset interval the BoI's own IRR methodology assumes for non-prime variable tracks. */
export const RESET_MONTHS = 60;

/** What a new loan is FOR. All-purpose money (consolidated consumer debt) prices higher. */
export type Segment = "housing" | "allPurpose";

/** One bank as the comparison names it, and the board's lender words for it. */
export const BANKS = [
  { id: "system", label: "ממוצע המערכת" },
  { id: "Mizrahi Tefahot", label: "מזרחי טפחות" },
  { id: "Leumi", label: "לאומי" },
  { id: "Hapoalim", label: "הפועלים" },
  { id: "Discount", label: "דיסקונט" },
  { id: "Habeinleumi", label: "הבינלאומי" },
  { id: "Mercantile", label: "מרכנתיל" },
  { id: "Jerusalem", label: "ירושלים" },
] as const;
export type BankId = (typeof BANKS)[number]["id"];

export type MarketSnapshot = {
  /** When the numbers were assembled (ISO). */
  builtAt: string;
  /**
   * 2 = every rate NOMINAL, level and per-bank spreads from TamInt010 (see
   * market-boi). Absent = the first build, which subtracted a nominal prime
   * from the BoI's effective (adjusted) averages — off by ~0.1pp; the engine
   * says so when it is handed one.
   */
  version?: number;
  /** Where each number came from, for the UI's provenance line. */
  sources: { id: string; label: string; period: string; url: string }[];
  /** Bank of Israel policy rate now, and the prime it sets (rate + 1.5). */
  boi: { rate: number; prime: number; since: string };
  /** The month the level figures describe ("2026-08"). */
  levelPeriod: string;
  /** The month the per-bank comparison describes ("2025-10"). */
  bankPeriod: string;
  housing: {
    /** קל"צ: spread over the balance-weighted nominal curve yield. */
    klzSpread: number;
    /** ק"צ: spread over the balance-weighted real curve yield. */
    kzSpread: number;
    /** Prime track margin over prime (negative = below prime). */
    primeMargin: number;
    /** 5-year unlinked: margin over the 5-year nominal anchor. */
    mlzMargin: number;
    /** 5-year CPI-linked: margin over the 5-year real anchor. */
    mzMargin: number;
    /** The published averages the spreads were calibrated on — shown, not used. */
    avg: { klz: number; kz: number; kzTermYears: number; klzRefTermYears: number; prime: number; mlz: number; mz: number };
  };
  /** All-purpose (consumer loans with housing collateral) minus housing, per track, pp. */
  allPurposePremium: Record<TrackKey, number>;
  /** Bank rate minus system rate, per track, pp — from the per-bank comparison. */
  bankDelta: Record<string, Partial<Record<TrackKey, number>>>;
  /** Each bank's portfolio IRR (BoI's 451 calculation) for the comparison month. */
  bankIrr: Record<string, number>;
};

/* ------------------------------------------------------------ the curve */

/** Balance profile of a level-payment loan of `months` at `rate`% — the weights of a curve yield. */
export function balanceWeights(months: number, rate = 4.5): number[] {
  const r = rate / 1200;
  const n = Math.max(1, Math.round(months));
  const pmt = r === 0 ? 1 / n : r / (1 - Math.pow(1 + r, -n));
  const out: number[] = [];
  let b = 1;
  for (let m = 0; m < n; m++) {
    out.push(b);
    b = b * (1 + r) - pmt;
  }
  const s = out.reduce((a, x) => a + x, 0);
  return out.map((x) => x / s);
}

/**
 * The rate a lender funding an amortizing loan along the curve would need:
 * forward rates averaged by how much of the loan is still outstanding in each
 * month. A 10-year loan lives on the short end, a 30-year one on the long end —
 * that is the whole term structure of a fixed-rate mortgage, before the spread.
 */
export function curveYield(f: Forecast, months: number, real: boolean): number {
  const w = balanceWeights(months);
  let y = 0;
  for (let m = 1; m <= w.length; m++) y += w[m - 1] * (real ? realAt(f, m) : nominalAt(f, m));
  return y;
}

/* ------------------------------------------------------------ pricing */

export type PriceOptions = {
  bank: BankId;
  /** Negotiated discount on every track, pp (positive = cheaper). */
  discount: number;
};

/** The anchor a new 5-year track starts on, and what it will reset to is the forecast's job. */
export const anchorNow = (f: Forecast, track: "mlz" | "mz") => bondAnchor(f, 0, RESET_MONTHS, track === "mz");

/**
 * Today's rate for a new tranche: track, term (months), purpose, bank.
 * Returns the rate and, for variable tracks, the anchor and margin it is made of
 * — the board shows both, and the forecast engine resets on the margin.
 */
export function newRate(
  m: MarketSnapshot,
  f: Forecast,
  track: TrackKey,
  months: number,
  segment: Segment,
  opt: PriceOptions
): { rate: number; anchor: number | null; margin: number | null } {
  const bank = opt.bank !== "system" ? m.bankDelta[opt.bank]?.[track] ?? 0 : 0;
  const seg = segment === "allPurpose" ? m.allPurposePremium[track] ?? 0 : 0;
  const adj = bank + seg - (opt.discount || 0);
  const H = m.housing;
  switch (track) {
    case "prime": {
      const margin = H.primeMargin + adj;
      return { rate: m.boi.prime + margin, anchor: m.boi.prime, margin };
    }
    case "klz":
      return { rate: curveYield(f, months, false) + H.klzSpread + adj, anchor: null, margin: null };
    case "kz":
      return { rate: curveYield(f, months, true) + H.kzSpread + adj, anchor: null, margin: null };
    case "mlz": {
      const a = anchorNow(f, "mlz");
      const margin = H.mlzMargin + adj;
      return { rate: a + margin, anchor: a, margin };
    }
    case "mz": {
      const a = anchorNow(f, "mz");
      const margin = H.mzMargin + adj;
      return { rate: a + margin, anchor: a, margin };
    }
  }
}

export const round2 = (x: number) => Math.round(x * 100) / 100;
