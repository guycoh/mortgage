// מי ילווה ללקוח הזה, ובאיזה מחיר — the pricing tier.
//
// The BoI averages describe what a bank charges its typical borrower. Most of
// the files this board sees are not that borrower (prime + 2.25 mortgage
// tranches, all-purpose mortgages, consumer debt at 10–15%, arrears), so the
// engine first decides WHO would lend, and prices every new shekel there:
//
//   bank         market terms — the BoI system average (or the chosen bank).
//   bankPremium  a bank, at the premium THIS client was actually charged: the
//                median distance of their own mortgage tranches from what the
//                market gave in the month each was taken (BoI TamInt010 /
//                Power BI per-track system rates; BIR_MRTG_99 before 2016),
//                clamped to [0.5, 2.5] pp. Evidence from the document, not a
//                rate card.
//   nonbank      a non-bank property-backed lender (see NONBANK).
//
// The evidence and the resolved tier are stated (pricing.tierWhy) and repeated
// on every proposal as a caveat — the advisor confirms it with a lender.

import type { TrackKey } from "@/app/aa107test/lib/market";
import type { Analysis } from "@/app/aa102test/lib/analysis";
import { lenderOf } from "@/app/aa102test/lib/lenders";
import { parseDate } from "@/app/aa102test/lib/dates";
import type { ImportedLoan } from "@/app/aa102test/lib/credit";
import type { ClientProfile, PricingTier } from "./types";
import history from "./history.json";

/** BoI effective ("adjusted") annual → nominal annual, monthly payments. */
const nominalOf = (eff: number) => (Math.pow(1 + eff / 100, 1 / 12) - 1) * 1200;

/**
 * Non-bank property-backed lending — ESTIMATES from the lenders' own published
 * pools (research-tiers notes):
 *   · Mimun Yashir Mortgages, the largest (Midroog Series 5 pool report,
 *     10/11/2026): 81.7% fixed CPI-linked, 18.3% variable on the BoI rate;
 *     weighted rate 7.4% (real on the linked part); LTV ≤ 80%, average 64%;
 *     terms to 30 years. Nominal average 8.5–9% (State Comptroller, Q2 2025),
 *     9.2% (Bizportal, 03/2026).
 *   · Opening fees 0.5–1% (Comptroller, with Capital Market Authority data;
 *     banks are capped at ₪360). Legal ceiling BoI + 15pp.
 * So: ק"צ at 7.40%, variable at prime + 4.00 (= 8.75% today, the middle of the
 * 8.5–9% nominal range), 30 years, 1% opening fee. Directive 329 does not bind
 * non-banks; the engine holds them to it anyway — a mix that is legal at a bank
 * is the one an advisor can later refinance back into one.
 */
export const NONBANK = {
  primeMargin: 4,
  kzRate: 7.4,
  maxYears: 30,
  openingFee: 0.01,
  tracks: ["prime", "kz"] as TrackKey[],
  source: "Midroog, Mimun Yashir Mortgages Series 5 pool report 10/11/2026; State Comptroller 2025; Bizportal 03/2026",
};

export const PREMIUM_CLAMP = [0.5, 2.5] as const;
/**
 * A client whose tranches sit this far above the market of their day was
 * priced as a risk. Banks barely risk-price ordinary housing loans by LTV/PTI
 * (BoI n13a/n13b, 10/2026: ±0.1–0.2pp between buckets; a 2019 BoI study found
 * +0.06pp for LTV > 60%), and no credit-score premium is published — so the
 * only evidence of what a bank charges THIS borrower is what banks charged
 * them: the median of their own record.
 */
export const PREMIUM_EVIDENCE = 0.75;

const monthOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const iso = (d: Date) => `${monthOf(d)}-${String(d.getDate()).padStart(2, "0")}`;
const H = history as unknown as {
  market: Record<string, Partial<Record<"prime" | "primeMargin" | "klz" | "kz" | "mlz" | "mz", number>>>;
  avgRates: Record<string, { klz?: number; kz?: number; apKlz?: number; apKz?: number; apVar?: number }>;
  boiSteps: [string, number][];
};

/** Prime (BoI + 1.5) on a day. */
export function primeOn(day: string): number | null {
  let v: number | null = null;
  for (const [t, x] of H.boiSteps) {
    if (t > day) break;
    v = x;
  }
  return v === null ? null : v + 1.5;
}

/** Purposes that make a home-secured loan all-purpose money (הוראה 329: הלוואה לכל מטרה). */
export const AP_PURPOSES = ["any", "refi_any", "business"];
export const isAllPurpose = (l: ImportedLoan) => AP_PURPOSES.includes(String(l.purpose ?? ""));

/**
 * What the market charged in this month, nominal %. Housing: the system rate
 * per track (TamInt010 / Power BI; BIR_MRTG_99 before 2016), prime as its
 * margin over prime. All-purpose (a home-secured loan for any purpose): the
 * BIR_MRTG_99 all-purpose series — fixed unlinked, fixed CPI-linked, and the
 * unlinked variable RATE (benchmark + margin).
 */
function marketThen(track: TrackKey, month: string, allPurpose: boolean): { rate?: number; primeMargin?: number } | null {
  if (allPurpose) {
    const a = H.avgRates[month];
    if (!a) return null;
    const v = track === "klz" ? a.apKlz : track === "kz" ? a.apKz : track === "prime" ? a.apVar : undefined;
    return v === undefined ? null : { rate: nominalOf(v) };
  }
  const m = H.market[month];
  if (track === "prime") return m?.primeMargin !== undefined ? { primeMargin: m.primeMargin } : null;
  const v = m?.[track];
  if (v !== undefined) return { rate: nominalOf(v) };
  if (track === "klz" || track === "kz") {
    const a = H.avgRates[month]?.[track];
    if (a !== undefined) return { rate: nominalOf(a) };
  }
  return null;
}

const TRACK_OF: Record<number, TrackKey> = { 1: "prime", 2: "klz", 3: "kz", 4: "mlz", 5: "mz" };

export type TierEvidence = { id: string; track: TrackKey; month: string; excess: number; allPurpose: boolean };

export type TierInfo = {
  tier: PricingTier;
  why: string;
  /** One sentence (≤ 110 chars) for the sheet's findings line. */
  short: string;
  /** pp added to every bank-priced track (bankPremium). */
  premium: number;
  /** Tracks a new loan may use. */
  tracks: TrackKey[];
  maxYears: number;
  /** Opening fee as a share of the new money (non-bank). */
  openingFee: number;
  /** No lender will refinance this file now — why. */
  blocked: string | null;
  evidence: TierEvidence[];
};

/**
 * The client's own pricing record: for every mortgage-secured row whose
 * opening date, track and rate are known, how far its margin (prime) or its
 * rate (fixed) sat from the system average of that month. Variable bond
 * tracks are left out — their printed margin is over each bank's own anchor
 * definition, which the BoI tables do not state.
 */
export function pricingRecord(rows: ImportedLoan[]): TierEvidence[] {
  const out: TierEvidence[] = [];
  for (const r of rows) {
    if (r.is_guarantor || r.group !== "mortgage" || r.source_eligibility) continue;
    const track = TRACK_OF[Number(r.path_id)];
    const start = r.source_start_date ? parseDate(r.source_start_date) : null;
    if (!track || !start || !(Number(r.rate) > 0) || (track !== "prime" && track !== "klz" && track !== "kz")) continue;
    const month = monthOf(start);
    const ap = isAllPurpose(r);
    const m = marketThen(track, month, ap);
    if (!m) continue;
    let excess: number | null = null;
    const margin = r.anchor_margin !== null && r.anchor_margin !== undefined ? Number(r.anchor_margin) : null;
    if (track === "prime") {
      if (ap) {
        // The rate the loan was given at: prime on that day plus its margin.
        const p = primeOn(iso(start));
        if (margin !== null && Number.isFinite(margin) && p !== null && m.rate !== undefined) excess = p + margin - m.rate;
      } else if (margin !== null && Number.isFinite(margin) && m.primeMargin !== undefined) excess = margin - m.primeMargin;
    } else if (m.rate !== undefined) excess = Number(r.rate) - m.rate;
    if (excess !== null) out.push({ id: r.id, track, month, excess: Math.round(excess * 100) / 100, allPurpose: ap });
  }
  return out;
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN;
};

export function resolveTier(rows: ImportedLoan[], analysis: Analysis | null | undefined, profile: ClientProfile): TierInfo {
  const evidence = pricingRecord(rows);
  const med = median(evidence.map((e) => e.excess));
  const premiumFromRecord = Number.isFinite(med) ? Math.min(PREMIUM_CLAMP[1], Math.max(PREMIUM_CLAMP[0], med)) : PREMIUM_CLAMP[0];
  const bankAll: TrackKey[] = ["prime", "klz", "kz", "mlz", "mz"];
  const base = (tier: PricingTier, why: string, blocked: string | null = null, short = why): TierInfo => ({
    tier,
    why,
    short,
    premium: tier === "bankPremium" ? premiumFromRecord : 0,
    tracks: tier === "nonbank" ? NONBANK.tracks : bankAll,
    maxYears: tier === "nonbank" ? NONBANK.maxYears : 30,
    openingFee: tier === "nonbank" ? NONBANK.openingFee : 0,
    blocked,
    evidence,
  });

  // Hard signals first: what no bank refinances.
  const flags = new Set((analysis?.flags ?? []).map((f) => f.id));
  const insolvency = flags.has("insolvency") || (analysis?.legal.insolvency.length ?? 0) > 0;
  const arrearsNow = flags.has("arrears-now");
  const enforced = flags.has("execution") || (analysis?.legal.executionOpen.length ?? 0) > 0;
  const blocked = insolvency
    ? "בדוח מופיע הליך חדלות פירעון, ואשראי חדש מותנה באישור הנאמן או בית המשפט. אין לבנות עליו תמהיל."
    : null;

  if (profile.tier !== "auto") {
    const t = base(profile.tier, "נקבע ידנית בפרופיל הלקוח.", blocked);
    return t;
  }
  if (insolvency || arrearsNow || enforced) {
    const what = [insolvency && "הליך חדלות פירעון", arrearsNow && "פיגור פעיל בתשלומים", enforced && "תיק הוצאה לפועל פתוח"].filter(Boolean).join(", ");
    return base(
      "nonbank",
      `בדוח יש ${what}. בנקים כמעט אינם ממחזרים אשראי בפיגור (בספטמבר 2026 רק 4 מתוך 5,464 מחזורים פנימיים היו של חובות בעייתיים, לפי בנק ישראל), ולכן התמחור הוא של גוף חוץ־בנקאי.`,
      blocked,
      `בדוח יש ${what}, ובנקים כמעט אינם ממחזרים אשראי בפיגור.`
    );
  }
  const nonbankMortgage = rows.some((r) => r.group === "mortgage" && !r.is_guarantor && lenderOf(r.source_bank).kind === "nonbank");
  if (nonbankMortgage) return base("nonbank", "המשכנתא הקיימת היא מגוף חוץ־בנקאי, סימן שבנק לא אישר אותה.");
  // One tranche is an anecdote: the record counts when it covers two tranches
  // or half the mortgage.
  const mortgageBal = rows.filter((r) => r.group === "mortgage" && !r.is_guarantor).reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const evidenceBal = evidence.reduce((a, e) => a + (Number(rows.find((r) => r.id === e.id)?.amount) || 0), 0);
  const strong = evidence.length >= 2 || (mortgageBal > 0 && evidenceBal / mortgageBal >= 0.5);
  const rel = (x: number) => (Math.abs(x) < 0.005 ? "בדיוק בממוצע הבנקים" : `${Math.abs(x).toFixed(2)} נק׳ ${x > 0 ? "מעל ממוצע הבנקים" : "מתחת לממוצע הבנקים"}`);
  const same = evidence.some((e) => e.allPurpose) ? "באותו חודש ובאותה מטרה, דיור או כל מטרה" : "באותו חודש";
  if (evidence.length && med >= PREMIUM_EVIDENCE && strong)
    return base(
      "bankPremium",
      `מסלולי המשכנתא של הלקוח נלקחו בחציון ${rel(med)} ${same} (${evidence.length} מסלולים), ולכן בנק יתמחר אותו בתוספת סיכון של ${premiumFromRecord.toFixed(2)} נק׳.`,
      null,
      `המסלולים נלקחו בחציון ${rel(med)} ${same} (${evidence.length} מסלולים).`
    );
  if (evidence.length && med >= PREMIUM_EVIDENCE)
    return base("bank", `רק מסלול משכנתא אחד ניתן להשוואה, ${rel(med)} ${same}, וזו עדות חלשה. התמחור לפי ממוצע הבנקים, ויש לאמת.`);
  if (evidence.length) return base("bank", `מסלולי המשכנתא של הלקוח תומחרו בתנאי השוק ${same} (בחציון ${rel(med)}).`);
  return base("bank", "אין בדוח עדות לתמחור חריג, ולכן התמחור לפי ממוצע הבנקים.");
}
