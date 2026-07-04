import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { id, name, is_non_bank, is_inactive, terms } = body;

    // 1. עדכון גוף מימון
    const { error: bodyError } = await supabase
      .from("financing_bodies")
      .update({
        name,
        is_non_bank,
        is_inactive,
      })
      .eq("id", id);

    if (bodyError) {
      return NextResponse.json(
        { success: false, error: bodyError.message },
        { status: 500 }
      );
    }

    // 2. שליפת מסלולים קיימים
    const { data: existingTerms } = await supabase
      .from("financing_terms")
      .select("id")
      .eq("financing_body_id", id);

    const existingIds = existingTerms?.map((t) => t.id) || [];

    const incomingIds = terms
      .filter((t: any) => t.id)
      .map((t: any) => t.id);

    // 3. מחיקה של מסלולים שנמחקו בפרונט
    const toDelete = existingIds.filter(
      (eid) => !incomingIds.includes(eid)
    );

    if (toDelete.length > 0) {
      await supabase
        .from("financing_terms")
        .delete()
        .in("id", toDelete);
    }

    // 4. UPSERT למסלולים
    const upsertData = terms.map((t: any) => ({
      id: t.id || undefined,
      financing_body_id: id,
      track: t.track,
      anchor_rate: t.anchor_rate,
      anchor_margin: t.anchor_margin,
      max_ltv: t.max_ltv,
      second_lien: t.second_lien,
      max_years: t.max_years,
      max_age: t.max_age,
      notes: t.notes,
      opening_fee_fixed: t.opening_fee_fixed,
      opening_fee_percent: t.opening_fee_percent,
      complex_clients: t.complex_clients,
      is_active: t.is_active ?? true,
      display_order: t.display_order ?? 0,
    }));

    const { error: termsError } = await supabase
      .from("financing_terms")
      .upsert(upsertData);

    if (termsError) {
      return NextResponse.json(
        { success: false, error: termsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Updated successfully",
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}