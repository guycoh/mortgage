
// api/leads/import/route.ts


import { normalizeLead } from "@/app/private/crm/leads/import/utils/normalizeLead";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  const { leads } = await req.json();

  const supabase = await createClient(); // 👈 חשוב!

  const cleaned = leads.map(normalizeLead);

  const { error } = await supabase.from("leads").insert(cleaned);

  if (error) {
    return Response.json({ error }, { status: 500 });
  }

  return Response.json({ success: true });
}