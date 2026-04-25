-- CGS Porter — admin panel extensions
-- Adds: source enum on services, client_email, clients table, app_settings singleton

-- ─────────────────────────────────────────────────────────────────────────
-- services: source + client_email
-- ─────────────────────────────────────────────────────────────────────────
create type public.service_source as enum ('web', 'dnata', 'swissport', 'prive');

alter table public.services
  add column source       public.service_source not null default 'web',
  add column client_email text;

-- For source-based reporting (Rapports → Par source pie chart).
create index services_source_idx on public.services (source);

-- ─────────────────────────────────────────────────────────────────────────
-- clients — CRM table (1 row per unique client across services)
-- ─────────────────────────────────────────────────────────────────────────
create table public.clients (
  id          uuid        primary key default gen_random_uuid(),
  full_name   text        not null,
  email       text,
  phone       text,
  source      public.service_source,
  notes       text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index clients_email_idx on public.clients (lower(email))
  where email is not null;
create index clients_phone_idx on public.clients (phone)
  where phone is not null;

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- Backfill / future-proof: link a service to a client record (nullable for now).
alter table public.services
  add column client_id uuid references public.clients(id) on delete set null;
create index services_client_id_idx on public.services (client_id);

-- ─────────────────────────────────────────────────────────────────────────
-- app_settings — singleton row (id=1) with company info + tariff
-- ─────────────────────────────────────────────────────────────────────────
create table public.app_settings (
  id                       smallint primary key default 1
                           check (id = 1),
  company_name             text not null default 'CGS — Carrying Geneva Services',
  company_address          text not null default 'Aéroport de Genève, 1215 Genève',
  company_phone            text not null default '+41 22 717 71 00',
  company_email            text not null default 'porter@cgs-ltd.com',
  base_price_chf           numeric(7,2) not null default 25.00,
  bags_included_in_base    smallint     not null default 3,
  per_extra_bag_price_chf  numeric(7,2) not null default 5.00,
  webhook_apps_script_url  text,
  app_version              text not null default '2.4.1',
  updated_at               timestamptz not null default now()
);

create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

insert into public.app_settings (id) values (1) on conflict do nothing;

-- ─────────────────────────────────────────────────────────────────────────
-- RLS for new tables
-- ─────────────────────────────────────────────────────────────────────────
alter table public.clients      enable row level security;
alter table public.app_settings enable row level security;

-- clients: only chef can read or write CRM data.
create policy "clients: chef reads all"
  on public.clients for select
  using ((select public.current_role()) = 'chef');

create policy "clients: chef writes all"
  on public.clients for all
  using ((select public.current_role()) = 'chef')
  with check ((select public.current_role()) = 'chef');

-- app_settings: any authenticated user can read tariff (porter app needs the
-- price to recompute totals); only chef can write.
create policy "app_settings: authenticated reads"
  on public.app_settings for select
  using ((select auth.uid()) is not null);

create policy "app_settings: chef writes"
  on public.app_settings for update
  using ((select public.current_role()) = 'chef')
  with check ((select public.current_role()) = 'chef');

alter publication supabase_realtime add table public.clients;
alter publication supabase_realtime add table public.app_settings;
