#!/usr/bin/env python3
"""
Login smoke test — verifies the new email+password login on both apps.

Runs against local dev servers (mobile=5173, admin=5174). Tests:
  · login screen renders
  · wrong password → French error
  · right password → app shell loads
  · admin: magic-link reset flow opens

Exit 0 on full pass, 1 on any failure.
"""
import os, sys
from playwright.sync_api import sync_playwright, expect

MOBILE = os.environ.get("MOBILE_URL", "http://localhost:5173")
ADMIN = os.environ.get("ADMIN_URL", "http://localhost:5174")
PASSWORD = "CgsPorter2026!"
PORTER_EMAIL = "marc.dubois@cgs-ltd.com"
CHEF_EMAIL = "mate.torgvaidze@cgs-ltd.com"

passed, failed = [], []


def step(name, fn):
    try:
        fn()
        passed.append(name)
        print(f"  ✓ {name}")
    except Exception as e:
        failed.append(f"{name}: {type(e).__name__}: {str(e)[:240]}")
        print(f"  ✗ {name}: {type(e).__name__}: {str(e)[:240]}")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ── Mobile ──────────────────────────────────────────────────────────
    print(f"\n[MOBILE] {MOBILE}")
    ctx = browser.new_context(
        viewport={"width": 390, "height": 844},
        is_mobile=True,
        has_touch=True,
    )
    page = ctx.new_page()
    page.goto(MOBILE, wait_until="networkidle", timeout=15000)
    # Either we land on login (no session) or on home (session restored).
    # If session restored we sign out first by clearing storage.
    if not page.get_by_role("button", name="Se connecter").is_visible(timeout=2000):
        ctx.clear_cookies()
        page.evaluate("window.localStorage.clear(); window.sessionStorage.clear();")
        page.reload(wait_until="networkidle")

    step("login screen renders", lambda: expect(page.get_by_role("heading", name="Porter Service GVA")).to_be_visible(timeout=8000))
    step("email input present", lambda: expect(page.locator('input[type="email"]')).to_be_visible())
    step("password input present", lambda: expect(page.locator('input[type="password"]')).to_be_visible())
    step("Se connecter button present", lambda: expect(page.get_by_role("button", name="Se connecter")).to_be_visible())

    # Wrong password → French error
    page.locator('input[type="email"]').fill(PORTER_EMAIL)
    page.locator('input[type="password"]').fill("wrong-password-abc")
    page.get_by_role("button", name="Se connecter").click()
    step("wrong pw → French error visible",
         lambda: expect(page.get_by_text("E-mail ou mot de passe incorrect.")).to_be_visible(timeout=10000))

    # Marc Dubois real login (porter)
    page.locator('input[type="email"]').fill("")
    page.locator('input[type="email"]').fill(PORTER_EMAIL)
    page.locator('input[type="password"]').fill("")
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    step("porter (Marc) login → login screen disappears",
         lambda: expect(page.get_by_role("heading", name="Porter Service GVA")).not_to_be_visible(timeout=10000))

    # Reload to also verify session is persisted
    page.reload(wait_until="networkidle")
    step("session persists across reload",
         lambda: expect(page.get_by_role("heading", name="Porter Service GVA")).not_to_be_visible(timeout=8000))

    # Reset everything for the next phase
    ctx.clear_cookies()
    page.evaluate("window.localStorage.clear(); window.sessionStorage.clear();")
    page.reload(wait_until="networkidle")

    # Mobile reset-password flow opens + can return
    page.locator('input[type="password"]').fill("")
    page.get_by_role("button", name="Mot de passe oublié ?").click()
    step("mobile reset mode opens",
         lambda: expect(page.get_by_role("button", name="Envoyer le lien")).to_be_visible(timeout=4000))
    page.get_by_role("button", name="← Retour à la connexion").click()
    step("mobile back to login from reset",
         lambda: expect(page.get_by_role("button", name="Se connecter")).to_be_visible(timeout=4000))

    # Chef login → home loads (this user definitely exists in DB)
    page.locator('input[type="email"]').fill("")
    page.locator('input[type="email"]').fill(CHEF_EMAIL)
    page.locator('input[type="password"]').fill("")
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    step("chef login → login screen disappears",
         lambda: expect(page.get_by_role("heading", name="Porter Service GVA")).not_to_be_visible(timeout=10000))

    ctx.close()

    # ── Admin ───────────────────────────────────────────────────────────
    print(f"\n[ADMIN] {ADMIN}")
    ctx = browser.new_context(viewport={"width": 1440, "height": 900})
    page = ctx.new_page()
    page.goto(ADMIN, wait_until="networkidle", timeout=15000)
    if not page.get_by_role("button", name="Se connecter").is_visible(timeout=3000):
        ctx.clear_cookies()
        page.evaluate("window.localStorage.clear(); window.sessionStorage.clear();")
        page.reload(wait_until="networkidle")

    step("admin login renders", lambda: expect(page.get_by_role("heading", name="Connexion")).to_be_visible(timeout=8000))
    step("admin email input present", lambda: expect(page.locator('input[type="email"]')).to_be_visible())
    step("admin pw input present", lambda: expect(page.locator('input[type="password"]')).to_be_visible())
    step("'Mot de passe oublié ?' link present",
         lambda: expect(page.get_by_role("button", name="Mot de passe oublié ?")).to_be_visible())

    # Wrong password
    page.locator('input[type="email"]').fill(CHEF_EMAIL)
    page.locator('input[type="password"]').fill("wrong-password-abc")
    page.get_by_role("button", name="Se connecter").click()
    step("admin wrong pw → French error",
         lambda: expect(page.get_by_text("E-mail ou mot de passe incorrect.")).to_be_visible(timeout=10000))

    # Magic-link flow opens
    page.locator('input[type="password"]').fill("")
    page.get_by_role("button", name="Mot de passe oublié ?").click()
    step("reset mode opens",
         lambda: expect(page.get_by_role("heading", name="Mot de passe oublié")).to_be_visible(timeout=4000))
    step("'Envoyer le lien' button visible",
         lambda: expect(page.get_by_role("button", name="Envoyer le lien")).to_be_visible())
    page.get_by_role("button", name="← Retour à la connexion").click()
    step("can return to login",
         lambda: expect(page.get_by_role("heading", name="Connexion")).to_be_visible(timeout=4000))

    # Right password
    page.locator('input[type="email"]').fill(CHEF_EMAIL)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    step("admin login succeeds (login screen hidden)",
         lambda: expect(page.get_by_role("heading", name="Connexion")).not_to_be_visible(timeout=10000))

    ctx.close()
    browser.close()

print(f"\n── Results ──\n  passed: {len(passed)}\n  failed: {len(failed)}")
if failed:
    print("\nFailures:")
    for f in failed:
        print(f"  • {f}")
    sys.exit(1)
sys.exit(0)
