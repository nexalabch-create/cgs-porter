#!/usr/bin/env python3
"""Inspect the DOM of one chef service card to see what's actually rendering."""
import os
from playwright.sync_api import sync_playwright

MOBILE = os.environ["MOBILE_URL"]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.goto(MOBILE, wait_until="networkidle", timeout=20000)
    page.locator('input[type="email"]').fill("mate.torgvaidze@cgs-ltd.com")
    page.locator('input[type="password"]').fill("CgsPorter2026!")
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_function("() => !document.body.innerText.includes('Porter Service GVA')", timeout=15000)
    page.wait_for_timeout(1500)
    page.get_by_text("Services", exact=True).first.click()
    page.wait_for_timeout(2000)

    # Find first service card and inspect
    info = page.evaluate("""() => {
      const scrollContainer = document.querySelector('.scroll[style*="overflow-y"]') || document.querySelector('[class="scroll"]');
      const all = document.querySelectorAll('div');
      let firstCard = null;
      for (const d of all) {
        if (d.style.borderRadius === '14px' || d.style.borderRadius === '16px') {
          if (d.textContent.includes('EK455') || d.textContent.includes('06:30')) {
            firstCard = d;
            break;
          }
        }
      }
      if (!firstCard) return 'no card found';
      const rect = firstCard.getBoundingClientRect();
      return {
        outerHTML: firstCard.outerHTML.slice(0, 3000),
        rect: { width: rect.width, height: rect.height, top: rect.top },
        innerText: firstCard.innerText,
        clientHeight: firstCard.clientHeight,
        scrollHeight: firstCard.scrollHeight,
        children: firstCard.children.length,
      };
    }""")
    print("\n=== First card inspection ===")
    if isinstance(info, dict):
        print(f"  rect: {info['rect']}")
        print(f"  clientHeight: {info['clientHeight']}, scrollHeight: {info['scrollHeight']}")
        print(f"  children: {info['children']}")
        print(f"  innerText: {info['innerText']!r}")
        print(f"\n  outerHTML (first 3000 chars):\n{info['outerHTML']}")
    else:
        print(f"  {info}")

    ctx.close()
    browser.close()
