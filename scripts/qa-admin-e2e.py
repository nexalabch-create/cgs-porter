#!/usr/bin/env python3
"""
CGS QA — End-to-end Playwright test of the deployed admin panel.
Reports pass/fail per scenario + console errors + screenshots.
"""
import json
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect, TimeoutError as PWTimeoutError

ADMIN_URL = os.environ.get(
    "CGS_ADMIN_URL",
    "https://cgs-porter-admin-kaxq2vvkz-nexalabch-creates-projects.vercel.app",
)
EMAIL = "mate.torgvaidze@cgs-ltd.com"
PASSWORD = "CgsPorter2026!"

OUT = Path("/tmp/cgs-qa-screenshots")
OUT.mkdir(exist_ok=True)

passed = []
failed = []
console_errors = []


def shot(page, name):
    p = OUT / name
    page.screenshot(path=str(p), full_page=True)
    return str(p)


def step(name, fn):
    try:
        fn()
        passed.append(name)
        print(f"  ✓ {name}")
    except Exception as e:
        msg = f"{name}: {type(e).__name__}: {str(e)[:200]}"
        failed.append(msg)
        print(f"  ✗ {msg}")


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(viewport={"width": 1280, "height": 800})
        page = ctx.new_page()

        # capture all console events
        def on_console(msg):
            if msg.type in ("error", "warning"):
                console_errors.append({"type": msg.type, "text": msg.text[:300], "url": page.url})

        page.on("console", on_console)
        page.on("pageerror", lambda e: console_errors.append({"type": "pageerror", "text": str(e)[:300], "url": page.url}))

        # ── 1. Login screen ────────────────────────────────────────────
        print("\n1) Login screen")
        step("nav /login", lambda: (page.goto(f"{ADMIN_URL}/login", wait_until="networkidle", timeout=30000), None)[1])
        step("'Connexion' heading visible", lambda: expect(page.get_by_role("heading", name="Connexion")).to_be_visible(timeout=5000))
        step("CGS logo present", lambda: expect(page.locator("img[alt='CGS']").first).to_be_visible())
        step("email input present", lambda: expect(page.locator("input[type='email']")).to_be_visible())
        step("'Se connecter' button", lambda: expect(page.get_by_role("button", name="Se connecter")).to_be_visible())
        shot(page, "01-login.png")

        # ── 2. Login flow ──────────────────────────────────────────────
        print("\n2) Login submit")
        page.locator("input[type='email']").fill(EMAIL)
        page.locator("input[type='password']").fill(PASSWORD)
        try:
            page.get_by_role("button", name="Se connecter").click()
            page.wait_for_url(f"{ADMIN_URL}/", timeout=15000)
            passed.append("redirected to / after login")
            print("  ✓ redirected to / after login")
        except PWTimeoutError:
            failed.append("login redirect timed out")
            print("  ✗ login redirect timed out")
            shot(page, "02-login-error.png")
            browser.close()
            return write_report()

        page.wait_for_load_state("networkidle", timeout=15000)

        # ── 3. Dashboard ──────────────────────────────────────────────
        print("\n3) Dashboard")
        for label in ["Services aujourd'hui", "CA aujourd'hui", "Services ce mois", "CA ce mois"]:
            step(f"metric card '{label}' visible", lambda l=label: expect(page.get_by_text(l, exact=True).first).to_be_visible())
        step("dashboard subtitle", lambda: expect(page.get_by_text("Vue d'ensemble", exact=False).first).to_be_visible())
        step("at least one canvas (charts)", lambda: expect(page.locator("canvas").first).to_be_visible(timeout=10000))
        step("≥2 canvas (bar + donut)", lambda: (lambda c: c if c >= 2 else (_ for _ in ()).throw(AssertionError(f"only {c} canvas")))(page.locator("canvas").count()))
        step("'5 derniers services' table", lambda: expect(page.get_by_text("5 derniers services").first).to_be_visible())
        step("'Top 5 porteurs' table", lambda: expect(page.get_by_text("Top 5 porteurs").first).to_be_visible())
        shot(page, "03-dashboard.png")

        # sidebar nav check
        sidebar_links = ["Dashboard", "Services", "Employés", "Planning", "CRM Clients", "Rapports", "Paramètres"]
        for label in sidebar_links:
            step(f"sidebar item '{label}'", lambda l=label: expect(page.get_by_role("link", name=l)).to_be_visible())

        # ── 4. Services ────────────────────────────────────────────────
        print("\n4) Services page")
        page.get_by_role("link", name="Services").click()
        page.wait_for_url(f"{ADMIN_URL}/services", timeout=10000)
        page.wait_for_load_state("networkidle")

        step("URL is /services", lambda: page.url == f"{ADMIN_URL}/services" or (_ for _ in ()).throw(AssertionError(page.url)))
        # Wait for the table to actually populate (Supabase fetch may race with networkidle).
        page.locator("tbody tr").first.wait_for(state="visible", timeout=15000)
        rows_before = page.locator("tbody tr").count()
        step(f"≥20 rows ({rows_before} found)", lambda: rows_before >= 20 or (_ for _ in ()).throw(AssertionError(f"only {rows_before} rows")))

        page.locator("input[placeholder*='Recherche']").fill("EK")
        page.wait_for_timeout(500)
        rows_after = page.locator("tbody tr").count()
        step(f"search 'EK' filters ({rows_before} → {rows_after})", lambda: rows_after < rows_before or (_ for _ in ()).throw(AssertionError("search did not filter")))
        page.locator("input[placeholder*='Recherche']").fill("")

        page.get_by_role("button", name="Ajouter service").click()
        page.wait_for_timeout(400)
        step("modal open", lambda: expect(page.get_by_text("Nouveau service", exact=False).first).to_be_visible())
        step("modal has flight input", lambda: expect(page.locator("input[placeholder='EK455']").first).to_be_visible())
        page.get_by_role("button", name="Annuler").click()
        page.wait_for_timeout(300)
        shot(page, "04-services.png")

        # ── 5. Employés ────────────────────────────────────────────────
        print("\n5) Employés grid")
        page.get_by_role("link", name="Employés").click()
        page.wait_for_url(f"{ADMIN_URL}/employes", timeout=10000)
        page.wait_for_load_state("networkidle")

        step("URL is /employes", lambda: "/employes" in page.url or (_ for _ in ()).throw(AssertionError(page.url)))
        # Wait for cards to render (Supabase fetch).
        page.locator("a[href^='/employes/']").first.wait_for(state="visible", timeout=15000)
        cards = page.locator("a[href^='/employes/']").count()
        step(f"≥20 cards ({cards} found)", lambda: cards >= 20 or (_ for _ in ()).throw(AssertionError(f"only {cards}")))
        shot(page, "05-employes.png")

        page.locator("a[href^='/employes/']").first.click()
        page.wait_for_load_state("networkidle", timeout=10000)
        step("URL matches /employes/<id>", lambda: "/employes/" in page.url and len(page.url.split("/employes/")[-1]) > 5 or (_ for _ in ()).throw(AssertionError(page.url)))
        shot(page, "06-employe-detail.png")

        # back to /employes via sidebar
        page.get_by_role("link", name="Employés").click()
        page.wait_for_load_state("networkidle")

        # ── 6. Planning ────────────────────────────────────────────────
        print("\n6) Planning")
        page.get_by_role("link", name="Planning").click()
        page.wait_for_url(f"{ADMIN_URL}/planning", timeout=10000)
        page.wait_for_load_state("networkidle")
        step("Planning placeholder", lambda: expect(page.get_by_text("À implémenter", exact=False).first).to_be_visible(timeout=5000))
        shot(page, "07-planning.png")

        # ── 7. Paramètres ──────────────────────────────────────────────
        print("\n7) Paramètres")
        page.get_by_role("link", name="Paramètres").click()
        page.wait_for_url(f"{ADMIN_URL}/parametres", timeout=10000)
        page.wait_for_load_state("networkidle")
        step("Informations entreprise section", lambda: expect(page.get_by_text("Informations entreprise").first).to_be_visible())
        step("Tarification section", lambda: expect(page.get_by_text("Tarification").first).to_be_visible())
        step("Webhook section", lambda: expect(page.get_by_text("Webhook").first).to_be_visible())
        shot(page, "08-parametres.png")

        # ── 8. CRM + Rapports (smoke) ─────────────────────────────────
        print("\n8) CRM + Rapports (smoke)")
        page.get_by_role("link", name="CRM Clients").click()
        page.wait_for_load_state("networkidle")
        step("CRM page renders", lambda: expect(page.get_by_text("CRM Clients").first).to_be_visible())

        page.get_by_role("link", name="Rapports").click()
        page.wait_for_load_state("networkidle")
        step("Rapports page renders", lambda: expect(page.get_by_text("Rapports").first).to_be_visible())

        # ── 9. Logout ──────────────────────────────────────────────────
        print("\n9) Logout")
        page.get_by_role("button", name="Déconnexion").click()
        page.wait_for_url(f"{ADMIN_URL}/login", timeout=10000)
        step("redirected to /login after logout", lambda: page.url.endswith("/login") or (_ for _ in ()).throw(AssertionError(page.url)))
        shot(page, "09-logout.png")

        browser.close()
        write_report()


def write_report():
    report = {
        "passed": passed,
        "failed": failed,
        "consoleErrors": console_errors,
        "screenshots": sorted(str(p) for p in OUT.glob("*.png")),
        "summary": {
            "passed_count": len(passed),
            "failed_count": len(failed),
            "console_errors": len(console_errors),
        },
    }
    print("\n" + "=" * 60)
    print(json.dumps(report["summary"], indent=2))
    if failed:
        print("\nFAILURES:")
        for f in failed:
            print(f"  - {f}")
    if console_errors:
        print("\nCONSOLE ERRORS:")
        for e in console_errors[:10]:
            print(f"  [{e['type']}] {e['text'][:120]}")

    with open("/tmp/cgs-qa-report.json", "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nFull report: /tmp/cgs-qa-report.json")
    print(f"Screenshots: {OUT}")
    sys.exit(0 if not failed else 1)


if __name__ == "__main__":
    main()
