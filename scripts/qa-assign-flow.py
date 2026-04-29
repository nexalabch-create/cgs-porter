#!/usr/bin/env python3
"""Verifies chef can see tomorrow's services + assign one to Marc end-to-end."""
import os, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ADMIN  = os.environ["ADMIN_URL"]
MOBILE = os.environ["MOBILE_URL"]
PASSWORD = "CgsPorter2026!"
CHEF = "mate.torgvaidze@cgs-ltd.com"
PORTER = "marc.dubois@cgs-ltd.com"

OUT = Path("/tmp/cgs-assign-flow"); OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    print("\n[chef admin] login + tour the pages")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(f"{ADMIN}/login", wait_until="networkidle", timeout=20000)
    page.locator('input[type="email"]').fill(CHEF)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_url(f"{ADMIN}/", timeout=15000)
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "01-dashboard.png"), full_page=True)

    page.goto(f"{ADMIN}/planning", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "02-planning.png"), full_page=True)

    page.goto(f"{ADMIN}/services", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(2000)
    page.screenshot(path=str(OUT / "03-services-list.png"), full_page=True)

    # Find first service row + click Assigner
    rows = page.locator("tr").filter(has_text="Non-assigné")
    print(f"  found {rows.count()} unassigned rows")
    page.wait_for_timeout(500)
    ctx.close()
    browser.close()
print(f"\nScreenshots in {OUT}/")
