import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import AtsEvaluationModal from '../components/AtsEvaluationModal'
import { CardSkeleton } from '../components/Skeleton'

interface StudentProfile {
  id: string
  name: string
  email: string
  degree: string
  branch: string
  semester: string
  graduation_year: number
  cgpa: number | null
  institute_name: string
  mentor_name: string | null
  profile_picture: string | null
  profile_completion: number
  has_resume: boolean
  approval_status?: string
}

interface DashboardStats {
  profile_completion: number
  total_applications: number
  under_review: number
  shortlisted: number
  upcoming_interviews: number
  active_internships: number
  completed_internships: number
  pending_tasks: number
  average_ats_score: number
  has_resume: boolean
}

interface DashboardTask {
  id: string
  title: string
  description: string
  deadline: string
  status: string
  company_name: string
  assigned_date: string
}

export default function StudentDashboardPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [filterSource, setFilterSource] = useState<'ALL' | 'INSTITUTE' | 'EXPLORE'>('ALL')
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '')
  
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [internships, setInternships] = useState<any[]>([])
  const [fetchError, setFetchError] = useState('')
  
  const [selectedInternship, setSelectedInternship] = useState<any | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [studentTasks, setStudentTasks] = useState<DashboardTask[]>([])

  const token = localStorage.getItem('token')

  const loadDashboardData = async () => {
    if (!token) {
      navigate('/login?role=student')
      return
    }
    setLoading(true)
    setFetchError('')
    try {
      // 1. Fetch Profile
      const profileRes = await fetch('http://localhost:8000/api/students/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (profileRes.status === 401 || profileRes.status === 403) {
        localStorage.clear()
        navigate('/login?role=student')
        return
      }
      if (profileRes.ok) {
        const pData = await profileRes.json()
        setProfile(pData)
      }

      // 2. Fetch Stats
      const statsRes = await fetch('http://localhost:8000/api/students/dashboard-stats', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (statsRes.ok) {
        const sData = await statsRes.json()
        setStats(sData)
      }

      // 3. Fetch Internships
      const source = filterSource === 'EXPLORE' ? 'explore' : 'all'
      const jobsRes = await fetch(`http://localhost:8000/api/students/internships?source=${source}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (jobsRes.ok) {
        const jData = await jobsRes.json()
        setInternships(jData)
      } else {
        const err = await jobsRes.json()
        setFetchError(err?.detail || 'Failed to load internships.')
      }

      // 4. Fetch Student Tasks
      const tasksRes = await fetch('http://localhost:8000/api/students/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (tasksRes.ok) {
        const tData = await tasksRes.json()
        setStudentTasks(tData || [])
      }
    } catch {
      setFetchError('Network error. Make sure the backend server is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [filterSource])

  const filtered = internships.filter(item => {
    if (filterSource === 'INSTITUTE' && item.source !== 'INTERNAL') return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      const reqText = (item.requirements || '').toLowerCase()
      const titleText = (item.title || '').toLowerCase()
      const compText = (item.company_name || '').toLowerCase()
      const skills: string[] = item.required_skills ? item.required_skills.map((s: string) => s.toLowerCase()) : []
      
      return titleText.includes(q) || compText.includes(q) || reqText.includes(q) || skills.some(s => s.includes(q))
    }
    return true
  })

  const handleApplyClick = (internship: any) => {
    setSelectedInternship(internship)
    setModalOpen(true)
  }

  const studentFirstName = profile?.name ? profile.name.split(' ')[0] : 'Student'
  const isVerified = profile?.approval_status === 'APPROVED' || profile?.approval_status === undefined

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col font-sans">
      <Navbar role="student" activeTab="Explore Internships" />

      {/* Unverified Profile Alert Banner */}
      {!isVerified && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
          <div className="flex items-center gap-4 px-5 py-4 bg-amber-50 border border-amber-300 rounded-2xl shadow-sm">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
            </span>
            <span className="material-symbols-outlined text-amber-700 text-xl shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
            <div className="flex-1">
              <p className="text-xs font-bold text-amber-900">Your profile is pending TPO verification</p>
              <p className="text-[11px] text-amber-700">You can browse internships but cannot apply until your institute TPO verifies your registration. Contact your Training &amp; Placement Office for faster approval.</p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        
        {/* Welcome Header */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-orange text-xs font-bold px-3 py-1">Student Portal</span>
              <span className="text-xs text-slate-500 font-semibold">
                • {profile?.degree || 'B.Tech'} {profile?.branch || 'Computer Science'} ({profile?.graduation_year || 2025})
              </span>
            </div>
            <h1 className="font-headline text-3xl font-black text-slate-900 leading-tight">
              Welcome back, <span className="text-[#4B1881]">{studentFirstName}! 👋</span>
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-lg">
              {profile?.institute_name ? `${profile.institute_name} • ` : ''}
              Real Groq AI resume matching active. Explore campus and verified off-campus drives below.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/student-profile')}
              className="btn-secondary text-xs py-2.5 px-4 rounded-xl"
            >
              <span className="material-symbols-outlined text-base">person</span>
              My Profile
            </button>
            {studentTasks.filter(t => t.status === 'ASSIGNED').length > 0 && (
              <button
                onClick={() => navigate('/student-tasks')}
                className="text-xs py-2.5 px-4 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">task_alt</span>
                My Tasks ({studentTasks.filter(t => t.status === 'ASSIGNED').length})
              </button>
            )}
            <button
              onClick={() => navigate('/my-applications')}
              className="btn-secondary text-xs py-2.5 px-4 rounded-xl"
            >
              <span className="material-symbols-outlined text-base">checklist_rtl</span>
              My Applications {stats?.total_applications ? `(${stats.total_applications})` : ''}
            </button>
            <button
              onClick={() => navigate('/mentor')}
              className="btn-primary text-xs py-2.5 px-5 rounded-xl shadow-orange"
            >
              <span className="material-symbols-outlined text-base">school</span>
              Faculty Mentor
            </button>
            <button
              onClick={() => navigate('/internship-history')}
              className="btn-secondary text-xs py-2.5 px-4 rounded-xl"
            >
              <span className="material-symbols-outlined text-base">history</span>
              Internship History
            </button>
          </div>
        </div>

        {/* Filter Tabs & Search Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-2xl self-start">
            <button
              onClick={() => setFilterSource('ALL')}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                filterSource === 'ALL'
                  ? 'bg-white text-[#4B1881] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({internships.length})
            </button>
            <button
              onClick={() => setFilterSource('INSTITUTE')}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                filterSource === 'INSTITUTE'
                  ? 'bg-white text-[#4B1881] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Institute Exclusive
            </button>
            <button
              onClick={() => setFilterSource('EXPLORE')}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition-all ${
                filterSource === 'EXPLORE'
                  ? 'bg-white text-[#F26522] shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Off-Campus Drives
            </button>
          </div>

          <div className="relative bg-white rounded-xl border border-slate-200 flex items-center px-3 py-1.5 shadow-sm sm:w-64">
            <span className="material-symbols-outlined text-slate-400 text-lg mr-2">search</span>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by role, company, skill..."
              className="bg-transparent border-none outline-none text-xs text-slate-800 placeholder-slate-400 w-full"
            />
          </div>
        </div>

        {/* Internship Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : fetchError ? (
          <div className="bg-white p-12 rounded-3xl border border-red-200 text-center">
            <span className="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
            <p className="text-sm font-bold text-red-600">{fetchError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500">
            <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">search_off</span>
            <p className="text-sm font-bold">No internships match your current filters.</p>
            <button onClick={() => { setSearchQuery(''); setFilterSource('ALL'); }} className="btn-secondary text-xs mt-3 py-1.5 px-4">
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((item, idx) => {
              const reqSkills = item.required_skills && item.required_skills.length > 0
                ? item.required_skills.slice(0, 4)
                : (item.requirements
                    ? item.requirements.split(/[,.]/).map((s: string) => s.trim()).filter((s: string) => s.length > 1 && s.length < 35).slice(0, 4)
                    : [])
              const sourceLabel = item.source === 'INTERNAL' ? 'Campus' : (item.scraped_from || 'Off-Campus')

              return (
                <div
                  key={item.id ?? `scraped-${idx}`}
                  className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-purple-200 hover:shadow-lg transition-all flex flex-col h-full"
                >
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    {item.source === 'INTERNAL' ? (
                      <span className="badge-purple text-[10px] uppercase font-bold">Campus</span>
                    ) : (
                      <span className="badge-orange text-[10px] uppercase font-bold">{sourceLabel}</span>
                    )}
                    <span className="text-xs font-semibold text-slate-400">{item.duration || '3 Months'}</span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 leading-snug line-clamp-2 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs font-bold text-[#4B1881] mb-2">
                    {item.company_name}
                  </p>

                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-3 mb-3 flex-1">
                    {item.description}
                  </p>

                  {reqSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {reqSkills.map((skill: string) => (
                        <span key={skill} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-md border border-slate-200">
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-auto">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{item.stipend || 'Stipend TBD'}</p>
                      {item.is_applied ? (
                        <span className="badge-green text-[10px] font-bold inline-block mt-0.5">
                          {item.application_status} {item.ats_score ? `(${item.ats_score}%)` : ''}
                        </span>
                      ) : (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.location || 'Remote'}</p>
                      )}
                    </div>

                    <button
                      onClick={() => handleApplyClick(item)}
                      disabled={!isVerified}
                      className={`text-xs py-2 px-5 rounded-xl shrink-0 transition-all ml-3 ${
                        isVerified
                          ? 'btn-primary shadow-orange'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                      title={!isVerified ? 'TPO verification required before applying' : undefined}
                    >
                      {!isVerified ? 'Locked' : item.is_applied ? 'View Score' : 'Check Fit & Apply'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>

      <Footer />

      {selectedInternship && (
        <AtsEvaluationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          internship={{
            id: selectedInternship.id,
            title: selectedInternship.title,
            company: selectedInternship.company_name,
            company_name: selectedInternship.company_name,
            location: selectedInternship.location,
            stipend: selectedInternship.stipend,
            duration: selectedInternship.duration,
            work_mode: selectedInternship.work_mode,
            description: selectedInternship.description,
            requirements: selectedInternship.requirements,
            required_skills: selectedInternship.required_skills,
            preferred_skills: selectedInternship.preferred_skills,
            min_cgpa: selectedInternship.min_cgpa,
            eligible_branches: selectedInternship.eligible_branches,
            eligible_degree: selectedInternship.eligible_degree,
            source: selectedInternship.source,
            scraped_from: selectedInternship.scraped_from,
            link: selectedInternship.link
          }}
          onApplySuccess={() => {
            loadDashboardData()
          }}
        />
      )}
    </div>
  )
}
