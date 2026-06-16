import { createAdminClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const sb = createAdminClient()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const contactId = searchParams.get('contact_id')

  let query = sb
    .from('crm_tasks')
    .select('*, contact:crm_contacts(id, name, company)')
    .order('due_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (contactId) query = query.eq('contact_id', contactId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sb = createAdminClient()
  const body = await req.json()
  const { data, error } = await sb
    .from('crm_tasks')
    .insert({
      title: body.title,
      description: body.description ?? null,
      due_date: body.due_date ?? null,
      priority: body.priority ?? 'normale',
      status: body.status ?? 'pending',
      contact_id: body.contact_id ?? null,
      deal_id: body.deal_id ?? null,
      assigned_to: body.assigned_to ?? 'Admin',
    })
    .select('*, contact:crm_contacts(id, name, company)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
