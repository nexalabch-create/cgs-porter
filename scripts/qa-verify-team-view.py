#!/usr/bin/env python3
"""Verify Marc sees ALL services partitioned into 3 sections + 'Travailleur' rename."""
import os, json, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright

MOBILE = os.environ["MOBILE_URL"]
ADMIN  = os.environ["ADMIN_URL"]
PASSWORD = "CgsPorter2026!"
PORTER = "marc.dubois@cgs-ltd.com"
CHEF   = "mate.torgvaidze@cgs-ltd.com"
ROOT = Path("/Users/matetorgvaidze/Desktop/CGS App")
OUT = Path("/tmp/cgs-team-view"); OUT.mkdir(exist_ok=True)


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

# Wipe + re-seed: 5 services. Assign first to Marc, second & third unassigned, last 2 to another worker.
print("\n[setup] wipe + seed 5 services + assign 1 to Marc, 1 to another worker")
run_sql("truncate table public.services cascade;")
run_sql("truncate table public.shifts cascade;")
marc = run_sql("select id from public.users where email='marc.dubois@cgs-ltd.com';")[0]["id"]
imad = run_sql("select id from public.users where email='imad.moukni@cgs-ltd.com';")[0]["id"]
run_sql(f"""
insert into public.services (
  service_num, source, flight, scheduled_at, client_name, meeting_point, bags,
  base_price_chf, per_bag_price_chf, status, agency, client_phone, flow,
  assigned_porter_id
) values
  (1,'dnata','EK455','2026-04-29T06:30:00+02:00','Mr. Khalid Al-Mansouri','T1 Porte A12',4,15,4,'todo','DNATA','+41227177111','arrivee','{marc}'),
  (2,'swissport','LX1820','2026-04-29T07:15:00+02:00','Mme Sophie Lefèvre','T2 Comptoir First',2,15,4,'todo','SWISSPORT','+41227991900','depart',null),
  (3,'prive','PRIVÉ','2026-04-29T09:30:00+02:00','M. & Mme Tanaka','Hall arrivées P3',5,25,5,'todo','PRIVE','+41794012222','arrivee',null),
  (4,'dnata','EK453','2026-04-29T11:05:00+02:00','Mr. Yusuf Bin Rashid','T1 Porte A14',6,15,4,'todo','DNATA','+41227177111','depart','{imad}'),
  (5,'swissport','BA729','2026-04-29T10:15:00+02:00','Mr. Julian Whitford','T1 Salon BA',3,15,4,'todo','SWISSPORT','+41227178700','depart','{imad}');
""")

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
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

    # Click Services tab
    page.get_by_text("Services", exact=True).first.click()
    page.wait_for_timeout(1500)
    page.screenshot(path=str(OUT / "01-marc-services-team.png"), full_page=True)
    print(f"  ✓ {OUT}/01-marc-services-team.png")

    body = page.locator("body").inner_text()
    checks = [
        ("Mes services (1)",        "Mes services (1)" in body),
        ("À prendre (2)",           "À prendre (2)" in body),
        ("Reste de l’équipe (2)",   "Reste de l’équipe (2)" in body or "Reste de l'équipe (2)" in body),
        ("VOUS badge",              "VOUS" in body),
        ("À PRENDRE pill",          "À PRENDRE" in body),
        ("EK455 visible (mine)",    "EK455" in body),
        ("LX1820 visible (open)",   "LX1820" in body),
        ("EK453 visible (other)",   "EK453" in body),
    ]
    for label, ok in checks:
        print(f"  {'✓' if ok else '✗'} {label}")

    # Verify "Travailleur" rename in Profile
    page.get_by_text("Profil", exact=True).first.click()
    page.wait_for_timeout(1000)
    profile_text = page.locator("body").inner_text()
    print(f"\n  {'✓' if 'Travailleur' in profile_text and 'Porteur' not in profile_text else '✗'} Profile shows 'Travailleur' (no 'Porteur')")
    page.screenshot(path=str(OUT / "02-marc-profile.png"))

    ctx.close()

    # Verify admin Employés rename
    print("\n[admin] Verify Employés tab now says 'Travailleurs (N)'")
    ctx2 = browser.new_context(viewport={"width": 1440, "height": 900})
    page2 = ctx2.new_page()
    page2.goto(f"{ADMIN}/login", wait_until="networkidle", timeout=20000)
    page2.locator('input[type="email"]').fill(CHEF)
    page2.locator('input[type="password"]').fill(PASSWORD)
    page2.get_by_role("button", name="Se connecter").click()
    page2.wait_for_url(f"{ADMIN}/", timeout=15000)
    page2.goto(f"{ADMIN}/employes", wait_until="networkidle", timeout=15000)
    page2.wait_for_timeout(1500)
    body2 = page2.locator("body").inner_text()
    print(f"  {'✓' if 'Travailleurs' in body2 else '✗'} 'Travailleurs (N)' tab visible")
    print(f"  {'✓' if 'Porteurs' not in body2 else '✗'} 'Porteurs' string GONE")
    page2.screenshot(path=str(OUT / "03-admin-employes.png"), full_page=True)
    ctx2.close()
    browser.close()
print(f"\nScreenshots: {OUT}/")
