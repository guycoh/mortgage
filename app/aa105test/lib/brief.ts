// The client brief, as one shape for both documents.
//
// A credit report and a bank payoff letter answer different questions, but the
// page a client is shown across the desk asks the same three of either: how much
// do we owe, what does it cost us, and what hurts. This file answers them once
// per document, so the presentation never decides a figure for itself.
//
// Nothing here is a new finding. The pains are the engines' own client lines
// (clientView.worries / clientWorries), each given the single figure that states
// it best. What IS computed here is arithmetic on the document's own numbers:
//   - interest per year/day: Σ balance × the rate the document prints, today;
//   - interest to the end:   Σ (annuity payment × months left − balance) per debt,
//     at today's rate and WITHOUT indexation — a floor, not a forecast;
//   - the slices:            balance, repayment and yearly interest per family/track.
// Every one of them is said as an estimate ("כ־") on the page and named in its note.

import type { Analysis, ClientRow, ClientView } from "@/app/aa102test/lib/analysis";
import { lenderLabel } from "@/app/aa102test/lib/lenders";
import {
  TRACK_COLOR,
  TRACK_LABEL,
  trackKey,
  type StatementAnalysis,
} from "@/lib/bank-parser/analysis";
import { rateHeat, utilisationHeat, type ClientWorry, type Severity, type WorryGroup } from "@/lib/verdicts";

export type FigureKind = "money" | "share" | "rate" | "count" | "years";

export interface BriefFigure {
  kind: FigureKind;
  value: number;
}

export interface BriefPain {
  id: string;
  tone: Severity;
  group: WorryGroup;
  /** The one number that carries the line, or null when it has none. */
  figure: BriefFigure | null;
  /** Relief rather than pain — a fee-free balance, say. Painted green. */
  good?: boolean;
  title: string;
  say: string;
  next?: string;
  uids?: string[];
}

export interface BriefSlice {
  key: string;
  label: string;
  color: string;
  balance: number;
  /** What it takes from the monthly repayment. */
  monthly: number;
  /** Balance × rate, per year. */
  interest: number;
}

export type Lens = "balance" | "monthly" | "interest";

export interface Brief {
  source: "credit" | "bank";
  who: string;
  /** "17/08/2026", or the span when several reports are read together. */
  asOf: string;
  lender?: string;
  balance: number;
  /** The repayment the document states. null when it states none. */
  monthly: number | null;
  /** Σ balance × rate — today's interest, per year. null when nothing is priced. */
  yearlyInterest: number | null;
  /** Interest still to come at today's rates, without indexation. */
  futureInterest: number | null;
  /** Of this month's repayment, the share that is interest. */
  interestShare: number | null;
  /** The last debt's end, as MM/YYYY, and how far off it is. */
  ends: { label: string; years: number } | null;
  /** Debts and lenders behind the total. */
  count: { debts: number; lenders: number };
  slices: BriefSlice[];
  /** The slice whose cost is most out of proportion to its size. */
  skew: { label: string; color: string; balanceShare: number; lens: Exclude<Lens, "balance">; lensShare: number } | null;
  pains: BriefPain[];
}

/* -------------------------------------------------------------- arithmetic */

/** Interest left on an amortising debt at a fixed rate: payment × months − balance. */
export function annuityInterest(balance: number, ratePct: number, months: number): number {
  if (!(balance > 0) || !(months > 0) || !(ratePct > 0)) return 0;
  const r = ratePct / 1200;
  const pmt = (balance * r) / (1 - Math.pow(1 + r, -months));
  return Math.max(0, pmt * months - balance);
}

const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + (f(x) || 0), 0);

/** "01/03/2051" → [2051, 3]. */
function ym(d: string): [number, number] | null {
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(d) ?? /(\d{1,2})\/(\d{4})/.exec(d);
  if (!m) return null;
  return m.length === 4 ? [Number(m[3]), Number(m[2])] : [Number(m[2]), Number(m[1])];
}

function latestEnd(items: { end: string; months: number | null }[]) {
  let best: { label: string; years: number; key: number } | null = null;
  for (const it of items) {
    if (!it.months || it.months <= 0) continue;
    const p = ym(it.end);
    if (!p) continue;
    const key = p[0] * 12 + p[1];
    if (!best || key > best.key)
      best = { key, label: `${String(p[1]).padStart(2, "0")}/${p[0]}`, years: Math.round(it.months / 12) };
  }
  return best ? { label: best.label, years: best.years } : null;
}

/** The slice most out of proportion — what a client should see first. */
function skewOf(slices: BriefSlice[], hasMonthly: boolean, skip?: string): Brief["skew"] {
  const total = { balance: sum(slices, (s) => s.balance), monthly: sum(slices, (s) => s.monthly), interest: sum(slices, (s) => s.interest) };
  if (total.balance <= 0) return null;
  let best: Brief["skew"] = null;
  let gap = 0.06; // below six points of difference there is no story to tell
  for (const s of slices) {
    // The mortgage "taking" the whole repayment of a household whose other debts
    // are in default is not a story about the mortgage.
    if (s.key === skip) continue;
    const b = s.balance / total.balance;
    for (const lens of (hasMonthly ? ["monthly", "interest"] : ["interest"]) as ("monthly" | "interest")[]) {
      if (total[lens] <= 0) continue;
      const l = s[lens] / total[lens];
      if (l - b > gap) {
        gap = l - b;
        best = { label: s.label, color: s.color, balanceShare: b, lens, lensShare: l };
      }
    }
  }
  return best;
}

const RELIEF = new Set(["free"]);

/* ---------------------------------------------------------- credit report */

const FAMILY_SLICE: Record<"mortgage" | "loan" | "card", { label: string; color: string }> = {
  mortgage: { label: "משכנתאות", color: "#5b54d6" },
  loan: { label: "הלוואות", color: "#e07b39" },
  card: { label: "כרטיסים ומסגרות", color: "#0d8b9b" },
};

export function briefFromCredit(a: Analysis): Brief {
  const v = a.clientView;
  const own = a.lines.filter((l) => l.role === "debtor" && l.balance > 0);
  const byUid = new Map(a.lines.map((l) => [l.uid, l]));
  const flagOf = new Map(a.flags.map((f) => [f.id, f]));

  // A drawn card balance costs its drawn rate; an interest-free track costs nothing.
  const rateOf = (l: (typeof own)[number]) =>
    l.category === "card" || l.category === "overdraft" ? (l.interestFree ? 0 : l.rateOnDrawn) : l.rate;
  const amortising = (l: (typeof own)[number]) =>
    l.category === "mortgage" || l.category === "loan" || l.category === "other" || l.instalment;

  const priced = own.filter((l) => (rateOf(l) ?? 0) > 0);
  const yearlyInterest = priced.length ? sum(priced, (l) => (l.balance * (rateOf(l) ?? 0)) / 100) : null;

  const amort = own.filter(amortising);
  const futureInterest = amort.some((l) => (l.months ?? 0) > 0 && (rateOf(l) ?? 0) > 0)
    ? sum(amort, (l) => annuityInterest(l.balance, rateOf(l) ?? 0, l.months ?? 0))
    : null;

  // Interest in this month's repayment, over the debts the repayment is made of.
  const monthInterest = sum(amort.filter((l) => !l.chargeNotPaid), (l) => (l.balance * (rateOf(l) ?? 0)) / 1200);
  const share = v.footer.monthly > 0 ? monthInterest / v.footer.monthly : null;

  // Slices = the client page's own sections, so every figure ties to a row.
  const sectionOf = new Map<string, "mortgage" | "loan" | "card">();
  for (const sec of v.sections) for (const r of sec.rows) for (const u of r.uids) sectionOf.set(u, sec.key);
  const slices: BriefSlice[] = v.sections
    .map((sec) => {
      const lines = Array.from(sectionOf.entries())
        .filter(([, k]) => k === sec.key)
        .map(([u]) => byUid.get(u))
        .filter((l): l is NonNullable<typeof l> => !!l && l.role === "debtor");
      return {
        key: sec.key,
        ...FAMILY_SLICE[sec.key],
        balance: sum(sec.rows, (r) => r.balance),
        // A card's ordinary bill is not a repayment; its instalment credit is.
        monthly: sum(sec.rows, (r) => (sec.key !== "card" || r.instalment ? r.monthly : 0)),
        interest: sum(lines, (l) => (l.balance * (rateOf(l) ?? 0)) / 100),
      };
    })
    .filter((s) => s.balance > 0);

  const names = a.clients.map((c) => c.name).filter(Boolean);
  const dates = a.clients
    .map((c) => c.reportDate)
    .filter((d, i, all) => !!d && all.indexOf(d) === i)
    .sort((x, y) => (x.split("/").reverse().join("") < y.split("/").reverse().join("") ? -1 : 1));

  const figure = (w: ClientWorry): BriefFigure | null => {
    const money = (n: number | undefined | null) => (n && n > 0 ? { kind: "money" as const, value: n } : null);
    const pct = (n: number | null | undefined) => (n && n > 0 ? { kind: "share" as const, value: n } : null);
    const count = (n: number | undefined) => (n && n > 0 ? { kind: "count" as const, value: n } : null);
    if (w.id.startsWith("distress:")) return money(sum((w.uids ?? []).map((u) => byUid.get(u)!).filter(Boolean), (l) => l.overdue));
    const one = (id: string): BriefFigure | null => {
      switch (id) {
        case "nonpayment": return count(a.legal.nonPayment.length);
        case "arrears-history": return a.behaviour.arrearsMonths ? { kind: "count", value: a.behaviour.arrearsMonths } : null;
        case "checks": return count(a.behaviour.checksReturned);
        case "debits": return count(a.behaviour.debitsDishonored);
        case "revolving": return a.revolving.utilization !== null ? pct(a.revolving.utilization / 100) : null;
        case "revolving-peak": return money(a.revolving.peak);
        case "card-charge": return money(a.cards.monthlyCharge);
        case "card-rolled": return money(a.cards.rolled);
        case "expensive": return a.consumer.worstRate ? { kind: "rate", value: a.consumer.worstRate } : null;
        case "variable": return pct(a.mortgage.variableShare);
        case "linked": return pct(a.mortgage.linkedShare);
        case "ltv": return pct(a.mortgage.ltv);
        case "consumer-weight": return pct(a.consumer.shareOfMonthly);
        case "shopping": return count(a.inquiries.last3);
        case "guarantor": return money(a.totals.guaranteedBalance);
        case "pending":
        case "shared":
        case "reconcile":
        case "client-status":
        case "admin":
        case "guarantor-internal":
        case "guaranteed-behaviour":
          return null;
        default:
          return money(flagOf.get(id)?.amount);
      }
    };
    for (const id of w.id.split("+")) {
      const f = one(id);
      if (f) return f;
    }
    return null;
  };

  return {
    source: "credit",
    who: names.join(" ו") || "",
    asOf: dates.length > 1 ? `${dates[0]}–${dates[dates.length - 1]}` : dates[0] ?? "",
    balance: v.footer.balance,
    monthly: v.footer.monthly > 0 ? v.footer.monthly : null,
    yearlyInterest,
    futureInterest,
    interestShare: share !== null && share > 0 && share <= 1.02 ? Math.min(1, share) : null,
    ends: latestEnd(amort.map((l) => ({ end: l.endDate, months: l.months }))),
    count: {
      debts: own.length,
      lenders: new Set(v.sections.flatMap((s) => s.rows.map((r) => r.bank))).size,
    },
    slices,
    skew: skewOf(slices, true, "mortgage"),
    pains: v.worries.map((w) => ({
      id: w.id,
      tone: w.severity,
      group: w.group,
      figure: figure(w),
      good: RELIEF.has(w.id),
      title: w.title,
      say: w.say,
      next: w.next,
      uids: w.uids,
    })),
  };
}

/* ------------------------------------------------------------- bank letter */

export function briefFromStatement(a: StatementAnalysis): Brief {
  const st = a.statement;
  const live = a.live;
  const priced = live.filter((t) => (t.rate ?? 0) > 0 && (t.balance ?? 0) > 0);
  const yearlyInterest = priced.length ? sum(priced, (t) => ((t.balance ?? 0) * (t.rate ?? 0)) / 100) : null;
  const futureInterest = priced.some((t) => (t.months ?? 0) > 0)
    ? sum(priced, (t) => annuityInterest(t.balance ?? 0, t.rate ?? 0, t.months ?? 0))
    : null;
  const monthly = a.totals.monthly > 0 && a.monthlyUnreported === 0 ? a.totals.monthly : a.totals.monthly > 0 ? a.totals.monthly : null;
  const monthInterest = sum(priced.filter((t) => (t.monthly ?? 0) > 0), (t) => ((t.balance ?? 0) * (t.rate ?? 0)) / 1200);
  const share = monthly && a.monthlyUnreported === 0 ? monthInterest / monthly : null;

  const slices: BriefSlice[] = a.tracks
    .map((t) => ({
      key: t.key,
      label: TRACK_LABEL[t.key] ?? t.label,
      color: TRACK_COLOR[t.key] ?? "#8b93a7",
      balance: t.balance,
      monthly: t.monthly,
      interest: sum(live.filter((x) => trackKey(x) === t.key), (x) => ((x.balance ?? 0) * (x.rate ?? 0)) / 100),
    }))
    .filter((s) => s.balance > 0);

  const byUid = new Map(live.map((t) => [t.uid, t]));
  const flagOf = new Map(a.findings.map((f) => [f.id, f]));
  const figure = (w: ClientWorry): BriefFigure | null => {
    const ids = w.id.split("+");
    // A merged line about the index speaks in shekels: what the CPI already added.
    if (ids.includes("indexation") && a.totals.indexation > 0) return { kind: "money", value: a.totals.indexation };
    for (const id of ids) {
      switch (id) {
        case "arrears":
          if (a.totals.arrears > 0) return { kind: "money", value: a.totals.arrears };
          break;
        case "recycle": {
          const rates = (w.uids ?? []).map((u) => byUid.get(u)?.rate ?? 0).filter((r) => r > 0);
          if (rates.length) return { kind: "rate", value: Math.max(...rates) };
          break;
        }
        case "variable":
          if (a.exposure.variableShare > 0) return { kind: "share", value: a.exposure.variableShare };
          break;
        case "linked":
          if (a.exposure.linkedShare > 0) return { kind: "share", value: a.exposure.linkedShare };
          break;
        case "fx":
          if (a.exposure.fxShare > 0) return { kind: "share", value: a.exposure.fxShare };
          break;
        case "resets":
          if (a.exposure.resettingWithinYear > 0) return { kind: "money", value: a.exposure.resettingWithinYear };
          break;
        case "breakfee":
          if (a.totals.breakFee > 0) return { kind: "money", value: a.totals.breakFee };
          break;
        case "term":
          if (a.totals.longestMonths) return { kind: "years", value: Math.round(a.totals.longestMonths / 12) };
          break;
        case "apportioned":
        case "derived-term":
        case "fee-unreported":
          break;
        default: {
          const amt = flagOf.get(id)?.amount;
          if (amt && amt > 0) return { kind: "money", value: amt };
        }
      }
    }
    return null;
  };

  return {
    source: "bank",
    who: st.client.name || "",
    asOf: st.statementDate || "",
    lender: st.bankLabel,
    balance: a.totals.balance,
    monthly,
    yearlyInterest,
    futureInterest,
    interestShare: share !== null && share > 0 && share <= 1.02 ? Math.min(1, share) : null,
    ends: latestEnd(live.map((t) => ({ end: t.endDate, months: t.months }))),
    count: { debts: live.length, lenders: 1 },
    slices,
    skew: skewOf(slices, !!monthly),
    pains: a.clientWorries.map((w) => ({
      id: w.id,
      tone: w.severity,
      group: w.group,
      figure: figure(w),
      good: RELIEF.has(w.id),
      title: w.title,
      say: w.say,
      next: w.next,
      uids: w.uids,
    })),
  };
}

/* ===================================================== the full document */
//
// Everything the page draws, as plain data — the same object the advisor
// presents on the board and the client opens from a link. Freezing it is what
// lets the shared page say exactly what was shown across the desk.

export type Heat = "hot" | "warm";

export interface DebtFact {
  text: string;
  heat?: Heat;
}

export interface DebtRow {
  key: string;
  /** The document's own name for the lender — BankIcon reads it. */
  source: string;
  name: string;
  /** A card's facility type, or a track's plain meaning. */
  kind?: string;
  /** A track colour, drawn instead of a lender's mark. */
  dot?: string;
  facts: DebtFact[];
  balance: number;
  balanceHeat?: Heat;
  /** null when no payment is made or none is on record — `monthlyLabel` says which. */
  monthly: number | null;
  monthlyLabel?: string;
  monthlyHeat?: Heat;
  monthlyNotes: string[];
  alarm?: boolean;
}

export interface DebtGroup {
  key: string;
  title: string;
  color: string;
  rows: DebtRow[];
  /** One-line facts that belong to the group but are not a row of their own. */
  lines: string[];
  total: { balance: number; monthly: number };
}

export interface Payoff {
  balance: number;
  accrued: number;
  fee: number;
  operational: number;
  payoff: number;
  /** Tranches whose fee the letter leaves blank — the fee total is short of them. */
  feeMissing: number;
  /** Balance the letter prices at a zero fee. */
  free: number;
}

export interface BriefDoc extends Brief {
  groups: DebtGroup[];
  /** The ordinary card bill, beside the repayment and never added to it. */
  cards: number;
  payoff: Payoff | null;
  /** Facts that qualify the totals — said once, at the foot of the list. */
  notes: string[];
}

const ils = (n: number) => Math.round(n).toLocaleString("en-US");
const pct1 = (n: number) => (Math.round(n * 10 + 1e-9) / 10).toFixed(1).replace(/\.0$/, "");

/* ----------------------------------------------------------- credit rows */

const NOUN: Record<ClientRow["family"], [string, string]> = {
  mortgage: ["מסלול", "מסלולים"],
  loan: ["הלוואה", "הלוואות"],
  card: ["מסגרת", "מסגרות"],
};

/** Only an amortising debt has a remaining term — said as people say it. */
function remaining(r: ClientRow): string {
  if (r.family === "card" || !r.months || r.months <= 0) return "";
  const last = r.parts > 1 ? (r.family === "mortgage" ? "המסלול האחרון מסתיים " : "ההלוואה האחרונה מסתיימת ") : "";
  if (r.months === 1) return last ? `${last}בתשלום הבא` : "נותר תשלום אחד";
  if (r.months < 24) return last ? `${last}בעוד ${r.months} חודשים` : `נותרו ${r.months} תשלומים`;
  return `${last ? `${last}בעוד` : "עוד"} כ-${Math.round(r.months / 12)} שנים`;
}

function rateText(r: ClientRow): string {
  if (r.minRate === null || r.maxRate === null || r.maxRate <= 0) return "";
  const lo = pct1(r.minRate);
  const hi = pct1(r.maxRate);
  return lo === hi ? `ריבית ${lo}%` : `ריבית ${lo}%–${hi}%`;
}

/** The monthly cell: what is charged and serviced, and what is not. */
function monthlyOf(r: ClientRow): Pick<DebtRow, "monthly" | "monthlyLabel" | "monthlyHeat" | "monthlyNotes"> {
  if (r.monthly === 0 && r.monthlyNotPaid > 0)
    return { monthly: null, monthlyLabel: "לא משולם", monthlyHeat: "hot", monthlyNotes: [`חיוב חודשי: ${ils(r.monthlyNotPaid)} ₪`] };
  if (r.monthly === 0 && r.monthlyUnreported > 0) return { monthly: null, monthlyLabel: "לא דווח", monthlyNotes: [] };
  const notes: string[] = [];
  if (r.monthlyNotPaid > 0) notes.push(`ועוד ${ils(r.monthlyNotPaid)} ₪ שאינם משולמים`);
  if (r.monthlyComputed > 0 && Math.abs(r.monthlyComputed - r.monthly) < 1) notes.push("ממוצע חודשי מחושב");
  if (r.monthlyUnreported > 0)
    notes.push(r.monthlyUnreported === 1 ? "ללא חיוב מדווח להתחייבות אחת" : `ללא חיוב מדווח ל-${r.monthlyUnreported}`);
  return { monthly: r.monthly, monthlyHeat: r.late ? "hot" : undefined, monthlyNotes: notes };
}

function lenderRow(r: ClientRow): DebtRow {
  const [one, many] = NOUN[r.family];
  const facts: DebtFact[] = [r.parts > 1 ? `${r.parts} ${many}` : one, remaining(r)]
    .filter(Boolean)
    .map((text) => ({ text }));
  const rate = rateText(r);
  if (rate) facts.push({ text: rate, heat: rateHeat(r.maxRate, r.family) === "hot" ? "hot" : undefined });
  if (r.late) facts.push({ text: `בפיגור${r.overdue > 0 ? ` ${ils(r.overdue)} ₪` : ""}`, heat: "hot" });
  return {
    key: r.uids.join(),
    source: r.bank,
    name: lenderLabel(r.bank) || r.bank,
    facts,
    balance: r.balance,
    ...monthlyOf(r),
    alarm: r.late || undefined,
  };
}

/** What a facility costs — the drawn rate, and the dearest quoted on the rest. */
function cardPricing(r: ClientRow): DebtFact | null {
  const drawn = r.rate;
  const max = r.rateMaxQuoted;
  const heat = (x: number) => (rateHeat(x, "card") === "hot" ? ("hot" as const) : undefined);
  if (drawn !== null && drawn > 0) {
    const tail = max !== null && max > drawn ? ` · עד ${max.toFixed(2)}% על יתר המסגרת` : "";
    return { text: `ריבית ${drawn.toFixed(2)}% על היתרה${tail}`, heat: heat(drawn) };
  }
  if (r.interestFree && max !== null) return { text: `היתרה ללא ריבית · עד ${max.toFixed(2)}% על יתר המסגרת`, heat: heat(max) };
  if (max !== null) return { text: `עד ${max.toFixed(2)}%`, heat: heat(max) };
  return null;
}

function cardRow(r: ClientRow): DebtRow {
  const util = r.utilization === null ? null : r.utilization / 100;
  const uh = utilisationHeat(util);
  const noCeiling = r.reported.limit && r.limit === 0 && r.balance > 0;
  const enforced = r.remarks.some((x) => /הוצאה לפועל|לא התקבל כל תשלום/.test(x));
  const facts: DebtFact[] = [];
  if (r.reported.limit && r.limit > 0) {
    facts.push({ text: `מסגרת ${ils(r.limit)} ₪` });
    if (util !== null) facts.push({ text: `נוצלו ${Math.round(r.utilization ?? 0)}%`, heat: uh ?? undefined });
  } else if (noCeiling) facts.push({ text: "לא דווחה מסגרת מאושרת", heat: "hot" });
  if (r.reported.peak && r.peak > r.balance * 1.15) facts.push({ text: `שיא חודשי: ${ils(r.peak)} ₪` });
  const price = cardPricing(r);
  if (price) facts.push(price);
  if (r.instalment) facts.push({ text: "אשראי בתשלומים" });
  if (r.late)
    facts.push({
      text: `בפיגור${r.overdue > 0 ? ` ${ils(r.overdue)} ₪` : ""}${r.arrearsRange ? ` · ${r.arrearsRange}` : ""}`,
      heat: "hot",
    });
  if (enforced) facts.push({ text: "בטיפול ההוצאה לפועל", heat: "hot" });
  return {
    key: r.uids.join(),
    source: r.bank,
    name: lenderLabel(r.bank) || r.bank,
    kind: r.type || undefined,
    facts,
    balance: r.balance,
    balanceHeat: noCeiling ? "hot" : undefined,
    ...(r.reported.monthly
      ? {
          monthly: r.monthly,
          monthlyHeat: r.rolled > 0 ? ("hot" as const) : undefined,
          monthlyNotes: r.rolled > 0 ? [`מזה ${ils(r.rolled)} ₪ לא נפרעו`] : [],
        }
      : { monthly: null, monthlyLabel: "לא דווח", monthlyNotes: [] }),
    alarm: r.late || enforced || undefined,
  };
}

/** Lenders past this fold into one line; card facilities never do. */
const MAX_ROWS = 5;

function creditGroups(v: ClientView): DebtGroup[] {
  return v.sections.map((sec) => {
    const cap = sec.key === "card" ? sec.rows.length : MAX_ROWS;
    const shown = sec.rows.slice(0, cap);
    const rest = sec.rows.slice(cap);
    const lines: string[] = [];
    if (sec.unused)
      lines.push(
        `${sec.unused.count === 1 ? "מסגרת אחת" : `${sec.unused.count} מסגרות`} ללא יתרה${
          sec.unused.limit > 0 ? ` · מסגרת כוללת ${ils(sec.unused.limit)} ₪` : ""
        }`
      );
    if (rest.length) {
      const rb = sum(rest, (r) => r.balance);
      const rm = sum(rest, (r) => r.monthly);
      lines.push(
        [`ועוד ${rest.length} ${rest.length === 1 ? "מלווה" : "מלווים"}`, rb > 0 ? `${ils(rb)} ₪ יתרה` : "", rm > 0 ? `${ils(rm)} ₪ לחודש` : ""]
          .filter(Boolean)
          .join(" · ")
      );
    }
    return {
      key: sec.key,
      title: sec.title,
      color: FAMILY_SLICE[sec.key].color,
      rows: shown.map((r) => (sec.key === "card" ? cardRow(r) : lenderRow(r))),
      lines,
      total: { balance: sum(sec.rows, (r) => r.balance), monthly: sum(sec.rows, (r) => r.monthly) },
    };
  });
}

export function docFromCredit(a: Analysis): BriefDoc {
  const v = a.clientView;
  const notes: string[] = [];
  if (v.monthlyParts.notPaid > 0) notes.push(`ההחזר החודשי אינו כולל חיובים בסך ${ils(v.monthlyParts.notPaid)} ₪ שאינם משולמים.`);
  if (v.monthlyParts.unreportedCount > 0)
    notes.push(
      `לא דווח חיוב חודשי עבור ${v.monthlyParts.unreportedCount === 1 ? "התחייבות אחת" : `${v.monthlyParts.unreportedCount} התחייבויות`}, ולכן ההחזר החודשי חלקי.`
    );
  // A computed average and the guarantees are already said where they belong
  // (the row; the ערבויות line) — repeating them here is only more text.
  if (v.cardParts.unreportedCount > 0)
    notes.push(`לא דווח חיוב עבור ${v.cardParts.unreportedCount === 1 ? "מסגרת אחת" : `${v.cardParts.unreportedCount} מסגרות`}.`);
  return { ...briefFromCredit(a), groups: creditGroups(v), cards: v.footer.cards, payoff: null, notes };
}

/* ------------------------------------------------------------- bank rows */

/** Plain words for what a track exposes the client to. */
const TRACK_PLAIN: Record<string, string> = {
  prime: "הריבית משתנה עם ריבית בנק ישראל",
  "fixed-unlinked": "ריבית קבועה, ללא הצמדה",
  "fixed-linked": "ריבית קבועה, הצמדה למדד",
  "variable-unlinked": "מתעדכנת מדי כמה שנים",
  "variable-linked": "מתעדכנת וצמודה למדד",
  fx: "צמודה למטבע חוץ",
};

export function docFromStatement(a: StatementAnalysis): BriefDoc {
  const st = a.statement;
  const rows: DebtRow[] = a.tracks.map((t) => {
    const facts: DebtFact[] = [];
    if (t.years) facts.push({ text: t.count > 1 ? `המסלול האחרון מסתיים בעוד כ-${t.years} שנים` : `עוד כ-${t.years} שנים` });
    if (t.count > 1) facts.push({ text: `${t.count} מסלולים` });
    if (t.rate !== null)
      facts.push({ text: `${t.count > 1 ? "ריבית ממוצעת" : "ריבית"} ${t.rate.toFixed(2)}%`, heat: t.dear ? "hot" : undefined });
    if (t.dear && t.dearTranches < t.count)
      facts.push({ text: `${t.dearTranches === 1 ? "מסלול אחד" : `${t.dearTranches} מסלולים`} בריבית גבוהה`, heat: "hot" });
    if (t.late) facts.push({ text: "בפיגור", heat: "hot" });
    return {
      key: t.key,
      source: st.bankLabel,
      name: TRACK_LABEL[t.key] ?? t.label,
      kind: TRACK_PLAIN[t.key],
      dot: TRACK_COLOR[t.key] ?? "#8b93a7",
      facts,
      balance: t.balance,
      monthly: t.monthly > 0 ? t.monthly : null,
      monthlyLabel: t.monthly > 0 ? undefined : "לא דווח",
      monthlyHeat: t.late ? "hot" : undefined,
      monthlyNotes: [],
      alarm: t.late || undefined,
    };
  });
  const notes: string[] = [];
  if (a.monthlyUnreported > 0 && a.totals.monthly > 0)
    notes.push(`לא דווח החזר חודשי עבור ${a.monthlyUnreported === 1 ? "מסלול אחד" : `${a.monthlyUnreported} מסלולים`}, ולכן ההחזר החודשי חלקי.`);
  return {
    ...briefFromStatement(a),
    groups: [
      {
        key: "tracks",
        title: "המסלולים",
        color: "#5b54d6",
        rows,
        lines: [],
        total: { balance: a.totals.balance, monthly: a.totals.monthly },
      },
    ],
    cards: 0,
    payoff: {
      balance: a.totals.balance,
      accrued: a.totals.accruedInterest,
      fee: a.totals.breakFee,
      operational: a.totals.operationalFee,
      payoff: a.totals.payoff,
      feeMissing: a.feeUnreported.length,
      free: sum(a.freeToBreak, (t) => t.balance ?? 0),
    },
    notes,
  };
}

/* ======================================================== the shared copy */

/**
 * What a client's link stores: the document as shown, frozen, without the row
 * ids the board uses to point findings at evidence (they mean nothing outside it).
 */
export interface BriefPayload {
  kind: "brief";
  v: 1;
  createdAt: string;
  client: string;
  advisor: { name: string; phone: string };
  doc: BriefDoc;
}

export function freezeBrief(doc: BriefDoc, client: string, advisor: { name: string; phone: string }): BriefPayload {
  return {
    kind: "brief",
    v: 1,
    createdAt: new Date().toISOString(),
    client: client.trim(),
    advisor: { name: advisor.name.trim(), phone: advisor.phone.trim() },
    doc: {
      ...doc,
      who: client.trim() || doc.who,
      pains: doc.pains.map(({ uids: _u, ...p }) => p),
      groups: doc.groups.map((g) => ({ ...g, rows: g.rows.map((r, i) => ({ ...r, key: `${g.key}-${i}` })) })),
    },
  };
}

