from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from typing import Optional, List
import re
from jose import jwt, JWTError
from datetime import datetime, timezone

from app.core.db import get_db, JSONDatabase
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.models import UserRole, generate_uuid

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Pydantic schemas
class LoginRequest(BaseModel):
    email: str
    password: str
    expected_role: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: str
    profile_id: Optional[str] = None
    name: str
    institute_role: Optional[str] = None

class StudentRegisterRequest(BaseModel):
    name: str
    email: str
    mobile: Optional[str] = None
    password: str
    confirm_password: Optional[str] = None
    institute_id: Optional[str] = None
    degree: Optional[str] = "B.Tech"
    branch: Optional[str] = "Computer Science"
    semester: Optional[str] = "Year 4"
    cgpa: Optional[float] = None
    graduation_year: Optional[int] = 2025
    github_url: Optional[str] = ""
    linkedin_url: Optional[str] = ""

class InstituteRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: Optional[str] = None
    location: str
    domain: str
    institute_role: Optional[str] = "TPO"

class CompanyRegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: Optional[str] = None
    industry: str
    website: str
    cin: Optional[str] = ""
    gstin: Optional[str] = ""

EMAIL_REGEX = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
MOBILE_REGEX = r"^\d{10}$"

def validate_email_format(email: str) -> str:
    cleaned = (email or "").strip().lower()
    if not cleaned or not re.match(EMAIL_REGEX, cleaned):
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    return cleaned

def validate_mobile_format(mobile: Optional[str]) -> Optional[str]:
    if not mobile:
        return None
    cleaned = "".join(c for c in mobile if c.isdigit())
    if len(cleaned) != 10:
        raise HTTPException(status_code=400, detail="Please enter a valid 10-digit mobile number.")
    return cleaned

def validate_password_strength(password: str, confirm_password: Optional[str] = None):
    if not password or len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")
    if confirm_password is not None and password != confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match.")

def get_current_user(token: str = Depends(oauth2_scheme), db: JSONDatabase = Depends(get_db)) -> dict:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_email: str = payload.get("sub")
        if user_email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    users = [u for u in db.data["users"] if u["email"] == user_email]
    if not users:
        raise credentials_exception
    return users[0]

@router.post("/register/student", status_code=status.HTTP_201_CREATED)
def register_student(req: StudentRegisterRequest, db: JSONDatabase = Depends(get_db)):
    clean_email = validate_email_format(req.email)
    clean_mobile = validate_mobile_format(req.mobile)
    validate_password_strength(req.password, req.confirm_password)

    if not req.name or not req.name.strip():
        raise HTTPException(status_code=400, detail="Full Name is required.")

    if any(u["email"] == clean_email for u in db.data["users"]):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    if clean_mobile and any(p.get("mobile") == clean_mobile for p in db.data["student_profiles"]):
        raise HTTPException(status_code=400, detail="An account with this mobile number already exists.")

    user_id = generate_uuid()
    hashed_pwd = get_password_hash(req.password)
    user = {
        "id": user_id,
        "email": clean_email,
        "password_hash": hashed_pwd,
        "role": UserRole.STUDENT.value,
        "created_at": datetime.utcnow().isoformat()
    }
    db.data["users"].append(user)

    profile_id = generate_uuid()
    profile = {
        "id": profile_id,
        "user_id": user_id,
        "name": req.name.strip(),
        "mobile": clean_mobile,
        "degree": req.degree or "B.Tech",
        "branch": req.branch or "Computer Science",
        "semester": req.semester or "Year 4",
        "cgpa": req.cgpa,
        "graduation_year": req.graduation_year or 2025,
        "github_url": req.github_url or "",
        "linkedin_url": req.linkedin_url or "",
        "institute_id": req.institute_id,
        "skills": [],
        "certifications": [],
        "approval_status": "PENDING"
    }
    db.data["student_profiles"].append(profile)

    welcome_notif = {
        "id": generate_uuid(),
        "user_id": user_id,
        "message": f"Welcome to INTERNTRAC, {req.name.strip()}! Complete your profile and upload your resume to start applying.",
        "type": "SYSTEM",
        "is_read": False,
        "created_at": datetime.utcnow().isoformat()
    }
    db.data["notifications"].append(welcome_notif)
    db.commit()

    return {"message": "Student registered successfully"}

@router.post("/register/institute", status_code=status.HTTP_201_CREATED)
def register_institute(req: InstituteRegisterRequest, db: JSONDatabase = Depends(get_db)):
    clean_email = validate_email_format(req.email)
    validate_password_strength(req.password, req.confirm_password)

    if any(u["email"] == clean_email for u in db.data["users"]):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user_id = generate_uuid()
    hashed_pwd = get_password_hash(req.password)
    user = {
        "id": user_id,
        "email": clean_email,
        "password_hash": hashed_pwd,
        "role": UserRole.INSTITUTE.value,
        "created_at": datetime.utcnow().isoformat()
    }
    db.data["users"].append(user)

    profile_id = generate_uuid()
    profile = {
        "id": profile_id,
        "user_id": user_id,
        "name": req.name.strip(),
        "location": req.location.strip(),
        "domain": req.domain.strip(),
        "institute_role": req.institute_role or "TPO"
    }
    db.data["institute_profiles"].append(profile)
    db.commit()
    return {"message": "Institute registered successfully"}

@router.post("/register/company", status_code=status.HTTP_201_CREATED)
def register_company(req: CompanyRegisterRequest, db: JSONDatabase = Depends(get_db)):
    clean_email = validate_email_format(req.email)
    validate_password_strength(req.password, req.confirm_password)

    if any(u["email"] == clean_email for u in db.data["users"]):
        raise HTTPException(status_code=400, detail="An account with this email already exists.")

    user_id = generate_uuid()
    hashed_pwd = get_password_hash(req.password)
    user = {
        "id": user_id,
        "email": clean_email,
        "password_hash": hashed_pwd,
        "role": UserRole.COMPANY.value,
        "created_at": datetime.utcnow().isoformat()
    }
    db.data["users"].append(user)

    profile_id = generate_uuid()
    profile = {
        "id": profile_id,
        "user_id": user_id,
        "name": req.name.strip(),
        "industry": req.industry.strip(),
        "website": req.website.strip(),
        "cin": req.cin.strip() if req.cin else "",
        "gstin": req.gstin.strip() if req.gstin else "",
        "verification_status": "PENDING",
        "verification_errors": [],
        "verification_confidence": 0.0,
        "verification_risk_level": "MEDIUM"
    }
    db.data["company_profiles"].append(profile)
    db.commit()

    try:
        from app.services.groq_service import groq_service
        val_report = groq_service.verify_company_multistage(
            legal_name=req.name,
            website=req.website,
            cin=req.cin or "",
            gstin=req.gstin or ""
        )
        profile["verification_status"] = val_report.get("suggested_status", "MANUAL_REVIEW")
        profile["verification_errors"] = val_report.get("errors", []) + val_report.get("mismatches", [])
        profile["verification_confidence"] = val_report.get("confidence", 0.0)
        profile["verification_risk_level"] = val_report.get("risk_level", "MEDIUM")
    except Exception as e:
        profile["verification_status"] = "MANUAL_REVIEW"
        profile["verification_errors"] = [f"Verification service unavailable: {str(e)[:100]}"]
    db.commit()

    return {"message": "Company registered. Verification status: " + profile["verification_status"]}

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: JSONDatabase = Depends(get_db)):
    clean_email = (req.email or "").strip().lower()
    users = [u for u in db.data["users"] if u["email"] == clean_email]
    
    if not users or not verify_password(req.password, users[0]["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    
    user = users[0]

    if req.expected_role and user["role"] != req.expected_role:
        role_labels = {"STUDENT": "Student", "COMPANY": "Company", "INSTITUTE": "Institute"}
        expected_label = role_labels.get(req.expected_role, req.expected_role)
        actual_label = role_labels.get(user["role"], user["role"])
        raise HTTPException(
            status_code=403,
            detail=f"This account is registered as {actual_label}, not {expected_label}. Please use the {actual_label} login page."
        )

    token = create_access_token(subject=user["email"])
    
    profile_id = None
    name = user["email"]
    institute_role = None
    if user["role"] == UserRole.STUDENT.value:
        profiles = [p for p in db.data["student_profiles"] if p["user_id"] == user["id"]]
        if profiles:
            profile_id = profiles[0]["id"]
            name = profiles[0]["name"]
    elif user["role"] == UserRole.INSTITUTE.value:
        profiles = [p for p in db.data["institute_profiles"] if p["user_id"] == user["id"]]
        if profiles:
            profile_id = profiles[0]["id"]
            name = profiles[0]["name"]
            institute_role = profiles[0].get("institute_role")
    elif user["role"] == UserRole.COMPANY.value:
        profiles = [p for p in db.data["company_profiles"] if p["user_id"] == user["id"]]
        if profiles:
            profile_id = profiles[0]["id"]
            name = profiles[0]["name"]

    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": user["id"],
        "profile_id": profile_id,
        "name": name,
        "institute_role": institute_role
    }

@router.get("/institutes", response_model=list)
def get_all_institutes(db: JSONDatabase = Depends(get_db)):
    # Only actual institutions (colleges) — faculty mentor accounts are excluded
    return [
        {"id": inst["id"], "name": inst["name"], "location": inst["location"]}
        for inst in db.data["institute_profiles"]
        if inst.get("institute_role") != "FACULTY_MENTOR"
    ]
