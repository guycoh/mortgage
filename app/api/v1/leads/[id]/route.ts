import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';


const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


// GET BY ID

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const { id } = params;

    const { data, error } = await supabase.from('leads').select('*').eq('id', id).single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });
}