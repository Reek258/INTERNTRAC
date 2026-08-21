from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import re
from datetime import datetime

from app.core.db import get_db, JSONDatabase
from app.api.auth import get_current_user
from app.models.models import UserRole, generate_uuid
from app.services.groq_service import groq_service
from app.services.resume_parser import ResumeParser
from app.services.scraper import ScraperService
from app.services.branch_utils import internship_relevance_score

router = APIRouter(prefix="/students", tags=["students"])

# Pydantic Request Schemas
class ProfileUpdate(BaseModel):
    name: str
    mobile: Optional[str] = None
    dob: Optional[str] = ""
    gender: Optional[str] = ""
    address: Optional[str] = ""
    portfolio_url: Optional[str] = ""
    github_url: Optional[str] = ""
    linkedin_url: Optional[str] = ""
    skills: Optional[List[str]] = []
    degree: Optional[str] = "B.Tech"
    branch: Optional[str] = "Computer Science"
    semester: Optional[str] = "Year 4"
    cgpa: Optional[float] = None
    graduation_year: Optional[int] = 2025
    certifications: Optional[List[Dict[str, Any]]] = []
    institute_id: Optional[str] = None
    institute_name: Optional[str] = "GHRCE Nagpur / Raisoni Group"

class EligibilityCheckRequest(BaseModel):
    internship_id: Optional[str] = None
    title: Optional[str] = ""
    company_name: Optional[str] = ""
    description: Optional[str] = ""
    requirements: Optional[str] = ""
    required_skills: Optional[List[str]] = []
    preferred_skills: Optional[List[str]] = []
    min_cgpa: Optional[float] = 0.0
    eligible_branches: Optional[List[str]] = []
    eligible_degree: Optional[str] = ""

class TaskSubmissionRequest(BaseModel):
    submission_notes: str

class AttendanceRequest(BaseModel):
    date: str # YYYY-MM-DD
    hours: float
    task_details: str

class NocRequestForm(BaseModel):
    internship_id: str

class TaskSubmitV2(BaseModel):
    github_link: Optional[str] = None
    submission_notes: str

class OnboardingUploadForm(BaseModel):
    aadhaar_number: Optional[str] = ""
    pan_number: Optional[str] = ""
    bank_account: Optional[str] = ""
    bank_ifsc: Optional[str] = ""
    address: Optional[str] = ""
    emergency_contact: Optional[str] = ""


def get_student_profile_dict(user_id: str, db: JSONDatabase):
    profiles = [p for p in db.data["student_profiles"] if p["user_id"] == user_id]
    return profiles[0] if profiles else None

@router.get("/profile")
def get_student_profile(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")
    
    institute_name = profile.get("institute_name") or "GHRCE Nagpur / Raisoni Group"
    if profile.get("institute_id"):
        insts = [i for i in db.data["institute_profiles"] if i["id"] == profile["institute_id"]]
        if insts:
            institute_name = insts[0]["name"]
    
    fields_to_check = [
        profile.get("name"), current_user.get("email"), profile.get("mobile"), profile.get("degree"),
        profile.get("branch"), profile.get("cgpa"), profile.get("skills"), profile.get("resume_path"),
        profile.get("github_url") or profile.get("linkedin_url")
    ]
    completed_fields = sum(1 for f in fields_to_check if f)
    completion_percentage = int((completed_fields / len(fields_to_check)) * 100)

    return {
        **profile,
        "email": current_user["email"],
        "institute_name": institute_name,
        "profile_completion": completion_percentage
    }

@router.put("/profile")
def update_student_profile(req: ProfileUpdate, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    if not req.name or not req.name.strip():
        raise HTTPException(status_code=400, detail="Full Name cannot be empty.")
    profile["name"] = req.name.strip()

    if req.mobile:
        clean_mobile = "".join(c for c in req.mobile if c.isdigit())
        if len(clean_mobile) != 10:
            raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number.")
        if clean_mobile != profile.get("mobile"):
            if any(p.get("mobile") == clean_mobile and p["id"] != profile["id"] for p in db.data["student_profiles"]):
                raise HTTPException(status_code=400, detail="An account with this mobile number already exists.")
        profile["mobile"] = clean_mobile
    else:
        profile["mobile"] = None

    if req.cgpa is not None:
        if req.cgpa < 0.0 or req.cgpa > 10.0:
            raise HTTPException(status_code=400, detail="Please enter a valid CGPA between 0.0 and 10.0.")
        profile["cgpa"] = round(req.cgpa, 2)
    else:
        profile["cgpa"] = None

    if req.skills is not None:
        seen = set()
        normalized_skills = []
        for s in req.skills:
            clean_s = s.strip()
            if clean_s and clean_s.lower() not in seen:
                seen.add(clean_s.lower())
                normalized_skills.append(clean_s)
        profile["skills"] = normalized_skills

    profile["dob"] = req.dob.strip() if req.dob else ""
    profile["gender"] = req.gender.strip() if req.gender else ""
    profile["address"] = req.address.strip() if req.address else ""
    profile["portfolio_url"] = req.portfolio_url.strip() if req.portfolio_url else ""
    profile["github_url"] = req.github_url.strip() if req.github_url else ""
    profile["linkedin_url"] = req.linkedin_url.strip() if req.linkedin_url else ""
    profile["degree"] = req.degree.strip() if req.degree else "B.Tech"
    profile["branch"] = req.branch.strip() if req.branch else "Computer Science"
    profile["semester"] = req.semester.strip() if req.semester else "Year 4"
    profile["graduation_year"] = req.graduation_year
    profile["certifications"] = req.certifications or []
    if req.institute_id is not None:
        profile["institute_id"] = req.institute_id
    if req.institute_name is not None:
        profile["institute_name"] = req.institute_name.strip()

    db.commit()
    return {"message": "Profile updated successfully"}

@router.post("/profile/resume")
def upload_resume(file: UploadFile = File(...), current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)

    filename = file.filename or "resume.pdf"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX resume files are supported.")

    file_bytes = file.file.read()
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds the 5MB limit.")
    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    os.makedirs("./uploads/resumes", exist_ok=True)
    safe_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", filename)
    file_path = f"./uploads/resumes/{profile['id']}_{safe_filename}"
    
    with open(file_path, "wb") as f:
        f.write(file_bytes)
    
    try:
        extracted_text = ResumeParser.extract_text_from_file(file_path)
    except ValueError as ve:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=400, detail=str(ve))

    profile["resume_path"] = file_path
    new_skills = ResumeParser.extract_skills_from_text(extracted_text)
    current_skills = profile.get("skills") or []
    existing_skills_lower = {s.lower() for s in current_skills}
    for sk in new_skills:
        if sk.lower() not in existing_skills_lower:
            current_skills.append(sk)
            existing_skills_lower.add(sk.lower())
    
    profile["skills"] = current_skills
    db.commit()

    return {
        "message": "Resume uploaded successfully.",
        "resume_filename": filename,
        "resume_path": file_path,
        "skills": profile["skills"]
    }

@router.post("/profile/picture")
def upload_profile_picture(file: UploadFile = File(...), current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    filename = file.filename or "photo.jpg"
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
    file_path = f"./uploads/profile-pictures/{profile['id']}_profile{ext}"

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
        "message": "Profile picture uploaded successfully.",
        "profile_picture": file_path
    }

@router.delete("/profile/picture")
def delete_profile_picture(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)
    if not profile:
        raise HTTPException(status_code=404, detail="Student profile not found")

    if profile.get("profile_picture"):
        if os.path.exists(profile["profile_picture"]):
            try:
                os.remove(profile["profile_picture"])
            except Exception:
                pass
        profile["profile_picture"] = None
        db.commit()

    return {"message": "Profile picture removed."}

@router.get("/dashboard-stats")
def get_dashboard_stats(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)
    
    apps = [a for a in db.data["applications"] if a["student_id"] == profile["id"]]
    
    total_apps = len(apps)
    under_review = sum(1 for a in apps if a.get("status") in ["APPLIED", "UNDER_REVIEW"])
    shortlisted = sum(1 for a in apps if a.get("status") in ["SHORTLISTED", "SHORTLISTED_FOR_INTERVIEW", "INTERVIEWING"])
    upcoming_interviews = sum(1 for a in apps if a.get("interview_date") and a.get("status") in ["INTERVIEW_SCHEDULED", "SHORTLISTED_FOR_INTERVIEW", "INTERVIEWING"])
    active_internships = sum(1 for a in apps if a.get("status") in ["SELECTED", "INTERNSHIP_ACTIVE", "OFFER_SENT"])
    completed_internships = sum(1 for a in apps if a.get("status") == "COMPLETED")
    pending_tasks = sum(1 for a in apps if a.get("task_status") in ["ASSIGNED", "IN_PROGRESS", "REVISION_REQUIRED"])

    scores = [a.get("ats_score", 0) for a in apps if a.get("ats_score") is not None]
    avg_ats_score = int(sum(scores) / len(scores)) if scores else 0

    fields = [profile.get("name"), current_user.get("email"), profile.get("mobile"), profile.get("degree"), profile.get("branch"), profile.get("cgpa"), profile.get("skills"), profile.get("resume_path")]
    profile_comp = int((sum(1 for f in fields if f) / len(fields)) * 100)

    return {
        "profile_completion": profile_comp,
        "total_applications": total_apps,
        "under_review": under_review,
        "shortlisted": shortlisted,
        "upcoming_interviews": upcoming_interviews,
        "active_internships": active_internships,
        "completed_internships": completed_internships,
        "pending_tasks": pending_tasks,
        "average_ats_score": avg_ats_score,
        "has_resume": bool(profile.get("resume_path"))
    }

@router.get("/internships")
def get_internships(source: str = "all", current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)

    internal_listings = [
        i for i in db.data["internships"] 
        if i.get("source") == "INTERNAL" and 
        (
            not i.get("eligible_institute_ids") or
            len(i.get("eligible_institute_ids", [])) == 0 or
            profile.get("institute_id") in i.get("eligible_institute_ids", []) or
            not profile.get("institute_id")
        )
    ]
    
    scraped_listings = []
    if source in ["all", "explore"]:
        scraped_listings = ScraperService.scrape_explore_internships()

    apps = [a for a in db.data["applications"] if a["student_id"] == profile["id"]]
    applied_map = {a["internship_id"]: a for a in apps}

    institutes_map = {i["id"]: i["name"] for i in db.data["institute_profiles"]}

    results = []
    for item in internal_listings:
        app = applied_map.get(item["id"])
        results.append({
            "id": item["id"],
            "title": item["title"],
            "company_name": item["company_name"],
            "description": item["description"],
            "requirements": item["requirements"],
            "required_skills": item.get("required_skills") or [s.strip() for s in item.get("requirements", "").split(",") if s.strip()][:5],
            "preferred_skills": item.get("preferred_skills", []),
            "min_cgpa": item.get("min_cgpa", 0.0),
            "eligible_branches": item.get("eligible_branches", []),
            "eligible_degree": item.get("eligible_degree", "All Degrees"),
            "stipend": item.get("stipend", "Not Disclosed"),
            "location": item.get("location", "Remote"),
            "work_mode": item.get("work_mode", "Remote"),
            "duration": item.get("duration", "3 Months"),
            "deadline": item.get("deadline"),
            "vacancies": item.get("vacancies", 1),
            "status": item.get("status", "ACTIVE"),
            "openings": item.get("openings", 1),
            "source": "INTERNAL",
            "scraped_from": "Institute Board" if (item.get("eligible_institute_ids") and len(item.get("eligible_institute_ids", [])) > 0) else "Campus Drive",
            "link": "",
            "is_applied": app is not None,
            "application_status": app["status"] if app else None,
            "ats_score": app["ats_score"] if app else None,
            "eligible_institute_names": [institutes_map[iid] for iid in (item.get("eligible_institute_ids") or []) if iid in institutes_map]
        })

    for item in scraped_listings:
        existing_jobs = [j for j in db.data["internships"] if j["title"] == item["title"] and j["company_name"] == item["company_name"] and j.get("source") == "SCRAPED"]
        existing_job = existing_jobs[0] if existing_jobs else None
        app = applied_map.get(existing_job["id"]) if existing_job else None

        req_skills = [s.strip() for s in item["requirements"].split(",") if s.strip()][:6]
        results.append({
            "id": existing_job["id"] if existing_job else None,
            "title": item["title"],
            "company_name": item["company_name"],
            "description": item["description"],
            "requirements": item["requirements"],
            "required_skills": req_skills,
            "preferred_skills": [],
            "min_cgpa": 0.0,
            "eligible_branches": item.get("eligible_branches", []),
            "eligible_degree": "All Degrees",
            "stipend": item["stipend"],
            "location": item["location"],
            "work_mode": "Remote",
            "duration": item.get("duration", "3-6 Months"),
            "deadline": None,
            "status": "ACTIVE",
            "openings": 1,
            "source": "SCRAPED",
            "scraped_from": item["scraped_from"],
            "link": item["link"],
            "is_applied": app is not None,
            "application_status": app["status"] if app else None,
            "ats_score": app["ats_score"] if app else None
        })

    student_branch = (profile.get("branch") or "").strip()
    if student_branch:
        # Branch-relevant internships first (e.g. software roles for Computer
        # Engineering, CAD roles for Mechanical), everything else below.
        results.sort(key=lambda item: internship_relevance_score(student_branch, item))

    return results

@router.get("/internships/{internship_id}")
def get_internship_detail(internship_id: str, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    
    items = [i for i in db.data["internships"] if i["id"] == internship_id]
    if not items:
        raise HTTPException(status_code=404, detail="Internship listing not found")
    item = items[0]

    profile = get_student_profile_dict(current_user["id"], db)
    apps = [a for a in db.data["applications"] if a["student_id"] == profile["id"] and a["internship_id"] == item["id"]]
    app = apps[0] if apps else None

    return {
        **item,
        "is_applied": app is not None,
        "application_status": app["status"] if app else None,
        "ats_score": app.get("ats_score") if app else None
    }

@router.post("/check-eligibility")
def check_eligibility(req: EligibilityCheckRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)

    resume_text = ""
    if profile.get("resume_path") and os.path.exists(profile["resume_path"]):
        try:
            resume_text = ResumeParser.extract_text_from_file(profile["resume_path"])
        except Exception:
            resume_text = f"Student: {profile.get('name')}. Skills: {', '.join(profile.get('skills') or [])}."
    else:
        resume_text = f"Student: {profile.get('name')}. Degree: {profile.get('degree')}. Skills: {', '.join(profile.get('skills') or [])}."

    internship_data = {
        "title": req.title or "",
        "company_name": req.company_name or "",
        "description": req.description or "",
        "requirements": req.requirements or "",
        "required_skills": req.required_skills or [],
        "preferred_skills": req.preferred_skills or [],
        "min_cgpa": req.min_cgpa or 0.0,
        "eligible_branches": req.eligible_branches or [],
        "eligible_degree": req.eligible_degree or ""
    }

    if req.internship_id:
        db_jobs = [j for j in db.data["internships"] if j["id"] == req.internship_id]
        if db_jobs:
            db_job = db_jobs[0]
            internship_data.update(db_job)

    student_data = {
        "name": profile.get("name"),
        "degree": profile.get("degree"),
        "branch": profile.get("branch"),
        "semester": profile.get("semester"),
        "cgpa": profile.get("cgpa"),
        "skills": profile.get("skills") or [],
        "certifications": profile.get("certifications") or []
    }

    report = groq_service.evaluate_eligibility(student_data, resume_text, internship_data)
    return report

@router.post("/apply")
def apply_internship(
    job_id: Optional[str] = Form(None),
    title: str = Form(...),
    company_name: str = Form(...),
    description: str = Form(...),
    requirements: str = Form(...),
    stipend: str = Form(...),
    location: str = Form(...),
    source: str = Form(...),
    scraped_from: str = Form(...),
    link: str = Form(""),
    current_user: dict = Depends(get_current_user), 
    db: JSONDatabase = Depends(get_db)
):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)
    
    if not profile.get("resume_path") or not os.path.exists(profile["resume_path"]):
        raise HTTPException(status_code=400, detail="Please upload your resume in your Student Profile before applying.")

    if source == "SCRAPED":
        jobs = [j for j in db.data["internships"] if j["title"] == title and j["company_name"] == company_name and j.get("source") == "SCRAPED"]
        if not jobs:
            job = {
                "id": generate_uuid(),
                "title": title,
                "description": description,
                "requirements": requirements,
                "company_name": company_name,
                "source": "SCRAPED",
                "scraped_from": scraped_from,
                "stipend": stipend,
                "location": location,
                "link": link,
                "status": "ACTIVE",
                "created_at": datetime.utcnow().isoformat()
            }
            db.data["internships"].append(job)
            db.commit()
        else:
            job = jobs[0]
        job_id = job["id"]
    else:
        jobs = [j for j in db.data["internships"] if j["id"] == job_id]
        if not jobs:
            raise HTTPException(status_code=404, detail="Job listing not found")
        job = jobs[0]

    if job.get("status") in ["CLOSED", "EXPIRED"]:
        raise HTTPException(status_code=400, detail="This internship is no longer accepting applications.")

    apps = [a for a in db.data["applications"] if a["student_id"] == profile["id"] and a["internship_id"] == job_id]
    if apps:
        return {
            "message": "You have already applied for this internship.",
            "application_id": apps[0]["id"],
            "ats_score": apps[0].get("ats_score"),
            "ai_verdict": apps[0].get("ai_verdict"),
            "status": apps[0]["status"]
        }

    try:
        resume_text = ResumeParser.extract_text_from_file(profile["resume_path"])
    except Exception:
        resume_text = f"Student: {profile.get('name')}. Degree: {profile.get('degree')}. Skills: {', '.join(profile.get('skills') or [])}."

    internship_data = {
        "title": job.get("title"),
        "company_name": job.get("company_name"),
        "description": job.get("description"),
        "requirements": job.get("requirements"),
        "required_skills": job.get("required_skills") or [],
        "preferred_skills": job.get("preferred_skills") or [],
        "min_cgpa": job.get("min_cgpa") or 0.0,
        "eligible_branches": job.get("eligible_branches") or [],
        "eligible_degree": job.get("eligible_degree") or ""
    }

    student_data = {
        "name": profile.get("name"),
        "degree": profile.get("degree"),
        "branch": profile.get("branch"),
        "semester": profile.get("semester"),
        "cgpa": profile.get("cgpa"),
        "skills": profile.get("skills") or [],
        "certifications": profile.get("certifications") or []
    }

    evaluation = groq_service.evaluate_eligibility(student_data, resume_text, internship_data)
    ats_score = evaluation["ats_score"]

    initial_status = "APPLIED"
    if evaluation.get("deterministic_passed") and ats_score >= 60:
        initial_status = "SHORTLISTED_FOR_INTERVIEW"

    app = {
        "id": generate_uuid(),
        "student_id": profile["id"],
        "internship_id": job_id,
        "status": initial_status,
        "link": link or job.get("link") or "",
        "status_history": [{
            "status": initial_status,
            "timestamp": datetime.utcnow().isoformat(),
            "note": f"Application submitted. Initial ATS Score: {ats_score}."
        }],
        "ats_score": ats_score,
        "ai_verdict": evaluation,
        "applied_at": datetime.utcnow().isoformat()
    }
    db.data["applications"].append(app)

    notif = {
        "id": generate_uuid(),
        "user_id": current_user["id"],
        "message": f"Your application for {job['title']} at {job['company_name']} was submitted! ATS Match: {ats_score}%.",
        "type": "APPLICATION",
        "reference_id": job_id,
        "is_read": False,
        "created_at": datetime.utcnow().isoformat()
    }
    db.data["notifications"].append(notif)
    db.commit()

    return {
        "message": "Application submitted successfully",
        "application_id": app["id"],
        "ats_score": app["ats_score"],
        "ai_verdict": app["ai_verdict"],
        "status": app["status"]
    }

@router.get("/applications")
def get_student_applications(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)
    
    apps = sorted([a for a in db.data["applications"] if a["student_id"] == profile["id"]], key=lambda x: x.get("applied_at", ""), reverse=True)
    results = []
    for a in apps:
        nocs = [n for n in db.data["noc_requests"] if n["student_id"] == profile["id"] and n["internship_id"] == a["internship_id"]]
        noc = nocs[0] if nocs else None
        
        job = [j for j in db.data["internships"] if j["id"] == a["internship_id"]][0]
        
        results.append({
            **a,
            "title": job["title"],
            "company_name": job["company_name"],
            "location": job.get("location"),
            "stipend": job.get("stipend", "Not Disclosed"),
            "noc_status": noc["status"] if noc else "NOT_REQUESTED",
            "noc_document_path": noc.get("noc_document_path") if noc else None
        })
    return results

@router.post("/tasks/{application_id}/submit")
def submit_task(
    application_id: str,
    submission_notes: str = Form(...),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
    db: JSONDatabase = Depends(get_db)
):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)

    apps = [a for a in db.data["applications"] if a["id"] == application_id and a["student_id"] == profile["id"]]
    if not apps:
        raise HTTPException(status_code=404, detail="Application not found")
    app = apps[0]

    if not submission_notes.strip():
        raise HTTPException(status_code=400, detail="Submission notes cannot be empty.")

    if app.get("task_deadline") and datetime.utcnow().isoformat() > app["task_deadline"]:
        raise HTTPException(status_code=400, detail="The deadline for this task has passed.")

    if file and file.filename:
        os.makedirs("./uploads/tasks", exist_ok=True)
        file_path = f"./uploads/tasks/{app['id']}_{file.filename}"
        with open(file_path, "wb") as f:
            f.write(file.file.read())
        app["task_submission_path"] = file_path

    app["task_submission_notes"] = submission_notes.strip()
    app["task_status"] = "SUBMITTED"
    app["task_submitted_at"] = datetime.utcnow().isoformat()
    
    if "status_history" not in app:
        app["status_history"] = []
    
    app["status_history"].append({
        "status": app.get("status"),
        "timestamp": datetime.utcnow().isoformat(),
        "note": f"Task '{app.get('task_title') or 'Work'}' submitted by student."
    })

    db.commit()
    return {"message": "Task work submitted successfully."}

@router.get("/notifications")
def get_notifications(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    notifs = sorted([n for n in db.data["notifications"] if n["user_id"] == current_user["id"]], key=lambda x: x.get("created_at", ""), reverse=True)
    return notifs

@router.put("/notifications/{notification_id}/read")
def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    for notif in db.data["notifications"]:
        if notif["id"] == notification_id and notif["user_id"] == current_user["id"]:
            notif["is_read"] = True
    db.commit()
    return {"message": "Notification marked as read"}

@router.post("/notifications/read-all")
def mark_all_notifications_read(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    for notif in db.data["notifications"]:
        if notif["user_id"] == current_user["id"]:
            notif["is_read"] = True
    db.commit()
    return {"message": "All notifications marked as read"}

@router.get("/feedback")
def get_mentor_feedbacks(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)
    feedbacks = sorted([f for f in db.data["mentor_feedbacks"] if f["student_id"] == profile["id"]], key=lambda x: x.get("created_at", ""), reverse=True)
    return feedbacks

@router.post("/noc-request")
def request_noc(req: NocRequestForm, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)

    if not profile.get("institute_id"):
        raise HTTPException(status_code=400, detail="You are not affiliated with any Institute.")

    existing = [n for n in db.data["noc_requests"] if n["student_id"] == profile["id"] and n["internship_id"] == req.internship_id]
    if existing:
        return {"message": "NOC request already exists", "status": existing[0].get("status")}

    noc = {
        "id": generate_uuid(),
        "student_id": profile["id"],
        "institute_id": profile["institute_id"],
        "internship_id": req.internship_id,
        "status": "PENDING"
    }
    db.data["noc_requests"].append(noc)
    db.commit()
    return {"message": "NOC Request submitted successfully", "status": "PENDING"}

@router.post("/attendance")
def submit_attendance(req: AttendanceRequest, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)

    log = {
        "id": generate_uuid(),
        "student_id": profile["id"],
        "date": req.date,
        "hours": req.hours,
        "task_details": req.task_details,
        "status": "PENDING"
    }
    db.data["attendance_logs"].append(log)
    db.commit()
    return {"message": "Attendance submitted"}


# ── Task Management V2 ────────────────────────────────────────────────────────

@router.get("/tasks")
def get_student_tasks(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)

    tasks = sorted([t for t in db.data["internship_tasks"] if t["student_id"] == profile["id"]], key=lambda x: x.get("assigned_date", ""), reverse=True)

    students = {s["id"]: s for s in db.data["student_profiles"]}
    internships = {j["id"]: j for j in db.data["internships"]}
    companies = {p["id"]: p for p in db.data["company_profiles"]}

    results = []
    for t in tasks:
        job = internships.get(t.get("application_id", ""), {})
        company = companies.get(t.get("company_profile_id"), {})
        results.append({
            **t,
            "company_name": company.get("name"),
        })
    return results


@router.post("/tasks/{task_id}/submit-v2")
def submit_task_v2(task_id: str, req: TaskSubmitV2, current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)

    tasks = [t for t in db.data["internship_tasks"] if t["id"] == task_id and t["student_id"] == profile["id"]]
    if not tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    task = tasks[0]

    if not req.submission_notes.strip():
        raise HTTPException(status_code=400, detail="Submission notes cannot be empty.")

    task["github_link"] = req.github_link or None
    task["submission_notes"] = req.submission_notes.strip()
    task["status"] = "SUBMITTED"
    task["submitted_at"] = datetime.utcnow().isoformat()

    db.commit()
    return {"message": "Task submitted successfully"}


# ── Onboarding Document Upload ────────────────────────────────────────────────

@router.post("/onboarding/upload")
def upload_onboarding(
    application_id: str,
    aadhaar_number: str = Form(""),
    pan_number: str = Form(""),
    bank_account: str = Form(""),
    bank_ifsc: str = Form(""),
    address: str = Form(""),
    emergency_contact: str = Form(""),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
    db: JSONDatabase = Depends(get_db)
):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)

    apps = [a for a in db.data["applications"] if a["id"] == application_id and a["student_id"] == profile["id"]]
    if not apps:
        raise HTTPException(status_code=404, detail="Application not found")
    app = apps[0]

    if app.get("status") not in ("OFFER_SENT", "SELECTED"):
        raise HTTPException(status_code=400, detail="Onboarding can only be done after receiving an offer letter.")

    file_path = None
    if file and file.filename:
        os.makedirs("./uploads/onboarding", exist_ok=True)
        safe_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", file.filename)
        file_path = f"./uploads/onboarding/{app['id']}_{safe_filename}"
        with open(file_path, "wb") as f:
            f.write(file.file.read())

    app["onboarding_docs"] = {
        "aadhaar_number": aadhaar_number,
        "pan_number": pan_number,
        "bank_account": bank_account,
        "bank_ifsc": bank_ifsc,
        "address": address,
        "emergency_contact": emergency_contact,
        "uploaded_file": file_path,
        "uploaded_at": datetime.utcnow().isoformat()
    }
    app["onboarding_status"] = "PENDING_REVIEW"

    if "status_history" not in app:
        app["status_history"] = []
    app["status_history"].append({
        "status": app["status"],
        "timestamp": datetime.utcnow().isoformat(),
        "note": "Onboarding documents uploaded by student. Pending company review."
    })

    company_profiles = [p for p in db.data["company_profiles"]]
    internships = {j["id"]: j for j in db.data["internships"]}
    job = internships.get(app["internship_id"], {})
    company = None
    for cp in company_profiles:
        if cp["id"] == job.get("company_profile_id"):
            company = cp
            break

    if company and company.get("user_id"):
        user = None
        for u in db.data.get("users", []):
            if u.get("id") == company["user_id"]:
                user = u
                break
        if user:
            notif = {
                "id": generate_uuid(),
                "user_id": user["id"],
                "message": f"{profile.get('name')} has uploaded onboarding documents for '{job.get('title')}'. Please review and approve.",
                "type": "APPLICATION",
                "reference_id": app["id"],
                "is_read": False,
                "created_at": datetime.utcnow().isoformat()
            }
            db.data["notifications"].append(notif)

    db.commit()
    return {"message": "Onboarding documents uploaded successfully"}


# ── Internship History ────────────────────────────────────────────────────────

@router.get("/internship-history")
def get_internship_history(current_user: dict = Depends(get_current_user), db: JSONDatabase = Depends(get_db)):
    if current_user["role"] != UserRole.STUDENT.value:
        raise HTTPException(status_code=403, detail="Unauthorized role")
    profile = get_student_profile_dict(current_user["id"], db)

    apps = [a for a in db.data["applications"] if a["student_id"] == profile["id"] and a.get("status") in ("COMPLETED", "INTERNSHIP_ACTIVE", "OFFER_SENT")]

    internships = {j["id"]: j for j in db.data["internships"]}
    company_profiles = {p["id"]: p for p in db.data["company_profiles"]}
    tasks = [t for t in db.data["internship_tasks"] if t["student_id"] == profile["id"]]

    results = []
    for a in apps:
        job = internships.get(a["internship_id"], {})
        company = company_profiles.get(job.get("company_profile_id"), {})
        app_tasks = [t for t in tasks if t.get("application_id") == a["id"]]
        avg_stars = 0
        evaluated_tasks = [t for t in app_tasks if t.get("stars") is not None]
        if evaluated_tasks:
            avg_stars = round(sum(t["stars"] for t in evaluated_tasks) / len(evaluated_tasks), 1)

        results.append({
            "application_id": a["id"],
            "internship_id": a["internship_id"],
            "title": job.get("title"),
            "company_name": company.get("name") or job.get("company_name"),
            "location": job.get("location"),
            "duration": job.get("duration"),
            "stipend": job.get("stipend"),
            "status": a.get("status"),
            "applied_at": a.get("applied_at", "")[:10] if a.get("applied_at") else None,
            "completion_date": a.get("completion_date", "")[:10] if a.get("completion_date") else None,
            "offer_date": a.get("offer_date", "")[:10] if a.get("offer_date") else None,
            "certificate_path": a.get("certificate_path"),
            "offer_letter_path": a.get("offer_letter_path"),
            "onboarding_status": a.get("onboarding_status"),
            "total_tasks": len(app_tasks),
            "completed_tasks": len([t for t in app_tasks if t.get("status") in ("SUBMITTED", "EVALUATED")]),
            "avg_stars": avg_stars,
            "ppo_status": a.get("ppo_status"),
            "ppo_role": a.get("ppo_role"),
        })

    return results
