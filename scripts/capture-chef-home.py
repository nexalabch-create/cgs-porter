#!/usr/bin/env python3
"""Re-capture chef home (mobile-03) + scrolled (mobile-04) after the
'Activité de l'équipe' widget replaced the self-assign card."""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

MOBILE_URL = "https://cgs-porter-muzba5p4e-nexalabch-creates-projects.vercel.app"
OUT = Path(__file__).resolve().parent.parent / "presentation" / "screenshots"


def shot(page, name):
    p = OUT / name
    page.screenshot(path=str(p), full_page=True)
    sz = p.stat().st_size // 1024
    print(f"  📸 {name} ({sz} KB)")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=3,
        is_mobile=True, has_touch=True,
        user_agent="Mozilla/5.0 (iPhone) Mobile",
    )
    page = ctx.new_page()

    page.goto(MOBILE_URL, wait_until="networkidle", timeout=30000)
    page.wait_for_timeout(1500)

    # Toggle to chef
    page.get_by_role("button", name=re.compile(r"Chef d.{1,2}équipe")).click()
    page.wait_for_timeout(400)

    # Login
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_function(
        "() => /Bonjour\\s+Mate/.test(document.body.innerText)",
        timeout=25000,
    )
    page.wait_for_timeout(3500)

    # 03 — top of chef home (now showing Activité de l'équipe widget)
    shot(page, "mobile-03-chef-home.png")

    # 04 — scrolled to "Mon équipe aujourd'hui"
    page.evaluate("window.scrollBy(0, 500)")
    page.wait_for_timeout(600)
    shot(page, "mobile-04-chef-team.png")

    browser.close()

print("\n✅ Re-captures done.")
