#!/usr/bin/env python3
"""End-to-end verification of the porter self-claim flow.

Marc logs in, picks an unassigned service from "À prendre", taps
"Je prends ce service", then checks:
  1. The card disappears from "À prendre"
  2. It appears in "Mes services" with the magenta VOUS badge
  3. The admin (Mate) sees Marc as the assigned porter on that service
"""
import os, json, subprocess, time
from pathlib import Path
from playwright.sync_api import sync_playwright

MOBILE = os.environ["MOBILE_URL"]
ADMIN  = os.environ["ADMIN_URL"]
PASSWORD = "CgsPorter2026!"
PORTER = "marc.dubois@cgs-ltd.com"
CHEF   = "mate.torgvaidze@cgs-ltd.com"
ROOT = Path("/Users/matetorgvaidze/Desktop/CGS App")
OUT = Path("/tmp/cgs-claim-flow"); OUT.mkdir(exist_ok=True)


def _load_env():
    env = {}
    for line in (ROOT / ".env.local").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip("'\"")
    return env

ENV = _load_env()

def run_sql(query):
    p = subprocess.run([
        "curl", "-sS", "-X", "POST",
        f"https://api.supabase.com/v1/projects/{ENV['SUPABASE_PROJECT_REF']}/database/query",
        "-H", f"Authorization: Bearer {ENV['SUPABASE_PERSONAL_ACCESS_TOKEN']}",
        "-H", "Content-Type: application/json",
        "-d", json.dumps({"query": query}),
    ], capture_output=True, text=True, timeout=15)
    if p.returncode != 0: return None
    try: return json.loads(p.stdout)
    except: return None

# Wipe + seed: 4 services, all unassigned, so we can test claim from a clean state.
print("\n[setup] wipe + seed 4 unassigned services")
run_sql("truncate table public.services cascade;")
run_sql("truncate table public.shifts cascade;")
run_sql("delete from public.notifications;")
run_sql("""
insert into public.services (
  service_num, source, flight, scheduled_at, client_name, meeting_point, bags,
  base_price_chf, per_bag_price_chf, status, agency, client_phone, flow,
  assigned_porter_id
) values
  (1,'dnata','EK455','2026-04-29T06:30:00+02:00','Mr. Khalid Al-Mansouri','T1 Porte A12',4,15,4,'todo','DNATA','+41227177111','arrivee',null),
  (2,'swissport','LX1820','2026-04-29T07:15:00+02:00','Mme Sophie Lefèvre','T2 Comptoir First',2,15,4,'todo','SWISSPORT','+41227991900','depart',null),
  (3,'prive','PRIVÉ','2026-04-29T09:30:00+02:00','M. & Mme Tanaka','Hall arrivées P3',5,25,5,'todo','PRIVE','+41794012222','arrivee',null),
  (4,'dnata','EK453','2026-04-29T11:05:00+02:00','Mr. Yusuf Bin Rashid','T1 Porte A14',6,15,4,'todo','DNATA','+41227177111','depart',null);
""")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # ─── Mobile (Marc) ─────────────────────────────────────────────
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = ctx.new_page()
    page.goto(MOBILE, wait_until="networkidle", timeout=20000)
    if not page.get_by_role("button", name="Se connecter").is_visible(timeout=2000):
        ctx.clear_cookies()
        page.evaluate("localStorage.clear(); sessionStorage.clear();")
        page.reload(wait_until="networkidle")
    page.locator('input[type="email"]').fill("")
    page.locator('input[type="email"]').fill(PORTER)
    page.locator('input[type="password"]').fill(PASSWORD)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_function("() => !document.body.innerText.includes('Porter Service GVA')", timeout=15000)
    page.wait_for_timeout(2500)

    page.get_by_text("Services", exact=True).first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "01-marc-before.png"), full_page=True)

    body_before = page.locator("body").inner_text().lower()
    print("\n[before claim]")
    print(f"  4 unassigned visible ? {'à prendre (4)' in body_before}")
    print(f"  No 'mes services' yet ? {'mes services' not in body_before}")

    # Tap the EK455 card → opens detail
    page.get_by_text("EK455", exact=True).first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "02-marc-detail-unclaimed.png"), full_page=True)

    body_detail = page.locator("body").inner_text().lower()
    print("\n[detail before claim]")
    print(f"  'Service libre' header     ? {'service libre' in body_detail}")
    print(f"  'Je prends ce service' CTA ? {'je prends ce service' in body_detail}")
    print(f"  No DÉMARRER button         ? {'démarrer' not in body_detail}")

    # Tap "Je prends ce service"
    page.get_by_role("button", name="Je prends ce service").click()
    page.wait_for_timeout(4000)   # wait for UPDATE round-trip + realtime
    page.screenshot(path=str(OUT / "03-marc-after-claim.png"), full_page=True)

    body_after_claim = page.locator("body").inner_text().lower()
    print("\n[detail after claim]")
    print(f"  'Service libre' gone   ? {'service libre' not in body_after_claim}")
    print(f"  DÉMARRER button shown  ? {'démarrer' in body_after_claim}")
    print(f"  'Ajustements' section  ? {'ajustements' in body_after_claim}")

    # Tap "Retour" via the back arrow (custom button, not browser history)
    page.locator('[aria-label="Retour"]').first.click()
    page.wait_for_timeout(2000)
    page.screenshot(path=str(OUT / "04-marc-list-after-claim.png"), full_page=True)

    body_list = page.locator("body").inner_text().lower()
    print("\n[list after claim]")
    print(f"  'Mes services (1)'   ? {'mes services (1)' in body_list}")
    print(f"  'À prendre (3)'      ? {'à prendre (3)' in body_list}")
    print(f"  'VOUS' badge visible ? {'vous' in body_list}")
    # EK455 should now appear under "Mes services" with VOUS pill, not under À prendre

    ctx.close()

    # ─── Admin (Mate) — verify the assignment is visible ────────────
    print("\n[admin] verify Mate sees Marc as assigned to EK455")
    ctx2 = browser.new_context(viewport={"width": 1440, "height": 900})
    page2 = ctx2.new_page()
    page2.goto(f"{ADMIN}/login", wait_until="networkidle", timeout=20000)
    page2.locator('input[type="email"]').fill(CHEF)
    page2.locator('input[type="password"]').fill(PASSWORD)
    page2.get_by_role("button", name="Se connecter").click()
    page2.wait_for_url(f"{ADMIN}/", timeout=15000)
    page2.goto(f"{ADMIN}/services", wait_until="networkidle", timeout=15000)
    page2.wait_for_timeout(2500)
    page2.screenshot(path=str(OUT / "05-admin-services.png"), full_page=True)

    body2 = page2.locator("body").inner_text()
    # We expect the EK455 row to show "Marc" as assigned travailleur (not "Non assigné")
    rows = body2.split("\n")
    ek455_line = next((r for r in rows if "EK455" in r), "")
    print(f"  EK455 row text snippet: {ek455_line.strip()[:120]}")
    print(f"  EK455 has 'Marc'        ? {'Marc' in ek455_line or any('Marc' in r and 'Khalid' in r for r in rows)}")

    # Cross-check via SQL: assigned_porter_id should be Marc's UUID
    marc_uuid = run_sql("select id from public.users where email='marc.dubois@cgs-ltd.com';")[0]["id"]
    ek455 = run_sql("select assigned_porter_id from public.services where flight='EK455';")
    actual = ek455[0]["assigned_porter_id"] if ek455 else None
    print(f"\n[BD]")
    print(f"  Marc UUID:              {marc_uuid}")
    print(f"  EK455 assigned_porter:  {actual}")
    print(f"  Match ? {actual == marc_uuid}")

    ctx2.close()
    browser.close()

print(f"\nScreenshots: {OUT}/")
