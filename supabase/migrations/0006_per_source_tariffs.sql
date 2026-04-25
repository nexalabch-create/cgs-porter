-- Per-source tariffs. Real CGS pricing differs by service source:
--   · DNATA + Swissport → 1-3 bagages = 15 CHF, +4 CHF par bagage supplémentaire.
--   · Privé             → 1-3 bagages = 25 CHF, +5 CHF par bagage supplémentaire.
-- The legacy services.base_price_chf + per_bag_price_chf columns stay in place
-- for backward-compat with already-seeded rows; the app stops reading them and
-- recomputes totals live from (source, bags, app_settings).

alter table public.app_settings
  add column if not exists dnata_swissport_base_chf      numeric(7,2) not null default 15.00,
  add column if not exists dnata_swissport_extra_bag_chf numeric(7,2) not null default  4.00,
  add column if not exists prive_base_chf                numeric(7,2) not null default 25.00,
  add column if not exists prive_extra_bag_chf           numeric(7,2) not null default  5.00;

-- The bags_included_in_base column already exists (default 3).
-- If somehow not, ensure it's there.
alter table public.app_settings
  add column if not exists bags_included_in_base smallint not null default 3;
