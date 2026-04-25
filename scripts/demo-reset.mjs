#!/usr/bin/env node
//
// demo-reset.mjs — one-command setup for the next CGS demo session.
//
// What it does:
//   · Wipes public.services and public.shifts (so the chef starts on a clean
//     dashboard and can show the import flow live to the audience).
//   · KEEPS the 24 employees + 6 chefs + app_settings + clients intact.
//   · Prints a summary with URLs and credentials so you can hand the laptop
//     to anyone on the team without explaining anything.
//
// Flags:
//   --with-shifts       also pre-load today's roster from the demo CSV.
//   --with-services     also pre-load today's services from the demo CSV.
//   --full              both --with-shifts + --with-services.
//
// Examples:
//   node scripts/demo-reset.mjs              # clean slate, manual import on stage
//   node scripts/demo-reset.mjs --full       # everything pre-loaded
//
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
if (!REF || !PAT) {
  console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_PERSONAL_ACCESS_TOKEN in .env.local');
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const withShifts   = args.has('--with-shifts')   || args.has('--full');
const withServices = args.has('--with-services') || args.has('--full');

async function sql(query, attempt = 0) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (r.status === 503 && attempt < 3) {
    await new Promise((res) => setTimeout(res, 1000 * (attempt + 1)));
    return sql(query, attempt + 1);
  }
  if (!r.ok) throw new Error(`SQL ${r.status}: ${await r.text()}`);
  return r.json();
}

const lit = (v) => v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`;

// ── Step 1: wipe ─────────────────────────────────────────────────────────
console.log('\n🧹  Wiping demo state...');
await sql('truncate table public.services cascade;');
console.log('   ✓ public.services cleared');
await sql('truncate table public.shifts cascade;');
console.log('   ✓ public.shifts cleared');

// ── Step 2: pre-load shifts (today) ──────────────────────────────────────
if (withShifts) {
  console.log("\n📋  Loading today's shifts (roster) ...");
  const csv = fs.readFileSync(path.join(projectRoot, 'admin/public/templates/roster-2026-03-01.csv'), 'utf8');
  const lines = csv.trim().split('\n');
  const headers = lines.shift().split(',');
  const idIdx = headers.indexOf('cgs_employee_id');

  const users = await sql(`select id, cgs_employee_id, last_name from public.users;`);
  const byCgsId   = new Map(users.filter(u => u.cgs_employee_id).map(u => [u.cgs_employee_id, u]));
  const byLastLow = new Map(users.map(u => [u.last_name?.toLowerCase().trim(), u]));

  const today = new Date();
  const dateIso = today.toISOString().slice(0, 10);

  const rows = [];
  let unmatched = 0;
  for (const line of lines) {
    const c = line.split(',');
    const obj = Object.fromEntries(headers.map((h, i) => [h, c[i]]));
    const u = byCgsId.get(String(obj.cgs_employee_id || '').trim())
            || byLastLow.get(String(obj.last_name || '').toLowerCase().trim());
    if (!u) { unmatched++; continue; }
    const begin = obj.begin?.length === 5 ? `${obj.begin}:00` : obj.begin;
    const end   = obj.end?.length   === 5 ? `${obj.end}:00`   : obj.end;
    rows.push(`(${lit(u.id)}::uuid, ${lit(dateIso)}::date, ${lit(obj.code.trim())},
                ${lit(begin)}::time, ${lit(end)}::time, ${Number(obj.break_minutes) || 30})`);
  }
  await sql(`
    insert into public.shifts (user_id, shift_date, code, starts_at, ends_at, pause_minutes)
    values
      ${rows.join(',\n      ')}
    on conflict (user_id, shift_date) do update set
      code = excluded.code, starts_at = excluded.starts_at, ends_at = excluded.ends_at,
      pause_minutes = excluded.pause_minutes;
  `);
  console.log(`   ✓ inserted ${rows.length} shifts (${unmatched} unmatched)`);
}

// ── Step 3: pre-load services (today) ────────────────────────────────────
if (withServices) {
  console.log("\n✈️   Loading today's services (22 from the real sheet)...");
  const csv = fs.readFileSync(path.join(projectRoot, 'admin/public/templates/services-2026-03-01.csv'), 'utf8');
  const lines = csv.trim().split('\n');
  const headers = lines.shift().split(',');

  const today = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const dateIso = `${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;

  const rows = [];
  for (const line of lines) {
    // Naive CSV parse (no quoted commas in our seed).
    const c = line.split(',');
    const obj = Object.fromEntries(headers.map((h, i) => [h, c[i]]));
    const rdv = (obj.rdv || '').replace(/\./g, ':').slice(0, 5);
    const direction = (obj.direction || '').toLowerCase().startsWith('out') ? 'depart' : 'arrivee';
    const source = ['web','dnata','swissport','prive','guichet'].includes((obj.source||'').toLowerCase().trim())
      ? obj.source.toLowerCase().trim() : 'dnata';
    rows.push(`(
      ${obj.service_num ? Number(obj.service_num) : 'null'},
      ${lit(obj.flight_number || '')},
      ${lit(`${dateIso}T${rdv}:00+02:00`)}::timestamptz,
      ${lit(obj.client_name || '—')},
      ${lit('Terminal ' + (direction === 'arrivee' ? '1' : '2'))},
      ${Number(obj.bags) || 1},
      25, 12,
      'todo'::svc_status,
      ${lit((obj.source||'').toUpperCase())},
      ${lit(obj.client_phone || '')},
      ${lit(direction)}::flow,
      ${lit(source)}::service_source,
      ${lit(obj.remarques || '')},
      null
    )`);
  }
  await sql(`
    insert into public.services
      (service_num, flight, scheduled_at, client_name, meeting_point, bags,
       base_price_chf, per_bag_price_chf, status, agency, client_phone,
       flow, source, remarques, assigned_porter_id)
    values
      ${rows.join(',\n      ')};
  `);
  console.log(`   ✓ inserted ${rows.length} services`);
}

// ── Step 4: summary ──────────────────────────────────────────────────────
console.log('\n📊  Final state:');
const counts = (await sql(`
  select
    (select count(*) from public.users where role = 'chef')   as chefs,
    (select count(*) from public.users where role = 'porter') as porters,
    (select count(*) from public.shifts)   as shifts,
    (select count(*) from public.services) as services,
    (select count(*) from public.clients)  as clients;
`))[0];
console.log('  ', counts);

console.log('\n👤  Chefs (login admin avec ces emails + password CgsPorter2026!):');
const chefs = await sql(`select first_name, last_name, email from public.users where role = 'chef' order by last_name;`);
chefs.forEach(c => console.log(`   · ${c.first_name.padEnd(8)} ${c.last_name.padEnd(20)} ${c.email}`));

console.log('\n🌐  URLs:');
console.log('   Admin   https://cgs-porter-admin-e2l60qegb-nexalabch-creates-projects.vercel.app');
console.log('   Mobile  https://cgs-porter-of0ujzeyq-nexalabch-creates-projects.vercel.app');

console.log('\n✅  Demo state ready.\n');
console.log('Tip — to pre-load before the demo: node scripts/demo-reset.mjs --full');
