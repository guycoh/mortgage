// The rules every proposal is held to — each with its source. Two kinds:
//
//   LAW       — Bank of Israel Proper Conduct of Banking Business Directive 329
//               ("מגבלות למתן הלוואות לדיור"), version 13 in force since
//               30/06/2026 (https://boi.org.il/media/ez4npagt/329.pdf, circular
//               2852 https://boi.org.il/media/hjrlkrse/h2852.pdf; Q&A file
//               https://www.boi.org.il/media/emunmobp/202601.pdf). A proposal
//               that breaks one is never offered.
//   PRACTICE  — what makes a legal mix one an advisor would file: researched
//               where a source exists, stated as a judgement where it does not.
//               Each binds visibly (a reason or caveat says so).

import type { PropertyType } from "./types";

/* ------------------------------------------------------------------ law */

/**
 * §7: the variable-rate part may not exceed 66.66% of the loan. §1: "variable"
 * is any part whose rate may change during the term — prime AND the 5-year
 * tracks; only a rate fixed for the whole term counts toward the third.
 * The old prime ≤ ⅓ limit was cancelled by circular 2647 (27/12/2020).
 * §7 applies to all-purpose loans too (§12.2 lets a bank exempt ≤ ₪120,000;
 * not assumed here). Q&A 5.1 (from 01/10/2026): when the same bank approves
 * new credit on the same property, the limit applies to ALL credit it secures
 * there. §9: a refinance may not create a breach or enlarge one.
 */
export const VARIABLE_MAX = 2 / 3;
export const FIXED_MIN = 1 - VARIABLE_MAX;
/** §8 */
export const TERM_MAX_YEARS = 30;
/** §5 (and §6: above 40% the loan carries a 100% risk weight — banks price that). */
export const PTI_MAX = 0.5;
export const PTI_RISK = 0.4;
/**
 * All-purpose money secured by a home (הלוואה לכל מטרה): 30 years, the same §8
 * ceiling (research-329-fees, Q&A 8.x). What banks actually grant: BoI table
 * n12b (https://www.boi.org.il/boi_files/Pikuah/n12b.xls, "הלוואות שניתנו שלא
 * למטרת מגורים בבטחון דירת מגורים"), 10/2026: average final term 23.65 years
 * overall, 24.68 for variable-rate and 21.86 for fixed-rate loans. An average of
 * 24.7 years is impossible under a 20–25-year cap, so terms out to 30 are real
 * and the cap stays at the regulatory 30.
 */
export const AP_TERM_MAX_YEARS = 30;
/** §2 purchase LTV caps; §4 counts earlier loans on the same home. */
export const LTV_MAX: Record<PropertyType, number> = { single: 0.75, replacement: 0.7, investment: 0.5 };
/** All-purpose secured by a home: 50% of the property (Q&A 2.2, 8.2); §10א (permanent since 08/02/2026) allows up to 70% when the part above 50% is at most ₪200,000 across all loans on it. */
export const AP_LTV = 0.5;
export const AP_LTV_RELIEF = 0.7;
export const AP_RELIEF_CAP = 200_000;

export const RULE = {
  fixed: "הוראה 329 סעיף 7: ריבית משתנה עד 66.66% מההלוואה",
  fixedAll: "הוראה 329 ש״ת 5.1 וסעיף 9: המגבלה חלה על כל האשראי בנכס, ומחזור לא יגדיל חריגה",
  term: "הוראה 329 סעיף 8: עד 30 שנה",
  pti: "הוראה 329 סעיף 5: שיעור החזר מהכנסה עד 50%",
  ltv: "הוראה 329 סעיף 2: שיעור מימון",
  ap: "הוראה 329 ש״ת 2.2 וסעיף 10א: הלוואה לכל מטרה עד 50% משווי הנכס (עד 70% כשהחלק שמעל 50% אינו עולה על ₪200,000)",
};

/* ------------------------------------------------------------- practice */

/**
 * CPI-linked share of NEW housing money. Not a law. Bank of Israel new-business
 * data (BIR_MRTG_99, 08/2026) puts CPI-linked tracks at ~10% of new housing
 * credit (₪1.07M of ₪10.9M); a third is three times the market's own appetite
 * and the most an advisor would put a household's money into CPI risk.
 */
export const LINKED_MAX = 1 / 3;
/**
 * One track's share of new housing money, except in the stability goal (which
 * may be all fixed). Tapers for small amounts so a mix too small to split into
 * two ₪50,000 tranches can still be one tranche:  track ≤ ⅔·N + ⅓·2·MIN.
 */
export const TRACK_SHARE_MAX = 2 / 3;
/** Smallest tranche worth opening — practice (banks rarely open a track under ~₪50k). */
export const MIN_TRANCHE = 50_000;
export const MAX_HOUSING_TRANCHES = 4;
export const MAX_AP_TRANCHES = 2;
/** Whole years only; a 5-year-reset track needs at least one full reset to be what it says. */
export const MIN_YEARS: Record<"prime" | "klz" | "kz" | "mlz" | "mz", number> = { prime: 4, klz: 4, kz: 5, mlz: 10, mz: 10 };

/**
 * The engine's own practice, not law: a refinance whose fees and costs come back
 * only after ten years is not one an advisor files on a cost goal (savings,
 * balanced, stable). Most mortgages are refinanced or repaid on a sale well
 * before their term; a recovery that long rarely arrives. Audit 2026-11-21:
 * r06 "stable" paid a ₪61,744 fee to recover it in 138 months.
 */
export const BREAK_EVEN_MAX = 120;

/**
 * קיצור שנים may raise the monthly payment up to this share above today's when
 * the advisor has not set a budget (the owner's call, 2026-11-22) — and only
 * when the higher payment ends the debt at least MATERIAL.months sooner than
 * today's payment can. A budget the advisor sets is the ceiling as given.
 */
export const YEARS_STRETCH = 0.1;

/**
 * Materiality — below these a goal is "no-gain": shown, not offered.
 *   monthly   max(₪150, 3% of today's payment)
 *   years     12 months
 *   cost      max(₪10,000, 2% of today's remaining cost)
 *   neutral   max(₪500, 0.02% of everything still to be paid today): a
 *             difference in total paid this small over the life of the loan is
 *             not a cost. It is the residue of rounding every new tranche to
 *             ₪1,000 (each thousand moved between two tracks moves the total by
 *             their difference in cost per shekel, tens to hundreds of shekels).
 *             Within it two mixes cost the same: no proposal is refused for it
 *             and no sentence quotes it as a "תוספת" or a "חיסכון". Audit
 *             2026-11-22: מאוזן refused over ₪116 (L01), ₪91 (L05), ₪131 (L36)
 *             and ₪24 (L45) on reliefs of ₪223 to ₪926 a month, and איחוד הלוואות
 *             said "תוספת של ₪3" (r01).
 */
export const MATERIAL = {
  monthly: (today: number) => Math.max(150, 0.03 * today),
  months: 12,
  cost: (todayCost: number) => Math.max(10_000, 0.02 * todayCost),
  neutral: (todayPaid: number) => Math.max(500, 0.0002 * todayPaid),
};

/**
 * One-off costs out of proportion to the debt: prepayment fees plus the new
 * loan's setup above this share of the new money, and the engine does not
 * offer the refinance (override off; with it the mix is built and the share is
 * a caveat). The engine's own practice, not a law: a bank's housing file costs
 * ₪3,108 to open (index.ts SETUP), 5% of ₪62,000, and the audit of 2026-11-22
 * found payment goals spending a third of the debt on it. L39: a ₪9,830 debt
 * with 45 months left became a ₪13,000 loan over 30 years with ₪3,048 of costs
 * (total paid ₪11.8k → ₪30.4k); L40: ₪8,485 with 25 months left, ₪12,000 new
 * money, costs 37% of the debt.
 */
export const REFI_COST_MAX = 0.05;

/**
 * A sliver: a new tranche under this share of its segment's new money. The
 * LP's vertex solutions leave ₪50,000–65,000 tranches (MIN_TRANCHE or just
 * above) beside tranches ten times larger, each with its own term (L18 payment:
 * prime 625k + קל"צ 50k + ק"צ 289k + מ"צ 50k; r01 stable: מל"צ 52k beside קל"צ
 * 968k; L44 stable: מל"צ 51k beside קל"צ 2,746k). No advisor files a ₪50k track on
 * a ₪1M mortgage: it adds a line to the contract and a reset or an index
 * exposure for a gain of a few shekels. One stays only when removing it costs
 * the goal more than SLIVER_GIVE, or a rule needs it.
 */
export const SLIVER_SHARE = 0.1;
/**
 * What a goal may give up on its own objective to drop a sliver. Cost goals:
 * 0.1% of the forecast total paid (₪2,000 on a ₪2M mortgage, a fifth of the
 * materiality of a saving). The payment goal: max(₪10, 0.2% of today's payment)
 * a month, the same order as the read-out's own rounding of several rows.
 */
export const SLIVER_GIVE = {
  cost: (todayPaid: number) => 0.001 * todayPaid,
  monthly: (today: number) => Math.max(10, 0.002 * today),
};
