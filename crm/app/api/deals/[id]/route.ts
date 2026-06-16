import { createAdminClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = createAdminClient()
  const body = await req.json()
  const { data, error } = await sb
    .from('crm_deals')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, contact:crm_contacts(id, name, company, email)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = createAdminClient()
  const { error } = await sb.from('crm_deals').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
