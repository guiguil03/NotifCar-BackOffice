-- CRM Tasks / Relances table
-- Run this in Supabase SQL editor

create table if not exists crm_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  due_date timestamptz,
  priority text not null default 'normale' check (priority in ('urgente', 'normale', 'basse')),
  status text not null default 'pending' check (status in ('pending', 'done', 'cancelled')),
  contact_id uuid references crm_contacts(id) on delete set null,
  deal_id uuid references crm_deals(id) on delete set null,
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_crm_tasks_status on crm_tasks(status);
create index if not exists idx_crm_tasks_due on crm_tasks(due_date) where status = 'pending';
create index if not exists idx_crm_tasks_contact on crm_tasks(contact_id);

-- Trigger pour updated_at
create or replace function trg_crm_tasks_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'done' and old.status <> 'done' then
    new.completed_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists crm_tasks_updated_at on crm_tasks;
create trigger crm_tasks_updated_at
  before update on crm_tasks
  for each row execute function trg_crm_tasks_updated_at();
