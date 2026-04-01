#!/usr/bin/env python3
"""
gen_test_url.py
───────────────
Generates a signed test URL you can open directly in a browser to
preview the React dashboard WITHOUT needing a real SAP system.

This simulates exactly what the SAP bootstrapper does:
  1. Authenticates against your local FastAPI backend
  2. Gets a JWT
  3. Builds the React app URL with ?token=JWT&sid=...

Usage:
  # Make sure FastAPI is running: uvicorn backend/main:app --port 8000
  python3 scripts/gen_test_url.py
"""

import time
import hmac
import hashlib
import json
import sys
try:
    import requests
except ImportError:
    print("pip install requests")
    sys.exit(1)

# ── Config — match your backend settings ────────────────────────
API_BASE = "http://localhost:8000"
REACT_APP_URL = "http://localhost:5173"   # change to Azure URL for staging
# SHARED_SECRET = "CHANGE_ME_IN_PRODUCTION_use_azure_keyvault"
SHARED_SECRET = "CHANGE_ME_IN_PRODUCTION"
SAP_SID = "DEV"
SAP_CLIENT = "100"
SAP_USER = "DEMO_USER"
DASHBOARD = "borrowings"


def compute_hmac(sid, client, ts, secret):
    msg = f"{sid}{client}{ts}".encode()
    return hmac.new(secret.encode(), msg, hashlib.sha256).hexdigest()


print("\n SAP Analytics Layer — Test URL Generator")
print("─" * 48)

# 1. Auth
ts = int(time.time())
sig = compute_hmac(SAP_SID, SAP_CLIENT, ts, SHARED_SECRET)

print(f"\n→ Authenticating as {SAP_SID}/{SAP_CLIENT} ({SAP_USER})...")
try:
    r = requests.post(f"{API_BASE}/auth/token", json={
        "sap_sid": SAP_SID, "sap_client": SAP_CLIENT,
        "sap_user": SAP_USER, "timestamp": ts, "hmac_sig": sig,
    }, timeout=5)
except requests.ConnectionError:
    print("\n✗ Cannot connect to FastAPI backend.")
    print("  Run: cd backend && uvicorn main:app --port 8000 --reload")
    sys.exit(1)

if not r.ok:
    print(f"\n✗ Auth failed ({r.status_code}): {r.json().get('detail')}")
    sys.exit(1)

token = r.json()["access_token"]
print(f"  ✓ JWT issued (expires in {r.json()['expires_in']}s)")

# 2. Build URL
url = (
    f"{REACT_APP_URL}"
    f"?token={token}"
    f"&sid={SAP_SID}"
    f"&client={SAP_CLIENT}"
    f"&dashboard={DASHBOARD}"
)

print(f"\n✓ Test URL ready!\n")
print(f"  Open this in your browser:\n")
print(f"  {url[:80]}...")
print(f"\n  (Full URL copied below — it's long due to the JWT)\n")
print("─" * 48)
print(url)
print("─" * 48)
print()

# 3. Try to open in browser
try:
    import webbrowser
    webbrowser.open(url)
    print("  → Opened in your default browser automatically.\n")
except:
    print("  → Copy the URL above and open it manually.\n")
