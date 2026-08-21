import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import CompanyTabBar from '../components/CompanyTabBar'

interface Internship {
  id: string
  title: string
  status: string
  location: string
  stipend: string
  duration: string
  applicants: number
  created_at: string | null
  description: string
  requirements: string
  required_skills: string[]
  deadline: string | null
  eligible_institute_names: string[]
}

export default function ManageInternshipsPage() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<'all' | 'active' | 'closed'>('all')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [postings, setPostings] = useState<Internship[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchInternships = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/companies/internships', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401 || res.status === 403) { navigate('/login'); return }
      if (!res.ok) throw new Error('Failed to load internships')
      const data: Internship[] = await res.json()
      setPostings(data)
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }, [navigate, selectedId])

  useEffect(() => { fetchInternships() }, [fetchInternships])

  const filteredPostings = postings.filter(p => {
    if (filter === 'active' && p.status !== 'ACTIVE') return false
    if (filter === 'closed' && p.status !== 'CLOSED') return false
    if (search && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.location.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const selectedPosting = postings.find(p => p.id === selectedId) || null

  const handleCloseInternship = async (id: string) => {
    if (!confirm('Are you sure you want to close this internship posting?')) return
    const token = localStorage.getItem('token')
    setActionLoading(true)
    try {
      const res = await fetch(`http://localhost:8000/api/companies/internships/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { showToast('Internship closed successfully'); fetchInternships() }
      else { showToast('Failed to close internship', 'error') }
    } finally { setActionLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar role="company" activeTab="Manage" />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          <span className="material-symbols-outlined text-base">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <CompanyTabBar />

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-1">Manage Postings</h1>
            <p className="text-sm text-slate-500">View, edit, and track applicants for your listings.</p>
          </div>
          <button onClick={() => navigate('/post-internship')} className="btn-primary text-xs py-3 px-5">
            <span className="material-symbols-outlined text-base">add_circle</span> New Posting
          </button>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>}

        {/* 2-Column Split View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Search + Filters + Listings */}
          <div className="space-y-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search role or location..." className="input-field pl-10 text-xs py-2.5" />
            </div>

            <div className="flex items-center gap-2">
              {(['all', 'active', 'closed'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`text-xs px-4 py-1.5 rounded-full font-bold transition-colors capitalize ${
                  filter === f ? 'bg-[#F26522] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                  {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>

            <div className="space-y-3 pt-1">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-1/2 mb-3" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                ))
              ) : filteredPostings.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">
                  <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">work_off</span>
                  No postings found.
                </div>
              ) : (
                filteredPostings.map(item => {
                  const isSelected = item.id === selectedId
                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`bg-white border rounded-2xl p-5 cursor-pointer transition-all shadow-sm ${
                        isSelected ? 'border-[#F26522] ring-2 ring-[#F26522]/20 bg-orange-50/20' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-bold text-sm text-slate-900 line-clamp-1">{item.title}</h3>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ml-2 shrink-0 ${item.status === 'ACTIVE' ? 'bg-purple-100 text-[#4B1881]' : 'bg-slate-100 text-slate-600'}`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-[#F26522]">location_on</span> {item.location}
                        </span>
                        <span>-</span>
                        <span>{item.duration}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                        <span className="flex items-center gap-1 font-semibold text-slate-700">
                          <span className="material-symbols-outlined text-xs text-[#4B1881]">groups</span> {item.applicants} Applicants
                        </span>
                        <span>{item.created_at ? `Posted ${item.created_at}` : ''}</span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right: Selected Posting Detail */}
          <div className="lg:col-span-2">
            {!selectedPosting ? (
              <div className="bg-white border border-slate-200 rounded-2xl h-64 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 shadow-sm">
                <span className="material-symbols-outlined text-4xl opacity-40">work_outline</span>
                Select a posting to view details
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm">

                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-[#4B1881] border border-purple-200">
                      {selectedPosting.status === 'ACTIVE' ? 'Active' : 'Closed'}
                    </span>
                    {selectedPosting.deadline && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span> Deadline: {selectedPosting.deadline}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">{selectedPosting.title}</h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Location', value: selectedPosting.location },
                    { label: 'Stipend', value: selectedPosting.stipend || 'Not Disclosed' },
                    { label: 'Duration', value: selectedPosting.duration },
                    { label: 'Target', value: selectedPosting.eligible_institute_names?.length > 0 ? selectedPosting.eligible_institute_names.join(', ') : 'All Colleges' },
                  ].map(m => (
                    <div key={m.label} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">{m.label}</span>
                      <p className="text-xs font-bold text-slate-900">{m.value}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#4B1881] text-base">description</span> Description
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">{selectedPosting.description}</p>
                </div>

                {(selectedPosting.required_skills?.length > 0 || selectedPosting.requirements) && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span> Skills
                    </h3>
                    {selectedPosting.required_skills?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedPosting.required_skills.map(s => (
                          <span key={s} className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-[#4B1881] border border-purple-200">{s}</span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600">{selectedPosting.requirements}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center flex-wrap gap-3 pt-5 border-t border-slate-200">
                  <span className="text-xs text-slate-500 flex-1">
                    <strong className="text-slate-900 font-bold">{selectedPosting.applicants}</strong> candidates applied
                  </span>
                  {selectedPosting.status === 'ACTIVE' && (
                    <button onClick={() => handleCloseInternship(selectedPosting.id)} disabled={actionLoading}
                      className="text-xs px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold transition-colors">
                      Close Posting
                    </button>
                  )}
                  <button onClick={() => navigate('/ats')} className="btn-primary text-xs py-2.5">
                    View in ATS
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
