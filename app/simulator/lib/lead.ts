// Resolving a Fireberry account to a lead in our own database.
//
// loan_mixes.lead_id is a foreign key to leads, so a board cannot exist without
// a leads row. A Fireberry account that has never opened the simulator has no
// such row — the first click creates one and stamps it with fireberry_id, and
// every click after that finds it. That is the whole of "empty the first time,
// their data every time after".
//
// Linking rather than duplicating is deliberate: the row it finds or creates is
// an ordinary lead, so the same board is visible at
// /private/crm/leads/simulators/[id] and nothing downstream had to change.

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export type ResolvedLead = { id: number; name: string | null };

/**
 * Find the lead for a Fireberry account, creating it on first contact.
 * Returns null only if the database refused both.
 */
export async function leadForFireberry(
  fbId: string,
  name: string
): Promise<ResolvedLead | null> {
  const { data: found, error: findErr } = await supabase
    .from("leads")
    .select("id, name")
    .eq("fireberry_id", fbId)
    .limit(1);
  if (findErr) throw findErr;
  if (found?.length) {
    // Fireberry is the system of record for the name; keep ours in step, but
    // never blank it out if the link happened to arrive without one.
    const row = found[0];
    if (name && row.name !== name) {
      await supabase.from("leads").update({ name }).eq("id", row.id);
      return { id: row.id, name };
    }
    return row;
  }

  const { data: made, error: insErr } = await supabase
    .from("leads")
    .insert([{ name: name || "ללא שם", fireberry_id: fbId }])
    .select("id, name")
    .limit(1);

  if (insErr) {
    // Two clicks landing at once: the unique index rejects the second, and by
    // then the first has committed — so look again rather than failing.
    if (insErr.code === "23505") {
      const { data: retry } = await supabase
        .from("leads")
        .select("id, name")
        .eq("fireberry_id", fbId)
        .limit(1);
      return retry?.[0] ?? null;
    }
    throw insErr;
  }
  return made?.[0] ?? null;
}
