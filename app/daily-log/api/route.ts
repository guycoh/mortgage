import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

/* =========================
   GET – קבלת יום לפי תאריך
   ========================= */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get("date")

  if (!date) {
    return NextResponse.json(
      { error: "Missing date parameter" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("daily_nutrition_logs")
    .select("*")
    .eq("log_date", date)
    .maybeSingle()

  if (error) {
    console.error("GET error:", error)
    return NextResponse.json(null, { status: 500 })
  }

  return NextResponse.json(data)
}

/* =========================
   POST – יצירת יום חדש
   ========================= */
export async function POST(req: NextRequest) {
  const body = await req.json()

  const { data, error } = await supabase
    .from("daily_nutrition_logs")
    .insert(body)
    .select()
    .single()

  if (error) {
    console.error("POST error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

/* =========================
   PUT – עדכון יום קיים
   ========================= */
export async function PUT(req: NextRequest) {
  const body = await req.json()
  const { id, ...payload } = body

  if (!id) {
    return NextResponse.json(
      { error: "Missing id for update" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("daily_nutrition_logs")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("PUT error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}

/* =========================
   DELETE – מחיקת יום
   ========================= */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json(
      { error: "Missing id for delete" },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from("daily_nutrition_logs")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("DELETE error:", error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
