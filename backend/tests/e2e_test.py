"""
End-to-end test suite for AWS Route53 Clone backend.
Tests every endpoint: auth, hosted zones, DNS records, import, bulk delete.
"""
import requests
import json
import sys
import os

# Force UTF-8 output on Windows
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = "http://localhost:8001"

results = []

def check(name, condition, detail=""):
    marker = "PASS" if condition else "FAIL"
    suffix = f" [{detail}]" if detail else ""
    print(f"  [{marker}] {name}{suffix}")
    results.append((name, condition))
    return condition

def section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

# ── 1. HEALTH ────────────────────────────────────────────────
section("1. Health Check")
r = requests.get(f"{BASE}/health")
check("GET /health -> 200", r.status_code == 200)
check("health.status == ok", r.json().get("status") == "ok")

# ── 2. AUTH ──────────────────────────────────────────────────
section("2. Authentication")

r = requests.post(f"{BASE}/api/v1/auth/login", json={"email": "bad@bad.com", "password": "wrong"})
check("POST /auth/login (bad creds) -> 401", r.status_code == 401)

r = requests.post(f"{BASE}/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
check("POST /auth/login (good creds) -> 200", r.status_code == 200)
data = r.json()
check("Response has token", "token" in data)
check("Response has user.email", data.get("user", {}).get("email") == "admin@example.com")
TOKEN = data.get("token", "")
HEADERS = {"Authorization": f"Bearer {TOKEN}"}

r = requests.get(f"{BASE}/api/v1/auth/me", headers=HEADERS)
check("GET /auth/me (valid token) -> 200", r.status_code == 200)
check("/auth/me returns correct user", r.json().get("email") == "admin@example.com")

r = requests.get(f"{BASE}/api/v1/auth/me")
check("GET /auth/me (no token) -> 401", r.status_code == 401)

# ── 3. HOSTED ZONES ──────────────────────────────────────────
section("3. Hosted Zones - CRUD")

r = requests.get(f"{BASE}/api/v1/hosted-zones", headers=HEADERS)
check("GET /hosted-zones -> 200", r.status_code == 200)
zones_data = r.json()
check("Response has items list", "items" in zones_data)
check("Response has total", "total" in zones_data)
check("Response has page", "page" in zones_data)
check("Response has page_size", "page_size" in zones_data)
initial_total = zones_data.get("total", 0)
check(f"At least 2 seeded zones exist", initial_total >= 2, f"got {initial_total}")

r = requests.get(f"{BASE}/api/v1/hosted-zones?q=example", headers=HEADERS)
check("GET /hosted-zones?q=example -> 200", r.status_code == 200)
check("Search returns results", r.json().get("total", 0) >= 1)

r = requests.get(f"{BASE}/api/v1/hosted-zones?q=NORESULT_XYZ123", headers=HEADERS)
check("GET /hosted-zones?q=NORESULT_XYZ123 -> 0 results", r.json().get("total", 1) == 0)

r = requests.get(f"{BASE}/api/v1/hosted-zones?page=1&page_size=1", headers=HEADERS)
check("Pagination: page_size=1 returns 1 item", len(r.json().get("items", [])) == 1)

# Create zone
r = requests.post(f"{BASE}/api/v1/hosted-zones", headers=HEADERS, json={
    "domain_name": "testzone-e2e.com",
    "type": "PUBLIC",
    "comment": "E2E test zone"
})
check("POST /hosted-zones (create) -> 201", r.status_code == 201)
zone = r.json()
ZONE_ID = zone.get("id", "")
check("Created zone domain correct", zone.get("domain_name") == "testzone-e2e.com.")
check("Created zone has 2 auto-records (NS+SOA)", zone.get("record_count") == 2)
check("Zone ID starts with Z", ZONE_ID.startswith("Z"))
check("Zone type is PUBLIC", zone.get("type") == "PUBLIC")

# Duplicate -> 409
r = requests.post(f"{BASE}/api/v1/hosted-zones", headers=HEADERS, json={
    "domain_name": "testzone-e2e.com", "type": "PUBLIC"
})
check("POST /hosted-zones (duplicate domain) -> 409", r.status_code == 409)

# Get by ID
r = requests.get(f"{BASE}/api/v1/hosted-zones/{ZONE_ID}", headers=HEADERS)
check("GET /hosted-zones/{id} -> 200", r.status_code == 200)
check("Correct zone returned", r.json().get("id") == ZONE_ID)

# Non-existent zone
r = requests.get(f"{BASE}/api/v1/hosted-zones/ZNOTEXIST", headers=HEADERS)
check("GET /hosted-zones/ZNOTEXIST -> 404", r.status_code == 404)

# Unauthenticated access
r = requests.get(f"{BASE}/api/v1/hosted-zones")
check("GET /hosted-zones (no auth) -> 401", r.status_code == 401)

# Update
r = requests.put(f"{BASE}/api/v1/hosted-zones/{ZONE_ID}", headers=HEADERS, json={
    "comment": "Updated by E2E"
})
check("PUT /hosted-zones/{id} -> 200", r.status_code == 200)
check("Comment updated", r.json().get("comment") == "Updated by E2E")

# ── 4. DNS RECORDS ───────────────────────────────────────────
section("4. DNS Records - CRUD (all 9 types)")

RECORDS_URL = f"{BASE}/api/v1/hosted-zones/{ZONE_ID}/records"

# List - verify auto-created system records
r = requests.get(RECORDS_URL, headers=HEADERS)
check("GET /records -> 200", r.status_code == 200)
rdata = r.json()
record_items = rdata.get("items", [])
check("Records list has items", len(record_items) >= 2)
check("NS auto-created and is_system", any(rec["type"] == "NS" and rec["is_system"] for rec in record_items))
check("SOA auto-created and is_system", any(rec["type"] == "SOA" and rec["is_system"] for rec in record_items))
ns_rec = next((rec for rec in record_items if rec["type"] == "NS"), None)
SOA_ID = next((rec["id"] for rec in record_items if rec["type"] == "SOA"), None)
NS_ID = ns_rec["id"] if ns_rec else None

# A record
r = requests.post(RECORDS_URL, headers=HEADERS, json={"name": "testzone-e2e.com.", "type": "A", "ttl": 300, "values": ["1.2.3.4"]})
check("POST A record -> 201", r.status_code == 201)
A_ID = r.json().get("id", "")
check("A record values correct", r.json().get("values") == ["1.2.3.4"])

# AAAA record
r = requests.post(RECORDS_URL, headers=HEADERS, json={"name": "testzone-e2e.com.", "type": "AAAA", "ttl": 300, "values": ["2001:db8::1"]})
check("POST AAAA record -> 201", r.status_code == 201)
AAAA_ID = r.json().get("id", "")

# CNAME record
r = requests.post(RECORDS_URL, headers=HEADERS, json={"name": "www.testzone-e2e.com.", "type": "CNAME", "ttl": 300, "values": ["testzone-e2e.com."]})
check("POST CNAME record -> 201", r.status_code == 201)
CNAME_ID = r.json().get("id", "")

# TXT record
r = requests.post(RECORDS_URL, headers=HEADERS, json={"name": "testzone-e2e.com.", "type": "TXT", "ttl": 300, "values": ["v=spf1 ~all"]})
check("POST TXT record -> 201", r.status_code == 201)
TXT_ID = r.json().get("id", "")

# MX record
r = requests.post(RECORDS_URL, headers=HEADERS, json={"name": "testzone-e2e.com.", "type": "MX", "ttl": 300, "values": [{"priority": 10, "hostname": "mail.testzone-e2e.com."}]})
check("POST MX record -> 201", r.status_code == 201)
MX_ID = r.json().get("id", "")
check("MX values stored correctly", r.json().get("values") == [{"priority": 10, "hostname": "mail.testzone-e2e.com."}])

# NS record (non-system)
r = requests.post(RECORDS_URL, headers=HEADERS, json={"name": "sub.testzone-e2e.com.", "type": "NS", "ttl": 300, "values": ["ns1.sub.testzone-e2e.com."]})
check("POST NS record (non-system) -> 201", r.status_code == 201)
NS_SUB_ID = r.json().get("id", "")

# PTR record
r = requests.post(RECORDS_URL, headers=HEADERS, json={"name": "4.3.2.1.in-addr.arpa.", "type": "PTR", "ttl": 300, "values": ["testzone-e2e.com."]})
check("POST PTR record -> 201", r.status_code == 201)
PTR_ID = r.json().get("id", "")

# SRV record
r = requests.post(RECORDS_URL, headers=HEADERS, json={"name": "_sip._tcp.testzone-e2e.com.", "type": "SRV", "ttl": 300, "values": [{"priority": 10, "weight": 20, "port": 5060, "target": "sip.testzone-e2e.com."}]})
check("POST SRV record -> 201", r.status_code == 201)
SRV_ID = r.json().get("id", "")

# CAA record
r = requests.post(RECORDS_URL, headers=HEADERS, json={"name": "testzone-e2e.com.", "type": "CAA", "ttl": 300, "values": [{"flag": 0, "tag": "issue", "value": "letsencrypt.org"}]})
check("POST CAA record -> 201", r.status_code == 201)
CAA_ID = r.json().get("id", "")

# Verify record_count reflects all records
r = requests.get(f"{BASE}/api/v1/hosted-zones/{ZONE_ID}", headers=HEADERS)
rc = r.json().get("record_count", 0)
check(f"Zone record_count updated after creates", rc >= 10, f"got {rc}")

# Filter by type
r = requests.get(f"{RECORDS_URL}?type=MX", headers=HEADERS)
check("GET /records?type=MX only returns MX", all(rec["type"] == "MX" for rec in r.json()["items"]))

# Search
r = requests.get(f"{RECORDS_URL}?q=www", headers=HEADERS)
check("GET /records?q=www finds CNAME", any("www" in rec["name"] for rec in r.json()["items"]))

# Pagination
r = requests.get(f"{RECORDS_URL}?page=1&page_size=2", headers=HEADERS)
check("Records pagination: page_size=2 returns 2", len(r.json().get("items", [])) == 2)

# GET single record
r = requests.get(f"{RECORDS_URL}/{A_ID}", headers=HEADERS)
check("GET /records/{id} -> 200", r.status_code == 200)
check("Correct record returned", r.json().get("id") == A_ID)

# GET non-existent record
r = requests.get(f"{RECORDS_URL}/nonexistent-id", headers=HEADERS)
check("GET /records/nonexistent -> 404", r.status_code == 404)

# Update record
r = requests.put(f"{RECORDS_URL}/{A_ID}", headers=HEADERS, json={"ttl": 600, "values": ["1.2.3.4", "5.6.7.8"]})
check("PUT /records/{id} (update TTL+values) -> 200", r.status_code == 200)
check("TTL updated to 600", r.json().get("ttl") == 600)
check("Values updated to 2 IPs", len(r.json().get("values", [])) == 2)

# Try to DELETE system SOA -> 403
if SOA_ID:
    r = requests.delete(f"{RECORDS_URL}/{SOA_ID}", headers=HEADERS)
    check("DELETE system SOA -> 403 (protected)", r.status_code == 403)

# Try to DELETE system NS -> 403
if NS_ID:
    r = requests.delete(f"{RECORDS_URL}/{NS_ID}", headers=HEADERS)
    check("DELETE system NS -> 403 (protected)", r.status_code == 403)

# DELETE single non-system record
r = requests.delete(f"{RECORDS_URL}/{CNAME_ID}", headers=HEADERS)
check("DELETE /records/{id} (CNAME) -> 204", r.status_code == 204)

r = requests.get(f"{RECORDS_URL}/{CNAME_ID}", headers=HEADERS)
check("GET deleted CNAME -> 404", r.status_code == 404)

# ── 5. IMPORT — BIND ─────────────────────────────────────────
section("5. Import - BIND Zone File")

BIND_TEXT = (
    "$ORIGIN testzone-e2e.com.\n"
    "$TTL 60\n"
    "import-a IN A 192.168.1.1\n"
    "import-www IN CNAME testzone-e2e.com.\n"
    "import-mail IN MX 10 mail.testzone-e2e.com.\n"
)
r = requests.post(f"{RECORDS_URL}/import/bind", headers=HEADERS, json={
    "bind_text": BIND_TEXT,
    "origin": "testzone-e2e.com.",
    "skip_existing": True
})
check("POST /records/import/bind -> 200", r.status_code == 200)
imp = r.json()
check("Import created >= 3 records", imp.get("created", 0) >= 3, f"created={imp.get('created')}")
check("Import response has 'skipped'", "skipped" in imp)
check("Import response has 'total'", "total" in imp)
check("total = created + skipped", imp.get("total") == imp.get("created", 0) + imp.get("skipped", 0))

# Re-import same (skip_existing=True) -> 0 created
r = requests.post(f"{RECORDS_URL}/import/bind", headers=HEADERS, json={
    "bind_text": BIND_TEXT,
    "origin": "testzone-e2e.com.",
    "skip_existing": True
})
check("Re-import with skip_existing=True -> 0 created", r.json().get("created", 1) == 0)

# Re-import with skip_existing=False -> creates duplicates
r = requests.post(f"{RECORDS_URL}/import/bind", headers=HEADERS, json={
    "bind_text": BIND_TEXT,
    "origin": "testzone-e2e.com.",
    "skip_existing": False
})
check("Re-import with skip_existing=False -> creates records", r.json().get("created", 0) >= 3)

# ── 6. IMPORT — JSON ─────────────────────────────────────────
section("6. Import - JSON")

json_records = [
    {"name": "json-a.testzone-e2e.com.", "type": "A", "ttl": 300, "values": ["10.0.0.1"]},
    {"name": "json-txt.testzone-e2e.com.", "type": "TXT", "ttl": 300, "values": ["hello e2e"]},
    {"name": "testzone-e2e.com.", "type": "SOA", "ttl": 900, "values": ["ignored SOA"]},  # SOA must be skipped
]
r = requests.post(f"{RECORDS_URL}/import/json", headers=HEADERS, json={
    "records": json_records,
    "skip_existing": True
})
check("POST /records/import/json -> 200", r.status_code == 200)
imp2 = r.json()
check("JSON import created 2 (SOA skipped)", imp2.get("created", 0) == 2, f"created={imp2.get('created')}")
check("JSON import skipped >= 1 (SOA)", imp2.get("skipped", 0) >= 1)

# ── 7. BULK DELETE ───────────────────────────────────────────
section("7. Bulk Delete Records")

r = requests.get(f"{RECORDS_URL}?page_size=100", headers=HEADERS)
all_recs = r.json().get("items", [])
deletable = [rec["id"] for rec in all_recs if not rec["is_system"]]
check(f"Have deletable records for bulk test", len(deletable) >= 3, f"got {len(deletable)}")

bulk_ids = deletable[:3]
r = requests.delete(RECORDS_URL, headers=HEADERS, json={"ids": bulk_ids})
check("DELETE /records (bulk) body with ids -> 200", r.status_code == 200)
bdata = r.json()
check(f"Bulk deleted correct count", bdata.get("deleted", 0) == 3, f"deleted={bdata.get('deleted')}")

# Try bulk delete with system record IDs mixed in - system ones must be skipped
r = requests.get(f"{RECORDS_URL}?page_size=100", headers=HEADERS)
remaining = r.json().get("items", [])
sys_ids = [rec["id"] for rec in remaining if rec["is_system"]]
non_sys_ids = [rec["id"] for rec in remaining if not rec["is_system"]]
mixed = sys_ids[:1] + non_sys_ids[:1] if sys_ids and non_sys_ids else non_sys_ids[:1]
r = requests.delete(RECORDS_URL, headers=HEADERS, json={"ids": mixed})
check("Bulk delete with system IDs mixed -> skips system", r.json().get("deleted", 0) == len([i for i in mixed if i in non_sys_ids]))

# Empty ids list -> 0 deleted
r = requests.delete(RECORDS_URL, headers=HEADERS, json={"ids": []})
check("Bulk delete with empty ids -> 0 deleted", r.json().get("deleted", 0) == 0)

# Verify record_count after bulk delete
r = requests.get(f"{BASE}/api/v1/hosted-zones/{ZONE_ID}", headers=HEADERS)
rc_after = r.json().get("record_count", -1)
check(f"record_count >= 2 after bulk delete (NS+SOA still exist)", rc_after >= 2, f"got {rc_after}")

# ── 8. ZONE DELETE ───────────────────────────────────────────
section("8. Zone Deletion and Cascade")

r = requests.delete(f"{BASE}/api/v1/hosted-zones/{ZONE_ID}", headers=HEADERS)
check("DELETE /hosted-zones/{id} -> 204", r.status_code == 204)

r = requests.get(f"{BASE}/api/v1/hosted-zones/{ZONE_ID}", headers=HEADERS)
check("GET deleted zone -> 404", r.status_code == 404)

# Records of deleted zone must also be gone
r = requests.get(RECORDS_URL, headers=HEADERS)
check("GET records of deleted zone -> 404 (cascade)", r.status_code == 404)

# ── 9. LOGOUT ────────────────────────────────────────────────
section("9. Logout")

r = requests.post(f"{BASE}/api/v1/auth/logout", headers=HEADERS)
check("POST /auth/logout -> 200", r.status_code == 200)

r = requests.get(f"{BASE}/api/v1/auth/me", headers=HEADERS)
check("GET /auth/me after logout -> 401", r.status_code == 401)

# ── SUMMARY ──────────────────────────────────────────────────
print(f"\n{'='*60}")
passed = sum(1 for _, ok in results if ok)
failed = sum(1 for _, ok in results if not ok)
print(f"  RESULTS: {passed} passed  |  {failed} failed  |  {len(results)} total")
print(f"{'='*60}")

if failed:
    print("\nFailed tests:")
    for name, ok in results:
        if not ok:
            print(f"  [FAIL] {name}")
    sys.exit(1)
else:
    print("\n  All tests passed!")
    sys.exit(0)
