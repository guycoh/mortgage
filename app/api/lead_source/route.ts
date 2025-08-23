import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET ALL LEAD_SOURCE
export async function GET(req: NextRequest) {    
    return getLeadSource();
}
async function getLeadSource() {
    const { data, error } = await supabase.from('lead_source').select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 200 });
}



//CREATE NEW LEAD_SOURCE

export async function POST(req: NextRequest) {
    const body = await req.json();
    console.log('Received body:', body);  // להדפיס את מה שהשרת מקבל
    return createLeadSource(body);
}

async function createLeadSource(body: any) {
    const { data, error } = await supabase.from('lead_source').insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
}

