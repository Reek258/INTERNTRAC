import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { CardSkeleton } from '../components/Skeleton'

interface ApplicationData {
  id: string
  internship_id: string
  title: string
  company_name: string
  location: string
  stipend: string
  status: string
  status_history: Array<{ status: string; timestamp: string; note: string }>
  ats_score: number | null
  ai_verdict: any
  applied_at: string
  interview_date: string | null
  interview_time: string | null
  interview_duration: string | null
  interview_link: string | null
  interview_instructions: string | null
  task_title: string | null
  task_description: string | null
  task_assigned_date: string | null
  task_deadline: string | null
  task_status: string | null
  task_submission_notes: string | null
  task_feedback: string | null
  task_score: number | null
  offer_letter_path: string | null
  certificate_path: string | null
  ppo_status: string | null
  ppo_role: string | null
  noc_status: string
  noc_document_path: string | null
}

export default function MyApplicationsPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<ApplicationData[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Task submission modal
  const [selectedTaskApp, setSelectedTaskApp] = useState<ApplicationData | null>(null)
  const [taskNotes, setTaskNotes] = useState('')
  const [taskGithubUrl, setTaskGithubUrl] = useState('')
  const [_taskFile, setTaskFile] = useState<File | null>(null)
  const [submittingTask, setSubmittingTask] = useState(false)

  // Onboarding modal
  const [selectedOnboardApp, setSelectedOnboardApp] = useState<ApplicationData | null>(null)
  const [onboardForm, setOnboardForm] = useState({
    aadhaar_number: '', pan_number: '', bank_account: '', bank_ifsc: '', address: '', emergency_contact: ''
  })
  const [onboardFile, setOnboardFile] = useState<File | null>(null)
  const [submittingOnboard, setSubmittingOnboard] = useState(false)

  const token = localStorage.getItem('token')

  const fetchApplications = async () => {
    if (!token) {
      navigate('/login?role=student')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await fetch('http://localhost:8000/api/students/applications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.status === 401 || res.status === 403) {
        localStorage.clear()
        navigate('/login?role=student')
        return
      }
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to load applications.')
      }
      const data = await res.json()
      setApplications(data)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error loading applications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [])

  const handleRequestNoc = async (internshipId: string) => {
    try {
      const res = await fetch('http://localhost:8000/api/students/noc-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ internship_id: internshipId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'NOC request failed.')
      setSuccessMsg('NOC request submitted to your institute successfully.')
      await fetchApplications()
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to request NOC.')
    }
  }

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTaskApp || !taskNotes.trim()) return

    setSubmittingTask(true)
    try {
      const res = await fetch(`http://localhost:8000/api/students/tasks/${selectedTaskApp.id}/submit-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          github_link: taskGithubUrl.trim() || null,
          submission_notes: taskNotes.trim()
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Task submission failed.')

      setSuccessMsg('Task work submitted successfully for evaluation.')
      setSelectedTaskApp(null)
      setTaskNotes('')
      setTaskGithubUrl('')
      setTaskFile(null)
      await fetchApplications()
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting task.')
    } finally {
      setSubmittingTask(false)
    }
  }

  const handleJoinInterview = (link: string | null) => {
    if (!link || !link.trim()) {
      alert('Interview meeting link has not been provided yet by the recruiter. Please check back shortly.')
      return
    }
    window.open(link, '_blank')
  }

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOnboardApp) return
    setSubmittingOnboard(true)
    try {
      const formData = new FormData()
      formData.append('application_id', selectedOnboardApp.id)
      formData.append('aadhaar_number', onboardForm.aadhaar_number)
      formData.append('pan_number', onboardForm.pan_number)
      formData.append('bank_account', onboardForm.bank_account)
      formData.append('bank_ifsc', onboardForm.bank_ifsc)
      formData.append('address', onboardForm.address)
      formData.append('emergency_contact', onboardForm.emergency_contact)
      if (onboardFile) formData.append('file', onboardFile)

      const res = await fetch('http://localhost:8000/api/students/onboarding/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Onboarding upload failed.')
      setSuccessMsg('Onboarding documents uploaded successfully. Pending company review.')
      setSelectedOnboardApp(null)
      setOnboardForm({ aadhaar_number: '', pan_number: '', bank_account: '', bank_ifsc: '', address: '', emergency_contact: '' })
      setOnboardFile(null)
      await fetchApplications()
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading onboarding documents.')
    } finally {
      setSubmittingOnboard(false)
    }
  }

  // Categorize
  const appliedApps = applications.filter(a => ['APPLIED', 'UNDER_REVIEW'].includes(a.status))
  const shortlistedApps = applications.filter(a =>
    ['SHORTLISTED', 'SHORTLISTED_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEWING', 'INTERVIEW_COMPLETED'].includes(a.status)
  )
  const activeApps = applications.filter(a =>
    ['SELECTED', 'OFFER_SENT', 'INTERNSHIP_ACTIVE', 'COMPLETED'].includes(a.status)
  )

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col font-sans">
      <Navbar role="student" activeTab="My Applications" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold text-[#0F172A] mb-1">
              My Applications &amp; Internship Pipeline
            </h1>
            <p className="text-xs text-slate-500">
              Live tracking of applications, interview schedules, assigned tasks, and verified documents.
            </p>
          </div>

          <button
            onClick={() => navigate('/dashboard/student')}
            className="btn-primary text-xs py-2.5 px-4 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            Explore More Internships
          </button>
        </div>

        {/* Global Alerts */}
        {errorMsg && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-bold flex items-center justify-between">
            <span>{errorMsg}</span>
            <button onClick={() => setErrorMsg('')}>✕</button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold">
            ✓ {successMsg}
          </div>
        )}

        {/* 3-Column Kanban-style Application Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Column 1: Applied & Under Review */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4B1881] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  send
                </span>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Applied / Under Review
                </h2>
              </div>
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center">
                {appliedApps.length}
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                <CardSkeleton />
                <CardSkeleton />
              </div>
            ) : appliedApps.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
                No applications currently under review.
              </div>
            ) : (
              appliedApps.map(app => (
                <div key={app.id} className="card space-y-3.5 hover:border-purple-200 transition-all shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-headline font-bold text-sm text-[#0F172A] mb-0.5">
                        {app.title}
                      </h3>
                      <p className="text-xs font-bold text-[#4B1881]">
                        {app.company_name}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                      {app.ats_score ? `${app.ats_score}% Match` : 'Screened'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-500">
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium">{app.location || 'Remote'}</span>
                    <span className="px-2 py-0.5 bg-slate-100 rounded-md font-medium">{app.stipend || 'Stipend TBD'}</span>
                  </div>

                  {app.ai_verdict?.verdict && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200 line-clamp-2">
                      <strong className="text-slate-800">AI Note: </strong>{app.ai_verdict.verdict}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Applied: {app.applied_at}</span>
                    <span className="badge-orange font-bold text-[10px]">
                      {app.status === 'APPLIED' ? 'Under Initial Review' : 'Under Review'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Column 2: Shortlisted & Interviews */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#F26522] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  star
                </span>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Shortlisted &amp; Interviews
                </h2>
              </div>
              <span className="w-5 h-5 rounded-full bg-orange-100 text-[#F26522] text-xs font-bold flex items-center justify-center">
                {shortlistedApps.length}
              </span>
            </div>

            {loading ? (
              <CardSkeleton />
            ) : shortlistedApps.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
                No interview invitations yet.
              </div>
            ) : (
              shortlistedApps.map(app => (
                <div key={app.id} className="card border-l-4 border-l-[#F26522] space-y-3.5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-headline font-bold text-sm text-[#0F172A] mb-0.5">
                        {app.title}
                      </h3>
                      <p className="text-xs font-bold text-[#4B1881]">
                        {app.company_name}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                      ATS: {app.ats_score}%
                    </span>
                  </div>

                  {/* Interview Information Banner */}
                  {app.interview_date ? (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#4B1881] flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">videocam</span>
                          Technical Interview Scheduled
                        </span>
                        <span className="text-[10px] font-bold text-purple-700 bg-white px-2 py-0.5 rounded shadow-xs">
                          {app.interview_duration || '45 Mins'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-700">
                        🗓️ <strong>{app.interview_date}</strong> {app.interview_time ? `• ${app.interview_time}` : ''}
                      </p>
                      {app.interview_instructions && (
                        <p className="text-[10px] text-slate-500 italic leading-snug">
                          Note: {app.interview_instructions}
                        </p>
                      )}
                      <button
                        onClick={() => handleJoinInterview(app.interview_link)}
                        className="btn-primary w-full justify-center text-xs py-2 mt-1"
                      >
                        <span className="material-symbols-outlined text-sm">video_call</span>
                        Join Interview Meeting
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                      ⚡ <strong>Shortlisted:</strong> Awaiting company HR to set specific interview date &amp; meeting link.
                    </div>
                  )}

                  {/* NOC Status */}
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                    <span className="text-slate-500">College NOC:</span>
                    {app.noc_status === 'APPROVED' ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                        ✓ NOC Approved
                      </span>
                    ) : app.noc_status === 'PENDING' ? (
                      <span className="text-amber-700 font-bold">NOC In Review</span>
                    ) : (
                      <button
                        onClick={() => handleRequestNoc(app.internship_id)}
                        className="text-[#4B1881] font-bold hover:underline"
                      >
                        + Request NOC
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Column 3: Active Internships & Tasks */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <h2 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Active Internships &amp; Tasks
                </h2>
              </div>
              <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center">
                {activeApps.length}
              </span>
            </div>

            {loading ? (
              <CardSkeleton />
            ) : activeApps.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-slate-200 text-center text-xs text-slate-400">
                No active internship offers at the moment.
              </div>
            ) : (
              activeApps.map(app => (
                <div key={app.id} className="card border-l-4 border-l-emerald-600 space-y-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="badge-green text-[10px] uppercase font-bold mb-1 inline-block">
                        Active Role • Selected
                      </span>
                      <h3 className="font-headline font-bold text-sm text-[#0F172A]">
                        {app.title}
                      </h3>
                      <p className="text-xs font-bold text-[#4B1881]">
                        {app.company_name}
                      </p>
                    </div>
                  </div>

                  {app.offer_letter_path && (
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-orange-50 rounded-2xl border border-purple-200 flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#4B1881] text-lg">contract</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-[#4B1881]">Offer Letter Available</p>
                        <p className="text-[10px] text-slate-500">Download and review your official offer letter.</p>
                      </div>
                      <a
                        href={`http://localhost:8000/${app.offer_letter_path.replace(/^\.\//, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 rounded-xl bg-[#4B1881] text-white text-[10px] font-bold hover:bg-[#3a1266] transition-colors"
                      >
                        Download
                      </a>
                    </div>
                  )}

                  {/* Onboarding Document Upload */}
                  {app.offer_letter_path && app.status === 'OFFER_SENT' && (
                    <div className="p-3.5 bg-blue-50 rounded-2xl border border-blue-200 space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-700 text-base">badge</span>
                        <span className="font-bold text-blue-900">Complete Onboarding</span>
                      </div>
                      <p className="text-[11px] text-blue-700">
                        Upload your onboarding documents (Aadhaar, PAN, bank details) to activate your internship.
                      </p>
                      <button
                        onClick={() => { setSelectedOnboardApp(app); setOnboardForm({ aadhaar_number: '', pan_number: '', bank_account: '', bank_ifsc: '', address: '', emergency_contact: '' }); }}
                        className="w-full py-2 rounded-xl bg-blue-700 text-white text-[11px] font-bold hover:bg-blue-800 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm align-middle mr-1">upload</span>
                        Upload Onboarding Docs
                      </button>
                    </div>
                  )}

                  {/* Task Module */}
                  {app.task_title ? (
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{app.task_title}</span>
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {app.task_status || 'ASSIGNED'}
                        </span>
                      </div>
                      {app.task_description && (
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          {app.task_description}
                        </p>
                      )}
                      {app.task_deadline && (
                        <p className="text-[11px] text-red-600 font-bold">
                          ⏰ Due: {app.task_deadline}
                        </p>
                      )}
                      {app.task_feedback && (
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-800 text-[11px]">
                          <strong>Company Feedback: </strong>{app.task_feedback}
                        </div>
                      )}
                      {app.task_status !== 'COMPLETED' && (
                        <button
                          onClick={() => { setSelectedTaskApp(app); setTaskNotes(app.task_submission_notes || ''); }}
                          className="btn-purple w-full justify-center text-xs py-2"
                        >
                          <span className="material-symbols-outlined text-sm">upload</span>
                          {app.task_status === 'SUBMITTED' ? 'Update Submission' : 'Submit Task Work'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">No tasks currently assigned by host company.</p>
                  )}

                  {/* PPO Status */}
                  {app.ppo_status && (
                    <div className="p-3 bg-gradient-to-r from-purple-50 to-orange-50 rounded-xl border border-orange-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-[#F26522] uppercase tracking-wider block">Pre-Placement Offer (PPO)</span>
                        <span className="font-bold text-slate-800">{app.ppo_status}</span>
                      </div>
                      <span className="material-symbols-outlined text-[#F26522]">military_tech</span>
                    </div>
                  )}

                  {/* Certificate / Offer Letter Documents */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                    {app.offer_letter_path && (
                      <a
                        href={`http://localhost:8000/${app.offer_letter_path.replace(/^\.\//, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary text-[11px] py-1.5 px-3 flex-1 justify-center"
                      >
                        <span className="material-symbols-outlined text-xs text-[#4B1881]">contract</span>
                        Offer Letter
                      </a>
                    )}
                    {app.certificate_path && (
                      <a
                        href={`http://localhost:8000/${app.certificate_path.replace(/^\.\//, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary text-[11px] py-1.5 px-3 flex-1 justify-center"
                      >
                        <span className="material-symbols-outlined text-xs text-emerald-600">verified</span>
                        Certificate
                      </a>
                    )}
                    {app.noc_document_path && (
                      <a
                        href={`http://localhost:8000/${app.noc_document_path.replace(/^\.\//, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary text-[11px] py-1.5 px-3 flex-1 justify-center"
                      >
                        <span className="material-symbols-outlined text-xs text-blue-600">description</span>
                        NOC PDF
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </main>

      {/* Task Submission Modal */}
      {selectedTaskApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline font-bold text-sm text-[#0F172A]">
                  Submit Work: {selectedTaskApp.task_title}
                </h3>
                <p className="text-xs text-[#4B1881] font-bold">{selectedTaskApp.company_name}</p>
              </div>
              <button onClick={() => setSelectedTaskApp(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleTaskSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  GitHub Repository URL <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={taskGithubUrl}
                  onChange={e => setTaskGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Submission Notes / Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={taskNotes}
                  onChange={e => setTaskNotes(e.target.value)}
                  placeholder="Describe your implementation, approach, and key features delivered..."
                  className="input-field text-xs resize-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Attach Deliverable (Optional PDF / ZIP / Code)</label>
                <input
                  type="file"
                  onChange={e => setTaskFile(e.target.files?.[0] || null)}
                  className="input-field text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-purple-50 file:text-[#4B1881]"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskApp(null)}
                  className="btn-secondary flex-1 justify-center py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="btn-primary flex-1 justify-center py-2.5"
                >
                  {submittingTask ? 'Submitting...' : 'Submit to Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Onboarding Document Upload Modal */}
      {selectedOnboardApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline font-bold text-sm text-[#0F172A]">
                  Onboarding Documents
                </h3>
                <p className="text-xs text-[#4B1881] font-bold">{selectedOnboardApp.company_name} — {selectedOnboardApp.title}</p>
              </div>
              <button onClick={() => setSelectedOnboardApp(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleOnboardingSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Aadhaar Number</label>
                  <input type="text" value={onboardForm.aadhaar_number} onChange={e => setOnboardForm({ ...onboardForm, aadhaar_number: e.target.value })} placeholder="1234 5678 9012" className="input-field text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">PAN Number</label>
                  <input type="text" value={onboardForm.pan_number} onChange={e => setOnboardForm({ ...onboardForm, pan_number: e.target.value })} placeholder="ABCDE1234F" className="input-field text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Account Number</label>
                  <input type="text" value={onboardForm.bank_account} onChange={e => setOnboardForm({ ...onboardForm, bank_account: e.target.value })} placeholder="Account number" className="input-field text-xs" />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank IFSC</label>
                  <input type="text" value={onboardForm.bank_ifsc} onChange={e => setOnboardForm({ ...onboardForm, bank_ifsc: e.target.value })} placeholder="SBIN0001234" className="input-field text-xs" />
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Residential Address</label>
                <textarea rows={2} value={onboardForm.address} onChange={e => setOnboardForm({ ...onboardForm, address: e.target.value })} placeholder="Full address for records" className="input-field text-xs resize-none" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Emergency Contact (Phone)</label>
                <input type="text" value={onboardForm.emergency_contact} onChange={e => setOnboardForm({ ...onboardForm, emergency_contact: e.target.value })} placeholder="9876543210" className="input-field text-xs" />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Attach Supporting Documents (Optional)</label>
                <input type="file" onChange={e => setOnboardFile(e.target.files?.[0] || null)} className="input-field text-xs file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:bg-blue-50 file:text-blue-700" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setSelectedOnboardApp(null)} className="btn-secondary flex-1 justify-center py-2.5">Cancel</button>
                <button type="submit" disabled={submittingOnboard} className="btn-primary flex-1 justify-center py-2.5 bg-blue-700 hover:bg-blue-800">
                  {submittingOnboard ? 'Uploading...' : 'Submit Onboarding'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
