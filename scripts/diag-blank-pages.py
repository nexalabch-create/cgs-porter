#!/usr/bin/env python3
"""Diagnose why /services /crm /rapports /parametres render blank."""
from playwright.sync_api import sync_playwright

ADMIN = "https://cgs-porter-admin-8oh6d3x1o-nexalabch-creates-projects.vercel.app"
PWD = "CgsPorter2026!"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()

    console = []
    page.on("console", lambda m: console.append(f"{m.type}: {m.text}"))
    page.on("pageerror", lambda e: console.append(f"PAGEERROR: {e}"))

    page.goto(f"{ADMIN}/login", wait_until="networkidle")
    page.locator("input[type='password']").fill(PWD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_url(f"{ADMIN}/", timeout=15000)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    print(f"\nDASHBOARD body length: {len(page.evaluate('document.body.innerText'))}")
    print(f"Has #root: {page.evaluate('!!document.querySelector(\"#root\")')}")

    for route in ["/", "/importer", "/employes", "/planning", "/services", "/crm", "/rapports", "/parametres"]:
        page.goto(f"{ADMIN}{route}", wait_until="domcontentloaded")
        page.wait_for_timeout(8000)  # generous wait
        body_len = len(page.evaluate('document.body.innerText'))
        h_count = page.evaluate('document.querySelectorAll("h1,h2,h3").length')
        nav_count = page.evaluate('document.querySelectorAll("nav a, aside a").length')
        url = page.url
        print(f"\n{route}:")
        print(f"  url after load: {url}")
        print(f"  body.innerText length: {body_len}")
        print(f"  headings (h1/h2/h3): {h_count}")
        print(f"  sidebar links: {nav_count}")
        print(f"  body.innerText[0:200]: {page.evaluate('document.body.innerText.slice(0, 200)')!r}")

    print("\n=== CONSOLE OUTPUT ===")
    for c in console[-30:]:
        print(f"  {c}")

    browser.close()
