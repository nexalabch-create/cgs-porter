# Never-touch zones (🔴)

These are the files, code patterns, and finding codes that **always** map to 🔴 alert-only. The loop will report them but will never modify them automatically.

---

## File patterns

| Pattern | Why never auto-fix |
|---|---|
| `src/lib/supabase.js` | Auth client. Single point of failure for every API call. |
| `admin/src/lib/supabase.js` | Same as above for admin. |
| `src/lib/pricing.js` | Single source of truth for tariff math. Wrong fix → revenue loss. |
| `admin/src/lib/pricing.js` | Mirror of above — must stay in sync but only via human edit. |
| `supabase/migrations/*.sql` | DB schema is irreversible (except via new migrations). Wrong fix → data loss. |
| `vercel.json` | Deployment config. Wrong fix → site goes down. |
| `package.json` (versions) | Dependency upgrades can have transitive effects beyond what tests catch. |
| `.env*` | Secrets. The loop should never even read these, let alone modify. |
| `.github/workflows/*` | CI/CD. Wrong fix → broken pipelines. |

---

## Finding codes (regardless of file)

| Code | Source | Why never auto-fix |
|---|---|---|
| `DB_RLS_DISABLED` | qa-db.mjs | RLS off = anyone can read everything. Critical security issue, needs human investigation. |
| `DB_RLS_BYPASS` | qa-db.mjs | Anon role reading rows that should be blocked. Same severity. |
| `DB_NO_POLICIES` | qa-db.mjs | A table missing RLS policies entirely. Schema-level fix needed. |
| `AUTH_ANY` | various | Anything matching `/auth\|signIn\|signOut\|password\|token\|jwt/i` in the message. |

---

## Message-content patterns

If a finding's `message` matches any of these regexes, it's 🔴:

```js
[
  /\bauth\b/i,
  /\bsignIn\b/i,
  /\bsignOut\b/i,
  /\bpassword\b/i,
  /\btoken\b/i,
  /\bjwt\b/i,
  /\bRLS\b/,
  /\bdelete\b.*\busers?\b/i,    // any delete touching users
  /\bdrop\s+table\b/i,
  /\btruncate\b/i,
  /\bforce\s*push\b/i,
]
```

---

## What to do when 🔴 is hit

The loop:
1. **Stops** any in-progress fix on that file (defensive).
2. **Skips** all 🟢 fixes that touch related files.
3. **Reports** prominently in the final summary — 🔴 is shown above 🟡 in the report.
4. **Does NOT silence** like 🟡 — every run re-reports 🔴 until the human acknowledges (by editing `state/known-issues.json` accepted section).

---

## Adding new patterns

If a new file/code gets sensitive enough to warrant a 🔴, add it here AND in `triage.mjs`:

```js
const RED_FILE_PATTERNS = [
  /^src\/lib\/supabase\.js$/,
  // ...
  /^your\/new\/pattern\.js$/,   // ← add here
];
```

Test by running the loop with a deliberately-broken version of that file and confirming triage tags it 🔴.
