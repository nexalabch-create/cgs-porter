#!/usr/bin/env node
// Create Marc Dubois as a REAL Supabase auth user + public.users row.
// This is the "default porter" used by the mobile app's Porteur toggle
// (DEMO_EMAIL.porter = 'marc.dubois@cgs-ltd.com'). Without this row, the
// toggle login falls back to demo mode (user.id = 'p2', a string), which
// breaks the assignedPorterId UUID match → porter sees nothing.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim(); if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('='); if (eq === -1) continue;
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
const EMAIL = 'marc.dubois@cgs-ltd.com';

async function adminAuth(method, pathname, body) {
  const r = await fetch(`${URL_BASE}/auth/v1${pathname}`, {
    method,
    headers: { apikey: SR_KEY, Authorization: `Bearer ${SR_KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { ok: r.ok, status: r.status, body: r.ok ? await r.json() : await r.text() };
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

console.log('\n→ Checking if Marc already exists ...');
const existing = await adminAuth('GET', '/admin/users?per_page=200');
const found = (existing.body?.users ?? []).find(u => u.email?.toLowerCase() === EMAIL);

let authId;
if (found) {
  authId = found.id;
  console.log(`  · ${EMAIL} → already exists in auth (id=${authId.slice(0, 8)}…)`);
} else {
  console.log(`  · creating ${EMAIL} in auth ...`);
  const r = await adminAuth('POST', '/admin/users', {
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: 'Marc', last_name: 'Dubois', role: 'porter' },
  });
  if (!r.ok) { console.error('  ✗ failed:', r.body); process.exit(1); }
  authId = r.body.id;
  console.log(`  ✓ created (id=${authId.slice(0, 8)}…)`);
}

console.log('\n→ Upserting profile row in public.users ...');
await sql(`
  insert into public.users (id, email, role, first_name, last_name, station)
  values ('${authId}'::uuid, '${EMAIL}', 'porter'::user_role, 'Marc', 'Dubois', 'GVA')
  on conflict (id) do update set
    role = 'porter', first_name = 'Marc', last_name = 'Dubois', email = '${EMAIL}';
`);
console.log('  ✓ profile row upserted');

console.log('\n→ Cleaning up duplicate services (EK84, TK1917, TK1922 each have 2 entries) ...');
await sql(`
  delete from public.services
  where id in (
    select id from (
      select id, row_number() over (partition by flight, scheduled_at order by created_at) as rn
      from public.services
    ) t where t.rn > 1
  );
`);
console.log('  ✓ duplicates removed');

console.log('\n→ Final verification:');
const [marc] = await sql(`select id, email, first_name, last_name, role from public.users where email = '${EMAIL}';`);
console.log('  Marc:', marc);
const [{ count: total }] = await sql(`select count(*)::int as count from public.services;`);
console.log(`  Total services after dedup: ${total}`);

console.log(`\n✅ Done. Marc Dubois ready for porter toggle login.`);
console.log(`   Login: ${EMAIL} / ${PASSWORD}`);
