"use client";

// Fire-and-forget beacons from the simulator to /api/simulator/track.
//
// Board-only by two independent means: this module no-ops unless the page is
// /simulator/board, and the endpoint drops anything that arrives without a
// board session cookie. The dev surface (/aa102test) therefore never reaches
// the statistics even if someone copies this call somewhere new.
//
// sendBeacon over fetch: it survives tab closes (the save-then-close case is
// exactly the one worth measuring) and needs no preflight. The payload stays
// under the beacon size budget by construction — small flat fields only.

const onBoard = () =>
  typeof window !== "undefined" && window.location.pathname.startsWith("/simulator/board");

/** One id per tab session, so the funnel (view → drop → save) can be read. */
function sessionId(): string {
  try {
    const k = "sim_session";
    let v = window.sessionStorage.getItem(k);
    if (!v) {
      v = crypto.randomUUID();
      window.sessionStorage.setItem(k, v);
    }
    return v;
  } catch {
    return "";
  }
}

export type TrackPayload = {
  kind?: "credit" | "bank";
  bank?: string;
  client_name?: string;
  client_id?: string;
  file_name?: string;
  pages?: number;
  ok?: boolean;
  duration_ms?: number;
  mortgages?: number;
  loans?: number;
  skipped?: number;
  total_balance?: number;
  total_monthly?: number;
  error?: string;
  data?: Record<string, unknown>;
};

export function track(event: string, payload: TrackPayload = {}): void {
  if (!onBoard()) return;
  try {
    const body = JSON.stringify({ event, session_id: sessionId(), ...payload });
    if (!navigator.sendBeacon?.("/api/simulator/track", body)) {
      // Beacon queue refused (rare) — fall back to a keepalive fetch.
      void fetch("/api/simulator/track", { method: "POST", body, keepalive: true }).catch(
        () => {}
      );
    }
  } catch {
    // Telemetry must never surface in the advisor's session.
  }
}
