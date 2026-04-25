#!/usr/bin/env python3
"""
Recovery captures: re-do admin-03 (Services) + admin-12 (CRM) +
admin-13 (Rapports) + admin-14 (Paramètres) using SPA navigation
(click sidebar links) — page.goto causes ProtectedRoute to hang in
'loading' on this Vercel deploy, so we navigate within the same React
tree to preserve auth state.
"""
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ADMIN_URL = "https://cgs-porter-admin-fh0n2entl-nexalabch-creates-projects.vercel.app"
PASSWORD = "CgsPorter2026!"

OUT = Path(__file__).resolve().parent.parent / "presentation" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
print(f"\n→ Saving to: {OUT}\n")


def shot(page, name):
    p = OUT / name
    page.screenshot(path=str(p), full_page=True)
    sz = p.stat().st_size // 1024
    flag = "  ⚠ TINY" if sz < 50 else ""
    print(f"  📸 {name} ({sz} KB){flag}")


def click_nav(page, label):
    """Click a sidebar nav link — falls back to keyboard Escape if a modal blocks."""
    try:
        page.locator(f"aside a:has-text('{label}')").first.click(timeout=3000)
    except Exception:
        page.keyboard.press("Escape")
        page.wait_for_timeout(400)
        page.locator(f"aside a:has-text('{label}')").first.click()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
    page = ctx.new_page()

    page.goto(f"{ADMIN_URL}/login", wait_until="networkidle", timeout=30000)
    page.locator("input[type='password']").fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_url(f"{ADMIN_URL}/", timeout=20000)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3500)
    print(f"  ✓ logged in (dashboard body length: {len(page.evaluate('document.body.innerText'))})")

    # 03 — Services list (click sidebar Services)
    click_nav(page, "Services")
    page.wait_for_timeout(1500)
    try:
        page.wait_for_function(
            "() => document.querySelectorAll('tbody tr').length >= 10",
            timeout=15000,
        )
    except Exception as e:
        print(f"  ⚠ services rows wait: {e}")
    page.wait_for_timeout(1500)
    shot(page, "admin-03-services-list.png")

    # 12 — CRM
    click_nav(page, "CRM")
    page.wait_for_timeout(2500)
    shot(page, "admin-12-crm.png")

    # 13 — Rapports
    click_nav(page, "Rapports")
    page.wait_for_timeout(1000)
    try:
        page.wait_for_function(
            "() => document.querySelectorAll('canvas').length >= 1",
            timeout=15000,
        )
    except Exception as e:
        print(f"  ⚠ rapports canvas wait: {e}")
    page.wait_for_timeout(3500)
    shot(page, "admin-13-rapports.png")

    # 14 — Paramètres
    click_nav(page, "Paramètres")
    page.wait_for_timeout(1000)
    try:
        page.wait_for_function(
            "() => Array.from(document.querySelectorAll('input')).some(i => i.value && i.value.length > 0)",
            timeout=15000,
        )
    except Exception as e:
        print(f"  ⚠ parametres input wait: {e}")
    page.wait_for_timeout(1500)
    shot(page, "admin-14-parametres.png")

    browser.close()

print(f"\n→ Final state of presentation/screenshots/:\n")
for f in sorted(OUT.glob('*.png')):
    sz = f.stat().st_size // 1024
    flag = " ⚠ TINY" if sz < 50 else ""
    print(f"  • {f.name}: {sz} KB{flag}")
