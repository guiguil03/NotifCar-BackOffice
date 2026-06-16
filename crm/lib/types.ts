export interface CRMContact {
  id: string
  name: string
  email: string
  phone?: string | null
  company?: string | null
  role?: string | null
  stage: 'lead' | 'prospect' | 'negocie' | 'gagne' | 'perdu'
  priority: 'haute' | 'moyenne' | 'basse'
  source?: string | null
  notes?: string | null
  estimated_value?: string | null
  assigned_to?: string | null
  tags?: string[]
  last_contact_at?: string | null
  created_at: string
  updated_at: string
  deals?: { count: number }[]
  activity?: { count: number }[]
}

export interface CRMDeal {
  id: string
  contact_id?: string | null
  title: string
  amount_monthly?: number | null
  stage: 'lead' | 'prospect' | 'negocie' | 'gagne' | 'perdu'
  days_in_stage: number
  notes?: string | null
  expected_close?: string | null
  created_at: string
  updated_at: string
  contact?: CRMContact | null
}

export interface CRMInvoiceLine {
  id?: string
  invoice_id?: string
  description: string
  quantity: number
  unit_price: number
  total?: number
  sort_order?: number
}

export interface CRMInvoice {
  id: string
  number: string
  type: 'DEVIS' | 'FACTURE'
  contact_id?: string | null
  client_name: string
  client_email?: string | null
  emission_date: string
  validity_date?: string | null
  reference?: string | null
  notes?: string | null
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  total_ht: number
  total_tva: number
  total_ttc: number
  is_recurring?: boolean
  recurring_interval?: 'monthly' | 'quarterly' | 'yearly' | null
  recurring_parent_id?: string | null
  next_generation_date?: string | null
  created_at: string
  updated_at: string
  lines?: CRMInvoiceLine[]
  contact?: CRMContact | null
}

export interface CRMNote {
  id: string
  contact_id: string
  author: string
  type: 'note' | 'call' | 'email' | 'rdv'
  content: string
  created_at: string
}

export interface CRMSettings {
  id: number
  company_name: string
  company_address: string
  company_zip: string
  company_city: string
  company_country: string
  company_email: string
  company_phone: string
  company_website: string
  siret: string
  tva_number: string
  tva_rate: number
  iban: string
  bic: string
  invoice_footer: string
  logo_emoji: string
  created_at: string
  updated_at: string
}

export interface CRMTask {
  id: string
  title: string
  description?: string | null
  due_date?: string | null
  priority: 'urgente' | 'normale' | 'basse'
  status: 'pending' | 'done' | 'cancelled'
  contact_id?: string | null
  deal_id?: string | null
  assigned_to?: string | null
  created_at: string
  updated_at: string
  completed_at?: string | null
  contact?: { id: string; name: string; company: string | null } | null
}
