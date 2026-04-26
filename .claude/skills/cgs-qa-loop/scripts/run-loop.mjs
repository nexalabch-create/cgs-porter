#!/usr/bin/env node
// cgs-qa-loop — orchestrator
//
// Runs all QA checks in parallel where possible, captures outputs to a
// per-run directory, and emits a normalized findings.json that the
// triage step consumes.
//
// Usage:
//   node .claude/skills/cgs-qa-loop/scripts/run-loop.mjs
//   node .claude/skills/cgs-qa-loop/scripts/run-loop.mjs --reverify
//
// --reverify mode skips Playwright E2E (slow, run only on full pass) and
// reuses the most recent run-* directory's URLs to save time.

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(SKILL_DIR, '../../..');
const STATE_DIR = path.join(SKILL_DIR, 'state');

const REVERIFY = process.argv.includes('--reverify');
const ts = new Date().toISOString().replace(/[:.]/g, '-');
const RUN_DIR = path.join(STATE_DIR, `run-${ts}`);

await fs.mkdir(RUN_DIR, { recursive: true });

// ─────────────────────────────────────────────────────────────────
// Helpers

const log = (msg) => console.log(`[run-loop] ${msg}`);

function exec(cmd, args, { cwd = PROJECT_ROOT, timeout = 300_000 } = {}) {
  // Run a child process, capture stdout+stderr+exit code.
  // Returns { code, stdout, stderr, durationMs }.
  return new Promise((resolve) => {
    const start = Date.now();
    const child = spawn(cmd, args, { cwd, env: process.env });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    const t = setTimeout(() => {
      child.kill('SIGKILL');
      resolve({ code: 124, stdout, stderr: stderr + '\n[TIMEOUT]', durationMs: Date.now() - start });
    }, timeout);
    child.on('close', (code) => {
      clearTimeout(t);
      resolve({ code, stdout, stderr, durationMs: Date.now() - start });
    });
  });
}

const hashId = (...parts) => crypto.createHash('sha1').update(parts.join('|')).digest('hex').slice(0, 12);

async function saveRun(name, result) {
  const dir = path.join(RUN_DIR, name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'stdout.log'), result.stdout || '');
  await fs.writeFile(path.join(dir, 'stderr.log'), result.stderr || '');
  await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify({
    code: result.code,
    durationMs: result.durationMs,
    success: result.code === 0,
  }, null, 2));
}

// ─────────────────────────────────────────────────────────────────
// Step A: Resolve latest Vercel URLs (fresh aliases drift constantly)

async function resolveVercelUrls() {
  log('Resolving latest Vercel production URLs…');
  const mobile = await exec('npx', ['vercel', 'ls', 'cgs-porter', '--prod'], { cwd: PROJECT_ROOT, timeout: 30_000 });
  const admin = await exec('npx', ['vercel', 'ls', 'cgs-porter-admin', '--prod'], { cwd: path.join(PROJECT_ROOT, 'admin'), timeout: 30_000 });
  const grab = (out) => (out.match(/https:\/\/[^\s]+\.vercel\.app/) || [])[0];
  const urls = { mobile: grab(mobile.stdout) || null, admin: grab(admin.stdout) || null };
  await fs.writeFile(path.join(RUN_DIR, 'urls.json'), JSON.stringify(urls, null, 2));
  log(`  mobile: ${urls.mobile || '(unresolved)'}`);
  log(`  admin:  ${urls.admin  || '(unresolved)'}`);
  return urls;
}

// ─────────────────────────────────────────────────────────────────
// Step B: Define and dispatch all checks

function buildChecks(urls) {
  const env = { ...process.env };
  if (urls.mobile) env.CGS_MOBILE_URL = urls.mobile;
  if (urls.admin)  env.CGS_ADMIN_URL  = urls.admin;

  const checks = [
    {
      name: 'qa-smoke',
      cmd: 'node',
      args: ['scripts/qa-smoke.mjs'],
      env,
      slow: false,
      parser: parseSmoke,
    },
    {
      name: 'qa-db',
      cmd: 'node',
      args: ['scripts/qa-db.mjs'],
      slow: false,
      parser: parseDb,
    },
    {
      name: 'build-root',
      cmd: 'npm',
      args: ['run', 'build'],
      slow: true,
      parser: parseBuild,
    },
    {
      name: 'build-admin',
      cmd: 'npm',
      args: ['run', 'build'],
      cwd: path.join(PROJECT_ROOT, 'admin'),
      slow: true,
      parser: parseBuild,
    },
  ];

  // Skip Playwright E2E in --reverify mode (saves ~3 min). The pre-flight
  // already proved the deployment is healthy; we only re-verify locally that
  // the working tree still passes lighter checks.
  if (!REVERIFY) {
    checks.push({
      name: 'qa-mobile-e2e',
      cmd: 'python3',
      args: ['scripts/qa-mobile-e2e.py'],
      slow: true,
      timeout: 600_000,
      parser: parseE2e,
    });
    checks.push({
      name: 'qa-admin-e2e',
      cmd: 'python3',
      args: ['scripts/qa-admin-e2e.py'],
      slow: true,
      timeout: 600_000,
      parser: parseE2e,
    });
  }

  return checks;
}

async function runChecksParallel(checks) {
  log(`Running ${checks.length} checks in parallel…`);
  const results = await Promise.all(
    checks.map(async (c) => {
      const start = Date.now();
      const env = { ...process.env, ...(c.env || {}) };
      const child = spawn(c.cmd, c.args, { cwd: c.cwd || PROJECT_ROOT, env });
      let stdout = '', stderr = '';
      child.stdout.on('data', (d) => { stdout += d.toString(); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      const result = await new Promise((resolve) => {
        const timeout = c.timeout || 300_000;
        const t = setTimeout(() => {
          child.kill('SIGKILL');
          resolve({ code: 124, stdout, stderr: stderr + '\n[TIMEOUT]', durationMs: Date.now() - start });
        }, timeout);
        child.on('close', (code) => {
          clearTimeout(t);
          resolve({ code, stdout, stderr, durationMs: Date.now() - start });
        });
      });

      await saveRun(c.name, result);
      log(`  ${result.code === 0 ? '✓' : '✗'} ${c.name} (${(result.durationMs / 1000).toFixed(1)}s)`);
      return { check: c, result };
    })
  );
  return results;
}

// ─────────────────────────────────────────────────────────────────
// Step C: Parse outputs into normalized findings
//
// A finding is { id, code, file, line, message, severity, source }.
// id is a stable hash so we can dedupe across runs.

function parseSmoke({ stdout, stderr, code }) {
  const findings = [];
  // qa-smoke prints "✗ <message>" for failures and "⚠ <message>" for warnings.
  const lines = (stdout + stderr).split('\n');
  for (const line of lines) {
    const fail = line.match(/✗\s+(.+)/);
    const warn = line.match(/⚠\s+(.+)/);
    if (fail) {
      findings.push({
        id: hashId('smoke', 'fail', fail[1]),
        code: 'SMOKE_FAIL',
        file: null, line: null,
        message: fail[1].trim(),
        severity: 'error',
        source: 'qa-smoke',
      });
    } else if (warn) {
      findings.push({
        id: hashId('smoke', 'warn', warn[1]),
        code: 'SMOKE_WARN',
        file: null, line: null,
        message: warn[1].trim(),
        severity: 'warning',
        source: 'qa-smoke',
      });
    }
  }
  return findings;
}

function parseDb({ stdout, stderr }) {
  const findings = [];
  const lines = (stdout + stderr).split('\n');
  for (const line of lines) {
    const fail = line.match(/✗\s+(.+)/);
    if (fail) {
      const msg = fail[1].trim();
      // The most-dangerous DB findings (RLS off, anon read of services)
      // get a specific code so triage can route them to 🔴.
      let code = 'DB_FAIL';
      if (/RLS DISABLED/.test(msg)) code = 'DB_RLS_DISABLED';
      else if (/anon could read/.test(msg)) code = 'DB_RLS_BYPASS';
      else if (/no policies on/.test(msg)) code = 'DB_NO_POLICIES';
      findings.push({
        id: hashId('db', code, msg),
        code, file: null, line: null,
        message: msg, severity: 'error',
        source: 'qa-db',
      });
    }
  }
  return findings;
}

function parseBuild({ stdout, stderr, code }) {
  if (code === 0) return [];
  // Vite prints errors with file:line:col syntax — pull what we can.
  const findings = [];
  const errorRe = /([a-zA-Z0-9_./-]+\.(?:js|jsx|ts|tsx)):(\d+):(\d+):?\s*(.*)/g;
  const out = stdout + stderr;
  let m;
  while ((m = errorRe.exec(out))) {
    findings.push({
      id: hashId('build', m[1], m[2], m[4]),
      code: 'BUILD_FAIL',
      file: m[1], line: parseInt(m[2], 10),
      message: m[4] || `Build error at line ${m[2]}`,
      severity: 'error',
      source: 'build',
    });
  }
  // Catch-all if nothing parseable
  if (findings.length === 0) {
    findings.push({
      id: hashId('build', 'unparseable', out.slice(0, 200)),
      code: 'BUILD_FAIL',
      file: null, line: null,
      message: 'Build failed (output unparseable — see stderr.log)',
      severity: 'error',
      source: 'build',
    });
  }
  return findings;
}

function parseE2e({ stdout, stderr, code }) {
  if (code === 0) return [];
  // qa-*-e2e.py scripts print "FAIL: <scenario>: <reason>" on failures.
  const findings = [];
  const lines = (stdout + stderr).split('\n');
  for (const line of lines) {
    const m = line.match(/FAIL:?\s*(.+)/i);
    if (m) {
      findings.push({
        id: hashId('e2e', m[1]),
        code: 'E2E_FAIL',
        file: null, line: null,
        message: m[1].trim(),
        severity: 'error',
        source: 'e2e',
      });
    }
  }
  if (findings.length === 0 && code !== 0) {
    findings.push({
      id: hashId('e2e', 'nonzero', code),
      code: 'E2E_FAIL',
      file: null, line: null,
      message: `E2E suite exited with code ${code} (no parseable failures — check stdout.log)`,
      severity: 'error',
      source: 'e2e',
    });
  }
  return findings;
}

// ─────────────────────────────────────────────────────────────────
// Step D: Static-scan findings (independent of test runs)
//
// These are the cheap checks we run ourselves to detect the patterns
// that map to the 🟢 auto-fix list (URL drift, console.logs, etc.).

async function staticScan() {
  const findings = [];

  // Pattern 1: Stale Vercel URLs in CLAUDE.md / README.md
  const docsToScan = ['CLAUDE.md', 'README.md'];
  const liveUrls = JSON.parse(await fs.readFile(path.join(RUN_DIR, 'urls.json'), 'utf8'));
  for (const doc of docsToScan) {
    try {
      const content = await fs.readFile(path.join(PROJECT_ROOT, doc), 'utf8');
      const urls = content.match(/https:\/\/[a-z0-9-]+\.vercel\.app/g) || [];
      const stale = urls.filter((u) => u !== liveUrls.mobile && u !== liveUrls.admin
        && !u.includes('cgs-porter.vercel.app')         // canonical aliases are OK
        && !u.includes('cgs-porter-admin.vercel.app'));
      for (const url of new Set(stale)) {
        // Only flag if both the canonical alias AND the live URL exist —
        // otherwise we'd be replacing one stale URL with another.
        if (liveUrls.mobile && url.includes('cgs-porter-') && !url.includes('admin')) {
          findings.push({
            id: hashId('vercel-url-stale', doc, url),
            code: 'VERCEL_URL_STALE',
            file: doc, line: null,
            message: `Stale Vercel URL ${url} (live: ${liveUrls.mobile})`,
            severity: 'warning',
            source: 'static-scan',
            extra: { staleUrl: url, freshUrl: liveUrls.mobile, app: 'mobile' },
          });
        } else if (liveUrls.admin && url.includes('admin')) {
          findings.push({
            id: hashId('vercel-url-stale', doc, url),
            code: 'VERCEL_URL_STALE',
            file: doc, line: null,
            message: `Stale Vercel URL ${url} (live: ${liveUrls.admin})`,
            severity: 'warning',
            source: 'static-scan',
            extra: { staleUrl: url, freshUrl: liveUrls.admin, app: 'admin' },
          });
        }
      }
    } catch { /* file missing — skip */ }
  }

  // Pattern 5: Orphan console.log() in src/ or admin/src/
  // (We use git grep — fast and respects .gitignore.)
  const grep = await exec('git', ['grep', '-n', '-E', 'console\\.(log|debug)\\s*\\(',
    '--', 'src/', 'admin/src/'], { timeout: 10_000 });
  if (grep.stdout) {
    for (const line of grep.stdout.split('\n').filter(Boolean)) {
      const m = line.match(/^([^:]+):(\d+):(.*)$/);
      if (!m) continue;
      const [, file, ln, content] = m;
      // Skip if the line is in a comment-only context. Naive but safe:
      if (content.trim().startsWith('//')) continue;
      // Skip if it's intentional (eg. error handlers we added on purpose)
      if (/console\.error/.test(content)) continue;
      findings.push({
        id: hashId('console-log', file, ln),
        code: 'CONSOLE_LOG_LEFT',
        file, line: parseInt(ln, 10),
        message: `Orphan console.log/debug at ${file}:${ln}`,
        severity: 'warning',
        source: 'static-scan',
        extra: { snippet: content.trim().slice(0, 80) },
      });
    }
  }

  return findings;
}

// ─────────────────────────────────────────────────────────────────
// Main

async function main() {
  log(`Run ID: ${ts}${REVERIFY ? ' (reverify)' : ''}`);
  log(`Output dir: ${RUN_DIR}`);

  const urls = await resolveVercelUrls();
  const checks = buildChecks(urls);
  const checkResults = await runChecksParallel(checks);

  // Collect findings from check parsers
  let allFindings = [];
  for (const { check, result } of checkResults) {
    const parsed = check.parser ? check.parser(result) : [];
    allFindings.push(...parsed);
  }

  // Add static-scan findings
  allFindings.push(...await staticScan());

  await fs.writeFile(
    path.join(RUN_DIR, 'findings.json'),
    JSON.stringify({ ts, urls, findings: allFindings }, null, 2)
  );

  // Summary
  const passed = checkResults.filter((r) => r.result.code === 0).length;
  const failed = checkResults.length - passed;
  log('');
  log(`— Summary —`);
  log(`  checks: ${passed}/${checkResults.length} passed`);
  log(`  findings: ${allFindings.length} total (${allFindings.filter(f => f.severity === 'error').length} errors, ${allFindings.filter(f => f.severity === 'warning').length} warnings)`);
  log(`  → ${path.relative(PROJECT_ROOT, path.join(RUN_DIR, 'findings.json'))}`);

  // Symlink the latest run for easy access by other scripts
  const latestLink = path.join(STATE_DIR, 'latest');
  try { await fs.unlink(latestLink); } catch {}
  await fs.symlink(RUN_DIR, latestLink);

  // Exit code: 0 even if findings present (triage decides what to do)
  // Only non-zero if the orchestrator itself crashed.
  process.exit(0);
}

main().catch((err) => {
  console.error('[run-loop] FATAL', err);
  process.exit(1);
});
