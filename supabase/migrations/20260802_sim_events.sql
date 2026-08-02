-- Simulator telemetry (admin panel at /simulator/admin).
-- Apply once in the Supabase SQL editor. Until applied, the app falls back to
-- a local JSONL file and the dashboard says so.
--
-- Security model: RLS enabled with NO policies. The anon key in the browser
-- bundle can neither read nor write; every access goes through the app's
-- server routes using the service-role key.

create table public.sim_events (
  id            bigint generated always as identity primary key,
  ts            timestamptz not null default now(),
  event         text not null,
  session_id    text,
  surface       text,
  lead_id       bigint,
  lead_name     text,
  operator      text,
  fb_id         text,
  kind          text,
  bank          text,
  client_name   text,
  client_id     text,
  file_name     text,
  pages         int,
  ok            boolean,
  duration_ms   int,
  mortgages     int,
  loans         int,
  skipped       int,
  total_balance numeric,
  total_monthly numeric,
  error         text,
  ua            text,
  ip            text,
  data          jsonb
);

create index sim_events_ts_idx    on public.sim_events (ts desc);
create index sim_events_event_idx on public.sim_events (event, ts desc);
create index sim_events_lead_idx  on public.sim_events (lead_id, ts desc);

alter table public.sim_events enable row level security;
-- deliberately no policies: service-role only.
