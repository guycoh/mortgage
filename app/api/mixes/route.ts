import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET ALL LOAN_MIXES
// export async function GET(req: NextRequest) {    
//     return getLoanMixes();
// }
// async function getLoanMixes() {
//     const { data, error } = await supabase.from('loan_mixes').select('*')
//     .order("status", { ascending: true });
//     ;
//     if (error) return NextResponse.json({ error: error.message }, { status: 400 });
//     return NextResponse.json(data, { status: 200 });
// }

// GET ALL LEADS
export async function GET(req: NextRequest) {    
    return getLoanMixes();
}
async function getLoanMixes() {
    const { data, error } = await supabase.from('loan_mixes').select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 200 });
}









// POST NEW LOAN_MIXWS
export async function POST(req: NextRequest) {
    const body = await req.json();
    return createLoanMixes(body);
}

async function createLoanMixes(body: any) {
    const { data, error } = await supabase.from('loan_mixes').insert([body]);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json(data, { status: 201 });
}