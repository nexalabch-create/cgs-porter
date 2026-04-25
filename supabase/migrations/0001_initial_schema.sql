-- CGS Porter — initial schema
-- Applied skill: supabase-postgres-best-practices
--   · schema-lowercase-identifiers — snake_case throughout
--   · schema-primary-keys           — UUID PKs (compatible with auth.users)
--   · schema-data-types             — `time`, `interval`, enums via CHECK
--   · schema-foreign-key-indexes    — every FK has its own index
--   · schema-constraints            — NOT NULL + CHECK enums + UNIQUE where appropriate
--   · security-rls-basics           — RLS enabled on every public table
--   · security-rls-performance      — auth.uid() wrapped in (select …) and policy columns indexed

-- =========================================================================
-- ENUMS
-- =========================================================================

create type public.user_role  as enum ('chef', 'porter');
create type public.flow       as enum ('arrivee', 'depart');
create type public.svc_status as enum ('todo', 'active', 'done');

-- =========================================================================
-- USERS — extends Supabase auth.users with profile + role
-- =========================================================================
create table public.users (
  id           uuid        primary key references auth.users(id) on delete cascade,
  email        text        not null unique,
  role         public.user_role not null default 'porter',
  first_name   text        not null,
  last_name    text        not null,
  initials     text        generated always as (
    upper(left(first_name, 1) || left(last_name, 1))
  ) stored,
  station      text        not null default 'GVA',
  created_at   timestamptz not null default now()
);

create index users_role_idx on public.users (role);

-- =========================================================================
-- SERVICES — the porter's daily work units
-- =========================================================================
create table public.services (
  id                  uuid        primary key default gen_random_uuid(),
  flight              text        not null,
  scheduled_at        timestamptz not null,                            -- combine date + time client-side
  client_name         text        not null,
  meeting_point       text        not null,
  bags                smallint    not null default 1
                                  check (bags between 0 and 50),
  base_price_chf      numeric(7,2) not null default 25.00,
  per_bag_price_chf   numeric(7,2) not null default 12.00,
  status              public.svc_status not null default 'todo',
  agency              text        not null,
  client_phone        text        not null,
  flow                public.flow not null,
  remarques           text        not null default '',
  assigned_porter_id  uuid        references public.users(id) on delete set null,
  started_at          timestamptz,
  completed_at        timestamptz,
  elapsed_seconds     integer     generated always as (
    case
      when started_at is null then 0
      when completed_at is null then 0
      else extract(epoch from (completed_at - started_at))::integer
    end
  ) stored,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- Status timestamps must be coherent.
  constraint services_started_when_active check (
    (status = 'todo'   and started_at is null   and completed_at is null) or
    (status = 'active' and started_at is not null and completed_at is null) or
    (status = 'done'   and started_at is not null and completed_at is not null)
  )
);

-- (Skill · schema-foreign-key-indexes) FK columns get their own index.
create index services_assigned_porter_id_idx on public.services (assigned_porter_id);
-- (Skill · query-composite-indexes) the "today's services for porter X" query.
create index services_porter_day_idx on public.services (
  assigned_porter_id, scheduled_at
);
-- (Skill · query-partial-indexes) hot path: chef looking at unassigned queue.
create index services_unassigned_idx on public.services (scheduled_at)
  where assigned_porter_id is null;
create index services_status_idx on public.services (status);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- =========================================================================
-- SHIFTS — porter's planned schedule (CQ1, CQ2, TR5, TR6, …)
-- =========================================================================
create table public.shifts (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users(id) on delete cascade,
  shift_date   date        not null,
  code         text        not null check (code ~ '^[A-Z]{2}[0-9]$'),
  starts_at    time        not null,
  ends_at      time        not null,
  pause_minutes smallint   not null default 30 check (pause_minutes between 0 and 240),
  unique (user_id, shift_date)
);

create index shifts_user_id_idx on public.shifts (user_id);
create index shifts_date_idx    on public.shifts (shift_date);

-- =========================================================================
-- ROW-LEVEL SECURITY
-- =========================================================================
alter table public.users    enable row level security;
alter table public.services enable row level security;
alter table public.shifts   enable row level security;

-- Helper: cached current-user role lookup (security-definer to bypass RLS recursion).
create or replace function public.current_role()
returns public.user_role
language sql
security definer
set search_path = ''
stable
as $$
  select role from public.users where id = (select auth.uid());
$$;

-- ── users ────────────────────────────────────────────────────────────────
-- (Skill · security-rls-performance) auth.uid() wrapped in (select …) so it's
-- evaluated once per query, not once per row.
create policy "users: read own row"
  on public.users for select
  using ((select auth.uid()) = id);

create policy "users: chef reads everyone"
  on public.users for select
  using ((select public.current_role()) = 'chef');

create policy "users: update own row"
  on public.users for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ── services ─────────────────────────────────────────────────────────────
create policy "services: porter reads assigned"
  on public.services for select
  using (assigned_porter_id = (select auth.uid()));

create policy "services: chef reads all"
  on public.services for select
  using ((select public.current_role()) = 'chef');

create policy "services: porter updates assigned"
  on public.services for update
  using (assigned_porter_id = (select auth.uid()))
  with check (assigned_porter_id = (select auth.uid()));

create policy "services: chef writes all"
  on public.services for all
  using ((select public.current_role()) = 'chef')
  with check ((select public.current_role()) = 'chef');

-- ── shifts ───────────────────────────────────────────────────────────────
create policy "shifts: read own"
  on public.shifts for select
  using (user_id = (select auth.uid()));

create policy "shifts: chef reads all"
  on public.shifts for select
  using ((select public.current_role()) = 'chef');

create policy "shifts: chef writes all"
  on public.shifts for all
  using ((select public.current_role()) = 'chef')
  with check ((select public.current_role()) = 'chef');

-- =========================================================================
-- REALTIME — porter app subscribes to its own assignments
-- =========================================================================
alter publication supabase_realtime add table public.services;
alter publication supabase_realtime add table public.shifts;
