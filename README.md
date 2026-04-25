# CGS Porter Service

Mobile PWA + admin panel for **CGS — Carrying Geneva Services**, the airport porter service at Genève Aéroport (GVA).

## Apps

| | URL | Stack |
|---|---|---|
| 📱 Mobile PWA (porters + chefs) | https://cgs-porter-7fiqw5t2c-nexalabch-creates-projects.vercel.app | Vite + React + vite-plugin-pwa + Supabase |
| 🖥 Admin Panel (chefs only) | https://cgs-porter-admin-qu0xamot1-nexalabch-creates-projects.vercel.app | Vite + React + Tailwind + Chart.js + Supabase |

## Repo layout

```
.
├── src/                       # mobile app source
├── public/                    # mobile app assets (logo, PWA icons, manifest)
├── admin/                     # admin panel — separate Vite project
│   ├── src/
│   └── public/
├── supabase/
│   ├── migrations/            # SQL schema migrations applied via Management API
│   └── seed.sql
└── scripts/
    ├── run-sql.mjs            # apply any SQL file to the linked Supabase project
    └── seed-supabase.mjs      # create auth users + demo services (idempotent)
```

## Local development

```bash
# Mobile
npm install
npm run dev              # → http://localhost:5173

# Admin
cd admin
npm install
npm run dev              # → http://localhost:5174
```

Both read `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` from `.env.local` and fall back to demo data if absent.

## Deployment

Auto-deploys to Vercel on every `git push origin main`:
- Root → `cgs-porter` Vercel project
- `admin/` → `cgs-porter-admin` Vercel project (rootDirectory configured)

## Supabase schema management

```bash
# Apply a new migration
node scripts/run-sql.mjs supabase/migrations/0003_xxx.sql

# Re-seed demo data (safe to re-run)
node scripts/seed-supabase.mjs
```
