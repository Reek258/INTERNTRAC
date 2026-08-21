import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import CompanyTabBar from '../components/CompanyTabBar'
import { TableRowSkeleton } from '../components/Skeleton'

interface DashboardStats {
  active_postings: number
  total_applicants: number
  interviews_scheduled: number
  hires_made: number
  ppos_offered: number
  ppos_accepted: number
  recent_internships: {
    id: string
    title: string
    status: string
    location: string
    applicants: number
    created_at: string | null
  }[]
}

interface CompanyProfile {
  name: string
  industry: string
  profile_picture: string | null
  verification_status: string
  rejection_reason?: string | null
}

export default function CompanyDashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const fetchProfile = () => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch('http://localhost:8000/api/companies/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setProfile(data) })
      .catch(() => {})
  }

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) { setError('Only JPG, PNG, WebP and GIF images are supported.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('File size exceeds the 5MB limit.'); return }

    const token = localStorage.getItem('token')
    if (!token) return
    setUploadingLogo(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('http://localhost:8000/api/companies/profile/picture', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to upload logo.')
      fetchProfile()
    } catch (err: any) {
      setError(err.message || 'Error uploading logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }

    const headers = { Authorization: `Bearer ${token}` }

    Promise.all([
      fetch('http://localhost:8000/api/companies/profile', { headers }),
      fetch('http://localhost:8000/api/companies/dashboard', { headers })
    ])
      .then(async ([profRes, dashRes]) => {
        if (profRes.status === 401 || profRes.status === 403) { navigate('/login'); return }
        const profData = await profRes.json()
        const dashData = dashRes.ok ? await dashRes.json() : null
        setProfile(profData)
        if (dashData) setStats(dashData)
      })
      .catch(() => setError('Failed to load dashboard.'))
      .finally(() => setLoading(false))
  }, [navigate])

  const statCards = [
    { label: 'ACTIVE POSTINGS', value: stats?.active_postings ?? 0, icon: 'work_outline', accent: 'text-[#F26522]' },
    { label: 'TOTAL APPLICANTS', value: stats?.total_applicants ?? 0, icon: 'groups', accent: 'text-[#4B1881]' },
    { label: 'INTERVIEWS', value: stats?.interviews_scheduled ?? 0, icon: 'calendar_month', accent: 'text-[#F26522]' },
    { label: 'HIRES MADE', value: stats?.hires_made ?? 0, icon: 'handshake', accent: 'text-emerald-600' },
  ]

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col font-sans">
      <Navbar role="company" activeTab="Dashboard" />

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">

        {/* Tab Bar */}
        <CompanyTabBar />

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
        )}

        {/* Welcome Banner + Quick Action */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-5">

          <div className="col-span-1 md:col-span-8 bg-white rounded-2xl p-7 flex flex-col justify-between border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute -right-16 -top-16 w-48 h-48 bg-purple-100 opacity-40 rounded-full blur-3xl pointer-events-none" />
            <div className="z-10 relative flex items-start gap-5">
              <label className="relative group cursor-pointer shrink-0">
                {profile?.profile_picture ? (
                  <img
                    src={`http://localhost:8000/${profile.profile_picture.replace(/^\.\//, '')}`}
                    alt={profile?.name || 'Company'}
                    className="w-16 h-16 rounded-xl object-cover shadow-md border border-slate-200"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#4B1881] to-[#321153] flex items-center justify-center text-white text-xl font-black shadow-md">
                    {profile?.name?.charAt(0)?.toUpperCase() || 'C'}
                  </div>
                )}
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,.gif"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
                <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-[10px] font-bold">{uploadingLogo ? '...' : 'Upload Logo'}</span>
                </div>
              </label>
              <div>
                <h1 className="font-headline text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                  Welcome back, <span className="text-[#4B1881]">{loading ? '...' : (profile?.name || 'Company')}</span>
                </h1>
                <p className="text-sm text-slate-500 max-w-xl leading-relaxed">
                  {stats?.total_applicants
                    ? `You have ${stats.total_applicants} candidate(s) across your internship postings.`
                    : 'Post your first internship to start attracting talent.'
                  }
                </p>
              </div>
            </div>
            <div className="mt-5 flex items-center gap-4 z-10 relative">
              {profile?.verification_status && (
                <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold ${
                  profile.verification_status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700'
                  : profile.verification_status === 'REJECTED' ? 'bg-red-50 text-red-700'
                  : 'bg-amber-50 text-amber-700'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {profile.verification_status === 'APPROVED' ? 'Verified Company' : `Status: ${profile.verification_status}`}
                </span>
              )}
            </div>
            {profile?.verification_status === 'REJECTED' && (
              <div className="mt-4 z-10 relative bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-red-600 text-lg mt-0.5">gpp_bad</span>
                <div>
                  <p className="text-xs font-black text-red-700 uppercase tracking-wide mb-0.5">Registration Rejected — Internship posting is disabled</p>
                  <p className="text-xs text-red-800/90 leading-relaxed">{profile.rejection_reason || 'Your company registration was rejected during verification.'}</p>
                </div>
              </div>
            )}
          </div>

          <div
            onClick={() => navigate('/post-internship')}
            className="col-span-1 md:col-span-4 bg-[#F26522] rounded-2xl p-7 flex flex-col items-center justify-center text-center shadow-sm group cursor-pointer transition-transform hover:-translate-y-1"
          >
            <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-sm">
              <span className="material-symbols-outlined text-3xl text-[#F26522]" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
            </div>
            <h2 className="font-headline text-lg font-bold text-white mb-1">Post New Internship</h2>
            <p className="text-xs text-white/80 leading-relaxed max-w-xs">Reach thousands of students across partner institutes.</p>
          </div>
        </section>

        {/* Stats Section */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <span className="material-symbols-outlined text-[#4B1881] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>analytics</span>
            <h2 className="font-headline text-xl font-bold text-slate-900">Recruitment Overview</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map(card => (
              <div key={card.label} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
                    <span className={`material-symbols-outlined ${card.accent} text-xl`}>{card.icon}</span>
                  </div>
                  <div className="font-headline text-3xl font-bold text-slate-900">
                    {loading ? <div className="h-8 w-12 bg-slate-100 rounded animate-pulse" /> : card.value}
                  </div>
                </div>
                <div className="mt-3 flex items-center text-xs text-slate-400">
                  <span className="material-symbols-outlined text-sm mr-1">schedule</span>
                  Live data
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Active Internships Table */}
        <section>
          <div className="flex justify-between items-center mb-5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F26522] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>list_alt</span>
              <h2 className="font-headline text-xl font-bold text-slate-900">Active Internships</h2>
            </div>
            <button onClick={() => navigate('/manage-internships')} className="text-xs font-bold text-[#4B1881] hover:underline flex items-center gap-1 transition-colors">
              View All
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 text-[11px] uppercase tracking-wider font-semibold">
                    <th className="py-4 px-6">Role & Location</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Applicants</th>
                    <th className="py-4 px-6">Posted</th>
                    <th className="py-4 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {loading ? (
                    <><TableRowSkeleton cols={5} /><TableRowSkeleton cols={5} /><TableRowSkeleton cols={5} /></>
                  ) : stats?.recent_internships && stats.recent_internships.length > 0 ? (
                    stats.recent_internships.map(job => (
                      <tr key={job.id} onClick={() => navigate('/ats')} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                        <td className="py-5 px-6">
                          <div className="font-bold text-slate-900 group-hover:text-[#4B1881] transition-colors">{job.title}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <span className="material-symbols-outlined text-xs">location_on</span>
                            {job.location}
                          </div>
                        </td>
                        <td className="py-5 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                            job.status === 'ACTIVE' ? 'bg-orange-50 text-orange-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${job.status === 'ACTIVE' ? 'bg-orange-500' : 'bg-slate-400'}`} />
                            {job.status}
                          </span>
                        </td>
                        <td className="py-5 px-6 font-bold text-slate-900">{job.applicants}</td>
                        <td className="py-5 px-6 text-slate-500 text-xs">{job.created_at || '-'}</td>
                        <td className="py-5 px-6 text-right">
                          <span className="material-symbols-outlined text-lg text-slate-400 group-hover:text-[#4B1881] transition-colors">chevron_right</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                        <span className="material-symbols-outlined text-3xl block mb-2 opacity-40">work_off</span>
                        No internships posted yet.{' '}
                        <button onClick={() => navigate('/post-internship')} className="text-[#4B1881] font-bold hover:underline">
                          Post your first internship
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ATS Quick Access */}
        <section
          className="rounded-2xl p-5 border border-slate-200 bg-white shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 cursor-pointer hover:border-[#4B1881]/30 transition-colors"
          onClick={() => navigate('/ats')}
        >
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-purple-50 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[#4B1881] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>manage_accounts</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-slate-900">ATS Pipeline</h3>
              <p className="text-xs text-slate-500">Review applicants, schedule interviews & manage your hiring funnel.</p>
            </div>
          </div>
          <button className="btn-secondary text-xs py-2.5 shrink-0">
            Open ATS
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </section>
      </main>

      <Footer />
    </div>
  )
}
