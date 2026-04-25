---
name: cgs-qa
description: Run a complete QA + security + design audit on the CGS Porter mobile PWA and admin panel (deployed to Vercel + connected to Supabase), and fix the issues found. Use when the user says "qa", "verifica la app", "comprueba todo", "test la app", "audit", "check the app", "pasa la qa", "revisa todo", or similar phrasing about validating the production deployment. Does NOT trigger for greenfield design work or pure code refactors — only end-to-end verification of the running CGS Porter system.
---

# CGS Porter — QA & Audit Orchestrator

End-to-end verification suite for the CGS Porter system. Combines four installed skills + project-specific smoke tests, reports findings, and fixes the easy ones automatically.

## Targets

| Surface | Production URL |
|---|---|
| Mobile PWA | https://cgs-porter.vercel.app — alias for the latest `cgs-porter` deployment |
| Admin Panel | https://cgs-porter-admin.vercel.app — alias for the latest `cgs-porter-admin` deployment |
| Supabase | https://ronmmqbqapdxinutxnah.supabase.co |

If aliases don't resolve, fetch the latest production URL with:

```bash
cd "/Users/matetorgvaidze/Desktop/CGS App" && npx vercel ls cgs-porter --prod 2>&1 | grep -oE 'https://[^ ]+\.vercel\.app' | head -1
cd "/Users/matetorgvaidze/Desktop/CGS App/admin" && npx vercel ls cgs-porter-admin --prod 2>&1 | grep -oE 'https://[^ ]+\.vercel\.app' | head -1
```

## Demo credentials (for login flow tests)

- Email: `mate.torgvaidze@cgs-ltd.com` (chef role)
- Password: `CgsPorter2026!`
- 19 porter accounts share the same password — list at `src/data/porters.js`.

## Workflow

Execute steps in order. Stop only on critical failure. After all checks, aggregate findings and propose fixes — auto-apply trivial ones (typos, missing alt text, wrong cache headers), prompt user before non-trivial ones (auth refactors, schema changes).

### 1. Smoke tests (HTTP-level)

Run the project script:

```bash
cd "/Users/matetorgvaidze/Desktop/CGS App"
node scripts/qa-smoke.mjs
```

This script (already in repo) checks: 200 on both URLs, valid PWA manifest, service worker accessible, robots.txt absent or correct, Supabase REST reachable with anon key, no `MODE DÉMO` banner in HTML (would mean env vars not propagated).

### 2. DB integrity + RLS (Supabase)

```bash
cd "/Users/matetorgvaidze/Desktop/CGS App"
node scripts/qa-db.mjs
```

Verifies: row counts > 0 in `users`, `services`, `app_settings`; RLS is enabled on all tables; the `chef` role can read all services; an unauth'd anon read of `services` returns 0 rows (RLS denying as expected).

### 3. Functional UI tests (webapp-testing skill — Playwright)

Invoke the **webapp-testing** skill with this scenario list. It will use Playwright to visit each URL and verify clickability of every interactive element.

For the **mobile PWA**:
- Visit Login screen → toggle between Porteur/Chef → fill form → submit → land on Home.
- On Home → tap "Voir le service" → land on Detail. Back button returns to Services.
- On Detail → green "DÉMARRER" starts timer → red "TERMINER" → status pill turns navy.
- Bag stepper: + and − adjust count; price recomputes; remarques textarea accepts text and shows "✓ Enregistré".
- Tab bar: Accueil/Services/Planning/Profil all reachable; Profil → Se déconnecter returns to Login.
- Empty state: services tab with role having no services renders the inbox illustration.

For the **admin panel**:
- Login with chef credentials → land on Dashboard.
- Dashboard: 4 metric cards render numbers, bar chart + donut visible, both tables populate (top 5 porteurs, last 5 services).
- Services page: table renders ≥20 rows, search filters live, status/source/porter filters reduce results, sort headers reorder the table, pagination next/prev work, "Ajouter service" opens modal, modal accepts and persists a row.
- Employés grid: 20 cards, click one → detail page.
- Planning: stub "À implémenter" message.
- CRM, Rapports, Paramètres: render without console errors.
- Logout returns to /login.

For each broken interaction, capture a screenshot + console errors and report under "Functional bugs".

### 4. Site audit (audit-website skill — squirrelscan)

Invoke `audit-website` against both production URLs (mobile + admin). Categorize findings:

- **CRITICAL**: blocking issues (broken links, JS errors, security headers missing on app routes).
- **HIGH**: SEO essentials (`<title>`, meta description, `viewport`), missing `apple-touch-icon`, no `theme-color`.
- **MEDIUM**: performance (>500 KB images, no compression, missing preload).
- **LOW**: nice-to-haves (Open Graph, Twitter cards).

### 5. Design audit (impeccable skill)

Invoke `impeccable` on representative screens. The two registers map to:
- **product** for the admin panel (utility-first, dashboard).
- **product** for the mobile PWA too (operational tool, not marketing).

Run a critique pass — typography hierarchy, spacing rhythm, color commitment, motion polish, accessibility (contrast, focus rings, hit targets ≥44 px), responsive behavior down to 360 px (mobile) and 1024 px (admin).

### 6. Code-level security (security-review skill)

```
Use the built-in /security-review slash command to audit the diff since the
last release tag. If no tag exists, audit the diff since the initial commit.
```

Pay extra attention to:
- Anything that bypasses Supabase RLS (e.g. service-role key referenced from client code).
- Hardcoded secrets in `src/` or `admin/src/`.
- `dangerouslySetInnerHTML` usage.
- CORS configuration in vercel.json or Supabase.

## Aggregation + remediation

After all six steps, build a single Markdown report grouped by severity:

```
# CGS QA Report — <date>

## ⛔ Critical (n)
- [step] description — file:line — proposed fix

## ⚠️ High (n)
…

## 📋 Medium (n)
…

## ℹ️ Low (n)
…
```

For each Critical/High issue:
1. **Auto-fix** if it's a clear textual change (missing meta tag, typo, wrong cache header, broken import path, missing aria-label).
2. **Propose a patch** if it requires user decision (visual changes, schema migrations, auth flow changes, copy rewrites).

After auto-fixes:
```bash
cd "/Users/matetorgvaidze/Desktop/CGS App"
git add . && git -c user.email="mate.torgvaidze@cgs-ltd.com" -c user.name="Mate Torgvaidze" \
  commit -m "qa: auto-fixes from cgs-qa run on $(date +%Y-%m-%d)" && git push
```

Vercel auto-redeploys both apps within ~30s. Re-run **only step 1** (smoke) after redeploy to confirm the fixes didn't break anything.

## Out of scope

- Performance benchmarks (Lighthouse) — separate task.
- E2E payment flows — no billing in CGS Porter yet.
- Load / stress testing.
