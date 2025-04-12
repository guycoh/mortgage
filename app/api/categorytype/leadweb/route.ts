import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


export async function GET(req: NextRequest) {    
    return getLeadWebs();
}

async function getLeadWebs() {
    const { data, error } = await supabase.from('leadweb').select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 200 });
}
// POST new lead web
export async function POST(req: NextRequest) {
    const body = await req.json();
    return createLeadWeb(body);
}

async function createLeadWeb(body: any) {
    const { data, error } = await supabase.from('leadweb').insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
}



