import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

function addInterval(dateStr: string, interval: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  if (interval === 'monthly') d.setMonth(d.getMonth() + 1)
  else if (interval === 'quarterly') d.setMonth(d.getMonth() + 3)
  else if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().split('T')[0]
}

export async function POST() {
  const sb = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: parents, error } = await sb
    .from('crm_invoices')
    .select('*, lines:crm_invoice_lines(*)')
    .eq('is_recurring', true)
    .lte('next_generation_date', today)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const generated: { number: string; client_name: string }[] = []

  for (const parent of parents ?? []) {
    const year = new Date().getFullYear()
    const { count } = await sb
      .from('crm_invoices')
      .select('*', { count: 'exact', head: true })
      .like('number', `F-${year}-%`)
    const seq = String((count ?? 0) + 1).padStart(3, '0')
    const number = `F-${year}-${seq}`

    const { data: newInv, error: insErr } = await sb
      .from('crm_invoices')
      .insert({
        number,
        type: 'FACTURE',
        contact_id: parent.contact_id,
        client_name: parent.client_name,
        client_email: parent.client_email,
        emission_date: today,
        validity_date: addInterval(today, 'monthly'),
        reference: parent.reference,
        notes: parent.notes,
        total_ht: parent.total_ht,
        total_tva: parent.total_tva,
        total_ttc: parent.total_ttc,
        status: 'sent',
        recurring_parent_id: parent.id,
      })
      .select()
      .single()

    if (insErr || !newInv) continue

    if (Array.isArray(parent.lines) && parent.lines.length > 0) {
      await sb.from('crm_invoice_lines').insert(
        parent.lines.map((l: { description: string; quantity: number; unit_price: number; sort_order?: number }, i: number) => ({
          invoice_id: newInv.id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          sort_order: l.sort_order ?? i,
        }))
      )
    }

    await sb
      .from('crm_invoices')
      .update({
        next_generation_date: addInterval(parent.next_generation_date ?? today, parent.recurring_interval ?? 'monthly'),
      })
      .eq('id', parent.id)

    generated.push({ number, client_name: parent.client_name })
  }

  return NextResponse.json({ generated, count: generated.length })
}
