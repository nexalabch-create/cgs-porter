#!/usr/bin/env node
// Idempotently ensure marc.dubois@cgs-ltd.com exists as a porter in Supabase.
// Marc is the demo-face porter used in the mobile login default + screenshots —
// the real CGS roster doesn't include him so we create him separately.
//
// Run: node scripts/ensure-marc-dubois.mjs
//
// Re-runnable: if Marc already exists in auth.users, we just upsert his
// public.users row and exit. No duplicate auth users created.

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
if (!REF || !PAT || !SR_KEY) {
  console.error('Missing SUPABASE_PROJECT_REF / SUPABASE_PERSONAL_ACCESS_TOKEN / SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const URL_BASE = `https://${REF}.supabase.co`;
const EMAIL    = 'marc.dubois@cgs-ltd.com';
const PASSWORD = 'CgsPorter2026!';
const FIRST    = 'Marc';
const LAST     = 'Dubois';
const CGS_ID   = '0001';   // demo placeholder, doesn't conflict with real roster IDs

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

// 1) Look up Marc in auth.users by email — use SQL because the admin
// auth API's `?filter=` query string is unreliable across Supabase versions.
console.log(`\n→ Checking ${EMAIL} in auth.users...`);
const lookup = await sql(`select id from auth.users where email = ${lit(EMAIL)} limit 1;`);
const existingRow = lookup?.[0]?.id ? lookup[0] : null;
let authId;
if (existingRow) {
  authId = existingRow.id;
  console.log(`  • already exists (auth_id=${authId})`);
  // Reset the password so the universal password is guaranteed to work.
  const upd = await adminAuth('PUT', `/admin/users/${authId}`, {
    password: PASSWORD,
    email_confirm: true,
  });
  if (upd.ok) console.log('  • password re-synced to CgsPorter2026!');
  else console.warn('  ! password reset returned', upd.status, upd.body);
} else {
  const r = await adminAuth('POST', '/admin/users', {
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: FIRST, last_name: LAST, cgs_id: CGS_ID, role: 'porter' },
  });
  if (!r.ok) {
    console.error('  ✗ Create failed:', r.status, r.body);
    process.exit(1);
  }
  authId = r.body.id;
  console.log(`  ✓ created (auth_id=${authId})`);
}

// 2) Upsert public.users row (id must match auth.users.id — FK constraint).
console.log(`\n→ Upserting public.users row...`);
await sql(`
  insert into public.users (id, email, role, first_name, last_name, station, cgs_employee_id)
  values (
    ${lit(authId)}::uuid, ${lit(EMAIL)}, 'porter'::user_role,
    ${lit(FIRST)}, ${lit(LAST)}, 'GVA', ${lit(CGS_ID)}
  )
  on conflict (id) do update set
    email = excluded.email,
    role  = 'porter'::user_role,
    first_name = excluded.first_name,
    last_name  = excluded.last_name,
    cgs_employee_id = excluded.cgs_employee_id;
`);
console.log('  ✓ upserted');

console.log(`\n✅ Marc Dubois ready.`);
console.log(`   Email:    ${EMAIL}`);
console.log(`   Password: ${PASSWORD}`);
console.log(`   Role:     porter`);
