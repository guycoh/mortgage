import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const title = formData.get("title") as string;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const fileName = `${Date.now()}-${file.name}`;

  const { error } = await supabase.storage
    .from("templates")
    .upload(fileName, file, { contentType: "application/pdf", upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data, error: dbError } = await supabase
    .from("templates")
    .insert([{ title, file_path: fileName }])
    .select()
    .single();

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ template: data });
}
