import json
import uuid
from datetime import datetime, timezone
import bcrypt

DB_PATH = "db.json"

with open(DB_PATH, "r", encoding="utf-8") as f:
    db = json.load(f)

def uid():
    return str(uuid.uuid4())

def now():
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "")

def hpw(pw):
    return bcrypt.hashpw(pw.encode("utf-8")[:72], bcrypt.gensalt(rounds=12)).decode("utf-8")

# ── Existing IDs ────────────────────────────────────────────────────────
GHRCE_INSTITUTE_ID = "8a2ff344-9c09-4cd2-b3db-242e68682e43"
GCCE_INSTITUTE_ID  = "aa03e465-0786-4e34-a4fc-770ebc69c4ff"

# ═══════════════════════════════════════════════════════════════════════
#  FACULTY MENTORS  (role = INSTITUTE, institute_role = FACULTY_MENTOR)
# ═══════════════════════════════════════════════════════════════════════

mentors = [
    {
        "user": {
            "id": uid(), "email": "priya.sharma@ghrce.edu.in", "role": "INSTITUTE",
            "password_hash": hpw("mentor123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Prof. Priya Sharma",
            "location": "Jalgaon", "domain": "https://ghrcemj.raisoni.net/",
            "institute_role": "FACULTY_MENTOR", "institute_id": GHRCE_INSTITUTE_ID
        }
    },
    {
        "user": {
            "id": uid(), "email": "rahul.verma@ghrce.edu.in", "role": "INSTITUTE",
            "password_hash": hpw("mentor123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Prof. Rahul Verma",
            "location": "Jalgaon", "domain": "https://ghrcemj.raisoni.net/",
            "institute_role": "FACULTY_MENTOR", "institute_id": GHRCE_INSTITUTE_ID
        }
    },
    {
        "user": {
            "id": uid(), "email": "sneha.patil@ghrce.edu.in", "role": "INSTITUTE",
            "password_hash": hpw("mentor123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Prof. Sneha Patil",
            "location": "Jalgaon", "domain": "https://ghrcemj.raisoni.net/",
            "institute_role": "FACULTY_MENTOR", "institute_id": GHRCE_INSTITUTE_ID
        }
    },
    {
        "user": {
            "id": uid(), "email": "amit.joshi@gcce.edu.in", "role": "INSTITUTE",
            "password_hash": hpw("mentor123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Prof. Amit Joshi",
            "location": "Jalgaon", "domain": "https://www.gfgcoe.ac.in/",
            "institute_role": "FACULTY_MENTOR", "institute_id": GCCE_INSTITUTE_ID
        }
    },
    {
        "user": {
            "id": uid(), "email": "kavita.deshmukh@gcce.edu.in", "role": "INSTITUTE",
            "password_hash": hpw("mentor123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Prof. Kavita Deshmukh",
            "location": "Jalgaon", "domain": "https://www.gfgcoe.ac.in/",
            "institute_role": "FACULTY_MENTOR", "institute_id": GCCE_INSTITUTE_ID
        }
    },
]

# ═══════════════════════════════════════════════════════════════════════
#  STUDENTS  (role = STUDENT)
# ═══════════════════════════════════════════════════════════════════════

students = [
    {
        "user": {
            "id": uid(), "email": "ananya.reddy@student.ghrce.edu.in", "role": "STUDENT",
            "password_hash": hpw("student123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Ananya Reddy",
            "mobile": "9876543210", "degree": "B.Tech",
            "branch": "Computer Science & Engineering", "semester": "Year 4",
            "cgpa": 8.9, "graduation_year": 2026,
            "github_url": "https://github.com/ananyareddy",
            "linkedin_url": "", "institute_id": GHRCE_INSTITUTE_ID,
            "skills": ["Python", "React", "FastAPI", "SQL", "Machine Learning", "TensorFlow"],
            "certifications": [], "approval_status": "APPROVED",
            "institute_name": "G.H RAISONI COLLEGE AND MANAGEMENT",
            "mentor_name": "Prof. Priya Sharma"
        }
    },
    {
        "user": {
            "id": uid(), "email": "rohan.gupta@student.ghrce.edu.in", "role": "STUDENT",
            "password_hash": hpw("student123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Rohan Gupta",
            "mobile": "9123456780", "degree": "B.Tech",
            "branch": "Electronics & Telecommunication", "semester": "Year 4",
            "cgpa": 8.2, "graduation_year": 2026,
            "github_url": "", "linkedin_url": "",
            "institute_id": GHRCE_INSTITUTE_ID,
            "skills": ["Embedded C", "VLSI", "Python", "MATLAB", "Arduino", "PCB Design"],
            "certifications": [], "approval_status": "APPROVED",
            "institute_name": "G.H RAISONI COLLEGE AND MANAGEMENT",
            "mentor_name": "Prof. Rahul Verma"
        }
    },
    {
        "user": {
            "id": uid(), "email": "meera.joshi@student.ghrce.edu.in", "role": "STUDENT",
            "password_hash": hpw("student123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Meera Joshi",
            "mobile": "9988776655", "degree": "B.Tech",
            "branch": "Information Technology", "semester": "Year 3",
            "cgpa": 9.1, "graduation_year": 2027,
            "github_url": "https://github.com/meerajoshi", "linkedin_url": "",
            "institute_id": GHRCE_INSTITUTE_ID,
            "skills": ["JavaScript", "React", "Node.js", "MongoDB", "TypeScript", "Docker"],
            "certifications": [], "approval_status": "APPROVED",
            "institute_name": "G.H RAISONI COLLEGE AND MANAGEMENT",
            "mentor_name": "Prof. Sneha Patil"
        }
    },
    {
        "user": {
            "id": uid(), "email": "arjun.nair@student.ghrce.edu.in", "role": "STUDENT",
            "password_hash": hpw("student123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Arjun Nair",
            "mobile": "9001234567", "degree": "B.Tech",
            "branch": "Mechanical Engineering", "semester": "Year 4",
            "cgpa": 7.8, "graduation_year": 2026,
            "github_url": "", "linkedin_url": "",
            "institute_id": GHRCE_INSTITUTE_ID,
            "skills": ["AutoCAD", "SolidWorks", "ANSYS", "MATLAB", "GD&T", "CNC Programming"],
            "certifications": [], "approval_status": "APPROVED",
            "institute_name": "G.H RAISONI COLLEGE AND MANAGEMENT"
        }
    },
    {
        "user": {
            "id": uid(), "email": "priyanka.singh@student.ghrce.edu.in", "role": "STUDENT",
            "password_hash": hpw("student123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Priyanka Singh",
            "mobile": "9871234560", "degree": "B.Tech",
            "branch": "Electrical Engineering", "semester": "Year 4",
            "cgpa": 8.5, "graduation_year": 2026,
            "github_url": "", "linkedin_url": "",
            "institute_id": GHRCE_INSTITUTE_ID,
            "skills": ["MATLAB", "Simulink", "PLC Programming", "Power Systems", "AutoCAD Electrical"],
            "certifications": [], "approval_status": "APPROVED",
            "institute_name": "G.H RAISONI COLLEGE AND MANAGEMENT"
        }
    },
    {
        "user": {
            "id": uid(), "email": "vikram.more@student.gcce.edu.in", "role": "STUDENT",
            "password_hash": hpw("student123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Vikram More",
            "mobile": "9765432108", "degree": "B.Tech",
            "branch": "Civil Engineering", "semester": "Year 4",
            "cgpa": 7.5, "graduation_year": 2026,
            "github_url": "", "linkedin_url": "",
            "institute_id": GCCE_INSTITUTE_ID,
            "skills": ["AutoCAD Civil 3D", "STAAD.Pro", "Revit", "MS Project", "Primavera"],
            "certifications": [], "approval_status": "APPROVED",
            "institute_name": "GODAVARI COLLEGE OF ENGINEERING, JALGOAN"
        }
    },
    {
        "user": {
            "id": uid(), "email": "nehavk@gcce.edu.in", "role": "STUDENT",
            "password_hash": hpw("student123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Neha Kulkarni",
            "mobile": "9654321098", "degree": "B.Tech",
            "branch": "AI & Data Science", "semester": "Year 3",
            "cgpa": 9.3, "graduation_year": 2027,
            "github_url": "https://github.com/nehakulkarni", "linkedin_url": "",
            "institute_id": GCCE_INSTITUTE_ID,
            "skills": ["Python", "TensorFlow", "PyTorch", "SQL", "Pandas", "NLP", "Scikit-learn"],
            "certifications": [], "approval_status": "APPROVED",
            "institute_name": "GODAVARI COLLEGE OF ENGINEERING, JALGOAN"
        }
    },
    {
        "user": {
            "id": uid(), "email": "saurabh.pawar@gcce.edu.in", "role": "STUDENT",
            "password_hash": hpw("student123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Saurabh Pawar",
            "mobile": "9543210987", "degree": "B.Tech",
            "branch": "Mechatronics Engineering", "semester": "Year 4",
            "cgpa": 8.0, "graduation_year": 2026,
            "github_url": "", "linkedin_url": "",
            "institute_id": GCCE_INSTITUTE_ID,
            "skills": ["ROS", "PLC", "SCADA", "Embedded C", "Arduino", "SolidWorks", "Python"],
            "certifications": [], "approval_status": "APPROVED",
            "institute_name": "GODAVARI COLLEGE OF ENGINEERING, JALGOAN"
        }
    },
    {
        "user": {
            "id": uid(), "email": "divya.kulkarni@student.ghrce.edu.in", "role": "STUDENT",
            "password_hash": hpw("student123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Divya Kulkarni",
            "mobile": "9432109876", "degree": "B.Tech",
            "branch": "Chemical Engineering", "semester": "Year 4",
            "cgpa": 8.7, "graduation_year": 2026,
            "github_url": "", "linkedin_url": "",
            "institute_id": GHRCE_INSTITUTE_ID,
            "skills": ["Aspen HYSYS", "MATLAB", "AutoCAD", "Process Simulation", "MS Excel"],
            "certifications": [], "approval_status": "APPROVED",
            "institute_name": "G.H RAISONI COLLEGE AND MANAGEMENT"
        }
    },
    {
        "user": {
            "id": uid(), "email": "akash.thakur@student.ghrce.edu.in", "role": "STUDENT",
            "password_hash": hpw("student123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Akash Thakur",
            "mobile": "9321098765", "degree": "B.Tech",
            "branch": "Cyber Security", "semester": "Year 3",
            "cgpa": 8.4, "graduation_year": 2027,
            "github_url": "https://github.com/akashthakur", "linkedin_url": "",
            "institute_id": GHRCE_INSTITUTE_ID,
            "skills": ["Networking", "Linux", "Wireshark", "Python", "Penetration Testing", "SIEM"],
            "certifications": [], "approval_status": "APPROVED",
            "institute_name": "G.H RAISONI COLLEGE AND MANAGEMENT"
        }
    },
    {
        "user": {
            "id": uid(), "email": "tanvi.bhatt@gcce.edu.in", "role": "STUDENT",
            "password_hash": hpw("student123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Tanvi Bhatt",
            "mobile": "9210987654", "degree": "B.Tech",
            "branch": "Biotechnology", "semester": "Year 4",
            "cgpa": 9.0, "graduation_year": 2026,
            "github_url": "", "linkedin_url": "",
            "institute_id": GCCE_INSTITUTE_ID,
            "skills": ["Bioinformatics", "Python", "R", "Cell Culture", "HPLC", "BLAST"],
            "certifications": [], "approval_status": "APPROVED",
            "institute_name": "GODAVARI COLLEGE OF ENGINEERING, JALGOAN"
        }
    },
    {
        "user": {
            "id": uid(), "email": "karan.desai@student.ghrce.edu.in", "role": "STUDENT",
            "password_hash": hpw("student123"), "created_at": now()
        },
        "profile": {
            "id": uid(), "name": "Karan Desai",
            "mobile": "9109876543", "degree": "B.Tech",
            "branch": "Computer Science & Engineering", "semester": "Year 3",
            "cgpa": 8.8, "graduation_year": 2027,
            "github_url": "https://github.com/karand", "linkedin_url": "",
            "institute_id": GHRCE_INSTITUTE_ID,
            "skills": ["Java", "Spring Boot", "React", "MySQL", "AWS", "Kubernetes"],
            "certifications": [], "approval_status": "APPROVED",
            "institute_name": "G.H RAISONI COLLEGE AND MANAGEMENT"
        }
    },
]

# ═══════════════════════════════════════════════════════════════════════
#  WRITE
# ═══════════════════════════════════════════════════════════════════════

# Add mentor users + profiles
for m in mentors:
    db["users"].append(m["user"])
    db["institute_profiles"].append({
        "id": m["profile"]["id"],
        "user_id": m["user"]["id"],
        "name": m["profile"]["name"],
        "location": m["profile"]["location"],
        "domain": m["profile"]["domain"],
        "institute_role": m["profile"]["institute_role"],
        "institute_id": m["profile"]["institute_id"],
    })

# Add student users + profiles
for s in students:
    db["users"].append(s["user"])
    sp = {
        "id": s["profile"]["id"],
        "user_id": s["user"]["id"],
        "name": s["profile"]["name"],
        "mobile": s["profile"].get("mobile", ""),
        "degree": s["profile"]["degree"],
        "branch": s["profile"]["branch"],
        "semester": s["profile"]["semester"],
        "cgpa": s["profile"].get("cgpa"),
        "graduation_year": s["profile"]["graduation_year"],
        "github_url": s["profile"].get("github_url", ""),
        "linkedin_url": s["profile"].get("linkedin_url", ""),
        "institute_id": s["profile"]["institute_id"],
        "skills": s["profile"].get("skills", []),
        "certifications": s["profile"].get("certifications", []),
        "approval_status": s["profile"].get("approval_status", "APPROVED"),
        "institute_name": s["profile"].get("institute_name", ""),
    }
    if s["profile"].get("mentor_name"):
        sp["mentor_name"] = s["profile"]["mentor_name"]
    db["student_profiles"].append(sp)

    # Add welcome notification
    db["notifications"].append({
        "id": uid(),
        "user_id": s["user"]["id"],
        "message": f"Welcome to INTERNTRAC, {s['profile']['name']}! Complete your profile and upload your resume.",
        "type": "SYSTEM",
        "is_read": False,
        "created_at": now()
    })

with open(DB_PATH, "w", encoding="utf-8") as f:
    json.dump(db, f, indent=4, ensure_ascii=False)

print("=== MOCK DATA SEEDED ===")
print(f"\nMentors added: {len(mentors)}")
for m in mentors:
    print(f"  Email: {m['user']['email']}  |  Password: mentor123  |  Name: {m['profile']['name']}")

print(f"\nStudents added: {len(students)}")
for s in students:
    print(f"  Email: {s['user']['email']}  |  Password: student123  |  Name: {s['profile']['name']}  |  Branch: {s['profile']['branch']}")
