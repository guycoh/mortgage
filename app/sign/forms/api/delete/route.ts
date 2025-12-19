import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { formId } = await req.json();

  if (!formId) {
    return NextResponse.json({ error: "Missing formId" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1️⃣ שליפת הנתיב של הקובץ
  const { data: form, error: fetchError } = await supabase
    .from("forms")
    .select("file_path")
    .eq("id", formId)
    .single();

  if (fetchError || !form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  // 2️⃣ מחיקת הקובץ מ־Storage
  const { error: storageError } = await supabase.storage
    .from("forms")
    .remove([form.file_path]);

  if (storageError) {
    return NextResponse.json(
      { error: storageError.message },
      { status: 500 }
    );
  }

  // 3️⃣ מחיקת הרשומה מהטבלה
  const { error: deleteError } = await supabase
    .from("forms")
    .delete()
    .eq("id", formId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
