// app/api/categorytype/leadweb/[id]/route.ts

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// GET
export async function GET(req: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params

  const { data, error } = await supabase.from('leadweb').select('*').eq('id', id).single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 200 })
}

// PUT
export async function PUT(req: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params
  const updates = await req.json()

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const { data, error } = await supabase.from('status_call').update(updates).eq('id', id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json(data, { status: 200 })
}

// DELETE
export async function DELETE(req: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 })
  }

  const { error } = await supabase.from('status_call').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
