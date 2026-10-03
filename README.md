TO RUN FRONTEND USE THIS COMMAND

cd frontend
npm run dev


TO RUN BACKEND
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
>> 
# Product Requirements Document (PRD) - INTERNTRAC

## 1. Project Overview
**INTERNTRAC** is a comprehensive, three-in-one internship management portal designed to streamline the internship ecosystem for **Students**, **Institutes (Colleges/Universities)**, and **Companies**. 
The platform bridges the gap between academic requirements and industry exposure, offering AI-driven resume screening (ATS match scoring), automated internship scraping from popular platforms (Wellfound, YC, Unstop), and full lifecycle tracking (applications, interviews, attendance, mentor feedback, and NOC approvals).

---

## 2. Key Personas & Panel Requirements

### 2.1 Student Panel
Students use INTERNTRAC to find, apply for, and track internships while getting AI assistance to understand their skill gaps.

1. **Onboarding & Profile Builder:**
   - Create a profile containing contact info, skills, education, and social links (LinkedIn, GitHub).
   - Upload a Resume (PDF format).
2. **Internship Sources:**
   - **Institute-provided Internships:** Exclusive internships posted by the student's affiliated institute or companies partnered with their institute.
   - **Explore Internships (Scraped):** Publicly available listings scraped from Wellfound, YC, and Unstop.
3. **AI-Driven Application (Side-by-Side ATS Review):**
   - When a student clicks **Apply Now** on a job listing, they are presented with a side-by-side split view:
     - **Left Side:** Internship Details (Role description, requirements, company info).
     - **Right Side:** ATS Match Card powered by AI (Groq API):
       - **ATS Match Score (%)**: A percentage representing resume alignment.
       - **AI Verdict:** Detailed reasoning explaining *why* the profile is a strong fit or *why* gaps exist.
       - **Skill Gap Analysis:** Highlighted keywords/skills missing from the student's resume compared to the job description, with learning action items.
4. **My Applied Internships Dashboard:**
   - Track internship progress along a kanban/pipeline flow:
     - `Applied` $\rightarrow$ `Shortlisted` $\rightarrow$ `Interviewing` $\rightarrow$ `Selected / Rejected`.
5. **Mentor Section:**
   - View assigned mentor details (Institute mentor and/or Company supervisor).
   - View qualitative and quantitative feedback, ratings, and performance reviews.
6. **Attendance & Progress Tracker:**
   - Submit weekly logs containing hours worked, tasks completed, and challenges faced.
   - Clock-in/Clock-out system (optional) or monthly sheet showing approved/pending logs.

---

### 2.2 Institute Panel
Institutes use INTERNTRAC to manage their students' internship mandates, approve processes, and run recruitment drives.

1. **Dashboard & Analytics:**
   - View overall placement stats: Total students, placed percentage, active internships, pending applications.
   - Student directory with quick filters (e.g., Unplaced, Active Intern, Verified Resume).
2. **AI-Powered Company Verification:**
   - When a new company registers or reaches out, the system automatically parses and checks their business credentials:
     - **CIN (Corporate Identification Number)**
     - **GSTIN (GST Identification Number)**
     - **MSME Certificate**
     - **Website Domain Alignment**
   - If there is any mismatch or anomaly, the system marks the company as `PENDING_VERIFICATION` and displays a detailed problem summary to the institute (e.g., "GSTIN format invalid", "Domain doesn't match official registration name").
   - Institute administrators review the AI assessment and decide whether to **Approve** or **Reject** the company.
3. **No Objection Certificate (NOC) Workflow:**
   - Review NOC requests submitted by students who secured external internships.
   - Auto-generate signed/stamped PDF NOC documents upon approval.
4. **Mentor Allocation:**
   - Assign faculty/academic mentors to students who are actively interning.
   - Review and sign off on attendance records submitted by students.
   - Read weekly logs and submit feedback for grading/credits.
5. **Student Tracking & Monitoring:**
   - Monitor assigned students, review their progress logs, and record qualitative feedback.

---

### 2.3 Company Panel
Companies use INTERNTRAC to post jobs, find top talent, and manage their active interns.

1. **Job Listing Creator:**
   - Post internships specifying role details, technical requirements, stipend, location, duration, and whether it's public (for all) or exclusive to specific institutes.
2. **Candidate Pipeline & Automated ATS Shortlisting:**
   - Visual Kanban pipeline showing applicants.
   - Applicant detail view showing student profile, resume, and the AI-generated ATS Score/Verdict side-by-side.
   - **Auto-Shortlist Automation:** If a student's resume yields a **match score of 75% or higher**, the system automatically advances them to the `Shortlisted for Interview` stage, removing manual repetitive screening tasks.
3. **Intern Management Panel:**
   - Monitor active interns (check-in records, weekly logs).
   - Rate intern performance and provide constructive feedback.
   - Upload official offer letters and completion certificates, or trigger automated document generation to avoid repetitive entries.

---

## 3. AI & Automation Features

### 3.1 AI Resume Screening & ATS (Groq API)
- **Engine:** Groq API using high-speed, accurate models (e.g., `llama-3.1-8b-instant`).
- **Functionality:** 
  - Extract skills and experience from the student resume.
  - Compare with the target job description.
  - Output structured JSON containing the ATS Match Score, strong points, weak points, and recommendations.
- **Rule Engine Automation:** Any match score $\ge 75\%$ triggers an automated transition of the application status to `Shortlisted / Interviewing` with notification dispatch.

### 3.2 AI Company Credential Verification (Groq API)
- **Functionality:**
  - Parse and validate registration numbers (CIN, GSTIN) against formatting and structural rules.
  - Cross-check domain name registry matching against the legal name.
  - Output structured validation reports to the Institute, highlighting specific points of verification failure.

### 3.3 Automated Internship Scraper
- **Sources:** Wellfound, YC Startup Jobs, Unstop.
- **Implementation:** A Python background worker/cron script. To prevent IP blocks and guarantee rate stability:
  - Establish a unified scraping interface.
  - Implement fallback mock generators that seed clean, realistic mock listings if direct web scraping fails or gets blocked.

### 3.4 Administrative & Workflow Automations
1. **Resume Parser:** Uploading a PDF resume automatically parses text and extracts skills to populate the student profile.
2. **NOC & Certificate PDF Generator:** Instant generation of formal PDF files for NOC approvals and internship completion certificates using templates (e.g. using `ReportLab` or `Weasyprint` in FastAPI) and auto-filling all details (student name, company, dates, supervisor name) to prevent manual duplicate entries.
3. **Notifications Engine:** Automated email notifications for status updates (e.g., "Shortlisted for interview", "NOC Approved by Institute").

---

## 4. Non-Functional Requirements & Design Aesthetics
- **Theme:** Premium, dark-mode first dashboard inspired by Stitch. Minimalist layout with glowing accents, glassmorphic containers, smooth slide-ins, and clean typography (Inter / Outfit).
- **Security:** Secure role-based access control (RBAC). Passwords stored with Bcrypt, session management using JWT.
- **Tech Stack:**
  - **Frontend:** React, Vite, Tailwind CSS, TypeScript, Lucide React (Icons).
  - **Backend:** FastAPI (Python), SQLAlchemy/SQLModel (ORMs).
  - **Database:** SQLite (dev) / PostgreSQL (prod).
  - **AI Model:** Groq API SDK.





ghribmjal@raisoni.edu	admin123
borseraj072@gmail.com	student123
gp729055@gmail.com	student123
