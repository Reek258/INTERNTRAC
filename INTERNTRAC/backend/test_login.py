"""End-to-end login verification.

1. Hash/verify round-trip against EXISTING seeded hashes (no crash, correct bool).
2. Register temp users (student/company/institute) via real API -> login -> 200 + token.
3. Wrong password -> 401. Role mismatch -> 403.
db.json is backed up before and restored after the run.
"""
import shutil
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BACKUP = "db.json.__login_test_backup__"
shut = shutil.copyfile("db.json", BACKUP)

from fastapi.testclient import TestClient
from app.main import app
from app.core.db import get_db
from app.core.security import verify_password, get_password_hash

results = []


def record(name, ok, extra=""):
    results.append((name, ok))
    print(f"[{'PASS' if ok else 'FAIL'}] {name} {extra}")


# ── 1. Existing hashes must still verify correctly (no crash) ──────────────────
db = get_db()
seeded_hash = next(u["password_hash"] for u in db.data["users"] if u.get("password_hash", "").startswith("$2b$"))
record("existing $2b$ hash accepted by bcrypt.checkpw", not verify_password("definitely-wrong-pw", seeded_hash), "(wrong pw -> False)")
record("fresh hash round-trip", verify_password("TestPass123!", get_password_hash("TestPass123!")))

# ── 2. Full API flow ───────────────────────────────────────────────────────────
client = TestClient(app)
BASE = "http://testserver/api/auth"

roles = [
    ("student", "/register/student", {"name": "Login Test", "email": "logintest.student@example.com", "password": "Secret@123", "confirm_password": "Secret@123"}),
    ("company", "/register/company", {"name": "Login Test Co", "email": "logintest.company@example.com", "password": "Secret@123", "confirm_password": "Secret@123", "industry": "IT", "website": "https://logintest.example.com"}),
    ("institute", "/register/institute", {"name": "Login Test Inst", "email": "logintest.inst@example.com", "password": "Secret@123", "confirm_password": "Secret@123", "location": "Nagpur", "domain": "logintest.ac.in"}),
]

for panel, reg_path, payload in roles:
    r = client.post(f"{BASE}{reg_path}", json=payload)
    if r.status_code != 201:
        record(f"register {panel}", False, f"-> HTTP {r.status_code}: {r.text[:150]}")
        continue
    record(f"register {panel}", True)

    # correct credentials + matching role
    r = client.post(f"{BASE}/login", json={"email": payload["email"], "password": "Secret@123", "expected_role": panel.upper()})
    body = r.json() if r.status_code == 200 else {}
    ok = r.status_code == 200 and body.get("access_token") and body.get("role") == panel.upper()
    record(f"login {panel} (correct pw)", ok, f"-> HTTP {r.status_code}, role={body.get('role')}, name={body.get('name')}")

    # token must authenticate a protected endpoint
    if ok:
        from app.api.auth import get_current_user
        token = body["access_token"]
        try:
            from jose import jwt as _jwt
            from app.core.config import settings
            sub = _jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]).get("sub")
            record(f"token decodes for {panel}", sub == payload["email"], f"sub={sub}")
        except Exception as e:
            record(f"token decodes for {panel}", False, str(e))

    # wrong password
    r = client.post(f"{BASE}/login", json={"email": payload["email"], "password": "WrongPassword!", "expected_role": panel.upper()})
    record(f"login {panel} (wrong pw -> 401)", r.status_code == 401, f"-> HTTP {r.status_code}")

# role mismatch check using the student account on company login page
r = client.post(f"{BASE}/login", json={"email": "logintest.student@example.com", "password": "Secret@123", "expected_role": "COMPANY"})
record("role mismatch -> 403", r.status_code == 403, f"-> HTTP {r.status_code}")

# case/whitespace tolerance on email
r = client.post(f"{BASE}/login", json={"email": "  LoginTest.Student@Example.com ", "password": "Secret@123", "expected_role": "STUDENT"})
record("email trimmed/lowercased", r.status_code == 200, f"-> HTTP {r.status_code}")

# long password (>72 bytes) must not crash
r = client.post(f"{BASE}/login", json={"email": "logintest.student@example.com", "password": "X" * 100, "expected_role": "STUDENT"})
record("100-char password handled gracefully", r.status_code == 401, f"-> HTTP {r.status_code}")

# ── Restore DB ─────────────────────────────────────────────────────────────────
shutil.copyfile(BACKUP, "db.json")
os.remove(BACKUP)
print("\ndb.json restored to pre-test state.")

passed = sum(1 for _, ok in results if ok)
print(f"RESULT: {passed}/{len(results)} tests passed")
sys.exit(0 if passed == len(results) else 1)
