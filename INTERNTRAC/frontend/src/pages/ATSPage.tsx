import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import CompanyTabBar from '../components/CompanyTabBar'
import { ApplicantCardSkeleton } from '../components/Skeleton'

interface Applicant {
  id: string
  internship_id: string
  job_title: string
  student_id: string
  student_name: string
  student_branch: string | null
  student_cgpa: number | null
  student_skills: string[]
  student_resume: string | null
  student_profile_picture: string | null
  github_url: string | null
  linkedin_url: string | null
  college: string
  ats_score: number | null
  ai_verdict: Record<string, any>
  status: string
  applied_at: string | null
  interview_date: string | null
  interview_time: string | null
  interview_link: string | null
  interview_duration: string | null
  interview_instructions: string | null
  task_title: string | null
  task_status: string | null
  task_score: number | null
  task_deadline: string | null
  ppo_status: string | null
  ppo_role: string | null
  certificate_path: string | null
  offer_letter_path: string | null
}

const KANBAN_COLUMNS: { key: string; label: string; color: string; statuses: string[] }[] = [
  { key: 'applied', label: 'Applied', color: 'border-slate-300', statuses: ['APPLIED', 'UNDER_REVIEW'] },
  { key: 'screened', label: 'Screened', color: 'border-[#4B1881]', statuses: ['SHORTLISTED', 'SHORTLISTED_FOR_INTERVIEW'] },
  { key: 'interview', label: 'Interview', color: 'border-[#F26522]', statuses: ['INTERVIEW_SCHEDULED', 'INTERVIEWING', 'INTERVIEW_COMPLETED'] },
  { key: 'offered', label: 'Selected', color: 'border-emerald-400', statuses: ['SELECTED', 'OFFER_SENT', 'INTERNSHIP_ACTIVE', 'COMPLETED'] },
]

function getColumnKey(status: string): string {
  for (const col of KANBAN_COLUMNS) { if (col.statuses.includes(status)) return col.key }
  return 'applied'
}

const BADGE_COLORS: Record<string, string> = {
  APPLIED: 'bg-slate-100 text-slate-600',
  UNDER_REVIEW: 'bg-blue-50 text-blue-700',
  SHORTLISTED: 'bg-amber-50 text-amber-700',
  SHORTLISTED_FOR_INTERVIEW: 'bg-amber-100 text-amber-800',
  INTERVIEW_SCHEDULED: 'bg-purple-50 text-[#4B1881]',
  INTERVIEWING: 'bg-purple-100 text-purple-800',
  INTERVIEW_COMPLETED: 'bg-indigo-50 text-indigo-700',
  SELECTED: 'bg-emerald-50 text-emerald-700',
  OFFER_SENT: 'bg-emerald-100 text-emerald-800',
  INTERNSHIP_ACTIVE: 'bg-teal-50 text-teal-700',
  COMPLETED: 'bg-green-50 text-green-800',
  REJECTED: 'bg-red-50 text-red-600',
}

function ApplicantDetailModal({ app, onClose, onAction }: { app: Applicant; onClose: () => void; onAction: () => void }) {
  const [scheduleForm, setScheduleForm] = useState({ interview_date: '', interview_time: '10:00 AM', interview_duration: '30 minutes', interview_link: 'https://meet.google.com', interview_instructions: '' })
  const [taskForm, setTaskForm] = useState({ task_title: '', task_description: '', task_deadline: '' })
  const [ppoRole, setPpoRole] = useState('')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000) }

  const api = async (url: string, method: string, body?: object) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`http://localhost:8000/api/companies${url}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    if (!res.ok) throw new Error((await res.json()).detail || 'Request failed')
    return res.json()
  }

  const moveStatus = async (newStatus: string, note?: string) => { setLoading(true); try { const data = await api('/applicants/status', 'POST', { application_id: app.id, status: newStatus, note: note || '' }); showToast(`Status: ${newStatus}${data.email_sent ? ' • Email sent to student' : ''}`); setTimeout(onAction, 1200) } catch (e: any) { showToast(e.message) } finally { setLoading(false) } }
  const scheduleInterview = async () => { if (!scheduleForm.interview_date) { showToast('Select date'); return }; setLoading(true); try { const data = await api('/applicants/schedule-interview', 'POST', { application_id: app.id, ...scheduleForm }); showToast(`Interview scheduled!${data.email_sent ? ' Invite emailed to student.' : ' Email could not be sent.'}`); setTimeout(onAction, 1200) } catch (e: any) { showToast(e.message) } finally { setLoading(false) } }
  const assignTask = async () => { if (!taskForm.task_title || !taskForm.task_deadline) { showToast('Fill title & deadline'); return }; setLoading(true); try { await api('/interns/assign-task', 'POST', { application_id: app.id, ...taskForm }); showToast('Task assigned!'); setTimeout(onAction, 1200) } catch (e: any) { showToast(e.message) } finally { setLoading(false) } }
  const offerPPO = async () => { if (!ppoRole) { showToast('Enter PPO role'); return }; setLoading(true); try { await api('/interns/offer-ppo', 'POST', { application_id: app.id, ppo_role: ppoRole }); showToast('PPO offered!'); setTimeout(onAction, 1200) } catch (e: any) { showToast(e.message) } finally { setLoading(false) } }
  const generateCertificate = async () => { setLoading(true); try { await api(`/generate-certificate?application_id=${app.id}`, 'POST'); showToast('Certificate generated!'); setTimeout(onAction, 1200) } catch (e: any) { showToast(e.message) } finally { setLoading(false) } }
  const hireAndSendOffer = async () => { setLoading(true); try { const data = await api('/applicants/hire-offer', 'POST', { application_id: app.id }); showToast(`Candidate hired! ${data.email_sent ? 'Offer emailed.' : 'Email not sent.'}`); setTimeout(onAction, 1200) } catch (e: any) { showToast(e.message) } finally { setLoading(false) } }

  const col = getColumnKey(app.status)

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-xl text-slate-900">{app.student_name}</h2>
            <p className="text-sm text-slate-500">{app.college} - {app.student_branch || 'N/A'}</p>
            <p className="text-xs text-slate-400 mt-0.5">Applied for: <span className="font-semibold text-slate-700">{app.job_title}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-1">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {toast && <div className="mx-6 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-lg">{toast}</div>}

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-slate-900">{app.ats_score ?? '-'}</div>
              <div className="text-xs text-slate-500 font-semibold">ATS Score</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-black text-slate-900">{app.student_cgpa ?? '-'}</div>
              <div className="text-xs text-slate-500 font-semibold">CGPA</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-bold ${BADGE_COLORS[app.status] || 'bg-slate-100 text-slate-600'}`}>
                {app.status.replace(/_/g, ' ')}
              </span>
              <div className="text-xs text-slate-500 font-semibold mt-1">Status</div>
            </div>
          </div>

          {app.student_skills.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {app.student_skills.map(s => <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-purple-50 text-[#4B1881] font-semibold">{s}</span>)}
              </div>
            </div>
          )}

          {app.interview_date && (
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
              <h4 className="text-xs font-bold text-[#4B1881] uppercase tracking-wider mb-2">Interview Scheduled</h4>
              <p className="text-sm font-semibold text-purple-900">{app.interview_date} at {app.interview_time}</p>
              {app.interview_link && <a href={app.interview_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-2 text-xs text-[#4B1881] font-bold hover:underline"><span className="material-symbols-outlined text-sm">videocam</span> Join Meeting</a>}
            </div>
          )}

          {app.task_title && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Current Task</h4>
              <p className="text-sm font-semibold text-amber-900">{app.task_title}</p>
              <div className="flex gap-3 mt-1 text-xs text-amber-700">
                <span>Deadline: {app.task_deadline || '-'}</span>
                <span>Status: {app.task_status || '-'}</span>
                {app.task_score && <span>Score: {app.task_score}/100</span>}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {app.student_resume && <a href={`http://localhost:8000/uploads/${app.student_resume}`} target="_blank" rel="noreferrer" className="text-xs px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 transition-colors"><span className="material-symbols-outlined text-sm">description</span> Resume</a>}
            {app.github_url && <a href={app.github_url} target="_blank" rel="noreferrer" className="text-xs px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 transition-colors">GitHub</a>}
            {app.linkedin_url && <a href={app.linkedin_url} target="_blank" rel="noreferrer" className="text-xs px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1 transition-colors">LinkedIn</a>}
          </div>

          {/* Actions by column */}
          {col === 'applied' && (
            <div className="flex gap-3 pt-4 border-t border-slate-100">
              <button onClick={() => moveStatus('SHORTLISTED', 'Shortlisted by recruiter')} disabled={loading} className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50">Shortlist</button>
              <button onClick={() => moveStatus('REJECTED', 'Rejected at screening')} disabled={loading} className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50">Reject</button>
            </div>
          )}

          {col === 'screened' && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Schedule Interview</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs text-slate-500 font-semibold block mb-1">Date *</label><input type="date" value={scheduleForm.interview_date} onChange={e => setScheduleForm(p => ({ ...p, interview_date: e.target.value }))} className="input-field text-xs py-2" /></div>
                <div><label className="text-xs text-slate-500 font-semibold block mb-1">Time</label><input type="text" value={scheduleForm.interview_time} onChange={e => setScheduleForm(p => ({ ...p, interview_time: e.target.value }))} className="input-field text-xs py-2" /></div>
                <div><label className="text-xs text-slate-500 font-semibold block mb-1">Duration</label><input type="text" value={scheduleForm.interview_duration} onChange={e => setScheduleForm(p => ({ ...p, interview_duration: e.target.value }))} className="input-field text-xs py-2" /></div>
                <div><label className="text-xs text-slate-500 font-semibold block mb-1">Meet Link</label><input type="text" value={scheduleForm.interview_link} onChange={e => setScheduleForm(p => ({ ...p, interview_link: e.target.value }))} className="input-field text-xs py-2" /></div>
              </div>
              <button onClick={scheduleInterview} disabled={loading} className="w-full py-2.5 rounded-xl bg-[#4B1881] text-white text-xs font-bold hover:bg-[#3F1569] transition-colors disabled:opacity-50">
                {loading ? 'Scheduling...' : 'Schedule Interview & Notify'}
              </button>
            </div>
          )}

          {col === 'interview' && (
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <button onClick={hireAndSendOffer} disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#4B1881] to-[#F26522] text-white text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? 'Processing...' : 'Hire & Send Offer Letter'}
              </button>
              <button onClick={() => moveStatus('REJECTED', 'Rejected post interview')} disabled={loading} className="w-full py-2.5 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50">Reject</button>
            </div>
          )}

          {col === 'offered' && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Assign Task</h4>
                <input type="text" placeholder="Task title" value={taskForm.task_title} onChange={e => setTaskForm(p => ({ ...p, task_title: e.target.value }))} className="input-field text-xs py-2" />
                <textarea rows={2} placeholder="Task description..." value={taskForm.task_description} onChange={e => setTaskForm(p => ({ ...p, task_description: e.target.value }))} className="input-field text-xs py-2" />
                <div className="flex gap-2">
                  <input type="date" value={taskForm.task_deadline} onChange={e => setTaskForm(p => ({ ...p, task_deadline: e.target.value }))} className="input-field text-xs py-2 flex-1" />
                  <button onClick={assignTask} disabled={loading} className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-colors disabled:opacity-50 shrink-0">Assign</button>
                </div>
              </div>

              {!app.ppo_status && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Offer PPO</h4>
                  <div className="flex gap-2">
                    <input type="text" placeholder="PPO role" value={ppoRole} onChange={e => setPpoRole(e.target.value)} className="input-field text-xs py-2 flex-1" />
                    <button onClick={offerPPO} disabled={loading} className="px-4 py-2 rounded-xl bg-[#4B1881] text-white text-xs font-bold hover:bg-[#3F1569] transition-colors disabled:opacity-50 shrink-0">Offer</button>
                  </div>
                </div>
              )}

              {app.ppo_status && <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-xs font-semibold text-[#4B1881]">PPO offered for "{app.ppo_role}" - Status: {app.ppo_status}</div>}

              {!app.certificate_path ? (
                <button onClick={generateCertificate} disabled={loading} className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50">
                  {loading ? 'Generating...' : 'Issue Completion Certificate'}
                </button>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs font-semibold text-emerald-800">Certificate already issued.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ATSPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [applicants, setApplicants] = useState<Applicant[]>([])
  const [selectedApp, setSelectedApp] = useState<Applicant | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filterJob, setFilterJob] = useState<string>('all')

  const fetchApplicants = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/companies/applicants', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401 || res.status === 403) { navigate('/login'); return }
      if (!res.ok) throw new Error('Failed to load applicants')
      setApplicants(await res.json())
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [navigate])

  useEffect(() => { fetchApplicants() }, [fetchApplicants])

  const jobTitles = Array.from(new Set(applicants.map(a => a.job_title)))
  const filtered = filterJob === 'all' ? applicants : applicants.filter(a => a.job_title === filterJob)
  const grouped: Record<string, Applicant[]> = {}
  for (const col of KANBAN_COLUMNS) grouped[col.key] = []
  for (const a of filtered) grouped[getColumnKey(a.status)].push(a)

  function scoreColor(score: number | null) {
    if (!score) return 'bg-slate-50 text-slate-600'
    if (score >= 75) return 'bg-emerald-50 text-emerald-700'
    if (score >= 50) return 'bg-amber-50 text-amber-700'
    return 'bg-red-50 text-red-600'
  }

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col font-sans">
      <Navbar role="company" activeTab="ATS" />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <CompanyTabBar />

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#4B1881] border border-purple-200">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4B1881] animate-pulse" />
                Live
              </span>
              <span className="text-xs text-slate-500 font-medium">Groq AI auto-shortlisting active</span>
            </div>
            <h1 className="font-headline text-2xl font-bold text-slate-900">ATS Pipeline</h1>
            <p className="text-xs text-slate-500 mt-1">
              <strong className="text-slate-900 font-semibold">{filtered.length} applicant(s)</strong> across your postings
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {jobTitles.length > 1 && (
              <select value={filterJob} onChange={e => setFilterJob(e.target.value)} className="input-field text-xs py-2 max-w-[200px]">
                <option value="all">All Internships</option>
                {jobTitles.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
            <button onClick={fetchApplicants} className="btn-secondary text-xs py-2.5">
              <span className="material-symbols-outlined text-base">refresh</span> Refresh
            </button>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {KANBAN_COLUMNS.map(col => {
            const cards = grouped[col.key] || []
            return (
              <div key={col.key} className="space-y-3">
                <div className={`flex items-center justify-between pb-2 border-b-2 ${col.color}`}>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{col.label}</h2>
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">{cards.length}</span>
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-3"><ApplicantCardSkeleton /><ApplicantCardSkeleton /></div>
                ) : cards.length === 0 ? (
                  <div className="h-40 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center p-4 text-slate-400">
                    <span className="material-symbols-outlined text-2xl mb-1 opacity-40">person_off</span>
                    <p className="text-xs font-bold opacity-60">No candidates</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cards.map(c => (
                      <div key={c.id} onClick={() => setSelectedApp(c)} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 hover:border-[#4B1881]/30 transition-colors shadow-sm cursor-pointer">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-50 text-[#4B1881] text-xs font-bold flex items-center justify-center shrink-0 overflow-hidden">
                            {c.student_profile_picture ? (
                              <img src={`http://localhost:8000/${c.student_profile_picture.replace(/^\.\//, '')}`} alt={c.student_name} className="w-full h-full object-cover" />
                            ) : (
                              c.student_name.split(' ').map(n => n[0]).join('')
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">{c.student_name}</h3>
                            <p className="text-[11px] text-slate-500 truncate">{c.college}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          {c.ats_score !== null ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${scoreColor(c.ats_score)}`}>
                              <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                              {c.ats_score}% Match
                            </span>
                          ) : <span className="text-[11px] text-slate-400">No score</span>}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${BADGE_COLORS[c.status] || 'bg-slate-100 text-slate-600'}`}>{c.status.replace(/_/g, ' ')}</span>
                        </div>
                        {c.student_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {c.student_skills.slice(0, 3).map(s => <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{s}</span>)}
                            {c.student_skills.length > 3 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">+{c.student_skills.length - 3}</span>}
                          </div>
                        )}
                        <div className="pt-2 border-t border-slate-100">
                          <button onClick={e => { e.stopPropagation(); setSelectedApp(c) }} className="w-full text-center text-xs text-[#4B1881] font-bold hover:underline">View & Act</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {selectedApp && <ApplicantDetailModal app={selectedApp} onClose={() => setSelectedApp(null)} onAction={() => { setSelectedApp(null); fetchApplicants() }} />}
      <Footer />
    </div>
  )
}
