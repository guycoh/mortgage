// Reading and writing a lead's board — shared by the two routes that expose it
// (/api/aa100/mixes, which takes the lead as a parameter, and
// /api/simulator/mixes, which takes it from a signed cookie). The difference
// between those two is only who is allowed to name the lead; everything about
// what a board IS lives here, so they cannot drift apart.
//
// The board is replace-not-merge: a save makes the lead's mixes match the
// payload exactly, deleting ones that are gone. That is only safe because
// loadBoard returns ALL of the lead's mixes — what the page shows is what it
// owns. /api/mixes/save works under the same contract.
//
// The six provenance columns (debt_group, is_guarantor, is_shared, source_*)
// may not exist on every deployment — see app/aa100test/lib/migration.sql.
// Rather than fail, we detect PostgREST's "column not found" once and fall back
// to the core columns, so the page works before and after the migration is run.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/** Columns every deployment has. */
const CORE = [
  "id",
  "mix_id",
  "path_id",
  "amount",
  "rate",
  "months",
  "loan_end_date",
  "end_date",
  "anchor",
  "anchor_margin",
  "anchor_interval",
  "change_frequency",
  "amortization_schedule_id",
  "grace_type_id",
  "grace_months",
] as const;

/** Columns added by app/aa100test/lib/migration.sql. */
const EXTRA = [
  "debt_group",
  "is_guarantor",
  "is_shared",
  "source_bank",
  "source_type",
  "source_track",
] as const;

/**
 * Added later than the rest, so it gets its own flag.
 *
 * Folding it into EXTRA would mean a deployment missing this one column silently
 * stops persisting the other six as well — bank names and guarantor marks would
 * vanish on reload to add an anchor. One column missing should cost one column.
 */
const ANCHOR = ["source_anchor"] as const;

/** Flips to false the first time Postgres says the columns aren't there. */
let hasExtra = true;
let hasAnchor = true;

export type Row = Record<string, unknown>;
export type BoardMix = { id: string; mix_name: string; is_base?: boolean; loans?: Row[] };

const numOrNull = (v: unknown) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const intOrNull = (v: unknown) => {
  const n = numOrNull(v);
  return n === null ? null : Math.round(n);
};

const isMissingColumn = (e: { code?: string; message?: string } | null) =>
  e?.code === "PGRST204" || /column .* does not exist/i.test(e?.message ?? "");

function toDbRow(loan: Row, mixId: string): Row {
  const out: Row = { mix_id: mixId };
  for (const k of CORE) if (k !== "mix_id") out[k] = loan[k] ?? null;
  out.amount = Number(loan.amount) || 0;
  out.rate = Number(loan.rate) || 0;
  out.months = Number(loan.months) || 0;
  // anchor and anchor_interval are numeric/integer columns; a stray string from
  // the UI would be rejected by Postgres rather than coerced
  out.anchor = numOrNull(loan.anchor);
  out.anchor_margin = numOrNull(loan.anchor_margin);
  out.anchor_interval = intOrNull(loan.anchor_interval);
  if (hasExtra) {
    out.debt_group = loan.group === "loan" ? "loan" : "mortgage";
    out.is_guarantor = !!loan.is_guarantor;
    out.is_shared = !!loan.is_shared;
    out.source_bank = loan.source_bank ?? null;
    out.source_type = loan.source_type ?? null;
    out.source_track = loan.source_track ?? null;
  }
  if (hasAnchor) out.source_anchor = loan.source_anchor ?? null;
  return out;
}

/** The column list this deployment is known to have. */
const selectCols = () =>
  [...CORE, ...(hasExtra ? EXTRA : []), ...(hasAnchor ? ANCHOR : [])].join(",");

function fromDbRow(row: Row): Row {
  const out: Row = { ...row };
  // a row saved before the migration has no family; mortgage is what the base
  // mix means anyway
  out.group = row.debt_group === "loan" ? "loan" : "mortgage";
  delete out.debt_group;
  out.is_guarantor = !!row.is_guarantor;
  out.is_shared = !!row.is_shared;
  return out;
}

/* -------------------------------------------------------------------- read */

export async function loadBoard(lead: number) {
  const { data: mixes, error: mixErr } = await supabase
    .from("loan_mixes")
    .select("id, mix_name, is_base, created_at")
    .eq("lead_id", lead)
    .order("created_at", { ascending: true });
  if (mixErr) throw mixErr;

  if (!mixes?.length) return { mixes: [], hasExtra };

  const ids = mixes.map((m) => m.id);
  let loansRes = await supabase.from("loans").select(selectCols()).in("mix_id", ids);

  // Retire the newest column set first, then the older one, so a deployment that
  // is one migration behind loses only what that migration added.
  for (const retire of [() => (hasAnchor = false), () => (hasExtra = false)]) {
    if (!loansRes.error || !isMissingColumn(loansRes.error)) break;
    retire();
    loansRes = await supabase.from("loans").select(selectCols()).in("mix_id", ids);
  }
  if (loansRes.error) throw loansRes.error;

  const byMix = new Map<string, Row[]>();
  for (const raw of (loansRes.data ?? []) as unknown as Row[]) {
    const key = String(raw.mix_id);
    if (!byMix.has(key)) byMix.set(key, []);
    byMix.get(key)!.push(fromDbRow(raw));
  }

  return {
    mixes: mixes.map((m) => ({
      id: m.id,
      mix_name: m.mix_name,
      is_base: !!m.is_base,
      loans: byMix.get(m.id) ?? [],
    })),
    hasExtra,
    hasAnchor,
  };
}

/* ------------------------------------------------------------------- write */

export async function saveBoard(lead: number, mixes: BoardMix[]) {
  const { error: upMixErr } = await supabase.from("loan_mixes").upsert(
    mixes.map((m) => ({
      id: m.id,
      lead_id: lead,
      mix_name: m.mix_name,
      is_base: !!m.is_base,
    })),
    { onConflict: "id" }
  );
  if (upMixErr) throw upMixErr;

  const { data: existing, error: exErr } = await supabase
    .from("loan_mixes")
    .select("id")
    .eq("lead_id", lead);
  if (exErr) throw exErr;

  const keep = new Set(mixes.map((m) => m.id));
  const staleMixes = (existing ?? []).map((m) => m.id).filter((id) => !keep.has(id));
  if (staleMixes.length) {
    // loans first: the FK points this way
    const { error } = await supabase.from("loans").delete().in("mix_id", staleMixes);
    if (error) throw error;
    const { error: e2 } = await supabase.from("loan_mixes").delete().in("id", staleMixes);
    if (e2) throw e2;
  }

  for (const mix of mixes) {
    const rows = (mix.loans ?? []).map((l) => ({ ...toDbRow(l, mix.id), id: l.id as string }));

    if (rows.length) {
      const build = () =>
        (mix.loans ?? []).map((l) => ({ ...toDbRow(l, mix.id), id: l.id as string }));
      let res = await supabase.from("loans").upsert(rows, { onConflict: "id" });
      for (const retire of [() => (hasAnchor = false), () => (hasExtra = false)]) {
        if (!res.error || !isMissingColumn(res.error)) break;
        retire();
        res = await supabase.from("loans").upsert(build(), { onConflict: "id" });
      }
      if (res.error) throw res.error;
    }

    const { data: haveLoans, error: hlErr } = await supabase
      .from("loans")
      .select("id")
      .eq("mix_id", mix.id);
    if (hlErr) throw hlErr;

    const keepLoans = new Set(rows.map((l) => l.id));
    const stale = (haveLoans ?? []).map((l) => l.id).filter((id) => !keepLoans.has(id));
    if (stale.length) {
      const { error } = await supabase.from("loans").delete().in("id", stale);
      if (error) throw error;
    }
  }

  return { success: true, hasExtra, hasAnchor };
}
