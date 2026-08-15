// Every string the console shows for a machine value, and the number
// formatters. Kept apart from the aggregation so the server and the browser
// read from the same dictionary.

import type { SimEvent } from "@/app/simulator/lib/telemetry";

export const EVENT_LABEL: Record<string, string> = {
  door_entry: "כניסה מפיירברי",
  door_denied: "כניסה נדחתה",
  board_view: "פתיחת הבורד",
  import: "ייבוא דוח",
  analysis_open: "ניתוח חיווי",
  statement_analysis_open: "ניתוח משכנתא",
  summary_open: "סיכום ללקוח",
  statement_summary_open: "סיכום ללקוח (בנק)",
  schedule_open: "לוח סילוקין",
  compare_open: "השוואה",
  excel_export: "ייצוא אקסל",
  report_view: "צפייה במסמך",
  save: "שמירה",
  error: "שגיאה",
};

/** Short form, for the trail chips where space is the constraint. */
export const TRAIL_LABEL: Record<string, string> = {
  door_entry: "כניסה",
  board_view: "בורד",
  import: "ייבוא",
  analysis_open: "ניתוח חיווי",
  statement_analysis_open: "ניתוח משכנתא",
  summary_open: "סיכום",
  statement_summary_open: "סיכום בנק",
  schedule_open: "סילוקין",
  compare_open: "השוואה",
  excel_export: "אקסל",
  report_view: "מסמך",
  save: "שמירה",
  error: "שגיאה",
};

export const BANK_LABEL: Record<string, string> = {
  leumi: "לאומי",
  poalim: "הפועלים",
  mizrahi: "מזרחי טפחות",
  discount: "דיסקונט",
  mercantile: "מרכנתיל",
  igud: "אגוד",
  jerusalem: "ירושלים",
  otsar: "אוצר החייל",
  massad: "מסד",
  yahav: "יהב",
};

export const bankLabel = (b?: string | null) =>
  !b ? "—" : BANK_LABEL[b] ?? b;

export const KIND_LABEL: Record<string, string> = {
  credit: "חיווי אשראי",
  bank: "דוח בנק",
};

/** Why a door was refused — the reason codes the fb route emits. */
export const DENY_LABEL: Record<string, string> = {
  invalid: "מזהה לא מוכר",
  expired: "הקישור פג",
  missing: "פרטים חסרים",
  "no-secret": "המפתח לא מוגדר",
  "bad-signature": "חתימה שגויה",
  noenv: "שרת לא מוגדר",
  unavailable: "פיירברי לא זמין",
  server: "תקלת שרת",
};

export const num = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("he-IL");

export const nis = (n: number | null | undefined) =>
  n == null || n === 0 ? "—" : "₪" + Math.round(n).toLocaleString("he-IL");

export const ms = (n: number | null | undefined) =>
  n == null || n <= 0
    ? "—"
    : n < 1000
      ? `${n} מ״ש`
      : `${(n / 1000).toFixed(1)} שנ׳`;

export const duration = (minutes: number) =>
  minutes < 1 ? "רגע" : minutes < 60 ? `${minutes} דק׳` : `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")} שע׳`;

/** Two-letter monogram for the operator chip. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[1][0];
}

/**
 * A stable colour per operator, so the same person keeps the same chip across
 * views and across reloads. Identity follows the entity, never its rank —
 * filtering the table must not repaint anyone.
 */
const CHIP = ["#1F63D6", "#E2701F", "#0E9B84", "#8A5CF0", "#B4436C", "#2B7F9E"];
export function chipColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CHIP[h % CHIP.length];
}

/** What a single event line says in the live feed. */
export function feedLine(e: SimEvent): string {
  const who = e.operator || "מישהו";
  const lead = e.lead_name || (e.lead_id ? `ליד ${e.lead_id}` : "");
  switch (e.event) {
    case "door_entry":
      return `${who} נכנס${lead ? ` ל${lead}` : ""}`;
    case "door_denied":
      return `כניסה נדחתה — ${DENY_LABEL[e.error ?? ""] ?? e.error ?? "לא ידוע"}`;
    case "board_view":
      return `הבורד נפתח${lead ? ` — ${lead}` : ""}`;
    case "import":
      return e.ok === false
        ? `ייבוא נכשל${e.file_name ? ` — ${e.file_name}` : ""}`
        : `${who} ייבא ${e.kind === "bank" ? bankLabel(e.bank) : "חיווי אשראי"}${e.client_name ? ` של ${e.client_name}` : ""}`;
    case "save":
      return e.ok === false ? `שמירה נכשלה${lead ? ` — ${lead}` : ""}` : `${who} שמר תמהיל${lead ? ` ל${lead}` : ""}`;
    case "excel_export":
      return `${who} ייצא אקסל`;
    case "error":
      return `שגיאה — ${e.error ?? "לא ידוע"}`;
    default:
      return `${EVENT_LABEL[e.event] ?? e.event}${lead ? ` — ${lead}` : ""}`;
  }
}
