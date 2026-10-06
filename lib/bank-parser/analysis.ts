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
import {
  mergeWorries,
  orderWorries,
  show,
  silent,
  worryOf,
  type ClientDisposition,
  type ClientWorry,
} from "@/lib/verdicts";
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
  /** Break fee as a share of the tranche balance. null when no fee was printed. */
  feeRatio: number | null;
  /**
   * Months of the current rate that the break fee is worth.
   *
   * The honest way to rank a recycle: a fee equal to two months of interest on
   * a 7% tranche is cheap, the same fee on a 2% tranche is not. Comparing fees
   * in shekels across tranches of different sizes and rates says nothing.
   *
   * null when the statement prints no fee for the tranche. That is a gap, not a
   * zero: it used to be read as 0 and ranked the tranche among the cheapest exits.
   */
  feeInMonthsOfInterest: number | null;
  /**
   * An ESTIMATE of the interest still to run, assuming the current instalment
   * holds to term — see remainingInterest(). null where that assumption does not
   * fit the schedule; `remainingInterestWhy` then says why.
   */
  remainingInterest: number | null;
  remainingInterestWhy?: string;
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
  /**
   * Tranches whose break fee the statement prints as zero.
   *
   * ONLY a printed zero. A tranche with no fee on the page at all used to land
   * here too, so a letter that simply left the cell blank told the client those
   * shekels could move "בלי עמלה" — a claim the document never made.
   */
  freeToBreak: BankTranche[];
  /** Tranches with no break fee printed at all. Not free — unknown. */
  feeUnreported: BankTranche[];
  /**
   * Whether the lender's own loan-level fee total already equals the fees it did
   * print per tranche (plus the operational fee) for every loan holding an
   * unreported tranche — i.e. its own arithmetic leaves nothing for the blanks.
   * Evidence worth stating beside the gap; still not a reason to call them zero.
   */
  feeUnreportedCovered: boolean;
  /** Tranches with no monthly repayment printed — the monthly total is partial. */
  monthlyUnreported: number;
  /** Rate resets inside a year, soonest first. */
  upcomingResets: BankTranche[];
  findings: Finding[];
  /**
   * The findings as the client page reads them: grouped, overlapping ones folded
   * together, each a heading + the figure + the next check. Built here so the
   * page selects nothing.
   */
  clientWorries: ClientWorry[];
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
 * Current instalment × months left, minus the balance. Rough by construction — it
 * assumes the instalment holds, which for a variable or linked tranche it will not
 * — and the page says so beside the figure. Where the schedule itself says the
 * instalment is not level (a balloon repays the principal at the end, קרן שווה
 * shrinks every month) the same arithmetic is not rough but wrong, so it is not
 * offered at all; nor where the instalments would not even cover the balance.
 */
function remainingInterest(t: BankTranche): { value: number | null; why?: string } {
  if (!t.monthly || !t.months || !t.balance) return { value: null };
  if (/בלון|בולט/.test(t.amortization)) return { value: null, why: "מסלול בלון — ההחזר החודשי אינו כולל את הקרן" };
  if (/קרן\s*שווה/.test(t.amortization)) return { value: null, why: "קרן שווה — ההחזר יורד מחודש לחודש" };
  const total = t.monthly * t.months;
  if (total < t.balance) return { value: null, why: "ההחזר הנוכחי אינו מכסה את היתרה בתקופה שנותרה" };
  return { value: Math.round(total - t.balance) };
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
      // An unprinted fee stays unknown all the way down — no ratio, no ranking
      // as a cheap exit. It sorts after every priced tranche of a similar rate.
      const fee = t.breakFee;
      const b = t.balance ?? 0;
      const monthlyInterest = b && t.rate ? (b * (t.rate / 100)) / 12 : 0;
      const ri = remainingInterest(t);
      return {
        tranche: t,
        feeRatio: fee === null ? null : b > 0 ? fee / b : 0,
        feeInMonthsOfInterest:
          fee === null || monthlyInterest <= 0 ? null : Math.round((fee / monthlyInterest) * 10) / 10,
        remainingInterest: ri.value,
        remainingInterestWhy: ri.why,
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
    freeToBreak: live.filter((t) => t.breakFee === 0),
    feeUnreported: live.filter((t) => t.breakFee === null),
    feeUnreportedCovered: (() => {
      const loans = st.loans.filter((l) => l.tranches.some((t) => (t.balance ?? 0) > 0 && t.breakFee === null));
      return (
        loans.length > 0 &&
        loans.every((l) => {
          if (l.printed.breakFee === null) return false;
          const printedFees = l.tranches.reduce((s, t) => s + (t.breakFee ?? 0), 0);
          const op = l.printed.operationalFee ?? 0;
          return (
            Math.abs(l.printed.breakFee - printedFees) <= 1 ||
            Math.abs(l.printed.breakFee - printedFees - op) <= 1
          );
        })
      );
    })(),
    monthlyUnreported: live.filter((t) => !t.monthly).length,
    upcomingResets,
    findings: [],
    clientWorries: [],
    warnings: st.warnings,
  };

  analysis.findings = buildFindings(analysis);
  analysis.clientWorries = buildClientWorries(analysis);
  return analysis;
}

/**
 * The client page's list, from the findings.
 *
 * Two pairs describe the same tranches from two sides and read as repetition on
 * a page a client takes in at a glance: the variable share and the resets inside
 * it, and the linked share and the indexation already accrued on it. Each pair
 * becomes one line, every figure kept.
 */
function buildClientWorries(a: StatementAnalysis): ClientWorry[] {
  const items = a.findings.map(worryOf).filter((w): w is ClientWorry => w !== null);
  return orderWorries(
    mergeWorries(items, [
      { ids: ["variable", "resets"], title: "ריבית משתנה" },
      { ids: ["linked", "indexation"], title: "הצמדה למדד" },
    ])
  );
}

/* ---------------------------------------------------------------- findings */

function buildFindings(a: StatementAnalysis): Finding[] {
  const out: Finding[] = [];
  const push = (f: Finding) => out.push(f);
  const money = (n: number) => Math.round(n).toLocaleString("en-US");
  const pc = (n: number) => `${Math.round(n * 100)}%`;
  const date = a.statement.statementDate;
  // Every balance and fee on the page is as of the document, never "today" —
  // a fee quoted on a letter three weeks old is not what closing costs now.
  const asOf = date ? `נכון ל-${date}` : "נכון לתאריך המסמך";
  const tranches = (n: number) => (n === 1 ? "מסלול אחד" : `${n} מסלולים`);
  const inTranches = (n: number) => (n === 1 ? "במסלול אחד" : `ב-${n} מסלולים`);
  const forTranches = (n: number) => (n === 1 ? "למסלול אחד" : `ל-${n} מסלולים`);
  const noFee = (n: number) => (n === 1 ? "מסלול אחד שלא דווחה לו עמלה" : `${n} מסלולים שלא דווחה להם עמלה`);
  const rateRange = (rs: number[]) => {
    const lo = Math.min(...rs);
    const hi = Math.max(...rs);
    return lo === hi ? `${lo.toFixed(2)}%` : `${lo.toFixed(2)}%–${hi.toFixed(2)}%`;
  };
  const balanceOf = (ts: BankTranche[]) => ts.reduce((s, t) => s + (t.balance ?? 0), 0);
  const soonest = (ts: BankTranche[]) =>
    ts
      .map((t) => t.nextReset)
      .filter((d) => !!toDate(d))
      .sort((x, y) => (toDate(x)?.getTime() ?? 0) - (toDate(y)?.getTime() ?? 0))[0] ?? "";

  /* ---- arrears first: nothing else matters until it is cleared */
  if (a.totals.arrears > 0) {
    const late = a.live.filter((t) => (t.arrears ?? 0) > 0);
    push({
      id: "arrears",
      client: show(
        `במסמך מופיע סכום של ${money(a.totals.arrears)} ₪ בפיגור ${inTranches(late.length)}, ${asOf}.`,
        late.map((t) => t.uid),
        { title: `פיגור בתשלומים — ${a.statement.bankLabel}`, next: "יש לברר אם הפיגור הוסדר מאז תאריך המסמך." }
      ),
      severity: "critical",
      section: "tranches",
      title: "פיגור בתשלומים",
      // The amount sits beside the title; the sentence says where and what to check.
      // "פיגור פתוח חוסם מיחזור" was a verdict the statement cannot support.
      detail: `הפיגור רשום ${inTranches(late.length)}, ${asOf}. יש לברר אם הוסדר מאז, ולבדוק את השפעתו על אפשרות המיחזור.`,
      amount: a.totals.arrears,
      uids: late.map((t) => t.uid),
    });
  }

  /* ---- the recycle case, stated in the terms it is actually decided on */
  // A first screen, not a verdict: the rate and the fee-to-interest ratio are on
  // the page; the saving depends on an alternative offer the statement does not hold.
  const dear = a.recycle.filter((c) => isDear(c.tranche));
  if (dear.length) {
    const cheap = dear.filter((c) => (c.feeInMonthsOfInterest ?? 99) <= FEE_MONTHS_OF_INTEREST_CHEAP);
    // Describe the set being counted, not the set it was drawn from. The sentence
    // used to quote the MAXIMUM rate in `dear` and then say "N מסלולים בריבית X%
    // ומעלה" — every tranche it counted was at or below that figure.
    const set = cheap.length ? cheap : dear;
    const rates = set.map((c) => c.tranche.rate ?? 0).filter((r) => r > 0);
    const range = rates.length ? rateRange(rates) : "";
    const unreported = set.filter((c) => c.tranche.breakFee === null).length;
    const next = soonest(set.map((c) => c.tranche));
    const feeClause =
      unreported === 0
        ? `שעמלת הפירעון בהם גבוהה מ-${FEE_MONTHS_OF_INTEREST_CHEAP} חודשי ריבית`
        : unreported === set.length
          ? "שלא דווחה להם עמלת פירעון"
          : `שעמלת הפירעון בהם גבוהה מ-${FEE_MONTHS_OF_INTEREST_CHEAP} חודשי ריבית או לא דווחה`;
    push({
      id: "recycle",
      client: show(
        `${tranches(set.length)}, ביתרה של ${money(balanceOf(set.map((c) => c.tranche)))} ₪, בריבית של ${range}.`,
        set.map((c) => c.tranche.uid),
        { title: "מסלולים בריבית גבוהה", next: "כדאי לבדוק אם ניתן לשפר את התנאים." }
      ),
      severity: cheap.length ? "high" : "medium",
      section: "recycle",
      title: cheap.length ? "מסלולים בריבית גבוהה ובעמלת פירעון יחסית נמוכה" : "מסלולים בריבית גבוהה",
      detail: cheap.length
        ? `${tranches(set.length)} בריבית ${range}, שעמלת הפירעון בכל אחד מהם היא עד ${FEE_MONTHS_OF_INTEREST_CHEAP} חודשי ריבית, לפי היתרה והריבית הנוכחיות. לבדיקת חיסכון יש להשוות להצעה חלופית, כולל התקופה והעלויות הנלוות.`
        : `${tranches(set.length)} בריבית ${range}, ${feeClause}. ${
            next
              ? `מועד עדכון הריבית הבא הוא ${next}; יש לבדוק מול הבנק את עמלת הפירעון הצפויה במועד זה.`
              : "יש לבדוק מול הבנק את עמלת הפירעון הצפויה במועדי עדכון הריבית."
          }`,
      amount: balanceOf(set.map((c) => c.tranche)),
      uids: set.map((c) => c.tranche.uid),
    });
  }

  /* ---- a printed zero fee — and only a printed one */
  if (a.freeToBreak.length) {
    const b = balanceOf(a.freeToBreak);
    const op = a.totals.operationalFee;
    push({
      id: "free",
      client: show(
        `לפי המסמך, ${money(b)} ₪ מהמשכנתא ${inTranches(a.freeToBreak.length)} ללא עמלת פירעון מוקדם.`,
        a.freeToBreak.map((t) => t.uid),
        {
          title: "יתרה ללא עמלת פירעון מוקדם",
          next: op
            ? `עמלה תפעולית של ${money(op)} ₪ חלה ברמת ההלוואה; עלויות אחרות של העברה, אם יש, אינן מופיעות במסמך.`
            : "עלויות אחרות של העברה, אם יש, אינן מופיעות במסמך.",
        }
      ),
      severity: "info",
      section: "fees",
      title: "מסלולים ללא עמלת פירעון לפי המסמך",
      detail: `המסמך מציין עמלת פירעון מוקדם של 0 ₪ ${inTranches(a.freeToBreak.length)}${
        op ? `; עמלה תפעולית של ${money(op)} ₪ חלה ברמת ההלוואה` : ""
      }. היעדר עמלה למסלול אינו מכסה עלויות נלוות של העברה; יש לבדוק אותן לפני החלטה.`,
      amount: b,
      uids: a.freeToBreak.map((t) => t.uid),
    });
  }

  /* ---- a fee the statement does not state is not a zero fee */
  if (a.feeUnreported.length) {
    const b = balanceOf(a.feeUnreported);
    push({
      id: "fee-unreported",
      client: show(
        `במסמך לא מופיעה עמלת פירעון מוקדם ${forTranches(a.feeUnreported.length)}, ביתרה של ${money(b)} ₪, ולכן סכום העמלה הכולל חלקי.`,
        a.feeUnreported.map((t) => t.uid),
        {
          title: "עמלת פירעון שלא דווחה",
          next: a.feeUnreported.length === 1 ? "כדאי לבקש מהבנק את העמלה למסלול זה." : "כדאי לבקש מהבנק את העמלה למסלולים אלה.",
        }
      ),
      severity: "info",
      section: "tranches",
      title: "עמלת פירעון שלא דווחה",
      detail: `במסמך לא מופיעה עמלת פירעון ${forTranches(a.feeUnreported.length)}, ולכן אין להניח שהעמלה ${
        a.feeUnreported.length === 1 ? "בו" : "בהם"
      } היא 0${
        a.feeUnreportedCovered
          ? ". סך העמלה שהבנק הדפיס להלוואה שווה לסכום העמלות שדווחו, כך שייתכן שהעמלה אכן 0"
          : ""
      }. יש לאמת את הסכום מול הבנק.`,
      amount: b,
      uids: a.feeUnreported.map((t) => t.uid),
    });
  }

  /* ---- what it costs to get out, as a whole */
  if (a.totals.breakFee > 0) {
    const ratio = a.totals.balance > 0 ? a.totals.breakFee / a.totals.balance : 0;
    const partial = a.feeUnreported.length;
    push({
      id: "breakfee",
      client: show(
        `עמלת הפירעון המוקדם לסילוק מלא היא ${money(a.totals.breakFee)} ₪, ${asOf}${partial ? `, לא כולל ${noFee(partial)}` : ""}.`,
        undefined,
        { title: "עמלת פירעון מוקדם", next: "העמלה משתנה מיום ליום; לפני החלטה יש לבקש מהבנק סכום מעודכן." }
      ),
      severity: ratio >= BREAK_FEE_RATIO_HIGH ? "high" : ratio >= BREAK_FEE_RATIO_MEDIUM ? "medium" : "info",
      section: "fees",
      title: "עמלת פירעון מוקדם",
      detail: `${(ratio * 100).toFixed(2)}% מהיתרה, ${asOf}${
        a.totals.operationalFee ? `, כולל עמלה תפעולית של ${money(a.totals.operationalFee)} ₪` : ""
      }${partial ? `; לא כולל ${noFee(partial)}` : ""}. העמלה משתנה מיום ליום; לפני החלטה יש לבקש מהבנק סכום מעודכן.`,
      amount: a.totals.breakFee,
    });
  }

  /* ---- rate risk */
  const varSeverity = variableSeverity(a.exposure.variableShare);
  if (varSeverity) {
    push({
      id: "variable",
      client: show(`${pc(a.exposure.variableShare)} מיתרת המשכנתא במסלולים בריבית משתנה.`, undefined, {
        title: "ריבית משתנה",
        next: "ההחזר עשוי להשתנות במועדי עדכון הריבית.",
      }),
      severity: varSeverity,
      section: "mix",
      title: "חשיפה לריבית משתנה",
      detail: `${pc(a.exposure.variableShare)} מהיתרה במסלולים משתנים${
        a.exposure.primeShare > 0 ? ` (מהם ${pc(a.exposure.primeShare)} פריים)` : ""
      }. ההחזר עשוי להשתנות במועדי עדכון הריבית.`,
      amount: Math.round(a.totals.balance * a.exposure.variableShare),
    });
  }

  if (a.exposure.resettingWithinYear > 0) {
    const first = soonest(a.upcomingResets) || a.upcomingResets[0]?.nextReset || "";
    push({
      id: "resets",
      client: show(
        `${money(a.exposure.resettingWithinYear)} ₪ מהמשכנתא יעברו עדכון ריבית ב-${RESET_HORIZON_MONTHS} החודשים שלאחר תאריך המסמך${
          first ? `, הראשון ב-${first}` : ""
        }.`,
        a.upcomingResets.map((t) => t.uid),
        { title: "עדכון ריבית", next: "כדאי לבדוק לפני מועד העדכון את עמלת הפירעון הצפויה בו." }
      ),
      severity: a.exposure.resettingWithinYear / (a.totals.balance || 1) >= RESET_SHARE_HIGH ? "high" : "medium",
      section: "resets",
      title: `עדכון ריבית ב-${RESET_HORIZON_MONTHS} החודשים שלאחר תאריך המסמך`,
      // Was: "…עמלת ההיוון מתאפסת — חלון המיחזור הזול." The date is a fact on the
      // page; what the fee will be on it is a question for the bank.
      detail: `${tranches(a.upcomingResets.length)} עם עדכון ריבית בתקופה זו.${
        first ? ` מועד העדכון הקרוב הוא ${first}; יש לבדוק מול הבנק את עמלת הפירעון הצפויה במועד זה.` : ""
      }`,
      amount: a.exposure.resettingWithinYear,
      uids: a.upcomingResets.map((t) => t.uid),
    });
  }

  /* ---- inflation risk, and what it has already added */
  if (linkedIsHigh(a.exposure.linkedShare)) {
    push({
      id: "linked",
      client: show(`${pc(a.exposure.linkedShare)} מיתרת המשכנתא צמודים למדד.`, undefined, {
        title: "הצמדה למדד",
        next: "עליית המדד מגדילה את הסכום הצמוד, לצד הפחתת החוב בתשלומים.",
      }),
      severity: "medium",
      section: "index",
      title: "חשיפה למדד",
      detail: `${pc(a.exposure.linkedShare)} מהיתרה צמודים למדד. עליית המדד מגדילה את הסכום הצמוד, לצד הפחתת החוב בתשלומים.`,
      amount: Math.round(a.totals.balance * a.exposure.linkedShare),
    });
  }
  if (a.totals.indexation > 0) {
    push({
      id: "indexation",
      client: show(
        `לפי המסמך, הפרשי ההצמדה על יתרת הקרן הם ${money(a.totals.indexation)} ₪, והם כלולים ביתרת המשכנתא.`,
        undefined,
        { title: "הפרשי הצמדה" }
      ),
      severity: a.exposure.indexationDrag >= INDEXATION_DRAG_HIGH ? "high" : "medium",
      section: "index",
      title: "הפרשי הצמדה על הקרן",
      // The ratio's denominator is the principal outstanding today, not the
      // original advance — so it is not "above the original principal", and it
      // is not the indexation paid over the life of the loan.
      detail: `הפרשי הצמדה ביחס ליתרת הקרן: ${(a.exposure.indexationDrag * 100).toFixed(1)}%, ${asOf}. זהו הסכום הצמוד שנוסף ליתרת הקרן הנוכחית, ולא סך ההצמדה ששולמה לאורך חיי ההלוואה.`,
      amount: a.totals.indexation,
    });
  }
  if (fxIsHigh(a.exposure.fxShare)) {
    push({
      id: "fx",
      client: show(`${pc(a.exposure.fxShare)} מיתרת המשכנתא צמודים למטבע חוץ.`, undefined, {
        title: "הצמדה למטבע חוץ",
        next: "שינוי בשער החליפין משנה את היתרה ואת ההחזר, גם בלי שינוי ריבית.",
      }),
      severity: "high",
      section: "mix",
      title: "חשיפה למטבע חוץ",
      detail: `${pc(a.exposure.fxShare)} מהיתרה צמודים למטבע חוץ. שינוי בשער החליפין משנה את היתרה ואת ההחזר, גם בלי שינוי ריבית.`,
      amount: Math.round(a.totals.balance * a.exposure.fxShare),
    });
  }

  /* ---- the shape of the debt */
  const balloon = a.live.filter((t) => /בלון|בולט/.test(t.amortization));
  if (balloon.length) {
    push({
      id: "balloon",
      client: show(
        `${tranches(balloon.length)} מסוג בלון, ביתרה של ${money(balanceOf(balloon))} ₪: הקרן נפרעת בסוף התקופה, וההחזר החודשי אינו כולל אותה.`,
        balloon.map((t) => t.uid),
        { title: "מסלולי בלון", next: "כדאי לבדוק את מועד הפירעון ואת הסכום שיידרש בו." }
      ),
      severity: "high",
      section: "tranches",
      title: "מסלולי בלון",
      detail: `${tranches(balloon.length)} שהקרן בהם נפרעת בסוף התקופה; ההחזר החודשי הנוכחי אינו כולל את פירעון הקרן. יש לבדוק את מועד הפירעון ואת הסכום שיידרש בו.`,
      amount: balanceOf(balloon),
      uids: balloon.map((t) => t.uid),
    });
  }

  if (a.totals.longestMonths && a.totals.longestMonths >= LONG_TERM_MONTHS) {
    const years = Math.round(a.totals.longestMonths / 12);
    push({
      id: "term",
      client: show(`המסלול האחרון מסתיים בעוד כ-${years} שנים.`, undefined, {
        title: "תקופה ארוכה",
        next: "כדאי לבדוק כיצד קיצור התקופה ישפיע על ההחזר החודשי ועל סך הריבית.",
      }),
      severity: "info",
      section: "tranches",
      title: "טווח ארוך",
      // Was "קיצור טווח על מסלול אחד הוא לרוב זול יותר…" — a rule of thumb stated
      // as a finding. Which is cheaper depends on the alternatives compared.
      detail: `המסלול האחרון מסתיים בעוד כ-${years} שנים. לבדיקת קיצור התקופה יש להשוות את ההחזר ואת סך הריבית בחלופות השונות.`,
    });
  }

  /* ---- honesty about the reading itself */
  const apportioned = a.live.filter((t) => t.balanceApportioned);
  if (apportioned.length) {
    push({
      id: "apportioned",
      client: silent("מסביר איך חושבה יתרה שהבנק לא פירט לפי מרכיב — פרט קריאה, לא מצב הלקוח"),
      severity: "info",
      section: "tranches",
      title: "יתרה מוערכת למסלול",
      detail: `הבנק מדווח יתרה להלוואה ולא לכל מסלול. היתרה של ${apportioned.length} המסלולים חושבה מתוך יתרת ההלוואה, לפי לוח הסילוקין של כל מסלול; סך החלקים שווה ליתרה המודפסת. יתרת מסלול בודד היא הערכה, ולא יתרה נפרדת שהבנק דיווח.`,
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
