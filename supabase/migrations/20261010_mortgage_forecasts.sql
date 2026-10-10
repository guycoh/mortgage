-- תחזית ריבית ואינפלציה — the override the board prices on instead of the BoI
-- rebuild (see app/api/simulator/forecast/route.ts and app/aa102test/lib/forecast.ts).
--
-- Additive and self-contained. Until it runs, the route answers with the curves
-- rebuilt from the Bank of Israel's published zero points and the paste-in
-- reports the missing table.
--
-- A history, not a setting: every save — and every "back to BoI" — is an insert,
-- and the newest row decides. `active = false` on the newest row means no override.

create table if not exists public.mortgage_forecasts (
  id         bigserial primary key,
  -- The month the curves describe ("2026-10" or "2026-10-01").
  as_of      text        not null,
  -- What the board shows as the source: "SmartNPV 01/10/26".
  label      text        not null,
  -- 360 monthly forward rates, annual percent (empty on a clearing row).
  nominal    jsonb       not null default '[]'::jsonb,
  -- 360 monthly expected-CPI rates, annual percent.
  inflation  jsonb       not null default '[]'::jsonb,
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

create index if not exists mortgage_forecasts_created_idx on public.mortgage_forecasts (created_at desc);

-- Written by the server with the service role only; nothing reads it with the anon key.
alter table public.mortgage_forecasts enable row level security;
