import { TableRowSkeleton, CardSkeleton } from '../Skeleton'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BranchStat {
  branch: string
  total: number
  placed: number
  active: number
  ppo: number
  placement_rate: number
}

export interface CompanyStat {
  company: string
  applied: number
  shortlisted: number
  selected: number
  active: number
  ppo: number
}

export interface SkillGapItem {
  skill: string
  demand_count: number
  demand_percentage: number
  student_count: number
  student_percentage: number
  gap_percentage: number
  severity: 'HIGH' | 'MODERATE' | 'BALANCED'
}

export interface Analytics {
  total_students: number
  placed_students: number
  active_interns: number
  interview_scheduled_count: number
  total_applications: number
  placement_rate: number
  ppo_count: number
  ppo_rate: number
  pending_noc_requests: number
  total_companies: number
  partner_companies: number
  pending_companies: number
  rejected_companies: number
  branch_wise_stats: BranchStat[]
  company_wise_stats: CompanyStat[]
  status_distribution: Record<string, number>
  skill_gap_analysis: SkillGapItem[]
}

export interface Student {
  id: string
  name: string
  email: string
  mobile: string | null
  degree: string
  branch: string
  semester: string
  cgpa: number | null
  graduation_year: number | null
  skills: string[]
  resume_path: string | null
  profile_picture: string | null
  profile_completion: number
  mentor_name: string | null
  mentor_email: string | null
  mentor_department: string | null
  internship_title: string | null
  internship_company: string | null
  internship_status: string
  ats_score: number | null
  ppo_status: string | null
}

export interface Company {
  id: string
  name: string
  industry: string
  website: string
  contact_email: string | null
  contact_phone: string | null
  cin: string | null
  gstin: string | null
  msme_number: string | null
  msme_certificate_url: string | null
  verification_status: string
  verification_decision: string
  verification_confidence: number
  verification_risk_level: string
  verification_errors: string[]
  verification_details: {
    verified_matches?: string[]
    mismatches?: string[]
    reasons?: string[]
    audit_trail?: Array<{ action: string; reviewer: string; timestamp: string; notes: string }>
    rejection_reason?: string
    additional_info_requested?: string
  }
  verified_at: string | null
  reviewed_by: string | null
  posted_internships?: Array<{
    id: string
    title: string
    stipend?: string
    location?: string
    status?: string
    eligible_degree?: string
  }>
}

export interface NocRequest {
  id: string
  student_id: string
  student_name: string
  student_branch: string
  student_cgpa: number
  internship_title: string
  company_name: string
  status: string
  noc_document_path: string | null
}

export interface AttendanceLog {
  id: string
  student_id: string
  student_name: string
  student_branch: string
  date: string
  hours: number
  task_details: string
  status: string
}

export interface Feedback {
  id: string
  student_id: string
  student_name: string
  mentor_name: string
  feedback_text: string
  rating: number
  created_at: string
}

export interface PendingStudent {
  id: string
  name: string
  email: string
  mobile: string | null
  degree: string
  branch: string
  semester: string
  cgpa: number | null
  graduation_year: number | null
  profile_picture: string | null
  approval_status: string
  created_at: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

export type InstituteRole = 'TPO' | 'HOD_ADMIN' | 'FACULTY_MENTOR'

interface TabDef {
  key: string
  label: string
  icon: string
}

export const ROLE_TABS: Record<InstituteRole, TabDef[]> = {
  TPO: [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'pending', label: 'Student Verification', icon: 'how_to_reg' },
    { key: 'companies', label: 'Company Verification', icon: 'verified_user' },
    { key: 'students', label: 'All Students', icon: 'groups' },
    { key: 'noc', label: 'NOC Requests', icon: 'description' },
    { key: 'attendance', label: 'Attendance', icon: 'fact_check' },
    { key: 'mentor', label: 'Mentorship', icon: 'rate_review' },
    { key: 'reports', label: 'Reports & Analytics', icon: 'assessment' },
  ],
  HOD_ADMIN: [
    { key: 'overview', label: 'Overview', icon: 'dashboard' },
    { key: 'students', label: 'Students', icon: 'groups' },
    { key: 'mentor', label: 'Assign Mentors', icon: 'supervisor_account' },
    { key: 'reports', label: 'Reports & Analytics', icon: 'assessment' },
    { key: 'noc', label: 'NOC Requests', icon: 'description' },
  ],
  FACULTY_MENTOR: [
    { key: 'my_students', label: 'My Students', icon: 'groups' },
    { key: 'mentor', label: 'Review Progress', icon: 'rate_review' },
    { key: 'faculty_attendance', label: 'Attendance', icon: 'fact_check' },
  ],
}

export const ROLE_LABELS: Record<InstituteRole, string> = {
  TPO: 'TPO Admin',
  HOD_ADMIN: 'HOD / Administrator',
  FACULTY_MENTOR: 'Faculty Mentor',
}

export const ROLE_COLORS: Record<InstituteRole, { badge: string; active: string }> = {
  TPO: { badge: 'bg-purple-50 text-[#4B1881] border border-purple-200', active: 'bg-[#4B1881] text-white' },
  HOD_ADMIN: { badge: 'bg-blue-50 text-blue-700 border border-blue-200', active: 'bg-blue-700 text-white' },
  FACULTY_MENTOR: { badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200', active: 'bg-emerald-700 text-white' },
}

export const ROLE_DESCRIPTIONS: Record<string, Record<InstituteRole, string>> = {
  overview: { TPO: 'Real-time placement analytics and institutional performance metrics', HOD_ADMIN: 'Department overview and key placement metrics', FACULTY_MENTOR: 'Overview of your mentored students' },
  pending: { TPO: 'Review and approve new student registration requests', HOD_ADMIN: '', FACULTY_MENTOR: '' },
  companies: { TPO: 'Multi-stage corporate verification pipeline with AI risk analysis', HOD_ADMIN: '', FACULTY_MENTOR: '' },
  students: { TPO: 'Browse all enrolled students and their internship lifecycle', HOD_ADMIN: 'View students in your department', FACULTY_MENTOR: '' },
  noc: { TPO: 'No Objection Certificate approvals for student internships', HOD_ADMIN: 'Review NOC requests', FACULTY_MENTOR: '' },
  attendance: { TPO: 'Track daily logged hours, module progress, and deliverables', HOD_ADMIN: '', FACULTY_MENTOR: '' },
  mentor: { TPO: 'Faculty mentorship allocation and qualitative feedback', HOD_ADMIN: 'Assign faculty mentors to students', FACULTY_MENTOR: 'Review progress and submit feedback' },
  reports: { TPO: 'Download placement, student, company, NOC and attendance reports', HOD_ADMIN: 'View and download department reports and placement analytics', FACULTY_MENTOR: '' },
  my_students: { TPO: '', HOD_ADMIN: '', FACULTY_MENTOR: 'Students assigned under your mentorship' },
  faculty_attendance: { TPO: '', HOD_ADMIN: '', FACULTY_MENTOR: 'View attendance logs for your mentored students' },
}

export const statusBadge: Record<string, string> = {
  SELECTED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  OFFER_SENT: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  INTERNSHIP_ACTIVE: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  COMPLETED: 'bg-purple-100 text-purple-800 border border-purple-200',
  SHORTLISTED: 'bg-sky-100 text-sky-800 border border-sky-200',
  SHORTLISTED_FOR_INTERVIEW: 'bg-sky-100 text-sky-800 border border-sky-200',
  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-800 border border-purple-200',
  INTERVIEWING: 'bg-amber-100 text-amber-800 border border-amber-200',
  APPLIED: 'bg-blue-50 text-blue-800 border border-blue-200',
  UNDER_REVIEW: 'bg-blue-50 text-blue-800 border border-blue-200',
  REJECTED: 'bg-red-100 text-red-800 border border-red-200',
  UNPLACED: 'bg-slate-100 text-slate-600 border border-slate-200',
  APPROVED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  AUTO_APPROVED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  PENDING: 'bg-amber-100 text-amber-800 border border-amber-200',
  AI_VERIFYING: 'bg-indigo-100 text-indigo-800 border border-indigo-200',
  MANUAL_REVIEW: 'bg-orange-100 text-orange-800 border border-orange-200',
  ADDITIONAL_INFO_REQUIRED: 'bg-amber-100 text-amber-800 border border-amber-200',
}

export const statusLabel: Record<string, string> = {
  SELECTED: 'Selected / Placed',
  OFFER_SENT: 'Offer Extended',
  INTERNSHIP_ACTIVE: 'Active Intern',
  COMPLETED: 'Completed',
  SHORTLISTED: 'Shortlisted',
  SHORTLISTED_FOR_INTERVIEW: 'Shortlisted',
  INTERVIEW_SCHEDULED: 'Interview Scheduled',
  INTERVIEWING: 'Interviewing',
  APPLIED: 'Applied',
  UNDER_REVIEW: 'Under Review',
  REJECTED: 'Rejected',
  UNPLACED: 'Unplaced',
  APPROVED: 'Approved',
  AUTO_APPROVED: 'Auto-Approved (AI)',
  PENDING: 'Pending Verification',
  AI_VERIFYING: 'AI Verifying',
  MANUAL_REVIEW: 'Manual Review Required',
  ADDITIONAL_INFO_REQUIRED: 'Action Required from Company',
}

// ─── Shared Components ──────────────────────────────────────────────────────

export function Avatar({ name, color = 'bg-purple-100 text-[#4B1881]', profilePicture }: { name: string; color?: string; profilePicture?: string | null }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'ST'
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden ${color}`}>
      {profilePicture ? (
        <img
          src={`${API_BASE}/${profilePicture.replace(/^\.\//, '')}`}
          alt={name}
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  )
}

export function StarRating({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          className={`text-lg transition-colors ${s <= value ? 'text-amber-400' : 'text-slate-300'} ${onChange ? 'hover:text-amber-400 cursor-pointer' : 'cursor-default'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export function EmptyState({ icon, message }: { icon: string; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
      <span className="material-symbols-outlined text-5xl mb-3 opacity-40">{icon}</span>
      <p className="text-sm font-medium">{message}</p>
    </div>
  )
}

export function getApiHeaders() {
  const token = localStorage.getItem('token')
  return { Authorization: `Bearer ${token}` }
}

export const API_BASE = 'http://localhost:8000'

export { TableRowSkeleton, CardSkeleton }
