-- The original constraint accepted only 2 letters + 1 digit (e.g. CQ1, CO2).
-- The real CGS roster has codes like TR13, TR12, etc. — relax to 1-3 digits.

alter table public.shifts
  drop constraint if exists shifts_code_check;

alter table public.shifts
  add constraint shifts_code_check
  check (code ~ '^[A-Z]{2,3}[0-9]{1,3}$');
