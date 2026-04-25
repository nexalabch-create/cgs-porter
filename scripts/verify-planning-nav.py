#!/usr/bin/env python3
"""Sanity check: clicking < / > on Planning changes the displayed month."""
import re
from playwright.sync_api import sync_playwright

MOBILE = "https://cgs-porter-ig4ac490o-nexalabch-creates-projects.vercel.app"
PWD = "CgsPorter2026!"

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

    # Tap the Planning tab in the bottom nav (the <span> inside the bottom-nav button)
    page.get_by_role("button", name="Planning", exact=True).click()
    page.wait_for_timeout(1500)

    label_now = page.evaluate("""
      () => Array.from(document.querySelectorAll('div'))
            .map(d => d.innerText)
            .find(t => /^(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\\s+\\d{4}$/i.test(t))
    """)
    print(f"Initial month: {label_now!r}")

    page.get_by_role("button", name="Mois suivant").click()
    page.wait_for_timeout(600)
    label_next = page.evaluate("""
      () => Array.from(document.querySelectorAll('div'))
            .map(d => d.innerText)
            .find(t => /^(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\\s+\\d{4}$/i.test(t))
    """)
    print(f"After right arrow: {label_next!r}")

    page.get_by_role("button", name="Mois précédent").click()
    page.get_by_role("button", name="Mois précédent").click()
    page.wait_for_timeout(600)
    label_back = page.evaluate("""
      () => Array.from(document.querySelectorAll('div'))
            .map(d => d.innerText)
            .find(t => /^(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\\s+\\d{4}$/i.test(t))
    """)
    print(f"After 2× left: {label_back!r}")

    if label_now != label_next and label_back != label_now:
        print("\n✅ PASS — month navigation works")
    else:
        print("\n❌ FAIL — month label didn't change on click")

    browser.close()
