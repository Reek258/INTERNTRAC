"""
INTERNTRAC — Seed Script
========================
Populates the SQLite database with realistic mock data for all panels (Student, Institute, Company).
Run from the `backend/` directory:

    python seed.py

Student login:    arjun.sharma@student.raisoni.edu  /  Student@123
Institute login:  institute@raisoni.edu  /  Institute@123
Company login:    hr@techcorpindia.com  /  Company@123
"""

import sys
import os
from datetime import date, datetime, timedelta
import random

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.db import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    User, InstituteProfile, StudentProfile, CompanyProfile,
    Internship, Application, NocRequest, AttendanceLog, MentorFeedback,
    Notification, UserRole
)

def upsert_user(db, email: str, password: str, role: str):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(email=email, password_hash=get_password_hash(password), role=role)
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"  [+] Created user: {email}")
    else:
        print(f"  [.] Skipping existing user: {email}")
    return user

def ago(days: int) -> datetime:
    return datetime.utcnow() - timedelta(days=days)

def future(days: int) -> datetime:
    return datetime.utcnow() + timedelta(days=days)

def ago_date(days: int) -> date:
    return (datetime.utcnow() - timedelta(days=days)).date()

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    print("\n-- INTERNTRAC Seed Script Starting --\n")

    # ── 1. Institute ──────────────────────────────────────────────────────────
    print("\n-- [1/7] Creating Institute --")
    inst_user = upsert_user(db, "institute@raisoni.edu", "Institute@123", UserRole.INSTITUTE.value)

    inst_profile = db.query(InstituteProfile).filter(InstituteProfile.user_id == inst_user.id).first()
    if not inst_profile:
        inst_profile = InstituteProfile(
            user_id=inst_user.id,
            name="G.H. Raisoni College of Engineering",
            location="Nagpur, Maharashtra",
            domain="raisoni.edu"
        )
        db.add(inst_profile)
        db.commit()
        db.refresh(inst_profile)
        print("  [+] Created institute profile: G.H. Raisoni College of Engineering")

    print("\n-- [2/7] Creating Companies --")

    companies_data = [
        {
            "email": "hr@techcorpindia.com", "name": "TechCorp India Pvt Ltd",
            "industry": "Information Technology", "website": "techcorpindia.com",
            "cin": "U72900MH2018PTC301234", "gstin": "27AABCT1234F1Z5",
            "status": "APPROVED", "errors": []
        },
        {
            "email": "talent@innovatellc.in", "name": "InnovateLLC Solutions",
            "industry": "Software Development", "website": "innovatellc.in",
            "cin": "U72200KA2019PTC412345", "gstin": "29AABCI5678G1Z3",
            "status": "APPROVED", "errors": []
        },
        {
            "email": "intern@datasys.io", "name": "DataSys Analytics",
            "industry": "Data Science & AI", "website": "datasys.io",
            "cin": "U72900MH2020PTC321456", "gstin": "27AABCD9012H1Z1",
            "status": "APPROVED", "errors": []
        },
        {
            "email": "jobs@electromotive.co", "name": "ElectroMotive Engineering",
            "industry": "Electronics & Embedded Systems", "website": "electromotive.co",
            "cin": "U31100MH2017PTC298765", "gstin": "27AABCE3456J1Z9",
            "status": "APPROVED", "errors": []
        },
        {
            "email": "info@apex-infotech.io", "name": "Apex Infotech Solutions",
            "industry": "Cloud & DevOps", "website": "apex-infotech.io",
            "cin": "U72900MH2021PTC361234", "gstin": "27AABCA1234F1Z5",
            "status": "APPROVED", "errors": []
        },
    ]

    company_profiles = []
    for cd in companies_data:
        comp_user = upsert_user(db, cd["email"], "Company@123", UserRole.COMPANY.value)
        comp = db.query(CompanyProfile).filter(CompanyProfile.user_id == comp_user.id).first()
        if not comp:
            comp = CompanyProfile(
                user_id=comp_user.id,
                name=cd["name"],
                industry=cd["industry"],
                website=cd["website"],
                cin=cd["cin"],
                gstin=cd["gstin"],
                verification_status=cd["status"],
                verification_errors=cd["errors"]
            )
            db.add(comp)
            db.commit()
            db.refresh(comp)
            print(f"  [+] Company: {cd['name']}")
        company_profiles.append(comp)

    print("\n-- [3/7] Creating Internships --")

    internships_data = [
        {
            "title": "Full Stack Web Developer Intern",
            "description": "Work on building scalable web applications using React and FastAPI. Collaborate with senior engineers on product features, state management, and REST API design.",
            "requirements": "React, TypeScript, Python, FastAPI, REST APIs, Git",
            "required_skills": ["React", "TypeScript", "Python", "FastAPI", "REST APIs", "Git"],
            "preferred_skills": ["Docker", "Tailwind CSS", "PostgreSQL"],
            "min_cgpa": 7.0,
            "eligible_branches": ["Computer Science", "Information Technology", "AI & Data Science"],
            "eligible_degree": "B.Tech",
            "company_name": "TechCorp India Pvt Ltd", "company_idx": 0,
            "stipend": "Rs. 15,000/month", "location": "Pune, Maharashtra", "work_mode": "Hybrid", "duration": "6 Months",
            "deadline": future(20)
        },
        {
            "title": "Machine Learning Engineer Intern",
            "description": "Develop and deploy ML models for customer churn prediction, NLP categorization, and recommendation engines. Work with Python, TensorFlow, and cloud platforms.",
            "requirements": "Python, TensorFlow, scikit-learn, Pandas, NumPy, SQL",
            "required_skills": ["Python", "TensorFlow", "Pandas", "NumPy", "SQL"],
            "preferred_skills": ["PyTorch", "Docker", "AWS"],
            "min_cgpa": 7.5,
            "eligible_branches": ["Computer Science", "AI & Data Science", "Data Engineering"],
            "eligible_degree": "B.Tech",
            "company_name": "DataSys Analytics", "company_idx": 2,
            "stipend": "Rs. 20,000/month", "location": "Bangalore, Karnataka", "work_mode": "Remote", "duration": "3 Months",
            "deadline": future(15)
        },
        {
            "title": "Android App Developer Intern",
            "description": "Build and maintain Android features for a consumer-facing fintech app with 500K+ users.",
            "requirements": "Kotlin, Android SDK, Jetpack Compose, REST APIs, Git",
            "required_skills": ["Kotlin", "Android SDK", "Jetpack Compose", "Git"],
            "preferred_skills": ["Firebase", "Coroutines"],
            "min_cgpa": 6.5,
            "eligible_branches": ["Computer Science", "Information Technology"],
            "eligible_degree": "B.Tech",
            "company_name": "InnovateLLC Solutions", "company_idx": 1,
            "stipend": "Rs. 12,000/month", "location": "Remote", "work_mode": "Remote", "duration": "4 Months",
            "deadline": future(25)
        },
        {
            "title": "Embedded Systems Intern",
            "description": "Design and test embedded firmware for IoT sensor modules. Work with microcontrollers and communication protocols.",
            "requirements": "C/C++, STM32, RTOS, SPI/I2C/UART, PCB design basics",
            "required_skills": ["C", "C++", "STM32", "RTOS"],
            "preferred_skills": ["IoT", "Linux"],
            "min_cgpa": 6.8,
            "eligible_branches": ["Electronics & Telecommunication", "Electrical Engineering"],
            "eligible_degree": "B.Tech",
            "company_name": "ElectroMotive Engineering", "company_idx": 3,
            "stipend": "Rs. 10,000/month", "location": "Nagpur, Maharashtra", "work_mode": "On-site", "duration": "6 Months",
            "deadline": future(10)
        },
        {
            "title": "Cloud Infrastructure & DevOps Intern",
            "description": "Assist in migrating on-premise workloads to AWS. Automate infrastructure provisioning with Terraform and CI/CD pipelines.",
            "requirements": "AWS, Terraform, Docker, Linux, Python scripting",
            "required_skills": ["AWS", "Docker", "Linux", "Python"],
            "preferred_skills": ["Kubernetes", "Terraform", "CI/CD"],
            "min_cgpa": 7.0,
            "eligible_branches": ["Computer Science", "Information Technology", "Cloud Computing"],
            "eligible_degree": "B.Tech",
            "company_name": "Apex Infotech Solutions", "company_idx": 4,
            "stipend": "Rs. 18,000/month", "location": "Hyderabad, Telangana", "work_mode": "Remote", "duration": "6 Months",
            "deadline": future(30)
        },
    ]

    internship_records = []
    for iv in internships_data:
        comp = company_profiles[iv["company_idx"]]
        existing = db.query(Internship).filter(
            Internship.title == iv["title"],
            Internship.company_name == iv["company_name"]
        ).first()
        if not existing:
            intern = Internship(
                title=iv["title"],
                description=iv["description"],
                requirements=iv["requirements"],
                required_skills=iv["required_skills"],
                preferred_skills=iv["preferred_skills"],
                min_cgpa=iv["min_cgpa"],
                eligible_branches=iv["eligible_branches"],
                eligible_degree=iv["eligible_degree"],
                company_name=iv["company_name"],
                company_profile_id=comp.id,
                institute_profile_id=inst_profile.id,
                source="INTERNAL",
                stipend=iv["stipend"],
                location=iv["location"],
                work_mode=iv["work_mode"],
                duration=iv["duration"],
                deadline=iv["deadline"],
                status="ACTIVE",
                created_at=ago(random.randint(5, 20))
            )
            db.add(intern)
            db.commit()
            db.refresh(intern)
            print(f"  [+] Internship: {iv['title']} @ {iv['company_name']}")
            internship_records.append(intern)
        else:
            internship_records.append(existing)

    print("\n-- [4/7] Creating Students --")

    students_data = [
        {
            "email": "arjun.sharma@student.raisoni.edu", "name": "Arjun Sharma",
            "mobile": "9876543210", "dob": "2003-05-14", "gender": "Male", "address": "Nagpur, Maharashtra",
            "github": "https://github.com/arjunsharma", "linkedin": "https://linkedin.com/in/arjunsharma",
            "portfolio": "https://arjunsharma.dev",
            "degree": "B.Tech", "branch": "Computer Science", "semester": "Semester 7 / Year 4",
            "cgpa": 8.75, "grad_year": 2025,
            "skills": ["React", "TypeScript", "Python", "FastAPI", "SQL", "Git", "Docker", "Tailwind CSS"],
            "certifications": [
                {
                    "name": "AWS Certified Cloud Practitioner",
                    "issuer": "Amazon Web Services",
                    "issue_date": "2024-03-15",
                    "credential_id": "AWS-CCP-987621",
                    "credential_url": "https://aws.amazon.com/verify"
                }
            ],
            "mentor": "Dr. Rajesh Kumar",
            "mentor_email": "rajesh.kumar@raisoni.edu",
            "mentor_dept": "Computer Science and Engineering"
        },
        {
            "email": "priya.kumar@student.raisoni.edu", "name": "Priya Kumar",
            "mobile": "9876543211", "dob": "2003-08-20", "gender": "Female", "address": "Pune, Maharashtra",
            "github": "https://github.com/priyakumar", "linkedin": "https://linkedin.com/in/priyakumar",
            "portfolio": "https://priyakumar.ai",
            "degree": "B.Tech", "branch": "AI & Data Science", "semester": "Semester 7 / Year 4",
            "cgpa": 9.10, "grad_year": 2025,
            "skills": ["Python", "TensorFlow", "scikit-learn", "Pandas", "SQL", "Deep Learning"],
            "certifications": [],
            "mentor": "Dr. Sunita Patil",
            "mentor_email": "sunita.patil@raisoni.edu",
            "mentor_dept": "Data Science Department"
        },
    ]

    student_profiles = []
    for sd in students_data:
        stu_user = upsert_user(db, sd["email"], "Student@123", UserRole.STUDENT.value)
        stu = db.query(StudentProfile).filter(StudentProfile.user_id == stu_user.id).first()
        if not stu:
            stu = StudentProfile(
                user_id=stu_user.id,
                name=sd["name"],
                mobile=sd["mobile"],
                dob=sd["dob"],
                gender=sd["gender"],
                address=sd["address"],
                github_url=sd["github"],
                linkedin_url=sd["linkedin"],
                portfolio_url=sd["portfolio"],
                degree=sd["degree"],
                branch=sd["branch"],
                semester=sd["semester"],
                cgpa=sd["cgpa"],
                graduation_year=sd["grad_year"],
                skills=sd["skills"],
                certifications=sd["certifications"],
                institute_id=inst_profile.id,
                mentor_name=sd["mentor"],
                mentor_email=sd.get("mentor_email"),
                mentor_department=sd.get("mentor_dept")
            )
            db.add(stu)
            db.commit()
            db.refresh(stu)
            print(f"  [+] Student: {sd['name']}")
        else:
            stu.mobile = sd["mobile"]
            stu.cgpa = sd["cgpa"]
            stu.degree = sd["degree"]
            stu.branch = sd["branch"]
            stu.semester = sd["semester"]
            stu.certifications = sd["certifications"]
            stu.mentor_email = sd.get("mentor_email")
            stu.mentor_department = sd.get("mentor_dept")
            db.commit()
        student_profiles.append(stu)

    print("\n-- [5/7] Creating Applications --")

    arjun = student_profiles[0]
    
    app1 = db.query(Application).filter(Application.student_id == arjun.id, Application.internship_id == internship_records[0].id).first()
    if not app1:
        app1 = Application(
            student_id=arjun.id,
            internship_id=internship_records[0].id,
            status="INTERVIEW_SCHEDULED",
            ats_score=88,
            ai_verdict={
                "score": 88,
                "verdict": "Outstanding technical profile match. Strong full-stack competency with React and FastAPI.",
                "matched_skills": ["React", "TypeScript", "Python", "FastAPI", "SQL", "Git"],
                "skill_gaps": ["Docker"],
                "strengths": ["Direct production-ready React knowledge", "Clean API design principles", "Solid CGPA of 8.75"],
                "recommendations": ["Highlight Docker and cloud deployment projects in interview."],
                "score_breakdown": {"skill_alignment": 36, "experience_relevance": 22, "education": 14, "communication": 9, "domain_fit": 7}
            },
            status_history=[
                {"status": "APPLIED", "timestamp": ago(5).strftime("%Y-%m-%d %H:%M:%S"), "note": "Application submitted with resume."},
                {"status": "SHORTLISTED_FOR_INTERVIEW", "timestamp": ago(3).strftime("%Y-%m-%d %H:%M:%S"), "note": "Profile cleared ATS threshold (88%)."},
                {"status": "INTERVIEW_SCHEDULED", "timestamp": ago(1).strftime("%Y-%m-%d %H:%M:%S"), "note": "Technical Round scheduled."}
            ],
            interview_date=future(1),
            interview_time="10:30 AM - 11:15 AM IST",
            interview_duration="45 Mins",
            interview_link="https://meet.google.com/abc-defg-hij",
            interview_instructions="Please ensure your webcam and microphone are working. Be ready to share screen for live code walkthrough.",
            applied_at=ago(5)
        )
        db.add(app1)
        db.commit()
        print(f"  [+] Arjun -> TechCorp [INTERVIEW_SCHEDULED]")

    app2 = db.query(Application).filter(Application.student_id == arjun.id, Application.internship_id == internship_records[1].id).first()
    if not app2:
        app2 = Application(
            student_id=arjun.id,
            internship_id=internship_records[1].id,
            status="SELECTED",
            ats_score=82,
            ai_verdict={
                "score": 82,
                "verdict": "Candidate demonstrated solid mathematical fundamentals and Python proficiency.",
                "matched_skills": ["Python", "SQL", "Git"],
                "skill_gaps": ["TensorFlow"],
                "strengths": ["Strong foundational programming", "Good analytical mindset"],
                "recommendations": ["Expand deep learning toolkit"],
                "score_breakdown": {"skill_alignment": 32, "experience_relevance": 20, "education": 14, "communication": 9, "domain_fit": 7}
            },
            status_history=[
                {"status": "APPLIED", "timestamp": ago(15).strftime("%Y-%m-%d %H:%M:%S"), "note": "Applied"},
                {"status": "SHORTLISTED", "timestamp": ago(12).strftime("%Y-%m-%d %H:%M:%S"), "note": "Shortlisted"},
                {"status": "SELECTED", "timestamp": ago(5).strftime("%Y-%m-%d %H:%M:%S"), "note": "Offer accepted. Internship active."}
            ],
            task_title="Module 1: Data Pipeline Setup",
            task_description="Configure automated data extraction from SQLite to pandas dataframe and generate automated EDA metrics report.",
            task_assigned_date=ago(4),
            task_deadline=future(5),
            task_status="ASSIGNED",
            ppo_status="ELIGIBLE_FOR_EVALUATION",
            applied_at=ago(15)
        )
        db.add(app2)
        db.commit()
        print(f"  [+] Arjun -> DataSys [SELECTED & ACTIVE]")

    notifs = [
        {"msg": "Technical interview scheduled with TechCorp India for tomorrow at 10:30 AM.", "type": "INTERVIEW"},
        {"msg": "Task assigned for DataSys Analytics: 'Module 1: Data Pipeline Setup'. Due in 5 days.", "type": "TASK"},
        {"msg": "Profile verified by Institute Dean of Academics.", "type": "SYSTEM"}
    ]
    for n in notifs:
        notif = Notification(user_id=arjun.user_id, message=n["msg"], type=n["type"], created_at=ago(1))
        db.add(notif)
    db.commit()

    db.close()
    print("\n[SUCCESS] Seed completed successfully!\n")
    print("---------------------------------------------------------------")
    print("  Student Login:     arjun.sharma@student.raisoni.edu  /  Student@123")
    print("  Institute Login:   institute@raisoni.edu  /  Institute@123")
    print("  Company Login:     hr@techcorpindia.com  /  Company@123")
    print("---------------------------------------------------------------\n")

if __name__ == "__main__":
    seed()
