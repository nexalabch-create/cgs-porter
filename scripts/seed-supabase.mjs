#!/usr/bin/env node
// Seed CGS Porter Supabase project end-to-end:
//   1. Creates auth users (1 chef + 19 porters) via the Admin Auth API.
//   2. Inserts matching public.users profile rows (FK lines up with auth.users.id).
//   3. Inserts ~50 demo services across the last 30 days.
//
// Idempotent — re-running will upsert profile rows and skip existing emails.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// .env.local loader
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('='); if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}
loadDotEnv(path.join(projectRoot, '.env.local'));

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const PAT         = process.env.SUPABASE_PERSONAL_ACCESS_TOKEN;
const SR_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL_BASE    = `https://${PROJECT_REF}.supabase.co`;

if (!PROJECT_REF || !PAT || !SR_KEY) {
  console.error('Missing one of SUPABASE_PROJECT_REF / PAT / SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Default password for ALL seeded accounts (user can change in Auth UI later).
const DEMO_PASSWORD = 'CgsPorter2026!';

// ── Roster (kept in sync with src/data/porters.js) ───────────────────────
const ROSTER = [
  { id: 'mt',  email: 'mate.torgvaidze@cgs-ltd.com',   role: 'chef',   first_name: 'Mate',     last_name: 'Torgvaidze' },
  { id: 'p2',  email: 'marc.dubois@cgs-ltd.com',       role: 'porter', first_name: 'Marc',     last_name: 'Dubois' },
  { id: 'p3',  email: 'julien.moreau@cgs-ltd.com',     role: 'porter', first_name: 'Julien',   last_name: 'Moreau' },
  { id: 'p4',  email: 'lea.bertrand@cgs-ltd.com',      role: 'porter', first_name: 'Léa',      last_name: 'Bertrand' },
  { id: 'p5',  email: 'karim.benali@cgs-ltd.com',      role: 'porter', first_name: 'Karim',    last_name: 'Benali' },
  { id: 'p6',  email: 'anais.roche@cgs-ltd.com',       role: 'porter', first_name: 'Anaïs',    last_name: 'Roche' },
  { id: 'p7',  email: 'thomas.schneider@cgs-ltd.com',  role: 'porter', first_name: 'Thomas',   last_name: 'Schneider' },
  { id: 'p8',  email: 'camille.petit@cgs-ltd.com',     role: 'porter', first_name: 'Camille',  last_name: 'Petit' },
  { id: 'p9',  email: 'hugo.martin@cgs-ltd.com',       role: 'porter', first_name: 'Hugo',     last_name: 'Martin' },
  { id: 'p10', email: 'aicha.diallo@cgs-ltd.com',      role: 'porter', first_name: 'Aïcha',    last_name: 'Diallo' },
  { id: 'p11', email: 'ricardo.almeida@cgs-ltd.com',   role: 'porter', first_name: 'Ricardo',  last_name: 'Almeida' },
  { id: 'p12', email: 'yasmine.haddad@cgs-ltd.com',    role: 'porter', first_name: 'Yasmine',  last_name: 'Haddad' },
  { id: 'p13', email: 'pierre.girard@cgs-ltd.com',     role: 'porter', first_name: 'Pierre',   last_name: 'Girard' },
  { id: 'p14', email: 'elena.rossi@cgs-ltd.com',       role: 'porter', first_name: 'Elena',    last_name: 'Rossi' },
  { id: 'p15', email: 'mohamed.berrada@cgs-ltd.com',   role: 'porter', first_name: 'Mohamed',  last_name: 'Berrada' },
  { id: 'p16', email: 'zoe.chevalier@cgs-ltd.com',     role: 'porter', first_name: 'Zoé',      last_name: 'Chevalier' },
  { id: 'p17', email: 'antoine.vidal@cgs-ltd.com',     role: 'porter', first_name: 'Antoine',  last_name: 'Vidal' },
  { id: 'p18', email: 'nadia.meier@cgs-ltd.com',       role: 'porter', first_name: 'Nadia',    last_name: 'Meier' },
  { id: 'p19', email: 'sofia.costa@cgs-ltd.com',       role: 'porter', first_name: 'Sofia',    last_name: 'Costa' },
  { id: 'p20', email: 'leo.bonnet@cgs-ltd.com',        role: 'porter', first_name: 'Léo',      last_name: 'Bonnet' },
];

// ── Helpers ──────────────────────────────────────────────────────────────
async function adminAuth(method, pathname, body) {
  const res = await fetch(`${URL_BASE}/auth/v1${pathname}`, {
    method,
    headers: {
      apikey: SR_KEY,
      Authorization: `Bearer ${SR_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, ok: res.ok, body: json };
}

async function runSQL(query) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

// SQL string escape — fine for our trusted seed data.
const lit = (v) => {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return `'${String(v).replace(/'/g, "''")}'`;
};

// ── Step 1: create auth users (skip if email already exists) ─────────────
async function ensureAuthUsers() {
  console.log(`\n→ Creating ${ROSTER.length} auth users...`);

  // First, list current users so we can skip duplicates without API noise.
  const list = await adminAuth('GET', '/admin/users?per_page=200');
  const existingByEmail = new Map(
    (list.body?.users ?? []).map(u => [u.email?.toLowerCase(), u])
  );

  const result = [];
  for (const r of ROSTER) {
    const found = existingByEmail.get(r.email.toLowerCase());
    if (found) {
      console.log(`  · ${r.email}  → existed (id=${found.id.slice(0, 8)}…)`);
      result.push({ ...r, auth_id: found.id });
      continue;
    }
    const { ok, status, body } = await adminAuth('POST', '/admin/users', {
      email: r.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: r.first_name,
        last_name:  r.last_name,
        role:       r.role,
      },
    });
    if (!ok) {
      console.error(`  ✗ ${r.email} (HTTP ${status}):`, body);
      throw new Error('User creation failed — aborting.');
    }
    console.log(`  ✓ ${r.email}  → created (id=${body.id.slice(0, 8)}…)`);
    result.push({ ...r, auth_id: body.id });
  }
  return result;
}

// ── Step 2: insert profile rows in public.users ──────────────────────────
async function upsertProfiles(users) {
  console.log(`\n→ Upserting ${users.length} profile rows in public.users...`);
  const values = users.map(u =>
    `(${lit(u.auth_id)}::uuid, ${lit(u.email)}, ${lit(u.role)}, ${lit(u.first_name)}, ${lit(u.last_name)}, 'GVA')`
  ).join(',\n  ');
  const sql = `
    insert into public.users (id, email, role, first_name, last_name, station)
    values
      ${values}
    on conflict (id) do update set
      email      = excluded.email,
      role       = excluded.role,
      first_name = excluded.first_name,
      last_name  = excluded.last_name,
      station    = excluded.station;`;
  await runSQL(sql);
  console.log('  ✓ Profiles upserted');
}

// ── Step 3: seed ~50 services across last 30 days ────────────────────────
const FLIGHT_PREFIXES = ['EK', 'LX', 'AF', 'BA', 'QR', 'LH', 'KL', 'TK', 'IB', 'AZ'];
const CLIENT_NAMES = [
  'Mr. Khalid Al-Mansouri', 'Mme Sophie Lefèvre', 'M. & Mme Tanaka',
  'Mr. Julian Whitford', 'Mlle Léa Bertrand', 'Dr. Schmidt',
  'Mr. Patel', 'M. Rossi', 'Mme Bonnet', 'Mr. Chen',
  'Famille Müller', 'Mme El Amrani', 'Mr. Andersson',
  'Mlle Dupont', 'Pr. Yamamoto', 'Mr. Garcia',
];
const MEETING_POINTS = [
  'Terminal 1 · Porte A12', 'Terminal 2 · Comptoir First',
  'Hall des arrivées · P3', 'Terminal 1 · Salon BA',
  'Terminal 1 · Bagages', 'Terminal 2 · Lounge Business',
];
const AGENCIES = ['Emirates VIP', 'Swiss First Lounge', 'Air France Premium', 'British Airways', 'Qatar Privilege', 'Lufthansa First', 'Privé'];
const SOURCES = ['web', 'dnata', 'swissport', 'prive'];
const FLOWS   = ['arrivee', 'depart'];

const rand  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randI = (a, b) => Math.floor(a + Math.random() * (b - a + 1));

async function seedServices(users) {
  console.log('\n→ Seeding ~60 demo services across the last 30 days...');
  const porters = users.filter(u => u.role === 'porter');
  const today = new Date(); today.setHours(12, 0, 0, 0);

  const rows = [];
  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const todays = dayOffset === 0 ? 5 : 1 + randI(1, 3);

    for (let i = 0; i < todays; i++) {
      const hour = randI(7, 21);
      const min  = [0, 15, 30, 45][randI(0, 3)];
      const scheduled = new Date(date);
      scheduled.setHours(hour, min, 0, 0);

      const isToday = dayOffset === 0;
      const isPast  = dayOffset > 0;
      const status  = isPast
        ? 'done'
        : (i === 0 ? 'active' : (i <= 1 ? 'todo' : 'todo'));

      // 30% unassigned for today's todos so the chef has a queue.
      const isUnassigned = isToday && status === 'todo' && Math.random() < 0.5;
      const porter = isUnassigned ? null : rand(porters);

      const bags = randI(1, 5);
      const flight = `${rand(FLIGHT_PREFIXES)}${randI(100, 999)}`;

      let started_at = null, completed_at = null;
      if (status === 'active') {
        started_at = new Date(scheduled.getTime() + randI(-5, 5) * 60000).toISOString();
      } else if (status === 'done') {
        const startMs = scheduled.getTime() + randI(-10, 10) * 60000;
        started_at   = new Date(startMs).toISOString();
        completed_at = new Date(startMs + randI(20, 60) * 60000).toISOString();
      }

      rows.push({
        flight,
        scheduled_at: scheduled.toISOString(),
        client_name:  rand(CLIENT_NAMES),
        meeting_point: rand(MEETING_POINTS),
        bags,
        base_price_chf: 25,
        per_bag_price_chf: 12,
        status,
        agency: rand(AGENCIES),
        client_phone: `+41 22 ${randI(700, 999)} ${randI(10, 99)} ${randI(10, 99)}`,
        flow:   rand(FLOWS),
        source: rand(SOURCES),
        remarques: '',
        assigned_porter_id: porter?.auth_id ?? null,
        started_at,
        completed_at,
      });
    }
  }

  // Wipe demo data first so re-running gives a fresh deterministic-ish set.
  await runSQL(`delete from public.services where remarques = '' and client_email is null;`);

  const valuesSql = rows.map(r =>
    `(${lit(r.flight)}, ${lit(r.scheduled_at)}::timestamptz, ${lit(r.client_name)},
       ${lit(r.meeting_point)}, ${r.bags}, ${r.base_price_chf}, ${r.per_bag_price_chf},
       ${lit(r.status)}::svc_status, ${lit(r.agency)}, ${lit(r.client_phone)},
       ${lit(r.flow)}::flow, ${lit(r.source)}::service_source,
       ${lit(r.remarques)},
       ${r.assigned_porter_id ? lit(r.assigned_porter_id) + '::uuid' : 'null'},
       ${r.started_at   ? lit(r.started_at)   + '::timestamptz' : 'null'},
       ${r.completed_at ? lit(r.completed_at) + '::timestamptz' : 'null'})`
  ).join(',\n      ');

  await runSQL(`
    insert into public.services
      (flight, scheduled_at, client_name, meeting_point, bags,
       base_price_chf, per_bag_price_chf, status, agency, client_phone,
       flow, source, remarques, assigned_porter_id, started_at, completed_at)
    values
      ${valuesSql};`);

  console.log(`  ✓ Inserted ${rows.length} services`);
}

// ── Main ─────────────────────────────────────────────────────────────────
(async () => {
  const users = await ensureAuthUsers();
  await upsertProfiles(users);
  await seedServices(users);

  console.log('\n→ Final counts:');
  const counts = await runSQL(`
    select
      (select count(*) from public.users)        as users,
      (select count(*) from public.services)     as services,
      (select count(*) from public.app_settings) as app_settings,
      (select count(*) from public.clients)      as clients;`);
  console.log('  ', JSON.stringify(counts[0]));

  console.log('\n✅ Seed complete.');
  console.log(`   Login → email of any roster member · password: ${DEMO_PASSWORD}`);
  console.log(`   Chef:  mate.torgvaidze@cgs-ltd.com`);
})().catch((e) => { console.error('\n✗ FAILED:', e.message); process.exit(1); });
