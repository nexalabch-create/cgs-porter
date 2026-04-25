#!/usr/bin/env node
// Wipe all demo data: services, profile rows, auth users.
// Idempotent. Use before re-seeding with real production data.

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

if (!REF || !PAT || !SR_KEY) {
  console.error('Missing env: PROJECT_REF / PAT / SERVICE_ROLE_KEY');
  process.exit(1);
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

async function adminAuth(method, pathname) {
  const r = await fetch(`${URL_BASE}/auth/v1${pathname}`, {
    method,
    headers: {
      apikey: SR_KEY,
      Authorization: `Bearer ${SR_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  if (!r.ok) throw new Error(`Auth ${r.status}: ${await r.text()}`);
  return r.json();
}

console.log('\n→ Wiping public.services...');
await sql('truncate table public.services cascade;');
console.log('  ✓ services truncated');

console.log('\n→ Wiping public.shifts...');
await sql('truncate table public.shifts cascade;');
console.log('  ✓ shifts truncated');

console.log('\n→ Wiping public.clients...');
await sql('truncate table public.clients cascade;');
console.log('  ✓ clients truncated');

console.log('\n→ Listing auth users to delete...');
const list = await adminAuth('GET', '/admin/users?per_page=200');
const users = list.users ?? [];
console.log(`  found ${users.length} auth users`);

for (const u of users) {
  await fetch(`${URL_BASE}/auth/v1/admin/users/${u.id}`, {
    method: 'DELETE',
    headers: { apikey: SR_KEY, Authorization: `Bearer ${SR_KEY}` },
  });
  console.log(`  ✗ deleted ${u.email}`);
}

// public.users.id is FK→auth.users with on delete cascade, so they cleared automatically.
const counts = (await sql(`
  select
    (select count(*) from public.users)    as users,
    (select count(*) from public.services) as services,
    (select count(*) from public.clients)  as clients,
    (select count(*) from public.shifts)   as shifts,
    (select count(*) from auth.users)      as auth_users;
`))[0];

console.log('\n— After wipe —');
console.log(' ', counts);
console.log('\n✅ Demo data cleared.');
