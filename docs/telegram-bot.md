# Telegram Bot for CGS Porter — Product Spec

> **Status:** drafted 2026-04-25, execution scheduled post-demo (after 2026-05-01).
> **Owner:** Mate Torgvaidze · **Agency:** Nexalab · **Estimated effort:** ~12 h (1.5 days).

## 1. Context & motivation

Mate (chef d'équipe + project owner) needs to operate the CGS Porter app from his phone when he's not at his desk — typically when he's just arrived at the office, in the field at the terminal, or commuting. Current pain: every action requires opening the laptop or admin panel.

The 6 chefs at CGS share this pain. The mobile PWA already covers daily operations (assign, mark done, see roster) but **doesn't cover** admin-level lookups, credential resets, or copy/configuration changes.

A Telegram bot solves this with the lowest possible friction: the chef already has Telegram open, conversation is the most natural interface for "what's X?" / "do Y" / "who's Z?", and the bot can be allowlisted to a known chat-ID set so security is straightforward.

## 2. User stories

| As a... | I want to... | So that... |
|---|---|---|
| Chef at the terminal | ask "links del dashboard" | I can paste them in WhatsApp without opening laptop |
| Chef on the way to office | ask "qui travaille ce matin?" | I know who's there before I arrive |
| Mate as admin | ask "donne-moi l'accès de Karim" | I can help Karim sign in when his phone is broken |
| Chef on a service | type "/done EK408" | the service is marked terminated without opening the PWA |
| Mate planning new tariffs | type "change the Privé base price to 30 CHF" | the change is queued for review (bot opens GitHub issue) |
| Mate on operations | type "/assign EK408 Andrei" | Andrei gets the service even though I'm in the metro |
| Anyone | run unsupervised destructive commands | (NO — confirmation required, see §6) |

## 3. Architecture

```
                    Mate's phone (Telegram)
                           │
                           ▼
   ┌───────────────────────────────────────────────┐
   │  Telegram Bot API webhook                     │
   │  (long-poll fallback if webhook flaps)        │
   └────────────────┬──────────────────────────────┘
                    │
                    ▼
   ┌───────────────────────────────────────────────┐
   │  Bot server (Node.js, TypeScript)             │
   │  Hosted on:                                   │
   │   · Vercel Functions (free, cold-start ~500ms)│
   │   · or Railway always-on ($5/mo, ~50ms)       │
   │  Handles: auth, dispatch, audit, confirmations│
   └────────────────┬──────────────────────────────┘
                    │
                    ▼
   ┌───────────────────────────────────────────────┐
   │  Anthropic Claude API (claude-sonnet-4)       │
   │  with tool-use enabled                        │
   │  System prompt: persona + safety boundaries   │
   └────────────────┬──────────────────────────────┘
                    │
        ┌───────────┼─────────────┬─────────────────┐
        ▼           ▼             ▼                 ▼
   Supabase     Supabase      GitHub API     (NEVER) shell access
   REST/RPC     Auth          Issues/PRs     to the live repo
   (read+ops)   (mgmt)
```

**Stack decisions:**
- **Node.js + TypeScript** — same as the rest of the project, lets us share the Supabase client + types from `admin/src/lib/`.
- **`grammY`** as Telegram framework (modern alternative to `node-telegram-bot-api`, better typing).
- **Anthropic SDK** for Claude API + tool-use — natural fit since the agent reasoning is LLM-driven.
- **Vercel Functions** for v1 (free, integrates with the existing Vercel team `nexalabch-creates-projects`).
- **Same Supabase project** (`ronmmqbqapdxinutxnah`) using the service-role key so the bot can read/write any table. Service-role key lives only on the bot server, never in client.

## 4. Commands inventory

### 4.1 Read-only (no confirmation needed)

| Command | Tool | Returns |
|---|---|---|
| `/links` or "dame los links" | `get_dashboard_links()` | Latest mobile + admin Vercel URLs (live `vercel ls --prod`) |
| `/employee <name>` or "info de Karim" | `get_employee(name)` | Full row from `public.users` for first matching name (email, role, ID CGS, station, last login) |
| `/services_today` or "servicios de hoy" | `list_services_today()` | Compact list: `EK408 17:30 · Mr Patel · Mate (active)` × N |
| `/active_now` or "quién trabaja ahora" | `list_active_porters()` | Porters whose `shifts.starts_at ≤ now() ≤ ends_at` |
| `/revenue` or "ingresos hoy" | `get_revenue_summary()` | CHF today + this month + delta vs. last month |
| `/stats` | `get_dashboard_snapshot()` | The 4 KPIs from the admin dashboard, formatted for chat |

### 4.2 Operations (write to BD, **require confirmation**)

| Command | Tool | Effect |
|---|---|---|
| `/assign <flight> <porter>` | `assign_service(flight, porter_name)` | UPDATE `services SET assigned_porter_id = X WHERE flight = Y AND scheduled_at::date = today` |
| `/done <flight>` | `mark_service_done(flight)` | UPDATE `services SET status='done', completed_at=now() WHERE flight = X` |
| `/create_service <flight> <time> <client> <bags> <source>` | `create_service(...)` | INSERT into services |
| `/cancel <flight>` | `cancel_service(flight)` | UPDATE `services SET status='cancelled'` (new enum value, requires migration) |

**Confirmation flow:**
```
User: /done EK408
Bot:  Tu veux marquer EK408 comme terminé?
      Actuel: 17:30 · Mr Patel · Mate (active depuis 12 min)
      [✅ Confirmer] [❌ Annuler]
User: [taps ✅]
Bot:  ✅ Service EK408 marqué terminé. CHF 35 facturés.
```

### 4.3 Credentials & access (sensitive — audited)

| Command | Tool | Returns |
|---|---|---|
| `/access <name>` | `get_credentials(name)` | Email + "password universel: CgsPorter2026!" + warning to rotate after first login |
| `/reset_password <name>` | `trigger_password_reset(email)` | Triggers Supabase magic-link email; bot says "lien envoyé à <email>" |
| `/whoami` | `whoami()` | Echoes the chef's own profile for sanity-check |

> **Security caveat:** before going to v1.0, **rotate from universal demo password to per-user passwords** (TODO already logged in CLAUDE.md). The bot then says "demande à l'admin de réinitialiser ton mot de passe" or triggers the reset flow. Universal password exposure should not survive v0.1.

### 4.4 Configuration changes (whitelist — direct execution)

These are pre-approved "settings" tweaks that don't require code review.

| Command | Tool | Effect |
|---|---|---|
| `/set_tariff <source> base <CHF>` | `update_tariff(source, 'base', value)` | UPDATE `app_settings SET <field> = value WHERE id=1` |
| `/set_tariff <source> extra <CHF>` | `update_tariff(source, 'extra', value)` | Same, on the `_extra` column |
| `/promote <name>` | `change_user_role(name, 'chef')` | UPDATE `users SET role='chef'` (notifies user via email) |
| `/demote <name>` | `change_user_role(name, 'porter')` | Same |

All trigger the standard confirmation flow.

### 4.5 Code changes (review-only — bot opens an issue)

For everything else ("change this text", "add a column", "fix this bug"), the bot **does not edit code**. Instead:

| Command | Tool | Effect |
|---|---|---|
| `/issue <description>` | `create_github_issue(title, body)` | Creates a labeled issue on `nexalabch-create/cgs-porter` with reporter info and a link back to the chat thread |
| `/pr_status` | `list_open_prs()` | Lists open PRs awaiting review |

This is the **safety boundary**: code changes always go through GitHub review, never get auto-deployed from a chat message.

## 5. Tool schemas (Claude API format)

```typescript
// Excerpt — full file at scripts/telegram-bot/tools.ts
export const TOOLS = [
  {
    name: 'get_employee',
    description: 'Look up a CGS Porter employee by first name, last name, or email. Returns the full profile from public.users.',
    input_schema: {
      type: 'object',
      properties: { name: { type: 'string', description: 'First name, last name, or email substring' } },
      required: ['name'],
    },
  },
  {
    name: 'assign_service',
    description: 'Assign a service to a porter. Requires the user to confirm before the UPDATE runs.',
    input_schema: {
      type: 'object',
      properties: {
        flight: { type: 'string', description: 'Flight code (e.g. EK408)' },
        porter_name: { type: 'string', description: 'Porter first name or email' },
      },
      required: ['flight', 'porter_name'],
    },
  },
  // … 14 more tools
] as const;
```

The bot pipes the user's message into Claude with these tools available. Claude decides which tool(s) to call. The bot intercepts the tool calls and:
- For read tools: executes immediately
- For write tools: sends a confirmation message; only executes on tap of ✅
- For sensitive tools: writes to `audit_log` BEFORE executing

## 6. Security model

### 6.1 Chat-ID allowlist

Only chat IDs in `BOT_ALLOWED_CHAT_IDS` (env var, comma-separated) get a response. Everyone else: silent ignore (no leakage of "I exist").

```bash
# .env on the bot server
BOT_ALLOWED_CHAT_IDS=123456789,987654321,...    # Mate + 5 chefs
```

### 6.2 Audit log

```sql
-- supabase/migrations/0007_audit_log.sql
create table public.audit_log (
  id           bigserial primary key,
  occurred_at  timestamptz not null default now(),
  actor_chat_id bigint not null,        -- Telegram chat ID
  actor_name   text not null,           -- resolved name from CGS profile
  action       text not null,           -- e.g. 'assign_service', 'get_credentials'
  payload      jsonb,                   -- input to the tool
  result       text not null,           -- 'success' | 'error' | 'confirmed' | 'cancelled'
  result_detail jsonb
);
create index audit_log_recent on public.audit_log (occurred_at desc);
```

### 6.3 Confirmation flow

- **Read** ops: no confirmation
- **Operations** (assign/done/create): inline keyboard `[✅ Confirmer] [❌ Annuler]`, 60-sec timeout
- **Sensitive** (credentials, role changes, tariff changes): same + the audit log entry is written **before** confirmation appears, with `result='requested'`. Confirmation updates to `confirmed` or `cancelled`.

### 6.4 Rate limiting

- Max 30 commands / minute per chat ID (Telegram bot API allows up to 30/sec but we cap lower for safety)
- Max 5 sensitive commands / hour per chat ID

## 7. Database changes

One new migration: `supabase/migrations/0007_audit_log.sql` (schema in §6.2).

No changes to existing tables. The bot reads `users`, `services`, `shifts`, `app_settings` and writes to `services`, `users` (role flips), `app_settings`, `audit_log`.

## 8. Implementation phases

### Phase 1 — Skeleton (2 h)
- Repo structure: `bot/` directory at the repo root with `package.json`, `tsconfig.json`, `bot/src/index.ts`
- grammY bot scaffolding, webhook setup
- Auth middleware (chat-ID allowlist)
- Health-check command (`/ping` → "pong")
- Vercel Functions deployment configuration

### Phase 2 — Read tools (2 h)
- Supabase client setup with service-role key
- Tools: `get_dashboard_links`, `get_employee`, `list_services_today`, `list_active_porters`, `get_revenue_summary`, `get_dashboard_snapshot`
- Claude API integration with tool-use loop
- Markdown formatting helpers for chat output

### Phase 3 — Operations + audit (3 h)
- Migration 0007 (audit_log table)
- Confirmation keyboard helper
- Tools: `assign_service`, `mark_service_done`, `create_service`, `cancel_service`
- Wrap every write in audit-log insert

### Phase 4 — Credentials + role changes (1 h)
- Tools: `get_credentials`, `trigger_password_reset`, `change_user_role`
- Extra audit-log fields (sensitivity flag)

### Phase 5 — GitHub issue creator (1 h)
- GitHub App or PAT in env
- Tool: `create_github_issue` with template (title from /issue arg, body includes Telegram thread URL + actor)
- Tool: `list_open_prs`

### Phase 6 — Tariff + admin shortcuts (2 h)
- Tools: `update_tariff`, `set_app_setting`
- Allowlist of mutable settings keys (no arbitrary `app_settings` writes)

### Phase 7 — QA + monitoring (1 h)
- E2E test script: simulated Telegram updates, assert correct tool dispatch
- Sentry or simple webhook for error reporting
- README in `bot/` with setup + deployment + secrets rotation

## 9. Hosting decision matrix

| Option | $/mo | Cold start | DX | Verdict |
|---|---|---|---|---|
| Vercel Functions | $0 | ~500 ms | Same team as the rest | ✅ v1 |
| Railway always-on | $5 | ~0 ms | Separate dashboard | ⏳ if v1 latency feels bad |
| Fly.io | $3 | ~0 ms | More config | ⏳ alt to Railway |
| Self-hosted on VPS | $5+ | 0 | More ops | ❌ |

**Decision:** Vercel Functions for v1. Migrate to Railway only if Mate complains about the 500 ms cold start.

## 10. Open questions to resolve before kicking off

- [ ] **What does Nexalab's existing `openclaw` look like?** If it has a stable Anthropic-API-tool-use loop and good Telegram integration, we extend it instead of starting fresh. Mate to share repo or screenshots before sprint kickoff.
- [ ] **Universal password rotation.** Same blocker as the existing CLAUDE.md TODO. The bot's `get_credentials` tool should NOT return `CgsPorter2026!` after this rotation; it should trigger a magic-link reset.
- [ ] **Language**. French only? French + Spanish (Mate's native)? French + English? My guess: French primary, the bot handles French + Spanish + English in input but always responds in French for consistency. Confirm.
- [ ] **Voice messages.** Telegram supports voice. Should the bot transcribe voice → use Claude → respond in text (or voice)? My guess: out of scope for v1, easy add for v2 (Whisper API).
- [ ] **Group chats.** Should the bot work in a CGS staff group (e.g. "@mate I need access for Karim, ask the bot")? My default: NO for v1 — DM only. Group support adds attribution complexity (who's actually asking?).

## 11. Out of scope (v1)

- Voice notes (v2 with Whisper)
- Image/screenshot input (v2)
- Multi-language responses (French only for now)
- Group chats (DM only)
- Web UI for managing the bot (config via env vars)
- "Free-form code changes" tool that runs Claude Code (security gap, not worth the risk)
- Calendar / scheduled message support ("remind me at 8 AM about…")
- Push notifications **from** the bot (vs. responses to user-initiated messages)

## 12. Success criteria for v1

- [ ] Mate can run all 6 read commands and they return correct, current data within 3 seconds
- [ ] Mate can assign a service from his phone with confirmation
- [ ] Mate can mark a service done from his phone
- [ ] All write operations appear in `audit_log` with correct actor + result
- [ ] Non-allowlisted chat IDs get zero response
- [ ] Sensitive commands (credentials, role changes) require explicit confirmation
- [ ] One real "code change request" (`/issue "change the Privé base to 30 CHF"`) successfully creates a GitHub issue that we then merge from the laptop

## 13. Estimated cost (per month)

| Item | Cost |
|---|---|
| Vercel Functions | $0 (free tier covers ~10k invocations) |
| Anthropic API (Claude Sonnet 4) | ~$5–15 (depends on usage; Mate is the heaviest user) |
| Telegram Bot API | $0 |
| Supabase | $0 (already paying for the main project) |
| **Total** | **~$5–15 / month** |
