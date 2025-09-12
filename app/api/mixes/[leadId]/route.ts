import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request, { params }: { params: { leadId: string } }) {
  const leadId = Number(params.leadId);

  if (!leadId) {
    return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("loan_mixes")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}


// import { NextRequest, NextResponse } from "next/server";
// import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_KEY!
// );

// export async function POST(req: NextRequest, { params }: { params: { leadId: string }}) {
//   const leadId = params.leadId;
//   const { mixes } = await req.json(); // מערך תמהילים, כל אחד עם loans

//   for (const mix of mixes) {
//     // 🔹 תמהיל
//     if (mix.isDeleted) {
//       await supabase.from("loan_mixes").delete().eq("id", mix.id);
//     } else if (mix.isNew) {
//       await supabase.from("loan_mixes").insert([
//         { id: mix.id, lead_id: leadId, mix_name: mix.mix_name }
//       ]);
//     } else {
//       await supabase.from("loan_mixes").update({ mix_name: mix.mix_name }).eq("id", mix.id);
//     }

//     // 🔹 מסלולי הלוואות
//     if (mix.loans && mix.loans.length > 0) {
//       for (const loan of mix.loans) {
//         if (loan.isDeleted) {
//           await supabase.from("loans").delete().eq("id", loan.id);
//         } else if (loan.isNew) {
//           await supabase.from("loans").insert([
//             {
//               id: loan.id,
//               mix_id: mix.id,
//               amount: loan.amount,
//               rate: loan.rate,
//               months: loan.months,
//               indexed: loan.indexed || false
//             }
//           ]);
//         } else {
//           await supabase.from("loans").update({
//             amount: loan.amount,
//             rate: loan.rate,
//             months: loan.months,
//             indexed: loan.indexed || false
//           }).eq("id", loan.id);
//         }
//       }
//     }
//   }

//   return NextResponse.json({ success: true });
// }
