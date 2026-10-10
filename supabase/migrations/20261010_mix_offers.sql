-- הצעות ללקוח — frozen mix offers behind a 6-digit code (app/api/offer, app/offer).
-- Applied 2026-10-10 via the dashboard SQL editor. Service role only: RLS on,
-- no policies, so the anon key can neither read nor write offers.
create table if not exists public.mix_offers (
  id           text primary key,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  lead_id      bigint,
  client_name  text,
  payload      jsonb not null,
  code_hash    text not null,
  attempts     integer not null default 0,
  locked_until timestamptz,
  revoked      boolean not null default false
);
create index if not exists mix_offers_lead_idx on public.mix_offers (lead_id);
alter table public.mix_offers enable row level security;
