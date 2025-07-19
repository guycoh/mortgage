import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET ALL NOTES
export async function GET(req: NextRequest) {    
    return getNotes();
}
async function getNotes() {
    const { data, error } = await supabase.from('notes').select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 200 });
}

//CREATE NEW NOTE

export async function POST(req: NextRequest) {
    const body = await req.json();
    console.log('Received body:', body);  // להדפיס את מה שהשרת מקבל
    return createNote(body);
}

async function createNote(body: any) {
    const { data, error } = await supabase.from('notes').insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
}

