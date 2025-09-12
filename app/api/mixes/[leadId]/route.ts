import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const leadId = url.pathname.split("/").pop(); // מוציא את last segment של ה־path
    if (!leadId) return NextResponse.json({ error: "Missing leadId" }, { status: 400 });

    const { data, error } = await supabase
      .from("loan_mixes")
      .select("*")
      .eq("lead_id", Number(leadId))
      .order("created_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


