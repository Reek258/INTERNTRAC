"""Branch normalization, equivalence matching, and internship relevance ranking.

Variant names of the same engineering discipline are treated as equivalent so
that, e.g., a "Computer Engineering" student is fully eligible for internships
listing "Computer Science Engineering" (and vice versa). Distinct disciplines
such as Mechanical or Electrical remain different categories.
"""
import re
from typing import List

# Family rules are evaluated in order; first hit wins.
# Multi-word entries are substring-matched against the normalized name;
# single-word entries must match a whole token (avoids false positives).
FAMILY_RULES = [
    ("COMPUTER", [
        "computer science", "computer engineering", "computer technology",
        "computer application", "information technology", "artificial intelligence",
        "data science", "machine learning", "cyber security", "cybersecurity",
        "cloud computing", "full stack", "software",
        "computer", "cse", "ai", "ml", "it", "iot",
    ]),
    ("MECHANICAL", [
        "mechanical", "mechatronics", "production", "industrial engineering",
        "automobile", "automotive", "thermal",
    ]),
    ("ELECTRICAL", [
        "electrical", "electronics", "telecommunication", "communication",
        "instrumentation", "power systems", "vlsi", "embedded",
        "ece", "eee",
    ]),
    ("CIVIL", ["civil", "structural", "construction"]),
    ("CHEMICAL", ["chemical", "petrochemical", "polymer"]),
    ("BIOTECH", ["biotechnology", "biotech", "biomedical", "bioinformatics", "bioscience"]),
    ("AGRICULTURE", ["agriculture", "agricultural"]),
]

# Domain keywords used to rank internships by relevance to a student's branch
# even when the posting does not list eligible branches explicitly.
CONTENT_KEYWORDS = {
    "COMPUTER": [
        "software", "developer", "development", "web", "frontend", "front end",
        "backend", "back end", "full stack", "fullstack", "mobile app", "android",
        "flutter", "react", "angular", "node", "python", "java", "php", ".net",
        "data science", "data analyst", "data engineer", "big data", "analytics",
        "machine learning", "deep learning", "ai", "devops", "cloud", "aws",
        "azure", "cyber", "security", "qa", "testing", "database", "sql",
        "programming", "coding", "saas", "erp", "iot", "blockchain", "ui", "ux",
    ],
    "MECHANICAL": [
        "cad", "cam", "cae", "solidworks", "catia", "autocad", "creo", "nx",
        "fusion 360", "ansys", "mechanical", "design engineer", "manufacturing",
        "production", "thermal", "hvac", "automobile", "automotive", "cnc",
        "fem", "fea", "maintenance", "quality control",
    ],
    "ELECTRICAL": [
        "pcb", "embedded", "vlsi", "verilog", "matlab", "simulink", "power",
        "electronics", "telecom", "communication", "signal", "automation",
        "plc", "scada", "circuit", "hardware", "robotics", "drone", "ev",
    ],
    "CIVIL": [
        "civil", "structural", "construction", "site engineer", "surveying",
        "estimation", "bim", "revit", "autocad",
    ],
    "CHEMICAL": ["chemical", "process", "petrochemical", "polymer", "paint", "coating"],
    "BIOTECH": ["bio", "pharma", "clinical", "medical", "healthcare", "laboratory"],
}

UNIVERSAL_TERMS = ["all", "all branches", "any", "any branch", "open for all", "all engineering", "open to all"]


def _normalize(name: str) -> str:
    n = (name or "").lower()
    n = n.replace("&", " and ").replace("+", " and ")
    n = re.sub(r"[^a-z0-9.]+", " ", n)
    return re.sub(r"\s+", " ", n).strip()


def get_branch_family(branch_name: str) -> str:
    """Map a branch name to its canonical discipline family."""
    n = _normalize(branch_name)
    if not n:
        return ""
    tokens = set(n.split())
    for family, keywords in FAMILY_RULES:
        for kw in keywords:
            if " " in kw:
                if kw in n:
                    return family
            elif kw in tokens:
                return family
    return n


def branches_match(branch_a: str, branch_b: str) -> bool:
    """True when both names belong to the same discipline family."""
    if not branch_a or not branch_b:
        return False
    return get_branch_family(branch_a) == get_branch_family(branch_b)


def is_universal_branch_list(branches: List[str]) -> bool:
    """True when the eligible-branch list opens the role to every branch."""
    for b in branches or []:
        bl = (b or "").lower().strip()
        if any(t == bl or t in bl for t in UNIVERSAL_TERMS):
            return True
    return False


def _content_matches(family: str, item: dict) -> bool:
    """Check whether the internship content mentions keywords of the family."""
    keywords = CONTENT_KEYWORDS.get(family)
    if not keywords:
        return False
    haystack = " ".join(str(item.get(k) or "") for k in
                        ("title", "description", "requirements")).lower()
    skills = " ".join((item.get("required_skills") or [])).lower()
    text = f"{haystack} {skills}"
    if not text.strip():
        return False
    tokens = set(_normalize(text).split())
    for kw in keywords:
        if " " in kw or "." in kw:
            if kw in text:
                return True
        elif kw in tokens:
            return True
    return False


def internship_relevance_score(student_branch: str, item: dict) -> int:
    """Lower is more relevant.

    0 — internship explicitly lists the student's branch family
    1 — open to all branches OR content keywords match the student's domain
    2 — unrelated to the student's branch
    """
    branches = item.get("eligible_branches") or []
    if branches and not is_universal_branch_list(branches):
        if any(branches_match(student_branch, b) for b in branches):
            return 0
        return 1 if _content_matches(get_branch_family(student_branch), item) else 2
    return 1 if _content_matches(get_branch_family(student_branch), item) else 2
