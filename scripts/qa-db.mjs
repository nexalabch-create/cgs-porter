#!/usr/bin/env node
// CGS QA — DB integrity + RLS verification (uses Supabase Management API).

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

const PAT = process.env.SUPABASE_PERSONAL_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
if (!PAT || !REF) { console.error('Missing PAT/REF in .env.local'); process.exit(1); }

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`SQL ${r.status}: ${await r.text()}`);
  return r.json();
}

let failures = 0;
const fail = (m) => { console.log(`  ✗ ${m}`); failures++; };
const ok   = (m) => console.log(`  ✓ ${m}`);
const warn = (m) => console.log(`  ⚠ ${m}`);

console.log('\n🐘 Supabase DB integrity\n');

// 1. Row counts
const counts = (await sql(`
  select
    (select count(*) from public.users)        as users,
    (select count(*) from public.services)     as services,
    (select count(*) from public.app_settings) as app_settings,
    (select count(*) from public.shifts)       as shifts,
    (select count(*) from public.clients)      as clients,
    (select count(*) from public.users where role = 'chef')   as chefs,
    (select count(*) from public.users where role = 'porter') as porters;
`))[0];

console.log('  Row counts:', counts);
if (counts.users    < 1)  fail('public.users empty');     else ok(`users=${counts.users}`);
if (counts.services < 1)  fail('public.services empty');  else ok(`services=${counts.services}`);
if (counts.chefs    < 1)  fail('no chef user — login will fail'); else ok(`chefs=${counts.chefs}`);
if (counts.porters  < 1)  warn('no porter users');        else ok(`porters=${counts.porters}`);
if (counts.app_settings !== 1) fail(`app_settings should have exactly 1 row, has ${counts.app_settings}`);

// 2. RLS enabled on all public tables
const rls = await sql(`
  select schemaname, tablename, rowsecurity
  from pg_tables
  where schemaname = 'public'
  order by tablename;
`);
console.log('\n  RLS status:');
for (const t of rls) {
  if (!t.rowsecurity) fail(`RLS DISABLED on public.${t.tablename}`);
  else ok(`RLS enabled on public.${t.tablename}`);
}

// 3. FK indexes (skill: schema-foreign-key-indexes)
const missingFkIdx = await sql(`
  select conrelid::regclass::text as tbl, a.attname as fk_column
  from pg_constraint c
  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
  where c.contype = 'f'
    and c.connamespace = 'public'::regnamespace
    and not exists (
      select 1 from pg_index i
      where i.indrelid = c.conrelid and a.attnum = any(i.indkey)
    );
`);
console.log('\n  FK index coverage:');
if (missingFkIdx.length === 0) ok('all FKs indexed');
else for (const r of missingFkIdx) warn(`unindexed FK: ${r.tbl}.${r.fk_column}`);

// 4. Policy presence
const policies = await sql(`
  select tablename, count(*)::int as policy_count
  from pg_policies
  where schemaname = 'public'
  group by tablename
  order by tablename;
`);
console.log('\n  RLS policies per table:');
for (const t of ['users', 'services', 'shifts', 'clients', 'app_settings']) {
  const p = policies.find(p => p.tablename === t);
  if (!p || p.policy_count === 0) fail(`no policies on public.${t}`);
  else ok(`public.${t} has ${p.policy_count} policies`);
}

// 5. Demo data freshness
const fresh = (await sql(`
  select max(scheduled_at) as latest, min(scheduled_at) as earliest from public.services;
`))[0];
console.log('\n  Service date range:', fresh);

console.log(`\n— Summary — ${failures ? `✗ ${failures} FAIL` : '✓ all DB checks passed'}`);
if (failures > 0) process.exit(1);
