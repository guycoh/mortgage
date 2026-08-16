-- /aa102test — one-time migration. Paste into the Supabase SQL editor and run.
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

-- The anchor's NAME, added with the עוגן column on the board. The existing
-- `anchor` column is numeric and holds the anchor's own rate, which only the
-- Discount statement prints; every document that names an anchor without pricing
-- it needs somewhere to put the words. loadBoard degrades this one column on its
-- own, so the board still works before this line is run.
alter table public.loans
  add column if not exists source_anchor text;

-- Loading a lead's board reads loans by mix; this is the index that read wants.
create index if not exists loans_mix_id_idx on public.loans (mix_id);

-- גובה התמהיל — the total a proposal's rows are allocated against, and the
-- figure the אחוז column is a percentage OF. It belongs to the mix, not to any
-- row: every row divides by the same number, and a per-row copy of it would go
-- stale the moment the total was retyped.
--
-- Nothing calculates from it — the engine reads amounts, as it always has — so a
-- deployment that has not run this line still loads, edits and saves boards.
-- loadBoard degrades this column on its own; the target simply does not survive
-- a reload until this runs.
alter table public.loan_mixes
  add column if not exists target_amount numeric;

-- The master's split. A payoff letter prints the balance as יתרת קרן + הצמדת
-- קרן, and prices leaving each tranche as הפרשי היוון (עמלת פרעון מוקדם). The
-- board shows the three as separate cells on the master mix and folds them
-- into one amount — with or without the fee, the advisor's call — when the
-- master is duplicated into a proposal.
--
-- `amount` is unchanged and is still principal + indexation, the balance every
-- calculation reads. `indexation` says how much of it is linkage; `prepayment_fee`
-- is a stated cost that is part of no balance. Both nullable: null is "the
-- document printed no such line", which is not the same fact as 0. loadBoard
-- degrades these two columns behind their own flag (hasSplit).
alter table public.loans
  add column if not exists indexation     numeric,
  add column if not exists prepayment_fee numeric;
