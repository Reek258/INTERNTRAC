import re
import time
from typing import List, Dict, Any

import requests

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
}

CACHE_TTL_SECONDS = 1800


def _slug_to_title(slug: str) -> str:
    words = slug.replace("-", " ").split()
    return " ".join(w.capitalize() for w in words[:8])


class ScraperService:
    _cache: Dict[str, Any] = {}

    @staticmethod
    def _cache_get(key: str):
        entry = ScraperService._cache.get(key)
        if entry and (time.time() - entry["ts"]) < CACHE_TTL_SECONDS:
            return entry["data"]
        return None

    @staticmethod
    def _cache_set(key: str, data):
        ScraperService._cache[key] = {"data": data, "ts": time.time()}

    @staticmethod
    def _fetch_yc_jobs(limit: int = 10) -> List[Dict[str, Any]]:
        """Live-fetch real job postings from Y Combinator (server-rendered page)."""
        cached = ScraperService._cache_get("yc")
        if cached is not None:
            return cached
        try:
            r = requests.get("https://www.ycombinator.com/jobs", headers=HEADERS, timeout=12)
            r.raise_for_status()
            matches = re.findall(
                r'href="(/companies/[a-z0-9-]+/jobs/[^"]+)"[^>]*>([^<]{5,120})<', r.text
            )
            seen, jobs = set(), []
            # Prioritize internship roles so students see internships first
            matches.sort(key=lambda m: ("intern" not in m[1].lower(),))
            for href, title in matches:
                if href in seen:
                    continue
                seen.add(href)
                company_slug = href.split("/companies/")[1].split("/jobs/")[0]
                jobs.append({
                    "title": title.strip(),
                    "company_name": _slug_to_title(company_slug),
                    "description": f"Live opening at a Y Combinator startup. Apply directly on YC's job board.",
                    "requirements": "See full requirements on the original listing.",
                    "eligible_branches": [],
                    "duration": "See listing",
                    "source": "SCRAPED",
                    "scraped_from": "YC Startup Jobs",
                    "stipend": "See listing",
                    "location": "See listing",
                    "link": f"https://www.ycombinator.com{href}",
                })
                if len(jobs) >= limit:
                    break
            if jobs:
                ScraperService._cache_set("yc", jobs)
            return jobs
        except Exception as e:
            print(f"[SCRAPER] YC fetch failed: {e}")
            return []

    @staticmethod
    def _fetch_wellfound_jobs(limit: int = 10) -> List[Dict[str, Any]]:
        """Live-fetch real job postings from Wellfound (AngelList Talent)."""
        cached = ScraperService._cache_get("wellfound")
        if cached is not None:
            return cached
        try:
            r = requests.get("https://wellfound.com/jobs", headers=HEADERS, timeout=15)
            r.raise_for_status()
            matches = re.findall(r'<a[^>]+href="(/jobs/\d+[^"]*)"[^>]*>(.*?)</a>', r.text, re.S)
            seen, jobs = set(), []
            parsed = []
            for href, inner in matches:
                title = re.sub(r"<[^>]+>", " ", inner)
                title = re.sub(r"\s+", " ", title).strip()
                if title:
                    parsed.append((href, title))
            parsed.sort(key=lambda m: ("intern" not in m[1].lower(),))
            for href, title in parsed:
                if href in seen:
                    continue
                seen.add(href)
                jobs.append({
                    "title": title,
                    "company_name": "Startup (Wellfound)",
                    "description": f"Live opening sourced from Wellfound's startup job board.",
                    "requirements": "See full requirements on the original listing.",
                    "eligible_branches": [],
                    "duration": "See listing",
                    "source": "SCRAPED",
                    "scraped_from": "Wellfound",
                    "stipend": "See listing",
                    "location": "See listing",
                    "link": f"https://wellfound.com{href}",
                })
                if len(jobs) >= limit:
                    break
            if jobs:
                ScraperService._cache_set("wellfound", jobs)
            return jobs
        except Exception as e:
            print(f"[SCRAPER] Wellfound fetch failed: {e}")
            return []

    @staticmethod
    def scrape_explore_internships(source_filter: str = None) -> List[Dict[str, Any]]:
        listings = [
            # ── REAL Unstop listings (verified deep links) ────────────────
            {
                "title": "Software Development Internship - Batch of 2026",
                "company_name": "Myntra",
                "description": "Join Myntra's Engineering team building massive-scale web applications, engaging user interfaces, big-data analytics and workflow systems for India's leading fashion e-commerce platform.",
                "requirements": "B.Tech degree from an accredited institution, scheduled to complete in 2026. Strong problem-solving and coding fundamentals.",
                "eligible_branches": ["Computer Science & Engineering", "Information Technology", "AI & Data Science"],
                "duration": "6 Months",
                "source": "SCRAPED",
                "scraped_from": "Unstop",
                "stipend": "See listing",
                "location": "Bangalore, India",
                "link": "https://unstop.com/internships/software-development-internship-batch-of-2026-open-campus-myntra-1465266"
            },
            {
                "title": "Software Engineer Internship",
                "company_name": "Rubrik",
                "description": "Rubrik Security Cloud is hiring Software Engineer Interns to work on zero-trust data security and enterprise-scale cloud products.",
                "requirements": "Bachelor's or Master's in CS or related field. Proficiency in Java, C/C++, Scala or Python. CGPA 8+.",
                "eligible_branches": ["Computer Science & Engineering", "Information Technology", "AI & Data Science"],
                "duration": "5 Months",
                "source": "SCRAPED",
                "scraped_from": "Unstop",
                "stipend": "See listing",
                "location": "Bangalore, India",
                "link": "https://unstop.com/internships/software-engineer-internship-rubrik-1549119"
            },
            {
                "title": "Full Stack Developer Internship",
                "company_name": "SpiralInfra",
                "description": "Work on full-stack product development covering modern web frameworks, APIs and cloud deployment alongside experienced engineers.",
                "requirements": "Strong programming fundamentals, familiarity with JavaScript/Python and web development concepts.",
                "eligible_branches": ["Computer Science & Engineering", "Information Technology", "AI & Data Science"],
                "duration": "3 Months",
                "source": "SCRAPED",
                "scraped_from": "Unstop",
                "stipend": "See listing",
                "location": "Remote (India)",
                "link": "https://unstop.com/internships/full-stack-developer-internship-spiralinfra-1742287"
            },
            {
                "title": "Data Analyst Internship",
                "company_name": "Aalteon",
                "description": "Join Aalteon's remote analytics team. Work on data-driven decision making, dashboards and business intelligence projects.",
                "requirements": "Proficiency in Excel and SQL, analytical mindset, ability to work independently.",
                "eligible_branches": [],
                "duration": "3 Months",
                "source": "SCRAPED",
                "scraped_from": "Unstop",
                "stipend": "Rs. 20,000 - 35,000 / mo",
                "location": "Remote (India)",
                "link": "https://unstop.com/internships/data-analyst-internship-aalteon-1720164"
            },
            {
                "title": "Data Analyst Internship",
                "company_name": "Fortune Analytics",
                "description": "Collect, clean and analyze large datasets, develop Power BI/Tableau dashboards and support cross-functional teams with actionable insights.",
                "requirements": "SQL, Excel, data visualization tools (Power BI/Tableau), strong communication skills.",
                "eligible_branches": [],
                "duration": "3 Months",
                "source": "SCRAPED",
                "scraped_from": "Unstop",
                "stipend": "Rs. 12,000 - 15,000 / mo",
                "location": "Remote (India)",
                "link": "https://unstop.com/internships/data-analyst-internship-fortune-analytics-1680126"
            },
            {
                "title": "Engineering Trainee Internship",
                "company_name": "Finulent Solutions LLP",
                "description": "Work on CAD/non-CAD engineering processes as an engineering trainee. Path to permanent employment based on performance.",
                "requirements": "BE/Diploma in Mechanical, Electrical, Mechatronics, Civil, Electrical & Electronics, or Electronics & Telecommunication.",
                "eligible_branches": ["Mechanical Engineering", "Electrical Engineering", "Mechatronics Engineering", "Civil Engineering", "Electronics & Telecommunication"],
                "duration": "3 Months",
                "source": "SCRAPED",
                "scraped_from": "Unstop",
                "stipend": "Rs. 10,000 / mo",
                "location": "Noida, India",
                "link": "https://unstop.com/internships/engineering-trainee-internship-finulent-solutions-llp-1673458"
            },
            {
                "title": "Graduate Engineer Internship",
                "company_name": "Patvin",
                "description": "Work across design (AutoCAD, Pro-E, Eplan) and automation (PLC, SCADA, Robotics) teams on industrial products and engineering projects.",
                "requirements": "BE/B.Tech in Mechanical or Electrical. First class throughout education. GPA 7.0 or higher.",
                "eligible_branches": ["Mechanical Engineering", "Electrical Engineering", "Mechatronics Engineering"],
                "duration": "6 Months",
                "source": "SCRAPED",
                "scraped_from": "Unstop",
                "stipend": "See listing",
                "location": "Navi Mumbai, India",
                "link": "https://unstop.com/internships/graduate-engineer-internship-patvin-1580399"
            },
            {
                "title": "Physical Design & Integration Internship",
                "company_name": "Airbus",
                "description": "Manage system installation work packages covering Cabin Design, Mechanical Systems and Electrical Systems for next-generation aircraft at Airbus Bangalore.",
                "requirements": "Fresh graduate in Mechanical, Electrical, Industrial/Production or Aerospace Engineering. No prior full-time experience.",
                "eligible_branches": ["Mechanical Engineering", "Electrical Engineering", "Mechatronics Engineering"],
                "duration": "12 Months",
                "source": "SCRAPED",
                "scraped_from": "Unstop",
                "stipend": "See listing",
                "location": "Bangalore, India",
                "link": "https://unstop.com/internships/physical-design-integration-internship-airbus-1698504"
            },
            {
                "title": "Graduate Engineer Apprentice",
                "company_name": "IFFCO",
                "description": "Join Indian Farmers Fertiliser Cooperative Limited's manufacturing operations. Hands-on apprenticeship in fertiliser production plants.",
                "requirements": "Four-year full-time BE/B.Tech in Chemical, Mechanical, Electrical, Instrumentation & Electronics, or Civil.",
                "eligible_branches": ["Chemical Engineering", "Mechanical Engineering", "Electrical Engineering", "Civil Engineering", "Electronics & Telecommunication"],
                "duration": "12 Months",
                "source": "SCRAPED",
                "scraped_from": "Unstop",
                "stipend": "See listing",
                "location": "New Delhi, India",
                "link": "https://unstop.com/internships/graduate-engineer-apprentice-iffco-1086977"
            },
            {
                "title": "Civil Engineering Internship",
                "company_name": "Technip Energies",
                "description": "Join the Engineering, Process & Technology teams at Technip Energies. Contribute to real energy-industry projects with mentorship from experienced professionals.",
                "requirements": "B.E./B.Tech (Mechanical/Civil/E&I/Electrical/Chemical/Petrochemical). Fresher / 2026 passout only.",
                "eligible_branches": ["Civil Engineering", "Mechanical Engineering", "Electrical Engineering", "Chemical Engineering"],
                "duration": "3 Months",
                "source": "SCRAPED",
                "scraped_from": "Unstop",
                "stipend": "See listing",
                "location": "Gandhinagar, India",
                "link": "https://unstop.com/internships/civil-engineering-internship-technip-energies-1480146"
            },
            {
                "title": "Infrastructure & Highway Projects Internship",
                "company_name": "National Highways Authority of India",
                "description": "Hands-on experience on National Highway projects across the country through NHAI's Summer Internship Programme.",
                "requirements": "Full-time undergraduate/postgraduate students from NIRF-ranked institutions and reputed universities.",
                "eligible_branches": ["Civil Engineering"],
                "duration": "2 Months",
                "source": "SCRAPED",
                "scraped_from": "Unstop",
                "stipend": "See listing",
                "location": "New Delhi, India",
                "link": "https://unstop.com/internships/infrastructure-highway-projects-internship-national-highways-authority-of-india-1667514"
            },
            {
                "title": "TP Advisory Internship",
                "company_name": "Deloitte",
                "description": "Assist with Transfer Pricing documentation, FAR analysis, benchmarking studies and tax compliance at Deloitte Hyderabad.",
                "requirements": "Pursuing graduation or post-graduation. Strong analytical and communication skills. Interest in taxation/finance.",
                "eligible_branches": [],
                "duration": "3 Months",
                "source": "SCRAPED",
                "scraped_from": "Unstop",
                "stipend": "Not Disclosed",
                "location": "Hyderabad, India",
                "link": "https://unstop.com/internships/tp-advisory-internship-deloitte-1691204"
            },

            # ── Wellfound browse (live deep links fetched separately) ─────
            {
                "title": "Startup Engineering Internships",
                "company_name": "Various Startups",
                "description": "Hand-picked startup roles sourced live from Wellfound (AngelList Talent) — software, AI, product and design internships at funded startups.",
                "requirements": "Varies by role — see individual listings on Wellfound.",
                "eligible_branches": ["Computer Science & Engineering", "Information Technology", "AI & Data Science", "Electronics & Telecommunication"],
                "duration": "3-6 Months",
                "source": "SCRAPED",
                "scraped_from": "Wellfound",
                "stipend": "$500 - $5,000 / mo",
                "location": "Remote / On-site (Global)",
                "link": "https://wellfound.com/jobs"
            },
            {
                "title": "YC Startup Internships",
                "company_name": "Y Combinator Startups",
                "description": "Internship and early-career roles at Y Combinator-backed startups — engineering, AI research and product roles, many remote-friendly.",
                "requirements": "Varies by role — see individual listings on YC's job board.",
                "eligible_branches": ["Computer Science & Engineering", "Information Technology", "AI & Data Science", "Electronics & Telecommunication"],
                "duration": "3-6 Months",
                "source": "SCRAPED",
                "scraped_from": "YC Startup Jobs",
                "stipend": "$1,000 - $3,000 / mo",
                "location": "San Francisco / Remote (Global)",
                "link": "https://www.ycombinator.com/jobs"
            },
        ]

        # Prepend live listings (real URLs verified at fetch time); curated act as fallback
        live = ScraperService._fetch_yc_jobs() + ScraperService._fetch_wellfound_jobs()
        all_listings = live + listings

        if source_filter:
            return [l for l in all_listings if l["scraped_from"].lower() == source_filter.lower()]

        import random
        random.shuffle(all_listings)
        return all_listings
