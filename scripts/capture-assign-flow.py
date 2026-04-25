#!/usr/bin/env python3
"""Capture the new AssignSheet (with chefs included) + the toast that
fires after assigning. Updates mobile-05-chef-assign-sheet.png in the
deck and adds a new mobile-05b-chef-assign-toast.png."""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

MOBILE = "https://cgs-porter-bg0v4xifp-nexalabch-creates-projects.vercel.app"
OUT = Path(__file__).resolve().parent.parent / "presentation" / "screenshots"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=3, is_mobile=True, has_touch=True,
        user_agent="Mozilla/5.0 (iPhone) Mobile",
    )
    page = ctx.new_page()
    page.goto(MOBILE, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)
    page.get_by_role("button", name=re.compile(r"Chef d.{1,2}équipe")).click()
    page.wait_for_timeout(400)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_function("() => /Bonjour\\s+Mate/.test(document.body.innerText)", timeout=25000)
    page.wait_for_timeout(2500)

    # Open the AssignSheet
    page.get_by_role("button").filter(has_text="Assigner un porteur").first.click()
    page.wait_for_timeout(800)

    # 05 — AssignSheet with chefs visible at top
    p1 = OUT / "mobile-05-chef-assign-sheet.png"
    page.screenshot(path=str(p1), full_page=True)
    print(f"  📸 mobile-05-chef-assign-sheet.png ({p1.stat().st_size // 1024} KB)")

    # Tap the first chef in the list (should be Mate himself or Andrei)
    # Use the search field to find a porter to make the toast obvious
    page.locator("input[type='search']").fill("Marc")
    page.wait_for_timeout(400)
    page.locator("button").filter(has_text="Marc Dubois").first.click()
    page.wait_for_timeout(900)  # toast should be visible by now

    # 05b — toast confirmation visible
    p2 = OUT / "mobile-05b-chef-assign-toast.png"
    page.screenshot(path=str(p2), full_page=True)
    print(f"  📸 mobile-05b-chef-assign-toast.png ({p2.stat().st_size // 1024} KB)")

    browser.close()

print("\n✅ Done.")
