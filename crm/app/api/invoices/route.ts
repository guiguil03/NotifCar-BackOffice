import { createAdminClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const sb = createAdminClient()
  const { data, error } = await sb
    .from('crm_invoices')
    .select('*, lines:crm_invoice_lines(*), contact:crm_contacts(id, name, company)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const sb = createAdminClient()
  const body = await req.json()

  const { type, client_name, client_email, emission_date, validity_date, reference, notes, lines, contact_id, is_recurring, recurring_interval, next_generation_date, status: bodyStatus } = body

  // Generate invoice number: D-YYYY-NNN or F-YYYY-NNN
  const year = new Date().getFullYear()
  const prefix = type === 'FACTURE' ? 'F' : 'D'
  const { count } = await sb
    .from('crm_invoices')
    .select('*', { count: 'exact', head: true })
    .like('number', `${prefix}-${year}-%`)
  const seq = String((count ?? 0) + 1).padStart(3, '0')
  const number = `${prefix}-${year}-${seq}`

  // Calculate totals
  const lineItems: { description: string; quantity: number; unit_price: number; sort_order?: number }[] = lines ?? []
  const total_ht = lineItems.reduce((acc, l) => acc + (l.quantity ?? 0) * (l.unit_price ?? 0), 0)
  const total_tva = total_ht * 0.2
  const total_ttc = total_ht + total_tva

  // Create invoice
  const { data: invoice, error: invErr } = await sb
    .from('crm_invoices')
    .insert({
      number,
      type,
      client_name,
      client_email: client_email ?? null,
      emission_date: emission_date ?? new Date().toISOString().split('T')[0],
      validity_date: validity_date ?? null,
      reference: reference ?? null,
      notes: notes ?? null,
      contact_id: contact_id ?? null,
      total_ht,
      total_tva,
      total_ttc,
      status: bodyStatus ?? 'draft',
      is_recurring: is_recurring ?? false,
      recurring_interval: recurring_interval ?? null,
      next_generation_date: next_generation_date ?? null,
    })
    .select()
    .single()

  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  // Insert lines
  if (lineItems.length > 0) {
    const { error: lineErr } = await sb.from('crm_invoice_lines').insert(
      lineItems.map((l, i) => ({
        invoice_id: invoice.id,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        sort_order: l.sort_order ?? i,
      }))
    )
    if (lineErr) return NextResponse.json({ error: lineErr.message }, { status: 500 })
  }

  // Return with lines
  const { data: full } = await sb
    .from('crm_invoices')
    .select('*, lines:crm_invoice_lines(*), contact:crm_contacts(id, name, company)')
    .eq('id', invoice.id)
    .single()

  return NextResponse.json(full, { status: 201 })
}
