import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


export async function GET(req: NextRequest) {    
    return getCategoryType();
}


async function getCategoryType() {
    const { data, error } = await supabase.from('categorytype').select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 200 });
}















// import { createClient } from "@supabase/supabase-js";
// import { NextResponse } from "next/server";



// export async function GET(request:Request) {
//    const supabase=createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
// );
//  const {data} =await supabase.from('categorytype').select()  
// return  NextResponse.json(data);
// }


