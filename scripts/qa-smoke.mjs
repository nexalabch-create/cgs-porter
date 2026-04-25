#!/usr/bin/env node
// CGS QA — HTTP smoke tests against production deployments.
// No deps required (Node 18+ has fetch built-in).
//
// Usage:
//   node scripts/qa-smoke.mjs [mobile_url] [admin_url]
//   (URLs default to the latest Vercel production aliases)

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

const MOBILE_URL = process.argv[2] || process.env.CGS_MOBILE_URL ||
  'https://cgs-porter-m47uj2yil-nexalabch-creates-projects.vercel.app';
const ADMIN_URL  = process.argv[3] || process.env.CGS_ADMIN_URL ||
  'https://cgs-porter-admin-kaxq2vvkz-nexalabch-creates-projects.vercel.app';
const SUPABASE   = process.env.VITE_SUPABASE_URL;
const ANON       = process.env.VITE_SUPABASE_ANON_KEY;

const results = [];
const fmt = (sev, msg) => results.push({ sev, msg });

const pass  = (m) => { console.log(`  ✓ ${m}`); };
const fail  = (m) => { console.log(`  ✗ ${m}`); fmt('FAIL', m); };
const warn  = (m) => { console.log(`  ⚠ ${m}`); fmt('WARN', m); };

async function check(label, fn) {
  process.stdout.write(`  · ${label} ... `);
  try {
    const r = await fn();
    if (r === true) { console.log('OK'); }
    else if (r) { console.log(r); }
    else { console.log('SKIP'); }
    return r;
  } catch (e) {
    console.log(`FAIL: ${e.message}`);
    fmt('FAIL', `${label}: ${e.message}`);
    return false;
  }
}

console.log(`\n📱 Mobile · ${MOBILE_URL}`);
{
  const html = await (await fetch(MOBILE_URL)).text();
  await check('200 OK', async () => (await fetch(MOBILE_URL)).status === 200 ? true : (fail('non-200'), false));
  await check('PWA <meta theme-color>', () => /name=["']theme-color["'][^>]*content=["']#e91e8c/.test(html) || (warn('missing/wrong'), false));
  await check('PWA viewport-fit=cover', () => /viewport-fit=cover/.test(html) || (warn('missing'), false));
  await check('apple-touch-icon', () => /rel=["']apple-touch-icon["']/.test(html) || (warn('missing'), false));
  await check('manifest linked', () => /\.webmanifest/.test(html) || (fail('not linked'), false));
  await check('NO "MODE DÉMO" banner in HTML', () => !/MODE DÉMO/.test(html) || (warn('demo banner detected — env vars not propagated?'), false));
  await check('manifest reachable', async () => {
    const r = await fetch(`${MOBILE_URL}/manifest.webmanifest`);
    if (!r.ok) { fail(`manifest HTTP ${r.status}`); return false; }
    const m = await r.json();
    if (!m.icons || m.icons.length < 2) warn('manifest icons count < 2');
    return `${r.status} · ${m.name}`;
  });
  await check('service worker reachable', async () => {
    const r = await fetch(`${MOBILE_URL}/sw.js`);
    return r.status === 200 ? `200 (${(await r.text()).length}b)` : (fail(`sw HTTP ${r.status}`), false);
  });
  await check('logo asset reachable', async () => {
    const r = await fetch(`${MOBILE_URL}/logo-cgs.png`, { method: 'HEAD' });
    return r.status === 200 ? '200' : (fail(`logo HTTP ${r.status}`), false);
  });
  await check('icon-192 reachable', async () => {
    const r = await fetch(`${MOBILE_URL}/icon-192.png`, { method: 'HEAD' });
    return r.status === 200 ? '200' : (fail(`icon HTTP ${r.status}`), false);
  });
  await check('Inter Tight font preload', () => /Inter\+Tight/.test(html) || (warn('font not loaded'), false));
}

console.log(`\n🖥  Admin · ${ADMIN_URL}`);
{
  const root = await fetch(ADMIN_URL);
  await check('200 OK', () => root.status === 200 ? true : (fail(`HTTP ${root.status}`), false));
  const html = await root.text();
  await check('No demo banner', () => !/MODE DÉMO/.test(html) || (warn('demo banner present'), false));
  await check('login route resolves', async () => {
    const r = await fetch(`${ADMIN_URL}/login`);
    return r.status === 200 ? '200' : (fail(`HTTP ${r.status}`), false);
  });
  await check('non-existent route → SPA fallback', async () => {
    const r = await fetch(`${ADMIN_URL}/nonexistent-route-${Date.now()}`);
    return r.status === 200 ? '200 (SPA rewrite OK)' : (fail(`HTTP ${r.status} — rewrites broken`), false);
  });
}

if (SUPABASE && ANON) {
  console.log(`\n🐘 Supabase · ${SUPABASE}`);
  await check('REST /rest/v1/ reachable', async () => {
    const r = await fetch(`${SUPABASE}/rest/v1/`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
    return r.status < 500 ? `HTTP ${r.status}` : (fail(`HTTP ${r.status}`), false);
  });
  await check('anon read services → empty (RLS denying)', async () => {
    const r = await fetch(`${SUPABASE}/rest/v1/services?select=id`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
    if (r.status !== 200) { fail(`HTTP ${r.status}`); return false; }
    const rows = await r.json();
    if (rows.length === 0) return '0 rows (RLS OK)';
    fail(`anon could read ${rows.length} services — RLS NOT enforced!`);
    return false;
  });
  await check('anon read app_settings (any authed user can read)', async () => {
    const r = await fetch(`${SUPABASE}/rest/v1/app_settings?select=*`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } });
    return r.status === 200 ? '200' : (warn(`HTTP ${r.status}`), false);
  });
}

const failures = results.filter(r => r.sev === 'FAIL').length;
const warnings = results.filter(r => r.sev === 'WARN').length;
console.log(`\n— Summary —  ${failures ? '✗ ' + failures + ' FAIL' : '✓ no failures'} · ${warnings} warnings`);
if (failures > 0) process.exit(1);
