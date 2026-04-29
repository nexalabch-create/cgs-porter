#!/usr/bin/env node
// Wipes services + shifts + notifications, then seeds the 2026-04-30 demo:
//   · 10 shifts (3 chefs + 7 porters)
//   · 15 services (mix dnata / swissport / prive) with realistic times
//
// Marc Dubois is included in the roster so the chef→Marc assign demo flow
// works out of the box.
//
// Usage:  node scripts/seed-tomorrow-demo.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadEnv(file) {
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
loadEnv(path.join(projectRoot, '.env.local'));

const REF = process.env.SUPABASE_PROJECT_REF;
const PAT = process.env.SUPABASE_PERSONAL_ACCESS_TOKEN;
if (!REF || !PAT) { console.error('Missing PROJECT_REF/PAT'); process.exit(1); }

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`SQL ${r.status}: ${await r.text()}`);
  return r.json();
}
const lit = (v) => v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`;

const DEMO_DATE = '2026-04-30';

// ─── 1. Wipe ─────────────────────────────────────────────────────────────
console.log('\n🧹  Wiping services + shifts + notifications + clients...');
await sql('truncate table public.notifications cascade;');
await sql('truncate table public.services cascade;');
await sql('truncate table public.shifts cascade;');
await sql('truncate table public.clients cascade;');
console.log('   ✓ all clear');

// ─── 2. Resolve user IDs by email ────────────────────────────────────────
const emails = [
  'mate.torgvaidze@cgs-ltd.com',
  'mohamed.afak.dadi@cgs-ltd.com',
  'khalid.el.ghazouani@cgs-ltd.com',
  'imad.moukni@cgs-ltd.com',
  'konstantinos.moustakopoulos@cgs-ltd.com',
  'mamadou.yaya.diallo@cgs-ltd.com',
  'juan.carlos.vazquez.pena@cgs-ltd.com',
  'vilijon.bairami@cgs-ltd.com',
  'marc.dubois@cgs-ltd.com',
  'adrien.mickael.lapauw@cgs-ltd.com',
];
const inList = emails.map(lit).join(',');
const rows = await sql(`select id, email from public.users where email in (${inList});`);
const idByEmail = Object.fromEntries(rows.map(r => [r.email, r.id]));
for (const e of emails) {
  if (!idByEmail[e]) { console.error(`Missing user ${e}`); process.exit(1); }
}
console.log(`\n👥  Resolved ${emails.length} user IDs`);

// ─── 3. Insert 10 shifts (2026-04-30) ────────────────────────────────────
const shifts = [
  { email: 'mohamed.afak.dadi@cgs-ltd.com',          code: 'CQ1',  start: '06:00', end: '14:30', pause: 30 },
  { email: 'khalid.el.ghazouani@cgs-ltd.com',        code: 'CQ1',  start: '06:00', end: '14:30', pause: 30 },
  { email: 'mate.torgvaidze@cgs-ltd.com',            code: 'CO2',  start: '14:00', end: '22:30', pause: 30 },
  { email: 'imad.moukni@cgs-ltd.com',                code: 'TR9',  start: '09:00', end: '17:30', pause: 30 },
  { email: 'konstantinos.moustakopoulos@cgs-ltd.com',code: 'TR9',  start: '09:00', end: '17:30', pause: 30 },
  { email: 'mamadou.yaya.diallo@cgs-ltd.com',        code: 'TR9',  start: '09:00', end: '17:30', pause: 30 },
  { email: 'juan.carlos.vazquez.pena@cgs-ltd.com',   code: 'TR13', start: '13:00', end: '21:30', pause: 30 },
  { email: 'vilijon.bairami@cgs-ltd.com',            code: 'TR13', start: '13:00', end: '21:30', pause: 30 },
  { email: 'marc.dubois@cgs-ltd.com',                code: 'TR13', start: '13:00', end: '21:30', pause: 30 },
  { email: 'adrien.mickael.lapauw@cgs-ltd.com',      code: 'CO4',  start: '14:00', end: '22:30', pause: 30 },
];
const shiftValues = shifts.map(s => `(
  ${lit(idByEmail[s.email])}::uuid, ${lit(DEMO_DATE)}::date,
  ${lit(s.code)}, ${lit(s.start)}::time, ${lit(s.end)}::time, ${s.pause}
)`).join(',\n  ');
await sql(`
  insert into public.shifts (user_id, shift_date, code, starts_at, ends_at, pause_minutes)
  values
    ${shiftValues};
`);
console.log(`📅  Inserted ${shifts.length} shifts for ${DEMO_DATE}`);

// ─── 4. Insert 15 services (2026-04-30) ──────────────────────────────────
// Pricing helpers (mirrors lib/pricing.js):
//   dnata/swissport → base 15 + 4·max(0,bags-3)
//   prive           → base 25 + 5·max(0,bags-3)
const tariff = {
  dnata:    { base: 15, extra: 4 },
  swissport:{ base: 15, extra: 4 },
  prive:    { base: 25, extra: 5 },
};

const services = [
  { num:  1, source: 'dnata',     flight: 'EK455',  time: '06:30', client: 'Mr. Khalid Al-Mansouri',     meeting: 'T1 · Porte A12',        bags: 4, flow: 'arrivee', agency: 'Emirates VIP Services',     phone: '+41 22 717 71 11' },
  { num:  2, source: 'swissport', flight: 'LX1820', time: '07:15', client: 'Mme Sophie Lefèvre',         meeting: 'T2 · Comptoir First',   bags: 2, flow: 'depart',  agency: 'Swiss First Lounge',        phone: '+41 22 799 19 00' },
  { num:  3, source: 'dnata',     flight: 'QR97',   time: '08:00', client: 'Mlle Léa Bertrand',          meeting: 'T1 · Bagages',          bags: 1, flow: 'arrivee', agency: 'Qatar Privilege Club',      phone: '+41 22 999 24 24' },
  { num:  4, source: 'prive',     flight: 'PRIVÉ',     time: '09:30', client: 'M. & Mme Tanaka',            meeting: 'Hall arrivées · P3',    bags: 5, flow: 'arrivee', agency: 'Limousine Geneva Privé',    phone: '+41 79 401 22 22' },
  { num:  5, source: 'swissport', flight: 'BA729',  time: '10:15', client: 'Mr. Julian Whitford',        meeting: 'T1 · Salon BA',         bags: 3, flow: 'depart',  agency: 'British Airways',           phone: '+41 22 717 87 00' },
  { num:  6, source: 'dnata',     flight: 'EK453',  time: '11:05', client: 'Mr. Yusuf Bin Rashid',       meeting: 'T1 · Porte A14',        bags: 6, flow: 'depart',  agency: 'Emirates VIP Services',     phone: '+41 22 717 71 11' },
  { num:  7, source: 'swissport', flight: 'LH1188', time: '11:45', client: 'Dr. Anna Schneider',         meeting: 'T2 · Comptoir Senator', bags: 2, flow: 'depart',  agency: 'Lufthansa HON Circle',      phone: '+41 22 717 81 81' },
  { num:  8, source: 'prive',     flight: 'PRIVÉ',     time: '12:30', client: 'Famille Al-Saud',            meeting: 'Salon VIP P5',          bags: 8, flow: 'depart',  agency: 'VIP Genève Conciergerie',   phone: '+41 79 555 80 80' },
  { num:  9, source: 'dnata',     flight: 'AF231',  time: '13:10', client: 'Mr. Elias Rouleau',          meeting: 'Hall arrivées · P2',    bags: 3, flow: 'arrivee', agency: 'Air France Premium',        phone: '+41 22 827 87 00' },
  { num: 10, source: 'swissport', flight: 'LX2811', time: '14:00', client: 'Mme Catherine Jonas',        meeting: 'T2 · Departures',       bags: 4, flow: 'depart',  agency: 'Swiss First Lounge',        phone: '+41 22 799 19 00' },
  { num: 11, source: 'prive',     flight: 'PRIVÉ',     time: '15:20', client: 'M. Reginald Howe',           meeting: 'Parking VIP P1',        bags: 2, flow: 'arrivee', agency: 'Geneva Concierge Premium',  phone: '+41 79 244 12 00' },
  { num: 12, source: 'dnata',     flight: 'EY63',   time: '16:00', client: 'Sheikh Faisal Al-Nahyan',    meeting: 'T1 · Porte A09',        bags: 7, flow: 'arrivee', agency: 'Etihad Diamond First',      phone: '+41 22 999 19 19' },
  { num: 13, source: 'swissport', flight: 'KL1928', time: '17:15', client: 'Mr. Stefan De Vries',        meeting: 'T2 · Salon KL',         bags: 2, flow: 'depart',  agency: 'KLM Premium',               phone: '+41 22 717 32 32' },
  { num: 14, source: 'prive',     flight: 'PRIVÉ',     time: '18:40', client: 'Mme Isabella Ricci',         meeting: 'Salon Privé · P4',      bags: 3, flow: 'arrivee', agency: 'Privilege Concierge',       phone: '+41 79 100 50 50' },
  { num: 15, source: 'dnata',     flight: 'EK456',  time: '21:30', client: 'Mr. & Mrs. Al-Thani',        meeting: 'T1 · Porte A12',        bags: 5, flow: 'depart',  agency: 'Emirates VIP Services',     phone: '+41 22 717 71 11' },
];

const svcValues = services.map(s => {
  const t = tariff[s.source];
  const base = t.base;
  const extraBags = Math.max(0, s.bags - 3);
  // base_price + per_bag_price (price per extra bag — bags<=3 → just base)
  const baseStr = base.toFixed(2);
  const perBagStr = t.extra.toFixed(2);
  const scheduledAt = `${DEMO_DATE}T${s.time}:00+02:00`;
  return `(
    ${s.num}, ${lit(s.source)}::service_source,
    ${lit(s.flight)}, ${lit(scheduledAt)}::timestamptz,
    ${lit(s.client)}, ${lit(s.meeting)}, ${s.bags},
    ${baseStr}, ${perBagStr},
    'todo'::svc_status,
    ${lit(s.agency)}, ${lit(s.phone)}, ${lit(s.flow)}::flow
  )`;
}).join(',\n  ');

await sql(`
  insert into public.services (
    service_num, source, flight, scheduled_at, client_name, meeting_point,
    bags, base_price_chf, per_bag_price_chf, status, agency, client_phone, flow
  ) values
    ${svcValues};
`);
console.log(`✈️   Inserted ${services.length} services for ${DEMO_DATE}`);

// ─── 5. Summary ──────────────────────────────────────────────────────────
const counts = await sql(`
  select 'shifts' as t, count(*) from public.shifts
  union all select 'services', count(*) from public.services
  union all select 'notifications', count(*) from public.notifications;
`);
console.log('\n📊  Counts:');
for (const r of counts) console.log(`   ${r.t}: ${r.count}`);
console.log(`\n✅  Demo state ready for ${DEMO_DATE}.`);
