#!/usr/bin/env python3
"""Capture the admin panel on a mobile viewport to see how badly (or
not) it breaks. Saves screenshots to /tmp/admin-mobile-*.png."""
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ADMIN = "https://cgs-porter-admin-8oh6d3x1o-nexalabch-creates-projects.vercel.app"
PWD = "CgsPorter2026!"
OUT = Path("/tmp")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=3, is_mobile=True, has_touch=True,
        user_agent="Mozilla/5.0 (iPhone) Mobile",
    )
    page = ctx.new_page()

    page.goto(f"{ADMIN}/login", wait_until="networkidle", timeout=30000)
    page.locator("input[type='password']").fill(PWD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_url(f"{ADMIN}/", timeout=15000)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    routes = [
        ("/",           "dashboard"),
        ("/services",   "services"),
        ("/employes",   "employes"),
        ("/planning",   "planning"),
        ("/parametres", "parametres"),
    ]
    for path, name in routes:
        if path != "/":
            page.goto(f"{ADMIN}{path}", wait_until="domcontentloaded")
            page.wait_for_load_state("networkidle")
            page.wait_for_timeout(2500)
        out = OUT / f"admin-mobile-{name}.png"
        page.screenshot(path=str(out), full_page=False)  # viewport only
        # Also report horizontal overflow + sidebar visibility
        overflow = page.evaluate("document.documentElement.scrollWidth > window.innerWidth")
        sidebar_w = page.evaluate("""() => {
          const s = document.querySelector('aside');
          return s ? s.getBoundingClientRect().width : 0;
        }""")
        print(f"  {name}: overflow={overflow} · sidebar={sidebar_w}px · {out}")

    browser.close()
