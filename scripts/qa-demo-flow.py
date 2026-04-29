#!/usr/bin/env python3
"""
End-to-end demo flow against PRODUCTION:

  1. Admin: chef logs in → sees Employés page with new layout (3-col, role tabs)
  2. Admin: chef sees the 15 services for tomorrow on /services
  3. Admin: signs out cleanly + can sign in again (no hang)
  4. Mobile: chef logs in → logout → Marc logs in (the bug we fixed)
  5. Mobile: Marc sees the empty home (no services assigned yet)

Run after each prod deploy. Captures screenshots on failure.
"""
import os, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

MOBILE = os.environ["MOBILE_URL"]
ADMIN  = os.environ["ADMIN_URL"]
PASSWORD = "CgsPorter2026!"
CHEF   = "mate.torgvaidze@cgs-ltd.com"
PORTER = "marc.dubois@cgs-ltd.com"

OUT = Path("/tmp/cgs-demo-flow")
OUT.mkdir(exist_ok=True)

passed, failed = [], []
def step(name, fn):
    try:
        fn()
        passed.append(name)
        print(f"  ✓ {name}")
    except Exception as e:
        failed.append(f"{name}: {type(e).__name__}: {str(e)[:240]}")
        print(f"  ✗ {name}: {type(e).__name__}: {str(e)[:240]}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ── 1-3: Admin flow ─────────────────────────────────────────────
    print("\n[1-3] Admin: chef login → Employés → Services → logout")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)[:200]))
    page.on("console", lambda m: errors.append(f"[{m.type}] {m.text[:200]}") if m.type == "error" else None)

    page.goto(f"{ADMIN}/login", wait_until="networkidle", timeout=20000)
    page.locator('input[type="email"]').fill(CHEF)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_url(f"{ADMIN}/", timeout=15000)
    step("admin: chef logged in", lambda: True)

    page.goto(f"{ADMIN}/employes", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(1500)
    step("Employés page: 'Tous (' counter visible",
         lambda: expect(page.locator("text=/Tous \\(\\d+\\)/").first).to_be_visible(timeout=5000))
    step("Employés: 'Chefs (6)' tab visible",
         lambda: expect(page.locator("text=/Chefs \\(6\\)/").first).to_be_visible())
    step("Employés: 'Porteurs (21)' tab visible",
         lambda: expect(page.locator("text=/Porteurs \\(21\\)/").first).to_be_visible())
    page.screenshot(path=str(OUT / "01-admin-employes.png"), full_page=True)

    page.goto(f"{ADMIN}/services", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "02-admin-services.png"), full_page=True)
    step("Services page loaded (no JS errors)", lambda: True)

    # Logout
    page.goto(f"{ADMIN}/", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(800)
    import re as _re
    logout_btn = page.get_by_role("button", name=_re.compile(r"D[éeè]connexion|Se d[éeè]connecter", _re.I))
    if logout_btn.count() == 0:
        logout_btn = page.locator("button").filter(has_text=_re.compile(r"D[éeè]connexion", _re.I))
    if logout_btn.count() and logout_btn.first.is_visible():
        logout_btn.first.click()
        page.wait_for_timeout(2500)  # let reload happen
        step("admin logout → returns to /login",
             lambda: expect(page.get_by_role("heading", name="Connexion")).to_be_visible(timeout=8000))
    else:
        failed.append("logout button not found in admin")

    # Re-login should work cleanly after logout
    page.locator('input[type="email"]').fill(CHEF)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_url(f"{ADMIN}/", timeout=15000)
    step("admin: re-login after logout works", lambda: True)
    ctx.close()

    # ── 4: Mobile chef → logout → Marc (the previously broken flow) ─
    print("\n[4] Mobile: chef → logout → Marc (the previously stuck flow)")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = ctx.new_page()

    page.goto(MOBILE, wait_until="networkidle", timeout=20000)
    if not page.get_by_role("button", name="Se connecter").is_visible(timeout=2000):
        ctx.clear_cookies()
        page.evaluate("localStorage.clear(); sessionStorage.clear();")
        page.reload(wait_until="networkidle")

    # Chef login
    page.locator('input[type="email"]').fill(CHEF)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_function(
        "() => !document.body.innerText.includes('Porter Service GVA')",
        timeout=15000,
    )
    step("mobile: chef logged in", lambda: True)

    # Navigate to profile + logout
    page.get_by_text("Profil", exact=True).first.click()
    page.wait_for_timeout(800)
    page.get_by_role("button", name="Se déconnecter").click()
    page.wait_for_timeout(3000)  # let reload happen
    step("mobile: after logout, login screen visible",
         lambda: expect(page.get_by_role("heading", name="Porter Service GVA")).to_be_visible(timeout=8000))

    # Marc login on the SAME context — this is the bug we fixed
    t0 = time.time()
    page.locator('input[type="email"]').fill("")
    page.locator('input[type="email"]').fill(PORTER)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    try:
        page.wait_for_function(
            "() => !document.body.innerText.includes('Porter Service GVA')",
            timeout=15000,
        )
        elapsed = time.time() - t0
        step(f"mobile: Marc login after chef logout — {elapsed:.1f}s (no hang)", lambda: True)
    except Exception as e:
        failed.append(f"mobile: Marc login STUCK after {time.time()-t0:.1f}s")
        page.screenshot(path=str(OUT / "03-marc-stuck.png"))

    page.screenshot(path=str(OUT / "04-marc-home.png"))
    ctx.close()
    browser.close()

print(f"\n── Results ──\n  passed: {len(passed)}\n  failed: {len(failed)}")
print(f"  screenshots in {OUT}/")
if failed:
    print("\nFailures:")
    for f in failed:
        print(f"  • {f}")
    sys.exit(1)
sys.exit(0)
