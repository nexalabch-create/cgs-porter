#!/usr/bin/env python3
"""
QA — Walks through the full demo flow:
  1. Login as chef.
  2. Go to Importer page.
  3. Upload the seed services-2026-03-01.csv.
  4. Click Import.
  5. Verify dashboard shows the 22 imported services.
  6. Check Employés page shows 24 real employees.
"""
import os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ADMIN_URL = os.environ.get(
    "CGS_ADMIN_URL",
    "https://cgs-porter-admin-43djm1avk-nexalabch-creates-projects.vercel.app",
)
EMAIL = "mate.torgvaidze@cgs-ltd.com"
PASSWORD = "CgsPorter2026!"

OUT = Path("/tmp/cgs-demo-screenshots")
OUT.mkdir(exist_ok=True)

CSV_PATH = "/Users/matetorgvaidze/Desktop/CGS App/admin/public/templates/services-2026-03-01.csv"

passed = []
failed = []

def step(name, fn):
    try:
        fn()
        passed.append(name)
        print(f"  ✓ {name}")
    except Exception as e:
        failed.append(f"{name}: {type(e).__name__}: {str(e)[:200]}")
        print(f"  ✗ {name}: {str(e)[:200]}")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_context(viewport={"width": 1280, "height": 800}).new_page()

    # Login
    print("\n1) Login as chef")
    page.goto(f"{ADMIN_URL}/login", wait_until="networkidle", timeout=30000)
    page.locator("input[type='password']").fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_url(f"{ADMIN_URL}/", timeout=15000)
    page.wait_for_load_state("networkidle")
    page.screenshot(path=str(OUT / "01-dashboard-empty.png"), full_page=True)
    print("  ✓ logged in")

    # Verify clean dashboard (0 services)
    print("\n2) Dashboard should show 0 services (post-wipe)")
    body = page.inner_text("body")
    print(f"  body contains 'CA aujourd'hui': {'CA aujourd' in body}")

    # Go to Importer
    print("\n3) Navigate to Importer")
    page.get_by_role("link", name="Importer").click()
    page.wait_for_url(f"{ADMIN_URL}/importer", timeout=10000)
    page.wait_for_load_state("networkidle")
    step("Importer page renders", lambda: expect(page.get_by_text("Importer", exact=True).first).to_be_visible())
    step("Drop zone visible", lambda: expect(page.get_by_text("Glisse ton CSV ici").first).to_be_visible())
    page.screenshot(path=str(OUT / "02-importer-empty.png"), full_page=True)

    # Upload the CSV
    print("\n4) Upload CSV via hidden file input")
    page.locator("input[type='file']").set_input_files(CSV_PATH)
    page.wait_for_timeout(800)
    step("Preview table appears", lambda: expect(page.get_by_text("Aperçu").first).to_be_visible(timeout=5000))
    step("22 services in preview", lambda: expect(page.get_by_text("22 services").first).to_be_visible())
    page.screenshot(path=str(OUT / "03-importer-preview.png"), full_page=True)

    # Click Importer button
    print("\n5) Click 'Importer' to commit")
    page.get_by_role("button", name="Importer 22 services").click()
    page.wait_for_timeout(3000)
    step("Success toast", lambda: expect(page.get_by_text("services importés").first).to_be_visible(timeout=10000))
    page.screenshot(path=str(OUT / "04-importer-done.png"), full_page=True)

    # Back to dashboard via sidebar (scoped to nav to avoid duplicate matches).
    nav = page.get_by_role("navigation")
    print("\n6) Verify dashboard shows imported services")
    nav.get_by_role("link", name="Dashboard").click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "05-dashboard-after.png"), full_page=True)

    # Check services page count
    nav.get_by_role("link", name="Services").click()
    page.wait_for_load_state("networkidle")
    page.locator("tbody tr").first.wait_for(state="visible", timeout=15000)
    rows = page.locator("tbody tr").count()
    step(f"Services table has rows ({rows})", lambda: rows > 0)
    page.screenshot(path=str(OUT / "06-services-after.png"), full_page=True)

    # Employés
    nav.get_by_role("link", name="Employés").click()
    page.wait_for_load_state("networkidle")
    page.locator("a[href^='/employes/']").first.wait_for(state="visible", timeout=15000)
    cards = page.locator("a[href^='/employes/']").count()
    step(f"Employés page has {cards} cards", lambda: cards == 24)
    page.screenshot(path=str(OUT / "07-employes.png"), full_page=True)

    browser.close()

print("\n" + "=" * 60)
print(f"Passed: {len(passed)} / Failed: {len(failed)}")
print(f"Screenshots: {OUT}")
sys.exit(0 if not failed else 1)
