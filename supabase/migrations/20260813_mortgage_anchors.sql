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
create unique index if not exists mortgage_anchors_key
  on public.mortgage_anchors (family, coalesce(reset_months, -1), effective_at);

create index if not exists mortgage_anchors_lookup
  on public.mortgage_anchors (family, effective_at desc);

-- Read through the service role only: the route is server-side and the browser
-- never holds a key that can reach this table.
alter table public.mortgage_anchors enable row level security;

comment on table public.mortgage_anchors is
  'Published variable-rate mortgage anchors, keyed by family and reset period. See docs/mortgage-anchor-sources.md.';

-- ---------------------------------------------------------------- seed
-- The same values bundled in lib/anchors/registry.ts, so the table starts where
-- the snapshot left off. Idempotent: re-running changes nothing.

insert into public.mortgage_anchors (family, reset_months, value, effective_at, source, verified) values
  ('prime',         null, 5.000, '2026-07-06', 'ריבית בנק ישראל 3.5% (החלטה מ־06/07/2026) + 1.5%', true),

  ('bond_linked',     12, 1.650, '2026-07-11', 'טבלת עוגן אג"ח צמוד',    false),
  ('bond_linked',     30, 1.610, '2026-07-11', 'טבלת עוגן אג"ח צמוד',    false),
  ('bond_linked',     60, 1.730, '2026-07-11', 'טבלת עוגן אג"ח צמוד',    false),
  ('bond_linked',     84, 1.740, '2026-07-11', 'טבלת עוגן אג"ח צמוד',    false),
  ('bond_linked',    120, 1.860, '2026-07-11', 'טבלת עוגן אג"ח צמוד',    false),

  ('bond_unlinked',   24, 3.210, '2026-07-11', 'טבלת עוגן אג"ח לא צמוד', false),
  ('bond_unlinked',   60, 3.340, '2026-07-11', 'טבלת עוגן אג"ח לא צמוד', false),
  ('bond_unlinked',   84, 3.480, '2026-07-11', 'טבלת עוגן אג"ח לא צמוד', false),

  ('makam',           12, 3.220, '2026-07-09', 'תשואת מק"ם ל־12 חודשים',  false)
on conflict (family, coalesce(reset_months, -1), effective_at) do nothing;
