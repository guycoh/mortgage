-- עוגני ריבית משתנה — the cache the "עדכון עוגנים" button reads.
--
-- Paste into the Supabase SQL editor and run. Additive and self-contained;
-- nothing else in the schema refers to it.
--
-- Until this runs, app/api/simulator/anchors answers from the dated snapshot in
-- lib/anchors/registry.ts, so the feature works either way. What the table adds
-- is a place to keep the values CURRENT without shipping a deploy — and a
-- history, because every refresh is an insert rather than an update.
--
-- The key is (family, reset_months), NOT the bank. An anchor is a published
-- table keyed by track — see docs/mortgage-anchor-sources.md. Which family a
-- given bank prices a track off is logic, and lives in lib/anchors/registry.ts.

create table if not exists public.mortgage_anchors (
  id           bigserial primary key,
  -- prime | bond_linked | bond_unlinked | makam
  family       text         not null,
  -- Reset period in months. NULL for prime, which has no cycle.
  reset_months integer,
  -- Annual percent, same unit as the board's עוגן field: 3.34 means 3.34%.
  value        numeric(6,3) not null,
  -- The date the value took effect. The resolver takes the newest row at or
  -- before today, so a row dated forward is a scheduled value, not a live one.
  effective_at date         not null,
  source       text         not null,
  source_url   text,
  -- Read off the bank's own price list or a Bank of Israel series, rather than a
  -- secondary aggregator. Reaches the advisor's tooltip either way.
  verified     boolean      not null default false,
  note         text,
  created_at   timestamptz  not null default now(),
  constraint mortgage_anchors_family_ck
    check (family in ('prime', 'bond_linked', 'bond_unlinked', 'makam')),
  -- prime carries no period; every other family must state one.
  constraint mortgage_anchors_period_ck
    check ((family = 'prime') = (reset_months is null))
);

-- One value per key per date. A correction is an update to that row; a refresh
-- is a new row on a new date.
--
-- The columns are listed PLAINLY, and NULLS NOT DISTINCT does the work that
-- coalesce(reset_months, -1) used to. That is not a style preference: both write
-- paths upsert through PostgREST with onConflict="family,reset_months,effective_at",
-- and Postgres cannot infer an index built on an EXPRESSION from a list of column
-- names. Against the coalesce form every upsert died with
--
--   42P10: there is no unique or exclusion constraint matching the ON CONFLICT
--
-- so the cache silently never took a write and the table sat at whatever was last
-- put in it by hand. NULLS NOT DISTINCT keeps prime (reset_months IS NULL) unique
-- per date, which is the whole reason the coalesce was there. Requires PG 15+.
create unique index if not exists mortgage_anchors_key
  on public.mortgage_anchors (family, reset_months, effective_at)
  nulls not distinct;

create index if not exists mortgage_anchors_lookup
  on public.mortgage_anchors (family, effective_at desc);

-- Read through the service role only: the route is server-side and the browser
-- never holds a key that can reach this table.
alter table public.mortgage_anchors enable row level security;

comment on table public.mortgage_anchors is
  'Published variable-rate mortgage anchors, keyed by family and reset period. See docs/mortgage-anchor-sources.md.';

-- ---------------------------------------------------------------- no seed
-- DELIBERATELY EMPTY. This file used to seed a dozen rows, and they were the old
-- republished-table values — unverified, sourced 'טבלת עוגן אג"ח צמוד', and dated
-- 2026-07-11. The real Bank of Israel curve is dated the 1st of its month, so
-- those seed rows were NEWER than the truth and resolveRow() prefers the newest
-- row at or before today. Running this file on a fresh environment would have
-- quietly served 1.730 for a five-year linked track where the curve says 1.702.
--
-- An empty table is the correct starting state and needs no seed to be safe:
--
--   * lib/anchors/registry.ts carries a dated snapshot of the same curve, and
--     mergeAnchors() layers the table over it — so the button answers correctly
--     the moment this file has run, before anything has been written;
--   * the read path treats a family with nothing cached as stale by definition,
--     so the first request fills the table from the Bank of Israel;
--   * the daily cron in vercel.json keeps it filled thereafter.
--
-- Two hand-maintained copies of one curve is what put a wrong number in here in
-- the first place. There is now one copy, and it comes from the source.
