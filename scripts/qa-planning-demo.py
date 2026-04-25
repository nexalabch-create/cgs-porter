#!/usr/bin/env python3
"""End-to-end: chef imports roster on /planning → mobile chef home shows team."""
import os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ADMIN_URL = os.environ.get("CGS_ADMIN_URL", "https://cgs-porter-admin-fzgx31eml-nexalabch-creates-projects.vercel.app")
MOBILE_URL = os.environ.get("CGS_MOBILE_URL", "https://cgs-porter-mlr8uwlbr-nexalabch-creates-projects.vercel.app")
EMAIL = "mate.torgvaidze@cgs-ltd.com"
PASSWORD = "CgsPorter2026!"

OUT = Path("/tmp/cgs-planning-demo"); OUT.mkdir(exist_ok=True)
passed, failed = [], []

def step(name, fn):
    try: fn(); passed.append(name); print(f"  ✓ {name}")
    except Exception as e:
        msg = f"{name}: {type(e).__name__}: {str(e)[:200]}"
        failed.append(msg); print(f"  ✗ {msg}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ── Admin: import roster for today ──────────────────────────────
    print("\n1) Admin · login + go to Planning")
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    page = ctx.new_page()
    page.goto(f"{ADMIN_URL}/login", wait_until="networkidle", timeout=30000)
    page.locator("input[type='password']").fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_url(f"{ADMIN_URL}/", timeout=15000)
    page.wait_for_load_state("networkidle")

    page.get_by_role("link", name="Planning").click()
    page.wait_for_url(f"{ADMIN_URL}/planning", timeout=10000)
    page.wait_for_load_state("networkidle")
    step("Planning page renders", lambda: expect(page.get_by_text("Aujourd'hui").first).to_be_visible(timeout=5000))
    page.screenshot(path=str(OUT / "01-planning-empty.png"), full_page=True)

    print("\n2) Open import modal")
    page.get_by_role("button", name="Importer CSV roster").click()
    page.wait_for_timeout(400)
    step("Modal open", lambda: expect(page.get_by_text("Charger jeu démo").first).to_be_visible(timeout=5000))
    page.screenshot(path=str(OUT / "02-import-modal.png"), full_page=True)

    print("\n3) Click 'Charger jeu démo'")
    page.get_by_role("button", name="Charger jeu démo (roster 01/03/2026)").click()
    page.wait_for_timeout(1000)
    step("Preview rows visible", lambda: expect(page.get_by_text("matched").first).to_be_visible(timeout=5000))
    page.screenshot(path=str(OUT / "03-preview.png"), full_page=True)

    print("\n4) Import shifts")
    import_btn = page.locator("button:has-text('Importer')").filter(has_text="shifts").first
    import_btn.click()
    page.wait_for_timeout(2500)
    page.wait_for_load_state("networkidle")
    page.screenshot(path=str(OUT / "04-after-import.png"), full_page=True)

    # Wait for table to populate
    page.wait_for_timeout(2000)
    page.locator("tbody tr").first.wait_for(state="visible", timeout=15000)
    rows = page.locator("tbody tr").count()
    step(f"shifts table has {rows} rows", lambda: rows >= 10)

    # ── Mobile: chef logs in, sees team ─────────────────────────────
    print("\n5) Mobile · chef login + check team list")
    mctx = browser.new_context(viewport={"width": 390, "height": 844},
                               user_agent="Mozilla/5.0 (iPhone) Mobile",
                               is_mobile=True, has_touch=True)
    mpage = mctx.new_page()
    mpage.goto(MOBILE_URL, wait_until="networkidle", timeout=30000)
    import re
    mpage.get_by_role("button", name=re.compile(r"Chef d.{1,2}équipe")).click()
    mpage.wait_for_timeout(300)
    mpage.get_by_role("button", name="Se connecter").click()
    mpage.wait_for_function("() => /Bonjour\\s+Mate/.test(document.body.innerText)", timeout=20000)
    mpage.wait_for_timeout(2500)
    mpage.screenshot(path=str(OUT / "05-mobile-chef-home.png"), full_page=True)

    step("'Mon équipe' visible", lambda: expect(mpage.get_by_text("Mon équipe").first).to_be_visible(timeout=10000))
    step("VOUS badge present", lambda: expect(mpage.get_by_text("VOUS").first).to_be_visible())

    browser.close()

print("\n" + "=" * 60)
print(f"Passed: {len(passed)} / Failed: {len(failed)}")
print(f"Screenshots: {OUT}")
sys.exit(0 if not failed else 1)
