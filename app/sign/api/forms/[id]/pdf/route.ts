import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("forms")
    .select("file_path")
    .eq("id", params.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/forms/${data.file_path}`;

  return NextResponse.json({ pdfUrl });
}
