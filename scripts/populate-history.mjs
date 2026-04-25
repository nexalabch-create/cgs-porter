#!/usr/bin/env node
// Populate the last 30 days with ~3-5 done services/day so dashboard charts
// look realistic in screenshots. Idempotent enough — wipes today-30d…today-1d.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
function loadEnv(file){if(!fs.existsSync(file))return;for(const line of fs.readFileSync(file,'utf8').split('\n')){const t=line.trim();if(!t||t.startsWith('#'))continue;const eq=t.indexOf('=');if(eq===-1)continue;const k=t.slice(0,eq).trim();const v=t.slice(eq+1).trim().replace(/^['"]|['"]$/g,'');if(!process.env[k])process.env[k]=v;}}
loadEnv(path.join(projectRoot, '.env.local'));

const REF = process.env.SUPABASE_PROJECT_REF, PAT = process.env.SUPABASE_PERSONAL_ACCESS_TOKEN;
async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST', headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  if (!r.ok) throw new Error(`SQL ${r.status}: ${await r.text()}`);
  return r.json();
}
const lit = (v) => v == null ? 'null' : `'${String(v).replace(/'/g, "''")}'`;
const rand = (a) => a[Math.floor(Math.random() * a.length)];

const FLIGHTS = ['EK', 'LX', 'AF', 'BA', 'QR', 'LH', 'KL', 'TK', 'IB', 'AZ', 'SN', 'A3', 'TP', 'EY', 'MS', 'PC', 'UA'];
const CLIENTS = [
  'Mr. Khalid Al-Mansouri', 'Mme Sophie Lefèvre', 'M. & Mme Tanaka', 'Mr. Whitford',
  'Dr. Schmidt', 'Mr. Patel', 'M. Rossi', 'Mme Bonnet', 'Mr. Chen', 'Famille Müller',
  'Nicky de Blois', 'Papapolitis', 'Philippides', 'Mojeh Hashemnia', 'M. SAM',
];
const SOURCES = ['dnata', 'swissport', 'prive', 'web'];
const FLOWS = ['arrivee', 'depart'];
const MEETING = ['Terminal 1 · Porte A12', 'Terminal 2 · Comptoir First', 'Hall arrivées · P3', 'Salon BA'];
const AGENCY = ['DNATA', 'SWISSPORT', 'PRIVE', 'WEB'];

const porters = (await sql(`select id from public.users where role = 'porter' order by created_at;`)).map(r => r.id);
console.log(`→ ${porters.length} porters available`);

// Wipe past data (keep today's services intact).
const today = new Date(); today.setHours(0,0,0,0);
const todayIso = today.toISOString().slice(0, 10);
await sql(`delete from public.services where scheduled_at < '${todayIso}';`);
console.log('→ cleared past services (kept today)');

const rows = [];
for (let d = 29; d >= 1; d--) {
  const day = new Date(today); day.setDate(day.getDate() - d);
  const count = 2 + Math.floor(Math.random() * 4); // 2-5 per day
  for (let i = 0; i < count; i++) {
    const hour = 7 + Math.floor(Math.random() * 14);
    const min = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
    const sched = new Date(day); sched.setHours(hour, min, 0, 0);
    const startMs = sched.getTime() + (Math.random() * 20 - 10) * 60000;
    const endMs = startMs + (20 + Math.random() * 60) * 60000;
    const bags = 1 + Math.floor(Math.random() * 5);
    const flight = `${rand(FLIGHTS)}${100 + Math.floor(Math.random() * 900)}`;
    const source = rand(SOURCES);
    rows.push(`(
      null, ${lit(flight)}, ${lit(sched.toISOString())}::timestamptz, ${lit(rand(CLIENTS))},
      ${lit(rand(MEETING))}, ${bags}, 25, 12, 'done'::svc_status, ${lit(rand(AGENCY))}, '+41 22 000 00 00',
      ${lit(rand(FLOWS))}::flow, ${lit(source)}::service_source, '',
      ${lit(rand(porters))}::uuid,
      ${lit(new Date(startMs).toISOString())}::timestamptz,
      ${lit(new Date(endMs).toISOString())}::timestamptz
    )`);
  }
}

await sql(`
  insert into public.services
    (service_num, flight, scheduled_at, client_name, meeting_point, bags,
     base_price_chf, per_bag_price_chf, status, agency, client_phone,
     flow, source, remarques, assigned_porter_id, started_at, completed_at)
  values
    ${rows.join(',\n      ')};
`);
console.log(`✓ inserted ${rows.length} historical services`);

// Also: assign half of today's todo services + mark a few active/done so dashboard "today" stats look populated.
await sql(`
  update public.services set assigned_porter_id = (
    select id from public.users where role = 'porter' order by random() limit 1
  )
  where scheduled_at >= '${todayIso}' and id in (
    select id from public.services where scheduled_at >= '${todayIso}' order by service_num limit 14
  );
`);
console.log('✓ assigned 14 of today\'s 22 services');

// Mark 2 as active, 5 as done to show varied statuses.
await sql(`
  update public.services
    set status = 'done',
        started_at = scheduled_at - interval '5 minutes',
        completed_at = scheduled_at + interval '35 minutes'
  where id in (
    select id from public.services where scheduled_at >= '${todayIso}' and assigned_porter_id is not null order by service_num limit 5
  );
`);
await sql(`
  update public.services
    set status = 'active', started_at = now() - interval '8 minutes'
  where id in (
    select id from public.services where scheduled_at >= '${todayIso}' and status = 'todo' and assigned_porter_id is not null order by service_num limit 2
  );
`);
console.log('✓ statuses adjusted (5 done, 2 active, ~7 todo assigned, 8 unassigned)');

const summary = (await sql(`
  select
    (select count(*) from public.services) as total,
    (select count(*) from public.services where scheduled_at >= '${todayIso}') as today,
    (select count(*) from public.services where status = 'done')   as done,
    (select count(*) from public.services where status = 'active') as active,
    (select count(*) from public.services where status = 'todo' and assigned_porter_id is null) as unassigned;
`))[0];
console.log('\n→ Final state:', summary);
