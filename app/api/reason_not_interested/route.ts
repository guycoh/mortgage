import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET ALL STATUS CALL
export async function GET(req: NextRequest) {    
    return getReasonNotIntrested();
}
async function getReasonNotIntrested() {
    const { data, error } = await supabase.from('reason_not_interested').select('*')
    .order("status", { ascending: true });
    ;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 200 });
}


// POST NEW STATUS CALL
export async function POST(req: NextRequest) {
    const body = await req.json();
    return createReasonNotIntrested(body);
}

async function createReasonNotIntrested(body: any) {
    const { data, error } = await supabase.from('reason_not_interested').insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
}