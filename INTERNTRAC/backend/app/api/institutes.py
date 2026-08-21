from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import csv
import io
import os
import re

from app.core.db import get_db, JSONDatabase
from app.api.auth import get_current_user
from app.models.models import UserRole, generate_uuid
from app.services.pdf_service import PDFService
from app.services.groq_service import groq_service
from app.services.resume_parser import resume_parser
from app.services.email_service import email_service

router = APIRouter(prefix="/institutes", tags=["institutes"])

# ─── Request Schemas ─────────────────────────────────────────────────────────

class VerificationUpdateRequest(BaseModel):
    company_id: str
    status: str
    reason: Optional[str] = None
    additional_info_notes: Optional[str] = None

class NocApprovalRequest(BaseModel):
    noc_id: str
    status: str

class MentorAssignRequest(BaseModel):
    student_id: str
    mentor_name: str
    mentor_email: Optional[str] = None
    mentor_department: Optional[str] = None

class FeedbackSubmitRequest(BaseModel):
    student_id: str
    mentor_name: str
    feedback_text: str
    rating: int

class StudentApprovalRequest(BaseModel):
    student_id: str
    status: str

class AttendanceApprovalRequest(BaseModel):
    log_id: str
    status: str

def get_institute_profile_dict(user_id: str, db: JSONDatabase):
    profiles = [p for p in db.data["institute_profiles"] if p["user_id"] == user_id]
    return profiles[0] if profiles else None

@router.get("/profile")
def get_institute_profile(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)
    if not profile:
        raise HTTPException(status_code=404, detail="Institute profile not found")
    return {
        "id": profile["id"],
        "name": profile["name"],
        "location": profile["location"],
        "domain": profile["domain"],
        "institute_role": profile.get("institute_role", "TPO"),
        "profile_picture": profile.get("profile_picture")
    }

@router.post("/profile/picture")
def upload_institute_logo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)
    if not profile:
        raise HTTPException(status_code=404, detail="Institute profile not found")

    filename = file.filename or "logo.png"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png", ".webp", ".gif"]:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, WebP and GIF images are supported.")

    file_bytes = file.file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds the 5MB limit.")
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    os.makedirs("./uploads/profile-pictures", exist_ok=True)
    safe_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", filename)
    file_path = f"./uploads/profile-pictures/{profile['id']}_logo{ext}"

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    if profile.get("profile_picture") and os.path.exists(profile["profile_picture"]):
        try:
            os.remove(profile["profile_picture"])
        except Exception:
            pass

    profile["profile_picture"] = file_path
    db.commit()

    return {
        "message": "Institute logo uploaded successfully.",
        "profile_picture": file_path
    }

@router.delete("/profile/picture")
def delete_institute_logo(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)
    if not profile:
        raise HTTPException(status_code=404, detail="Institute profile not found")

    if profile.get("profile_picture"):
        if os.path.exists(profile["profile_picture"]):
            try:
                os.remove(profile["profile_picture"])
            except Exception:
                pass
        profile["profile_picture"] = None
        db.commit()

    return {"message": "Institute logo removed."}

@router.get("/analytics")
def get_institute_analytics(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    students = [s for s in db.data["student_profiles"] if s["institute_id"] == profile["id"]]
    total_students = len(students)
    student_ids = {s["id"] for s in students}

    applications = [a for a in db.data["applications"] if a["student_id"] in student_ids]
    total_applications = len(applications)

    placed_student_ids = set()
    active_intern_ids = set()
    interview_scheduled_ids = set()
    ppo_student_ids = set()

    for app in applications:
        if app.get("status") in ["SELECTED", "OFFER_SENT", "INTERNSHIP_ACTIVE", "COMPLETED"]:
            placed_student_ids.add(app["student_id"])
        if app.get("status") in ["INTERNSHIP_ACTIVE", "INTERVIEW_SCHEDULED", "SHORTLISTED_FOR_INTERVIEW", "INTERVIEWING"]:
            active_intern_ids.add(app["student_id"])
        if app.get("status") in ["INTERVIEW_SCHEDULED", "SHORTLISTED_FOR_INTERVIEW", "INTERVIEWING"]:
            interview_scheduled_ids.add(app["student_id"])
        if app.get("ppo_status") in ["OFFERED", "ACCEPTED"]:
            ppo_student_ids.add(app["student_id"])

    placed_count = len(placed_student_ids)
    active_count = len(active_intern_ids)
    interview_count = len(interview_scheduled_ids)
    ppo_count = len(ppo_student_ids)
    placement_rate = int((placed_count / total_students * 100) if total_students > 0 else 0)
    ppo_rate = int((ppo_count / placed_count * 100) if placed_count > 0 else 0)

    pending_noc = sum(1 for n in db.data["noc_requests"] if n["institute_id"] == profile["id"] and n["status"] == "PENDING")

    companies = db.data["company_profiles"]
    total_companies = len(companies)
    verified_companies = sum(1 for c in companies if c.get("verification_status") == "APPROVED")
    pending_companies = sum(1 for c in companies if c.get("verification_status") in ["PENDING", "AI_VERIFYING", "MANUAL_REVIEW", "ADDITIONAL_INFO_REQUIRED"])
    rejected_companies = sum(1 for c in companies if c.get("verification_status") == "REJECTED")

    branch_map = {}
    for s in students:
        b = s.get("branch") or "General Engineering"
        if b not in branch_map:
            branch_map[b] = {"total": 0, "placed": 0, "active": 0, "ppo": 0}
        branch_map[b]["total"] += 1
        if s["id"] in placed_student_ids:
            branch_map[b]["placed"] += 1
        if s["id"] in active_intern_ids:
            branch_map[b]["active"] += 1
        if s["id"] in ppo_student_ids:
            branch_map[b]["ppo"] += 1

    branch_wise_stats = [
        {
            "branch": branch,
            "total": data["total"],
            "placed": data["placed"],
            "active": data["active"],
            "ppo": data["ppo"],
            "placement_rate": int((data["placed"] / data["total"] * 100) if data["total"] > 0 else 0)
        }
        for branch, data in branch_map.items()
    ]

    company_app_map = {}
    internships = {i["id"]: i for i in db.data["internships"]}
    for app in applications:
        job = internships.get(app["internship_id"])
        comp_name = job["company_name"] if job else "Unknown Company"
        if comp_name not in company_app_map:
            company_app_map[comp_name] = {"applied": 0, "shortlisted": 0, "selected": 0, "active": 0, "ppo": 0}
        company_app_map[comp_name]["applied"] += 1
        if app.get("status") in ["SHORTLISTED", "SHORTLISTED_FOR_INTERVIEW", "INTERVIEW_SCHEDULED"]:
            company_app_map[comp_name]["shortlisted"] += 1
        if app.get("status") in ["SELECTED", "OFFER_SENT", "COMPLETED"]:
            company_app_map[comp_name]["selected"] += 1
        if app.get("status") == "INTERNSHIP_ACTIVE":
            company_app_map[comp_name]["active"] += 1
        if app.get("ppo_status") in ["OFFERED", "ACCEPTED"]:
            company_app_map[comp_name]["ppo"] += 1

    company_wise_stats = [
        {
            "company": comp,
            "applied": data["applied"],
            "shortlisted": data["shortlisted"],
            "selected": data["selected"],
            "active": data["active"],
            "ppo": data["ppo"]
        }
        for comp, data in company_app_map.items()
    ]

    status_counts = {
        "APPLIED": 0, "UNDER_REVIEW": 0, "SHORTLISTED": 0, "INTERVIEW_SCHEDULED": 0,
        "SELECTED": 0, "INTERNSHIP_ACTIVE": 0, "COMPLETED": 0, "REJECTED": 0
    }
    for app in applications:
        st = app.get("status")
        if st in status_counts:
            status_counts[st] += 1
        elif st in ["SHORTLISTED_FOR_INTERVIEW", "INTERVIEWING", "INTERVIEW_COMPLETED"]:
            status_counts["INTERVIEW_SCHEDULED"] += 1
        elif st == "OFFER_SENT":
            status_counts["SELECTED"] += 1

    skill_demand_counts = {}
    active_internships = [i for i in db.data["internships"] if i.get("status") == "ACTIVE"]
    for job in active_internships:
        skills = job.get("required_skills") or []
        if not skills and job.get("requirements"):
            skills = [s.strip() for s in job["requirements"].split(",") if len(s.strip()) > 1][:5]
        for sk in skills:
            sk_clean = sk.strip().title()
            if len(sk_clean) > 1:
                skill_demand_counts[sk_clean] = skill_demand_counts.get(sk_clean, 0) + 1

    student_skill_counts = {}
    for s in students:
        skills = s.get("skills") or []
        for sk in skills:
            sk_clean = sk.strip().title()
            if len(sk_clean) > 1:
                student_skill_counts[sk_clean] = student_skill_counts.get(sk_clean, 0) + 1

    top_demanded_skills = sorted(skill_demand_counts.items(), key=lambda x: x[1], reverse=True)[:8]
    skill_gap_analysis = []
    for skill_name, req_count in top_demanded_skills:
        supply_count = student_skill_counts.get(skill_name, 0)
        demand_pct = int((req_count / max(1, len(active_internships))) * 100)
        supply_pct = int((supply_count / max(1, total_students)) * 100)
        gap = max(0, demand_pct - supply_pct)
        skill_gap_analysis.append({
            "skill": skill_name,
            "demand_count": req_count,
            "demand_percentage": demand_pct,
            "student_count": supply_count,
            "student_percentage": supply_pct,
            "gap_percentage": gap,
            "severity": "HIGH" if gap >= 40 else "MODERATE" if gap >= 20 else "BALANCED"
        })

    return {
        "total_students": total_students,
        "placed_students": placed_count,
        "active_interns": active_count,
        "interview_scheduled_count": interview_count,
        "total_applications": total_applications,
        "placement_rate": placement_rate,
        "ppo_count": ppo_count,
        "ppo_rate": ppo_rate,
        "pending_noc_requests": pending_noc,
        "total_companies": total_companies,
        "partner_companies": verified_companies,
        "pending_companies": pending_companies,
        "rejected_companies": rejected_companies,
        "branch_wise_stats": branch_wise_stats,
        "company_wise_stats": company_wise_stats,
        "status_distribution": status_counts,
        "skill_gap_analysis": skill_gap_analysis
    }

@router.get("/students")
def get_institute_students(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    students = [s for s in db.data["student_profiles"] if s["institute_id"] == profile["id"]]
    results = []
    
    users_map = {u["id"]: u for u in db.data["users"]}
    internships_map = {i["id"]: i for i in db.data["internships"]}
    apps = db.data["applications"]

    for s in students:
        student_apps = sorted([a for a in apps if a["student_id"] == s["id"]], key=lambda x: x.get("applied_at", ""), reverse=True)
        active_app = next((a for a in student_apps if a.get("status") in ["SELECTED", "OFFER_SENT", "INTERNSHIP_ACTIVE", "COMPLETED"]), None)
        any_app = active_app or (student_apps[0] if student_apps else None)

        fields = [s.get("name"), s.get("mobile"), s.get("degree"), s.get("branch"), s.get("semester"), s.get("cgpa"), s.get("resume_path"), s.get("skills")]
        filled = sum(1 for f in fields if f)
        completion_pct = int((filled / len(fields)) * 100)
        
        job = internships_map.get(any_app["internship_id"]) if any_app else None
        
        user = users_map.get(s["user_id"])

        results.append({
            "id": s["id"],
            "name": s.get("name"),
            "email": user["email"] if user else "",
            "mobile": s.get("mobile"),
            "degree": s.get("degree") or "B.Tech",
            "branch": s.get("branch") or "Computer Science",
            "semester": s.get("semester") or "Semester 7",
            "cgpa": s.get("cgpa"),
            "graduation_year": s.get("graduation_year"),
            "github_url": s.get("github_url"),
            "linkedin_url": s.get("linkedin_url"),
            "skills": s.get("skills") or [],
            "resume_path": s.get("resume_path"),
            "profile_picture": s.get("profile_picture"),
            "profile_completion": completion_pct,
            "mentor_name": s.get("mentor_name"),
            "mentor_email": s.get("mentor_email"),
            "mentor_department": s.get("mentor_department"),
            "internship_title": job["title"] if job else None,
            "internship_company": job["company_name"] if job else None,
            "internship_status": any_app["status"] if any_app else "UNPLACED",
            "ats_score": any_app.get("ats_score") if any_app else None,
            "ppo_status": any_app.get("ppo_status") if any_app else None
        })
    return results

@router.get("/students/{student_id}/lifecycle")
def get_student_internship_lifecycle(student_id: str, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    students = [s for s in db.data["student_profiles"] if s["id"] == student_id and s["institute_id"] == profile["id"]]
    if not students:
        raise HTTPException(status_code=404, detail="Student not found in this institute")
    student = students[0]
    
    users = [u for u in db.data["users"] if u["id"] == student["user_id"]]
    student_user = users[0] if users else None

    internships = {i["id"]: i for i in db.data["internships"]}
    apps = sorted([a for a in db.data["applications"] if a["student_id"] == student["id"]], key=lambda x: x.get("applied_at", ""), reverse=True)
    app_records = []
    for a in apps:
        job = internships.get(a["internship_id"])
        app_records.append({
            **a,
            "title": job["title"] if job else "Role",
            "company_name": job["company_name"] if job else "Company",
            "location": job.get("location") if job else "Remote",
            "stipend": job.get("stipend") if job else None,
            "duration": job.get("duration") if job else "3 Months",
        })

    nocs = [n for n in db.data["noc_requests"] if n["student_id"] == student["id"]]
    noc_records = []
    for n in nocs:
        job = internships.get(n["internship_id"])
        noc_records.append({
            "id": n["id"],
            "internship_title": job["title"] if job else "",
            "company_name": job["company_name"] if job else "",
            "status": n.get("status"),
            "noc_document_path": n.get("noc_document_path")
        })

    attendance = sorted([a for a in db.data["attendance_logs"] if a["student_id"] == student["id"]], key=lambda x: x.get("date", ""), reverse=True)
    
    feedbacks = sorted([f for f in db.data["mentor_feedbacks"] if f["student_id"] == student["id"]], key=lambda x: x.get("created_at", ""), reverse=True)

    return {
        "student": {
            **student,
            "email": student_user["email"] if student_user else "",
        },
        "applications": app_records,
        "noc_requests": noc_records,
        "attendance_logs": attendance,
        "mentor_feedback": feedbacks
    }

@router.get("/pending-students")
def get_pending_students(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    users_map = {u["id"]: u for u in db.data["users"]}
    students = [s for s in db.data["student_profiles"] if s.get("institute_id") == profile["id"] and s.get("approval_status", "APPROVED") == "PENDING"]

    results = []
    for s in students:
        user = users_map.get(s["user_id"])
        results.append({
            "id": s["id"],
            "name": s.get("name"),
            "email": user["email"] if user else "",
            "mobile": s.get("mobile"),
            "degree": s.get("degree") or "B.Tech",
            "branch": s.get("branch") or "Computer Science",
            "semester": s.get("semester") or "Year 4",
            "cgpa": s.get("cgpa"),
            "graduation_year": s.get("graduation_year"),
            "profile_picture": s.get("profile_picture"),
            "approval_status": s.get("approval_status", "PENDING"),
            "created_at": user.get("created_at") if user else ""
        })
    return results

@router.post("/students/approve")
def approve_student(req: StudentApprovalRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    valid_statuses = ["APPROVED", "REJECTED"]
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    students = [s for s in db.data["student_profiles"] if s["id"] == req.student_id and s.get("institute_id") == profile["id"]]
    if not students:
        raise HTTPException(status_code=404, detail="Student not found in this institute")
    student = students[0]

    student["approval_status"] = req.status

    if student.get("user_id"):
        notif_msg = f"Your registration has been {req.status.lower()} by {profile['name']}."
        if req.status == "APPROVED":
            notif_msg += " You can now log in and access the platform."
        else:
            notif_msg += " Please contact your institute for more details."
        notif = {
            "id": generate_uuid(),
            "user_id": student["user_id"],
            "message": notif_msg,
            "type": "STUDENT_APPROVAL",
            "reference_id": student["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)

    db.commit()
    return {
        "message": f"Student registration {req.status.lower()} successfully",
        "student_id": student["id"],
        "status": student["approval_status"]
    }

@router.get("/companies-queue")
def get_companies_verification_queue(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    users_map = {u["id"]: u for u in db.data["users"]}
    companies = db.data["company_profiles"]
    
    results = []
    for c in companies:
        user = users_map.get(c["user_id"])
        company_internships = [
            {
                "id": i["id"],
                "title": i.get("title"),
                "stipend": i.get("stipend"),
                "location": i.get("location"),
                "status": i.get("status", "ACTIVE"),
                "eligible_degree": i.get("eligible_degree", "B.Tech"),
                "eligible_branches": i.get("eligible_branches", []),
            }
            for i in db.data["internships"]
            if i.get("company_profile_id") == c["id"] or (i.get("company_name") and i.get("company_name").lower() == c.get("name", "").lower())
        ]
        results.append({
            **c,
            "contact_email": c.get("contact_email") or (user["email"] if user else None),
            "posted_internships": company_internships,
            "verification_decision": c.get("verification_decision") or ("AUTO_APPROVE" if c.get("verification_status") == "APPROVED" else "MANUAL_REVIEW"),
            "verification_confidence": c.get("verification_confidence") or (0.95 if c.get("verification_status") == "APPROVED" else 0.65),
            "verification_risk_level": c.get("verification_risk_level") or ("LOW" if c.get("verification_status") == "APPROVED" else "MEDIUM"),
            "verification_errors": c.get("verification_errors") or [],
            "verification_details": c.get("verification_details") or {
                "verified_matches": [f"Company name: {c.get('name')}", f"Website: {c.get('website')}"],
                "mismatches": c.get("verification_errors") or [],
                "reasons": ["Automated corporate verification analysis."]
            }
        })
    return results

@router.post("/companies/verify")
def verify_company_status(req: VerificationUpdateRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    comps = [c for c in db.data["company_profiles"] if c["id"] == req.company_id]
    if not comps:
        raise HTTPException(status_code=404, detail="Company profile not found")
    comp = comps[0]

    valid_statuses = ["APPROVED", "REJECTED", "ADDITIONAL_INFO_REQUIRED"]
    if req.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

    comp["verification_status"] = req.status
    comp["reviewed_by"] = profile["name"]
    comp["verified_at"] = datetime.utcnow().isoformat()

    details = comp.get("verification_details") or {}
    audit_trail = details.get("audit_trail", [])
    action_note = req.reason or req.additional_info_notes or f"Status set to {req.status}"
    audit_trail.append({
        "action": req.status,
        "reviewer": profile["name"],
        "timestamp": datetime.utcnow().isoformat(),
        "notes": action_note
    })
    details["audit_trail"] = audit_trail
    if req.reason:
        details["rejection_reason"] = req.reason
    if req.additional_info_notes:
        details["additional_info_requested"] = req.additional_info_notes
    comp["verification_details"] = details

    if comp.get("user_id"):
        notif_msg = f"Your company registration status was updated to '{req.status}' by {profile['name']}."
        if req.reason:
            notif_msg += f" Reason: {req.reason}"
        if req.additional_info_notes:
            notif_msg += f" Note: {req.additional_info_notes}"
        notif = {
            "id": generate_uuid(),
            "user_id": comp["user_id"],
            "message": notif_msg,
            "type": "COMPANY_VERIFICATION",
            "reference_id": comp["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)

    db.commit()
    return {
        "message": f"Company verification updated to {comp['verification_status']}",
        "status": comp["verification_status"],
        "reviewed_by": comp["reviewed_by"],
        "verified_at": comp["verified_at"]
    }

@router.post("/companies/{company_id}/re-verify")
def re_verify_company(company_id: str, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    comps = [c for c in db.data["company_profiles"] if c["id"] == company_id]
    if not comps:
        raise HTTPException(status_code=404, detail="Company profile not found")
    comp = comps[0]

    doc_text = None
    if comp.get("msme_certificate_url") and os.path.exists(comp["msme_certificate_url"]):
        try:
            doc_text = resume_parser.extract_text(comp["msme_certificate_url"])
        except Exception:
            pass

    user = [u for u in db.data["users"] if u["id"] == comp["user_id"]]
    user_email = user[0]["email"] if user else None

    verif_res = groq_service.verify_company_multistage(
        legal_name=comp.get("name"),
        website=comp.get("website"),
        cin=comp.get("cin"),
        gstin=comp.get("gstin"),
        official_email=comp.get("contact_email") or user_email,
        msme_number=comp.get("msme_number"),
        document_text=doc_text
    )

    comp["verification_decision"] = verif_res["decision"]
    comp["verification_confidence"] = verif_res["confidence"]
    comp["verification_risk_level"] = verif_res["risk_level"]
    comp["verification_errors"] = verif_res["errors"]

    details = comp.get("verification_details") or {}
    details["verified_matches"] = verif_res["verified_matches"]
    details["mismatches"] = verif_res["mismatches"]
    details["reasons"] = verif_res["reasons"]
    comp["verification_details"] = details

    if verif_res["decision"] == "AUTO_APPROVE" and comp.get("verification_status") != "APPROVED":
        comp["verification_status"] = "AUTO_APPROVED"
    elif verif_res["decision"] in ["MANUAL_REVIEW", "REJECT"] and comp.get("verification_status") not in ["APPROVED", "REJECTED"]:
        comp["verification_status"] = "MANUAL_REVIEW"

    db.commit()
    return {
        "message": "Re-verification completed successfully",
        "decision": comp["verification_decision"],
        "confidence": comp["verification_confidence"],
        "risk_level": comp["verification_risk_level"],
        "status": comp["verification_status"],
        "verification_details": comp["verification_details"]
    }

@router.get("/noc-requests")
def get_noc_requests(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    nocs = [n for n in db.data["noc_requests"] if n["institute_id"] == profile["id"]]
    results = []
    
    students_map = {s["id"]: s for s in db.data["student_profiles"]}
    internships_map = {i["id"]: i for i in db.data["internships"]}

    for n in nocs:
        student = students_map.get(n["student_id"])
        job = internships_map.get(n["internship_id"])
        results.append({
            "id": n["id"],
            "student_id": n["student_id"],
            "student_name": student.get("name") if student else "Student",
            "student_branch": student.get("branch") if student else "Engineering",
            "student_cgpa": student.get("cgpa") if student else 0.0,
            "internship_title": job.get("title") if job else "Role",
            "company_name": job.get("company_name") if job else "Company",
            "status": n.get("status"),
            "noc_document_path": n.get("noc_document_path")
        })
    return results

@router.post("/noc/approve")
def approve_noc_request(req: NocApprovalRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    nocs = [n for n in db.data["noc_requests"] if n["id"] == req.noc_id]
    if not nocs:
        raise HTTPException(status_code=404, detail="NOC request not found")
    noc = nocs[0]

    noc["status"] = req.status
    
    student = [s for s in db.data["student_profiles"] if s["id"] == noc["student_id"]][0]
    job = [j for j in db.data["internships"] if j["id"] == noc["internship_id"]][0]
    
    if req.status == "APPROVED":
        os.makedirs("./uploads/noc", exist_ok=True)
        pdf_path = f"./uploads/noc/{noc['student_id']}_{noc['internship_id']}_noc.pdf"
        try:
            PDFService.generate_noc_pdf(
                output_path=pdf_path,
                student_name=student.get("name") if student else "Student",
                institute_name=profile["name"],
                company_name=job.get("company_name") if job else "Company",
                internship_role=job.get("title") if job else "Intern",
                duration=job.get("duration") if job else "3 Months"
            )
            noc["noc_document_path"] = pdf_path
        except Exception:
            noc["noc_document_path"] = None

        if student and student.get("user_id"):
            notif = {
                "id": generate_uuid(),
                "user_id": student["user_id"],
                "message": f"Your NOC request for {job.get('title') or 'internship'} at {job.get('company_name') or 'host company'} has been APPROVED by {profile['name']}!",
                "type": "NOC",
                "reference_id": noc["id"],
                "is_read": False,
                "created_at": datetime.utcnow().isoformat()
            }
            db.data["notifications"].append(notif)

    elif req.status == "REJECTED" and student and student.get("user_id"):
        notif = {
            "id": generate_uuid(),
            "user_id": student["user_id"],
            "message": f"Your NOC request for {job.get('title') or 'internship'} was rejected by your institute.",
            "type": "NOC",
            "reference_id": noc["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)

    db.commit()

    # Email the approved NOC PDF to the student's email address
    email_result = {"sent": False, "reason": ""}
    if req.status == "APPROVED":
        student_user = None
        for u in db.data.get("users", []):
            if u.get("id") == student.get("user_id"):
                student_user = u
                break

        if student_user and student_user.get("email") and noc.get("noc_document_path"):
            print(f"[NOC] Sending NOC approval email to {student_user['email']}...")
            email_result = email_service.send_noc_email(
                to_email=student_user["email"],
                student_name=student.get("name", "Candidate"),
                institute_name=profile.get("name", "Institute"),
                company_name=job.get("company_name", "Company"),
                internship_role=job.get("title", "Intern"),
                duration=job.get("duration", "3 Months"),
                pdf_path=noc["noc_document_path"],
            )
        else:
            email_result = {"sent": False, "reason": "Student email or NOC document not found"}
        print(f"[NOC] Email result: {email_result}")

    return {
        "message": "NOC status updated successfully",
        "status": noc["status"],
        "noc_document_path": noc.get("noc_document_path"),
        "email_sent": email_result.get("sent", False),
        "email_detail": email_result.get("reason") if not email_result.get("sent") else "NOC emailed successfully"
    }

@router.get("/attendance-logs")
def get_students_attendance_logs(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    students = {s["id"]: s for s in db.data["student_profiles"] if s["institute_id"] == profile["id"]}
    logs = [l for l in db.data["attendance_logs"] if l["student_id"] in students]
    logs = sorted(logs, key=lambda x: x.get("date", ""), reverse=True)

    results = []
    for l in logs:
        student = students[l["student_id"]]
        results.append({
            **l,
            "student_name": student.get("name") or "Student",
            "student_branch": student.get("branch") or "Engineering",
        })
    return results

@router.post("/attendance/approve")
def approve_attendance_log(req: AttendanceApprovalRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")

    logs = [l for l in db.data["attendance_logs"] if l["id"] == req.log_id]
    if not logs:
        raise HTTPException(status_code=404, detail="Attendance log not found")
    log = logs[0]
    log["status"] = req.status
    db.commit()
    return {"message": "Attendance log status updated successfully", "status": log["status"]}

@router.get("/faculty")
def get_faculty_members(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    faculty = [
        {
            "id": p["id"],
            "name": p["name"],
            "email": p.get("email", ""),
            "department": p.get("department", ""),
            "institute_role": p.get("institute_role", ""),
        }
        for p in db.data["institute_profiles"]
        if p.get("institute_id") == profile["id"] and p.get("institute_role") == "FACULTY_MENTOR"
    ]
    return faculty


@router.post("/mentor/assign")
def assign_mentor(req: MentorAssignRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    students = [s for s in db.data["student_profiles"] if s["id"] == req.student_id and s["institute_id"] == profile["id"]]
    if not students:
        raise HTTPException(status_code=404, detail="Student not found in this institute")
    student = students[0]

    student["mentor_name"] = req.mentor_name.strip()
    if req.mentor_email:
        student["mentor_email"] = req.mentor_email.strip()
    if req.mentor_department:
        student["mentor_department"] = req.mentor_department.strip()

    if student.get("user_id"):
        notif = {
            "id": generate_uuid(),
            "user_id": student["user_id"],
            "message": f"Faculty mentor {student['mentor_name']} has been assigned to guide your internship progress.",
            "type": "MENTOR",
            "reference_id": student["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)

    db.commit()
    return {
        "message": "Mentor assigned successfully",
        "mentor_name": student["mentor_name"],
        "mentor_email": student.get("mentor_email"),
        "mentor_department": student.get("mentor_department")
    }

@router.get("/feedback")
def get_all_feedback(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    students = {s["id"]: s for s in db.data["student_profiles"] if s["institute_id"] == profile["id"]}
    feedbacks = [f for f in db.data["mentor_feedbacks"] if f["student_id"] in students]
    feedbacks = sorted(feedbacks, key=lambda x: x.get("created_at", ""), reverse=True)

    results = []
    for f in feedbacks:
        student = students[f["student_id"]]
        results.append({
            **f,
            "student_name": student.get("name") or "Student"
        })
    return results

@router.post("/feedback/submit")
def submit_feedback(req: FeedbackSubmitRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    students = [s for s in db.data["student_profiles"] if s["id"] == req.student_id and s["institute_id"] == profile["id"]]
    if not students:
        raise HTTPException(status_code=404, detail="Student not found in this institute")
    student = students[0]

    if not 1 <= req.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5 stars")

    feedback = {
        "id": generate_uuid(),
        "student_id": req.student_id,
        "mentor_name": req.mentor_name.strip(),
        "feedback_text": req.feedback_text.strip(),
        "rating": req.rating,
        "created_at": datetime.utcnow().isoformat()
    }
    db.data["mentor_feedbacks"].append(feedback)

    if student.get("user_id"):
        notif = {
            "id": generate_uuid(),
            "user_id": student["user_id"],
            "message": f"Faculty mentor {req.mentor_name} submitted new progress feedback: {req.rating}★.",
            "type": "MENTOR",
            "reference_id": student["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)

    db.commit()
    return {
        "message": "Feedback submitted successfully",
        "id": feedback["id"],
        "student_name": student.get("name"),
        "rating": feedback["rating"]
    }

@router.get("/my-students")
def get_mentor_students(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    """Faculty Mentor only: Returns students assigned to this mentor."""
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)
    mentor_name = profile.get("name", "").strip().lower()

    students = [s for s in db.data["student_profiles"] if s["institute_id"] == profile["id"]]
    my_students = [s for s in students if (s.get("mentor_name") or "").strip().lower() == mentor_name]

    users_map = {u["id"]: u for u in db.data["users"]}
    internships_map = {i["id"]: i for i in db.data["internships"]}
    apps = db.data["applications"]

    results = []
    for s in my_students:
        student_apps = sorted([a for a in apps if a["student_id"] == s["id"]], key=lambda x: x.get("applied_at", ""), reverse=True)
        active_app = next((a for a in student_apps if a.get("status") in ["SELECTED", "OFFER_SENT", "INTERNSHIP_ACTIVE", "COMPLETED"]), None)
        any_app = active_app or (student_apps[0] if student_apps else None)
        user = users_map.get(s["user_id"])
        job = internships_map.get(any_app["internship_id"]) if any_app else None

        fields = [s.get("name"), s.get("mobile"), s.get("degree"), s.get("branch"), s.get("semester"), s.get("cgpa"), s.get("resume_path"), s.get("skills")]
        filled = sum(1 for f in fields if f)

        results.append({
            "id": s["id"],
            "name": s.get("name"),
            "email": user["email"] if user else "",
            "degree": s.get("degree") or "B.Tech",
            "branch": s.get("branch") or "Computer Science",
            "semester": s.get("semester") or "Year 4",
            "cgpa": s.get("cgpa"),
            "skills": s.get("skills") or [],
            "profile_picture": s.get("profile_picture"),
            "mentor_name": s.get("mentor_name"),
            "mentor_email": s.get("mentor_email"),
            "internship_title": job["title"] if job else None,
            "internship_company": job["company_name"] if my_students else None,
            "internship_status": any_app["status"] if any_app else "UNPLACED",
            "profile_completion": int((filled / len(fields)) * 100),
            "attendance_count": sum(1 for l in db.data["attendance_logs"] if l["student_id"] == s["id"]),
            "feedback_count": sum(1 for f in db.data["mentor_feedbacks"] if f["student_id"] == s["id"]),
        })
    return results

@router.get("/my-students/attendance")
def get_mentor_students_attendance(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    """Faculty Mentor only: Returns attendance logs for students assigned to this mentor."""
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)
    mentor_name = profile.get("name", "").strip().lower()

    students = {s["id"]: s for s in db.data["student_profiles"] if s["institute_id"] == profile["id"]}
    my_student_ids = {sid for sid, s in students.items() if (s.get("mentor_name") or "").strip().lower() == mentor_name}

    logs = [l for l in db.data["attendance_logs"] if l["student_id"] in my_student_ids]
    logs = sorted(logs, key=lambda x: x.get("date", ""), reverse=True)

    results = []
    for l in logs:
        student = students.get(l["student_id"])
        results.append({
            **l,
            "student_name": student.get("name") if student else "Student",
            "student_branch": student.get("branch") if student else "Engineering",
        })
    return results

@router.get("/reports")
def get_institute_reports(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    """HOD/Admin only: Returns aggregate reports for the institute."""
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    students = [s for s in db.data["student_profiles"] if s["institute_id"] == profile["id"]]
    student_ids = {s["id"] for s in students}
    users_map = {u["id"]: u for u in db.data["users"]}
    internships_map = {i["id"]: i for i in db.data["internships"]}
    applications = [a for a in db.data["applications"] if a["student_id"] in student_ids]

    total = len(students)
    placed = sum(1 for a in applications if a.get("status") in ["SELECTED", "OFFER_SENT", "INTERNSHIP_ACTIVE", "COMPLETED"])
    active = sum(1 for a in applications if a.get("status") == "INTERNSHIP_ACTIVE")
    completed = sum(1 for a in applications if a.get("status") == "COMPLETED")
    rejected_count = sum(1 for a in applications if a.get("status") == "REJECTED")
    pending_nocs = sum(1 for n in db.data["noc_requests"] if n["institute_id"] == profile["id"] and n["status"] == "PENDING")

    mentor_stats = {}
    for s in students:
        mn = s.get("mentor_name") or "Unassigned"
        if mn not in mentor_stats:
            mentor_stats[mn] = {"total": 0, "placed": 0, "active": 0}
        mentor_stats[mn]["total"] += 1
        s_apps = [a for a in applications if a["student_id"] == s["id"]]
        if any(a.get("status") in ["SELECTED", "OFFER_SENT", "INTERNSHIP_ACTIVE", "COMPLETED"] for a in s_apps):
            mentor_stats[mn]["placed"] += 1
        if any(a.get("status") == "INTERNSHIP_ACTIVE" for a in s_apps):
            mentor_stats[mn]["active"] += 1

    branch_stats = {}
    for s in students:
        b = s.get("branch") or "General"
        if b not in branch_stats:
            branch_stats[b] = {"total": 0, "placed": 0, "active": 0}
        branch_stats[b]["total"] += 1
        s_apps = [a for a in applications if a["student_id"] == s["id"]]
        if any(a.get("status") in ["SELECTED", "OFFER_SENT", "INTERNSHIP_ACTIVE", "COMPLETED"] for a in s_apps):
            branch_stats[b]["placed"] += 1
        if any(a.get("status") == "INTERNSHIP_ACTIVE" for a in s_apps):
            branch_stats[b]["active"] += 1

    return {
        "summary": {
            "total_students": total,
            "placed_students": placed,
            "active_interns": active,
            "completed_internships": completed,
            "rejected_applications": rejected_count,
            "pending_nocs": pending_nocs,
            "placement_rate": int((placed / total * 100) if total > 0 else 0),
        },
        "mentor_wise": [
            {"mentor": mn, "total": d["total"], "placed": d["placed"], "active": d["active"],
             "placement_rate": int((d["placed"] / d["total"] * 100) if d["total"] > 0 else 0)}
            for mn, d in sorted(mentor_stats.items())
        ],
        "branch_wise": [
            {"branch": b, "total": d["total"], "placed": d["placed"], "active": d["active"],
             "placement_rate": int((d["placed"] / d["total"] * 100) if d["total"] > 0 else 0)}
            for b, d in sorted(branch_stats.items())
        ]
    }


# ─── Report Downloads (TPO / HOD) ─────────────────────────────────────────────

REPORT_TYPES = ["students", "applications", "companies", "noc", "attendance", "placement_summary"]


def _csv_response(rows: list, filename: str) -> StreamingResponse:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerows(rows)
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/reports/download")
def download_institute_report(
    report_type: str,
    current_user: dict = Depends(get_current_user),
    db: JSONDatabase = Depends(get_db)
):
    """Download institute reports as CSV. Available to TPO and HOD/Admin roles."""
    if current_user["role"] != UserRole.INSTITUTE.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_institute_profile_dict(current_user["id"], db)

    if profile.get("institute_role") not in ("TPO", "HOD_ADMIN"):
        raise HTTPException(status_code=403, detail="Only TPO and HOD/Admin can download reports")

    if report_type not in REPORT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid report type. Must be one of: {', '.join(REPORT_TYPES)}")

    students = [s for s in db.data["student_profiles"] if s["institute_id"] == profile["id"]]
    student_map = {s["id"]: s for s in students}
    student_ids = set(student_map.keys())
    users_map = {u["id"]: u for u in db.data["users"]}
    internships_map = {i["id"]: i for i in db.data["internships"]}
    applications = [a for a in db.data["applications"] if a["student_id"] in student_ids]
    today = datetime.utcnow().strftime("%Y-%m-%d")
    stamp = f"{profile['name']} — generated {today}"

    if report_type == "students":
        rows = [
            [stamp],
            [],
            ["Name", "Email", "Degree", "Branch", "Semester", "CGPA", "Graduation Year", "Mentor", "Internship Status", "Current Company", "Current Role"],
        ]
        for s in sorted(students, key=lambda x: x.get("name") or ""):
            user = users_map.get(s.get("user_id")) or {}
            active_app = next((a for a in applications if a["student_id"] == s["id"] and a.get("status") == "INTERNSHIP_ACTIVE"), None)
            job = internships_map.get(active_app.get("internship_id")) if active_app else None
            latest_status = max((a for a in applications if a["student_id"] == s["id"]),
                                key=lambda x: x.get("applied_at") or "", default=None)
            rows.append([
                s.get("name"), user.get("email"), s.get("degree"), s.get("branch"), s.get("semester"),
                s.get("cgpa"), s.get("graduation_year"), s.get("mentor_name") or "Unassigned",
                latest_status.get("status") if latest_status else "NOT_APPLIED",
                job.get("company_name") if job else "", job.get("title") if job else "",
            ])
        return _csv_response(rows, f"students_report_{today}.csv")

    if report_type == "applications":
        rows = [
            [stamp],
            [],
            ["Student", "Branch", "Company", "Internship Role", "Status", "ATS Score", "Applied On"],
        ]
        for a in sorted(applications, key=lambda x: x.get("applied_at") or "", reverse=True):
            s = student_map.get(a["student_id"]) or {}
            job = internships_map.get(a.get("internship_id")) or {}
            rows.append([
                s.get("name"), s.get("branch"), job.get("company_name"), job.get("title"),
                a.get("status"), a.get("ats_score"),
                (a.get("applied_at") or "")[:10],
            ])
        return _csv_response(rows, f"applications_report_{today}.csv")

    if report_type == "companies":
        rows = [
            [stamp],
            [],
            ["Company", "Industry", "Website", "Verification Status", "Reviewed By", "Verified On"],
        ]
        for c in sorted(db.data["company_profiles"], key=lambda x: x.get("name") or ""):
            rows.append([
                c.get("name"), c.get("industry"), c.get("website"),
                c.get("verification_status"), c.get("reviewed_by"),
                (c.get("verified_at") or "")[:10] if c.get("verified_at") else "",
            ])
        return _csv_response(rows, f"companies_report_{today}.csv")

    if report_type == "noc":
        nocs = [n for n in db.data["noc_requests"] if n["institute_id"] == profile["id"]]
        rows = [
            [stamp],
            [],
            ["Student", "Branch", "Company", "Internship Role", "NOC Status", "Document Available"],
        ]
        for n in nocs:
            s = student_map.get(n.get("student_id")) or {}
            job = internships_map.get(n.get("internship_id")) or {}
            rows.append([
                s.get("name"), s.get("branch"), job.get("company_name"), job.get("title"),
                n.get("status"), "Yes" if n.get("noc_document_path") else "No",
            ])
        return _csv_response(rows, f"noc_report_{today}.csv")

    if report_type == "attendance":
        logs = [l for l in db.data["attendance_logs"] if l.get("student_id") in student_ids]
        rows = [
            [stamp],
            [],
            ["Student", "Branch", "Date", "Hours Worked", "Task Details", "Approval Status"],
        ]
        for l in sorted(logs, key=lambda x: (x.get("date") or ""), reverse=True):
            s = student_map.get(l.get("student_id")) or {}
            rows.append([
                s.get("name"), s.get("branch"), l.get("date"), l.get("hours"),
                l.get("task_details"), l.get("status"),
            ])
        return _csv_response(rows, f"attendance_report_{today}.csv")

    # placement_summary
    report = get_institute_reports(current_user=current_user, db=db)
    rows = [[stamp], [], ["Placement Summary"], [],
            ["Total Students", report["summary"]["total_students"]],
            ["Placed Students", report["summary"]["placed_students"]],
            ["Active Interns", report["summary"]["active_interns"]],
            ["Completed Internships", report["summary"]["completed_internships"]],
            ["Rejected Applications", report["summary"]["rejected_applications"]],
            ["Pending NOCs", report["summary"]["pending_nocs"]],
            ["Placement Rate %", report["summary"]["placement_rate"]],
            [],
            ["Branch-Wise Placement Report"],
            ["Branch", "Total Students", "Placed", "Active Interns", "Placement Rate %"]]
    for b in report["branch_wise"]:
        rows.append([b["branch"], b["total"], b["placed"], b["active"], b["placement_rate"]])
    rows.extend([[], ["Mentor-Wise Performance"],
                 ["Mentor", "Assigned Students", "Placed", "Active Interns", "Placement Rate %"]])
    for m in report["mentor_wise"]:
        rows.append([m["mentor"], m["total"], m["placed"], m["active"], m["placement_rate"]])
    return _csv_response(rows, f"placement_summary_report_{today}.csv")
