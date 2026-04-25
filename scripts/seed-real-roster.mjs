#!/usr/bin/env node
// Seed the 24 real CGS employees from the roster image (2026-03-01).
// All accounts use the same demo password — change in Auth UI before showing
// to anyone outside CGS.

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
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}
loadEnv(path.join(projectRoot, '.env.local'));

const REF = process.env.SUPABASE_PROJECT_REF;
const PAT = process.env.SUPABASE_PERSONAL_ACCESS_TOKEN;
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL_BASE = `https://${REF}.supabase.co`;

const PASSWORD = 'CgsPorter2026!';

// 24 employees extracted from the printed CGS roster sheet 2026-03-01.
// First entry is the chef d'équipe (Mate). All others are porters.
const ROSTER = [
  { cgs_id: '10865', last: 'Torgvaidze',           first: 'Mate',              role: 'chef'   },
  { cgs_id: '11119', last: 'Ba',                   first: 'Hamidou Tapsirou',  role: 'porter' },
  { cgs_id: '2905',  last: 'Afak Dadi',            first: 'Mohamed',           role: 'porter' },
  { cgs_id: '11100', last: 'Mane',                 first: 'Mane Aliou',        role: 'porter' },
  { cgs_id: '7039',  last: 'Moustakopoulos',       first: 'Konstantinos',      role: 'porter' },
  { cgs_id: '10013', last: 'Vazquez Pena',         first: 'Juan Carlos',       role: 'porter' },
  { cgs_id: '0505',  last: 'Diallo',               first: 'Mamadou Yaya',      role: 'porter' },
  { cgs_id: '10930', last: 'Lapauw',               first: 'Adrien Mickael',    role: 'porter' },
  { cgs_id: '10843', last: 'Arteilaez Anorocho',   first: 'Juan Camilo',       role: 'porter' },
  { cgs_id: '1110',  last: 'Bairami',              first: 'Vilijon',           role: 'porter' },
  { cgs_id: '11075', last: 'Moukni',               first: 'Imad',              role: 'porter' },
  { cgs_id: '2881',  last: 'Boussouf',             first: 'Moussa Dahbi',      role: 'porter' },
  { cgs_id: '2207',  last: 'Lopes Mendes Da Silva',first: 'Mielle',            role: 'porter' },
  { cgs_id: '10095', last: 'Malik',                first: 'Muhammad Ali',      role: 'porter' },
  { cgs_id: '2908',  last: 'Demir',                first: 'Burhan',            role: 'porter' },
  { cgs_id: '2925',  last: 'Serban',               first: 'Andrei',            role: 'porter' },
  { cgs_id: '10604', last: 'Raci',                 first: 'Buar',              role: 'porter' },
  { cgs_id: '2859',  last: 'Anorocho Guevara',     first: 'Victor Arnulfo',    role: 'porter' },
  { cgs_id: '2920',  last: 'Chebâne',              first: 'Mohamed Adel',      role: 'porter' },
  { cgs_id: '10844', last: 'Da Cruz Lopes',        first: 'Carlos Alexandre',  role: 'porter' },
  { cgs_id: '2903',  last: 'El Ghazouani',         first: 'Khalid',            role: 'porter' },
  { cgs_id: '10928', last: 'El Ouardani Yattaoui', first: 'Mohamed',           role: 'porter' },
  { cgs_id: '2855',  last: 'Monteiro Carlos',      first: 'Manuel',            role: 'porter' },
  { cgs_id: null,    last: 'Monteiro Oliveira',    first: 'Jose Augusto',      role: 'porter' },
];

// Email = first.last@cgs-ltd.com, lowercased + ascii-fold + spaces→.
function emailFor(p) {
  const slug = (s) => s
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
  return `${slug(p.first)}.${slug(p.last)}@cgs-ltd.com`;
}

function initialsFor(p) {
  return (p.first[0] + p.last[0]).toUpperCase();
}

async function adminAuth(method, pathname, body) {
  const r = await fetch(`${URL_BASE}/auth/v1${pathname}`, {
    method,
    headers: {
      apikey: SR_KEY,
      Authorization: `Bearer ${SR_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { ok: r.ok, status: r.status, body: json };
}

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

console.log(`\n→ Seeding ${ROSTER.length} real employees...`);
const created = [];
for (const p of ROSTER) {
  const email = emailFor(p);
  const r = await adminAuth('POST', '/admin/users', {
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: p.first, last_name: p.last, cgs_id: p.cgs_id, role: p.role },
  });
  if (!r.ok) {
    console.error(`  ✗ ${email}: HTTP ${r.status}`, r.body);
    continue;
  }
  console.log(`  ✓ ${email.padEnd(48)} ${p.role}`);
  created.push({ ...p, auth_id: r.body.id, email });
}

const values = created.map(p => `(
  ${lit(p.auth_id)}::uuid, ${lit(p.email)}, ${lit(p.role)}::user_role,
  ${lit(p.first)}, ${lit(p.last)}, 'GVA', ${lit(p.cgs_id)}
)`).join(',\n  ');

console.log(`\n→ Inserting ${created.length} profile rows in public.users...`);
await sql(`
  insert into public.users (id, email, role, first_name, last_name, station, cgs_employee_id)
  values
    ${values}
  on conflict (id) do update set
    email = excluded.email,
    role = excluded.role,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    cgs_employee_id = excluded.cgs_employee_id;
`);

const counts = (await sql(`
  select role, count(*) from public.users group by role order by role;
`));
console.log('\n— Final counts —');
console.log(' ', counts);
console.log(`\n✅ ${created.length} real employees seeded.`);
console.log(`   Chef login: ${emailFor(ROSTER[0])}`);
console.log(`   Password (all): ${PASSWORD}`);
