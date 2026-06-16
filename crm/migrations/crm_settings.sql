-- Paramètres entreprise (singleton)
-- Run this in Supabase SQL editor

create table if not exists crm_settings (
  id int primary key default 1,
  company_name text not null default 'Notifcar SAS',
  company_address text default '',
  company_zip text default '',
  company_city text default '',
  company_country text default 'France',
  company_email text default '',
  company_phone text default '',
  company_website text default '',
  siret text default '',
  tva_number text default '',
  tva_rate numeric not null default 20,
  iban text default '',
  bic text default '',
  invoice_footer text default 'Paiement à 30 jours. TVA non applicable — article 293 B du CGI.',
  logo_emoji text default '🚗',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint singleton check (id = 1)
);

-- Insert default row if not exists
insert into crm_settings (id) values (1) on conflict (id) do nothing;

create or replace function trg_crm_settings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists crm_settings_updated_at on crm_settings;
create trigger crm_settings_updated_at
  before update on crm_settings
  for each row execute function trg_crm_settings_updated_at();
