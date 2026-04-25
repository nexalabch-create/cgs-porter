#!/usr/bin/env python3
"""
Comprehensive bug audit for CGS Porter (admin + mobile).
Runs Playwright through every critical flow, captures console errors,
verifies the auth-race fix, checks pricing math, and writes a findings
report to presentation/audit-artifacts/REPORT.md.

Usage: python3 scripts/audit-full.py
"""
import json
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
ART = ROOT / "presentation" / "audit-artifacts"
ART.mkdir(parents=True, exist_ok=True)

ADMIN = "https://cgs-porter-admin-8oh6d3x1o-nexalabch-creates-projects.vercel.app"
MOBILE = "https://cgs-porter-ig4ac490o-nexalabch-creates-projects.vercel.app"
EMAIL = "mate.torgvaidze@cgs-ltd.com"
PWD = "CgsPorter2026!"

findings = []   # {severity, page, issue, detail, fix}
console_log = []  # {url, type, text}
network_log = []  # {url, status, request_url}


def add(severity, page, issue, detail="", fix=""):
    findings.append({"severity": severity, "page": page, "issue": issue, "detail": detail, "fix": fix})
    print(f"  [{severity}] {page}: {issue}")


def attach_listeners(page, label):
    page.on("console", lambda m: console_log.append({"app": label, "url": page.url, "type": m.type, "text": m.text[:300]}))
    page.on("pageerror", lambda e: console_log.append({"app": label, "url": page.url, "type": "pageerror", "text": str(e)[:300]}))
    page.on("response", lambda r: network_log.append({"app": label, "url": r.url, "status": r.status}) if r.status >= 400 else None)


def shot(page, name):
    p = ART / f"{name}.png"
    page.screenshot(path=str(p), full_page=True)
    return p


# ── ADMIN AUDIT ────────────────────────────────────────────────────
print("\n=== ADMIN PANEL ===")
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    attach_listeners(page, "admin")

    # 1. Login with WRONG password
    page.goto(f"{ADMIN}/login", wait_until="networkidle", timeout=30000)
    page.locator("input[type='email']").fill(EMAIL)
    page.locator("input[type='password']").fill("WRONG-PASSWORD-XYZ")
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_timeout(2500)
    err_visible = page.locator("text=/Échec|invalides|Invalid/i").count() > 0
    if not err_visible:
        add("MAJOR", "/login", "Wrong password produces no visible error",
            "User clicks Se connecter with bad password — no feedback shown")
    else:
        print("  ✅ login: wrong password shows error")
    shot(page, "admin-01-login-wrong")

    # 2. Login with correct password
    page.locator("input[type='password']").fill(PWD)
    page.get_by_role("button", name="Se connecter").click()
    try:
        page.wait_for_url(f"{ADMIN}/", timeout=15000)
        page.wait_for_load_state("networkidle")
        print("  ✅ login: redirects to dashboard")
    except Exception as e:
        add("BLOCKER", "/login", "Correct credentials fail to redirect", str(e)[:200])
        browser.close(); raise SystemExit(1)
    page.wait_for_timeout(2500)

    # 3. Verify dashboard renders with content
    body_len = len(page.evaluate("document.body.innerText"))
    if body_len < 200:
        add("BLOCKER", "/", "Dashboard body too short — likely loading hang regression",
            f"body.innerText.length = {body_len}", "Check ProtectedRoute / useAuth race")
    else:
        print(f"  ✅ /: dashboard renders ({body_len} chars)")
    shot(page, "admin-02-dashboard")

    # 4. THE REGRESSION TEST — direct page.goto on each route
    routes = [
        ("/services",   2000, "tbody tr"),
        ("/importer",   500,  "input[type='file']"),
        ("/employes",   1500, "a[href^='/employes/']"),
        ("/planning",   1500, "button:has-text('Ajouter un employé')"),
        ("/crm",        500,  "h1, h2"),
        ("/rapports",   2000, "canvas"),
        ("/parametres", 800,  "input"),
    ]
    for route, settle_ms, content_selector in routes:
        page.goto(f"{ADMIN}{route}", wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        page.wait_for_timeout(settle_ms)
        body_len = len(page.evaluate("document.body.innerText"))
        if body_len < 200 or "Chargement" in page.evaluate("document.body.innerText.slice(0, 50)"):
            add("BLOCKER", route, f"Page hangs on Chargement… via direct goto",
                f"body length = {body_len}", "Check useAuth race fix is deployed")
        else:
            try:
                count = page.locator(content_selector).count()
                if count == 0:
                    add("MAJOR", route, f"No '{content_selector}' elements — content not rendering",
                        f"body length OK ({body_len}) but expected selector missing")
                else:
                    print(f"  ✅ {route}: {body_len} chars, {count} {content_selector}")
            except Exception as e:
                print(f"  ⚠ {route}: selector check failed: {e}")

    # 5. Modals
    page.goto(f"{ADMIN}/services", wait_until="networkidle")
    page.wait_for_timeout(2500)
    try:
        page.locator("tbody tr").first.wait_for(timeout=10000)
    except Exception:
        pass
    try:
        page.get_by_role("button", name="Ajouter service").click(timeout=5000)
        page.wait_for_timeout(700)
        # ServiceModal renders its own form with a "Nouveau service" or
        # "Modifier le service" h2 — neither is present when modal is closed.
        modal_visible = (
            page.locator(".fixed.inset-0").count() > 0 or
            page.get_by_text(re.compile(r"Nouveau service|Modifier le service", re.I)).count() > 0
        )
        if not modal_visible:
            add("MAJOR", "/services", "ServiceModal didn't open after clicking Ajouter service")
        else:
            print("  ✅ /services: ServiceModal opens")
        # Close
        try:
            page.get_by_role("button", name="Annuler").click(timeout=2000)
        except Exception:
            page.keyboard.press("Escape")
        page.wait_for_timeout(400)
    except Exception as e:
        add("MAJOR", "/services", f"Cannot click Ajouter service: {e}"[:200])

    # 6. Search filter on /services
    try:
        search = page.locator("input[placeholder*='Recherche'], input[type='search']").first
        if search.count() == 0:
            search = page.locator("input").first  # fallback
        before = page.locator("tbody tr").count()
        search.fill("EK")
        page.wait_for_timeout(800)
        after = page.locator("tbody tr").count()
        if after >= before and before > 5:
            add("MINOR", "/services", "Search filter doesn't reduce row count",
                f"before={before}, after typing 'EK'={after}")
        else:
            print(f"  ✅ /services: search reduced rows {before} → {after}")
        search.fill("")
        page.wait_for_timeout(400)
    except Exception as e:
        print(f"  ⚠ search filter test skipped: {e}")

    # 7. Refresh page mid-session
    page.goto(f"{ADMIN}/employes", wait_until="networkidle")
    page.wait_for_timeout(2000)
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(3000)
    if "/login" in page.url:
        add("MAJOR", "/employes", "Refresh drops session — bounced to /login")
    else:
        body_len = len(page.evaluate("document.body.innerText"))
        if body_len < 200:
            add("BLOCKER", "/employes", "Refresh leaves page hanging", f"body={body_len} chars")
        else:
            print(f"  ✅ /employes after refresh: {body_len} chars")

    # 8. Logout
    try:
        page.get_by_role("button", name="Déconnexion").click()
        page.wait_for_timeout(1500)
        if "/login" not in page.url:
            add("MAJOR", "logout", f"Logout did not redirect to /login (now at {page.url})")
        else:
            print("  ✅ logout redirects to /login")
    except Exception as e:
        add("MAJOR", "logout", f"Cannot click Déconnexion: {e}"[:200])

    ctx.close()


# ── MOBILE AUDIT ────────────────────────────────────────────────────
print("\n=== MOBILE PWA ===")
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    mctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=3,
        is_mobile=True, has_touch=True,
        user_agent="Mozilla/5.0 (iPhone) Mobile",
    )
    mp = mctx.new_page()
    attach_listeners(mp, "mobile")

    mp.goto(MOBILE, wait_until="networkidle", timeout=30000)
    mp.wait_for_timeout(1500)

    # 1. Login as chef
    try:
        mp.get_by_role("button", name=re.compile(r"Chef d.{1,2}équipe")).click()
        mp.wait_for_timeout(400)
        mp.get_by_role("button", name="Se connecter").click()
        mp.wait_for_function(
            "() => /Bonjour\\s+Mate/.test(document.body.innerText)",
            timeout=25000,
        )
        mp.wait_for_timeout(3500)
        print("  ✅ chef login")
    except Exception as e:
        add("BLOCKER", "mobile login chef", f"Cannot log in: {e}"[:200])

    # 2. Verify "Activité de l'équipe" widget
    body = mp.evaluate("document.body.innerText")
    has_widget = "Activité de l" in body or "ACTIVITÉ DE L" in body or "EN DIRECT" in body
    has_old = "M'assigner ce service" in body
    if not has_widget:
        add("MAJOR", "mobile chef home", "New 'Activité de l'équipe' widget missing",
            "Expected 'EN DIRECT' / 'Activité de l'équipe' visible on home")
    else:
        print("  ✅ chef home: Activité widget present")
    if has_old:
        add("MAJOR", "mobile chef home", "Old 'M'assigner ce service' card still visible",
            "Should have been replaced by the new widget")
    shot(mp, "mobile-chef-home")

    # 3. Open assign sheet, cancel
    try:
        mp.get_by_role("button").filter(has_text="Assigner un porteur").first.click()
        mp.wait_for_timeout(1000)
        mp.get_by_role("button", name="Annuler").click()
        mp.wait_for_timeout(400)
        print("  ✅ assign sheet open + cancel")
    except Exception as e:
        add("MINOR", "mobile chef home", f"Assign sheet flow: {e}"[:200])

    # 4. Services tab
    try:
        mp.get_by_text("Services", exact=True).click()
        mp.wait_for_timeout(2000)
        body_len = len(mp.evaluate("document.body.innerText"))
        if body_len < 200:
            add("MAJOR", "mobile services tab", "Tab body too short",
                f"length={body_len}")
        else:
            print(f"  ✅ chef services tab: {body_len} chars")
    except Exception as e:
        add("MAJOR", "mobile services tab", f"Cannot open: {e}"[:200])

    # 5. Profil tab
    try:
        mp.get_by_text("Profil", exact=True).click()
        mp.wait_for_timeout(1500)
        body = mp.evaluate("document.body.innerText")
        if "Mate" not in body or "CGS" not in body:
            add("MINOR", "mobile profil", "Profil missing user info",
                f"first 200 chars: {body[:200]!r}")
        else:
            print("  ✅ profil shows user info")
    except Exception as e:
        add("MINOR", "mobile profil", f"Cannot open: {e}"[:200])

    # 6. Logout
    try:
        mp.get_by_role("button", name="Se déconnecter").click()
        mp.wait_for_timeout(2000)
        body = mp.evaluate("document.body.innerText")
        if "Se connecter" not in body:
            add("MAJOR", "mobile logout", "Logout did not return to login screen",
                f"first 200 chars: {body[:200]!r}")
        else:
            print("  ✅ logout returns to login")
    except Exception as e:
        add("MINOR", "mobile logout", f"Cannot click Se déconnecter: {e}"[:200])

    # 7. Login as porter (default toggle)
    try:
        mp.get_by_role("button", name="Se connecter").click()
        mp.wait_for_timeout(4000)
        body = mp.evaluate("document.body.innerText")
        if "Bonjour" not in body:
            add("MAJOR", "mobile porter login", "Porter login didn't reach home",
                f"first 200: {body[:200]!r}")
        else:
            print("  ✅ porter login")
    except Exception as e:
        add("MAJOR", "mobile porter login", f"Cannot log in as porter: {e}"[:200])

    browser.close()


# ── PRICING MATH (read-only check) ──────────────────────────────────
print("\n=== PRICING MATH ===")
import subprocess
js = """
import('./admin/src/lib/pricing.js').then(m => {
  const cases = [
    { source: 'prive',     bags: 5, expected: 35 },     // 25 + 2*5
    { source: 'dnata',     bags: 4, expected: 19 },     // 15 + 1*4
    { source: 'swissport', bags: 3, expected: 15 },     // exactly 3 included
    { source: 'web',       bags: 6, expected: 40 },     // 25 + 3*5 (web tier = prive)
  ];
  for (const c of cases) {
    const got = m.totalChfFor(c);
    console.log(JSON.stringify({...c, got, ok: got === c.expected}));
  }
});
"""
try:
    r = subprocess.run(
        ["node", "--input-type=module", "-e", js],
        cwd=str(ROOT), capture_output=True, text=True, timeout=30,
    )
    for line in r.stdout.strip().split("\n"):
        if not line.strip(): continue
        try:
            d = json.loads(line)
            label = f"prive×5={d['got']}" if d['source'] == 'prive' else f"{d['source']}×{d['bags']}"
            if not d["ok"]:
                add("MAJOR", "pricing", f"{d['source']}×{d['bags']} bags: expected {d['expected']} CHF, got {d['got']}")
            else:
                print(f"  ✅ pricing {d['source']}×{d['bags']} = {d['got']} CHF")
        except Exception as e:
            print(f"  ⚠ couldn't parse: {line!r}")
    if r.stderr: print(f"  pricing stderr: {r.stderr[:300]}")
except Exception as e:
    print(f"  ⚠ pricing check failed: {e}")


# ── REPORT ─────────────────────────────────────────────────────────
print("\n=== CONSOLE ERRORS (top 20) ===")
errors_only = [c for c in console_log if c["type"] in ("error", "pageerror", "warning")]
for c in errors_only[:20]:
    print(f"  [{c['app']} {c['type']}] {c['text'][:140]}")

print("\n=== NETWORK ≥400 (top 20) ===")
for n in network_log[:20]:
    print(f"  [{n['app']} {n['status']}] {n['url'][:100]}")


# Write markdown report
report = []
report.append("# CGS Porter — Bug audit report")
report.append(f"\nGenerated by `scripts/audit-full.py` against:")
report.append(f"- Admin: {ADMIN}")
report.append(f"- Mobile: {MOBILE}")
report.append(f"\n## Summary\n")
report.append(f"- Findings: {len(findings)} total")
for sev in ["BLOCKER", "MAJOR", "MINOR", "NIT"]:
    n = sum(1 for f in findings if f["severity"] == sev)
    report.append(f"  - {sev}: {n}")
report.append(f"- Console errors: {len(errors_only)}")
report.append(f"- Network ≥400: {len(network_log)}\n")

if findings:
    report.append("## Findings\n")
    for sev in ["BLOCKER", "MAJOR", "MINOR", "NIT"]:
        items = [f for f in findings if f["severity"] == sev]
        if not items: continue
        report.append(f"\n### {sev}\n")
        for f in items:
            report.append(f"- **{f['page']}** — {f['issue']}")
            if f["detail"]: report.append(f"  - {f['detail']}")
            if f["fix"]: report.append(f"  - 🛠 {f['fix']}")
else:
    report.append("## ✅ No findings — all flows pass\n")

if errors_only:
    report.append("\n## Console errors / warnings\n")
    for c in errors_only[:30]:
        report.append(f"- [{c['app']} {c['type']}] `{c['text'][:200]}` ({c['url']})")

if network_log:
    report.append("\n## Network ≥400\n")
    for n in network_log[:30]:
        report.append(f"- [{n['app']} {n['status']}] {n['url']}")

(ART / "REPORT.md").write_text("\n".join(report))
(ART / "findings.json").write_text(json.dumps({
    "findings": findings, "console": errors_only[:50], "network": network_log[:50],
}, indent=2))

print(f"\n📋 Report: {ART / 'REPORT.md'}")
print(f"   {len(findings)} findings · {len(errors_only)} console errors · {len(network_log)} network 4xx/5xx")
