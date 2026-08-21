import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { CardSkeleton } from '../components/Skeleton'

interface FeedbackItem {
  id: string
  mentor_name: string
  feedback_text: string
  rating: number
  created_at: string
}

interface StudentProfile {
  id: string
  name: string
  institute_name: string
  mentor_name: string | null
  mentor_email: string | null
  mentor_department: string | null
}

interface AttendanceItem {
  id: string
  date: string
  hours: number
  task_details: string
  status: string
}

export default function MentorGuidancePage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([])
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceItem[]>([])
  
  const [showLogModal, setShowLogModal] = useState(false)
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0])
  const [logHours, setLogHours] = useState(8)
  const [logTask, setLogTask] = useState('')
  const [submittingLog, setSubmittingLog] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const token = localStorage.getItem('token')

  const loadData = async () => {
    if (!token) {
      navigate('/login?role=student')
      return
    }
    setLoading(true)
    setErrorMsg('')
    try {
      // 1. Profile
      const pRes = await fetch('http://localhost:8000/api/students/profile', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (pRes.status === 401 || pRes.status === 403) {
        localStorage.clear()
        navigate('/login?role=student')
        return
      }
      if (pRes.ok) {
        const pData = await pRes.json()
        setProfile(pData)
      }

      // 2. Feedbacks
      const fRes = await fetch('http://localhost:8000/api/students/feedback', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (fRes.ok) {
        const fData = await fRes.json()
        setFeedbacks(fData)
      }

      // 3. Attendance Logs
      const aRes = await fetch('http://localhost:8000/api/students/attendance', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (aRes.ok) {
        const aData = await aRes.json()
        setAttendanceLogs(aData)
      }
    } catch {
      setErrorMsg('Failed to load mentor guidance details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!logTask.trim()) return

    setSubmittingLog(true)
    setErrorMsg('')
    try {
      const res = await fetch('http://localhost:8000/api/students/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          date: logDate,
          hours: Number(logHours),
          task_details: logTask.trim()
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to submit log.')

      setSuccessMsg('Daily progress log submitted for mentor review.')
      setShowLogModal(false)
      setLogTask('')
      await loadData()
      setTimeout(() => setSuccessMsg(''), 4000)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting log.')
    } finally {
      setSubmittingLog(false)
    }
  }

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col font-sans">
      <Navbar role="student" activeTab="AI Mentor & ATS" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">
        
        {/* Top Hero Banner */}
        <div className="card p-6 sm:p-8 bg-white border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm rounded-3xl">
          <div className="max-w-xl space-y-3">
            <span className="badge-purple text-xs font-bold px-3 py-1">Academic Mentorship</span>
            <h1 className="font-headline text-3xl font-black text-slate-900 leading-tight">
              Faculty Mentor Guidance
            </h1>
            <p className="text-xs text-slate-600 leading-relaxed">
              Assigned institutional mentors review your weekly internship progress, evaluate tasks, and guide academic clearance for your credits.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => setShowLogModal(true)}
                className="btn-primary text-xs py-2.5 px-4 shadow-orange"
              >
                <span className="material-symbols-outlined text-sm">post_add</span>
                Submit Daily Progress Log
              </button>
            </div>
          </div>

          <div className="w-full md:w-72 h-44 rounded-2xl overflow-hidden shadow-sm shrink-0 border border-slate-200">
            <img
              src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&q=80"
              alt="Mentor guidance session"
              className="w-full h-full object-cover"
            />
          </div>
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

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Assigned Mentor Card */}
          <div className="space-y-6">
            
            {loading ? (
              <CardSkeleton />
            ) : profile?.mentor_name ? (
              <div className="card text-center flex flex-col items-center shadow-sm">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4B1881] to-[#321153] text-white flex items-center justify-center text-2xl font-black shadow-md border-2 border-white mb-3">
                  {profile.mentor_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>

                <span className="badge-purple text-[10px] uppercase font-bold mb-1">
                  Institute Assigned
                </span>

                <h2 className="font-headline text-lg font-bold text-slate-900 mb-0.5">
                  {profile.mentor_name}
                </h2>
                <p className="text-xs text-[#4B1881] font-semibold mb-3">
                  {profile.mentor_department || 'Department of Computer Science'}
                </p>

                <div className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5 mb-4">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="material-symbols-outlined text-sm text-[#4B1881]">mail</span>
                    <span>{profile.mentor_email || 'mentor@raisoni.edu'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <span className="material-symbols-outlined text-sm text-[#F26522]">apartment</span>
                    <span>{profile.institute_name}</span>
                  </div>
                </div>

                <a
                  href={`mailto:${profile.mentor_email || 'mentor@raisoni.edu'}`}
                  className="btn-secondary w-full justify-center text-xs py-2"
                >
                  <span className="material-symbols-outlined text-sm">mail</span>
                  Send Email to Mentor
                </a>
              </div>
            ) : (
              <div className="card text-center p-8 bg-amber-50/50 border border-amber-200 space-y-3">
                <span className="material-symbols-outlined text-3xl text-amber-500">assignment_ind</span>
                <h3 className="font-bold text-sm text-slate-900">A mentor has not been assigned yet.</h3>
                <p className="text-xs text-slate-500">
                  Your college department coordinator will assign a faculty mentor once your internship is approved.
                </p>
              </div>
            )}

            {/* Quick Summary of Attendance Logs */}
            <div className="card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Weekly Attendance Logs ({attendanceLogs.length})
                </h3>
                <button onClick={() => setShowLogModal(true)} className="text-xs text-[#4B1881] font-bold hover:underline">
                  + Log Hours
                </button>
              </div>

              {attendanceLogs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No attendance logs logged yet.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {attendanceLogs.slice(0, 5).map(log => (
                    <div key={log.id} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800">{log.date} ({log.hours} hrs)</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${log.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {log.status}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] line-clamp-1">{log.task_details}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right 2 Columns: Mentor Evaluations & Feedback */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="card space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#F26522] text-base">reviews</span>
                  Official Faculty Feedback &amp; Evaluations
                </h3>
              </div>

              {loading ? (
                <CardSkeleton />
              ) : feedbacks.length === 0 ? (
                <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
                  No mentor feedback recorded yet. Submit your weekly attendance logs to receive official evaluations.
                </div>
              ) : (
                <div className="space-y-3">
                  {feedbacks.map(fb => (
                    <div key={fb.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900">{fb.mentor_name}</h4>
                          <span className="text-[10px] text-slate-400">{fb.created_at}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: fb.rating }).map((_, i) => (
                            <span key={i} className="text-sm">★</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed italic">
                        "{fb.feedback_text}"
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </main>

      {/* Daily Progress Log Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Submit Daily Internship Progress</h3>
              <button onClick={() => setShowLogModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleSubmitLog} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={e => setLogDate(e.target.value)}
                    className="input-field text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hours Completed</label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="12"
                    required
                    value={logHours}
                    onChange={e => setLogHours(parseFloat(e.target.value) || 8)}
                    className="input-field text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Task Work Summary</label>
                <textarea
                  rows={4}
                  required
                  value={logTask}
                  onChange={e => setLogTask(e.target.value)}
                  placeholder="Describe modules built, pull requests merged, bugs solved, or tools used today..."
                  className="input-field text-xs resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="btn-secondary flex-1 justify-center py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLog}
                  className="btn-primary flex-1 justify-center py-2.5"
                >
                  {submittingLog ? 'Submitting...' : 'Submit Log'}
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
