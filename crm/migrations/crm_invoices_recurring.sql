-- Factures récurrentes
-- Run this in Supabase SQL editor

alter table crm_invoices
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurring_interval text check (recurring_interval in ('monthly', 'quarterly', 'yearly')),
  add column if not exists recurring_parent_id uuid references crm_invoices(id) on delete set null,
  add column if not exists next_generation_date date;

create index if not exists idx_crm_invoices_recurring
  on crm_invoices(next_generation_date)
  where is_recurring = true;
