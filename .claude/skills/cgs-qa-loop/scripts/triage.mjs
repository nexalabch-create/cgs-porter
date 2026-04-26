#!/usr/bin/env node
// cgs-qa-loop — triage
//
// Reads findings.json, classifies each finding as green/yellow/red based on
// the closed lists in references/, dedupes against state/known-issues.json,
// and writes triage.json.
//
// Usage:
//   node triage.mjs --findings <run-dir>/findings.json [--out <triage.json>]

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(__dirname, '..');
const STATE_DIR = path.join(SKILL_DIR, 'state');
const KNOWN_ISSUES = path.join(STATE_DIR, 'known-issues.json');

// ─────────────────────────────────────────────────────────────────
// Args

const args = process.argv.slice(2);
const findingsArg = args[args.indexOf('--findings') + 1];
const outArg = args.indexOf('--out') >= 0 ? args[args.indexOf('--out') + 1] : null;
if (!findingsArg) {
  console.error('Usage: triage.mjs --findings <path> [--out <path>]');
  process.exit(2);
}

// ─────────────────────────────────────────────────────────────────
// Classification rules
//
// 🟢 GREEN — auto-fixable. Closed list of 8 codes. Adding a 9th requires
//   updating both safe-fix-patterns.md AND apply-safe-fix.mjs.
const GREEN_CODES = new Set([
  'VERCEL_URL_STALE',     // 1. URLs Vercel obsoletas
  'IMG_ALT_MISSING',      // 2. <img> sin alt
  'THEME_COLOR_WRONG',    // 3. meta theme-color con valor incorrecto
  'APPLE_TOUCH_ICON_MISSING', // 4. apple-touch-icon faltante
  'CONSOLE_LOG_LEFT',     // 5. console.log huérfano
  'IMPORT_BROKEN',        // 6. import relativo roto (ESLint confidence high)
  'WHITESPACE_DRIFT',     // 7. trailing whitespace + missing EOF newline
  'UNUSED_VAR',           // 8. variable unused (ESLint confidence high)
]);

// 🔴 RED — never touch. Either the file pattern or the code matches.
const RED_FILE_PATTERNS = [
  /^src\/lib\/supabase\.js$/,
  /^admin\/src\/lib\/supabase\.js$/,
  /^src\/lib\/pricing\.js$/,
  /^admin\/src\/lib\/pricing\.js$/,
  /^supabase\/migrations\/.*\.sql$/,
  /^vercel\.json$/,
  /^package\.json$/,
  /^\.env/,
];

const RED_CODES = new Set([
  'DB_RLS_DISABLED',
  'DB_RLS_BYPASS',
  'DB_NO_POLICIES',
]);

const RED_MESSAGE_PATTERNS = [
  /\bauth\b/i,
  /\bsignIn\b/i,
  /\bsignOut\b/i,
  /\bpassword\b/i,
  /\btoken\b/i,
  /\bjwt\b/i,
  /\bRLS\b/,
];

// ─────────────────────────────────────────────────────────────────
// Helpers

function classify(finding) {
  // RED check first (most conservative)
  if (RED_CODES.has(finding.code)) return 'red';
  if (finding.file && RED_FILE_PATTERNS.some((re) => re.test(finding.file))) return 'red';
  if (finding.message && RED_MESSAGE_PATTERNS.some((re) => re.test(finding.message))) return 'red';

  // GREEN check — must be in closed list
  if (GREEN_CODES.has(finding.code)) return 'green';

  // Default: YELLOW (propose, don't auto-fix)
  return 'yellow';
}

async function loadKnownIssues() {
  try {
    const raw = await fs.readFile(KNOWN_ISSUES, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { silenced: {}, accepted: {}, rejected: {} };
  }
}

async function saveKnownIssues(known) {
  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(KNOWN_ISSUES, JSON.stringify(known, null, 2));
}

// ─────────────────────────────────────────────────────────────────
// Main

async function main() {
  const raw = await fs.readFile(findingsArg, 'utf8');
  const { ts, urls, findings } = JSON.parse(raw);
  const known = await loadKnownIssues();

  const triaged = findings.map((f) => {
    const level = classify(f);
    const previouslyProposed = known.silenced[f.id] || known.rejected[f.id];
    return {
      ...f,
      level,
      // If we already proposed this and the user hasn't acted on it,
      // mark as silenced so the report skips it (avoids spam).
      silenced: level === 'yellow' && !!previouslyProposed,
      previously: previouslyProposed ? {
        firstSeen: previouslyProposed.firstSeen,
        timesSeen: (previouslyProposed.timesSeen || 1) + 1,
      } : null,
    };
  });

  // Update known-issues for any new yellow findings (so next run silences)
  const now = new Date().toISOString();
  for (const f of triaged) {
    if (f.level !== 'yellow') continue;
    if (known.silenced[f.id]) {
      known.silenced[f.id].timesSeen = (known.silenced[f.id].timesSeen || 1) + 1;
      known.silenced[f.id].lastSeen = now;
    } else {
      known.silenced[f.id] = {
        firstSeen: now, lastSeen: now, timesSeen: 1,
        message: f.message, file: f.file, code: f.code,
      };
    }
  }
  await saveKnownIssues(known);

  const counts = {
    green: triaged.filter((f) => f.level === 'green').length,
    yellow: triaged.filter((f) => f.level === 'yellow').length,
    red: triaged.filter((f) => f.level === 'red').length,
    silenced: triaged.filter((f) => f.silenced).length,
  };

  const out = {
    ts, urls,
    counts,
    triaged,
  };

  const outPath = outArg || path.join(path.dirname(findingsArg), 'triage.json');
  await fs.writeFile(outPath, JSON.stringify(out, null, 2));

  console.log(`[triage] ${triaged.length} findings:`);
  console.log(`  🟢 green:    ${counts.green}`);
  console.log(`  🟡 yellow:   ${counts.yellow} (${counts.silenced} silenced — already proposed)`);
  console.log(`  🔴 red:      ${counts.red}`);
  console.log(`  → ${outPath}`);
}

main().catch((err) => {
  console.error('[triage] FATAL', err);
  process.exit(1);
});
