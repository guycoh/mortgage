import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);



// GET ALL CONCEPTS
// export async function GET(req: NextRequest) {    
//     return getConcepts();
// }
// async function getConcepts() {
//     const { data, error } = await supabase.from('concepts').select('*');
//     if (error) return NextResponse.json({ error: error.message }, { status: 400 });
//     return NextResponse.json(data, { status: 200 });
// }

// GET ALL CONCEPTS
export async function GET(req: NextRequest) {    
    return getConcepts();
}

async function getConcepts() {
    const { data, error } = await supabase
        .from('concepts')
        .select('*')
        .order('concept', { ascending: true }); // מיון לפי א-ב

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });
}













//CREATE NEW CONCEPT

export async function POST(req: NextRequest) {
    const body = await req.json();
    console.log('Received body:', body);  // להדפיס את מה שהשרת מקבל
    return createConcept(body);
}

async function createConcept(body: any) {
    const { data, error } = await supabase.from('concepts').insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
}


