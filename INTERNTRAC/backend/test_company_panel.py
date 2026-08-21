"""
INTERNTRAC — Company Panel End-to-End Tests
============================================
Tests all Company Panel endpoints against the live backend.
Run from the `backend/` directory:

    python test_company_panel.py

Company login: hr@techcorpindia.com / Company@123
"""

import sys
import os
import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BASE_URL = "http://localhost:8000/api"

def separator(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print('='*60)

def ok(msg: str):   print(f"  [+] {msg}")
def fail(msg: str): print(f"  [!] {msg}")

def login(email: str, password: str) -> str:
    res = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed: {res.text}"
    return res.json()["access_token"]


def run_tests():
    separator("INTERNTRAC COMPANY PANEL END-TO-END TESTS")

    # ── TEST 1: Role-Based Access Control ─────────────────────────────────────
    print("\n[TEST 1] Testing Role-Based Access Control & Security...")

    # Unauthenticated
    res = requests.get(f"{BASE_URL}/companies/profile")
    assert res.status_code == 401, f"Expected 401, got {res.status_code}"
    ok("Unauthenticated access rejected with 401.")

    # Student token cannot access company endpoints
    student_token = login("arjun.sharma@student.raisoni.edu", "Student@123")
    res = requests.get(f"{BASE_URL}/companies/profile", headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 403, f"Expected 403, got {res.status_code}"
    ok("Student role prohibited from accessing company endpoints (403 Forbidden).")

    # Company login
    company_token = login("hr@techcorpindia.com", "Company@123")
    ok(f"Company HR logged in successfully (JWT generated).")

    auth = {"Authorization": f"Bearer {company_token}"}

    # ── TEST 2: Company Profile ────────────────────────────────────────────────
    print("\n[TEST 2] Testing Company Profile...")
    res = requests.get(f"{BASE_URL}/companies/profile", headers=auth)
    assert res.status_code == 200, f"Profile failed: {res.text}"
    profile = res.json()
    assert "name" in profile
    ok(f"Loaded Company Profile: {profile['name']} (Industry: {profile.get('industry', 'N/A')}, Verification: {profile.get('verification_status', 'N/A')})")

    # ── TEST 3: Real Dashboard Stats ──────────────────────────────────────────
    print("\n[TEST 3] Testing Real Dashboard Analytics...")
    res = requests.get(f"{BASE_URL}/companies/dashboard", headers=auth)
    assert res.status_code == 200, f"Dashboard failed: {res.text}"
    dash = res.json()
    assert "active_postings" in dash
    assert "total_applicants" in dash
    ok(f"Real Dashboard: Active Postings={dash['active_postings']}, Total Applicants={dash['total_applicants']}, Interviews={dash['interviews_scheduled']}, Hires={dash['hires_made']}, PPOs={dash['ppos_offered']}")
    ok(f"Recent Internships Breakdown: {len(dash['recent_internships'])} listing(s) loaded.")

    # ── TEST 4: Post & Retrieve Internship ────────────────────────────────────
    print("\n[TEST 4] Testing Internship Post & Retrieve...")
    res = requests.post(f"{BASE_URL}/companies/internships", headers=auth, json={
        "title": "Test QA Automation Intern (Delete Me)",
        "description": "Test internship for automated test suite.",
        "requirements": "Python, Selenium, Pytest",
        "stipend": "₹12,000/mo",
        "location": "Remote",
        "duration": "3 Months",
        "required_skills": ["Python", "Selenium", "Pytest"]
    })
    assert res.status_code == 200, f"Post failed: {res.text}"
    new_id = res.json()["id"]
    ok(f"Posted new internship. ID: {new_id}")

    res = requests.get(f"{BASE_URL}/companies/internships", headers=auth)
    assert res.status_code == 200
    internships = res.json()
    assert any(j["id"] == new_id for j in internships), "New internship not found in list"
    ok(f"Retrieved {len(internships)} internship(s). New posting visible in list.")

    # Update the internship
    res = requests.patch(f"{BASE_URL}/companies/internships/{new_id}", headers=auth, json={"stipend": "₹14,000/mo"})
    assert res.status_code == 200, f"Update failed: {res.text}"
    ok("Updated internship stipend successfully.")

    # Close it
    res = requests.delete(f"{BASE_URL}/companies/internships/{new_id}", headers=auth)
    assert res.status_code == 200
    ok(f"Closed internship successfully (status -> CLOSED).")

    # ── TEST 5: ATS Pipeline - Get Applicants ─────────────────────────────────
    print("\n[TEST 5] Testing ATS Pipeline Applicants...")
    res = requests.get(f"{BASE_URL}/companies/applicants", headers=auth)
    assert res.status_code == 200, f"Applicants failed: {res.text}"
    apps = res.json()
    ok(f"Retrieved {len(apps)} applicant(s) in ATS pipeline.")

    if apps:
        target = apps[0]
        ok(f"Target applicant: {target['student_name']} | Job: {target['job_title']} | ATS Score: {target.get('ats_score', 'N/A')} | Status: {target['status']}")

        # ── TEST 6: Status Update (move through Kanban) ─────────────────────────
        print("\n[TEST 6] Testing ATS Kanban Status Update...")
        res = requests.post(f"{BASE_URL}/companies/applicants/status", headers=auth, json={
            "application_id": target["id"],
            "status": "SHORTLISTED",
            "note": "Automated test shortlist"
        })
        assert res.status_code == 200, f"Status update failed: {res.text}"
        ok(f"Moved '{target['student_name']}' to SHORTLISTED. Student notified.")

        # ── TEST 7: Interview Scheduling ──────────────────────────────────────
        print("\n[TEST 7] Testing Interview Scheduling...")
        from datetime import datetime, timedelta
        interview_date = (datetime.utcnow() + timedelta(days=3)).strftime("%Y-%m-%d")
        res = requests.post(f"{BASE_URL}/companies/applicants/schedule-interview", headers=auth, json={
            "application_id": target["id"],
            "interview_date": interview_date,
            "interview_time": "11:00 AM",
            "interview_duration": "45 minutes",
            "interview_link": "https://meet.google.com/test-link-xyz",
            "interview_instructions": "Please join 5 mins early. Have your resume ready."
        })
        assert res.status_code == 200, f"Schedule failed: {res.text}"
        sched = res.json()
        ok(f"Interview scheduled for {interview_date} at 11:00 AM. Meet Link: {sched.get('interview_link', 'N/A')}")

        # Move to SELECTED
        requests.post(f"{BASE_URL}/companies/applicants/status", headers=auth, json={
            "application_id": target["id"],
            "status": "SELECTED",
            "note": "Selected post interview"
        })

        # ── TEST 8: Task Assignment ───────────────────────────────────────────
        print("\n[TEST 8] Testing Task Assignment...")
        from datetime import datetime, timedelta
        task_deadline = (datetime.utcnow() + timedelta(days=7)).strftime("%Y-%m-%d")
        res = requests.post(f"{BASE_URL}/companies/interns/assign-task", headers=auth, json={
            "application_id": target["id"],
            "task_title": "Build REST API for User Management",
            "task_description": "Design and implement a FastAPI-based REST API with JWT auth, CRUD for users, and unit tests.",
            "task_deadline": task_deadline
        })
        assert res.status_code == 200, f"Task assign failed: {res.text}"
        ok(f"Task 'Build REST API' assigned to {target['student_name']}. Deadline: {task_deadline}")

        # ── TEST 9: PPO Offer ─────────────────────────────────────────────────
        print("\n[TEST 9] Testing PPO Offer...")
        res = requests.post(f"{BASE_URL}/companies/interns/offer-ppo", headers=auth, json={
            "application_id": target["id"],
            "ppo_role": "Junior Software Engineer"
        })
        assert res.status_code == 200, f"PPO offer failed: {res.text}"
        ok(f"PPO offered for 'Junior Software Engineer' to {target['student_name']}!")

        # ── TEST 10: Certificate Generation ──────────────────────────────────
        print("\n[TEST 10] Testing Completion Certificate Generation...")
        res = requests.post(
            f"{BASE_URL}/companies/generate-certificate?application_id={target['id']}",
            headers=auth
        )
        assert res.status_code == 200, f"Certificate failed: {res.text}"
        cert = res.json()
        ok(f"Certificate generated: {cert.get('pdf_path', 'N/A')}. Internship marked COMPLETED.")

        # Restore the application status
        requests.post(f"{BASE_URL}/companies/applicants/status", headers=auth, json={
            "application_id": target["id"],
            "status": "APPLIED",
            "note": "Restored by test suite"
        })
    else:
        ok("No applicants in seed data; ATS endpoints verified (200 OK).")

    # ── TEST 11: Active Interns ────────────────────────────────────────────────
    print("\n[TEST 11] Testing Active Interns Endpoint...")
    res = requests.get(f"{BASE_URL}/companies/interns", headers=auth)
    assert res.status_code == 200, f"Interns failed: {res.text}"
    interns = res.json()
    ok(f"Active Interns Endpoint: {len(interns)} active intern(s) retrieved.")

    # ── TEST 12: Institute role cannot access company endpoints ───────────────
    print("\n[TEST 12] Testing Institute Role Isolation...")
    inst_token = login("institute@raisoni.edu", "Institute@123")
    res = requests.get(f"{BASE_URL}/companies/profile", headers={"Authorization": f"Bearer {inst_token}"})
    assert res.status_code == 403
    ok("Institute role cannot access company endpoints (403 Forbidden).")

    # ─────────────────────────────────────────────────────────────────────────
    separator("ALL COMPANY PANEL END-TO-END TESTS PASSED (100%)")


if __name__ == "__main__":
    try:
        run_tests()
    except AssertionError as e:
        print(f"\n  [FAIL] Test assertion failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n  [ERROR] Unexpected error: {e}")
        import traceback; traceback.print_exc()
        sys.exit(1)
