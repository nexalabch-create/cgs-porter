#!/usr/bin/env python3
"""
Reproduces the two bugs Mate reported on 2026-04-29:

  1) Employés page in admin renders the porter list with broken styling /
     unreadable text.
  2) On the same mobile device, after a chef logs out, attempting to log in
     as Marc gets stuck and never enters the app.

We run against the LIVE production URLs and capture screenshots + console
errors so we can pinpoint the exact failure mode before patching.
"""
import os, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

MOBILE = os.environ.get("MOBILE_URL", "https://cgs-porter-5n7qrl184-nexalabch-creates-projects.vercel.app")
ADMIN  = os.environ.get("ADMIN_URL",  "https://cgs-porter-admin-fu16yihfo-nexalabch-creates-projects.vercel.app")
PASSWORD = "CgsPorter2026!"
CHEF = "mate.torgvaidze@cgs-ltd.com"
PORTER = "marc.dubois@cgs-ltd.com"

OUT = Path("/tmp/cgs-bug-repro")
OUT.mkdir(exist_ok=True)

console_errors = []

def log_console(msg):
    if msg.type in ("error", "warning"):
        console_errors.append(f"[{msg.type}] {msg.text[:300]}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ── Bug 1: Admin Employés page rendering ────────────────────────
    print("\n[BUG 1] Admin Employés page rendering")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.on("console", log_console)
    page.on("pageerror", lambda e: console_errors.append(f"[pageerror] {str(e)[:300]}"))

    page.goto(f"{ADMIN}/login", wait_until="networkidle", timeout=20000)
    page.locator('input[type="email"]').fill(CHEF)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_url(f"{ADMIN}/", timeout=15000)
    print("  ✓ logged in as chef")

    page.goto(f"{ADMIN}/employes", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(2000)  # let lists render
    page.screenshot(path=str(OUT / "01-employes-default.png"), full_page=True)
    print(f"  ✓ employés page screenshot: {OUT}/01-employes-default.png")

    # Count cards + log card text content
    cards = page.locator('a[href^="/employes/"]')
    count = cards.count()
    print(f"  • {count} cards rendered")
    if count > 0:
        first_text = cards.first.inner_text()
        print(f"  • first card text: {first_text!r}")
    if console_errors:
        print(f"  • {len(console_errors)} console messages")
        for e in console_errors[:5]:
            print(f"    {e}")
    ctx.close()

    # ── Bug 2: Mobile chef→logout→Marc login stuck ──────────────────
    print("\n[BUG 2] Mobile chef → logout → Marc login (same context)")
    console_errors.clear()
    ctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
    )
    page = ctx.new_page()
    page.on("console", log_console)
    page.on("pageerror", lambda e: console_errors.append(f"[pageerror] {str(e)[:300]}"))

    # Login as chef
    page.goto(MOBILE, wait_until="networkidle", timeout=20000)
    page.locator('input[type="email"]').fill("")
    page.locator('input[type="email"]').fill(CHEF)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    try:
        page.wait_for_function(
            "() => !document.body.innerText.includes('Porter Service GVA')",
            timeout=15000,
        )
        print("  ✓ chef login succeeded")
    except Exception as e:
        print(f"  ✗ chef login: {e}")
        page.screenshot(path=str(OUT / "02a-chef-login-fail.png"))

    page.screenshot(path=str(OUT / "02b-chef-home.png"))

    # Navigate to profile + logout
    profile_btn = page.get_by_text("Profil", exact=True).first
    if profile_btn.is_visible():
        profile_btn.click()
        page.wait_for_timeout(800)
    logout_btn = page.get_by_role("button", name="Se déconnecter")
    if logout_btn.is_visible():
        logout_btn.click()
        page.wait_for_timeout(2000)
        print("  ✓ chef logged out")
    else:
        print("  ✗ logout button not found")
    page.screenshot(path=str(OUT / "02c-after-logout.png"))

    # Now try to log in as Marc on the SAME context
    t0 = time.time()
    page.locator('input[type="email"]').fill("")
    page.locator('input[type="email"]').fill(PORTER)
    page.locator('input[type="password"]').fill("")
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    print("  • clicked Se connecter as Marc, observing for 20s...")

    stuck = True
    for i in range(40):
        time.sleep(0.5)
        if not page.get_by_role("heading", name="Porter Service GVA").is_visible(timeout=200):
            stuck = False
            print(f"  ✓ Marc login succeeded in {time.time()-t0:.1f}s")
            break
    if stuck:
        print(f"  ✗ STUCK — Marc login screen still visible after {time.time()-t0:.1f}s")
    page.screenshot(path=str(OUT / "02d-marc-login-attempt.png"))

    # Capture the button state — is it stuck on "Connexion…"?
    btn_text = page.get_by_role("button", name=lambda n: "Connexion" in n or "Se connecter" in n).first.inner_text() if page.locator("button").count() else "?"
    print(f"  • button text after click: {btn_text!r}")
    error_visible = page.locator('[role="alert"]').is_visible()
    if error_visible:
        print(f"  • error banner: {page.locator('[role=alert]').first.inner_text()!r}")

    if console_errors:
        print(f"  • {len(console_errors)} console messages:")
        for e in console_errors[:10]:
            print(f"    {e}")
    ctx.close()
    browser.close()

print(f"\nScreenshots in {OUT}/")
print(f"Total console errors captured: {len(console_errors)}")
