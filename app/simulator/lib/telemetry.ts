// Server-side telemetry store for the simulator.
//
// One row per event. Supabase is the system of record — the `sim_events`
// table, written with the SERVICE ROLE key only. The table has RLS enabled
// with no policies at all, so the anon key that ships in the browser bundle
// can neither read nor write a single row; every write funnels through the
// server routes in this folder.
//
// Until the migration in supabase/migrations/ has been applied (DDL on this
// project goes through the SQL editor, not the API), inserts fall back to a
// local JSONL file next to the repo. The dashboard reads both and says which
// store served it, so a misconfigured deployment is visible rather than
// silently empty.
//
// Never throws. Telemetry that can take the simulator down is worse than no
// telemetry, so every failure here is swallowed after being noted.

import { appendFile, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ types */

export const EVENT_NAMES = [
  "door_entry", // the Fireberry link was followed and a session was minted
  "door_denied", // the link was refused (expired / invalid / misconfigured)
  "board_view", // the board rendered for a lead
  "import", // a PDF was dropped and parsed (ok=false ⇒ parse failed)
  "analysis_open", // ניתוח חיווי
  "statement_analysis_open", // ניתוח משכנתא
  "summary_open", // סיכום ללקוח
  "statement_summary_open",
  "schedule_open", // לוח סילוקין
  "compare_open",
  "excel_export",
  "report_view", // צפייה במסמך המקורי
  "save", // mixes saved to the lead (ok=false ⇒ save failed)
  "error", // anything client-side that broke
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export interface SimEvent {
  id?: number;
  ts: string; // ISO
  event: EventName;
  session_id?: string | null;
  surface?: "board" | "aa102test" | null;
  lead_id?: number | null;
  lead_name?: string | null;
  operator?: string | null;
  fb_id?: string | null;
  kind?: "credit" | "bank" | null;
  bank?: string | null;
  client_name?: string | null;
  client_id?: string | null;
  file_name?: string | null;
  pages?: number | null;
  ok?: boolean | null;
  duration_ms?: number | null;
  mortgages?: number | null;
  loans?: number | null;
  skipped?: number | null;
  total_balance?: number | null;
  total_monthly?: number | null;
  error?: string | null;
  ua?: string | null;
  ip?: string | null;
  data?: Record<string, unknown> | null;
}

/* ------------------------------------------------------------------ store */

const JSONL = path.join(process.cwd(), ".sim-events.jsonl");

function service(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || url.includes("placeholder")) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Insert one event. Supabase first, JSONL when the table isn't there yet. */
export async function recordEvent(e: SimEvent): Promise<void> {
  const row = { ...e, ts: e.ts || new Date().toISOString() };
  const db = service();
  if (db) {
    const { error } = await db.from("sim_events").insert(row);
    if (!error) return;
    // Table missing / RLS misfire / outage — fall through to the file so the
    // event survives, and the failure reason travels with it.
    row.data = {
      ...(row.data ?? {}),
      _db_error: String(error.message || error.code || "insert-failed"),
    };
  }
  try {
    await appendFile(JSONL, JSON.stringify(row) + "\n", "utf8");
  } catch {
    // Out of places to write. Telemetry is not worth crashing a request.
  }
}

export interface LoadedEvents {
  events: SimEvent[];
  /** Which stores actually answered, for the dashboard's own health line. */
  sources: { supabase: boolean; file: boolean };
}

/** Everything in the window, newest first, both stores merged. */
export async function loadEvents(days: number): Promise<LoadedEvents> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const out: SimEvent[] = [];
  const sources = { supabase: false, file: false };

  const db = service();
  if (db) {
    const { data, error } = await db
      .from("sim_events")
      .select("*")
      .gte("ts", since)
      .order("ts", { ascending: false })
      .limit(20_000);
    if (!error && data) {
      sources.supabase = true;
      out.push(...(data as SimEvent[]));
    }
  }

  try {
    const raw = await readFile(JSONL, "utf8");
    const rows = raw
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l) as SimEvent;
        } catch {
          return null;
        }
      })
      .filter((r): r is SimEvent => !!r && r.ts >= since);
    if (rows.length) {
      sources.file = true;
      out.push(...rows);
    }
  } catch {
    // No local file — the normal case in production.
  }

  out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  return { events: out, sources };
}

/* ------------------------------------------------- request-side conveniences */

/** Client address as the proxy chain reported it. */
export function requestIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : "").trim() || "";
}

export function requestUa(req: Request): string {
  return (req.headers.get("user-agent") || "").slice(0, 300);
}
