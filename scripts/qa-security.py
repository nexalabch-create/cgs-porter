#!/usr/bin/env python3
"""Verify the privilege-escalation hole is closed: porter cannot make
themselves chef anymore (migration 0011 dropped 'users: update own row').
"""
import os, json, subprocess, sys
from pathlib import Path

ROOT = Path("/Users/matetorgvaidze/Desktop/CGS App")
PASSWORD = "CgsPorter2026!"
PORTER = "marc.dubois@cgs-ltd.com"

def _load_env():
    env = {}
    for line in (ROOT / ".env.local").read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line: continue
        k, v = line.split("=", 1)
        env[k.strip()] = v.strip().strip("'\"")
    return env

ENV = _load_env()
URL = ENV["VITE_SUPABASE_URL"]
ANON = ENV["VITE_SUPABASE_ANON_KEY"]

def post(path, data, token=None):
    headers = ["-H", f"apikey: {ANON}", "-H", "Content-Type: application/json"]
    if token:
        headers += ["-H", f"Authorization: Bearer {token}"]
    p = subprocess.run(
        ["curl", "-sS", "-X", "POST", f"{URL}{path}"] + headers + ["-d", json.dumps(data)],
        capture_output=True, text=True, timeout=15,
    )
    return p.stdout

def patch(path, data, token):
    headers = ["-H", f"apikey: {ANON}", "-H", "Content-Type: application/json",
               "-H", f"Authorization: Bearer {token}", "-H", "Prefer: return=representation"]
    p = subprocess.run(
        ["curl", "-sS", "-X", "PATCH", f"{URL}{path}"] + headers + ["-d", json.dumps(data)],
        capture_output=True, text=True, timeout=15,
    )
    return p.stdout

# 1. sign in as Marc
print("\n[1] Sign in as Marc (porter)…")
resp = post("/auth/v1/token?grant_type=password", {"email": PORTER, "password": PASSWORD})
session = json.loads(resp)
token = session.get("access_token")
marc_id = session.get("user", {}).get("id")
assert token, f"sign in failed: {resp}"
print(f"    ✓ token acquired, id={marc_id}")

# 2. attempt to set role='chef' on own row
print("\n[2] Attempt privilege escalation: UPDATE users SET role='chef' WHERE id = me…")
resp = patch(f"/rest/v1/users?id=eq.{marc_id}", {"role": "chef"}, token)
print(f"    Response: {resp[:200]}")

# 3. verify the role on the BD didn't change
print("\n[3] Re-fetch own row to check actual role…")
import urllib.request
req = urllib.request.Request(
    f"{URL}/rest/v1/users?id=eq.{marc_id}&select=role",
    headers={"apikey": ANON, "Authorization": f"Bearer {token}"},
)
data = json.loads(urllib.request.urlopen(req).read())
actual_role = data[0]["role"] if data else "<not found>"
print(f"    Marc's role in BD: {actual_role}")
print(f"    {'✓ SECURITY OK — porter could not escalate' if actual_role == 'porter' else '✗ SECURITY HOLE — porter became chef!'}")
sys.exit(0 if actual_role == "porter" else 1)
