#!/usr/bin/env node
// End-to-end test: simulate the chef → porter notification flow.
//
// 1. Insert a fresh service via SQL (assigned to a known porter)
// 2. Verify a 'service_assigned' notification was created by the trigger
// 3. Update status → 'active' and verify all chefs got 'service_started'
// 4. Update status → 'done' and verify all chefs got 'service_completed'
// 5. Clean up

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

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`SQL ${r.status}: ${await r.text()}`);
  return r.json();
}

console.log('\n=== E2E notifications test ===\n');

// 1. Pick a porter + a chef to play with.
const porters = await sql(`select id, first_name from public.users where role = 'porter' limit 1;`);
const porter = porters[0];
const chefs = await sql(`select count(*) as n from public.users where role = 'chef';`);
const chefCount = chefs[0].n;
console.log(`→ Porter: ${porter.first_name} (${porter.id.slice(0,8)}…)`);
console.log(`→ ${chefCount} chefs in BD`);

// Snapshot existing notification count.
const [{ n: before }] = await sql(`select count(*) as n from public.notifications;`);
console.log(`→ existing notifications: ${before}`);

// 2. Insert a service already assigned → triggers `service_inserted`.
console.log('\n[step 1] INSERT service assigned to porter ...');
const [svc] = await sql(`
  insert into public.services
    (flight, scheduled_at, client_name, client_phone, meeting_point, bags, base_price_chf, per_bag_price_chf,
     status, agency, source, flow, assigned_porter_id)
  values
    ('TEST1', now() + interval '1 hour', 'E2E Test Client', '+41 22 000 00 00', 'Terminal 1', 2, 25, 5,
     'todo', 'PRIVE', 'prive', 'arrivee', '${porter.id}'::uuid)
  returning id;
`);
const svcId = svc.id;

await new Promise(r => setTimeout(r, 500));   // give trigger time to fire

const [a1] = await sql(`
  select count(*) as n from public.notifications
  where service_id = '${svcId}'::uuid and recipient_id = '${porter.id}'::uuid
    and type = 'service_assigned';
`);
console.log(`  → service_assigned for porter: ${a1.n === 1 ? '✅' : '❌'} (expected 1, got ${a1.n})`);

// 3. UPDATE status → 'active' → fan-out to chefs
console.log('\n[step 2] UPDATE status → active ...');
await sql(`update public.services set status = 'active', started_at = now() where id = '${svcId}';`);
await new Promise(r => setTimeout(r, 500));

const [a2] = await sql(`
  select count(*) as n from public.notifications
  where service_id = '${svcId}'::uuid and type = 'service_started';
`);
console.log(`  → service_started fan-out: ${a2.n === chefCount ? '✅' : '❌'} (expected ${chefCount}, got ${a2.n})`);

// 4. UPDATE status → 'done'
console.log('\n[step 3] UPDATE status → done ...');
await sql(`update public.services set status = 'done', completed_at = now() where id = '${svcId}';`);
await new Promise(r => setTimeout(r, 500));

const [a3] = await sql(`
  select count(*) as n from public.notifications
  where service_id = '${svcId}'::uuid and type = 'service_completed';
`);
console.log(`  → service_completed fan-out: ${a3.n === chefCount ? '✅' : '❌'} (expected ${chefCount}, got ${a3.n})`);

// Total notifications should be: 1 (assigned) + chefCount (started) + chefCount (completed)
const expected = 1 + chefCount * 2;
const [{ n: after }] = await sql(`
  select count(*) as n from public.notifications where service_id = '${svcId}'::uuid;
`);
console.log(`\n→ Total notifications inserted: ${after} (expected ${expected})`);
console.log(after === expected ? '✅ PASS — all triggers fire correctly' : `❌ FAIL — drift of ${after - expected}`);

// 5. Cleanup
console.log('\n[cleanup] removing test service + notifications ...');
await sql(`delete from public.services where id = '${svcId}'::uuid;`);
console.log('  done.');
