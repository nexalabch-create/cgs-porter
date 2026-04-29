#!/usr/bin/env python3
"""Debug the Marc-login-after-chef-logout hang. Captures everything."""
import os, sys, time
from playwright.sync_api import sync_playwright

MOBILE = os.environ.get("MOBILE_URL", "http://localhost:5173")
PASSWORD = "CgsPorter2026!"
CHEF = "mate.torgvaidze@cgs-ltd.com"
PORTER = "marc.dubois@cgs-ltd.com"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = ctx.new_page()

    page.on("console", lambda m: print(f"  [console.{m.type}] {m.text[:300]}"))
    page.on("pageerror", lambda e: print(f"  [pageerror] {str(e)[:300]}"))
    page.on("requestfailed", lambda r: print(f"  [reqfail] {r.url} — {r.failure}"))

    def log_response(r):
        if "supabase" in r.url:
            print(f"  [resp {r.status}] {r.request.method} {r.url[:120]}")

    page.on("response", log_response)

    print("─── 1. fresh load ───")
    page.goto(MOBILE, wait_until="networkidle", timeout=20000)
    page.evaluate("localStorage.clear(); sessionStorage.clear();")
    page.reload(wait_until="networkidle")
    time.sleep(1)

    print("\n─── 2. chef login ───")
    page.locator('input[type="email"]').fill(CHEF)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_function(
        "() => !document.body.innerText.includes('Porter Service GVA')",
        timeout=15000,
    )
    print("  ✓ chef logged in")
    time.sleep(2)

    print("\n─── 3. logout ───")
    page.get_by_text("Profil", exact=True).first.click()
    time.sleep(0.8)
    page.get_by_role("button", name="Se déconnecter").click()

    # Watch the page reload happen
    print("  waiting for reload to complete...")
    time.sleep(4)

    print(f"  page url after logout+reload: {page.url}")
    print(f"  localStorage keys after reload:")
    keys = page.evaluate("Object.keys(localStorage)")
    print(f"    {keys}")

    print("\n─── 4. Marc login ───")
    t0 = time.time()
    page.locator('input[type="email"]').fill("")
    page.locator('input[type="email"]').fill(PORTER)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    print(f"  clicked at t=0, waiting...")
    try:
        page.wait_for_function(
            "() => !document.body.innerText.includes('Porter Service GVA')",
            timeout=20000,
        )
        print(f"  ✓ Marc login succeeded in {time.time()-t0:.1f}s")
    except Exception as e:
        print(f"  ✗ STUCK after {time.time()-t0:.1f}s: {e}")

    page.screenshot(path="/tmp/marc-debug-final.png")
    ctx.close()
    browser.close()
