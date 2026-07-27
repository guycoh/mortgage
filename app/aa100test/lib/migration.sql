-- /aa100test — one-time migration. Paste into the Supabase SQL editor and run.
--
-- Everything here is ADDITIVE and nullable. The existing CRM save route
-- (app/api/mixes/save) writes an explicit column whitelist, so it keeps working
-- untouched and simply never sets these.
--
-- Why they are needed: the simulator's whole layout is built on which family a
-- row belongs to (משכנתא / הלוואה) and where it came from. Without these
-- columns a save-then-reload turns every row into a משכנתא and loses the bank
-- name and the ערב / משותף marks.
--
-- "group" is a reserved word in SQL, hence debt_group.

alter table public.loans
  add column if not exists debt_group   text,
  add column if not exists is_guarantor boolean not null default false,
  add column if not exists is_shared    boolean not null default false,
  add column if not exists source_bank  text,
  add column if not exists source_type  text,
  add column if not exists source_track text;

-- Existing rows predate the simulator and are all mortgages by convention.
update public.loans set debt_group = 'mortgage' where debt_group is null;

-- Loading a lead's board reads loans by mix; this is the index that read wants.
create index if not exists loans_mix_id_idx on public.loans (mix_id);
