from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime
import os
import re

from app.core.db import get_db, JSONDatabase
from app.api.auth import get_current_user
from app.models.models import UserRole, generate_uuid
from app.services.pdf_service import PDFService
from app.services.email_service import email_service

router = APIRouter(prefix="/companies", tags=["companies"])

# ── Request Models ─────────────────────────────────────────────────────────────

class InternshipCreate(BaseModel):
    title: str
    description: str
    requirements: str
    stipend: Optional[str] = "Not Disclosed"
    location: Optional[str] = "Remote"
    duration: Optional[str] = "3 Months"
    required_skills: Optional[List[str]] = []
    eligible_institute_ids: Optional[List[str]] = []
    vacancies: Optional[int] = 1
    deadline: Optional[str] = None

class InternshipUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    requirements: Optional[str] = None
    stipend: Optional[str] = None
    location: Optional[str] = None
    duration: Optional[str] = None
    required_skills: Optional[List[str]] = None
    status: Optional[str] = None
    vacancies: Optional[int] = None
    deadline: Optional[str] = None

class StatusUpdateRequest(BaseModel):
    application_id: str
    status: str
    note: Optional[str] = None

class InterviewScheduleRequest(BaseModel):
    application_id: str
    interview_date: str
    interview_time: str
    interview_duration: Optional[str] = "30 minutes"
    interview_link: Optional[str] = None
    interview_instructions: Optional[str] = None

class TaskAssignRequest(BaseModel):
    application_id: str
    task_title: str
    task_description: str
    task_deadline: str

class TaskFeedbackRequest(BaseModel):
    application_id: str
    task_feedback: str
    task_score: int
    new_task_status: str
    stars: Optional[int] = None

class PPOOfferRequest(BaseModel):
    application_id: str
    ppo_role: str

class FeedbackRequest(BaseModel):
    student_id: str
    mentor_name: str
    feedback_text: str
    rating: int

class HireOfferRequest(BaseModel):
    application_id: str


# ── Helper ─────────────────────────────────────────────────────────────────────

def get_company_profile_dict(user_id: str, db: JSONDatabase):
    profiles = [p for p in db.data["company_profiles"] if p["user_id"] == user_id]
    return profiles[0] if profiles else None

def require_company(current_user: dict, db: JSONDatabase):
    if current_user["role"] != UserRole.COMPANY.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_company_profile_dict(current_user["id"], db)
    if not profile:
        raise HTTPException(status_code=404, detail="Company profile not found")
    return profile

def get_student_user(db: JSONDatabase, student: dict):
    """Return the user account record (holds the email) for a student profile."""
    for u in db.data.get("users", []):
        if u.get("id") == student.get("user_id"):
            return u
    return None

SHORTLIST_STATUSES = ("SHORTLISTED", "SHORTLISTED_FOR_INTERVIEW")


def get_rejection_reason(profile: dict) -> str:
    details = profile.get("verification_details") or {}
    return details.get("rejection_reason") or "Your company registration was rejected during verification."


def ensure_can_post_internships(profile: dict):
    """Block internship posting for companies rejected during verification."""
    if profile.get("verification_status") == "REJECTED":
        raise HTTPException(
            status_code=403,
            detail=f"Your company account is not approved to post internships. Reason: {get_rejection_reason(profile)}"
        )


# ── Company Profile ────────────────────────────────────────────────────────────

@router.get("/profile")
def get_company_profile(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    return {
        "id": profile["id"],
        "name": profile.get("name"),
        "industry": profile.get("industry"),
        "website": profile.get("website"),
        "logo_url": profile.get("logo_url"),
        "profile_picture": profile.get("profile_picture"),
        "cin": profile.get("cin"),
        "gstin": profile.get("gstin"),
        "verification_status": profile.get("verification_status"),
        "verification_errors": profile.get("verification_errors") or [],
        "rejection_reason": get_rejection_reason(profile) if profile.get("verification_status") == "REJECTED" else None,
        "reviewed_by": profile.get("reviewed_by"),
        "verified_at": profile.get("verified_at")
    }


@router.post("/profile/picture")
def upload_company_logo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)

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
        "message": "Company logo uploaded successfully.",
        "profile_picture": file_path
    }


@router.delete("/profile/picture")
def delete_company_logo(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)

    if profile.get("profile_picture"):
        if os.path.exists(profile["profile_picture"]):
            try:
                os.remove(profile["profile_picture"])
            except Exception:
                pass
        profile["profile_picture"] = None
        db.commit()

    return {"message": "Company logo removed."}


# ── Dashboard Stats ────────────────────────────────────────────────────────────

@router.get("/dashboard")
def get_dashboard_stats(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)

    internships = [j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]]
    job_ids = {j["id"] for j in internships}

    apps = [a for a in db.data["applications"] if a["internship_id"] in job_ids]

    active_postings = sum(1 for j in internships if j.get("status") == "ACTIVE")
    total_applicants = len(apps)
    interviews_scheduled = sum(
        1 for a in apps if a.get("status") in (
            "INTERVIEW_SCHEDULED", "INTERVIEWING", "SHORTLISTED_FOR_INTERVIEW", "INTERVIEW_COMPLETED"
        )
    )
    hires = sum(1 for a in apps if a.get("status") in ("SELECTED", "OFFER_SENT", "INTERNSHIP_ACTIVE", "COMPLETED"))
    ppos_offered = sum(1 for a in apps if a.get("ppo_status") == "OFFERED")
    ppos_accepted = sum(1 for a in apps if a.get("ppo_status") == "ACCEPTED")

    recent_internships = sorted(internships, key=lambda j: j.get("created_at", ""), reverse=True)[:5]
    internship_breakdown = []
    for j in recent_internships:
        count = sum(1 for a in apps if a["internship_id"] == j["id"])
        internship_breakdown.append({
            "id": j["id"],
            "title": j.get("title"),
            "status": j.get("status"),
            "location": j.get("location"),
            "applicants": count,
            "created_at": j.get("created_at")[:10] if j.get("created_at") else None
        })

    return {
        "active_postings": active_postings,
        "total_applicants": total_applicants,
        "interviews_scheduled": interviews_scheduled,
        "hires_made": hires,
        "ppos_offered": ppos_offered,
        "ppos_accepted": ppos_accepted,
        "recent_internships": internship_breakdown
    }


# ── Internships ────────────────────────────────────────────────────────────────

@router.post("/internships")
def create_internship(req: InternshipCreate, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    ensure_can_post_internships(profile)
    job = {
        "id": generate_uuid(),
        "title": req.title,
        "description": req.description,
        "requirements": req.requirements,
        "company_name": profile.get("name"),
        "company_profile_id": profile["id"],
        "eligible_institute_ids": req.eligible_institute_ids or [],
        "source": "INTERNAL",
        "stipend": req.stipend,
        "location": req.location,
        "duration": req.duration,
        "required_skills": req.required_skills,
        "vacancies": req.vacancies or 1,
        "deadline": req.deadline,
        "status": "ACTIVE",
        "created_at": datetime.utcnow().isoformat()
    }
    db.data["internships"].append(job)
    db.commit()
    return {"message": "Internship posted successfully", "id": job["id"]}


@router.get("/internships")
def get_posted_internships(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    jobs = sorted([j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]], key=lambda x: x.get("created_at", ""), reverse=True)

    result = []
    institutes = {i["id"]: i for i in db.data["institute_profiles"]}
    apps = db.data["applications"]

    for j in jobs:
        app_count = sum(1 for a in apps if a["internship_id"] == j["id"])
        eligible_ids = j.get("eligible_institute_ids") or (
            [j["institute_profile_id"]] if j.get("institute_profile_id") else []
        )
        eligible_names = [institutes[iid]["name"] for iid in eligible_ids if iid in institutes]
        result.append({
            "id": j["id"],
            "title": j.get("title"),
            "description": j.get("description"),
            "requirements": j.get("requirements"),
            "required_skills": j.get("required_skills") or [],
            "stipend": j.get("stipend"),
            "location": j.get("location"),
            "duration": j.get("duration"),
            "status": j.get("status"),
            "applicants": app_count,
            "created_at": j.get("created_at")[:10] if j.get("created_at") else None,
            "deadline": j.get("deadline"),
            "vacancies": j.get("vacancies", 1),
            "eligible_institute_ids": eligible_ids,
            "eligible_institute_names": eligible_names if eligible_names else ["All Colleges (Public)"]
        })
    return result


@router.patch("/internships/{internship_id}")
def update_internship(internship_id: str, req: InternshipUpdate, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    ensure_can_post_internships(profile)
    jobs = [j for j in db.data["internships"] if j["id"] == internship_id and j.get("company_profile_id") == profile["id"]]
    if not jobs:
        raise HTTPException(status_code=404, detail="Internship not found")
    job = jobs[0]
    
    if req.title is not None: job["title"] = req.title
    if req.description is not None: job["description"] = req.description
    if req.requirements is not None: job["requirements"] = req.requirements
    if req.stipend is not None: job["stipend"] = req.stipend
    if req.location is not None: job["location"] = req.location
    if req.duration is not None: job["duration"] = req.duration
    if req.required_skills is not None: job["required_skills"] = req.required_skills
    if req.status is not None: job["status"] = req.status
    if req.vacancies is not None: job["vacancies"] = req.vacancies
    if req.deadline is not None: job["deadline"] = req.deadline
    db.commit()
    return {"message": "Internship updated successfully"}


@router.delete("/internships/{internship_id}")
def close_internship(internship_id: str, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    jobs = [j for j in db.data["internships"] if j["id"] == internship_id and j.get("company_profile_id") == profile["id"]]
    if not jobs:
        raise HTTPException(status_code=404, detail="Internship not found")
    job = jobs[0]
    job["status"] = "CLOSED"
    db.commit()
    return {"message": "Internship closed successfully"}


# ── ATS Pipeline ───────────────────────────────────────────────────────────────

@router.get("/applicants")
def get_applicants(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)

    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = sorted([a for a in db.data["applications"] if a["internship_id"] in internships], key=lambda x: x.get("applied_at", ""), reverse=True)

    students = {s["id"]: s for s in db.data["student_profiles"]}
    institutes = {i["id"]: i for i in db.data["institute_profiles"]}

    results = []
    for a in apps:
        student = students.get(a["student_id"])
        if not student:
            continue
        inst = institutes.get(student.get("institute_id"))
        job = internships[a["internship_id"]]

        results.append({
            "id": a["id"],
            "internship_id": a["internship_id"],
            "job_title": job.get("title"),
            "student_id": student["id"],
            "student_name": student.get("name"),
            "student_branch": student.get("branch"),
            "student_cgpa": student.get("cgpa"),
            "student_skills": student.get("skills") or [],
            "student_resume": student.get("resume_path"),
            "student_profile_picture": student.get("profile_picture"),
            "github_url": student.get("github_url"),
            "linkedin_url": student.get("linkedin_url"),
            "college": inst["name"] if inst else "Unknown",
            "ats_score": a.get("ats_score"),
            "ai_verdict": a.get("ai_verdict") or {},
            "status": a.get("status"),
            "applied_at": a.get("applied_at")[:10] if a.get("applied_at") else None,
            "interview_date": a.get("interview_date")[:10] if a.get("interview_date") else None,
            "interview_time": a.get("interview_time"),
            "interview_duration": a.get("interview_duration"),
            "interview_link": a.get("interview_link"),
            "interview_instructions": a.get("interview_instructions"),
            "task_title": a.get("task_title"),
            "task_description": a.get("task_description"),
            "task_deadline": a.get("task_deadline")[:10] if a.get("task_deadline") else None,
            "task_status": a.get("task_status"),
            "task_score": a.get("task_score"),
            "task_feedback": a.get("task_feedback"),
            "task_submitted_at": a.get("task_submitted_at")[:10] if a.get("task_submitted_at") else None,
            "ppo_status": a.get("ppo_status"),
            "ppo_role": a.get("ppo_role"),
            "certificate_path": a.get("certificate_path"),
            "offer_letter_path": a.get("offer_letter_path")
        })
    return results


@router.post("/applicants/status")
def update_applicant_status(req: StatusUpdateRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    
    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = [a for a in db.data["applications"] if a["id"] == req.application_id and a["internship_id"] in internships]
    if not apps:
        raise HTTPException(status_code=404, detail="Application record not found")
    app = apps[0]

    old_status = app.get("status")
    app["status"] = req.status

    if "status_history" not in app:
        app["status_history"] = []
    
    app["status_history"].append({
        "status": req.status,
        "timestamp": datetime.utcnow().isoformat(),
        "changed_from": old_status,
        "note": req.note or ""
    })

    students = [s for s in db.data["student_profiles"] if s["id"] == app["student_id"]]
    student = students[0]
    job = internships[app["internship_id"]]

    if student.get("user_id"):
        notif = {
            "id": generate_uuid(),
            "user_id": student["user_id"],
            "message": f"Your application for '{job.get('title')}' at {profile.get('name')} has been updated to {req.status}.",
            "type": "APPLICATION",
            "reference_id": app["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)

    db.commit()

    # Send shortlisting email to the student's email address
    email_result = {"sent": False, "reason": ""}
    if req.status in SHORTLIST_STATUSES:
        student_user = get_student_user(db, student)
        if student_user and student_user.get("email"):
            print(f"[SHORTLIST] Sending shortlist email to {student_user['email']}...")
            email_result = email_service.send_shortlist_email(
                to_email=student_user["email"],
                student_name=student.get("name", "Candidate"),
                company_name=profile.get("name", "Company"),
                internship_role=job.get("title", "Intern"),
                note=req.note or "",
            )
        else:
            email_result = {"sent": False, "reason": "Student email not found"}
        print(f"[SHORTLIST] Email result: {email_result}")

    return {
        "message": "Status updated successfully",
        "status": app["status"],
        "email_sent": email_result.get("sent", False),
        "email_detail": email_result.get("reason") if not email_result.get("sent") else "Shortlist email sent successfully"
    }


# ── Interview Scheduling ───────────────────────────────────────────────────────

@router.post("/applicants/schedule-interview")
def schedule_interview(req: InterviewScheduleRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    
    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = [a for a in db.data["applications"] if a["id"] == req.application_id and a["internship_id"] in internships]
    if not apps:
        raise HTTPException(status_code=404, detail="Application not found")
    app = apps[0]

    app["interview_date"] = req.interview_date
    app["interview_time"] = req.interview_time
    app["interview_duration"] = req.interview_duration
    app["interview_link"] = req.interview_link or "https://meet.google.com"
    app["interview_instructions"] = req.interview_instructions
    app["status"] = "INTERVIEW_SCHEDULED"

    if "status_history" not in app:
        app["status_history"] = []
        
    app["status_history"].append({
        "status": "INTERVIEW_SCHEDULED",
        "timestamp": datetime.utcnow().isoformat(),
        "note": f"Interview scheduled on {req.interview_date} at {req.interview_time}"
    })

    students = [s for s in db.data["student_profiles"] if s["id"] == app["student_id"]]
    student = students[0]
    job = internships[app["internship_id"]]

    if student.get("user_id"):
        notif = {
            "id": generate_uuid(),
            "user_id": student["user_id"],
            "message": f"Interview scheduled for '{job.get('title')}' at {profile.get('name')} on {req.interview_date} at {req.interview_time}. Link: {app.get('interview_link')}",
            "type": "INTERVIEW",
            "reference_id": app["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)

    db.commit()

    # Send interview invitation email to the student's email address
    student_user = get_student_user(db, student)
    email_result = {"sent": False, "reason": "Student email not found"}
    if student_user and student_user.get("email"):
        print(f"[INTERVIEW] Sending interview email to {student_user['email']}...")
        email_result = email_service.send_interview_email(
            to_email=student_user["email"],
            student_name=student.get("name", "Candidate"),
            company_name=profile.get("name", "Company"),
            internship_role=job.get("title", "Intern"),
            interview_date=req.interview_date,
            interview_time=req.interview_time,
            interview_duration=req.interview_duration or "30 minutes",
            interview_link=app.get("interview_link") or "",
            instructions=req.interview_instructions or "",
        )
    else:
        print(f"[INTERVIEW] Email NOT sent: {email_result['reason']}")
    print(f"[INTERVIEW] Email result: {email_result}")

    return {
        "message": "Interview scheduled successfully",
        "interview_link": app["interview_link"],
        "email_sent": email_result.get("sent", False),
        "email_detail": email_result.get("reason") if not email_result.get("sent") else "Interview email sent successfully"
    }


# ── Hire & Send Offer Letter ──────────────────────────────────────────────────

@router.post("/applicants/hire-offer")
def hire_and_send_offer(req: HireOfferRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)

    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = [a for a in db.data["applications"] if a["id"] == req.application_id and a["internship_id"] in internships]
    if not apps:
        raise HTTPException(status_code=404, detail="Application not found")
    app = apps[0]

    students = [s for s in db.data["student_profiles"] if s["id"] == app["student_id"]]
    if not students:
        raise HTTPException(status_code=404, detail="Student profile not found")
    student = students[0]
    job = internships[app["internship_id"]]

    start_date = datetime.utcnow().strftime("%B %d, %Y")

    pdf_path = f"./uploads/offer-letters/{app['id']}_offer_letter.pdf"
    PDFService.generate_offer_letter(
        output_path=pdf_path,
        student_name=student.get("name", "Candidate"),
        company_name=profile.get("name", "Company"),
        internship_role=job.get("title", "Intern"),
        duration=job.get("duration", "3 Months"),
        stipend=job.get("stipend", "Not Disclosed"),
        location=job.get("location", "Remote"),
        start_date=start_date,
        description=job.get("description", "")
    )

    old_status = app.get("status")
    app["status"] = "OFFER_SENT"
    app["offer_letter_path"] = pdf_path

    if "status_history" not in app:
        app["status_history"] = []
    app["status_history"].append({
        "status": "OFFER_SENT",
        "timestamp": datetime.utcnow().isoformat(),
        "changed_from": old_status,
        "note": "Hired candidate and sent offer letter."
    })

    if student.get("user_id"):
        notif = {
            "id": generate_uuid(),
            "user_id": student["user_id"],
            "message": f"Congratulations! You have been hired for '{job.get('title')}' at {profile.get('name')}. Your offer letter is ready for download.",
            "type": "APPLICATION",
            "reference_id": app["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)

    db.commit()

    # Send congratulation email with offer letter PDF attached
    student_user = get_student_user(db, student)
    if student_user:
        print(f"[HIRE] Found student user: {student_user.get('email')}")
    else:
        print(f"[HIRE] WARNING: No user found for user_id={student.get('user_id')}")

    email_result = {"sent": False, "reason": "Student email not found"}
    if student_user and student_user.get("email"):
        print(f"[HIRE] Sending offer letter email to {student_user['email']}...")
        email_result = email_service.send_offer_letter_email(
            to_email=student_user["email"],
            student_name=student.get("name", "Candidate"),
            company_name=profile.get("name", "Company"),
            internship_role=job.get("title", "Intern"),
            duration=job.get("duration", "3 Months"),
            stipend=job.get("stipend", "Not Disclosed"),
            location=job.get("location", "Remote"),
            start_date=start_date,
            pdf_path=pdf_path,
        )
    else:
        print(f"[HIRE] Email NOT sent: {email_result['reason']}")

    print(f"[HIRE] Email result: {email_result}")

    return {
        "message": "Candidate hired and offer letter sent",
        "offer_letter_path": pdf_path,
        "email_sent": email_result.get("sent", False),
        "email_detail": email_result.get("reason") if not email_result.get("sent") else "Offer letter emailed successfully"
    }


# ── Active Interns ─────────────────────────────────────────────────────────────

@router.get("/interns")
def get_active_interns(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)

    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = [a for a in db.data["applications"] if a["internship_id"] in internships and a.get("status") in ["SELECTED", "OFFER_SENT", "INTERNSHIP_ACTIVE"]]

    students = {s["id"]: s for s in db.data["student_profiles"]}

    results = []
    for a in apps:
        student = students.get(a["student_id"])
        if not student: continue
        job = internships[a["internship_id"]]
        
        results.append({
            "application_id": a["id"],
            "student_id": student["id"],
            "student_name": student.get("name"),
            "student_branch": student.get("branch"),
            "student_cgpa": student.get("cgpa"),
            "internship_title": job.get("title"),
            "internship_id": a["internship_id"],
            "github_url": student.get("github_url"),
            "linkedin_url": student.get("linkedin_url"),
            "status": a.get("status"),
            "task_title": a.get("task_title"),
            "task_status": a.get("task_status"),
            "task_deadline": a.get("task_deadline")[:10] if a.get("task_deadline") else None,
            "task_score": a.get("task_score"),
            "offer_letter_path": a.get("offer_letter_path"),
            "ppo_status": a.get("ppo_status"),
            "ppo_role": a.get("ppo_role"),
            "certificate_path": a.get("certificate_path"),
        })
    return results


# ── Task Management ────────────────────────────────────────────────────────────

@router.post("/interns/assign-task")
def assign_task(req: TaskAssignRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = [a for a in db.data["applications"] if a["id"] == req.application_id and a["internship_id"] in internships]
    if not apps:
        raise HTTPException(status_code=404, detail="Application not found")
    app = apps[0]

    app["task_title"] = req.task_title
    app["task_description"] = req.task_description
    app["task_deadline"] = req.task_deadline
    app["task_assigned_date"] = datetime.utcnow().isoformat()
    app["task_status"] = "ASSIGNED"

    students = [s for s in db.data["student_profiles"] if s["id"] == app["student_id"]]
    if students and students[0].get("user_id"):
        notif = {
            "id": generate_uuid(),
            "user_id": students[0]["user_id"],
            "message": f"New task assigned for your internship at {profile.get('name')}: '{req.task_title}'. Deadline: {req.task_deadline}",
            "type": "TASK",
            "reference_id": app["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)
        
    db.commit()
    return {"message": "Task assigned successfully"}


@router.post("/interns/task-feedback")
def submit_task_feedback(req: TaskFeedbackRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = [a for a in db.data["applications"] if a["id"] == req.application_id and a["internship_id"] in internships]
    if not apps:
        raise HTTPException(status_code=404, detail="Application not found")
    app = apps[0]

    app["task_feedback"] = req.task_feedback
    app["task_score"] = req.task_score
    app["task_status"] = req.new_task_status
    if req.stars is not None:
        app["task_stars"] = req.stars

    students = [s for s in db.data["student_profiles"] if s["id"] == app["student_id"]]
    if students and students[0].get("user_id"):
        notif = {
            "id": generate_uuid(),
            "user_id": students[0]["user_id"],
            "message": f"Task feedback received for '{app.get('task_title')}' at {profile.get('name')}. Score: {req.task_score}/100. Status: {req.new_task_status}",
            "type": "TASK",
            "reference_id": app["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)
        
    db.commit()
    return {"message": "Task feedback submitted successfully"}


# ── PPO & Certificate ──────────────────────────────────────────────────────────

@router.post("/interns/offer-ppo")
def offer_ppo(req: PPOOfferRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = [a for a in db.data["applications"] if a["id"] == req.application_id and a["internship_id"] in internships]
    if not apps:
        raise HTTPException(status_code=404, detail="Application not found")
    app = apps[0]

    app["ppo_status"] = "OFFERED"
    app["ppo_role"] = req.ppo_role
    app["ppo_offer_date"] = datetime.utcnow().isoformat()

    students = [s for s in db.data["student_profiles"] if s["id"] == app["student_id"]]
    if students and students[0].get("user_id"):
        notif = {
            "id": generate_uuid(),
            "user_id": students[0]["user_id"],
            "message": f"🎉 Congratulations! You have received a Pre-Placement Offer (PPO) for the role of '{req.ppo_role}' from {profile.get('name')}!",
            "type": "PPO",
            "reference_id": app["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)
        
    db.commit()
    return {"message": "PPO offered successfully"}


@router.post("/generate-certificate")
def generate_intern_certificate(application_id: str, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = [a for a in db.data["applications"] if a["id"] == application_id and a["internship_id"] in internships]
    if not apps:
        raise HTTPException(status_code=404, detail="Application record not found")
    app = apps[0]

    students = [s for s in db.data["student_profiles"] if s["id"] == app["student_id"]]
    student = students[0]
    job = internships[app["internship_id"]]

    os.makedirs("./uploads/certificates", exist_ok=True)
    pdf_path = f"./uploads/certificates/{student['id']}_{job['id']}_completion.pdf"

    PDFService.generate_completion_certificate(
        output_path=pdf_path,
        student_name=student.get("name"),
        company_name=profile.get("name"),
        internship_role=job.get("title"),
        duration=job.get("duration") or "3 Months"
    )

    app["certificate_path"] = pdf_path
    app["status"] = "COMPLETED"
    app["completion_date"] = datetime.utcnow().isoformat()

    if "status_history" not in app:
        app["status_history"] = []
    
    app["status_history"].append({
        "status": "COMPLETED",
        "timestamp": datetime.utcnow().isoformat(),
        "note": "Completion certificate issued by company"
    })

    if student.get("user_id"):
        notif = {
            "id": generate_uuid(),
            "user_id": student["user_id"],
            "message": f"🏆 Your internship completion certificate from {profile.get('name')} for '{job.get('title')}' has been issued!",
            "type": "CERTIFICATE",
            "reference_id": app["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)
        
    db.commit()
    return {"message": "Certificate generated and internship marked complete", "pdf_path": pdf_path}


# ── Mentor Feedback ────────────────────────────────────────────────────────────

@router.post("/feedback")
def submit_mentor_feedback(req: FeedbackRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = [a for a in db.data["applications"] if a["student_id"] == req.student_id and a["internship_id"] in internships]
    if not apps:
        raise HTTPException(status_code=404, detail="Student is not an intern of this company")

    feedback = {
        "id": generate_uuid(),
        "student_id": req.student_id,
        "mentor_name": req.mentor_name,
        "feedback_text": req.feedback_text,
        "rating": req.rating,
        "created_at": datetime.utcnow().isoformat()
    }
    db.data["mentor_feedbacks"].append(feedback)
    db.commit()
    return {"message": "Feedback submitted successfully"}


@router.get("/feedback/{student_id}")
def get_student_feedback(student_id: str, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    require_company(current_user, db)
    feedbacks = sorted([f for f in db.data["mentor_feedbacks"] if f["student_id"] == student_id], key=lambda x: x.get("created_at", ""), reverse=True)
    return [{
        "id": f["id"],
        "mentor_name": f.get("mentor_name"),
        "feedback_text": f.get("feedback_text"),
        "rating": f.get("rating"),
        "created_at": f.get("created_at")[:10] if f.get("created_at") else None
    } for f in feedbacks]


# ── Onboarding Approval ────────────────────────────────────────────────────────

@router.post("/interns/approve-onboarding")
def approve_onboarding(application_id: str, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = [a for a in db.data["applications"] if a["id"] == application_id and a["internship_id"] in internships]
    if not apps:
        raise HTTPException(status_code=404, detail="Application not found")
    app = apps[0]

    if not app.get("onboarding_docs"):
        raise HTTPException(status_code=400, detail="No onboarding documents uploaded by student yet")

    app["onboarding_status"] = "APPROVED"
    app["status"] = "INTERNSHIP_ACTIVE"

    if "status_history" not in app:
        app["status_history"] = []
    app["status_history"].append({
        "status": "INTERNSHIP_ACTIVE",
        "timestamp": datetime.utcnow().isoformat(),
        "note": "Onboarding documents approved. Internship is now active."
    })

    students = [s for s in db.data["student_profiles"] if s["id"] == app["student_id"]]
    if students and students[0].get("user_id"):
        job = internships.get(app["internship_id"], {})
        notif = {
            "id": generate_uuid(),
            "user_id": students[0]["user_id"],
            "message": f"Your onboarding documents have been approved by {profile.get('name')}. Your internship for '{job.get('title')}' is now active! Tasks will be assigned shortly.",
            "type": "APPLICATION",
            "reference_id": app["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)

    db.commit()
    return {"message": "Onboarding approved. Internship activated."}


# ── Multi-Task Management ─────────────────────────────────────────────────────

class TaskCreateRequest(BaseModel):
    application_id: str
    title: str
    description: str
    deadline: str

class TaskUpdateRequest(BaseModel):
    task_id: str
    github_link: Optional[str] = None
    submission_notes: Optional[str] = None

class TaskEvaluateRequest(BaseModel):
    task_id: str
    feedback: str
    stars: int


@router.post("/tasks/assign")
def assign_task_v2(req: TaskCreateRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = [a for a in db.data["applications"] if a["id"] == req.application_id and a["internship_id"] in internships]
    if not apps:
        raise HTTPException(status_code=404, detail="Application not found")
    app = apps[0]

    task = {
        "id": generate_uuid(),
        "application_id": req.application_id,
        "student_id": app["student_id"],
        "company_profile_id": profile["id"],
        "title": req.title,
        "description": req.description,
        "deadline": req.deadline,
        "assigned_date": datetime.utcnow().isoformat(),
        "status": "ASSIGNED",
        "github_link": None,
        "submission_notes": None,
        "submitted_at": None,
        "feedback": None,
        "stars": None,
        "evaluated_at": None
    }
    db.data["internship_tasks"].append(task)

    students = [s for s in db.data["student_profiles"] if s["id"] == app["student_id"]]
    if students and students[0].get("user_id"):
        notif = {
            "id": generate_uuid(),
            "user_id": students[0]["user_id"],
            "message": f"New task assigned: '{req.title}'. Deadline: {req.deadline}. Company: {profile.get('name')}",
            "type": "TASK",
            "reference_id": task["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)

    db.commit()
    return {"message": "Task assigned successfully", "task_id": task["id"]}


@router.get("/tasks")
def get_company_tasks(status: str = "all", current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    internships = {j["id"]: j for j in db.data["internships"] if j.get("company_profile_id") == profile["id"]}
    apps = {a["id"]: a for a in db.data["applications"] if a["internship_id"] in internships}
    students = {s["id"]: s for s in db.data["student_profiles"]}

    tasks = [t for t in db.data["internship_tasks"] if t["company_profile_id"] == profile["id"]]
    if status != "all":
        tasks = [t for t in tasks if t.get("status") == status.upper()]

    tasks = sorted(tasks, key=lambda x: x.get("assigned_date", ""), reverse=True)

    results = []
    for t in tasks:
        app = apps.get(t["application_id"], {})
        student = students.get(t["student_id"], {})
        job = internships.get(app.get("internship_id"), {})
        results.append({
            **t,
            "student_name": student.get("name"),
            "student_branch": student.get("branch"),
            "student_cgpa": student.get("cgpa"),
            "internship_title": job.get("title"),
        })
    return results


@router.post("/tasks/evaluate")
def evaluate_task(req: TaskEvaluateRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    tasks = [t for t in db.data["internship_tasks"] if t["id"] == req.task_id and t["company_profile_id"] == profile["id"]]
    if not tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    task = tasks[0]

    task["feedback"] = req.feedback
    task["stars"] = max(1, min(5, req.stars))
    task["status"] = "EVALUATED"
    task["evaluated_at"] = datetime.utcnow().isoformat()

    students = [s for s in db.data["student_profiles"] if s["id"] == task["student_id"]]
    if students and students[0].get("user_id"):
        notif = {
            "id": generate_uuid(),
            "user_id": students[0]["user_id"],
            "message": f"Task '{task.get('title')}' has been evaluated by {profile.get('name')}. Rating: {'⭐' * req.stars}. Feedback: {req.feedback[:80]}...",
            "type": "TASK",
            "reference_id": task["id"],
            "is_read": False,
            "created_at": datetime.utcnow().isoformat()
        }
        db.data["notifications"].append(notif)

    db.commit()
    return {"message": "Task evaluated successfully"}


@router.delete("/tasks/{task_id}")
def delete_task(task_id: str, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    profile = require_company(current_user, db)
    tasks = [t for t in db.data["internship_tasks"] if t["id"] == task_id and t["company_profile_id"] == profile["id"]]
    if not tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    db.data["internship_tasks"] = [t for t in db.data["internship_tasks"] if t["id"] != task_id]
    db.commit()
    return {"message": "Task deleted successfully"}
