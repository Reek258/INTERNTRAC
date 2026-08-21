import uuid
from datetime import datetime, timezone
from typing import TypedDict, Optional, List, Dict, Any, Union
import enum

class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    INSTITUTE = "INSTITUTE"
    COMPANY = "COMPANY"
    ADMIN = "ADMIN"

class CompanyVerificationStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class ApplicationStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    UNDER_REVIEW = "UNDER_REVIEW"
    SHORTLISTED = "SHORTLISTED"
    SHORTLISTED_FOR_INTERVIEW = "SHORTLISTED_FOR_INTERVIEW"
    INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED"
    INTERVIEWING = "INTERVIEWING"
    INTERVIEW_COMPLETED = "INTERVIEW_COMPLETED"
    SELECTED = "SELECTED"
    OFFER_SENT = "OFFER_SENT"
    INTERNSHIP_ACTIVE = "INTERNSHIP_ACTIVE"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"

class InternshipSource(str, enum.Enum):
    INTERNAL = "INTERNAL"
    SCRAPED = "SCRAPED"

class NocStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"

class AttendanceStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"

def generate_uuid() -> str:
    return str(uuid.uuid4())

# Now we define simple TypedDicts representing the JSON schemas

class UserDict(TypedDict, total=False):
    id: str
    email: str
    password_hash: str
    role: str
    created_at: str

class InstituteProfileDict(TypedDict, total=False):
    id: str
    user_id: str
    name: str
    location: str
    domain: str
    institute_role: Optional[str]
    profile_picture: Optional[str]

class StudentProfileDict(TypedDict, total=False):
    id: str
    user_id: str
    name: str
    mobile: Optional[str]
    dob: Optional[str]
    gender: Optional[str]
    address: Optional[str]
    portfolio_url: Optional[str]
    github_url: Optional[str]
    linkedin_url: Optional[str]
    resume_path: Optional[str]
    skills: Optional[List[str]]
    degree: Optional[str]
    branch: Optional[str]
    semester: Optional[str]
    cgpa: Optional[float]
    graduation_year: Optional[int]
    certifications: Optional[List[Dict[str, Any]]]
    institute_id: Optional[str]
    mentor_name: Optional[str]
    mentor_email: Optional[str]
    mentor_department: Optional[str]
    approval_status: Optional[str]
    profile_picture: Optional[str]

class CompanyProfileDict(TypedDict, total=False):
    id: str
    user_id: str
    name: str
    industry: str
    website: str
    logo_url: Optional[str]
    profile_picture: Optional[str]
    cin: Optional[str]
    gstin: Optional[str]
    msme_number: Optional[str]
    msme_certificate_url: Optional[str]
    contact_email: Optional[str]
    contact_phone: Optional[str]
    verification_status: str
    verification_decision: Optional[str]
    verification_confidence: float
    verification_risk_level: str
    verification_errors: Optional[List[str]]
    verification_details: Optional[Dict[str, Any]]
    verified_at: Optional[str]
    reviewed_by: Optional[str]

class InternshipDict(TypedDict, total=False):
    id: str
    title: str
    description: str
    requirements: str
    required_skills: Optional[List[str]]
    preferred_skills: Optional[List[str]]
    min_cgpa: float
    eligible_branches: Optional[List[str]]
    eligible_degree: Optional[str]
    eligible_semesters: Optional[List[Union[str, int]]]
    company_name: str
    company_profile_id: Optional[str]
    eligible_institute_ids: Optional[List[str]]
    source: str
    scraped_from: Optional[str]
    stipend: Optional[str]
    location: str
    work_mode: str
    duration: str
    openings: int
    deadline: Optional[str]
    status: str
    created_at: str

class ApplicationDict(TypedDict, total=False):
    id: str
    student_id: str
    internship_id: str
    status: str
    status_history: Optional[List[Dict[str, Any]]]
    ats_score: Optional[int]
    ai_verdict: Optional[Dict[str, Any]]
    interview_date: Optional[str]
    interview_time: Optional[str]
    interview_duration: Optional[str]
    interview_link: Optional[str]
    interview_instructions: Optional[str]
    task_title: Optional[str]
    task_description: Optional[str]
    task_assigned_date: Optional[str]
    task_deadline: Optional[str]
    task_status: Optional[str]
    task_submission_notes: Optional[str]
    task_submission_path: Optional[str]
    task_submitted_at: Optional[str]
    task_feedback: Optional[str]
    task_score: Optional[int]
    offer_letter_path: Optional[str]
    offer_date: Optional[str]
    certificate_path: Optional[str]
    completion_date: Optional[str]
    final_evaluation: Optional[str]
    ppo_status: Optional[str]
    ppo_role: Optional[str]
    ppo_offer_date: Optional[str]
    ppo_document_path: Optional[str]
    applied_at: str

class NocRequestDict(TypedDict, total=False):
    id: str
    student_id: str
    institute_id: str
    internship_id: str
    status: str
    noc_document_path: Optional[str]

class AttendanceLogDict(TypedDict, total=False):
    id: str
    student_id: str
    date: str
    hours: float
    task_details: str
    status: str

class MentorFeedbackDict(TypedDict, total=False):
    id: str
    student_id: str
    mentor_name: str
    feedback_text: str
    rating: int
    created_at: str

class NotificationDict(TypedDict, total=False):
    id: str
    user_id: str
    message: str
    type: str
    reference_id: Optional[str]
    is_read: bool
    created_at: str

class InternshipTaskDict(TypedDict, total=False):
    id: str
    application_id: str
    student_id: str
    company_profile_id: str
    title: str
    description: str
    deadline: str
    assigned_date: str
    status: str
    github_link: Optional[str]
    submission_notes: Optional[str]
    submitted_at: Optional[str]
    feedback: Optional[str]
    stars: Optional[int]
    evaluated_at: Optional[str]
