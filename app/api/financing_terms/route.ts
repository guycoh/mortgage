import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET ALL FINANCING TERMS
export async function GET(req: NextRequest) {
  return getFinancingTerms();
}

async function getFinancingTerms() {
  const { data, error } = await supabase
    .from("financing_terms")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json(data, { status: 200 });
}

// CREATE NEW FINANCING TERM
export async function POST(req: NextRequest) {
  const body = await req.json();
  console.log("Received body:", body);

  return createFinancingTerm(body);
}

async function createFinancingTerm(body: any) {
  const { data, error } = await supabase
    .from("financing_terms")
    .insert([body])
    .select();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json(data, { status: 201 });
}