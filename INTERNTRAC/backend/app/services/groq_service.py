import json
import re
from typing import Dict, Any, List, Optional
from groq import Groq
from app.core.config import settings

class GroqService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.model = settings.GROQ_MODEL or "llama-3.3-70b-versatile"
        if self.api_key:
            try:
                self.client = Groq(api_key=self.api_key)
            except Exception as e:
                print(f"Error initializing Groq client: {e}")
                self.client = None
        else:
            self.client = None

    def _call_groq_json(self, system_prompt: str, user_content: str, max_tokens: int = 1500) -> Optional[Dict[str, Any]]:
        """
        Helper method to query Groq with automatic JSON parsing and retry fallback models.
        """
        if not self.client:
            return None

        # List of models to attempt in order
        candidate_models = [self.model, "llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
        # deduplicate while keeping order
        seen = set()
        models = [m for m in candidate_models if m and not (m in seen or seen.add(m))]

        for model_name in models:
            try:
                chat_completion = self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content}
                    ],
                    model=model_name,
                    temperature=0.1,
                    response_format={"type": "json_object"},
                    max_tokens=max_tokens
                )
                response_text = chat_completion.choices[0].message.content
                if response_text:
                    return json.loads(response_text)
            except Exception as e:
                print(f"Groq API error with model '{model_name}': {e}")
                continue
        return None

    def evaluate_eligibility(
        self,
        student_profile: Dict[str, Any],
        resume_text: str,
        internship: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Step 1: Deterministic Eligibility Rules (CGPA, Degree, Mandatory Skills — branch/department is NOT a criterion)
        Step 2: Groq AI ATS & Semantic Evaluation
        Step 3: Synthesis into final verdict: ELIGIBLE | PARTIALLY_ELIGIBLE | NOT_ELIGIBLE
        """
        deterministic_failures: List[str] = []
        deterministic_passes: List[str] = []

        # 1. CGPA check
        min_cgpa = float(internship.get("min_cgpa") or 0.0)
        student_cgpa = float(student_profile.get("cgpa") or 0.0) if student_profile.get("cgpa") is not None else None

        if min_cgpa > 0:
            if student_cgpa is None:
                deterministic_failures.append(f"CGPA requirement ({min_cgpa:.1f}) not met: No CGPA provided in profile.")
            elif student_cgpa < min_cgpa:
                deterministic_failures.append(f"Your CGPA is {student_cgpa:.2f}, while the minimum required CGPA is {min_cgpa:.2f}.")
            else:
                deterministic_passes.append(f"CGPA check passed: {student_cgpa:.2f} >= {min_cgpa:.2f} required.")

        # 2. Branch check — REMOVED BY DESIGN:
        # Department/branch is NOT an eligibility criterion. Students from any
        # branch (e.g. Mechanical with software skills) can apply to any role.
        # Branch is still used only for relevance ranking in the listings feed.

        # 3. Degree check
        eligible_degree = (internship.get("eligible_degree") or "").strip()
        student_degree = (student_profile.get("degree") or "").strip()
        if eligible_degree:
            req_deg = eligible_degree.lower()
            stud_deg = student_degree.lower()
            
            is_universal_degree = any(term == req_deg or term in req_deg for term in ["all", "any", "all degrees", "any degree", "all engineering", "open for all"])

            # Synonymous engineering degrees: B.Tech, B.E., Bachelor of Technology, Bachelor of Engineering, BE/BTech
            btech_synonyms = ["b.tech", "btech", "b.e", "be", "b.e.", "b.e / b.tech", "b.tech / b.e", "bachelor of technology", "bachelor of engineering"]
            is_req_btech = any(s == req_deg or s in req_deg for s in btech_synonyms)
            is_stud_btech = any(s == stud_deg or s in stud_deg for s in btech_synonyms)

            degree_matches = (
                is_universal_degree or
                not student_degree or
                req_deg in stud_deg or
                stud_deg in req_deg or
                (is_req_btech and is_stud_btech)
            )

            if not degree_matches:
                deterministic_failures.append(f"Degree '{student_degree}' does not match required degree '{eligible_degree}'.")
            else:
                deterministic_passes.append(f"Degree '{student_degree or 'All'}' matches required degree '{eligible_degree}'.")

        # 4. Mandatory skills check
        required_skills = internship.get("required_skills") or []
        student_skills = [s.lower() for s in (student_profile.get("skills") or [])]
        resume_lower = resume_text.lower() if resume_text else ""

        missing_mandatory_skills = []
        for req_s in required_skills:
            req_lower = req_s.lower()
            in_profile = any(req_lower in s or s in req_lower for s in student_skills)
            in_resume = req_lower in resume_lower
            if not (in_profile or in_resume):
                missing_mandatory_skills.append(req_s)

        if missing_mandatory_skills:
            deterministic_failures.append(f"Missing mandatory required skills: {', '.join(missing_mandatory_skills)}.")
        elif required_skills:
            deterministic_passes.append(f"All {len(required_skills)} mandatory skills matched.")

        deterministic_passed = len(deterministic_failures) == 0

        # Step 2: Groq AI ATS & Semantic Analysis
        ai_report = self.screen_resume(
            resume_text=resume_text,
            job_title=internship.get("title", ""),
            job_description=f"{internship.get('description', '')}\nRequirements:\n{internship.get('requirements', '')}\nRequired Skills: {', '.join(required_skills)}",
            student_skills=student_profile.get("skills") or [],
            student_academic={
                "degree": student_profile.get("degree"),
                "branch": student_profile.get("branch"),
                "cgpa": student_profile.get("cgpa"),
                "semester": student_profile.get("semester")
            }
        )

        ats_score = int(ai_report.get("score", 0))
        matched_skills = ai_report.get("matched_skills", [])
        missing_skills = ai_report.get("skill_gaps", [])
        strengths = ai_report.get("strengths", [])
        improvements = ai_report.get("recommendations", [])

        # Step 3: Synthesis into final verdict
        if not deterministic_passed:
            verdict = "NOT_ELIGIBLE"
            verdict_explanation = "Deterministic criteria not met: " + " ".join(deterministic_failures)
        else:
            if ats_score >= 60:
                verdict = "ELIGIBLE"
                verdict_explanation = "You meet all mandatory eligibility requirements and have a strong profile match."
            elif ats_score >= 40:
                verdict = "PARTIALLY_ELIGIBLE"
                verdict_explanation = "You meet the academic requirements, but some preferred skills or relevant project depth are missing."
            else:
                verdict = "NOT_ELIGIBLE"
                verdict_explanation = f"Your resume match score ({ats_score}/100) is below the competitive threshold for this role."

        return {
            "ats_score": ats_score,
            "verdict": verdict,
            "verdict_explanation": verdict_explanation,
            "confidence": 0.88 if self.client else 0.75,
            "deterministic_passed": deterministic_passed,
            "deterministic_failures": deterministic_failures,
            "deterministic_passes": deterministic_passes,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "strengths": strengths,
            "improvements": improvements,
            "score_breakdown": ai_report.get("score_breakdown", {})
        }

    def screen_resume(
        self,
        resume_text: str,
        job_title: str,
        job_description: str,
        student_skills: Optional[List[str]] = None,
        student_academic: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Screen resume text against job description using Groq LLaMA with structured outputs.
        """
        student_skills_str = ", ".join(student_skills or [])
        academic_str = json.dumps(student_academic or {})

        system_prompt = (
            "You are an expert ATS (Applicant Tracking System) recruiter and technical evaluator. "
            "Analyze the candidate's resume and profile against the job description with high accuracy.\n\n"
            "SCORING METHODOLOGY (Total 100 pts):\n"
            "- Skill alignment (40 pts): Match of technologies, tools, languages between candidate and JD\n"
            "- Experience relevance (25 pts): Projects, internships, or work matching role domain\n"
            "- Education & certifications (15 pts): Degree, coursework, academic background relevance\n"
            "- Communication quality (10 pts): Resume clarity, quantifiable metrics, professional presentation\n"
            "- Culture/domain fit (10 pts): Alignment with company industry and role scope\n\n"
            "RULES:\n"
            "- Output MUST be a valid JSON object only.\n"
            "- 'score' (integer between 0 and 100)\n"
            "- 'verdict' (2-3 sentences summary of candidate fit)\n"
            "- 'matched_skills' (array of strings with matched technical skills)\n"
            "- 'skill_gaps' (array of strings with missing or recommended skills)\n"
            "- 'strengths' (array of 3-5 strings highlighting specific strengths)\n"
            "- 'recommendations' (array of 2-4 strings with actionable improvements)\n"
            "- 'score_breakdown' (object with integer keys: skill_alignment, experience_relevance, education, communication, domain_fit)\n"
            "Do NOT include markdown formatting or backticks outside the JSON."
        )

        user_content = (
            f"Job Title: {job_title}\n\n"
            f"Job Description & Requirements:\n{job_description}\n\n"
            f"Candidate Profile Skills: {student_skills_str}\n"
            f"Academic Details: {academic_str}\n\n"
            f"--- CANDIDATE RESUME TEXT ---\n{resume_text}\n--- END OF RESUME ---"
        )

        result = self._call_groq_json(system_prompt, user_content, max_tokens=1500)
        if result and "score" in result:
            # Normalize schema
            if "matched_skills" not in result:
                result["matched_skills"] = []
            if "skill_gaps" not in result:
                result["skill_gaps"] = []
            if "strengths" not in result:
                result["strengths"] = []
            if "recommendations" not in result:
                result["recommendations"] = []
            if "score_breakdown" not in result or not isinstance(result["score_breakdown"], dict):
                result["score_breakdown"] = {}
            return result

        # Fallback to local rule-based evaluation if Groq fails or API key is not present
        return self._local_ats_evaluation(resume_text, job_title, job_description, student_skills)

    def _local_ats_evaluation(
        self,
        resume_text: str,
        job_title: str,
        job_description: str,
        student_skills: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        High quality rule-based ATS evaluation fallback when AI service is offline.
        """
        resume_lower = (resume_text or "").lower()
        jd_lower = (job_description or "").lower()
        profile_skills_lower = [s.lower() for s in (student_skills or [])]

        all_known_skills = [
            "react", "typescript", "javascript", "tailwind", "fastapi", "python",
            "sqlite", "postgresql", "docker", "aws", "git", "node", "html", "css",
            "mongodb", "sql", "redux", "nextjs", "vue", "django", "express", "kubernetes",
            "java", "c++", "go", "rust", "graphql", "redis", "elasticsearch", "spark",
            "tensorflow", "pytorch", "scikit", "pandas", "numpy", "flutter", "kotlin", "swift",
            "figma", "rest api", "linux", "cloud", "agile"
        ]

        found_skills = [s for s in all_known_skills if s in resume_lower or s in profile_skills_lower]
        required_skills = [s for s in all_known_skills if s in jd_lower]
        if not required_skills:
            required_skills = ["python", "sql", "git"]

        matched = [s for s in required_skills if s in found_skills]
        missing = [s for s in required_skills if s not in found_skills]

        # Sub-scores
        skill_score = int((len(matched) / max(1, len(required_skills))) * 40)
        
        exp_keywords = ["intern", "project", "experience", "developed", "built", "worked", "deployed", "designed", "engineered", "implemented"]
        exp_found = sum(1 for kw in exp_keywords if kw in resume_lower)
        exp_score = min(25, int((exp_found / 5) * 25))

        edu_keywords = ["bachelor", "b.tech", "btech", "b.e", "master", "m.tech", "degree", "computer science", "engineering", "cgpa", "college"]
        edu_found = sum(1 for kw in edu_keywords if kw in resume_lower)
        edu_score = min(15, 6 + (edu_found * 2))

        comm_keywords = ["%", "increased", "reduced", "achieved", "improved", "built", "launched", "users", "optimized"]
        comm_found = sum(1 for kw in comm_keywords if kw in resume_lower)
        comm_score = min(10, 4 + (comm_found * 2))

        domain_score = min(10, len(matched) * 2)

        total_score = max(15, min(96, skill_score + exp_score + edu_score + comm_score + domain_score))

        matched_formatted = [s.capitalize() for s in matched]
        missing_formatted = [s.capitalize() for s in missing]

        strengths = [f"Direct proficiency with {s}" for s in matched_formatted[:4]]
        if not strengths:
            strengths = ["Resume provided for evaluation."]

        skill_gaps = [f"Recommended skill to add: {s}" for s in missing_formatted[:5]]

        if total_score >= 75:
            verdict = f"Strong alignment for the {job_title} role with solid coverage of core technical requirements."
            recs = ["Quantify project impacts and highlight deployed system architecture.", "Prepare technical talking points for your matched tools."]
        elif total_score >= 50:
            verdict = f"Moderate match for {job_title}. Demonstrates key fundamentals, but missing some desired specialized requirements."
            recs = [f"Complete a project showcasing {s}." for s in missing_formatted[:2]]
        else:
            verdict = f"Low alignment for {job_title}. Candidate is missing critical required competencies."
            recs = [f"Build coursework and projects covering {s}." for s in missing_formatted[:3]]

        return {
            "score": total_score,
            "verdict": verdict,
            "matched_skills": matched_formatted,
            "skill_gaps": skill_gaps if skill_gaps else ["No major skill gaps identified."],
            "strengths": strengths,
            "recommendations": recs,
            "score_breakdown": {
                "skill_alignment": skill_score,
                "experience_relevance": exp_score,
                "education": edu_score,
                "communication": comm_score,
                "domain_fit": domain_score
            }
        }

    def verify_company_multistage(
        self,
        legal_name: str,
        website: str,
        cin: Optional[str] = None,
        gstin: Optional[str] = None,
        official_email: Optional[str] = None,
        msme_number: Optional[str] = None,
        document_text: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Comprehensive Multi-Stage Corporate Verification:
        1. Deterministic format & consistency validation (CIN, GSTIN, Website, Domain Match, Document OCR/Text)
        2. Groq AI corporate risk & identity analysis
        3. Synthesis and auto-approval rule enforcement
        """
        deterministic_errors = []
        verified_matches = []
        mismatches = []

        # --- Stage 1: Deterministic Input Validation ---
        # 1a. Legal Name
        clean_name = (legal_name or "").strip()
        if not clean_name or len(clean_name) < 2:
            deterministic_errors.append("Company legal name is missing or invalid.")
        else:
            verified_matches.append(f"Company legal name '{clean_name}' recorded.")

        # 1b. Website URL & Domain
        clean_website = (website or "").strip().lower()
        if not clean_website:
            deterministic_errors.append("Official company website URL is required.")
        else:
            clean_website_url = clean_website if clean_website.startswith("http") else f"https://{clean_website}"
            try:
                parsed_url = urlparse(clean_website_url)
                domain = parsed_url.netloc or parsed_url.path
                if "." not in domain or len(domain.split(".")[-1]) < 2:
                    deterministic_errors.append("Website domain format is malformed or invalid.")
                else:
                    verified_matches.append(f"Website domain '{domain}' validated.")
            except Exception:
                deterministic_errors.append("Website URL cannot be parsed.")

        # 1c. CIN Validation (India Corporate Identification Number)
        if not cin or not cin.strip():
            deterministic_errors.append("CIN (Corporate Identification Number) is missing.")
        else:
            cin_clean = cin.strip().upper()
            if len(cin_clean) != 21:
                deterministic_errors.append(f"CIN length is invalid ({len(cin_clean)} chars, expected exactly 21).")
            elif not re.match(r"^[L|U]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$", cin_clean):
                deterministic_errors.append("CIN format does not match MCA structure (e.g. U72200MH2021PTC123456).")
            else:
                verified_matches.append(f"CIN '{cin_clean}' conforms to Ministry of Corporate Affairs standard.")

        # 1d. GSTIN Validation
        if not gstin or not gstin.strip():
            deterministic_errors.append("GSTIN is missing.")
        else:
            gstin_clean = gstin.strip().upper()
            if len(gstin_clean) != 15:
                deterministic_errors.append(f"GSTIN length is invalid ({len(gstin_clean)} chars, expected exactly 15).")
            elif not re.match(r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$", gstin_clean):
                deterministic_errors.append("GSTIN format does not match standard 15-character GST structure.")
            else:
                verified_matches.append(f"GSTIN '{gstin_clean}' conforms to GST Council format.")

        # 1e. Email & Domain Consistency
        if official_email and official_email.strip():
            clean_email = official_email.strip().lower()
            email_parts = clean_email.split("@")
            if len(email_parts) == 2:
                email_domain = email_parts[1]
                free_providers = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "rediffmail.com"]
                if email_domain in free_providers:
                    mismatches.append(f"Official corporate email is registered on free public provider (@{email_domain}).")
                else:
                    verified_matches.append(f"Official email belongs to corporate domain @{email_domain}.")

        # 1f. Document Text Cross-Verification
        if document_text and document_text.strip():
            doc_lower = document_text.lower()
            name_words = [w.lower() for w in clean_name.split() if len(w) > 2 and w.lower() not in ["pvt", "ltd", "private", "limited", "technologies", "tech", "india", "solutions"]]
            name_matched = any(w in doc_lower for w in name_words) if name_words else True
            if name_matched:
                verified_matches.append("Uploaded certificate/document text matches company legal name.")
            else:
                mismatches.append("Uploaded certificate text does not clearly contain company legal name.")

        deterministic_passed = (len(deterministic_errors) == 0)

        # --- Stage 2: Groq AI Risk & Identity Evaluation ---
        system_prompt = (
            "You are an enterprise corporate integrity and regulatory verification AI for INTERNTRAC.\n"
            "Analyze the submitted company identity, corporate credentials, domain consistency, and document evidence.\n"
            "Return a strictly formatted JSON object with the following schema:\n"
            "{\n"
            '  "decision": "AUTO_APPROVE" | "MANUAL_REVIEW" | "REJECT",\n'
            '  "confidence": 0.0 to 1.0 (float),\n'
            '  "risk_level": "LOW" | "MEDIUM" | "HIGH",\n'
            '  "verified_matches": ["list", "of", "verified", "points"],\n'
            '  "mismatches": ["list", "of", "mismatches", "or", "risks"],\n'
            '  "reasons": ["list", "of", "key", "rationales"]\n'
            "}\n"
            "Do NOT include markdown formatting or backticks outside the JSON."
        )

        user_content = (
            f"Company Legal Name: {clean_name}\n"
            f"Official Website: {clean_website}\n"
            f"Official Email: {official_email or 'Not provided'}\n"
            f"CIN: {cin or 'Not provided'}\n"
            f"GSTIN: {gstin or 'Not provided'}\n"
            f"MSME Number: {msme_number or 'Not provided'}\n"
            f"Document Text Snippet: {document_text[:1000] if document_text else 'No document uploaded'}\n"
            f"Deterministic Validation Errors: {', '.join(deterministic_errors) if deterministic_errors else 'None'}\n"
            f"Detected Mismatches: {', '.join(mismatches) if mismatches else 'None'}\n"
        )

        ai_res = self._call_groq_json(system_prompt, user_content, max_tokens=800)

        # Fallback or synthesis
        if not ai_res or not isinstance(ai_res, dict) or "decision" not in ai_res:
            ai_decision = "AUTO_APPROVE" if deterministic_passed and not mismatches else "MANUAL_REVIEW"
            ai_confidence = 0.90 if deterministic_passed else 0.50
            ai_risk = "LOW" if deterministic_passed and not mismatches else "MEDIUM"
            ai_reasons = ["Automated deterministic verification checks evaluated."]
            if deterministic_errors:
                ai_reasons.extend(deterministic_errors)
        else:
            ai_decision = ai_res.get("decision", "MANUAL_REVIEW")
            ai_confidence = float(ai_res.get("confidence", 0.75))
            ai_risk = ai_res.get("risk_level", "MEDIUM")
            ai_reasons = ai_res.get("reasons", [])
            for vm in ai_res.get("verified_matches", []):
                if vm not in verified_matches:
                    verified_matches.append(vm)
            for mm in ai_res.get("mismatches", []):
                if mm not in mismatches:
                    mismatches.append(mm)

        # Combine errors into mismatches
        for err in deterministic_errors:
            if err not in mismatches:
                mismatches.append(err)

        # --- Stage 3: Enforcement & Final Status Determination ---
        # Rule: Deterministic failure NEVER allows AUTO_APPROVE
        final_decision = ai_decision
        final_risk = ai_risk
        final_confidence = ai_confidence

        if not deterministic_passed or len(mismatches) > 0:
            if final_decision == "AUTO_APPROVE":
                final_decision = "MANUAL_REVIEW"
            if final_risk == "LOW":
                final_risk = "MEDIUM"
            final_confidence = min(final_confidence, 0.70)

        if len(deterministic_errors) >= 2 or any("malformed" in e.lower() for e in deterministic_errors):
            final_risk = "HIGH"

        status_mapping = {
            "AUTO_APPROVE": "AUTO_APPROVED",
            "MANUAL_REVIEW": "MANUAL_REVIEW",
            "REJECT": "MANUAL_REVIEW" # Sent to manual review for institute admin to confirm rejection
        }

        suggested_status = status_mapping.get(final_decision, "MANUAL_REVIEW")

        return {
            "suggested_status": suggested_status,
            "decision": final_decision,
            "confidence": round(final_confidence, 2),
            "risk_level": final_risk,
            "deterministic_passed": deterministic_passed,
            "errors": deterministic_errors,
            "verified_matches": verified_matches,
            "mismatches": mismatches,
            "reasons": ai_reasons
        }

groq_service = GroqService()
