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

/**
 * The master's split — הצמדת קרן inside the amount, and הפרשי היוון beside it
 * (see ImportedLoan in app/aa102test/lib/credit). Its own flag, for the same
 * reason ANCHOR has one: a deployment that has not run this migration should
 * lose exactly these two columns and nothing else. Nothing calculates from
 * either — `amount` is still the balance — so without them the board loads,
 * edits and saves; the split simply reads as "no linkage" and the fee as
 * "none stated" after a reload.
 */
const SPLIT = ["indexation", "prepayment_fee"] as const;

/** Flips to false the first time Postgres says the columns aren't there. */
let hasExtra = true;
let hasAnchor = true;
let hasSplit = true;
/**
 * loan_mixes.target_amount — גובה התמהיל, the figure the board's אחוז column
 * allocates against. Same deal as the two above, on the other table: without the
 * migration the board still loads and saves, the target just does not survive a
 * reload. It is a planning figure, never an input to any calculation, so losing
 * it costs a retype rather than a wrong number.
 */
let hasTarget = true;

export type Row = Record<string, unknown>;
export type BoardMix = {
  id: string;
  mix_name: string;
  is_base?: boolean;
  target_amount?: number | null;
  loans?: Row[];
};

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
  if (hasSplit) {
    // Both numeric and both nullable: null is "the document printed no such
    // line", which is not the same fact as 0.
    out.indexation = numOrNull(loan.indexation);
    out.prepayment_fee = numOrNull(loan.prepayment_fee);
  }
  return out;
}

/** The column list this deployment is known to have. */
const selectCols = () =>
  [
    ...CORE,
    ...(hasExtra ? EXTRA : []),
    ...(hasAnchor ? ANCHOR : []),
    ...(hasSplit ? SPLIT : []),
  ].join(",");

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

/** The mix column list this deployment is known to have. */
const mixCols = () => `id, mix_name, is_base, created_at${hasTarget ? ", target_amount" : ""}`;

export async function loadBoard(lead: number) {
  const readMixes = () =>
    supabase
      .from("loan_mixes")
      .select(mixCols())
      .eq("lead_id", lead)
      .order("created_at", { ascending: true });

  let mixRes = await readMixes();
  if (mixRes.error && isMissingColumn(mixRes.error)) {
    hasTarget = false;
    mixRes = await readMixes();
  }
  if (mixRes.error) throw mixRes.error;
  const mixes = (mixRes.data ?? []) as unknown as Row[];

  if (!mixes.length) return { mixes: [], hasExtra };

  const ids = mixes.map((m) => String(m.id));
  let loansRes = await supabase.from("loans").select(selectCols()).in("mix_id", ids);

  // Retire the newest column set first, then the older ones, so a deployment
  // that is one migration behind loses only what that migration added.
  for (const retire of [() => (hasSplit = false), () => (hasAnchor = false), () => (hasExtra = false)]) {
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
      id: m.id as string,
      mix_name: m.mix_name as string,
      is_base: !!m.is_base,
      target_amount: hasTarget ? numOrNull(m.target_amount) : null,
      loans: byMix.get(String(m.id)) ?? [],
    })),
    hasExtra,
    hasAnchor,
    hasTarget,
    hasSplit,
  };
}

/* ------------------------------------------------------------------- write */

export async function saveBoard(lead: number, mixes: BoardMix[]) {
  const mixRow = (m: BoardMix): Row => {
    const row: Row = { id: m.id, lead_id: lead, mix_name: m.mix_name, is_base: !!m.is_base };
    if (hasTarget) row.target_amount = numOrNull(m.target_amount);
    return row;
  };

  const upsertMixes = () =>
    supabase.from("loan_mixes").upsert(mixes.map(mixRow), { onConflict: "id" });

  let upMix = await upsertMixes();
  if (upMix.error && isMissingColumn(upMix.error)) {
    hasTarget = false;
    upMix = await upsertMixes();
  }
  if (upMix.error) throw upMix.error;

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
      for (const retire of [() => (hasSplit = false), () => (hasAnchor = false), () => (hasExtra = false)]) {
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

  return { success: true, hasExtra, hasAnchor, hasSplit };
}
