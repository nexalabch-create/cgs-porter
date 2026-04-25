#!/usr/bin/env node
// Run an arbitrary SQL file (or stdin) against the Supabase project's database
// using the Management API. Requires SUPABASE_PERSONAL_ACCESS_TOKEN +
// SUPABASE_PROJECT_REF in .env.local.
//
// Usage:
//   node scripts/run-sql.mjs path/to/file.sql
//   echo "select 1" | node scripts/run-sql.mjs -

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Tiny .env.local loader (no dotenv dep needed).
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const k = trimmed.slice(0, eq).trim();
    const v = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[k]) process.env[k] = v;
  }
}
loadDotEnv(path.join(projectRoot, '.env.local'));

const PAT = process.env.SUPABASE_PERSONAL_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF;
if (!PAT || !REF) {
  console.error('Missing SUPABASE_PERSONAL_ACCESS_TOKEN or SUPABASE_PROJECT_REF in .env.local');
  process.exit(1);
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node scripts/run-sql.mjs <file.sql | ->');
    process.exit(1);
  }

  let sql;
  if (arg === '-') {
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    sql = Buffer.concat(chunks).toString('utf8');
  } else {
    const filePath = path.resolve(arg);
    sql = fs.readFileSync(filePath, 'utf8');
    console.log(`→ Running ${path.relative(projectRoot, filePath)} (${sql.length} bytes)`);
  }

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  const text = await res.text();
  if (!res.ok) {
    console.error(`✗ HTTP ${res.status}`);
    console.error(text);
    process.exit(1);
  }

  // Management API returns JSON array of result rows for each statement.
  try {
    const json = JSON.parse(text);
    if (Array.isArray(json) && json.length > 0) {
      console.log(JSON.stringify(json, null, 2));
    } else {
      console.log('✓ Success — no rows returned');
    }
  } catch {
    console.log(text);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
