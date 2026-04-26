---
name: cgs-qa-loop
description: Run an automated QA + safe bug-fix loop on the CGS Porter app + admin dashboard. Tests everything end-to-end (HTTP smoke, DB integrity, Playwright E2E mobile + admin, builds), auto-fixes only trivially-safe bugs (URL drift, missing alt tags, console.logs, etc.) with mandatory re-verification + rollback if anything breaks, and proposes diffs for everything else. Use this skill whenever Mate says "/cgs-qa-loop", "qa-loop", "auto-qa", "pasa la qa-loop", "comprueba y arregla", "test y fix", "checkea todo y resuelve los bugs", "lanza el bucle de QA", or anything about running automated checks + fixes on the CGS Porter system. ALSO use it proactively before demos, after merging large PRs, or when the user mentions wanting to verify the production deployment is at 100%. Does NOT trigger for greenfield design work, manual single-bug investigations, or pure code refactors — only the full automated check-fix-verify loop.
---

# CGS Porter — Automated QA + Safe Bug-Fix Loop

This skill runs a complete check-fix-verify cycle on the CGS Porter system without you having to be reactive about bugs. The core promise: **only the safest possible fixes get applied automatically, and every fix is verified before commit. If anything breaks, the fix rolls back instantly.**

## When to use

- Before every demo (Mate's demo with leadership is recurring → run this morning-of)
- After merging a feature PR
- When something feels "off" but you're not sure where
- On a schedule (cron / wakeup) for unattended overnight checks

## The golden rule of safety

> **Auto-fix only the trivially-safe. Propose everything else.**

Three response levels for every finding:

| Level | When | Action |
|---|---|---|
| 🟢 **Auto-fix** | Textual/declarative change, no business logic | Apply → re-verify → rollback if it breaks anything |
| 🟡 **Propose** | Touches logic, RLS, UI, schema | Generate diff, do **NOT** commit, await human approval |
| 🔴 **Alert-only** | Auth, payments, destructive deletes, force-push | Report only, never touch code |

**Never auto-fix anything that is not in the closed list of 8 patterns** (see `references/safe-fix-patterns.md`).

## Workflow

Execute this sequence in order. Don't skip steps. Stop only on a critical infrastructure failure (e.g., git is missing, internet is down).

### Step 1 — Pre-flight check

```bash
cd "/Users/matetorgvaidze/Desktop/CGS App"
# Working tree must be clean before we start (otherwise rollback is dangerous)
git status --porcelain
```

If output is non-empty → **STOP**. Tell the user: "Working tree has uncommitted changes — commit, stash, or discard them before running qa-loop." Do not proceed.

```bash
git rev-parse HEAD > /tmp/cgs-qa-loop-start-sha.txt
```

### Step 2 — Run the orchestrator

The orchestrator script handles parallel execution + result capture:

```bash
cd "/Users/matetorgvaidze/Desktop/CGS App"
node .claude/skills/cgs-qa-loop/scripts/run-loop.mjs
```

This script:
1. Resolves latest Vercel production URLs (mobile + admin).
2. Runs all checks in parallel where possible (`qa-smoke.mjs`, `qa-db.mjs`, `qa-mobile-e2e.py`, `qa-admin-e2e.py`, `npm run build` × 2, `eslint --no-fix`).
3. Captures every output to `.claude/skills/cgs-qa-loop/state/run-<timestamp>/`.
4. Writes a normalized `findings.json` with one entry per detected issue:
   ```json
   { "id": "stable-hash", "code": "VERCEL_URL_STALE", "file": "CLAUDE.md",
     "line": 42, "message": "...", "severity": "warning" }
   ```

**The script must finish before you proceed to Step 3** — never start triaging while checks are still running.

### Step 3 — Triage

```bash
node .claude/skills/cgs-qa-loop/scripts/triage.mjs \
  --findings .claude/skills/cgs-qa-loop/state/run-<timestamp>/findings.json
```

This writes `triage.json` with each finding tagged `green | yellow | red`. The classifier consults:
- `references/safe-fix-patterns.md` — the 8 codes that map to 🟢
- `references/never-touch.md` — the file/code patterns that map to 🔴
- Everything else → 🟡

**Dedupe step**: cross-reference against `state/known-issues.json`. If a 🟡 was already proposed in a previous run and the user hasn't acted on it, mark it as `silenced` to avoid spamming.

### Step 4 — Apply 🟢 fixes (one at a time, with rollback)

For each 🟢 finding:

```bash
node .claude/skills/cgs-qa-loop/scripts/apply-safe-fix.mjs --id <finding-id>
```

The script:
1. Records the pre-fix git state (`git stash` if the working tree has any drift).
2. Applies the fix matching the finding's `code` (only one of the 8 known patterns).
3. Re-runs the checks that passed before. If any now fails → `git checkout -- <file>` (revert just that file) + reclassify the finding as 🟡.
4. If all passing checks still pass, the finding is marked `applied` in `triage.json`.

**Why one-at-a-time**: if we batched fixes and re-ran checks once at the end, we wouldn't know which fix broke what. Sequential application + per-fix verification gives us a clean rollback unit.

### Step 5 — Final full re-verification

After all 🟢 fixes are applied (or skipped), re-run the **complete** suite from Step 2 against the working tree (not yet pushed):

```bash
node .claude/skills/cgs-qa-loop/scripts/run-loop.mjs --reverify
```

The post-fix run must have at least as many passing checks as the pre-fix run. If not → `git reset --hard $(cat /tmp/cgs-qa-loop-start-sha.txt)` and abort the entire loop. Tell the user.

### Step 6 — Commit + push (only if fixes were applied)

If `triage.json` shows ≥1 successful 🟢 fix:

```bash
cd "/Users/matetorgvaidze/Desktop/CGS App"
git add -A
git commit -m "$(cat <<'EOF'
qa-loop: auto-fixes (<N> items) — verified by cgs-qa-loop

Applied fixes:
- <code-1>: <file-1>
- <code-2>: <file-2>
…

All checks pass post-fix.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
git push
```

Wait 60 seconds, then re-run **only smoke tests** (fast — ~10s) against production:

```bash
sleep 60 && node scripts/qa-smoke.mjs
```

If smoke fails post-deploy → `git revert HEAD --no-edit && git push`. Tell the user the deploy was rolled back and explain what failed.

### Step 7 — Report

Generate a final markdown report and append a single-line JSON to `state/history.jsonl`:

```markdown
# CGS QA Loop — <ISO timestamp>

## ✅ Passed (N)
- qa-smoke: 18/18
- qa-db: all integrity checks
- qa-admin-e2e: 37/37 scenarios
- qa-mobile-e2e: 20/20 scenarios
- build root: ✓
- build admin: ✓
- eslint: 0 errors

## 🟢 Auto-fixed (N)
1. **VERCEL_URL_STALE** — `CLAUDE.md:42` — updated stale Vercel URL → new alias
2. **CONSOLE_LOG_LEFT** — `src/screens/Detail.jsx:88` — removed orphan console.log

## 🟡 Proposed (N) — awaiting your approval
1. **MOBILE_E2E_FAIL: login-form-missing-email** — `src/screens/Login.jsx`
   ```diff
   - // <input type="email" ... />
   + <input type="email" ... />
   ```

## 🔴 Alerts (N) — manual action required
1. **AUTH_RLS_DRIFT** — anon can read `services` (RLS not enforcing) — DO NOT auto-fix RLS

## Summary
- Total findings: 7
- Auto-fixed: 2 (verified, committed, deployed)
- Proposed: 3 (need your review)
- Alerts: 2 (need manual investigation)
- Time: 3m 42s
```

Append a single-line summary to `state/history.jsonl` (one line per run, JSON):
```json
{"ts":"2026-04-26T14:32:00Z","duration_s":222,"green_applied":2,"yellow_proposed":3,"red_alerts":2,"deploy":"success","commit":"abc123"}
```

## Modes (how to schedule the loop)

### Mode A — On-demand (default, recommended)
The user invokes `/cgs-qa-loop` directly, or asks "pasa la qa-loop". Skill runs once.

### Mode B — Scheduled wakeup (in-session)
If the user wants periodic checks while they work, schedule the next run:
```
ScheduleWakeup(delaySeconds=1800, prompt="/cgs-qa-loop", reason="periodic QA loop, every 30 min")
```
After each completed run, schedule the next wakeup. Stop when the user says "stop the loop".

### Mode C — Cron (out-of-session)
For nightly unattended runs, create a cron via `CronCreate`:
```
schedule: "0 3 * * *"
prompt: "/cgs-qa-loop"
```
Note: cron requires a Claude Code session reachable at fire time. Check with `CronList` before assuming a cron is active.

**Default behavior**: if the user doesn't specify, use Mode A.

## Out of scope

- Auto-fixing logic bugs (auth, pricing math, RLS policies, schema migrations)
- Lighthouse / performance benchmarks (use the `audit-website` skill instead)
- Generating GitHub issues (can be added later via `gh issue create`)
- Slack / Telegram notifications (post-Telegram-bot work)
- BD-destructive actions (deletes, restores) — never automate these
- Aggressive mode that auto-applies 🟡 — never. Always require human approval for 🟡.

## Critical references

When you need detail beyond this SKILL.md:
- `references/safe-fix-patterns.md` — the 8 patterns that qualify for 🟢, with regex + examples
- `references/never-touch.md` — the file/code patterns that always map to 🔴
- `references/decision-tree.md` — flowchart for triage decisions

## What success looks like

After running this skill, Mate should be able to:
1. **See a clear report** — exactly N things passed, N auto-fixed, N proposed, N alerts.
2. **Trust the green commits** — every auto-fix has been verified against the same test suite that detected the bug.
3. **Sleep well** — if the loop runs overnight via cron, the absolute worst case is "no fixes applied + 1 yellow proposed" — never "production is broken".
4. **Save time** — instead of debugging the same trivial bug 3 times in a week, the loop catches and fixes it once, automatically.
