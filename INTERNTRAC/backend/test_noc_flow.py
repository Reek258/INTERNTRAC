"""End-to-end NOC approval test.

Flow: student requests NOC -> TPO approves -> NOC PDF generated + emailed to
student with PDF attached -> document visible in student panel data.
db.json is backed up before and restored after the run.
"""
import shutil
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BACKUP = "db.json.__noc_test_backup__"
shutil.copyfile("db.json", BACKUP)

from fastapi.testclient import TestClient
from app.main import app
from app.api.auth import get_current_user

STUDENT_USER = {"id": "411cad6e-94ec-4b26-9424-5c4ed02c7dc6", "role": "STUDENT", "email": "borseraj072@gmail.com"}
INSTITUTE_USER = {"id": "df8b5b92-e23f-4d49-bf61-b24ff1c6c9aa", "role": "INSTITUTE", "email": "ghribmjal@raisoni.edu"}

client = TestClient(app)
results = []


def record(name, ok, extra=""):
    results.append((name, ok))
    print(f"[{'PASS' if ok else 'FAIL'}] {name} {extra}")


# ── 1. Student requests NOC ────────────────────────────────────────────────────
app.dependency_overrides[get_current_user] = lambda: STUDENT_USER
r = client.post("/api/students/noc-request", json={"internship_id": "1a83f7df-cbc7-48ba-8b72-bacc4662b7c2"})
body = r.json()
record("student submits NOC request", r.status_code == 200 and body.get("status") == "PENDING",
       f"-> HTTP {r.status_code}: {body}")

# ── 2. TPO approves -> PDF + email ─────────────────────────────────────────────
app.dependency_overrides[get_current_user] = lambda: INSTITUTE_USER
r = client.get("/api/institutes/noc-requests")
nocs = r.json()
target = next((n for n in nocs if n["status"] == "PENDING"), None)
record("TPO sees pending NOC request", target is not None,
       f"-> {len(nocs)} NOC(s), target={target['id'][:8] if target else None}")

if target:
    r = client.post("/api/institutes/noc/approve", json={"noc_id": target["id"], "status": "APPROVED"})
    body = r.json()
    pdf_path = body.get("noc_document_path") or ""
    record("approve returns email_sent=True", r.status_code == 200 and body.get("email_sent") is True,
           f"-> HTTP {r.status_code} | detail={body.get('email_detail')}")
    record("NOC PDF generated on disk", pdf_path and os.path.exists(pdf_path) and os.path.getsize(pdf_path) > 500,
           f"-> {pdf_path} ({os.path.getsize(pdf_path) if os.path.exists(pdf_path) else 0} bytes)")

    # ── 3. Student panel sees the approved NOC document ────────────────────────
    app.dependency_overrides[get_current_user] = lambda: STUDENT_USER
    r = client.get("/api/students/applications")
    apps = r.json()
    match = next((a for a in apps if a.get("internship_id") == "1a83f7df-cbc7-48ba-8b72-bacc4662b7c2"), None)
    record("student panel shows APPROVED NOC with download path",
           match is not None and match.get("noc_status") == "APPROVED" and bool(match.get("noc_document_path")),
           f"-> noc_status={match.get('noc_status') if match else None}, doc={match.get('noc_document_path') if match else None}")

# ── Restore DB ─────────────────────────────────────────────────────────────────
shutil.copyfile(BACKUP, "db.json")
os.remove(BACKUP)
print("\ndb.json restored to pre-test state.")

passed = sum(1 for _, ok in results if ok)
print(f"RESULT: {passed}/{len(results)} tests passed")
sys.exit(0 if passed == len(results) else 1)
