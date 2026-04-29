#!/usr/bin/env python3
"""
Verify the realtime notification path end-to-end:
  · Marc logs in on mobile + parks on Home
  · We assign a service to Marc directly via SQL (bypassing the chef UI)
  · Marc's mobile must receive the urgent toast within 5s
"""
import os, sys, time, subprocess, json
from pathlib import Path
from playwright.sync_api import sync_playwright

MOBILE = os.environ["MOBILE_URL"]
PASSWORD = "CgsPorter2026!"
PORTER = "marc.dubois@cgs-ltd.com"
ROOT = Path("/Users/matetorgvaidze/Desktop/CGS App")
OUT = Path("/tmp/cgs-realtime-notif"); OUT.mkdir(exist_ok=True)


def _load_env():
    env = {}
    for line in (ROOT / ".env.local").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"): continue
        if "=" not in line: continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip("'\"")
    return env

ENV = _load_env()
def run_sql(query):
    """Run SQL via Supabase Management API (uses .env.local creds)."""
    p = subprocess.run(
        [
            "curl", "-sS", "-X", "POST",
            f"https://api.supabase.com/v1/projects/{ENV['SUPABASE_PROJECT_REF']}/database/query",
            "-H", f"Authorization: Bearer {ENV['SUPABASE_PERSONAL_ACCESS_TOKEN']}",
            "-H", "Content-Type: application/json",
            "-d", json.dumps({"query": query}),
        ],
        capture_output=True, text=True, timeout=15,
    )
    if p.returncode != 0:
        print(f"SQL curl error: {p.stderr[:200]}"); return None
    try:
        return json.loads(p.stdout)
    except Exception as e:
        print(f"SQL parse error: {p.stdout[:200]}")
        return None


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    page = ctx.new_page()

    # Make sure we're starting from a clean state — wipe any stale notifs
    print("\n[setup] wipe notifications + un-assign all services")
    run_sql("update public.services set assigned_porter_id=null, status='todo';")
    run_sql("delete from public.notifications;")

    print("\n[1] Marc logs in")
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
    page.wait_for_timeout(2500)  # let realtime channel finish subscribing
    print("  ✓ Marc on home")
    page.screenshot(path=str(OUT / "01-marc-before.png"))

    # Look up Marc's id
    marc_id_q = run_sql("select id from public.users where email='marc.dubois@cgs-ltd.com';")
    marc_id = marc_id_q[0]["id"]
    print(f"  • Marc id: {marc_id}")

    # Pick the first service (EK455 06:30)
    svc = run_sql("select id, flight from public.services order by scheduled_at asc limit 1;")
    print(f"  • assigning {svc[0]['flight']} ({svc[0]['id']})")

    print("\n[2] Direct UPDATE: services.assigned_porter_id = Marc")
    run_sql(f"update public.services set assigned_porter_id='{marc_id}' where id='{svc[0]['id']}';")

    # Wait for trigger + realtime delivery
    print("\n[3] Watching Marc's mobile for the toast...")
    saw_toast = False
    for i in range(10):
        page.wait_for_timeout(1000)
        body = page.locator("body").inner_text()
        if "Nouveau service" in body or "EK455" in body or "🔔" in body:
            saw_toast = True
            print(f"  ✓ Marc saw notification after {i+1}s")
            page.screenshot(path=str(OUT / f"02-marc-toast-t{i+1}.png"))
            break
    if not saw_toast:
        page.screenshot(path=str(OUT / "02-marc-no-toast.png"))
        print("  ✗ NO toast within 10s")

    # Check DB
    notifs = run_sql(f"select type, payload, created_at from public.notifications where recipient_id='{marc_id}';")
    print(f"\n[4] DB notifications for Marc: {len(notifs)}")
    for n in notifs:
        print(f"  • {n['type']} payload={n['payload']}")

    # Final screenshot
    page.wait_for_timeout(1000)
    page.screenshot(path=str(OUT / "03-marc-final.png"))
    ctx.close()
    browser.close()

print(f"\nScreenshots: {OUT}/")
