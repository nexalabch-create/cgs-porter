#!/usr/bin/env python3
"""Screenshot the mobile ChefServices page in iPhone viewport at production URL."""
import os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

MOBILE = os.environ["MOBILE_URL"]
PASSWORD = "CgsPorter2026!"
CHEF = "mate.torgvaidze@cgs-ltd.com"

OUT = Path("/tmp/cgs-chef-services"); OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # iPhone 12 Pro viewport — same as Mate's iPhone in the bug report.
    ctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=3,
        is_mobile=True,
        has_touch=True,
        user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    )
    page = ctx.new_page()
    page.goto(MOBILE, wait_until="networkidle", timeout=20000)

    # Login as chef
    page.locator('input[type="email"]').fill(CHEF)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_function("() => !document.body.innerText.includes('Porter Service GVA')", timeout=15000)
    page.wait_for_timeout(1500)

    # Navigate to Services tab
    page.get_by_text("Services", exact=True).first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "chef-services-fixed.png"), full_page=False)
    print(f"  ✓ {OUT}/chef-services-fixed.png")

    # Also a full-page screenshot to see all rows
    page.screenshot(path=str(OUT / "chef-services-fixed-full.png"), full_page=True)
    print(f"  ✓ {OUT}/chef-services-fixed-full.png")

    ctx.close()
    browser.close()
