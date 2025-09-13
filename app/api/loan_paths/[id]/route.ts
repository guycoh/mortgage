import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// עוזר לשלוף ID מה-URL
const getIdFromRequest = (req: NextRequest) => {
  const url = new URL(req.url);
  return url.pathname.split('/').pop();
};

// GET
export async function GET(req: NextRequest) {
  const id = getIdFromRequest(req);
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  const { data, error } = await supabase.from('loan_paths').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json(data, { status: 200 });
}

// DELETE
export async function DELETE(req: NextRequest) {
  const id = getIdFromRequest(req);
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  const { error } = await supabase.from('loan_paths').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: 'Deleted successfully' }, { status: 200 });
}

// PUT (עדכון מלא)
export async function PUT(req: NextRequest) {
  const id = getIdFromRequest(req);
  const body = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  const { error } = await supabase.from('loan_paths').update(body).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: 'Updated successfully' }, { status: 200 });
}

// PATCH (עדכון חלקי)
export async function PATCH(req: NextRequest) {
  const id = getIdFromRequest(req);
  const body = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

  const { error } = await supabase.from('loan_paths').update(body).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ message: 'Patched successfully' }, { status: 200 });
}



