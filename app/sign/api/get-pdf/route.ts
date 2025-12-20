
















// import { NextRequest, NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";

// export async function GET(req: NextRequest) {
//   const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!
//   );

//   const formId = req.nextUrl.searchParams.get("formId");

//   if (!formId) {
//     return NextResponse.json({ error: "Missing formId" }, { status: 400 });
//   }

//   const { data, error } = await supabase
//     .from("forms")
//     .select("file_path")
//     .eq("id", formId)
//     .single();

//   if (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }

//   const { data: publicUrl } = supabase.storage
//     .from("forms")
//     .getPublicUrl(data.file_path);

//   return NextResponse.json({ url: publicUrl.publicUrl });
// }
