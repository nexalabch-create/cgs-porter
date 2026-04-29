#!/usr/bin/env python3
"""
Full end-to-end: chef opens admin → assigns one service to Marc →
Marc's mobile receives a `service_assigned` notification (urgent toast +
bell badge bumps) within a few seconds via realtime.

Two browser contexts run in parallel: one for chef (desktop), one for Marc
(iPhone viewport). We screenshot Marc's mobile every second after the chef
clicks "Enregistrer" to capture the toast as it pops in.
"""
import os, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ADMIN  = os.environ["ADMIN_URL"]
MOBILE = os.environ["MOBILE_URL"]
PASSWORD = "CgsPorter2026!"
CHEF   = "mate.torgvaidze@cgs-ltd.com"
PORTER = "marc.dubois@cgs-ltd.com"

OUT = Path("/tmp/cgs-assign-notif"); OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ── Marc's mobile, ready to receive ─────────────────────────────
    print("\n[1] Marc logs in on mobile + parks on Home")
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
    print("  ✓ Marc on home")
    marc_page.screenshot(path=str(OUT / "01-marc-before.png"))

    # ── Chef admin, opens services + assigns first row ──────────────
    print("\n[2] Chef opens admin + assigns first service to Marc")
    chef_ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    chef_page = chef_ctx.new_page()
    chef_page.goto(f"{ADMIN}/login", wait_until="networkidle", timeout=20000)
    chef_page.locator('input[type="email"]').fill(CHEF)
    chef_page.locator('input[type="password"]').fill(PASSWORD)
    chef_page.get_by_role("button", name="Se connecter").click()
    chef_page.wait_for_url(f"{ADMIN}/", timeout=15000)
    chef_page.goto(f"{ADMIN}/services", wait_until="networkidle", timeout=15000)
    chef_page.wait_for_timeout(2000)
    chef_page.screenshot(path=str(OUT / "02-chef-services.png"), full_page=True)

    # First row's pencil-edit button (lucide pencil icon)
    edit_btn = chef_page.locator("tbody tr").first.locator("button").first
    edit_btn.click()
    chef_page.wait_for_timeout(800)
    chef_page.screenshot(path=str(OUT / "03-chef-modal.png"), full_page=True)

    # The assigned_porter_id select. Pick Marc by his option value (his uuid)
    # or by the visible text containing "Dubois".
    select = chef_page.locator("select").last  # status / porter selects
    # Try by label match
    selects = chef_page.locator("select")
    print(f"  • selects found: {selects.count()}")
    matched = False
    for i in range(selects.count()):
        s = selects.nth(i)
        opts = s.locator("option").all_text_contents()
        if any("Dubois" in o or "Marc" in o for o in opts):
            for opt in opts:
                if "Dubois" in opt or "Marc" in opt:
                    s.select_option(label=opt)
                    matched = True
                    print(f"  ✓ selected porter via option: {opt!r}")
                    break
        if matched: break
    if not matched:
        print("  ✗ couldn't find Marc in any select")
    chef_page.wait_for_timeout(500)

    # Click "Enregistrer" button
    import re as _re
    save_btn = chef_page.get_by_role("button", name=_re.compile(r"Enregistrer|Sauvegarder|Save", _re.I))
    if save_btn.count():
        save_btn.first.click()
        print("  ✓ clicked Enregistrer")
    else:
        print("  ✗ no Enregistrer button found")
        chef_page.screenshot(path=str(OUT / "03b-no-save.png"), full_page=True)

    chef_page.wait_for_timeout(1500)
    chef_page.screenshot(path=str(OUT / "04-chef-after-save.png"), full_page=True)

    # ── Watch Marc's mobile for the toast ───────────────────────────
    print("\n[3] Watching Marc's mobile for urgent toast...")
    saw_toast = False
    for i in range(8):
        marc_page.wait_for_timeout(1000)
        body_text = marc_page.locator("body").inner_text()
        if "Nouveau service" in body_text:
            saw_toast = True
            print(f"  ✓ Marc saw the toast after {i+1}s")
            marc_page.screenshot(path=str(OUT / f"05-marc-toast-t{i+1}.png"))
            break
    if not saw_toast:
        marc_page.screenshot(path=str(OUT / "05-marc-no-toast.png"))
        print("  ✗ Marc did NOT see the toast within 8s")

    # Final state
    marc_page.wait_for_timeout(500)
    marc_page.screenshot(path=str(OUT / "06-marc-final.png"))

    chef_ctx.close()
    marc_ctx.close()
    browser.close()

print(f"\nScreenshots: {OUT}/")
