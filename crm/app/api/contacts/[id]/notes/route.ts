import { createAdminClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('crm_notes')
    .select('*')
    .eq('contact_id', id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = createAdminClient()
  const body = await req.json()
  const { data, error } = await sb
    .from('crm_notes')
    .insert({ contact_id: id, content: body.content, type: body.type ?? 'note', author: body.author ?? 'Admin' })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await sb
    .from('crm_contacts')
    .update({ last_contact_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)

  return NextResponse.json(data, { status: 201 })
}
