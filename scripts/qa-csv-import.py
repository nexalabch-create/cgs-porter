#!/usr/bin/env python3
"""Upload the regenerated CSVs to the admin importer + planning to verify they parse correctly."""
import os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ADMIN = os.environ["ADMIN_URL"]
PASSWORD = "CgsPorter2026!"
CHEF = "mate.torgvaidze@cgs-ltd.com"
ROOT = Path("/Users/matetorgvaidze/Desktop/CGS App")
SERVICES_CSV = ROOT / "sheets/CGS-Services-2026-04-29.csv"
ROSTER_CSV = ROOT / "sheets/CGS-Planning-2026-04-30.csv"
OUT = Path("/tmp/cgs-csv-test"); OUT.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)[:200]))
    page.on("console", lambda m: errs.append(f"[{m.type}] {m.text[:200]}") if m.type == "error" else None)

    page.goto(f"{ADMIN}/login", wait_until="networkidle", timeout=20000)
    page.locator('input[type="email"]').fill(CHEF)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_url(f"{ADMIN}/", timeout=15000)
    print("✓ logged in")

    # ── Services CSV ─────────────────────────────────────────────────
    print("\n[Services CSV]")
    page.goto(f"{ADMIN}/importer", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(800)
    file_input = page.locator('input[type="file"]')
    file_input.set_input_files(str(SERVICES_CSV))
    page.wait_for_timeout(2000)
    page.screenshot(path=str(OUT / "01-services-preview.png"), full_page=True)

    # Look for the preview section
    preview = page.locator("text=/Aperçu — \\d+ services/").first
    if preview.is_visible():
        text = preview.inner_text()
        print(f"  preview header: {text!r}")
    error_banner = page.locator(".bg-red-50").first
    if error_banner.is_visible():
        print(f"  ✗ ERROR: {error_banner.inner_text()!r}")
    else:
        print("  ✓ no error")

    # ── Roster CSV ───────────────────────────────────────────────────
    print("\n[Roster CSV — Planning page]")
    page.goto(f"{ADMIN}/planning", wait_until="networkidle", timeout=15000)
    page.wait_for_timeout(800)
    # Click "Importer CSV roster" button
    import re as _re
    page.locator("button").filter(has_text=_re.compile(r"Importer.*roster", _re.I)).first.click()
    page.wait_for_timeout(800)
    file_input2 = page.locator('input[type="file"]').last
    file_input2.set_input_files(str(ROSTER_CSV))
    page.wait_for_timeout(2000)
    page.screenshot(path=str(OUT / "02-roster-preview.png"), full_page=True)

    # Look for "X matched · Y unmatched" line
    summary = page.locator("text=/\\d+ lignes/").first
    if summary.is_visible():
        print(f"  summary: {summary.inner_text()!r}")
    matched_count = page.locator("text=/INTROUVABLE/").count()
    print(f"  INTROUVABLE rows: {matched_count}")

    if errs:
        print(f"\n[CONSOLE ERRORS ({len(errs)})]")
        for e in errs[:10]:
            print(f"  {e}")

    ctx.close()
    browser.close()
print(f"\nScreenshots: {OUT}/")
