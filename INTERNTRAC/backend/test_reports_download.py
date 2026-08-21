"""Report download test: TPO and HOD can download all report CSVs.

Verifies role gating (FACULTY_MENTOR blocked), all 6 report types return
valid CSV with headers, and invalid type is rejected.
db.json is backed up before and restored after the run.
"""
import shutil
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BACKUP = "db.json.__reports_test_backup__"
shutil.copyfile("db.json", BACKUP)

from fastapi.testclient import TestClient
from app.main import app
from app.api.auth import get_current_user

client = TestClient(app)
results = []


def record(name, ok, extra=""):
    results.append((name, ok))
    print(f"[{'PASS' if ok else 'FAIL'}] {name} {extra}")


TPO = {"id": "df8b5b92-e23f-4d49-bf61-b24ff1c6c9aa", "role": "INSTITUTE"}
app.dependency_overrides[get_current_user] = lambda: TPO

REPORTS = {
    "students": ["Name", "Email", "Branch", "CGPA", "Mentor"],
    "applications": ["Student", "Company", "Status", "ATS Score"],
    "companies": ["Company", "Verification Status", "Reviewed By"],
    "noc": ["Student", "NOC Status", "Document Available"],
    "attendance": ["Student", "Date", "Hours Worked", "Approval Status"],
    "placement_summary": ["Placement Summary", "Total Students", "Branch-Wise Placement Report"],
}

for rtype, expected_headers in REPORTS.items():
    r = client.get(f"/api/institutes/reports/download?report_type={rtype}")
    text = r.text
    has_headers = all(h in text for h in expected_headers)
    is_csv = "text/csv" in r.headers.get("content-type", "")
    has_filename = "attachment" in r.headers.get("content-disposition", "")
    record(f"TPO downloads '{rtype}' report", r.status_code == 200 and is_csv and has_headers and has_filename,
           f"-> HTTP {r.status_code}, {len(text)} bytes, disposition={'yes' if has_filename else 'no'}")

# Invalid type rejected
r = client.get("/api/institutes/reports/download?report_type=hacker")
record("invalid report type rejected (400)", r.status_code == 400, f"-> HTTP {r.status_code}")

# FACULTY_MENTOR blocked — find a mentor profile
db_data = __import__("json").load(open("db.json", encoding="utf-8"))
mentor_profile = next((p for p in db_data["institute_profiles"] if p.get("institute_role") == "FACULTY_MENTOR"), None)
if mentor_profile:
    app.dependency_overrides[get_current_user] = lambda: {"id": mentor_profile["user_id"], "role": "INSTITUTE"}
    r = client.get("/api/institutes/reports/download?report_type=students")
    record("faculty mentor blocked from reports (403)", r.status_code == 403, f"-> HTTP {r.status_code}")
else:
    print("[SKIP] No faculty mentor in db to test blocking")

# HOD_ADMIN allowed — find HOD profile
hod_profile = next((p for p in db_data["institute_profiles"] if p.get("institute_role") == "HOD_ADMIN"), None)
if hod_profile:
    app.dependency_overrides[get_current_user] = lambda: {"id": hod_profile["user_id"], "role": "INSTITUTE"}
    r = client.get("/api/institutes/reports/download?report_type=placement_summary")
    record("HOD downloads placement summary", r.status_code == 200 and "Placement Summary" in r.text,
           f"-> HTTP {r.status_code}")
else:
    print("[SKIP] No HOD_ADMIN in db to test access")

# ── Restore DB ─────────────────────────────────────────────────────────────────
shutil.copyfile(BACKUP, "db.json")
os.remove(BACKUP)
print("\ndb.json restored to pre-test state.")

passed = sum(1 for _, ok in results if ok)
print(f"RESULT: {passed}/{len(results)} tests passed")
sys.exit(0 if passed == len(results) else 1)
