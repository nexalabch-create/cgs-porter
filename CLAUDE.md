# CGS Porter — project memory for Claude

> Notes for future Claude Code sessions in this repo. Read top-to-bottom on session start.

## What this is

CGS Porter Service — mobile PWA + admin panel for the airport porter team at Geneva Airport (GVA). Owner: **Mate Torgvaidze** (`mate.torgvaidze@cgs-ltd.com`), team-leader at CGS, building this himself + presenting to his superiors.

## Repo layout

```
CGS App/
├── src/                       # mobile PWA (Vite + React + vite-plugin-pwa)
├── public/                    # mobile static assets (logo, icons, manifest)
├── admin/                     # admin panel — separate Vite + React + Tailwind project
│   ├── src/
│   ├── public/templates/      # demo CSVs for the Importer page
│   └── vercel.json            # rootDirectory=admin in Vercel project
├── supabase/
│   ├── migrations/            # 0001..0006 — applied via scripts/run-sql.mjs (Management API)
│   └── seed.sql               # legacy, not used since 0002+
├── scripts/
│   ├── run-sql.mjs            # apply any SQL file via PAT-authenticated Management API
│   ├── seed-real-roster.mjs   # seed the 24 real CGS employees
│   ├── promote-chefs.mjs      # one-off: promote the 6 chefs
│   ├── wipe-demo.mjs          # nuclear wipe of services + auth users
│   ├── demo-reset.mjs         # the 1-command demo prep (clean + optional pre-load)
│   ├── qa-smoke.mjs           # HTTP smoke tests against prod URLs
│   ├── qa-db.mjs              # Supabase integrity checks
│   ├── qa-admin-e2e.py        # Playwright admin E2E (37 scenarios)
│   ├── qa-mobile-e2e.py       # Playwright mobile E2E (20 scenarios)
│   ├── qa-importer-demo.py    # E2E for the CSV importer flow
│   └── qa-planning-demo.py    # E2E for Planning + Mon équipe
├── DEMO-SCRIPT.md             # 6-act guión for the live demo to superiors
├── README.md
└── .claude/skills/            # cgs-qa + 3 installed skills (webapp-testing, audit-website, impeccable, vercel-react-best-practices, frontend-design, supabase-postgres-best-practices, find-skills)
```

## Production URLs

> The mobile + admin URLs change on every git push because Vercel uses deployment-hash domains. Use `scripts/qa-smoke.mjs` or `npx vercel ls cgs-porter --prod` to look up the latest. The aliases below are the most-recent stable references.

| App | URL |
|---|---|
| Mobile PWA | `https://cgs-porter-n6tphvr8b-nexalabch-creates-projects.vercel.app` |
| Admin Panel | `https://cgs-porter-admin-fprcjrq4z-nexalabch-creates-projects.vercel.app` |
| Supabase | `https://ronmmqbqapdxinutxnah.supabase.co` |

GitHub: https://github.com/nexalabch-create/cgs-porter (private; user `absolut888034` is collaborator).
Vercel team: `nexalabch-creates-projects`. Two projects: `cgs-porter` (root) + `cgs-porter-admin` (rootDirectory=admin). Both auto-deploy on push to `main`.

## Real users (24 total)

- **6 chefs** (can log in to admin):
  - Mate Torgvaidze (evening, CO2)
  - Andrei Serban (evening — "Andrey")
  - Dercio Veloso (evening, new account)
  - Mohamed Afak Dadi (morning — called "Aftak")
  - Khalid El Ghazouani (morning)
  - Safet Filipova (morning, new account)
- **20 porters** (mobile only) — see `scripts/seed-real-roster.mjs` for the full list with CGS payroll IDs.
- **Universal demo password**: `CgsPorter2026!`. Email = `firstname.lastname@cgs-ltd.com`, lowercased + diacritics stripped + spaces → dots.

## Schema highlights

- `public.users` — extends `auth.users` 1:1, with `role enum('chef','porter')`, `cgs_employee_id`, generated `initials` column.
- `public.services` — daily porter jobs. Source enum: `web | dnata | swissport | prive | guichet`. `service_num` (smallint) is the daily-sheet ordinal.
- `public.shifts` — one row per (user, date) with `code` (`^[A-Z]{2,3}[0-9]{1,3}$` like CQ1, CO2, TR13), `starts_at`, `ends_at`, `pause_minutes`. Composite unique on (user_id, shift_date).
- `public.app_settings` — singleton id=1 with company info + tariffs (`dnata_swissport_base_chf=15 / extra=4`, `prive_base_chf=25 / extra=5`, `bags_included_in_base=3`).
- `public.clients` — empty CRM table for future use; admin /crm currently aggregates from services.
- **RLS enabled on all tables.** Porters read only their own `users` row + their assigned services. Chefs read everything (via the `current_role()` security-definer helper).
- **`demo_login(p_email)` RPC** — security-definer function that lets the **anon** key resolve a demo email → `users` row. Used by the mobile Login screen to bridge the role-toggle UX onto a real auth session (`signInWithPassword` is called right after with the universal demo password).

### Pricing helpers — single source of truth

`admin/src/lib/pricing.js` and `src/lib/pricing.js` (mirror) both export:
- `totalChfFor({ source, bags })` — tier-based, per-source.
- `priceBreakdown({ source, bags })` — human-readable preview string.
- `DEFAULT_TARIFF` — { dnata_swissport_base=15, extra=4, prive_base=25, extra=5, included=3 }.

**Never inline pricing math anywhere else.** `admin/src/lib/format.js` `totalChf()` re-exports the helper for backward compat.

## Demo workflow

Demo on **~2026-05-01** (six days from session of 2026-04-25). Owner uses [DEMO-SCRIPT.md](DEMO-SCRIPT.md) as the 6-act guión for his superiors.

Quickest pre-demo prep (single Terminal command):

```bash
cd "/Users/matetorgvaidze/Desktop/CGS App"
node scripts/demo-reset.mjs            # clean slate (keeps users + settings)
node scripts/demo-reset.mjs --full     # also pre-loads 17 shifts + 22 services with today's date
```

## Conventions

- **Don't leave `npm run dev` background processes running between sessions.** They eat RAM (~400 MB combined for both apps) and block ports 5173/5174 next time. If you need them, start fresh — it's literally `cd ... && npm run dev`.
- **Don't commit secrets.** `.env.local` (root + admin/) is gitignored and contains: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (publishable), SUPABASE_PROJECT_REF, SUPABASE_PERSONAL_ACCESS_TOKEN, SUPABASE_SERVICE_ROLE_KEY.
- **Migrations are applied via Management API**, not via CLI. Pattern: write `supabase/migrations/000N_*.sql`, then `node scripts/run-sql.mjs supabase/migrations/000N_*.sql`. Postgres rejects `alter type ... add value` inside transactions if you try to wrap; the Management API runs each top-level statement separately so it works.
- **Vercel auto-deploys on push to main.** Both projects (`cgs-porter` + `cgs-porter-admin`) are linked to the GitHub repo. Production env vars live in Vercel dashboard, not in repo.
- **Vercel SSO/Authentication is OFF** for both projects (we disabled it via API). The deployments are public.
- **Mobile login is a role toggle** [Porteur | Chef d'équipe], **not a real password input**. Behind the scenes it calls `supabase.auth.signInWithPassword(demo_email, 'CgsPorter2026!')`. Replace with a proper password screen before going to production for real porters.
- **The CSV importer is the heart of the demo.** Two templates ship in `admin/public/templates/`: `services-2026-03-01.csv` (22 real services) + `roster-2026-03-01.csv` (17 real shifts).

## Outstanding TODOs

- 🔐 **Rotate credentials** — the PAT (`sbp_…`), service-role JWT, and original DB password were pasted in chat on 2026-04-25. Settings → Database → Reset password + Settings → API → Roll JWT secret + Profile → Access Tokens → Revoke.
- 📅 **Calendar-grid view** for the admin Planning page (currently list per day).
- 📲 **Real auth on mobile** — replace the role toggle with email + password.
- 📄 **PDF roster parser** — admin Planning page already takes CSV; a PDF parser for the actual paper roster would be a big quality-of-life upgrade.
- 📊 **PDF / Excel exports** in Rapports — currently stubbed buttons.
- 🔔 **Push notifications** when chef assigns a service to a porter.
- 🧹 **`.env.local` rotation pipeline** so we don't keep credentials in chat history.

## Useful one-liners

```bash
# What's the latest deployed mobile URL right now?
npx vercel ls cgs-porter --prod | grep -oE 'https://[^ ]+vercel.app' | head -1

# What are the latest deployed admin URL?
(cd admin && npx vercel ls cgs-porter-admin --prod | grep -oE 'https://[^ ]+vercel.app' | head -1)

# Run a quick smoke test against prod
node scripts/qa-smoke.mjs

# Apply a new migration
node scripts/run-sql.mjs supabase/migrations/0007_*.sql

# Free up dev-server ports if stuck
lsof -ti :5173 :5174 | xargs -r kill -9
```
