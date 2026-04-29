#!/usr/bin/env python3
"""Reproduce: Marc→logout→Marc relogin bug, AND chef→assign→Marc-notif flow."""
import os, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ADMIN  = os.environ["ADMIN_URL"]
MOBILE = os.environ["MOBILE_URL"]
PASSWORD = "CgsPorter2026!"
CHEF   = "mate.torgvaidze@cgs-ltd.com"
PORTER = "marc.dubois@cgs-ltd.com"

OUT = Path("/tmp/cgs-marc-test"); OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ── Phase A: Marc → logout → Marc relogin ───────────────────────
    print("\n[A] Marc → logout → Marc relogin (same context)")
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)[:200]))
    page.on("console", lambda m: errs.append(f"[{m.type}] {m.text[:200]}") if m.type == "error" else None)

    page.goto(MOBILE, wait_until="networkidle", timeout=20000)
    if not page.get_by_role("button", name="Se connecter").is_visible(timeout=2000):
        ctx.clear_cookies()
        page.evaluate("localStorage.clear(); sessionStorage.clear();")
        page.reload(wait_until="networkidle")

    # First login
    page.locator('input[type="email"]').fill("")
    page.locator('input[type="email"]').fill(PORTER)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    try:
        page.wait_for_function("() => !document.body.innerText.includes('Porter Service GVA')", timeout=15000)
        print("  ✓ Marc 1st login OK")
    except Exception as e:
        print(f"  ✗ Marc 1st login FAILED: {e}")
        page.screenshot(path=str(OUT / "A1-fail.png"))

    # Logout via Profile → Se déconnecter
    page.get_by_text("Profil", exact=True).first.click()
    page.wait_for_timeout(800)
    page.get_by_role("button", name="Se déconnecter").click()
    page.wait_for_timeout(3000)  # let reload happen
    print(f"  • after logout url: {page.url}")

    # Marc relogin (the bug)
    t0 = time.time()
    page.locator('input[type="email"]').fill("")
    page.locator('input[type="email"]').fill(PORTER)
    page.locator('input[type="password"]').fill("")
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    try:
        page.wait_for_function("() => !document.body.innerText.includes('Porter Service GVA')", timeout=18000)
        print(f"  ✓ Marc 2nd login OK in {time.time()-t0:.1f}s")
    except Exception as e:
        print(f"  ✗ Marc 2nd login STUCK after {time.time()-t0:.1f}s")
        page.screenshot(path=str(OUT / "A2-marc-relogin-fail.png"))

    ctx.close()

    # ── Phase B: chef assigns Marc → notification arrives ───────────
    print("\n[B] Chef assigns Marc → does Marc receive a notification?")

    # Open TWO contexts: chef's admin + Marc's mobile
    chef_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    chef_page = chef_ctx.new_page()
    chef_page.goto(f"{ADMIN}/login", wait_until="networkidle", timeout=20000)
    chef_page.locator('input[type="email"]').fill(CHEF)
    chef_page.locator('input[type="password"]').fill(PASSWORD)
    chef_page.get_by_role("button", name="Se connecter").click()
    chef_page.wait_for_url(f"{ADMIN}/", timeout=15000)
    chef_page.goto(f"{ADMIN}/services", wait_until="networkidle", timeout=15000)
    chef_page.wait_for_timeout(2000)
    chef_page.screenshot(path=str(OUT / "B1-chef-services.png"), full_page=True)

    marc_ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    marc_page = marc_ctx.new_page()
    marc_logs = []
    marc_page.on("console", lambda m: marc_logs.append(f"[{m.type}] {m.text[:200]}"))
    marc_page.on("pageerror", lambda e: marc_logs.append(f"[err] {str(e)[:200]}"))
    marc_page.goto(MOBILE, wait_until="networkidle", timeout=20000)
    if not marc_page.get_by_role("button", name="Se connecter").is_visible(timeout=2000):
        marc_ctx.clear_cookies()
        marc_page.evaluate("localStorage.clear(); sessionStorage.clear();")
        marc_page.reload(wait_until="networkidle")
    marc_page.locator('input[type="email"]').fill("")
    marc_page.locator('input[type="email"]').fill(PORTER)
    marc_page.locator('input[type="password"]').fill(PASSWORD)
    marc_page.get_by_role("button", name="Se connecter").click()
    marc_page.wait_for_function("() => !document.body.innerText.includes('Porter Service GVA')", timeout=15000)
    marc_page.wait_for_timeout(2000)
    print("  ✓ Marc logged in, watching for notifications")
    marc_page.screenshot(path=str(OUT / "B2-marc-home-before.png"))

    # Chef finds first unassigned service and assigns to Marc
    # Use the assign button on the services row.
    chef_page.bring_to_front()
    # Try clicking first "Assigner" link/button
    import re as _re
    assign_btns = chef_page.locator("button, a").filter(has_text=_re.compile(r"Assigner|Non-assigné", _re.I))
    print(f"  • candidate assign elements: {assign_btns.count()}")
    chef_page.screenshot(path=str(OUT / "B3-chef-services-before-assign.png"))

    # Find the row text with "EK455" and click its assign action
    ek455_row = chef_page.locator("tr").filter(has_text="EK455")
    if ek455_row.count():
        # Click the row to open detail/edit
        ek455_row.first.click()
        chef_page.wait_for_timeout(1500)
        chef_page.screenshot(path=str(OUT / "B4-chef-after-row-click.png"))
        # Look for "Assigner" or "Modifier" or the edit pencil icon
        edit_icons = chef_page.locator("button[aria-label*='dit' i], svg[class*='pencil']").all()
        print(f"  • edit icons found: {len(edit_icons)}")

    chef_ctx.close()

    # Check notifications in DB
    marc_page.wait_for_timeout(3000)
    marc_page.screenshot(path=str(OUT / "B5-marc-home-after.png"))

    # Print Marc's console for any realtime / notif messages
    print(f"\n  Marc's console ({len(marc_logs)} entries):")
    for l in marc_logs[-15:]:
        print(f"    {l}")
    marc_ctx.close()
    browser.close()
print(f"\nScreenshots in {OUT}/")
