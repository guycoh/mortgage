// Lead lookup for the /aa100test picker.
//
// Server-side search rather than shipping the whole table: there are thousands
// of leads and the picker only ever shows a page of them. A numeric query is
// treated as an id first, because that is how people refer to a lead out loud.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const LIMIT = 40;

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const id = Number(req.nextUrl.searchParams.get("id"));

  try {
    // a direct hit, for ?lead=<id> deep links and for reloading the last lead
    if (Number.isFinite(id) && id > 0) {
      const { data, error } = await supabase.from("leads").select("id, name").eq("id", id).limit(1);
      if (error) throw error;
      return NextResponse.json({ leads: data ?? [] });
    }

    let query = supabase.from("leads").select("id, name");

    if (/^\d+$/.test(q)) {
      query = query.eq("id", Number(q));
    } else if (q) {
      query = query.ilike("name", `%${q}%`);
    }

    const { data, error } = await query.order("id", { ascending: false }).limit(LIMIT);
    if (error) throw error;

    return NextResponse.json({ leads: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "שגיאה בחיפוש";
    return NextResponse.json({ error: msg, leads: [] }, { status: 500 });
  }
}
