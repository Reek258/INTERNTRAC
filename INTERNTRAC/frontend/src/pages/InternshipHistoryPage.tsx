import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { CardSkeleton } from '../components/Skeleton'

interface HistoryEntry {
  application_id: string
  internship_id: string
  title: string
  company_name: string
  location: string | null
  duration: string | null
  stipend: string | null
  status: string
  applied_at: string | null
  completion_date: string | null
  offer_date: string | null
  certificate_path: string | null
  offer_letter_path: string | null
  onboarding_status: string | null
  total_tasks: number
  completed_tasks: number
  avg_stars: number
  ppo_status: string | null
  ppo_role: string | null
}

function StarsDisplay({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: `'FILL' ${count >= star ? 1 : 0}`, color: count >= star ? '#F26522' : '#CBD5E1' }}>
          star
        </span>
      ))}
    </div>
  )
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  INTERNSHIP_ACTIVE: 'bg-blue-50 text-blue-700 border-blue-200',
  OFFER_SENT: 'bg-purple-50 text-[#4B1881] border-purple-200',
}

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'Completed',
  INTERNSHIP_ACTIVE: 'Active Internship',
  OFFER_SENT: 'Offer Received',
}

export default function InternshipHistoryPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [error, setError] = useState('')
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!token) { navigate('/login?role=student'); return }
    setLoading(true)
    fetch('http://localhost:8000/api/students/internship-history', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        if (res.status === 401 || res.status === 403) { localStorage.clear(); navigate('/login?role=student'); return }
        if (!res.ok) throw new Error('Failed to load history')
        return res.json()
      })
      .then(data => setHistory(data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [token, navigate])

  const completedCount = history.filter(h => h.status === 'COMPLETED').length
  const activeCount = history.filter(h => h.status === 'INTERNSHIP_ACTIVE').length
  const avgStarsAll = history.filter(h => h.avg_stars > 0)
  const overallAvgStars = avgStarsAll.length > 0 ? (avgStarsAll.reduce((s, h) => s + h.avg_stars, 0) / avgStarsAll.length).toFixed(1) : '0.0'

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col font-sans">
      <Navbar role="student" activeTab="History" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button onClick={() => navigate('/dashboard/student')} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Dashboard
            </button>
            <h1 className="font-headline text-3xl font-black text-slate-900 mb-1">Internship History</h1>
            <p className="text-xs text-slate-500">Your journey through internships — completed, active, and upcoming.</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="material-symbols-outlined text-[#4B1881] text-2xl mb-1">history</span>
            <div className="text-2xl font-black text-slate-900">{history.length}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Total Internships</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="material-symbols-outlined text-emerald-600 text-2xl mb-1">check_circle</span>
            <div className="text-2xl font-black text-emerald-700">{completedCount}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Completed</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="material-symbols-outlined text-blue-600 text-2xl mb-1">work</span>
            <div className="text-2xl font-black text-blue-700">{activeCount}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Active</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm text-center">
            <span className="material-symbols-outlined text-[#F26522] text-2xl mb-1">star</span>
            <div className="text-2xl font-black text-[#F26522]">{overallAvgStars}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Avg Rating</div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-700 font-bold">{error}</div>
        )}

        {loading ? (
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">work_off</span>
            <p className="text-sm font-bold text-slate-500">No internship history yet.</p>
            <p className="text-xs text-slate-400 mt-1">Start applying for internships to build your history.</p>
            <button onClick={() => navigate('/dashboard/student')} className="btn-primary text-xs py-2.5 px-5 mt-4">
              <span className="material-symbols-outlined text-sm">search</span> Explore Internships
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map(entry => (
              <div key={entry.application_id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${STATUS_COLORS[entry.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        {STATUS_LABELS[entry.status] || entry.status}
                      </span>
                      {entry.ppo_status && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-[#F26522] border border-orange-200">
                          PPO: {entry.ppo_role || entry.ppo_status}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-slate-900">{entry.title}</h3>
                    <p className="text-sm font-bold text-[#4B1881]">{entry.company_name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      {entry.location && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-xs">location_on</span>{entry.location}</span>}
                      {entry.duration && <span>Duration: {entry.duration}</span>}
                      {entry.stipend && <span>Stipend: {entry.stipend}</span>}
                    </div>
                  </div>

                  <div className="flex md:flex-col items-center md:items-end gap-4 md:gap-2">
                    {entry.avg_stars > 0 && (
                      <div className="flex items-center gap-2">
                        <StarsDisplay count={Math.round(entry.avg_stars)} />
                        <span className="text-xs font-bold text-slate-700">{entry.avg_stars}/5</span>
                      </div>
                    )}
                    <div className="text-xs text-slate-500 space-y-0.5 text-right">
                      {entry.applied_at && <div>Applied: {entry.applied_at}</div>}
                      {entry.completion_date && <div>Completed: {entry.completion_date}</div>}
                    </div>
                  </div>
                </div>

                {(entry.total_tasks > 0 || entry.certificate_path || entry.offer_letter_path) && (
                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3 flex-wrap">
                    {entry.total_tasks > 0 && (
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                        Tasks: {entry.completed_tasks}/{entry.total_tasks}
                      </span>
                    )}
                    {entry.certificate_path && (
                      <a href={`http://localhost:8000/${entry.certificate_path.replace(/^\.\//, '')}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">verified</span> Certificate
                      </a>
                    )}
                    {entry.offer_letter_path && (
                      <a href={`http://localhost:8000/${entry.offer_letter_path.replace(/^\.\//, '')}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[#4B1881] bg-purple-50 px-3 py-1 rounded-full border border-purple-200 hover:bg-purple-100 transition-colors flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">contract</span> Offer Letter
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}
