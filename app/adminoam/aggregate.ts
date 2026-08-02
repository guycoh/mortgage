// Everything the dashboard shows, computed in one pass over the raw events.
//
// Aggregation happens here, in TypeScript, rather than in SQL — deliberately.
// The store is dual until the migration is applied (Supabase table + local
// JSONL fallback), and one aggregation over a merged array is a single code
// path that cannot drift between the two. At this tool's volume (an office of
// advisors, not a public site) the window is thousands of rows, not millions.

import type { SimEvent } from "@/app/simulator/lib/telemetry";

export interface DayBucket {
  day: string; // "02/08"
  iso: string; // "2026-08-02"
  imports: number;
  views: number;
  analyses: number;
  saves: number;
  errors: number;
}

export interface OperatorRow {
  operator: string;
  sessions: number;
  imports: number;
  saves: number;
  lastSeen: string;
}

export interface LeadRow {
  lead: string;
  leadId: number | null;
  events: number;
  imports: number;
  saves: number;
  lastSeen: string;
}

/** One working visit: a person, a lead, and what they did, in order. */
export interface SessionRow {
  start: string;
  end: string;
  minutes: number;
  operator: string;
  lead: string;
  leadId: number | null;
  /** The visit's actions in the order they happened, ready to render. */
  trail: { event: string; ok: boolean; label: string }[];
  imports: number;
  saves: number;
  errors: number;
}

export interface Dashboard {
  days: number;
  kpis: {
    importsToday: number;
    imports7: number;
    importsWindow: number;
    sessionsWindow: number; // door entries
    uniqueLeads: number;
    uniqueOperators: number;
    failureRatePct: number | null; // failed imports / all imports
    medianParseMs: number | null;
    savesWindow: number;
    deniedWindow: number;
  };
  daily: DayBucket[];
  byBank: { bank: string; imports: number }[];
  byKind: { kind: string; imports: number }[];
  byOperator: OperatorRow[];
  byLead: LeadRow[];
  sessions: SessionRow[];
  recentImports: SimEvent[];
  recentErrors: SimEvent[];
}

const ANALYSIS_EVENTS = new Set([
  "analysis_open",
  "statement_analysis_open",
  "summary_open",
  "statement_summary_open",
  "schedule_open",
  "compare_open",
]);

const dayKey = (iso: string) => iso.slice(0, 10);

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

/** A short human label for one action in a session trail. */
function trailLabel(e: SimEvent): string {
  switch (e.event) {
    case "door_entry":
      return "כניסה";
    case "board_view":
      return "פתיחת בורד";
    case "import":
      if (e.ok === false) return "ייבוא נכשל";
      return e.kind === "bank" ? "ייבוא דוח בנק" : "ייבוא חיווי";
    case "analysis_open":
      return "ניתוח חיווי";
    case "statement_analysis_open":
      return "ניתוח משכנתא";
    case "summary_open":
    case "statement_summary_open":
      return "סיכום ללקוח";
    case "schedule_open":
      return "לוח סילוקין";
    case "compare_open":
      return "השוואה";
    case "excel_export":
      return "ייצוא אקסל";
    case "report_view":
      return "צפייה במסמך";
    case "save":
      return e.ok === false ? "שמירה נכשלה" : "שמירה";
    default:
      return e.event;
  }
}

/**
 * Rebuild working sessions from the raw stream: same lead, events ordered in
 * time, a new session whenever the gap tops 30 minutes. This is the panel's
 * answer to "who used the board, when, and what did they do" — one row per
 * visit with the actions in the order they happened.
 */
function sessionize(events: SimEvent[]): SessionRow[] {
  const byLead = new Map<string, SimEvent[]>();
  for (const e of events) {
    if (e.event === "door_denied") continue; // never became a session
    const key = String(e.lead_id ?? e.lead_name ?? "?");
    (byLead.get(key) ?? byLead.set(key, []).get(key)!).push(e);
  }

  const out: SessionRow[] = [];
  const GAP = 30 * 60_000;

  for (const list of Array.from(byLead.values())) {
    const asc = [...list].sort((a, b) => (a.ts > b.ts ? 1 : -1));
    let cur: SimEvent[] = [];
    const flush = () => {
      if (!cur.length) return;
      const start = cur[0].ts;
      const end = cur[cur.length - 1].ts;
      const named = cur.find((e) => e.lead_name)?.lead_name;
      out.push({
        start,
        end,
        minutes: Math.max(0, Math.round((+new Date(end) - +new Date(start)) / 60_000)),
        operator: cur.find((e) => e.operator)?.operator || "—",
        lead: named || `ליד ${cur[0].lead_id ?? "?"}`,
        leadId: cur[0].lead_id ?? null,
        trail: cur
          .filter((e) => e.event !== "board_view" || cur.indexOf(e) === 0)
          .map((e) => ({ event: e.event, ok: e.ok !== false, label: trailLabel(e) })),
        imports: cur.filter((e) => e.event === "import" && e.ok !== false).length,
        saves: cur.filter((e) => e.event === "save" && e.ok !== false).length,
        errors: cur.filter((e) => e.ok === false || e.event === "error").length,
      });
      cur = [];
    };
    for (const e of asc) {
      if (cur.length && +new Date(e.ts) - +new Date(cur[cur.length - 1].ts) > GAP) flush();
      cur.push(e);
    }
    flush();
  }

  return out.sort((a, b) => (a.start < b.start ? 1 : -1));
}

export function buildDashboard(events: SimEvent[], days: number): Dashboard {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString();

  const imports = events.filter((e) => e.event === "import");
  const importsOk = imports.filter((e) => e.ok !== false);
  const sessions = events.filter((e) => e.event === "door_entry");
  const denied = events.filter((e) => e.event === "door_denied");
  const saves = events.filter((e) => e.event === "save" && e.ok !== false);
  const errors = events.filter(
    (e) => e.event === "error" || e.event === "door_denied" || (e.ok === false && e.event !== "board_view")
  );

  /* ---------------------------------------------------------------- daily */
  const buckets = new Map<string, DayBucket>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86_400_000);
    const iso = d.toISOString().slice(0, 10);
    buckets.set(iso, {
      iso,
      day: `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
      imports: 0,
      views: 0,
      analyses: 0,
      saves: 0,
      errors: 0,
    });
  }
  for (const e of events) {
    const b = buckets.get(dayKey(e.ts));
    if (!b) continue;
    if (e.event === "import") b.imports++;
    else if (e.event === "board_view" || e.event === "door_entry") b.views++;
    else if (ANALYSIS_EVENTS.has(e.event)) b.analyses++;
    else if (e.event === "save" && e.ok !== false) b.saves++;
    if (e.event === "error" || e.event === "door_denied" || e.ok === false) b.errors++;
  }

  /* --------------------------------------------------------------- groups */
  const bankMap = new Map<string, number>();
  const kindMap = new Map<string, number>();
  for (const e of importsOk) {
    if (e.bank) bankMap.set(e.bank, (bankMap.get(e.bank) ?? 0) + 1);
    kindMap.set(e.kind ?? "—", (kindMap.get(e.kind ?? "—") ?? 0) + 1);
  }

  const opMap = new Map<string, OperatorRow>();
  for (const e of events) {
    // A denied door never became a session — whatever name it carried is an
    // unverified string, not an operator who used the board.
    if (e.event === "door_denied") continue;
    const op = (e.operator || "").trim();
    if (!op) continue;
    const row = opMap.get(op) ?? { operator: op, sessions: 0, imports: 0, saves: 0, lastSeen: e.ts };
    if (e.event === "door_entry") row.sessions++;
    if (e.event === "import" && e.ok !== false) row.imports++;
    if (e.event === "save" && e.ok !== false) row.saves++;
    if (e.ts > row.lastSeen) row.lastSeen = e.ts;
    opMap.set(op, row);
  }

  const leadMap = new Map<string, LeadRow>();
  for (const e of events) {
    if (e.lead_id == null && !e.lead_name) continue;
    const key = String(e.lead_id ?? e.lead_name);
    const row =
      leadMap.get(key) ??
      ({ lead: e.lead_name || `ליד ${e.lead_id}`, leadId: e.lead_id ?? null, events: 0, imports: 0, saves: 0, lastSeen: e.ts } as LeadRow);
    row.events++;
    if (e.lead_name && row.lead.startsWith("ליד ")) row.lead = e.lead_name;
    if (e.event === "import" && e.ok !== false) row.imports++;
    if (e.event === "save" && e.ok !== false) row.saves++;
    if (e.ts > row.lastSeen) row.lastSeen = e.ts;
    leadMap.set(key, row);
  }

  const parseTimes = imports
    .map((e) => e.duration_ms)
    .filter((n): n is number => typeof n === "number" && n > 0);

  const visitRows = sessionize(events);

  return {
    days,
    kpis: {
      importsToday: imports.filter((e) => dayKey(e.ts) === todayKey).length,
      imports7: imports.filter((e) => e.ts >= weekAgo).length,
      importsWindow: imports.length,
      sessionsWindow: visitRows.length,
      uniqueLeads: leadMap.size,
      uniqueOperators: opMap.size,
      failureRatePct: imports.length
        ? Math.round((100 * (imports.length - importsOk.length)) / imports.length)
        : null,
      medianParseMs: median(parseTimes),
      savesWindow: saves.length,
      deniedWindow: denied.length,
    },
    daily: Array.from(buckets.values()),
    byBank: Array.from(bankMap.entries())
      .map(([bank, n]) => ({ bank, imports: n }))
      .sort((a, b) => b.imports - a.imports),
    byKind: Array.from(kindMap.entries())
      .map(([kind, n]) => ({ kind, imports: n }))
      .sort((a, b) => b.imports - a.imports),
    byOperator: Array.from(opMap.values()).sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1)),
    byLead: Array.from(leadMap.values()).sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1)).slice(0, 100),
    sessions: visitRows.slice(0, 40),
    recentImports: imports.slice(0, 50),
    recentErrors: errors.slice(0, 50),
  };
}
