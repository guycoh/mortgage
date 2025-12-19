
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const title = formData.get("name") as string;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const filePath = `${randomUUID()}.pdf`;

  // 1️⃣ העלאה ל־Storage
  const { error: uploadError } = await supabase.storage
    .from("forms")
    .upload(filePath, file, {
      contentType: "application/pdf",
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // 2️⃣ יצירת רשומה ב־DB
  const { data: form, error: insertError } = await supabase
    .from("forms")
    .insert({
      title,
      original_name: file.name,
      file_path: filePath,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 3️⃣ החזרת formId
  return NextResponse.json({
    formId: form.id,
  });
}















// import { NextRequest, NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";

// export async function POST(req: NextRequest) {
//   try {
//     const supabase = createClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.SUPABASE_SERVICE_ROLE_KEY!
//     );

//     const formData = await req.formData();
//     const file = formData.get("file") as File;
//     const name = formData.get("name") as string;

//     if (!file || !name) {
//       return NextResponse.json(
//         { error: "Missing file or name" },
//         { status: 400 }
//       );
//     }

//     const fileName = `${Date.now()}-${file.name}`;

//     // 🔐 המרה בטוחה ל-ArrayBuffer
//     const buffer = Buffer.from(await file.arrayBuffer());

//     const { error } = await supabase.storage
//       .from("forms")
//       .upload(fileName, buffer, {
//         contentType: "application/pdf",
//         upsert: false,
//       });

//     if (error) {
//       return NextResponse.json({ error: error.message }, { status: 500 });
//     }

//     return NextResponse.json({
//       success: true,
//       filePath: fileName,
//     });
//   } catch (err: any) {
//     return NextResponse.json(
//       { error: err.message },
//       { status: 500 }
//     );
//   }
// }
