-- /aa107test — מחולל התמהיל האופטימלי: market data and optimizer runs.
-- Additive, idempotent. Service role only (RLS on, no policies) — the API
-- routes read and write with SUPABASE_SERVICE_ROLE_KEY.

-- Every assembled market snapshot (lib/market-boi.ts → MarketSnapshot), newest first.
create table if not exists public.mortgage_market_snapshots (
  id bigint generated always as identity primary key,
  built_at timestamptz not null default now(),
  level_period text not null,          -- BIR_MRTG_99 month, '2026-08'
  bank_period text not null,           -- per-bank comparison month, '2025-10'
  snapshot jsonb not null
);
create index if not exists mortgage_market_snapshots_built_idx
  on public.mortgage_market_snapshots (built_at desc);

-- The raw observations behind the snapshots, one row per source × month × bank × track × metric.
create table if not exists public.mortgage_market_rates (
  id bigint generated always as identity primary key,
  source text not null,                -- boi_bir_mrtg | boi_compare | boi_rate
  period text not null,                -- '2026-08'
  bank text not null default 'system',
  track text not null,                 -- prime | klz | kz | mlz | mz | all
  segment text not null default 'housing', -- housing | all_purpose
  metric text not null,                -- rate | margin | benchmark | term | share | irr
  value numeric not null,
  fetched_at timestamptz not null default now(),
  constraint mortgage_market_rates_key unique nulls not distinct (source, period, bank, track, segment, metric)
);

-- Each optimization an advisor ran or applied: settings, the debts it read, what it proposed.
create table if not exists public.mix_optimizer_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  lead_id integer references public.leads(id) on delete set null,
  route text not null default '/aa107test',
  market_built_at timestamptz,
  settings jsonb not null,
  input jsonb not null,
  result jsonb not null,
  applied boolean not null default false
);
create index if not exists mix_optimizer_runs_lead_idx
  on public.mix_optimizer_runs (lead_id, created_at desc);

alter table public.mortgage_market_snapshots enable row level security;
alter table public.mortgage_market_rates enable row level security;
alter table public.mix_optimizer_runs enable row level security;
