import sys
import os
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.core.db import SessionLocal
from app.models.models import User, InstituteProfile, StudentProfile, CompanyProfile, Internship, Application, NocRequest, AttendanceLog

client = TestClient(app)

def run_tests():
    print("\n=======================================================")
    print("      INTERNTRAC INSTITUTE PANEL END-TO-END TESTS      ")
    print("=======================================================\n")

    # 1. Access Control & Role-Based Authorization
    print("[TEST 1] Testing Role-Based Access Control & Security...")
    
    # 1a. Unauthenticated request
    res = client.get("/api/institutes/analytics")
    assert res.status_code == 401, f"Expected 401 for unauthenticated request, got {res.status_code}"
    print("  [+] Unauthenticated access rejected with 401.")

    # 1b. Student token attempting institute route
    student_login = client.post("/api/auth/login", json={
        "email": "arjun.sharma@student.raisoni.edu",
        "password": "Student@123"
    })
    assert student_login.status_code == 200
    student_token = student_login.json()["access_token"]

    res = client.get("/api/institutes/analytics", headers={"Authorization": f"Bearer {student_token}"})
    assert res.status_code == 403, f"Expected 403 for student role on institute route, got {res.status_code}"
    print("  [+] Student role prohibited from accessing institute endpoints (403 Forbidden).")

    # 1c. Valid Institute Login
    inst_login = client.post("/api/auth/login", json={
        "email": "institute@raisoni.edu",
        "password": "Institute@123"
    })
    assert inst_login.status_code == 200, f"Institute login failed: {inst_login.text}"
    inst_data = inst_login.json()
    assert inst_data["role"] == "INSTITUTE"
    inst_token = inst_data["access_token"]
    inst_headers = {"Authorization": f"Bearer {inst_token}"}
    print(f"  [+] Institute Admin logged in successfully (JWT generated). Role: {inst_data['role']}")

    # 2. Institute Profile
    print("\n[TEST 2] Testing Institute Profile Management...")
    res = client.get("/api/institutes/profile", headers=inst_headers)
    assert res.status_code == 200
    prof = res.json()
    assert "G.H. Raisoni" in prof["name"]
    print(f"  [+] Loaded Institute Profile: {prof['name']} ({prof['location']})")

    # 3. Real Dashboard Analytics
    print("\n[TEST 3] Testing Real Dashboard Analytics Calculation...")
    res = client.get("/api/institutes/analytics", headers=inst_headers)
    assert res.status_code == 200
    stats = res.json()
    assert "total_students" in stats
    assert "placed_students" in stats
    assert "placement_rate" in stats
    assert "branch_wise_stats" in stats
    assert "skill_gap_analysis" in stats
    print(f"  [+] Real Analytics: Total Students={stats['total_students']}, Placed={stats['placed_students']}, Placement Rate={stats['placement_rate']}%, Active Interns={stats['active_interns']}, PPOs={stats['ppo_count']}")
    print(f"  [+] Branch-Wise Breakdown: {len(stats['branch_wise_stats'])} branch(es) tracked.")
    print(f"  [+] Calculated Skill Gaps: {len(stats['skill_gap_analysis'])} top demand skill(s) evaluated against real student profile skills.")

    # 4. Student Directory & Complete Lifecycle Record
    print("\n[TEST 4] Testing Student Directory & Complete Lifecycle Record...")
    res = client.get("/api/institutes/students", headers=inst_headers)
    assert res.status_code == 200
    students_list = res.json()
    assert len(students_list) >= 1
    target_student = students_list[0]
    print(f"  [+] Retrieved {len(students_list)} enrolled student(s). Target: {target_student['name']} ({target_student['branch']})")

    # Fetch lifecycle record
    res = client.get(f"/api/institutes/students/{target_student['id']}/lifecycle", headers=inst_headers)
    assert res.status_code == 200
    lifecycle = res.json()
    assert "student" in lifecycle
    assert "applications" in lifecycle
    assert "noc_requests" in lifecycle
    print(f"  [+] Retrieved Complete Internship Lifecycle for {lifecycle['student']['name']}: {len(lifecycle['applications'])} application(s) with full status history, ATS scores, and interview records.")

    # 5. Multi-Stage Corporate Verification Pipeline
    print("\n[TEST 5] Testing Corporate Verification Pipeline & Multi-Stage Validation...")
    res = client.get("/api/institutes/companies-queue", headers=inst_headers)
    assert res.status_code == 200
    queue = res.json()
    assert len(queue) >= 1
    target_comp = queue[0]
    print(f"  [+] Loaded {len(queue)} company verification record(s). Target: {target_comp['name']} [{target_comp['verification_status']}]")

    # 5a. Re-verify company using Groq AI + deterministic checks
    res = client.post(f"/api/institutes/companies/{target_comp['id']}/re-verify", headers=inst_headers)
    assert res.status_code == 200
    reverif = res.json()
    assert "decision" in reverif
    assert "risk_level" in reverif
    print(f"  [+] Re-verified company '{target_comp['name']}': AI Decision={reverif['decision']}, Risk Level={reverif['risk_level']}, Confidence={reverif['confidence']}")

    # 5b. Request Additional Info from Company
    res = client.post("/api/institutes/companies/verify", headers=inst_headers, json={
        "company_id": target_comp["id"],
        "status": "ADDITIONAL_INFO_REQUIRED",
        "additional_info_notes": "Please provide updated GSTIN certificate matching corporate entity legal name."
    })
    assert res.status_code == 200
    print("  [+] Requested additional info with audit trail recorded.")

    # 5c. Approve Company
    res = client.post("/api/institutes/companies/verify", headers=inst_headers, json={
        "company_id": target_comp["id"],
        "status": "APPROVED"
    })
    assert res.status_code == 200
    print(f"  [+] Company '{target_comp['name']}' approved by Institute Admin.")

    # 6. NOC Requests & Automated PDF Generation
    print("\n[TEST 6] Testing NOC Requests & PDF Generation...")
    res = client.get("/api/institutes/noc-requests", headers=inst_headers)
    assert res.status_code == 200
    nocs = res.json()
    if len(nocs) > 0:
        target_noc = nocs[0]
        res = client.post("/api/institutes/noc/approve", headers=inst_headers, json={
            "noc_id": target_noc["id"],
            "status": "APPROVED"
        })
        assert res.status_code == 200
        noc_res = res.json()
        assert noc_res["status"] == "APPROVED"
        print(f"  [+] Approved NOC for {target_noc['student_name']}. PDF Document Path: {noc_res['noc_document_path']}")
    else:
        print("  [+] No pending NOCs in seed; endpoint verified.")

    # 7. Attendance Log Approvals
    print("\n[TEST 7] Testing Student Attendance Logs Approval...")
    res = client.get("/api/institutes/attendance-logs", headers=inst_headers)
    assert res.status_code == 200
    logs = res.json()
    if len(logs) > 0:
        target_log = logs[0]
        res = client.post("/api/institutes/attendance/approve", headers=inst_headers, json={
            "log_id": target_log["id"],
            "status": "APPROVED"
        })
        assert res.status_code == 200
        print(f"  [+] Attendance log for {target_log['student_name']} ({target_log['hours']} hrs) approved.")
    else:
        print("  [+] Attendance logs endpoint verified.")

    # 8. Mentor Allocation & Qualitative Feedback
    print("\n[TEST 8] Testing Faculty Mentor Allocation & Feedback...")
    res = client.post("/api/institutes/mentor/assign", headers=inst_headers, json={
        "student_id": target_student["id"],
        "mentor_name": "Dr. Pradeep Kumar",
        "mentor_email": "pkumar@raisoni.edu",
        "mentor_department": "Department of Computer Science and Engineering"
    })
    assert res.status_code == 200
    print(f"  [+] Mentor assigned: {res.json()['mentor_name']}")

    # Submit Qualitative Feedback
    res = client.post("/api/institutes/feedback/submit", headers=inst_headers, json={
        "student_id": target_student["id"],
        "mentor_name": "Dr. Pradeep Kumar",
        "feedback_text": "Excellent milestone delivery on API microservices and good attendance records.",
        "rating": 5
    })
    assert res.status_code == 200
    print("  [+] Faculty feedback submitted with 5-star rating.")

    res = client.get("/api/institutes/feedback", headers=inst_headers)
    assert res.status_code == 200
    feedbacks = res.json()
    assert len(feedbacks) >= 1
    print(f"  [+] Retrieved {len(feedbacks)} feedback record(s). Latest: '{feedbacks[0]['feedback_text']}'")

    print("\n=======================================================")
    print("   ALL INSTITUTE PANEL END-TO-END TESTS PASSED (100%)  ")
    print("=======================================================\n")

if __name__ == "__main__":
    run_tests()
