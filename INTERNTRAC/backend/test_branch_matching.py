"""Verification for branch-equivalence matching + branch-relevance ranking.

1. Unit tests: equivalent branch names match across families.
2. Eligibility: Computer Engineering student is NOT rejected for a
   "Computer Science Engineering" requirement; Mechanical student is.
3. Ranking via GET /api/students/internships: CS student sees software roles
   first; Mechanical student sees CAD roles first.
db.json is backed up before and restored after the run.
"""
import shutil
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

BACKUP = "db.json.__branch_test_backup__"
shutil.copyfile("db.json", BACKUP)

from app.services.branch_utils import branches_match, internship_relevance_score
from app.services.groq_service import groq_service

results = []


def record(name, ok, extra=""):
    results.append((name, ok))
    print(f"[{'PASS' if ok else 'FAIL'}] {name} {extra}")


# ── 1. Branch equivalence unit tests ───────────────────────────────────────────
pairs = [
    ("Computer Engineering", "Computer Science Engineering", True),
    ("Computer Science & Engineering", "Computer Engineering", True),
    ("CSE", "Computer Engineering", True),
    ("Information Technology", "Computer Science Engineering", True),
    ("Computer Engineering", "Mechanical Engineering", False),
    ("Mechanical Engineering", "Electrical Engineering", False),
    ("Electronics & Telecommunication", "Electrical Engineering", True),
    ("Civil Engineering", "Mechanical Engineering", False),
    ("Mechatronics Engineering", "Mechanical Engineering", True),
]
for a, b, expected in pairs:
    got = branches_match(a, b)
    record(f"match('{a}', '{b}') == {expected}", got == expected, f"-> {got}")

# ── 2. Eligibility verdicts (branch must NOT block; other criteria still do) ───
groq_service.screen_resume = lambda **kw: {"score": 70, "matched_skills": [], "skill_gaps": [], "strengths": [], "recommendations": [], "score_breakdown": {}}

cs_internship = {
    "title": "Software Developer Intern",
    "description": "Build web apps",
    "requirements": "React, Node.js",
    "required_skills": ["React"],
    "min_cgpa": 0,
    "eligible_branches": ["Computer Science Engineering"],
    "eligible_degree": "",
}

report = groq_service.evaluate_eligibility(
    student_profile={"branch": "Computer Engineering", "degree": "B.Tech", "cgpa": 8.5, "skills": ["react"]},
    resume_text="react developer project",
    internship=cs_internship,
)
record("CE student ELIGIBLE for CSE-only internship", report["deterministic_passed"] and report["verdict"] == "ELIGIBLE",
       f"-> verdict={report['verdict']}")

report = groq_service.evaluate_eligibility(
    student_profile={"branch": "Mechanical Engineering", "degree": "B.Tech", "cgpa": 8.5, "skills": ["react"]},
    resume_text="react developer project",
    internship=cs_internship,
)
record("ME student with software skills ALSO ELIGIBLE for CSE internship",
       report["deterministic_passed"] and report["verdict"] == "ELIGIBLE",
       f"-> verdict={report['verdict']}")
record("no branch-related failure recorded", all("Branch" not in f for f in report["deterministic_failures"]),
       f"-> failures={report['deterministic_failures']}")

# Other criteria still enforced: low CGPA must fail
report = groq_service.evaluate_eligibility(
    student_profile={"branch": "Mechanical Engineering", "degree": "B.Tech", "cgpa": 5.0, "skills": ["react"]},
    resume_text="react developer project",
    internship={**cs_internship, "min_cgpa": 7.0},
)
record("low CGPA still rejected", any("CGPA" in f for f in report["deterministic_failures"]),
       f"-> failures={report['deterministic_failures']}")

# Missing mandatory skill must fail
report = groq_service.evaluate_eligibility(
    student_profile={"branch": "Mechanical Engineering", "degree": "B.Tech", "cgpa": 8.5, "skills": ["autocad"]},
    resume_text="cad design project",
    internship=cs_internship,
)
record("missing mandatory skill still rejected", any("skill" in f.lower() for f in report["deterministic_failures"]),
       f"-> failures={report['deterministic_failures']}")

# ── 3. Ranking through the real API ────────────────────────────────────────────
from fastapi.testclient import TestClient
from app.main import app
from app.api.auth import get_current_user
from app.core.db import get_db

db = get_db()
STUDENT_USER_ID = "411cad6e-94ec-4b26-9424-5c4ed02c7dc6"
app.dependency_overrides[get_current_user] = lambda: {"id": STUDENT_USER_ID, "role": "STUDENT", "email": "borseraj072@gmail.com"}

profile = next(p for p in db.data["student_profiles"] if p.get("user_id") == STUDENT_USER_ID)
original_branch = profile.get("branch")

test_jobs = [
    {"id": "test-job-software", "title": "Full Stack Software Developer Intern", "company_name": "TestCo",
     "description": "Build web applications with React and Node.", "requirements": "React, Node.js",
     "required_skills": ["React"], "min_cgpa": 0, "eligible_branches": ["Computer Science Engineering"],
     "eligible_degree": "", "stipend": "10k", "location": "Remote", "duration": "3 Months",
     "vacancies": 2, "status": "ACTIVE", "openings": 2, "source": "INTERNAL"},
    {"id": "test-job-cad", "title": "CAD Design Engineer Intern", "company_name": "TestCo",
     "description": "Create mechanical CAD models using SolidWorks.", "requirements": "SolidWorks, AutoCAD",
     "required_skills": ["SolidWorks"], "min_cgpa": 0, "eligible_branches": ["Mechanical Engineering"],
     "eligible_degree": "", "stipend": "8k", "location": "On-site", "duration": "3 Months",
     "vacancies": 1, "status": "ACTIVE", "openings": 1, "source": "INTERNAL"},
    {"id": "test-job-marketing", "title": "Digital Marketing Intern", "company_name": "TestCo",
     "description": "Run social media campaigns.", "requirements": "Communication",
     "required_skills": [], "min_cgpa": 0, "eligible_branches": ["All Branches"],
     "eligible_degree": "", "stipend": "5k", "location": "Remote", "duration": "2 Months",
     "vacancies": 3, "status": "ACTIVE", "openings": 3, "source": "INTERNAL"},
]
existing_ids = {j["id"] for j in db.data["internships"]}
for j in test_jobs:
    if j["id"] not in existing_ids:
        db.data["internships"].append(j)

client = TestClient(app)


def fetch_order(branch_value):
    profile["branch"] = branch_value
    res = client.get("/api/students/internships", params={"source": "internal"})
    assert res.status_code == 200, res.text
    titles = [r["id"] for r in res.json()]
    return [titles.index(j) for j in ("test-job-software", "test-job-cad", "test-job-marketing")]


# CS student: software first, CAD last
s, c, m = fetch_order("Computer Engineering")
record("CS student: software ranks before marketing", s < m, f"(software@{s}, cad@{c}, marketing@{m})")
record("CS student: software ranks before CAD", s < c)

# Mech student: CAD first, software last
s, c, m = fetch_order("Mechanical Engineering")
record("ME student: CAD ranks first of all", c < s and c < m, f"(software@{s}, cad@{c}, marketing@{m})")

# relevance score sanity
record("score(explicit fit) == 0", internship_relevance_score("Computer Engineering", cs_internship) == 0)

# ── Restore DB ─────────────────────────────────────────────────────────────────
profile["branch"] = original_branch
db.data["internships"] = [j for j in db.data["internships"] if not j["id"].startswith("test-job-")]
db.commit()
shutil.copyfile(BACKUP, "db.json")
os.remove(BACKUP)
print("\ndb.json restored to pre-test state.")

passed = sum(1 for _, ok in results if ok)
print(f"RESULT: {passed}/{len(results)} tests passed")
sys.exit(0 if passed == len(results) else 1)
