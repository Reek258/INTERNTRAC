"""End-to-end test of company-panel email automation.

Flow tested (real SMTP sends):
  1. POST /api/companies/applicants/status          -> SHORTLISTED   => shortlist email
  2. POST /api/companies/applicants/schedule-interview               => interview email
  3. POST /api/companies/applicants/hire-offer                       => offer letter email (+PDF)

db.json is backed up before and restored after the run.
To avoid emailing third parties, the hire-offer target student's email is
temporarily redirected to the SMTP account owner.
"""
import json
import shutil
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BACKUP = "db.json.__email_test_backup__"
shutil.copyfile("db.json", BACKUP)

from fastapi.testclient import TestClient
from app.main import app
from app.api.auth import get_current_user
from app.core.db import get_db

COMPANY_USER = {"id": "0faa224a-8ea5-4a6f-94a0-880d63ab0eaf", "role": "COMPANY", "email": "ethara.@ai.in"}
app.dependency_overrides[get_current_user] = lambda: COMPANY_USER

db = get_db()

# Redirect Dinkky shadani's email to the SMTP owner so the hire-offer test
# does not email a third party. db.json is restored afterwards.
for u in db.data["users"]:
    if u.get("email") == "dinkkyshadani@gmail.com":
        u["email"] = "premborse99@gmail.com"
        print(f"[TEST] Temporarily redirected Dinkky's email -> {u['email']}")

client = TestClient(app)
results = []


def check(name, resp, expect_fields):
    ok = resp.status_code == 200
    body = {}
    try:
        body = resp.json()
    except Exception:
        pass
    for k, v in expect_fields.items():
        if body.get(k) != v:
            ok = False
            print(f"   !! expected {k}={v} got {body.get(k)!r}")
    results.append((name, ok))
    print(f"[{'PASS' if ok else 'FAIL'}] {name} -> HTTP {resp.status_code} | {json.dumps(body)[:300]}\n")


# ── Test 1: Shortlist email ────────────────────────────────────────────────────
print("=" * 70)
print("TEST 1: Shortlist application (APPLIED -> SHORTLISTED)")
r = client.post("/api/companies/applicants/status", json={
    "application_id": "7d69088a-4f23-4819-8499-134afb160785",
    "status": "SHORTLISTED",
    "note": "Impressive projects, moving you forward!",
})
check("shortlist email", r, {"status": "SHORTLISTED", "email_sent": True})

# ── Test 2: Interview email ────────────────────────────────────────────────────
print("=" * 70)
print("TEST 2: Schedule interview")
r = client.post("/api/companies/applicants/schedule-interview", json={
    "application_id": "7d69088a-4f23-4819-8499-134afb160785",
    "interview_date": "2026-08-28",
    "interview_time": "11:00 AM",
    "interview_duration": "45 minutes",
    "interview_link": "https://meet.google.com/interntrac-test",
    "interview_instructions": "Join 10 minutes early. Prepare for a technical round on Python and React.",
})
check("interview email", r, {"status_ok": None, "email_sent": True} if False else {"email_sent": True})
assert r.json().get("interview_link"), "interview_link missing"

# ── Test 3: Hire & offer letter email (with PDF attachment) ────────────────────
print("=" * 70)
print("TEST 3: Hire & send offer letter")
r = client.post("/api/companies/applicants/hire-offer", json={
    "application_id": "8d980fe7-8c91-4070-b6ad-0e434eed4799",
})
body = r.json()
ok = r.status_code == 200 and body.get("email_sent") is True and os.path.exists(body.get("offer_letter_path", ""))
results.append(("hire offer email + PDF", ok))
pdf = body.get("offer_letter_path", "")
size = os.path.getsize(pdf) if os.path.exists(pdf) else 0
print(f"[{'PASS' if ok else 'FAIL'}] hire offer email + PDF -> HTTP {r.status_code} | pdf={pdf} ({size} bytes)\n")

# ── Non-shortlist status must NOT email (control check) ────────────────────────
print("=" * 70)
print("CONTROL: non-shortlist status should not trigger shortlist email payload")
r = client.post("/api/companies/applicants/status", json={
    "application_id": "7d69088a-4f23-4819-8499-134afb160785",
    "status": "UNDER_REVIEW",
    "note": "",
})
body = r.json()
ok = r.status_code == 200 and body.get("email_sent") is False
results.append(("no email on unrelated status", ok))
print(f"[{'PASS' if ok else 'FAIL'}] no email on unrelated status -> HTTP {r.status_code}\n")

# ── Restore DB ─────────────────────────────────────────────────────────────────
shutil.copyfile(BACKUP, "db.json")
os.remove(BACKUP)
print("db.json restored to pre-test state.")

print("=" * 70)
passed = sum(1 for _, ok in results if ok)
print(f"RESULT: {passed}/{len(results)} tests passed")
sys.exit(0 if passed == len(results) else 1)
