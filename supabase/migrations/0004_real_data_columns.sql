-- Adapt schema to the real CGS daily-services sheet:
--   · GUICHET (ticket counter) is a fourth source category.
--   · Each daily sheet numbers services 1..N for chef bookkeeping.
--   · Add cgs_employee_id (the company's internal payroll number from the roster).

-- 1. Add 'guichet' to service_source enum.
alter type public.service_source add value if not exists 'guichet';

-- 2. service_num — order on the daily sheet (1, 2, 3 ...).
alter table public.services
  add column if not exists service_num smallint;

-- Composite index so "give me today's services in order" is one index scan.
create index if not exists services_day_num_idx on public.services (
  scheduled_at, service_num
);

-- 3. cgs_employee_id — the 4-5 digit ID from the printed roster (e.g. 10865 = Mate).
alter table public.users
  add column if not exists cgs_employee_id text;

create unique index if not exists users_cgs_employee_id_idx
  on public.users (cgs_employee_id)
  where cgs_employee_id is not null;
