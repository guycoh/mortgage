

// app/api/v1/leads/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  const { data, error } = await supabase
  .from('leads')
  .select('*')
  .eq('id', id)
  .single();

if (error) {
  return NextResponse.json({ error: error.message }, { status: 400 });
}

return NextResponse.json(data, { status: 200 });






}