// Persistence for /aa100test: a lead's whole board, loaded and saved as one
// unit against loan_mixes + loans.
//
// GET  ?lead=<id>  → every mix for that lead, each with its loans
// POST { lead, mixes } → makes the lead's board match the payload exactly
//
// The board is replace-not-merge, which is only safe because GET returns ALL of
// the lead's mixes: what the page shows is what it owns. That is also how
// /api/mixes/save behaves, so the two pages cannot disagree about a lead.
//
// The six provenance columns (debt_group, is_guarantor, is_shared, source_*)
// may not exist yet — see lib/migration.sql. Rather than fail, the route
// detects PostgREST's "column not found" once and drops back to the core
// columns for the rest of the process, so the page works before and after the
// migration is run.

import { NextRequest, NextResponse } from "next/server";
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

/** Columns added by lib/migration.sql. */
const EXTRA = ["debt_group", "is_guarantor", "is_shared", "source_bank", "source_type", "source_track"] as const;

/** Flips to false the first time Postgres says the columns aren't there. */
let hasExtra = true;

type Row = Record<string, unknown>;

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
  // the grid always sends a number; the column is nullable, so keep 0 as 0
  out.amount = Number(loan.amount) || 0;
  out.rate = Number(loan.rate) || 0;
  out.months = Number(loan.months) || 0;
  // anchor and anchor_interval are numeric/integer columns; a stray string
  // from the UI would be rejected by Postgres rather than coerced
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
  return out;
}

function fromDbRow(row: Row): Row {
  const out: Row = { ...row };
  out.group = row.debt_group === "loan" ? "loan" : "mortgage";
  delete out.debt_group;
  // a row saved before the migration has no family; the mortgage default is
  // what the base mix means anyway
  out.is_guarantor = !!row.is_guarantor;
  out.is_shared = !!row.is_shared;
  return out;
}

/* -------------------------------------------------------------------- GET */

export async function GET(req: NextRequest) {
  const lead = Number(req.nextUrl.searchParams.get("lead"));
  if (!Number.isFinite(lead) || lead <= 0) {
    return NextResponse.json({ error: "lead חסר או לא תקין" }, { status: 400 });
  }

  try {
    const { data: mixes, error: mixErr } = await supabase
      .from("loan_mixes")
      .select("id, mix_name, is_base, created_at")
      .eq("lead_id", lead)
      .order("created_at", { ascending: true });
    if (mixErr) throw mixErr;

    if (!mixes?.length) return NextResponse.json({ mixes: [], hasExtra });

    const ids = mixes.map((m) => m.id);
    const cols = hasExtra ? [...CORE, ...EXTRA].join(",") : CORE.join(",");
    let loansRes = await supabase.from("loans").select(cols).in("mix_id", ids);

    if (loansRes.error && isMissingColumn(loansRes.error)) {
      hasExtra = false;
      loansRes = await supabase.from("loans").select(CORE.join(",")).in("mix_id", ids);
    }
    if (loansRes.error) throw loansRes.error;

    const byMix = new Map<string, Row[]>();
    for (const raw of (loansRes.data ?? []) as unknown as Row[]) {
      const key = String(raw.mix_id);
      if (!byMix.has(key)) byMix.set(key, []);
      byMix.get(key)!.push(fromDbRow(raw));
    }

    return NextResponse.json({
      mixes: mixes.map((m) => ({
        id: m.id,
        mix_name: m.mix_name,
        is_base: !!m.is_base,
        loans: byMix.get(m.id) ?? [],
      })),
      hasExtra,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "שגיאה בטעינה";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ------------------------------------------------------------------- POST */

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { lead?: number; mixes?: { id: string; mix_name: string; is_base?: boolean; loans?: Row[] }[] };
    const lead = Number(body.lead);
    const mixes = body.mixes;

    if (!Number.isFinite(lead) || lead <= 0 || !Array.isArray(mixes)) {
      return NextResponse.json({ error: "payload לא תקין" }, { status: 400 });
    }

    /* --- mixes: upsert what we have, drop what the lead no longer has --- */
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

    /* ---------------------------- loans, per mix ---------------------------- */
    for (const mix of mixes) {
      const rows = (mix.loans ?? []).map((l) => ({ ...toDbRow(l, mix.id), id: l.id as string }));

      if (rows.length) {
        let res = await supabase.from("loans").upsert(rows, { onConflict: "id" });
        if (res.error && isMissingColumn(res.error)) {
          // first run before the migration — retry with the core columns only
          hasExtra = false;
          res = await supabase
            .from("loans")
            .upsert(
              (mix.loans ?? []).map((l) => ({ ...toDbRow(l, mix.id), id: l.id as string })),
              { onConflict: "id" }
            );
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

    return NextResponse.json({ success: true, hasExtra });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "שגיאה בשמירה";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
