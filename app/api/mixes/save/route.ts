import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// יצירת client עם ה־anon key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Mix = {
  id: string;
  lead_id: number;
  mix_name: string;
  loans?: any[]; // בהמשך נממש
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { lead_id, mixes } = body as { lead_id: number; mixes: Mix[] };

    if (!lead_id || !Array.isArray(mixes)) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    // 1. נביא את התמהילים הקיימים ל־lead_id
    const { data: existingMixes, error: fetchError } = await supabase
      .from("loan_mixes")
      .select("id")
      .eq("lead_id", lead_id);

    if (fetchError) throw fetchError;

    const existingIds = (existingMixes || []).map((m) => m.id);
    const incomingIds = mixes.map((m) => m.id);

    // 2. עדכון / הוספה
    for (const mix of mixes) {
      if (existingIds.includes(mix.id)) {
        // עדכון
        const { error } = await supabase
          .from("loan_mixes")
          .update({ mix_name: mix.mix_name })
          .eq("id", mix.id);

        if (error) throw error;
      } else {
        // הוספה
        const { error } = await supabase
          .from("loan_mixes")
          .insert([{ id: mix.id, lead_id, mix_name: mix.mix_name }]);

        if (error) throw error;
      }
    }

    // 3. מחיקה של תמהילים שנמחקו מה־UI
    const mixesToDelete = existingIds.filter((id) => !incomingIds.includes(id));
    if (mixesToDelete.length > 0) {
      const { error } = await supabase
        .from("loan_mixes")
        .delete()
        .in("id", mixesToDelete);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
