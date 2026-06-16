import { createAdminClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('crm_invoices')
    .select('*, lines:crm_invoice_lines(*), contact:crm_contacts(id, name, company, email)')
    .eq('id', id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sb = createAdminClient()
  const body = await req.json()

  const updatePayload: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }
  delete updatePayload.lines
  delete updatePayload.contact

  if (body.lines) {
    const lines = body.lines as { quantity: number; unit_price: number }[]
    const total_ht = lines.reduce((acc, l) => acc + (l.quantity ?? 0) * (l.unit_price ?? 0), 0)
    updatePayload.total_ht = total_ht
    updatePayload.total_tva = total_ht * 0.2
    updatePayload.total_ttc = total_ht + total_ht * 0.2

    await sb.from('crm_invoice_lines').delete().eq('invoice_id', id)
    if (lines.length > 0) {
      await sb.from('crm_invoice_lines').insert(
        lines.map((l: { description?: string; quantity: number; unit_price: number; sort_order?: number }, i: number) => ({
          invoice_id: id,
          description: l.description ?? '',
          quantity: l.quantity,
          unit_price: l.unit_price,
          sort_order: l.sort_order ?? i,
        }))
      )
    }
  }

  const { data, error } = await sb
    .from('crm_invoices')
    .update(updatePayload)
    .eq('id', id)
    .select('*, lines:crm_invoice_lines(*), contact:crm_contacts(id, name, company)')
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
  const { error } = await sb.from('crm_invoices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
