# Triage decision tree

For every finding, walk this tree top-to-bottom. First match wins.

```
┌─────────────────────────────────────────────────────────────┐
│  finding.code in RED_CODES? (DB_RLS_*, AUTH_*)              │
│    YES → 🔴 alert-only, never touch                         │
│    NO  ↓                                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  finding.file matches RED_FILE_PATTERNS?                    │
│  (supabase.js, pricing.js, migrations/*.sql, vercel.json…)  │
│    YES → 🔴 alert-only                                      │
│    NO  ↓                                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  finding.message matches RED_MESSAGE_PATTERNS?              │
│  (auth, signIn, signOut, password, token, jwt, RLS, drop…)  │
│    YES → 🔴 alert-only                                      │
│    NO  ↓                                                    │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  finding.code in GREEN_CODES? (the closed list of 8)        │
│    YES → 🟢 auto-fix candidate                              │
│    NO  → 🟡 propose only                                    │
└─────────────────────────────────────────────────────────────┘
```

## Why this order

The order matters. 🔴 checks come first because **the cost of false-positive caution is low** (we just don't auto-fix something we could have) but **the cost of false-negative caution is catastrophic** (we modify auth/pricing/schema and break production).

## Default to yellow

Anything not matching the green closed list is yellow — proposed but not applied. This protects against unknown codes (e.g., a new linter rule that hasn't been categorized yet) being silently auto-fixed.

## After applying a green fix

If the post-fix verification fails, the green finding gets **demoted to yellow** in `triage.json`:

```json
{
  "id": "abc123",
  "code": "VERCEL_URL_STALE",
  "level": "yellow",        // ← was "green"
  "status": "rolled-back",
  "rollbackReason": "verify-failed: build-root"
}
```

This way the next run won't try to auto-apply the same broken fix. The user gets to see why it was demoted in the report.

## Silencing yellows across runs

Yellow findings tracked in `state/known-issues.json`. After the first run, subsequent runs skip them in the report unless the user resets the file.

If the user wants to explicitly accept or reject a yellow:

```json
// state/known-issues.json
{
  "silenced": { ... },     // auto-populated by triage
  "accepted": {
    "abc123": {
      "acceptedAt": "2026-04-26T15:00:00Z",
      "comment": "won't fix — UI is intentional"
    }
  },
  "rejected": {
    "def456": {
      "rejectedAt": "2026-04-26T15:00:00Z",
      "comment": "duplicate of #123 in GitHub issues"
    }
  }
}
```

Both `accepted` and `rejected` cause the finding to be permanently silenced. The difference is documentation only — useful when running cron and reviewing history later.
