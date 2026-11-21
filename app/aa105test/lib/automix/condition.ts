// מצב הלקוח — what in the document stands between this client and new credit.
//
// The engine reads the client's condition from two places: the master's rows
// (what the board prices) and the board's analysis of the credit report (the
// only place arrears, enforcement files, insolvency records and the revolving
// accounts the board leaves out of the mix live — see analysis.ts).
//
// Two products:
//   · DUE DEBT — money that is owed in full NOW and is not in today's החזר
//     חודשי: rows past their end date (no term left), arrears on accounts the
//     mix leaves out (credit cards, the current account), and enforcement files
//     no such line already covers. Built on the balances the report states; it
//     adds nothing the report does not state (no interest or collection-cost
//     estimate is folded into the balance — a caveat gives the range instead).
//   · ARREARS ON ROWS IN THE MIX — a kept debt in arrears has to be brought
//     current from the new money (its overdue amount); one in serious default
//     (90+ days, or already in legal hands) has been or will be called by the
//     lender and can only be cleared in full.
//
// Blocks (types.ts) are built from this in index.ts.

import type { Analysis, DebtLine } from "@/app/aa102test/lib/analysis";
import { owedOnly, type ImportedLoan } from "@/app/aa102test/lib/credit";
import { lenderOf } from "@/app/aa102test/lib/lenders";

export type DueDebt = {
  /** A master row id (past-due rows), or "line:<uid>" / "file:<case>" for debts outside the mix. */
  id: string;
  label: string;
  balance: number;
  kind: "past-due" | "outside" | "enforcement";
  /** The master row it is, when it is one. */
  rowId: string | null;
  /** The analysis line it is, when it is one. */
  uid: string | null;
};

export type RowArrears = {
  rowId: string;
  overdue: number;
  /** 90+ days or in legal hands — the lender will not keep the loan running. */
  serious: boolean;
};

export type Condition = {
  insolvency: { kind: "bankruptcy" | "insolvency"; order: string; orderDate: string | null; stated: number | null } | null;
  enforcement: { files: number; debt: number; covered: boolean } | null;
  /** Arrears anywhere in the report (the analysis's "arrears-now" or a positive overdue total). */
  arrearsNow: boolean;
  overdueTotal: number;
  arrearsMonths: number;
  rowArrears: RowArrears[];
  due: DueDebt[];
  dueTotal: number;
};

const num = (v: unknown) => {
  const n = Number(String(v ?? "").replace(/[,₪\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const SERIOUS = /90|120|150|180/;

/**
 * The analysis line a master row came from. Identity is the report's own uid
 * (source_refs "<doc>#<uid>"), never the balance: the advisor may edit a row's
 * balance, and a row that lost its line would be counted twice (as the row and
 * again as arrears outside the mix). Two documents number their sections alike
 * ("current-1" in both), so with two candidates the lender decides, then the
 * nearest balance.
 */
function lineOf(row: ImportedLoan, lines: DebtLine[]): DebtLine | null {
  const amount = Number(row.amount) || 0;
  const cands: DebtLine[] = [];
  for (const ref of row.source_refs ?? []) {
    const uid = ref.split("#").pop() ?? "";
    for (const l of lines) if (l.uid.split(":").pop() === uid && !cands.includes(l)) cands.push(l);
  }
  if (cands.length <= 1) return cands[0] ?? null;
  const lender = lenderOf(row.source_bank).name;
  const same = cands.filter((l) => lenderOf(l.bank).name === lender);
  const pool = same.length ? same : cands;
  return pool.reduce((b, l) => (Math.abs(l.balance - amount) < Math.abs(b.balance - amount) ? l : b));
}

export function conditionOf(master: ImportedLoan[], analysis: Analysis | null | undefined): Condition {
  const owed = owedOnly(master);
  const lines = (analysis?.lines ?? []).filter((l) => l.role === "debtor");
  const used = new Set<string>();
  const rowArrears: RowArrears[] = [];
  const due: DueDebt[] = [];
  for (const r of owed) {
    const amount = Number(r.amount) || 0;
    if (amount <= 0) continue;
    const line = lineOf(r, lines);
    if (line) used.add(line.uid);
    const label = lenderOf(r.source_bank).name || "חוב";
    if (!(Number(r.months) > 0)) {
      due.push({ id: r.id, label, balance: amount, kind: "past-due", rowId: r.id, uid: line?.uid ?? null });
      continue;
    }
    if (line && line.overdue > 0)
      rowArrears.push({
        rowId: r.id,
        overdue: Math.min(line.overdue, amount),
        serious: SERIOUS.test(line.arrearsRange) || line.chargeNotPaid || line.remarks.some((x) => /הוצאה לפועל|הליך משפטי|משפטי/.test(x)),
      });
  }
  // Accounts the mix leaves out (cards, the current account) — in arrears, they are debt due now.
  for (const l of lines) {
    if (used.has(l.uid) || !(l.overdue > 0) || l.balance <= 0) continue;
    if (l.category !== "card" && l.category !== "overdraft" && l.category !== "loan" && l.category !== "mortgage") continue;
    due.push({
      id: `line:${l.uid}`,
      label: `${lenderOf(l.bank).name || l.bank}, ${l.category === "overdraft" ? "חשבון עובר ושב" : l.category === "card" ? "כרטיס אשראי" : "הלוואה"}`,
      balance: Math.round(l.balance),
      kind: "outside",
      rowId: null,
      uid: l.uid,
    });
  }
  // Enforcement files: covered when a line in arrears is already in the bureau as in enforcement's hands.
  let enforcement: Condition["enforcement"] = null;
  const open = analysis?.legal.executionOpen ?? [];
  if (open.length) {
    const debt = Math.round(analysis?.legal.executionDebt ?? 0);
    const enforcedLines = lines.filter((l) => l.remarks.some((x) => /הוצאה לפועל/.test(x)) && l.overdue > 0);
    const covered = enforcedLines.length > 0 && enforcedLines.reduce((a, l) => a + l.balance, 0) >= debt - 1;
    enforcement = { files: open.length, debt, covered };
    if (!covered && debt > 0) {
      const id = String(open[0]["197-003"] ?? "1");
      due.push({ id: `file:${id}`, label: "תיק הוצאה לפועל", balance: debt, kind: "enforcement", rowId: null, uid: null });
    }
  }
  // Insolvency: the 2018 law's proceedings, or a pre-2019 bankruptcy (פשיטת רגל, צו כינוס).
  let insolvency: Condition["insolvency"] = null;
  const ins = analysis?.legal.insolvency ?? [];
  if (ins.length) {
    const r = ins[0];
    const kind = /פשיטת רגל/.test(String(r["151-003"] ?? "")) ? "bankruptcy" : "insolvency";
    insolvency = {
      kind,
      order: String(r["151-015"] ?? r["151-003"] ?? ""),
      orderDate: (r["151-016"] as string) || (r["151-010"] as string) || null,
      stated: num(r["151-009"]) || null,
    };
  }
  const flags = new Set((analysis?.flags ?? []).map((f) => f.id));
  return {
    insolvency,
    enforcement,
    arrearsNow: flags.has("arrears-now") || (analysis?.totals.overdue ?? 0) > 0,
    overdueTotal: Math.round(analysis?.totals.overdue ?? 0),
    arrearsMonths: analysis?.behaviour.arrearsMonths ?? 0,
    rowArrears,
    due,
    dueTotal: due.reduce((a, d) => a + d.balance, 0),
  };
}
