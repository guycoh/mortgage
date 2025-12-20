import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// טיפוס של שדה בתבנית
type FieldType = "name" | "id" | "email" | "signature";

type TemplateField = {
  type: FieldType;
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
};

type FieldsRequestBody = {
  template_id: string;
  fields: TemplateField[];
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // קורא את ה־body וממיר ל־type מבוסס
    const { template_id, fields } = (await req.json()) as FieldsRequestBody;

    if (!template_id) {
      return NextResponse.json({ error: "template_id is required" }, { status: 400 });
    }

    if (!fields || fields.length === 0) {
      return NextResponse.json({ error: "No fields provided" }, { status: 400 });
    }

    // הכנסה למסד
    const { error } = await supabase
      .from("template_fields")
      .insert(fields.map((field: TemplateField) => ({
        ...field,
        template_id,
      })));

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
