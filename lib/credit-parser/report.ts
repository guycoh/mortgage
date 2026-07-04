// Presentation helpers: formatting, field grouping, KPI computation and search
// text. Pure functions shared by the dashboard components.

import { FIELD_BY_CODE, ENUM_EN, type FieldKind } from "./dictionary";
import type { CreditReport, Transaction } from "./types";

export function parseNum(v?: string): number {
  if (!v) return 0;
  const n = Number(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function formatMoney(v?: string): string {
  if (v === undefined || v === "") return "—";
  const n = parseNum(v);
  return `${n.toLocaleString("he-IL")} ₪`;
}

export function formatValue(value: string | undefined, kind: FieldKind): string {
  if (value === undefined || value === "") return "—";
  switch (kind) {
    case "money":
      return formatMoney(value);
    case "percent":
      return value.endsWith("%") ? value : `${value}%`;
    default:
      return value;
  }
}

export interface DisplayField {
  code: string;
  he: string;
  en: string;
  value: string;
  display: string;
  kind: FieldKind;
}

function field(code: string, t: Transaction): DisplayField | null {
  const def = FIELD_BY_CODE[code];
  if (!def) return null;
  const value = t.fields[code] ?? "";
  if (value === "") return null;
  return {
    code,
    he: def.he,
    en: def.en,
    value,
    display: formatValue(value, def.kind),
    kind: def.kind,
  };
}

export interface FieldGroup {
  title: string;
  fields: DisplayField[];
}

export function transactionGroups(t: Transaction): FieldGroup[] {
  const g = (title: string, codes: string[]): FieldGroup => ({
    title,
    fields: codes.map((c) => field(c, t)).filter((x): x is DisplayField => x !== null),
  });
  return [
    g("פרטי העסקה", ["201-002", "201-029", "201-030", "201-016", "201-006", "201-018", "201-023", "201-003", "201-008"]),
    g("מעורבים בעסקה", ["201-009", "201-010", "201-011"]),
    g("מהות וסטטוס", ["201-022", "201-017", "201-021"]),
    g("סכומים ותשלומים", ["201-020", "201-072", "201-049", "201-045", "201-044", "201-047", "201-046", "201-048", "201-053", "201-054", "201-055"]),
  ].filter((grp) => grp.fields.length > 0);
}

export function enumEn(value: string): string | undefined {
  return ENUM_EN[value];
}

export const SECTION_LABELS = {
  current: "חשבונות עובר ושב",
  active: "עסקאות פעילות",
  inactive: "עסקאות לא פעילות",
} as const;

export const ROLE_LABELS = {
  debtor: "חייב",
  guarantor: "ערב",
} as const;

export interface Kpis {
  debtorDebt: number;
  guarantorDebt: number;
  totalLimit: number;
  activeCount: number;
  inactiveCount: number;
  inquiries: number;
  newCredit: number;
  hasFlag: boolean;
  flagCount: number;
}

export function computeKpis(r: CreditReport): Kpis {
  let debtorDebt = 0;
  let guarantorDebt = 0;
  let totalLimit = 0;
  let activeCount = 0;
  let inactiveCount = 0;
  for (const t of r.transactions) {
    const debt = parseNum(t.fields["201-049"]);
    if (t.section === "inactive") {
      inactiveCount++;
      continue;
    }
    activeCount++;
    totalLimit += parseNum(t.fields["201-020"]) + parseNum(t.fields["201-045"]);
    if (t.role === "debtor") debtorDebt += debt;
    else guarantorDebt += debt;
  }
  return {
    debtorDebt,
    guarantorDebt,
    totalLimit,
    activeCount,
    inactiveCount,
    inquiries: r.inquiriesByDate.length,
    newCredit: r.newCreditInquiries.length,
    hasFlag: r.nonPaymentIndicators.length > 0 || r.execution.length > 0,
    flagCount: r.nonPaymentIndicators.length + r.execution.length,
  };
}

/** Build a lowercase searchable string for a transaction. */
export function transactionSearchText(t: Transaction): string {
  const parts = [
    t.source,
    t.contact.phone,
    t.contact.email,
    t.contact.address,
    SECTION_LABELS[t.section],
    ROLE_LABELS[t.role],
    ...Object.entries(t.fields).map(([code, v]) => `${FIELD_BY_CODE[code]?.he ?? ""} ${v}`),
    ...t.interestTracks.map((tr) => `${tr.type} ${tr.anchor} ${tr.nominal} ${tr.effective}`),
    ...t.collateral.map((c) => `${c.type} ${c.value} ${c.fileId}`),
    ...t.relatedCorps.map((c) => `${c.name} ${c.number} ${c.country}`),
  ];
  return parts.join(" ").toLowerCase();
}

export function matchesQuery(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return q.split(/\s+/).every((token) => text.includes(token));
}
