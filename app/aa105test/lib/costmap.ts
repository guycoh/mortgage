// מפת עלויות — what every mortgage and loan on the credit report will still cost.
//
// One population: the debts the client OWES (not guarantees), open, with a
// balance, in the repaying families (mortgage, loan, instalment credit on a
// card). For each, the rest of its life is projected from the report's own
// figures — balance, nominal rate, months left — and split three ways:
//
//   קרן       the balance today
//   ריבית     annuity interest at today's rate, in today's shekels
//   הצמדה     what CPI adds on top, at the board's annual inflation, for linked
//             tracks only (engine convention: monthly factor 1 + infl/12)
//
// so קרן + ריבית + הצמדה = everything that will still leave the account, and
// total ÷ קרן is the board's החזר לשקל. Estimates; the page says "כ-" where a
// figure is projected rather than printed.

import type { Analysis, DebtLine } from "@/app/aa102test/lib/analysis";
import { TRACK_LABEL, trackKey, type StatementAnalysis } from "@/lib/bank-parser/analysis";
import { scheduleFromText } from "@/lib/payment-shape";

export type Family = "mortgage" | "loan";
export type PainTone = "pen" | "warn";

export interface CostRow {
  uid: string;
  /** How a client tells this debt from its neighbours: track + the year it began. */
  name: string;
  family: Family;
  bank: string;
  track: string;
  purpose: string;
  startYear: string;
  endDate: string;
  original: number;
  balance: number;
  rate: number | null;
  months: number | null;
  monthly: number;
  linked: boolean;
  variable: boolean;
  interestFree: boolean;
  interest: number | null;
  indexation: number;
  total: number;
  perShekel: number | null;
  /** Share of the original advance still owed (can exceed 1 on linked debt). */
  owedShare: number | null;
  yearsHeld: number | null;
  overdue: number;
  arrearsRange: string;
  balloon: boolean;
  interestOnly: boolean;
  shared: boolean;
  marks: { text: string; tone: PainTone }[];
  /** The row's worst mark, for ordering and the rate cell's colour. */
  heat: 0 | 1 | 2;
}

export interface Pain {
  id: string;
  /** What kind of pain, in two or three words — the card's name. */
  label: string;
  tone: PainTone;
  figure: string;
  title: string;
  uids: string[];
}

export interface TrackGroup {
  label: string;
  count: number;
  balance: number;
  share: number;
  rate: number | null;
  interest: number;
  indexation: number;
  linked: boolean;
  variable: boolean;
}

export interface YearPoint {
  year: number;
  principal: number;
  interest: number;
  indexation: number;
  /** Balance left at the end of the year, nominal. */
  balance: number;
}

export interface CostMap {
  client: string;
  reportDate: string;
  inflation: number;
  rows: CostRow[];
  totals: {
    balance: number;
    monthly: number;
    interest: number;
    indexation: number;
    total: number;
    perShekel: number | null;
    rate: number | null;
    count: Record<Family, number>;
    balanceBy: Record<Family, number>;
    unpriced: number;
  };
  pains: Pain[];
  tracks: TrackGroup[];
  years: YearPoint[];
}

/* ---------------------------------------------------------------- helpers */

const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((s, x) => s + (f(x) || 0), 0);
export const ils = (n: number) => Math.round(n).toLocaleString("en-US");
export const pct = (n: number, d = 1) => {
  const k = Math.pow(10, d);
  return (Math.round(n * k + 1e-9) / k).toFixed(d).replace(/\.0+$/, "");
};
const compact = (n: number) => (n >= 1_000_000 ? `${pct(n / 1_000_000, 2)}M` : n >= 10_000 ? `${Math.round(n / 1000)}K` : ils(n));

function linkedOf(l: DebtLine): boolean {
  return l.tracks.some((t) => !/לא\s*צמוד/.test(t.linkage) && t.linkage.includes("צמוד"));
}
function variableOf(l: DebtLine): boolean {
  return /משתנה|פריים/.test(l.track) || l.tracks.some((t) => /משתנה/.test(t.type) || t.anchor.includes("פריים"));
}
function yearOf(d: string): number | null {
  const m = /(\d{4})\s*$/.exec(d.trim());
  return m ? Number(m[1]) : null;
}
function reportYear(d: string): number {
  const m = /(\d{1,2})\/(\d{4})\s*$/.exec(d.trim());
  if (!m) return new Date().getFullYear();
  return Number(m[2]) + (Number(m[1]) - 1) / 12;
}

/**
 * The rest of one debt, month by month, in the three parts.
 * Real annuity at the nominal rate; linked tracks scale every payment by CPI.
 */
function project(balance: number, ratePct: number, months: number, linked: boolean, infl: number, interestOnly: boolean) {
  const r = ratePct / 1200;
  const g = linked ? 1 + infl / 1200 : 1;
  const pmt = interestOnly ? balance * r : r > 0 ? (balance * r) / (1 - Math.pow(1 + r, -months)) : balance / months;
  const out: { principal: number; interest: number; indexation: number; balance: number }[] = [];
  let real = balance;
  let f = 1;
  for (let k = 1; k <= months; k++) {
    f *= g;
    const i = real * r;
    let p = interestOnly ? 0 : pmt - i;
    if (interestOnly && k === months) p = real;
    real = Math.max(0, real - p);
    out.push({ principal: p, interest: i, indexation: (p + i) * (f - 1), balance: real * f });
  }
  return out;
}

/* ------------------------------------------------------------------ build */

/** One debt, whichever document it came from. */
interface Debt {
  uid: string;
  family: Family;
  bank: string;
  track: string;
  purpose: string;
  startDate: string;
  endDate: string;
  original: number;
  balance: number;
  rate: number | null;
  months: number | null;
  monthly: number;
  linked: boolean;
  variable: boolean;
  interestFree: boolean;
  overdue: number;
  arrearsRange: string;
  balloon: boolean;
  interestOnly: boolean;
  shared: boolean;
  breakFee?: number | null;
}

/** From a credit report (דוח ריכוז נתונים). */
export function buildCostMap(a: Analysis, inflation: number): CostMap {
  const client = a.clients.map((c) => c.name).filter(Boolean).join(" ו");
  const reportDate = a.clients[0]?.reportDate ?? "";
  const debts: Debt[] = a.lines
    .filter(
      (l) =>
        l.role === "debtor" &&
        l.section !== "inactive" &&
        l.balance > 0 &&
        (l.category === "mortgage" || l.category === "loan" || l.category === "other" || (l.category === "card" && l.instalment))
    )
    .map((l): Debt => ({
      uid: l.uid,
      family: l.category === "mortgage" ? "mortgage" : "loan",
      bank: l.bank,
      track: l.track,
      purpose: l.purpose,
      startDate: l.startDate,
      endDate: l.endDate,
      original: l.original,
      balance: l.balance,
      rate: l.rate,
      months: l.months,
      monthly: l.chargeNotPaid ? 0 : l.monthly,
      linked: linkedOf(l),
      variable: variableOf(l),
      interestFree: l.interestFree,
      overdue: l.overdue,
      arrearsRange: l.arrearsRange,
      balloon: l.balloon,
      interestOnly: l.interestOnly,
      shared: l.shared,
    }));
  return finish(debts, client, reportDate, inflation);
}

/** From a bank payoff letter (תדפיס / אישור יתרות) — every live tranche is a row. */
export function buildCostMapFromStatement(a: StatementAnalysis, inflation: number): CostMap {
  const st = a.statement;
  const debts: Debt[] = a.live
    .filter((t) => (t.balance ?? 0) > 0)
    .map((t): Debt => ({
      uid: t.uid,
      family: "mortgage",
      bank: st.bankLabel,
      track: TRACK_LABEL[trackKey(t)] ?? "לא מסווג",
      purpose: t.purpose,
      startDate: t.startDate,
      endDate: t.endDate,
      original: t.originalAmount ?? 0,
      balance: t.balance ?? 0,
      rate: t.rate,
      months: t.months,
      monthly: t.monthly ?? 0,
      linked: t.linkage === "linked",
      variable: t.rateKind === "variable" || t.rateKind === "prime",
      interestFree: false,
      overdue: t.arrears ?? 0,
      arrearsRange: "",
      // the board's own reading of the lender's words (Leumi spells it בוליט)
      balloon: scheduleFromText(t.amortization) === 3,
      interestOnly: false,
      shared: false,
      breakFee: t.breakFee,
    }));
  return finish(debts, st.client.name, st.statementDate, inflation);
}

function finish(debts: Debt[], client: string, reportDate: string, inflation: number): CostMap {
  const nowY = reportYear(reportDate);
  const series: ReturnType<typeof project>[] = [];
  const rows: CostRow[] = debts.map((d) => {
    const family = d.family;
    const rate = d.interestFree ? 0 : d.rate;
    const linked = d.linked;
    const months = d.months && d.months > 0 ? d.months : null;
    let interest: number | null = null;
    let indexation = 0;
    if (months && rate !== null) {
      const p = project(d.balance, rate, months, linked, inflation, d.interestOnly || d.balloon);
      series.push(p);
      interest = sum(p, (x) => x.interest);
      indexation = sum(p, (x) => x.indexation);
    }
    const total = d.balance + (interest ?? 0) + indexation;
    const start = yearOf(d.startDate);
    const yearsHeld = start ? Math.max(0, nowY - start) : null;
    const owedShare = d.original > 0 ? d.balance / d.original : null;

    const marks: CostRow["marks"] = [];
    const dear = rate !== null && (family === "loan" ? rate >= 8 : rate >= 5);
    if (d.overdue > 0) marks.push({ text: `₪${ils(d.overdue)} בפיגור`, tone: "pen" });
    if (dear) marks.push({ text: `ריבית ${pct(rate!, 2)}%`, tone: "pen" });
    if (d.balloon) marks.push({ text: "תשלום בלון", tone: "pen" });
    if (d.interestOnly && !d.balloon) marks.push({ text: "משלמים רק ריבית", tone: "pen" });
    if (linked && owedShare !== null && yearsHeld !== null && yearsHeld >= 5 && owedShare >= 0.8)
      marks.push({
        text:
          owedShare >= 1
            ? `היתרה מעל הסכום המקורי`
            : `היתרה ירדה ב-${Math.round((1 - owedShare) * 100)}% ב-${Math.round(yearsHeld)} שנים`,
        tone: "warn",
      });
    if (d.breakFee && d.breakFee > 0) marks.push({ text: `עמלת פירעון מוקדם ₪${ils(d.breakFee)}`, tone: "warn" });
    const heat: CostRow["heat"] = marks.some((m) => m.tone === "pen") ? 2 : marks.length ? 1 : 0;

    return {
      uid: d.uid,
      name: [d.track || "הלוואה", start ? String(start) : ""].filter(Boolean).join(" "),
      family,
      bank: d.bank,
      track: d.track || "לא מסווג",
      purpose: d.purpose,
      startYear: start ? String(start) : "",
      endDate: d.endDate,
      original: d.original,
      balance: d.balance,
      rate,
      months,
      monthly: d.monthly,
      linked,
      variable: d.variable,
      interestFree: d.interestFree,
      interest,
      indexation,
      total,
      perShekel: interest !== null ? total / d.balance : null,
      owedShare,
      yearsHeld,
      overdue: d.overdue,
      arrearsRange: d.arrearsRange,
      balloon: d.balloon,
      interestOnly: d.interestOnly,
      shared: d.shared,
      marks,
      heat,
    };
  });

  const priced = rows.filter((r) => r.interest !== null);
  const balance = sum(rows, (r) => r.balance);
  const interest = sum(rows, (r) => r.interest ?? 0);
  const indexation = sum(rows, (r) => r.indexation);
  const total = balance + interest + indexation;
  const pricedBal = sum(priced, (r) => r.balance);
  const rateRows = rows.filter((r) => r.rate !== null);
  const rateBal = sum(rateRows, (r) => r.balance);

  const totals: CostMap["totals"] = {
    balance,
    monthly: sum(rows, (r) => r.monthly),
    interest,
    indexation,
    total,
    perShekel: pricedBal > 0 ? (pricedBal + interest + indexation) / pricedBal : null,
    rate: rateBal > 0 ? sum(rateRows, (r) => r.balance * (r.rate ?? 0)) / rateBal : null,
    count: { mortgage: rows.filter((r) => r.family === "mortgage").length, loan: rows.filter((r) => r.family === "loan").length },
    balanceBy: {
      mortgage: sum(rows.filter((r) => r.family === "mortgage"), (r) => r.balance),
      loan: sum(rows.filter((r) => r.family === "loan"), (r) => r.balance),
    },
    unpriced: rows.length - priced.length,
  };

  /* ---------------------------------------------------------------- pains */
  const pains: Pain[] = [];
  const late = rows.filter((r) => r.overdue > 0);
  if (late.length)
    pains.push({ id: "late", label: "פיגור בתשלומים", tone: "pen", figure: `₪${ils(sum(late, (r) => r.overdue))}`, title: late.length > 1 ? `לא שולמו בזמן, ב-${late.length} הלוואות` : "לא שולמו בזמן", uids: late.map((r) => r.uid) });

  // The debt that will cost the most from here — interest and CPI together.
  const future = (r: CostRow) => (r.interest ?? 0) + r.indexation;
  const costliest = rows.slice().sort((x, y) => future(y) - future(x))[0];
  if (costliest && future(costliest) > 0)
    pains.push({
      id: "costliest",
      label: "ההלוואה היקרה ביותר",
      tone: "pen",
      figure: `₪${ils(future(costliest))}`,
      title: `ריבית והצמדה צפויות על ${costliest.track}${costliest.rate !== null ? ` בריבית ${pct(costliest.rate, 2)}%` : ""}, יתרת חוב ₪${ils(costliest.balance)}`,
      uids: [costliest.uid],
    });

  // The dearest rate, when it is a real outlier and not a rounding-error balance.
  const avg = totals.rate ?? 0;
  const dearest = rows.filter((r) => (r.rate ?? 0) > 0).sort((x, y) => (y.rate ?? 0) - (x.rate ?? 0));
  if (dearest.length) {
    const top = dearest[0].rate ?? 0;
    const same = dearest.filter((r) => Math.abs((r.rate ?? 0) - top) < 0.01);
    const bal = sum(same, (r) => r.balance);
    const onlyCostliest = same.length === 1 && same[0].uid === costliest?.uid;
    if (top >= Math.max(6, avg * 1.4) && !onlyCostliest && (bal >= balance * 0.01 || sum(same, (r) => r.interest ?? 0) >= 5000))
      pains.push({
        id: "dear",
        label: "הריבית הגבוהה ביותר",
        tone: "pen",
        figure: `${pct(top, 2)}%`,
        title: `על יתרה של ₪${ils(bal)}${avg >= 1 && top / avg < 10 ? `, פי ${pct(top / avg, 1)} מהריבית הממוצעת שלכם` : ""}`,
        uids: same.map((r) => r.uid),
      });
  }

  if (indexation > interest && indexation > balance * 0.08)
    pains.push({
      id: "cpi",
      label: "הצמדה צפויה",
      tone: "warn",
      figure: `₪${ils(indexation)}`,
      title: interest > 0 ? `תוספת צפויה בגלל המדד, פי ${pct(indexation / interest, 1)} מהריבית הצפויה` : "תוספת צפויה בגלל המדד",
      uids: rows.filter((r) => r.indexation > 0).map((r) => r.uid),
    });

  const slow = rows.filter((r) => r.linked && r.yearsHeld !== null && r.yearsHeld >= 5 && r.owedShare !== null && r.owedShare >= 0.8);
  if (slow.length) {
    const orig = sum(slow, (r) => r.original);
    const bal = sum(slow, (r) => r.balance);
    const grew = bal >= orig;
    pains.push({
      id: "slow",
      label: grew ? "היתרה גדלה" : "היתרה כמעט לא ירדה",
      tone: "warn",
      figure: grew ? `+${Math.round((bal / orig - 1) * 100)}%` : `${Math.round((1 - bal / orig) * 100)}%`,
      title: grew
        ? `מעל הסכום המקורי, אחרי כ-${Math.round(sum(slow, (r) => r.yearsHeld ?? 0) / slow.length)} שנים`
        : `פחות מהסכום המקורי, אחרי כ-${Math.round(sum(slow, (r) => r.yearsHeld ?? 0) / slow.length)} שנים`,
      uids: slow.map((r) => r.uid),
    });
  }

  const balloons = rows.filter((r) => r.balloon || r.interestOnly);
  if (balloons.length)
    pains.push({ id: "balloon", label: "תשלום בלון", tone: "pen", figure: `₪${ils(sum(balloons, (r) => r.balance))}`, title: "יוחזרו בתשלום אחד בסוף התקופה", uids: balloons.map((r) => r.uid) });

  const varBal = sum(rows.filter((r) => r.variable), (r) => r.balance);
  if (balance > 0 && varBal / balance >= 0.33)
    pains.push({ id: "var", label: "ריבית משתנה", tone: "warn", figure: `${Math.round((varBal / balance) * 100)}%`, title: "מהחוב עלול להתייקר כשהריבית עולה", uids: rows.filter((r) => r.variable).map((r) => r.uid) });

  /* --------------------------------------------------------------- tracks */
  const byTrack = new Map<string, CostRow[]>();
  rows.forEach((r) => {
    const k = r.track;
    byTrack.set(k, [...(byTrack.get(k) ?? []), r]);
  });
  const tracks: TrackGroup[] = Array.from(byTrack.entries())
    .map(([label, rs]) => {
      const rr = rs.filter((r) => r.rate !== null);
      const b = sum(rr, (r) => r.balance);
      return {
        label,
        count: rs.length,
        balance: sum(rs, (r) => r.balance),
        share: balance > 0 ? sum(rs, (r) => r.balance) / balance : 0,
        rate: b > 0 ? sum(rr, (r) => r.balance * (r.rate ?? 0)) / b : null,
        interest: sum(rs, (r) => r.interest ?? 0),
        indexation: sum(rs, (r) => r.indexation),
        linked: rs.some((r) => r.linked),
        variable: rs.some((r) => r.variable),
      };
    })
    .sort((x, y) => y.balance - x.balance);

  /* ---------------------------------------------------------------- years */
  const longest = Math.max(0, ...series.map((s) => s.length));
  const years: YearPoint[] = [];
  const base = Math.floor(nowY);
  for (let y = 0; y * 12 < longest; y++) {
    const pt: YearPoint = { year: base + y, principal: 0, interest: 0, indexation: 0, balance: 0 };
    series.forEach((s) => {
      for (let m = y * 12; m < Math.min(s.length, y * 12 + 12); m++) {
        pt.principal += s[m].principal;
        pt.interest += s[m].interest;
        pt.indexation += s[m].indexation;
      }
      const end = Math.min(s.length, y * 12 + 12) - 1;
      pt.balance += end >= 0 && y * 12 + 12 <= s.length ? s[end].balance : 0;
    });
    years.push(pt);
  }

  return {
    client,
    reportDate,
    inflation,
    rows,
    totals,
    pains: ["late", "costliest", "dear", "balloon", "cpi", "slow", "var"]
      .map((id) => pains.find((p) => p.id === id))
      .filter((p): p is Pain => !!p)
      .slice(0, 4),
    tracks,
    years,
  };
}

export { compact };
