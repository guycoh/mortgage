import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);



type Loan = {
  id: string;
  mix_id: string;
  path_id: number;
  amount: number;
  rate: number;
  months: number;
  loan_end_date?: string | null;
  anchor?: string | null;
  anchor_margin?: number | null;
  change_frequency?: string | null;
  number?: number;
  created_at?: string;
  anchor_interval?: string | null;
  end_date?: string | null;
  amortization_schedule_id ?: number;

};

type Mix = {
  id: string;
  mix_name: string;
  loans?: Loan[];
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, mixes } = body as { client_id: number; mixes: Mix[] };

    if (!client_id || !Array.isArray(mixes)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // === שלב 1: שליפת תמהילים קיימים ===
    const { data: existingMixes, error: fetchMixesError } = await supabase
      .from("loan_mixes")
      .select("id")
      .eq("lead_id", client_id);

    if (fetchMixesError) throw fetchMixesError;

    const existingMixIds = (existingMixes || []).map(m => m.id);
    const incomingMixIds = mixes.map(m => m.id);

    // === שלב 2: עדכון / הוספת תמהילים ===
    for (const mix of mixes) {
      if (existingMixIds.includes(mix.id)) {
        // update
        const { error } = await supabase
          .from("loan_mixes")
          .update({ mix_name: mix.mix_name })
          .eq("id", mix.id);
        if (error) throw error;
      } else {
        // insert
        const { error } = await supabase
          .from("loan_mixes")
          .insert([{ id: mix.id, lead_id: client_id, mix_name: mix.mix_name }]);
        if (error) throw error;
      }
    }

    // === שלב 3: מחיקת תמהילים שהוסרו ===
    const mixesToDelete = existingMixIds.filter(id => !incomingMixIds.includes(id));
    if (mixesToDelete.length > 0) {
      const { error } = await supabase
        .from("loan_mixes")
        .delete()
        .in("id", mixesToDelete);
      if (error) throw error;
    }

    // === שלב 4: טיפול בהלוואות לכל תמהיל ===
    for (const mix of mixes) {
      if (!mix.loans) continue;

      const { data: existingLoans, error: fetchLoansError } = await supabase
        .from("loans")
        .select("id")
        .eq("mix_id", mix.id);

      if (fetchLoansError) throw fetchLoansError;

      const existingLoanIds = (existingLoans || []).map(l => l.id);
      const incomingLoanIds = mix.loans.map(l => l.id);

      // עדכון / הוספה
      for (const loan of mix.loans) {
        if (existingLoanIds.includes(loan.id)) {
          const { error } = await supabase
            .from("loans")
            .update({
              path_id: loan.path_id,
              amount: loan.amount ?? null,
              rate: loan.rate ?? null,               // חדש
              months: loan.months ?? null,         // חדש
              end_date: loan.end_date ?? null,
              anchor: loan.anchor ?? null,
              anchor_interval: loan.anchor_interval ?? null,
              change_frequency: loan.change_frequency ?? null,
              amortization_schedule_id: loan.amortization_schedule_id ?? null, 
            })
            .eq("id", loan.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("loans")
            .insert([
              {
                id: loan.id,
                mix_id: mix.id,
                path_id: loan.path_id,
                amount: loan.amount ?? null,
                rate: loan.rate ?? null,             // חדש
                months: loan.months ?? null,        // חדש
                end_date: loan.end_date ?? null,
                anchor: loan.anchor ?? null,
                anchor_interval: loan.anchor_interval ?? null,
                change_frequency: loan.change_frequency ?? null,
                amortization_schedule_id: loan.amortization_schedule_id ?? null,
              },
            ]);
          if (error) throw error;
        }
      }

      // מחיקה של הלוואות שהוסרו
      const loansToDelete = existingLoanIds.filter(id => !incomingLoanIds.includes(id));
      if (loansToDelete.length > 0) {
        const { error } = await supabase
          .from("loans")
          .delete()
          .in("id", loansToDelete);
        if (error) throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
