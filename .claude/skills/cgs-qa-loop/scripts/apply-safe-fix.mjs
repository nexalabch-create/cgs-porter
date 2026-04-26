#!/usr/bin/env node
// cgs-qa-loop — apply-safe-fix
//
// Applies a single 🟢 fix identified by --id, then verifies the working
// tree still builds + smoke-tests. If verification fails, reverts the
// fix and reclassifies the finding as 🟡.
//
// Usage:
//   node apply-safe-fix.mjs --id <finding-id> --triage <triage.json>

import { spawn, execSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(SKILL_DIR, '../../..');

// ─────────────────────────────────────────────────────────────────
// Args

const args = process.argv.slice(2);
const idArg = args[args.indexOf('--id') + 1];
const triageArg = args[args.indexOf('--triage') + 1];
if (!idArg || !triageArg) {
  console.error('Usage: apply-safe-fix.mjs --id <finding-id> --triage <triage.json>');
  process.exit(2);
}

const log = (msg) => console.log(`[apply-safe-fix] ${msg}`);

// ─────────────────────────────────────────────────────────────────
// Per-pattern fix implementations
//
// Each handler returns { changed: boolean, files: [paths] } so the
// orchestrator knows what to roll back if verification fails.

const fixHandlers = {
  async VERCEL_URL_STALE(finding) {
    const { staleUrl, freshUrl } = finding.extra || {};
    if (!staleUrl || !freshUrl) return { changed: false, files: [] };
    if (!finding.file) return { changed: false, files: [] };

    const filePath = path.join(PROJECT_ROOT, finding.file);
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.includes(staleUrl)) return { changed: false, files: [] };
    const updated = content.split(staleUrl).join(freshUrl);
    await fs.writeFile(filePath, updated);
    return { changed: true, files: [finding.file] };
  },

  async CONSOLE_LOG_LEFT(finding) {
    if (!finding.file || !finding.line) return { changed: false, files: [] };
    const filePath = path.join(PROJECT_ROOT, finding.file);
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const idx = finding.line - 1;
    if (idx < 0 || idx >= lines.length) return { changed: false, files: [] };

    const line = lines[idx];
    // Conservative: only remove if the line is *just* a console.log call.
    // If the call is part of a more complex expression, leave it (bump to 🟡).
    const trimmed = line.trim();
    const isStandalone = /^console\.(log|debug)\s*\([^()]*\)\s*;?\s*$/.test(trimmed)
      // Allow trailing comma if the log spans multiple args without nesting
      || /^console\.(log|debug)\s*\([^()]*\)$/.test(trimmed);
    if (!isStandalone) return { changed: false, files: [] };

    lines.splice(idx, 1);
    await fs.writeFile(filePath, lines.join('\n'));
    return { changed: true, files: [finding.file] };
  },

  async IMG_ALT_MISSING(finding) {
    if (!finding.file) return { changed: false, files: [] };
    const filePath = path.join(PROJECT_ROOT, finding.file);
    const content = await fs.readFile(filePath, 'utf8');
    // Conservative regex: only matches <img src="..." /> with no alt.
    // We don't try to come up with descriptive alt text — empty alt
    // marks the image as decorative, which is always safe-ish for a11y
    // (better than nothing). Real alt text is a 🟡 propose.
    const re = /<img(\s[^>]*?)src=(["'][^"']+["'])([^>]*?)(?<!alt=["'][^"']*["'])\s*\/?>/g;
    let changed = false;
    const updated = content.replace(re, (m, before, src, after) => {
      if (/\balt=/.test(m)) return m;
      changed = true;
      return `<img${before}src=${src}${after} alt="" />`;
    });
    if (!changed) return { changed: false, files: [] };
    await fs.writeFile(filePath, updated);
    return { changed: true, files: [finding.file] };
  },

  async THEME_COLOR_WRONG(finding) {
    // Stub: full implementation parses index.html, replaces theme-color content.
    // For now, mark as not-handled so it falls through to 🟡 propose.
    return { changed: false, files: [] };
  },

  async APPLE_TOUCH_ICON_MISSING(finding) {
    return { changed: false, files: [] };
  },

  async IMPORT_BROKEN(finding) {
    return { changed: false, files: [] };
  },

  async WHITESPACE_DRIFT(finding) {
    if (!finding.file) return { changed: false, files: [] };
    const filePath = path.join(PROJECT_ROOT, finding.file);
    const content = await fs.readFile(filePath, 'utf8');
    let updated = content.replace(/[ \t]+$/gm, '');  // strip trailing whitespace
    if (!updated.endsWith('\n')) updated += '\n';     // ensure final newline
    if (updated === content) return { changed: false, files: [] };
    await fs.writeFile(filePath, updated);
    return { changed: true, files: [finding.file] };
  },

  async UNUSED_VAR(finding) {
    return { changed: false, files: [] };
  },
};

// ─────────────────────────────────────────────────────────────────
// Verification: re-run the *fast* checks. If any fail, rollback.

function exec(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd: PROJECT_ROOT, ...opts });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    const timeout = setTimeout(() => { child.kill('SIGKILL'); }, opts.timeout || 120_000);
    child.on('close', (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });
  });
}

async function fastVerify() {
  // Lightweight checks (no Playwright — too slow). Just enough to catch
  // import breaks, syntax errors, smoke regressions.
  const checks = [
    { name: 'build-root', cmd: 'npm', args: ['run', 'build'] },
    // Note: build-admin is excluded here for speed. The orchestrator's
    // final reverify (Step 5) re-runs the full suite, including it.
    { name: 'qa-smoke', cmd: 'node', args: ['scripts/qa-smoke.mjs'] },
  ];
  for (const c of checks) {
    log(`  verify: ${c.name}…`);
    const r = await exec(c.cmd, c.args, { timeout: 180_000 });
    if (r.code !== 0) {
      log(`  ✗ ${c.name} FAILED — ${r.stderr.slice(0, 200)}`);
      return { ok: false, failed: c.name, output: r.stderr };
    }
    log(`  ✓ ${c.name}`);
  }
  return { ok: true };
}

function rollback(files) {
  log(`  ROLLBACK: git checkout -- ${files.join(' ')}`);
  try {
    execSync(`git checkout -- ${files.map((f) => JSON.stringify(f)).join(' ')}`, { cwd: PROJECT_ROOT });
  } catch (err) {
    log(`  ⚠ rollback failed: ${err.message} — falling back to git reset --hard`);
    execSync('git reset --hard HEAD', { cwd: PROJECT_ROOT });
  }
}

// ─────────────────────────────────────────────────────────────────
// Main

async function main() {
  const triage = JSON.parse(await fs.readFile(triageArg, 'utf8'));
  const finding = triage.triaged.find((f) => f.id === idArg);
  if (!finding) {
    console.error(`[apply-safe-fix] finding ${idArg} not found in ${triageArg}`);
    process.exit(2);
  }
  if (finding.level !== 'green') {
    console.error(`[apply-safe-fix] finding ${idArg} is level=${finding.level}, not green — refusing to fix`);
    process.exit(2);
  }

  const handler = fixHandlers[finding.code];
  if (!handler) {
    console.error(`[apply-safe-fix] no handler for code=${finding.code}`);
    process.exit(2);
  }

  log(`Applying ${finding.code} fix (${finding.file || '?'}:${finding.line || '?'})…`);
  const { changed, files } = await handler(finding);
  if (!changed) {
    log(`  no-op: handler couldn't apply (e.g., line moved, regex didn't match)`);
    finding.status = 'skipped';
    finding.skipReason = 'handler-returned-no-op';
    await fs.writeFile(triageArg, JSON.stringify(triage, null, 2));
    process.exit(0);
  }

  log(`  changed ${files.length} file(s): ${files.join(', ')}`);

  // Verify
  const v = await fastVerify();
  if (!v.ok) {
    log(`Verification failed (${v.failed}) — rolling back`);
    rollback(files);
    finding.status = 'rolled-back';
    finding.rollbackReason = `verify-failed: ${v.failed}`;
    finding.level = 'yellow';  // demote to propose
    await fs.writeFile(triageArg, JSON.stringify(triage, null, 2));
    process.exit(0);
  }

  log(`✓ Fix applied + verified.`);
  finding.status = 'applied';
  await fs.writeFile(triageArg, JSON.stringify(triage, null, 2));
}

main().catch((err) => {
  console.error('[apply-safe-fix] FATAL', err);
  // Best-effort rollback: any unstaged changes from a partial fix
  try { execSync('git reset --hard HEAD', { cwd: PROJECT_ROOT }); } catch {}
  process.exit(1);
});
