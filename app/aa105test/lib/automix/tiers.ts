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
 * 8.5–9% nominal range), 30 years, 1% opening fee.
 *
 * Directive 329 does not bind non-banks: circular ח-06-2852 (30/06/2026) is
 * addressed to banking corporations and stablecoin payment licensees only
 * (https://boi.org.il/media/hjrlkrse/h2852.pdf). A non-bank mix is held to the
 * law that does bind its lender (חוק אשראי הוגן, index.ts FAIR_CREDIT) and to
 * the lender's own policy (NONBANK_LTV); the engine's practice guardrails
 * (linked share, tranche count) still apply.
 */
export const NONBANK = {
  primeMargin: 4,
  kzRate: 7.4,
  maxYears: 30,
  openingFee: 0.01,
  tracks: ["prime", "kz"] as TrackKey[],
  source: "Midroog, Mimun Yashir Mortgages Series 5 pool report 10/11/2026; State Comptroller 2025; Bizportal 03/2026",
};

/**
 * The non-bank price ladder by the client's grade (research-nonbank-distress §1).
 * No lender, rating agency or regulator publishes prices by borrower grade (the
 * Capital Market Authority declined to publish non-bank rates because the
 * borrowers are often "לווים שסורבו במערכת הבנקאית": State Comptroller, June
 * 2026, non-bank chapter,
 * https://library.mevaker.gov.il/sites/DigitalLibrary/Documents/2026/Economic-Report/2026-Economic-Report-201.pdf),
 * so the ladder is SPREADS OVER GRADE A, anchored on the few published prices:
 *
 *   A  +0.0  clean borrower choosing a non-bank: Mimun Yashir, "about 7.5%" vs
 *            banks' "about 5% linked" (CEO, Nadlan Center 23/06/2026,
 *            https://www.nadlancenter.co.il/article/14773); average lending rate
 *            8.5–9% (Comptroller); variable P+4.2 in 2024 (Bizportal 24/03/2025).
 *   B  +1.5  refused by a bank, a non-bank mortgage today, or debt past its
 *            term: Meitav Mimun's published floor for borrowers who do not meet
 *            bank underwriting is prime + 5.5 (https://www.meitav.co.il/loans/),
 *            and the one printed ladder puts a "medium" borrower (past
 *            enforcement, liens) 1–2 points over a good one (Calcalist
 *            advertorial 03/08/2021, https://www.calcalist.co.il/article/h1fmsvljk;
 *            UNVERIFIED, used as a spread only). Its midpoint is Meitav's floor.
 *   C  +3.0  arrears now or an open enforcement file: the same advertorial's
 *            "bad" borrower (restricted account, enforcement, bankruptcy), 2–4
 *            points over a good one; inside Meitav's P+5.5 to P+10.5.
 *   D  +6.5  in insolvency or bankruptcy proceedings: no lender was found that
 *            offers this; priced at the TOP of the only published range for
 *            borrowers banks refuse (Meitav, prime + 10.5). The law's ceiling
 *            stops it (index.ts FAIR_CREDIT), and any credit needs the
 *            Official Receiver's approval (Insolvency Law §123).
 *
 * Second lien behind a bank mortgage: +1.5, an ESTIMATE. No lender publishes
 * the premium; Mimun Yashir's all-second-lien Series 4 pays its senior notes
 * 7.00% linked or BoI + 5.50 with positive excess spread (S&P Maalot final
 * rating 12/07/2026, https://www.maalot.co.il/Publications/5049/FRDir20260712085550.pdf),
 * which puts its loans above grade A's 7.40% / P+4.00; the research reads the
 * gap at 1.5–2.5 points and the low end is used. S&P assumes about 3.2 times
 * the default frequency of a first-lien pool, so the estimate is not generous.
 *
 * Opening fee 1% at every grade: the Comptroller found 1% at one lender and
 * 0.5% capped at ₪25,000 at another; the higher is used. It replaces the bank
 * file fee (the ₪360 cap binds non-banks only on sole-home purchase loans) and
 * counts inside the Fair Credit cost ceiling.
 */
export const LADDER_SPREAD: Record<Grade, number> = { A: 0, B: 1.5, C: 3, D: 6.5 };
export const SECOND_LIEN_SPREAD = 1.5;
const GRADE_LABEL: Record<Grade, string> = { A: "לקוח תקין", B: "סירוב בנק או חוב שמועד פירעונו חלף", C: "פיגור פעיל או תיק הוצאה לפועל", D: "הליך חדלות פירעון" };
const GRADE_NAME: Record<Grade, string> = { A: "א", B: "ב", C: "ג", D: "ד" };
export const LADDER: Record<Grade, { primeMargin: number; kzRate: number; secondLien: number; openingFee: number; label: string }> = Object.fromEntries(
  (["A", "B", "C", "D"] as Grade[]).map((g) => [
    g,
    { primeMargin: NONBANK.primeMargin + LADDER_SPREAD[g], kzRate: NONBANK.kzRate + LADDER_SPREAD[g], secondLien: SECOND_LIEN_SPREAD, openingFee: NONBANK.openingFee, label: GRADE_LABEL[g] },
  ])
) as never;

/** The grade's price in one sentence, for pricing.tierWhy. */
export function gradeWords(grade: Grade): string {
  const g = LADDER[grade];
  return `דרגת סיכון ${GRADE_NAME[grade]} (${g.label}): פריים ועוד ${g.primeMargin.toFixed(2)} וק"צ ${g.kzRate.toFixed(2)}% בשעבוד ראשון, ועוד ${g.secondLien.toFixed(2)} נק׳ בשעבוד שני (הערכה).`;
}

/**
 * A non-bank lender's own LTV policy — no law sets one (the CMA has no numeric
 * cap; circular 2020-10-4 forbids lending on collateral alone and requires
 * verified income). First lien: Mimun Yashir lends to 80% (CEO 06/2026; S&P
 * Maalot: original LTV up to 80% in its underwriting). First + second combined:
 * the all-second-lien Series 4 pool's underwriting cap is 80% including the
 * prior-ranking balance (S&P Maalot 12/07/2026; average 67%). Now-On's 85%
 * (secondary) and the Comptroller's "in practice up to about 90%" are higher;
 * the published underwriting cap is used.
 */
export const NONBANK_LTV = { first: 0.8, combined: 0.8 };

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
  /** No lender will refinance this file now — why (null under the override). */
  blocked: string | null;
  evidence: TierEvidence[];
  /**
   * The client's own record in one figure: the median excess over the market of
   * the day, and whether it covers enough of the mortgage to count (two tranches
   * or half the balance). null when nothing could be compared.
   */
  record: { median: number; strong: boolean } | null;
  /**
   * The non-bank risk grade the condition puts the client in (see LADDER):
   * A clean · B bank refusal, a non-bank mortgage today or debts past due ·
   * C arrears or enforcement · D insolvency. Bank tiers carry it too, for the
   * override's caveat ("a bank would normally refuse").
   */
  grade: Grade;
};

export type Grade = "A" | "B" | "C" | "D";

/** What in the client's condition the tier reads beyond the analysis flags (from condition.ts). */
export type TierOptions = { override?: boolean; pastDue?: boolean };

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

export function resolveTier(rows: ImportedLoan[], analysis: Analysis | null | undefined, profile: ClientProfile, opts: TierOptions = {}): TierInfo {
  const evidence = pricingRecord(rows);
  const med = median(evidence.map((e) => e.excess));
  const premiumFromRecord = Number.isFinite(med) ? Math.min(PREMIUM_CLAMP[1], Math.max(PREMIUM_CLAMP[0], med)) : PREMIUM_CLAMP[0];
  const bankAll: TrackKey[] = ["prime", "klz", "kz", "mlz", "mz"];
  // Hard signals first: what no bank refinances.
  const flags = new Set((analysis?.flags ?? []).map((f) => f.id));
  const insolvency = flags.has("insolvency") || (analysis?.legal.insolvency.length ?? 0) > 0;
  const arrearsNow = flags.has("arrears-now");
  const enforced = flags.has("execution") || (analysis?.legal.executionOpen.length ?? 0) > 0;
  const nonbankMortgage = rows.some((r) => r.group === "mortgage" && !r.is_guarantor && lenderOf(r.source_bank).kind === "nonbank");
  // History a bank's underwriter reads (BDI keeps three years): non-payment
  // records the bureau reports, and enforcement files closed since. Neither is
  // a refusal on its own; both cost the client the clean grade.
  const nonpayBureau = (analysis?.flags ?? []).some((f) => f.id === "nonpayment" && (f as { severity?: string }).severity === "critical");
  const closedFiles = flags.has("execution-closed");
  const grade: Grade = insolvency ? "D" : arrearsNow || enforced ? "C" : nonbankMortgage || opts.pastDue || nonpayBureau || closedFiles ? "B" : "A";
  const mortgageBal0 = rows.filter((r) => r.group === "mortgage" && !r.is_guarantor).reduce((a, r) => a + (Number(r.amount) || 0), 0);
  const evidenceBal0 = evidence.reduce((a, e) => a + (Number(rows.find((r) => r.id === e.id)?.amount) || 0), 0);
  const record = evidence.length && Number.isFinite(med) ? { median: med, strong: evidence.length >= 2 || (mortgageBal0 > 0 && evidenceBal0 / mortgageBal0 >= 0.5) } : null;
  const base = (tier: PricingTier, why: string, blocked: string | null = null, short = why): TierInfo => ({
    grade,
    tier,
    why: tier === "nonbank" ? `${why} ${gradeWords(grade)}` : why,
    short,
    premium: tier === "bankPremium" ? premiumFromRecord : 0,
    tracks: tier === "nonbank" ? NONBANK.tracks : bankAll,
    maxYears: tier === "nonbank" ? NONBANK.maxYears : 30,
    openingFee: tier === "nonbank" ? NONBANK.openingFee : 0,
    blocked,
    evidence,
    record,
  });

  const blocked =
    insolvency && !opts.override ? "בדוח מופיע הליך חדלות פירעון, ואשראי חדש מותנה באישור הנאמן או בית המשפט. אין לבנות עליו תמהיל." : null;

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
  if (nonbankMortgage) return base("nonbank", "המשכנתא הקיימת היא מגוף חוץ־בנקאי, סימן שבנק לא אישר אותה.");
  // Under the override, debts left unpaid past their due date put the file outside a bank's appetite.
  if (opts.override && opts.pastDue)
    return base(
      "nonbank",
      "בדוח יש חובות שמועד פירעונם חלף ולא נפרעו, ובנק לא ממחזר אשראי לפני שהם מוסדרים, ולכן התמחור הוא של גוף חוץ־בנקאי.",
      null,
      "בדוח חובות שמועד פירעונם חלף, ובנק לא ממחזר לפני שהם מוסדרים."
    );
  if (nonpayBureau && !(record?.strong && record.median >= PREMIUM_EVIDENCE)) {
    const t = base(
      "bankPremium",
      `בדוח רשומות אי עמידה בפירעון שמועברות ללשכת נתוני האשראי, ובנק יתמחר את הלקוח בתוספת סיכון של ${premiumFromRecord.toFixed(2)} נק׳ (הערכה: אין תעריף מפורסם, ומסלולי הלקוח עצמם לא מראים תוספת גדולה יותר). יש לברר כל רשומה ואם הוסדרה.`,
      null,
      "בדוח אי עמידה בפירעון שמדווחת ללשכה, ובנק יתמחר בתוספת סיכון (הערכה)."
    );
    return t;
  }
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
