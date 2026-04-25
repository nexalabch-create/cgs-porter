-- Seed data for local dev / preview environments.
-- Run after the initial migration. Uses fixed UUIDs so the frontend SAMPLE
-- in src/App.jsx (Mate=mt, Marc=p2) maps cleanly to real DB rows.
--
-- NOTE: in production the auth.users rows are created by Supabase Auth.
-- For local seeding we insert directly into public.users assuming auth rows
-- already exist (run via `supabase db reset` after `supabase auth signup`).

-- Convenience namespace for the demo IDs.
-- Replace with real auth.uid() values when you wire actual sign-up.
insert into public.users (id, email, role, first_name, last_name) values
  ('00000000-0000-0000-0000-0000000000mt'::uuid, 'mate.torgvaidze@cgs-ltd.com', 'chef',   'Mate',    'Torgvaidze'),
  ('00000000-0000-0000-0000-0000000000p2'::uuid, 'marc.dubois@cgs-ltd.com',     'porter', 'Marc',    'Dubois'),
  ('00000000-0000-0000-0000-0000000000p3'::uuid, 'julien.moreau@cgs-ltd.com',   'porter', 'Julien',  'Moreau'),
  ('00000000-0000-0000-0000-0000000000p4'::uuid, 'lea.bertrand@cgs-ltd.com',    'porter', 'Léa',     'Bertrand'),
  ('00000000-0000-0000-0000-0000000000p5'::uuid, 'karim.benali@cgs-ltd.com',    'porter', 'Karim',   'Benali')
on conflict (id) do nothing;

-- April 25, 2026 services — matches src/App.jsx SAMPLE.
insert into public.services
  (id, flight, scheduled_at, client_name, meeting_point, bags, status,
   agency, client_phone, flow, remarques, assigned_porter_id)
values
  ('11111111-1111-4111-8111-111111111111', 'EK455',  '2026-04-25 14:30+02', 'Mr. Khalid Al-Mansouri',
   'Terminal 1 · Porte A12', 4, 'todo',
   'Emirates VIP Services', '+41 22 717 71 11', 'arrivee', '', null),
  ('22222222-2222-4222-8222-222222222222', 'LX1820', '2026-04-25 15:05+02', 'Mme Sophie Lefèvre',
   'Terminal 2 · Comptoir First', 2, 'active',
   'Swiss First Lounge', '+41 22 799 19 00', 'depart', 'Fauteuil roulant demandé.',
   '00000000-0000-0000-0000-0000000000p2'),
  ('33333333-3333-4333-8333-333333333333', 'AF231',  '2026-04-25 11:15+02', 'M. & Mme Tanaka',
   'Hall des arrivées · P3', 5, 'done',
   'Air France Premium', '+41 22 827 87 00', 'arrivee', '',
   '00000000-0000-0000-0000-0000000000p2'),
  ('44444444-4444-4444-8444-444444444444', 'BA729',  '2026-04-25 16:40+02', 'Mr. Julian Whitford',
   'Terminal 1 · Salon BA', 3, 'todo',
   'British Airways', '+41 22 717 87 00', 'depart', '', null),
  ('55555555-5555-4555-8555-555555555555', 'QR97',   '2026-04-25 18:00+02', 'Mlle Léa Bertrand',
   'Terminal 1 · Bagages', 1, 'todo',
   'Qatar Privilege Club', '+41 22 999 24 24', 'arrivee', '',
   '00000000-0000-0000-0000-0000000000p2');

-- s2 + s3 need timestamps to satisfy the status check.
update public.services set started_at = '2026-04-25 14:52+02'
  where flight = 'LX1820';
update public.services
  set started_at   = '2026-04-25 10:45+02',
      completed_at = '2026-04-25 11:15+02'
  where flight = 'AF231';
