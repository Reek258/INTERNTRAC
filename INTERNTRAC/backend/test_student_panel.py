import sys
import os
import io
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.core.db import SessionLocal, engine, Base
from app.models.models import User, StudentProfile, Internship, Application, Notification

client = TestClient(app)

def run_tests():
    print("\n=======================================================")
    print("       INTERNTRAC STUDENT PANEL END-TO-END TESTS       ")
    print("=======================================================\n")

    # 1. Registration tests
    print("[TEST 1] Testing Student Registration Validations...")
    
    # 1a. Invalid Email
    res = client.post("/api/auth/register/student", json={
        "name": "Test Student",
        "email": "invalidemail",
        "mobile": "9876543210",
        "password": "Password123",
        "confirm_password": "Password123"
    })
    assert res.status_code == 400, f"Expected 400 for invalid email, got {res.status_code}"
    print("  [+] Invalid email rejected correctly (400):", res.json()["detail"])

    # 1b. Invalid Mobile (less than 10 digits)
    res = client.post("/api/auth/register/student", json={
        "name": "Test Student",
        "email": "test.student1@raisoni.edu",
        "mobile": "98765",
        "password": "Password123",
        "confirm_password": "Password123"
    })
    assert res.status_code == 400, f"Expected 400 for short mobile, got {res.status_code}"
    print("  [+] Invalid mobile (< 10 digits) rejected correctly:", res.json()["detail"])

    # 1c. Password Mismatch
    res = client.post("/api/auth/register/student", json={
        "name": "Test Student",
        "email": "test.student1@raisoni.edu",
        "mobile": "9876543210",
        "password": "Password123",
        "confirm_password": "MismatchPassword"
    })
    assert res.status_code == 400, f"Expected 400 for password mismatch, got {res.status_code}"
    print("  [+] Password mismatch rejected correctly:", res.json()["detail"])

    # 1d. Successful Student Registration
    test_email = f"student.test.{os.getpid()}@raisoni.edu"
    test_mobile = f"98765{str(os.getpid()).zfill(5)}"[:10]
    res = client.post("/api/auth/register/student", json={
        "name": "Rohan Deshmukh",
        "email": test_email,
        "mobile": test_mobile,
        "password": "SecurePassword123",
        "confirm_password": "SecurePassword123",
        "degree": "B.Tech",
        "branch": "Computer Science",
        "semester": "Semester 7",
        "cgpa": 8.5
    })
    assert res.status_code == 201, f"Expected 201 for valid registration, got {res.status_code}: {res.text}"
    print(f"  [+] Valid student registered successfully (201): {test_email}")

    # 1e. Duplicate Email Rejection
    res = client.post("/api/auth/register/student", json={
        "name": "Rohan Deshmukh Duplicate",
        "email": test_email,
        "mobile": "9999999999",
        "password": "SecurePassword123",
        "confirm_password": "SecurePassword123"
    })
    assert res.status_code == 400, f"Expected 400 for duplicate email, got {res.status_code}"
    print("  [+] Duplicate email prevented correctly:", res.json()["detail"])

    # 2. Login Tests
    print("\n[TEST 2] Testing Student Login & Authentication...")
    
    # 2a. Wrong Password
    res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "WrongPassword!"
    })
    assert res.status_code == 401, f"Expected 401 for wrong password, got {res.status_code}"
    print("  [+] Wrong password rejected correctly (401):", res.json()["detail"])

    # 2b. Valid Login
    res = client.post("/api/auth/login", json={
        "email": test_email,
        "password": "SecurePassword123"
    })
    assert res.status_code == 200, f"Expected 200 for valid login, got {res.status_code}"
    login_data = res.json()
    token = login_data["access_token"]
    assert login_data["role"] == "STUDENT"
    assert "access_token" in login_data
    print("  [+] Student logged in successfully. JWT Access Token generated.")
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Student Profile CRUD
    print("\n[TEST 3] Testing Student Profile Management...")
    res = client.get("/api/students/profile", headers=headers)
    assert res.status_code == 200
    p = res.json()
    assert p["name"] == "Rohan Deshmukh"
    assert p["email"] == test_email
    print("  [+] Fetched profile data successfully:", p["name"], f"({p['degree']} {p['branch']})")

    # 3b. Update Profile with skills & CGPA
    res = client.put("/api/students/profile", headers=headers, json={
        "name": "Rohan Deshmukh",
        "mobile": test_mobile,
        "skills": ["Python", "FastAPI", "React", "Docker", "python", "REACT"], # duplicate testing
        "degree": "B.Tech",
        "branch": "Computer Science",
        "semester": "Semester 7 / Year 4",
        "cgpa": 8.75,
        "graduation_year": 2025,
        "github_url": "https://github.com/rohand",
        "linkedin_url": "https://linkedin.com/in/rohand",
        "certifications": [
            {
                "name": "Certified Kubernetes Application Developer",
                "issuer": "CNCF",
                "issue_date": "2024-06-01",
                "credential_id": "CKAD-987123",
                "credential_url": "https://cncf.io/verify"
            }
        ]
    })
    assert res.status_code == 200
    print("  [+] Profile updated with skills & certifications.")

    # Verify deduplication
    res = client.get("/api/students/profile", headers=headers)
    p_updated = res.json()
    assert len(p_updated["skills"]) == 4, f"Expected 4 unique skills, got {p_updated['skills']}"
    assert p_updated["cgpa"] == 8.75
    assert len(p_updated["certifications"]) == 1
    print("  [+] Skill deduplication verified:", p_updated["skills"])

    # 4. Resume Upload Test
    print("\n[TEST 4] Testing Resume Upload & Skill Auto-Extraction...")
    
    # 4a. Unsupported file extension
    fake_exe = io.BytesIO(b"malicious executable content")
    res = client.post(
        "/api/students/profile/resume",
        headers=headers,
        files={"file": ("virus.exe", fake_exe, "application/octet-stream")}
    )
    assert res.status_code == 400
    print("  [+] Unsupported file type (.exe) rejected correctly:", res.json()["detail"])

    # 4b. Upload a dummy valid text/PDF-like resume
    # We can create a simple PDF using ReportLab
    from reportlab.pdfgen import canvas
    pdf_buffer = io.BytesIO()
    c = canvas.Canvas(pdf_buffer)
    c.drawString(100, 750, "Rohan Deshmukh - Resume")
    c.drawString(100, 720, "Skills: Python, FastAPI, React, PostgreSQL, Docker, AWS, Git, Redis")
    c.drawString(100, 690, "Education: B.Tech Computer Science, CGPA 8.75")
    c.drawString(100, 660, "Projects: Built an e-commerce platform with 10k users. Deployed microservices.")
    c.save()
    pdf_bytes = pdf_buffer.getvalue()

    res = client.post(
        "/api/students/profile/resume",
        headers=headers,
        files={"file": ("Rohan_Resume.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    )
    assert res.status_code == 200, f"Expected 200 for valid PDF resume upload, got {res.status_code}: {res.text}"
    upload_res = res.json()
    print("  [+] Resume uploaded successfully. Auto-extracted skills:", upload_res["skills"])

    # 5. Internships Discovery & Detail
    print("\n[TEST 5] Testing Internships Discovery...")
    res = client.get("/api/students/internships?source=all", headers=headers)
    assert res.status_code == 200
    internships = res.json()
    assert len(internships) > 0
    print(f"  [+] Loaded {len(internships)} available internships.")
    target_job = internships[0]
    print(f"  [+] Target Internship: {target_job['title']} at {target_job['company_name']}")

    # 6. Real AI & Deterministic Eligibility Check
    print("\n[TEST 6] Testing Deterministic & Groq AI Eligibility Evaluation...")
    res = client.post("/api/students/check-eligibility", headers=headers, json={
        "internship_id": target_job["id"],
        "title": target_job["title"],
        "company_name": target_job["company_name"],
        "description": target_job["description"],
        "requirements": target_job["requirements"],
        "required_skills": target_job.get("required_skills") or ["Python", "React", "FastAPI"],
        "min_cgpa": 7.0,
        "eligible_branches": ["Computer Science", "Information Technology"]
    })
    assert res.status_code == 200
    eligibility_report = res.json()
    assert "ats_score" in eligibility_report
    assert "verdict" in eligibility_report
    assert "deterministic_passed" in eligibility_report
    print(f"  [+] Eligibility Verdict: {eligibility_report['verdict']}")
    print(f"  [+] ATS Match Score: {eligibility_report['ats_score']}%")
    print(f"  [+] Deterministic Check Passed: {eligibility_report['deterministic_passed']}")
    print(f"  [+] Matched Skills: {eligibility_report.get('matched_skills')}")
    print(f"  [+] Strengths: {eligibility_report.get('strengths')[:2]}")

    # 7. Apply for Internship
    print("\n[TEST 7] Testing Internship Application...")
    res = client.post("/api/students/apply", headers=headers, data={
        "job_id": target_job["id"],
        "title": target_job["title"],
        "company_name": target_job["company_name"],
        "description": target_job["description"],
        "requirements": target_job["requirements"],
        "stipend": target_job["stipend"],
        "location": target_job["location"],
        "source": target_job["source"],
        "scraped_from": target_job["scraped_from"]
    })
    assert res.status_code == 200
    app_res = res.json()
    assert "application_id" in app_res
    print(f"  [+] Applied successfully! Application ID: {app_res['application_id']}, Status: {app_res['status']}, ATS Score: {app_res['ats_score']}%")

    # 7b. Duplicate Application Prevention
    res_dup = client.post("/api/students/apply", headers=headers, data={
        "job_id": target_job["id"],
        "title": target_job["title"],
        "company_name": target_job["company_name"],
        "description": target_job["description"],
        "requirements": target_job["requirements"],
        "stipend": target_job["stipend"],
        "location": target_job["location"],
        "source": target_job["source"],
        "scraped_from": target_job["scraped_from"]
    })
    assert res_dup.status_code == 200
    assert "already applied" in res_dup.json()["message"].lower()
    print("  [+] Duplicate application prevented correctly:", res_dup.json()["message"])

    # 8. Applications Listing
    print("\n[TEST 8] Testing My Applications Tracking...")
    res = client.get("/api/students/applications", headers=headers)
    assert res.status_code == 200
    apps_list = res.json()
    assert len(apps_list) >= 1
    my_app = apps_list[0]
    print(f"  [+] Found {len(apps_list)} active application(s): {my_app['title']} [{my_app['status']}]")

    # 9. Dashboard Statistics
    print("\n[TEST 9] Testing Dashboard Stats Calculation...")
    res = client.get("/api/students/dashboard-stats", headers=headers)
    assert res.status_code == 200
    stats = res.json()
    assert stats["total_applications"] >= 1
    assert stats["has_resume"] is True
    print(f"  [+] Real Dashboard Statistics: Total Apps={stats['total_applications']}, Shortlisted={stats['shortlisted']}, Profile Completion={stats['profile_completion']}%, Avg ATS={stats['average_ats_score']}%")

    # 10. Attendance Logs & Mentor Feedback
    print("\n[TEST 10] Testing Attendance Logging & Feedback...")
    res = client.post("/api/students/attendance", headers=headers, json={
        "date": "2026-08-19",
        "hours": 8.0,
        "task_details": "Implemented Groq ATS evaluation testing and verified frontend responsiveness."
    })
    assert res.status_code == 200
    print("  [+] Attendance log submitted successfully.")

    res = client.get("/api/students/attendance", headers=headers)
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) >= 1
    print(f"  [+] Retrieved {len(logs)} attendance log(s).")

    res = client.get("/api/students/feedback", headers=headers)
    assert res.status_code == 200
    print(f"  [+] Mentor feedbacks endpoint responded successfully.")

    # 11. Notifications
    print("\n[TEST 11] Testing Notifications...")
    res = client.get("/api/students/notifications", headers=headers)
    assert res.status_code == 200
    notifs = res.json()
    assert len(notifs) >= 1
    print(f"  [+] Retrieved {len(notifs)} notification(s). Latest: '{notifs[0]['message']}'")

    print("\n=======================================================")
    print("   ALL STUDENT PANEL END-TO-END TESTS PASSED (100%)    ")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
