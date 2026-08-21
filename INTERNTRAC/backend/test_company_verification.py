"""End-to-end company verification flow test.

1. Company registers with valid details -> AI auto-approves (AUTO_APPROVED)
2. Auto-approved company CAN post internships
3. TPO rejects the company (manual verification) with a reason
4. Rejected company CANNOT post/update internships (403 + reason shown)
5. Company profile surfaces rejection reason
db.json is backed up before and restored after the run.
"""
import shutil
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BACKUP = "db.json.__verif_test_backup__"
shutil.copyfile("db.json", BACKUP)

from fastapi.testclient import TestClient
from app.main import app
from app.services.groq_service import groq_service

# Deterministic AI verdict for registration (real service already validated separately)
groq_service.verify_company_multistage = lambda **kw: {
    "suggested_status": "AUTO_APPROVED", "decision": "AUTO_APPROVE", "confidence": 0.95,
    "risk_level": "LOW", "deterministic_passed": True, "errors": [],
    "verified_matches": ["CIN conforms to MCA standard.", "GSTIN format valid."],
    "mismatches": [], "reasons": ["All corporate credentials consistent."]
}

client = TestClient(app)
results = []


def record(name, ok, extra=""):
    results.append((name, ok))
    print(f"[{'PASS' if ok else 'FAIL'}] {name} {extra}")


COMPANY = {"name": "TestCorp Demo Pvt Ltd", "email": "testcorp.demo@example.com", "password": "secret123",
           "confirm_password": "secret123", "industry": "Information Technology",
           "website": "https://testcorp-demo.com", "cin": "U72200MH2021PTC123456", "gstin": "27ABCDE1234F1Z5"}

# ── 1. Register: all details correct -> AUTO approved ─────────────────────────
r = client.post("/api/auth/register/company", json=COMPANY)
body = r.json()
record("registration auto-approved by AI", r.status_code == 201 and "AUTO_APPROVED" in body.get("message", ""),
       f"-> HTTP {r.status_code}: {body.get('message')}")

r = client.post("/api/auth/login", json={"email": COMPANY["email"], "password": COMPANY["password"]})
token = r.json().get("access_token")
record("new company can log in", r.status_code == 200 and bool(token))
H = {"Authorization": f"Bearer {token}"}

profile = client.get("/api/companies/profile", headers=H).json()
company_id = profile.get("id")
record("profile shows AUTO_APPROVED status", profile.get("verification_status") == "AUTO_APPROVED",
       f"-> {profile.get('verification_status')}")

# ── 2. Auto-approved company can post ─────────────────────────────────────────
JOB = {"title": "QA Intern", "description": "Testing role", "requirements": "Testing",
       "location": "Remote - Pune", "stipend": "₹10000/month", "duration": "3 Months",
       "required_skills": ["Manual Testing"], "eligible_institute_ids": [], "vacancies": 2, "deadline": None}
r = client.post("/api/companies/internships", headers=H, json=JOB)
job_id = r.json().get("id")
record("auto-approved company posts internship", r.status_code == 200, f"-> HTTP {r.status_code}: {r.json()}")

# ── 3. TPO manual verification: reject ────────────────────────────────────────
TPO = {"id": "df8b5b92-e23f-4d49-bf61-b24ff1c6c9aa", "role": "INSTITUTE"}
app.dependency_overrides[get_current_user := __import__("app.api.auth", fromlist=["get_current_user"]).get_current_user] = lambda: TPO
REASON = "CIN does not match MCA records for the stated legal name."
r = client.post("/api/institutes/companies/verify", json={"company_id": company_id, "status": "REJECTED", "reason": REASON})
record("TPO rejects company with reason", r.status_code == 200 and r.json().get("status") == "REJECTED",
       f"-> HTTP {r.status_code}: {r.json().get('status')}")
app.dependency_overrides.clear()

# ── 4. Rejected company blocked from posting + sees reason ────────────────────
r = client.post("/api/companies/internships", headers=H, json={**JOB, "title": "Second Internship"})
detail = r.json().get("detail", "")
record("rejected company cannot POST internship (403)", r.status_code == 403 and REASON in detail,
       f"-> HTTP {r.status_code}: {detail[:80]}")
r = client.patch(f"/api/companies/internships/{job_id}", headers=H, json={"status": "CLOSED"})
record("rejected company cannot UPDATE internship (403)", r.status_code == 403,
       f"-> HTTP {r.status_code}")

profile = client.get("/api/companies/profile", headers=H).json()
record("company profile exposes rejection reason",
       profile.get("verification_status") == "REJECTED" and profile.get("rejection_reason") == REASON,
       f"-> reason='{(profile.get('rejection_reason') or '')[:50]}...'")

# ── Restore DB ─────────────────────────────────────────────────────────────────
shutil.copyfile(BACKUP, "db.json")
os.remove(BACKUP)
print("\ndb.json restored to pre-test state.")

passed = sum(1 for _, ok in results if ok)
print(f"RESULT: {passed}/{len(results)} tests passed")
sys.exit(0 if passed == len(results) else 1)
