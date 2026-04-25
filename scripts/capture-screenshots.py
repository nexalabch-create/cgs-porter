#!/usr/bin/env python3
"""
Capture all screenshots needed for the CGS Porter pitch deck.
Saves them to ./presentation/screenshots/ at high resolution.

Strategy: navigate via direct URL between sections so open modals don't block
sidebar clicks. Modals are captured by clicking their trigger buttons inline.
"""
import os
import sys
import time
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ADMIN_URL = os.environ.get(
    "CGS_ADMIN_URL",
    "https://cgs-porter-admin-e2l60qegb-nexalabch-creates-projects.vercel.app",
)
MOBILE_URL = os.environ.get(
    "CGS_MOBILE_URL",
    "https://cgs-porter-of0ujzeyq-nexalabch-creates-projects.vercel.app",
)
EMAIL = "mate.torgvaidze@cgs-ltd.com"
PASSWORD = "CgsPorter2026!"

OUT = Path(__file__).resolve().parent.parent / "presentation" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
print(f"\n→ Saving to: {OUT}\n")


def shot(page, name):
    p = OUT / name
    page.screenshot(path=str(p), full_page=True)
    print(f"  📸 {name} ({p.stat().st_size // 1024} KB)")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ── Admin (1440x900 desktop, retina) ─────────────────────────────
    print("ADMIN PANEL — desktop captures")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
    page = ctx.new_page()

    # 01 — Login
    page.goto(f"{ADMIN_URL}/login", wait_until="networkidle", timeout=30000)
    shot(page, "admin-01-login.png")

    # Authenticate
    page.locator("input[type='password']").fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_url(f"{ADMIN_URL}/", timeout=15000)
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    # 02 — Dashboard
    shot(page, "admin-02-dashboard.png")

    # 03 — Services list
    page.goto(f"{ADMIN_URL}/services", wait_until="networkidle")
    page.wait_for_timeout(3000)  # let Supabase fetch + render
    try:
        page.locator("tbody tr").first.wait_for(state="visible", timeout=10000)
    except Exception:
        pass
    page.wait_for_timeout(500)
    shot(page, "admin-03-services-list.png")

    # 04 — Service modal (then navigate away to dismiss)
    page.get_by_role("button", name="Ajouter service").click()
    page.wait_for_timeout(700)
    shot(page, "admin-04-services-modal.png")

    # 05 — Importer empty
    page.goto(f"{ADMIN_URL}/importer", wait_until="networkidle")
    page.wait_for_timeout(800)
    shot(page, "admin-05-importer-empty.png")

    # 06 — Importer with preview
    page.get_by_role("button", name="Charger jeu démo").click()
    page.wait_for_timeout(2000)
    shot(page, "admin-06-importer-preview.png")

    # 07 — Employés grid
    page.goto(f"{ADMIN_URL}/employes", wait_until="networkidle")
    page.wait_for_timeout(2500)
    try:
        page.locator("a[href^='/employes/']").first.wait_for(state="visible", timeout=10000)
    except Exception:
        pass
    page.wait_for_timeout(500)
    shot(page, "admin-07-employes-grid.png")

    # 08 — Employee detail (click 3rd card to get a porter)
    cards = page.locator("a[href^='/employes/']")
    href = cards.nth(2).get_attribute("href")
    page.goto(f"{ADMIN_URL}{href}", wait_until="networkidle")
    page.wait_for_timeout(1500)
    shot(page, "admin-08-employe-detail.png")

    # 09 — Employee modal
    page.get_by_role("button", name="Modifier").click()
    page.wait_for_timeout(600)
    shot(page, "admin-09-employe-modal.png")

    # 10 — Planning
    page.goto(f"{ADMIN_URL}/planning", wait_until="networkidle")
    page.wait_for_timeout(2000)
    shot(page, "admin-10-planning.png")

    # 11 — Planning import modal
    page.get_by_role("button", name="Importer CSV roster").click()
    page.wait_for_timeout(600)
    shot(page, "admin-11-planning-import.png")

    # 12 — CRM
    page.goto(f"{ADMIN_URL}/crm", wait_until="networkidle")
    page.wait_for_timeout(1000)
    shot(page, "admin-12-crm.png")

    # 13 — Rapports
    page.goto(f"{ADMIN_URL}/rapports", wait_until="networkidle")
    page.wait_for_timeout(2500)
    shot(page, "admin-13-rapports.png")

    # 14 — Paramètres
    page.goto(f"{ADMIN_URL}/parametres", wait_until="networkidle")
    page.wait_for_timeout(800)
    shot(page, "admin-14-parametres.png")

    # ── Mobile (iPhone 12 Pro 390x844, retina) ───────────────────────
    print("\nMOBILE PWA — iPhone captures")
    mctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        device_scale_factor=3,
        is_mobile=True, has_touch=True,
        user_agent="Mozilla/5.0 (iPhone) Mobile",
    )
    mpage = mctx.new_page()

    # 01 — Login (porter selected by default)
    mpage.goto(MOBILE_URL, wait_until="networkidle", timeout=30000)
    mpage.wait_for_timeout(1000)
    shot(mpage, "mobile-01-login-porter.png")

    # 02 — Login chef toggle
    mpage.get_by_role("button", name=re.compile(r"Chef d.{1,2}équipe")).click()
    mpage.wait_for_timeout(400)
    shot(mpage, "mobile-02-login-chef.png")

    # Login as chef
    mpage.get_by_role("button", name="Se connecter").click()
    mpage.wait_for_function("() => /Bonjour\\s+Mate/.test(document.body.innerText)", timeout=20000)
    mpage.wait_for_timeout(2500)

    # 03 — Chef home (top of page)
    shot(mpage, "mobile-03-chef-home.png")

    # 04 — Chef home scrolled (Mon équipe section)
    mpage.evaluate("window.scrollBy(0, 450)")
    mpage.wait_for_timeout(500)
    shot(mpage, "mobile-04-chef-team.png")
    mpage.evaluate("window.scrollTo(0, 0)")
    mpage.wait_for_timeout(300)

    # 05 — Assign sheet
    try:
        mpage.get_by_role("button").filter(has_text="Assigner un porteur").first.click()
        mpage.wait_for_timeout(900)
        shot(mpage, "mobile-05-chef-assign-sheet.png")
        mpage.get_by_role("button", name="Annuler").click()
        mpage.wait_for_timeout(400)
    except Exception as e:
        print(f"  ⚠ assign sheet skipped: {e}")

    # 06 — Chef services tab
    mpage.get_by_text("Services", exact=True).click()
    mpage.wait_for_timeout(2000)
    shot(mpage, "mobile-06-chef-services.png")

    # Logout via Profil
    mpage.get_by_text("Profil", exact=True).click()
    mpage.wait_for_timeout(1000)
    mpage.get_by_role("button", name="Se déconnecter").click()
    mpage.wait_for_timeout(1500)

    # Login as porter (default toggle is porter)
    mpage.get_by_role("button", name="Se connecter").click()
    mpage.wait_for_timeout(3500)

    # 07 — Porter home
    shot(mpage, "mobile-07-porter-home.png")

    # 08 — Porter detail
    try:
        btn = mpage.get_by_role("button", name="Voir le service").first
        if btn.is_visible():
            btn.click()
            mpage.wait_for_timeout(1500)
            shot(mpage, "mobile-08-porter-detail.png")
    except Exception as e:
        print(f"  ⚠ porter detail skipped: {e}")

    # 09 — Porter services
    mpage.get_by_text("Services", exact=True).click()
    mpage.wait_for_timeout(1500)
    shot(mpage, "mobile-09-porter-services.png")

    # 10 — Porter profile
    mpage.get_by_text("Profil", exact=True).click()
    mpage.wait_for_timeout(1000)
    shot(mpage, "mobile-10-porter-profile.png")

    browser.close()

print(f"\n✅ {len(list(OUT.glob('*.png')))} screenshots saved to {OUT}")
