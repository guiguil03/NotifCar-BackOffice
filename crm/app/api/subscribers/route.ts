import { createAdminClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET() {
  const sb = createAdminClient()

  const { data, error } = await sb
    .from('user_subscriptions')
    .select(`
      user_id,
      status,
      stripe_customer_id,
      stripe_subscription_id,
      current_period_end,
      current_period_start,
      last_invoice_status,
      last_payment_error,
      cancel_at_period_end,
      created_at,
      updated_at,
      plan:subscription_plans(slug, name)
    `)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
