// A mortgage statement, read the way someone deciding whether to recycle reads it.
//
// The credit-report analysis asks whether a household is bankable. This asks a
// narrower and more actionable question: given this mortgage exactly as it
// stands, what should be changed, and what would changing it cost?
//
// The statement is the only document that can answer that. It prices every
// tranche, names its anchor and margin, says when the rate next resets, and —
// the part no credit report carries — states what breaking each tranche would
// cost today. A recycle decision is a comparison between the rate you are paying
// and the fee for escaping it, and both numbers are here.

import {
  type BankStatement,
  type BankTranche,
  type Linkage,
  type RateKind,
} from "./types";
import { show, silent, type ClientDisposition } from "@/lib/verdicts";
import { toDate, monthsBetween } from "./text";
import {
  BREAK_FEE_RATIO_HIGH,
  BREAK_FEE_RATIO_MEDIUM,
  FEE_MONTHS_OF_INTEREST_CHEAP,
  INDEXATION_DRAG_HIGH,
  LINKED_SHARE_TRIGGER,
  LONG_TERM_MONTHS,
  RESET_HORIZON_MONTHS,
  RESET_SHARE_HIGH,
  fxIsHigh,
  isDearRate,
  linkedIsHigh,
  variableSeverity,
} from "@/lib/verdicts";

export type Severity = "critical" | "high" | "medium" | "info";

export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "info"];
export const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "קריטי",
  high: "מהותי",
  medium: "לתשומת לב",
  info: "הערה",
};

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  /**
   * Whether the client hears this, and in what words. NOT optional — see the same
   * field on the credit engine's Flag. The client sheet used to keep its own list
   * of worries, so `resets` (the top-ranked finding on a real statement, ₪430,381)
   * and `linked` (63% of the balance) never reached it.
   */
  client: ClientDisposition;
  amount?: number;
  /** Which tranches it is about, so the claim can be pointed at. */
  uids?: string[];
  /** Section holding the evidence. */
  section: string;
}

/** One row of the track composition. */
export interface TrackSlice {
  key: string;
  label: string;
  balance: number;
  share: number;
  monthly: number;
  /**
   * Balance-weighted nominal rate within the slice.
   *
   * Useful as a headline and useless as a verdict: a slice holding tranches at
   * 4.98% and 3.25% averages to 4.01%, a rate printed on no line of the statement.
   * Judging dearness on it hid every expensive tranche inside a cheap track, which
   * is why `dear` below is decided per tranche instead.
   */
  rate: number | null;
  count: number;
  variable: boolean;
  linked: boolean;
  /** Longest remaining term in the slice, in whole years. */
  years: number | null;
  /** Any tranche in the slice is in arrears. */
  late: boolean;
  /** Break fee to exit the whole slice. */
  breakFee: number;
  /** At least one TRANCHE here is priced above its track's norm. */
  dear: boolean;
  dearTranches: number;
  dearBalance: number;
}

export interface RecycleCandidate {
  tranche: BankTranche;
  /** Break fee as a share of the tranche balance. */
  feeRatio: number;
  /**
   * Months of the current rate that the break fee is worth.
   *
   * The honest way to rank a recycle: a fee equal to two months of interest on
   * a 7% tranche is cheap, the same fee on a 2% tranche is not. Comparing fees
   * in shekels across tranches of different sizes and rates says nothing.
   */
  feeInMonthsOfInterest: number | null;
  /** How much interest the tranche still has left to run, undiscounted. */
  remainingInterest: number | null;
}

export const TRACK_LABEL: Record<string, string> = {
  prime: "פריים",
  "fixed-unlinked": "קבועה לא צמודה",
  "fixed-linked": "קבועה צמודה",
  "variable-unlinked": "משתנה לא צמודה",
  "variable-linked": "משתנה צמודה",
  fx: 'צמודת מט"ח',
  unknown: "לא מסווג",
};

export const TRACK_COLOR: Record<string, string> = {
  prime: "#2563eb",
  "fixed-unlinked": "#0d8b9b",
  "fixed-linked": "#14905a",
  "variable-unlinked": "#ad7804",
  "variable-linked": "#c62370",
  fx: "#6b53d8",
  unknown: "#8b93a7",
};

/** The composition key a tranche belongs to. */
export function trackKey(t: BankTranche): string {
  if (t.linkage === "fx") return "fx";
  if (t.rateKind === "prime") return "prime";
  if (t.rateKind === "unknown" || t.linkage === "unknown") return "unknown";
  const kind = t.rateKind === "variable" ? "variable" : "fixed";
  const link = t.linkage === "linked" ? "linked" : "unlinked";
  return `${kind}-${link}`;
}

export interface StatementAnalysis {
  statement: BankStatement;
  live: BankTranche[];
  totals: {
    principal: number;
    indexation: number;
    balance: number;
    payoff: number;
    monthly: number;
    breakFee: number;
    operationalFee: number;
    accruedInterest: number;
    arrears: number;
    /** Balance-weighted nominal rate across every tranche. */
    rate: number | null;
    /** The lender's own forecast all-in cost, balance-weighted. */
    forecastRate: number | null;
    /** Longest remaining term, in months. */
    longestMonths: number | null;
  };
  tracks: TrackSlice[];
  exposure: {
    variableShare: number;
    primeShare: number;
    linkedShare: number;
    fxShare: number;
    /** Balance whose rate resets within twelve months. */
    resettingWithinYear: number;
    /** Accrued index uplift as a share of principal. */
    indexationDrag: number;
  };
  /** Ranked best-first: high rate, cheap to break. */
  recycle: RecycleCandidate[];
  /** Tranches with no break fee at all — free to move. */
  freeToBreak: BankTranche[];
  /** Rate resets inside a year, soonest first. */
  upcomingResets: BankTranche[];
  findings: Finding[];
  warnings: string[];
}

/* ------------------------------------------------------------------ helpers */

/** Balance-weighted mean; unpriced tranches are excluded, not counted as zero. */
function weighted(rows: { balance: number | null; value: number | null }[]): number | null {
  let w = 0;
  let sum = 0;
  for (const r of rows) {
    if (r.value === null || !Number.isFinite(r.value) || !r.balance || r.balance <= 0) continue;
    w += r.balance;
    sum += r.balance * r.value;
  }
  return w > 0 ? Math.round((sum / w) * 100) / 100 : null;
}

/**
 * Interest still to be paid if the tranche runs to term, undiscounted.
 *
 * Total payments minus the balance. Rough by construction — it assumes the rate
 * holds, which for a variable tranche it will not — but it is the right order of
 * magnitude for weighing a break fee against what the tranche still costs.
 */
function remainingInterest(t: BankTranche): number | null {
  if (!t.monthly || !t.months || !t.balance) return null;
  const total = t.monthly * t.months;
  return Math.max(0, Math.round(total - t.balance));
}

/** Where a mortgage rate stops being ordinary, by track. */
/** Per TRANCHE, and from the one place that defines it. */
function isDear(t: BankTranche): boolean {
  return isDearRate(t.rate, t.rateKind, t.linkage);
}

/* -------------------------------------------------------------------- main */

export function analyseStatement(st: BankStatement): StatementAnalysis {
  const live = st.tranches.filter((t) => (t.balance ?? 0) > 0);
  const asOf = toDate(st.statementDate) ?? new Date();

  const sum = (f: (t: BankTranche) => number | null | undefined) =>
    live.reduce((s, t) => s + (f(t) ?? 0), 0);

  const balance = sum((t) => t.balance);
  const operationalFee = st.loans.reduce((s, l) => s + (l.printed.operationalFee ?? 0), 0);
  const trancheFees = sum((t) => t.breakFee);

  /* ---- composition */
  const byKey = new Map<string, BankTranche[]>();
  for (const t of live) {
    const k = trackKey(t);
    const at = byKey.get(k);
    if (at) at.push(t);
    else byKey.set(k, [t]);
  }
  const tracks: TrackSlice[] = Array.from(byKey.entries())
    .map(([key, ts]) => {
      const b = ts.reduce((s, t) => s + (t.balance ?? 0), 0);
      return {
        key,
        label: TRACK_LABEL[key] ?? key,
        balance: b,
        share: balance > 0 ? b / balance : 0,
        monthly: ts.reduce((s, t) => s + (t.monthly ?? 0), 0),
        rate: weighted(ts.map((t) => ({ balance: t.balance, value: t.rate }))),
        count: ts.length,
        variable: ts.some((t) => t.rateKind === "variable" || t.rateKind === "prime"),
        linked: ts.some((t) => t.linkage === "linked"),
        years: (() => {
          const m = ts.reduce((x, t) => Math.max(x, t.months ?? 0), 0);
          return m > 0 ? Math.round(m / 12) : null;
        })(),
        late: ts.some((t) => (t.arrears ?? 0) > 0),
        breakFee: ts.reduce((x, t) => x + (t.breakFee ?? 0), 0),
        dear: ts.some(isDear),
        dearTranches: ts.filter(isDear).length,
        dearBalance: ts.filter(isDear).reduce((x, t) => x + (t.balance ?? 0), 0),
      };
    })
    .sort((a, b) => b.balance - a.balance);

  const shareOf = (pred: (t: BankTranche) => boolean) =>
    balance > 0 ? live.filter(pred).reduce((s, t) => s + (t.balance ?? 0), 0) / balance : 0;

  /* ---- rate resets */
  const upcomingResets = live
    .filter((t) => {
      const d = toDate(t.nextReset);
      return d ? monthsBetween(asOf, d) <= RESET_HORIZON_MONTHS : false;
    })
    .sort((a, b) => {
      const x = toDate(a.nextReset)?.getTime() ?? 0;
      const y = toDate(b.nextReset)?.getTime() ?? 0;
      return x - y;
    });

  const principal = sum((t) => t.principal);
  const indexation = sum((t) => t.indexation);

  /* ---- recycle ranking */
  const recycle: RecycleCandidate[] = live
    .map((t) => {
      const fee = t.breakFee ?? 0;
      const b = t.balance ?? 0;
      const monthlyInterest = b && t.rate ? (b * (t.rate / 100)) / 12 : 0;
      return {
        tranche: t,
        feeRatio: b > 0 ? fee / b : 0,
        feeInMonthsOfInterest: monthlyInterest > 0 ? Math.round((fee / monthlyInterest) * 10) / 10 : null,
        remainingInterest: remainingInterest(t),
      };
    })
    // Worth moving = expensive money that is cheap to escape. Sorted by rate
    // first, then by how little the exit costs relative to that rate.
    .sort((a, b) => {
      const ra = a.tranche.rate ?? 0;
      const rb = b.tranche.rate ?? 0;
      if (Math.abs(rb - ra) > 0.05) return rb - ra;
      return (a.feeInMonthsOfInterest ?? 99) - (b.feeInMonthsOfInterest ?? 99);
    });

  const analysis: StatementAnalysis = {
    statement: st,
    live,
    totals: {
      principal,
      indexation,
      balance,
      // What it actually costs to close today: each tranche's payoff already
      // carries its own break fee, and the loan-level operational fee sits on
      // top of all of them. Adding it makes this equal the lender's own printed
      // figure to the agora.
      payoff: (sum((t) => t.payoff) || balance) + operationalFee,
      monthly: sum((t) => t.monthly),
      breakFee: trancheFees + operationalFee,
      operationalFee,
      accruedInterest: sum((t) => t.accruedInterest),
      arrears: sum((t) => t.arrears),
      rate: weighted(live.map((t) => ({ balance: t.balance, value: t.rate }))),
      forecastRate: weighted(live.map((t) => ({ balance: t.balance, value: t.forecastRate }))),
      longestMonths: live.reduce<number | null>(
        (m, t) => (t.months && (m === null || t.months > m) ? t.months : m),
        null
      ),
    },
    tracks,
    exposure: {
      variableShare: shareOf((t) => t.rateKind === "variable" || t.rateKind === "prime"),
      primeShare: shareOf((t) => t.rateKind === "prime"),
      linkedShare: shareOf((t) => t.linkage === "linked"),
      fxShare: shareOf((t) => t.linkage === "fx"),
      resettingWithinYear: upcomingResets.reduce((s, t) => s + (t.balance ?? 0), 0),
      indexationDrag: principal > 0 ? indexation / principal : 0,
    },
    recycle,
    freeToBreak: live.filter((t) => (t.breakFee ?? 0) === 0),
    upcomingResets,
    findings: [],
    warnings: st.warnings,
  };

  analysis.findings = buildFindings(analysis);
  return analysis;
}

/* ---------------------------------------------------------------- findings */

function buildFindings(a: StatementAnalysis): Finding[] {
  const out: Finding[] = [];
  const push = (f: Finding) => out.push(f);
  const money = (n: number) => Math.round(n).toLocaleString("en-US");
  const pc = (n: number) => `${Math.round(n * 100)}%`;

  /* ---- arrears first: nothing else matters until it is cleared */
  if (a.totals.arrears > 0) {
    const late = a.live.filter((t) => (t.arrears ?? 0) > 0);
    push({
      id: "arrears",
      client: show(`יש פיגור בתשלומים — ${money(a.totals.arrears)} ₪ שלא שולמו`, late.map((t) => t.uid)),
      severity: "critical",
      section: "tranches",
      title: "פיגור בתשלומים",
      detail: `${money(a.totals.arrears)} ₪ בפיגור על ${late.length === 1 ? "מסלול אחד" : `${late.length} מסלולים`}. פיגור פתוח חוסם מיחזור ומופיע בדירוג האשראי.`,
      amount: a.totals.arrears,
      uids: late.map((t) => t.uid),
    });
  }

  /* ---- the recycle case, stated in the terms it is actually decided on */
  const dear = a.recycle.filter((c) => isDear(c.tranche));
  if (dear.length) {
    const cheap = dear.filter((c) => (c.feeInMonthsOfInterest ?? 99) <= FEE_MONTHS_OF_INTEREST_CHEAP);
    // Describe the set being counted, not the set it was drawn from. The sentence
    // used to quote the MAXIMUM rate in `dear` and then say "N מסלולים בריבית X%
    // ומעלה" — every tranche it counted was at or below that figure.
    const set = cheap.length ? cheap : dear;
    const rates = set.map((c) => c.tranche.rate ?? 0).filter((r) => r > 0);
    const from = rates.length ? Math.min(...rates) : 0;
    push({
      id: "recycle",
      client: show(
        `${set.length === 1 ? "מסלול אחד" : `${set.length} מסלולים`} בריבית גבוהה — כדאי לבדוק מיחזור`,
        set.map((c) => c.tranche.uid)
      ),
      severity: cheap.length ? "high" : "medium",
      section: "recycle",
      title: cheap.length ? "מסלולים יקרים שזול לצאת מהם" : "מסלולים בריבית גבוהה",
      detail: cheap.length
        ? `${set.length === 1 ? "מסלול אחד" : `${set.length} מסלולים`} בריבית ${from.toFixed(2)}% ומעלה שעמלת היציאה מהם שווה עד ${FEE_MONTHS_OF_INTEREST_CHEAP} חודשי ריבית — המועמדים הראשונים למיחזור.`
        : `${set.length === 1 ? "מסלול אחד" : `${set.length} מסלולים`} בריבית ${from.toFixed(2)}% ומעלה, אך עמלת היציאה מהם משמעותית. כדאי לבדוק מיחזור סמוך למועד שינוי ריבית, שבו העמלה יורדת.`,
      amount: set.reduce((s, c) => s + (c.tranche.balance ?? 0), 0),
      uids: set.map((c) => c.tranche.uid),
    });
  }

  /* ---- free exits are pure opportunity and easy to miss */
  if (a.freeToBreak.length) {
    const b = a.freeToBreak.reduce((s, t) => s + (t.balance ?? 0), 0);
    push({
      id: "free",
      client: show(`${money(b)} ₪ מהמשכנתא ניתן להזיז לבנק אחר בלי עמלת יציאה`, a.freeToBreak.map((t) => t.uid)),
      severity: "info",
      section: "fees",
      title: "מסלולים בלי עמלת פירעון",
      detail: `${money(b)} ₪ ב-${a.freeToBreak.length} מסלולים שאין עליהם עמלת פירעון מוקדם — ניתן להזיז אותם ללא עלות יציאה.`,
      amount: b,
      uids: a.freeToBreak.map((t) => t.uid),
    });
  }

  /* ---- what it costs to get out, as a whole */
  if (a.totals.breakFee > 0) {
    const ratio = a.totals.balance > 0 ? a.totals.breakFee / a.totals.balance : 0;
    push({
      id: "breakfee",
      client: show(`סילוק מלא היום יעלה ${money(a.totals.breakFee)} ₪ בעמלת פירעון מוקדם`),
      severity: ratio >= BREAK_FEE_RATIO_HIGH ? "high" : ratio >= BREAK_FEE_RATIO_MEDIUM ? "medium" : "info",
      section: "fees",
      title: "עמלת פירעון מוקדם",
      detail: `${money(a.totals.breakFee)} ₪ לסילוק מלא היום — ${(ratio * 100).toFixed(2)}% מהיתרה${
        a.totals.operationalFee ? `, כולל עמלה תפעולית של ${money(a.totals.operationalFee)} ₪` : ""
      }.`,
      amount: a.totals.breakFee,
    });
  }

  /* ---- rate risk */
  const varSeverity = variableSeverity(a.exposure.variableShare);
  if (varSeverity) {
    push({
      id: "variable",
      client: show(
        `${pc(a.exposure.variableShare)} מהמשכנתא נע עם הריבית — אם הריבית תעלה, ההחזר יעלה`
      ),
      severity: varSeverity,
      section: "mix",
      title: "חשיפה גבוהה לריבית משתנה",
      detail: `${pc(a.exposure.variableShare)} מהיתרה במסלולים משתנים${
        a.exposure.primeShare > 0 ? ` (מהם ${pc(a.exposure.primeShare)} פריים)` : ""
      }. כל עליית ריבית מתגלגלת כמעט במלואה להחזר.`,
      amount: Math.round(a.totals.balance * a.exposure.variableShare),
    });
  }

  if (a.exposure.resettingWithinYear > 0) {
    const soonest = a.upcomingResets[0];
    push({
      id: "resets",
      client: show(
        `${money(a.exposure.resettingWithinYear)} ₪ מהמשכנתא יתעדכנו בריבית חדשה בשנה הקרובה${
          a.upcomingResets[0]?.nextReset ? `, הראשון ב-${a.upcomingResets[0].nextReset}` : ""
        }`,
        a.upcomingResets.map((t) => t.uid)
      ),
      severity: a.exposure.resettingWithinYear / (a.totals.balance || 1) >= RESET_SHARE_HIGH ? "high" : "medium",
      section: "resets",
      title: "שינוי ריבית בתוך שנה",
      detail: `${money(a.exposure.resettingWithinYear)} ₪ מהיתרה יעברו עדכון ריבית בשנה הקרובה${
        soonest?.nextReset ? `, הראשון ב-${soonest.nextReset}` : ""
      }. מועד שינוי הריבית הוא גם המועד שבו עמלת ההיוון מתאפסת — חלון המיחזור הזול.`,
      amount: a.exposure.resettingWithinYear,
      uids: a.upcomingResets.map((t) => t.uid),
    });
  }

  /* ---- inflation risk, and what it has already cost */
  if (linkedIsHigh(a.exposure.linkedShare)) {
    push({
      id: "linked",
      client: show(`${pc(a.exposure.linkedShare)} מהמשכנתא צמוד למדד — הקרן עצמה גדלה עם האינפלציה, לא רק ההחזר`),
      severity: "medium",
      section: "index",
      title: "חשיפה גבוהה למדד",
      detail: `${pc(a.exposure.linkedShare)} מהיתרה צמוד למדד — הקרן עצמה גדלה עם האינפלציה, לא רק ההחזר.`,
      amount: Math.round(a.totals.balance * a.exposure.linkedShare),
    });
  }
  if (a.totals.indexation > 0) {
    push({
      id: "indexation",
      client: show(
        `ההצמדה למדד הוסיפה עד היום ${money(a.totals.indexation)} ₪ לקרן — חוב שנוצר בלי שנלקחה הלוואה חדשה`
      ),
      severity: a.exposure.indexationDrag >= INDEXATION_DRAG_HIGH ? "high" : "medium",
      section: "index",
      title: "הצמדה שנצברה על הקרן",
      detail: `${money(a.totals.indexation)} ₪ נוספו לקרן בגין הצמדה — ${pc(a.exposure.indexationDrag)} מעל הקרן המקורית. זה חוב שנוצר בלי שנלקחה הלוואה חדשה.`,
      amount: a.totals.indexation,
    });
  }
  if (fxIsHigh(a.exposure.fxShare)) {
    push({
      id: "fx",
      client: show("חלק מהמשכנתא צמוד למטבע חוץ — שער החליפין משנה את הקרן ואת ההחזר, גם בלי שינוי ריבית"),
      severity: "high",
      section: "mix",
      title: 'חשיפה למטבע חוץ',
      detail: `${pc(a.exposure.fxShare)} מהיתרה צמוד למטבע חוץ. שינוי בשער החליפין משנה את הקרן ואת ההחזר גם בלי שינוי ריבית.`,
      amount: Math.round(a.totals.balance * a.exposure.fxShare),
    });
  }

  /* ---- the shape of the debt */
  const balloon = a.live.filter((t) => /בלון|בולט/.test(t.amortization));
  if (balloon.length) {
    push({
      id: "balloon",
      client: show(
        "יש מסלול בלון — הקרן כולה נפרעת בסוף התקופה, וההחזר החודשי היום אינו משקף אותה",
        balloon.map((t) => t.uid)
      ),
      severity: "high",
      section: "tranches",
      title: "מסלולי בלון",
      detail: `${balloon.length} מסלולים שהקרן בהם נפרעת בסוף התקופה. ההחזר החודשי הנוכחי אינו משקף את החבות.`,
      amount: balloon.reduce((s, t) => s + (t.balance ?? 0), 0),
      uids: balloon.map((t) => t.uid),
    });
  }

  if (a.totals.longestMonths && a.totals.longestMonths >= 300) {
    push({
      id: "term",
      client: show("המשכנתא ארוכה מאוד — ככל שהתקופה ארוכה, סך הריבית שתשולם גדול יותר"),
      severity: "info",
      section: "tranches",
      title: "טווח ארוך",
      detail: `המסלול הארוך רץ עוד ${Math.round(a.totals.longestMonths / 12)} שנים. קיצור טווח על מסלול אחד הוא לרוב זול יותר מהורדת ריבית על כולם.`,
    });
  }

  /* ---- honesty about the reading itself */
  const apportioned = a.live.filter((t) => t.balanceApportioned);
  if (apportioned.length) {
    push({
      id: "apportioned",
      client: silent("מסביר איך חולקה יתרה שהבנק לא פירט לפי מרכיב — פרט קריאה, לא מצב הלקוח"),
      severity: "info",
      section: "tranches",
      title: "יתרה מחולקת בין מסלולים",
      detail: `הבנק אינו מפרט יתרה לכל מסלול, ולכן היתרה חולקה בין ${apportioned.length} המסלולים לפי לוח הסילוקין של כל אחד. סך החלקים שווה ליתרה המודפסת, אך יתרת מסלול בודד היא הערכה.`,
      uids: apportioned.map((t) => t.uid),
    });
  }
  const derived = a.live.filter((t) => t.monthsDerived);
  if (derived.length === a.live.length && a.live.length > 0) {
    push({
      id: "derived-term",
      client: silent("מסביר שהתקופה חושבה מתאריך הסיום ולא הודפסה — פרט קריאה, לא מצב הלקוח"),
      severity: "info",
      section: "tranches",
      title: "יתרת התקופה חושבה",
      detail: "הבנק אינו מדפיס יתרת תקופה בחודשים, והיא חושבה מתאריך הסיום מול תאריך המסמך.",
    });
  }

  return out.sort(
    (x, y) => SEVERITY_ORDER.indexOf(x.severity) - SEVERITY_ORDER.indexOf(y.severity)
  );
}

export type { BankStatement, BankTranche, Linkage, RateKind };
