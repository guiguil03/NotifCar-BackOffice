import { createAdminClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULTS = {
  id: 1,
  company_name: 'Notifcar SAS',
  company_address: '',
  company_zip: '',
  company_city: '',
  company_country: 'France',
  company_email: '',
  company_phone: '',
  company_website: '',
  siret: '',
  tva_number: '',
  tva_rate: 20,
  iban: '',
  bic: '',
  invoice_footer: 'Paiement à 30 jours. TVA non applicable — article 293 B du CGI.',
  logo_emoji: '🚗',
}

export async function GET() {
  const sb = createAdminClient()
  const { data, error } = await sb.from('crm_settings').select('*').eq('id', 1).maybeSingle()
  if (error) return NextResponse.json(DEFAULTS)
  return NextResponse.json(data ?? DEFAULTS)
}

export async function PUT(req: NextRequest) {
  const sb = createAdminClient()
  const body = await req.json()
  delete body.created_at
  delete body.updated_at

  const { data: existing } = await sb.from('crm_settings').select('id').eq('id', 1).maybeSingle()

  if (!existing) {
    const { data, error } = await sb.from('crm_settings').insert({ ...body, id: 1 }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await sb.from('crm_settings').update(body).eq('id', 1).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
