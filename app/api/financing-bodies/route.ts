import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from("financing_bodies")
    .select(`
      id,
      name,
      is_non_bank,
      financing_terms (
        id,
        track,
        anchor_rate,
        anchor_margin,
        max_ltv,
        second_lien,
        max_years,
        max_age,
        notes,
        opening_fee_fixed,
        opening_fee_percent,
        complex_clients,
        is_active,
        display_order
      )
    `)
    .eq("is_inactive", false);

  if (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    data,
  });
}