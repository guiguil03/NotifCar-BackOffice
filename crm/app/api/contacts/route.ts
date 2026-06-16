import { createAdminClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('crm_contacts')
    .select('*, deals:crm_deals(count), activity:crm_notes(count)')
    .order('updated_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sb = createAdminClient()
  const body = await req.json()
  const { data, error } = await sb.from('crm_contacts').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
