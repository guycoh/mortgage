import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: NextRequest) {
  try {
    // מוציאים את ה-leadId מה-path
    const url = req.nextUrl;
    const segments = url.pathname.split("/"); // ["", "api", "mixes", "3"]
    const leadId = Number(segments[segments.length - 1]);

    if (isNaN(leadId)) {
      return NextResponse.json({ error: "Invalid leadId" }, { status: 400 });
    }

    // 1. מביא את התמהילים של הליד
    const { data: mixes, error: mixError } = await supabase
      .from("loan_mixes")
      .select("id, mix_name")
      .eq("lead_id", leadId);

    if (mixError) throw mixError;

    // 2. עבור כל תמהיל – מביא את ההלוואות
    const mixesWithLoans = await Promise.all(
      (mixes || []).map(async (mix) => {
        const { data: loans, error: loanError } = await supabase
          .from("loans")
          .select("*")
          .eq("mix_id", mix.id);

        if (loanError) throw loanError;
        return { ...mix, loans: loans || [] };
      })
    );

    return NextResponse.json({ mixes: mixesWithLoans });
  } catch (err: any) {
    console.error("GET mixes error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
