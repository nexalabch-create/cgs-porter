#!/usr/bin/env node
// Create the 2 missing chefs (Safet Filipova + Dercio Veloso) as auth users,
// promote Khalid El Ghazouani to chef, and confirm the final 6.

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
const SR_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const URL_BASE = `https://${REF}.supabase.co`;
const PASSWORD = 'CgsPorter2026!';

const NEW_CHEFS = [
  { email: 'safet.filipova@cgs-ltd.com',  first_name: 'Safet',  last_name: 'Filipova' },
  { email: 'dercio.veloso@cgs-ltd.com',   first_name: 'Dercio', last_name: 'Veloso'   },
];

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

console.log('\n→ Creating 2 new chef auth users...');
const created = [];
for (const c of NEW_CHEFS) {
  // Check if email already exists.
  const existing = await adminAuth('GET', '/admin/users?per_page=200');
  const found = (existing.body?.users ?? []).find(u => u.email?.toLowerCase() === c.email);
  if (found) {
    console.log(`  · ${c.email}  → existed (id=${found.id.slice(0, 8)}…)`);
    created.push({ ...c, auth_id: found.id });
    continue;
  }
  const r = await adminAuth('POST', '/admin/users', {
    email: c.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: c.first_name, last_name: c.last_name, role: 'chef' },
  });
  if (!r.ok) { console.error(`  ✗ ${c.email}:`, r.body); throw new Error('create failed'); }
  console.log(`  ✓ ${c.email}  → created (id=${r.body.id.slice(0, 8)}…)`);
  created.push({ ...c, auth_id: r.body.id });
}

// Insert profile rows for the 2 new ones.
const values = created.map(c =>
  `(${lit(c.auth_id)}::uuid, ${lit(c.email)}, 'chef'::user_role, ${lit(c.first_name)}, ${lit(c.last_name)}, 'GVA')`
).join(',\n  ');

console.log('\n→ Upserting profile rows...');
await sql(`
  insert into public.users (id, email, role, first_name, last_name, station)
  values
    ${values}
  on conflict (id) do update set
    role = 'chef', first_name = excluded.first_name, last_name = excluded.last_name;
`);
console.log('  ✓ profiles upserted');

console.log('\n→ Promoting Khalid El Ghazouani to chef...');
await sql(`
  update public.users set role = 'chef'
  where email = 'khalid.el.ghazouani@cgs-ltd.com';
`);
console.log('  ✓ done');

console.log('\n→ Final chef roster:');
const chefs = await sql(`
  select first_name, last_name, email
  from public.users where role = 'chef'
  order by last_name;
`);
console.log(JSON.stringify(chefs, null, 2));
console.log(`\n✅ ${chefs.length} chefs total.`);
console.log(`   New chef login password (for Safet + Dercio): ${PASSWORD}`);
