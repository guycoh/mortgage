-- שני מסלולי המט"ח — paths 6 and 7, the reference rows the board's new tracks need.
--
-- WHY THIS IS NOT OPTIONAL. `loans.path_id` carries a foreign key to
-- `loan_paths(id)` (loans_path_id_fkey), so a board holding a מט"ח row cannot
-- be SAVED until these two rows exist: the upsert in app/api/aa100/mixes fails
-- with 23503 and the whole board's save fails with it. The code change that
-- added the tracks (app/data/paths.ts) is what the app reads; this is what the
-- database will accept.
--
-- `is_indexed` is false for both, matching app/data/paths: it is the CPI flag,
-- and a מט"ח track is linked to an exchange rate, not to the index.
--
-- APPLIED 2026-11-17 to project sgfkbxwarglqrxjrhdth: both rows are live
-- (ids 6 and 7, is_indexed false). The insert went through the app's own
-- POST /api/loan_paths (anon key, RLS permits it) because the Management API
-- PAT was not readable in that session. The setval below has NOT been run —
-- see the note on it.
--
-- Additive and idempotent. Paste into the Supabase SQL editor and run.

insert into public.loan_paths (id, name, is_indexed)
values (6, 'מט"ח דולר', false),
       (7, 'מט"ח יורו', false)
on conflict (id) do nothing;

-- Explicit ids do not advance an identity/serial sequence, and the legacy
-- POST /api/loan_paths inserts without one — so the sequence is moved past the
-- rows just written. A no-op when the column has no sequence behind it.
--
-- STILL PENDING (needs the SQL editor or the Management API). Until it runs,
-- the admin screen /private/admin/loan_paths can fail to add a track:
-- useLoanPaths#addPath POSTs without an id, so it draws the next sequence
-- value, which may still be 6 or 7 and collide (23505). Nothing in the
-- simulators inserts a loan_paths row, so the boards are unaffected.
select setval(s, (select max(id) from public.loan_paths))
from pg_get_serial_sequence('public.loan_paths', 'id') as s
where s is not null;
