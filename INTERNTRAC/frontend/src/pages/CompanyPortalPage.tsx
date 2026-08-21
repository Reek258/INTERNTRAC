import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import CompanyTabBar from '../components/CompanyTabBar'

export default function CompanyPortalPage() {
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState<string>('')
  const [companyLogo, setCompanyLogo] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    fetch('http://localhost:8000/api/companies/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setCompanyName(data.name || '')
          setCompanyLogo(data.profile_picture || null)
        }
      })
      .catch(() => {})
  }, [])

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) { setErrorMsg('Only JPG, PNG, WebP and GIF images are supported.'); return }
    if (file.size > 5 * 1024 * 1024) { setErrorMsg('File size exceeds the 5MB limit.'); return }

    const token = localStorage.getItem('token')
    if (!token) return
    setUploadingLogo(true)
    setErrorMsg('')
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
      setCompanyLogo(data.profile_picture)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error uploading logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleDeleteLogo = async () => {
    const token = localStorage.getItem('token')
    if (!token || !companyLogo) return
    try {
      const res = await fetch('http://localhost:8000/api/companies/profile/picture', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setCompanyLogo(null)
    } catch {}
  }

  const features = [
    {
      title: 'Effortless Posting',
      description: 'Create and publish internship listings in minutes. Specify skills, duration, and stipends to attract the right students.',
      icon: 'add_circle',
      action: () => navigate('/post-internship'),
      actionLabel: 'Post Internship',
      color: 'bg-orange-50 text-[#F26522]',
    },
    {
      title: 'ATS Pipeline',
      description: 'Review resumes, match scores, and verdicts in a unified Kanban view. Auto-shortlist qualified applicants.',
      icon: 'fact_check',
      action: () => navigate('/ats'),
      actionLabel: 'Open ATS',
      color: 'bg-purple-50 text-[#4B1881]',
    },
    {
      title: 'Interview Scheduling',
      description: 'Coordinate interviews with built-in calendar integrations. Send Meet links and feedback in one click.',
      icon: 'calendar_month',
      action: () => navigate('/dashboard/company'),
      actionLabel: 'View Dashboard',
      color: 'bg-blue-50 text-blue-700',
    },
    {
      title: 'Data-Driven Hiring',
      description: 'Analyze applicant skills against requirements. Make informed decisions based on structured academic data.',
      icon: 'analytics',
      action: () => navigate('/dashboard/company'),
      actionLabel: 'Explore Analytics',
      color: 'bg-emerald-50 text-emerald-700',
    },
  ]

  const stats = [
    { value: '5k+', label: 'Active Students' },
    { value: '200+', label: 'Partner Companies' },
    { value: '1.2k', label: 'Internships Filled' },
    { value: '98%', label: 'Satisfaction Rate' },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar role="company" activeTab="Profile" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Tab Bar */}
        <CompanyTabBar />

        {/* Company Logo Upload Card */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-bold">{errorMsg}</div>
        )}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-6">
            <label className="relative group cursor-pointer shrink-0">
              {companyLogo ? (
                <img
                  src={`http://localhost:8000/${companyLogo.replace(/^\.\//, '')}`}
                  alt={companyName || 'Company Logo'}
                  className="w-20 h-20 rounded-2xl object-cover shadow-md border border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4B1881] to-[#321153] flex items-center justify-center text-white text-2xl font-black shadow-md">
                  {companyName ? companyName.charAt(0).toUpperCase() : 'C'}
                </div>
              )}
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="hidden"
              />
              <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <span className="text-white text-[10px] font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">{uploadingLogo ? 'hourglass_top' : 'photo_camera'}</span>
                  {uploadingLogo ? 'Uploading...' : 'Change'}
                </span>
              </div>
              {companyLogo && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteLogo() }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove logo"
                >
                  ✕
                </button>
              )}
            </label>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Company Logo</h3>
              <p className="text-xs text-slate-500 mt-1">Upload your company logo (JPG, PNG, WebP or GIF, max 5MB). This will be displayed on your profile and internship postings.</p>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <h1 className="text-4xl font-black text-slate-900 leading-tight">
                Hire the Next<br />
                Generation of <span className="text-[#F26522]">Top Talent.</span>
              </h1>
              <p className="text-slate-500 text-sm leading-relaxed max-w-lg">
                Connect directly with ambitious students from premier institutions. Streamline your hiring process, post internships, and evaluate candidates with AI.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <button onClick={() => navigate('/post-internship')} className="btn-primary px-6 py-3 text-sm">
                  Post an Internship
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
                <button
                  onClick={() => navigate('/dashboard/company')}
                  className="btn-secondary px-6 py-3 text-sm border-orange-200 text-[#F26522] hover:bg-orange-50"
                >
                  View Dashboard
                </button>
              </div>
            </div>
            <div className="hidden md:grid grid-cols-2 gap-4">
              {stats.map(s => (
                <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
                  <div className="text-3xl font-black text-[#4B1881]">{s.value}</div>
                  <div className="text-xs text-slate-500 font-semibold mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              Manage your Internship Process
            </h2>
            <p className="text-sm text-slate-500 max-w-lg mx-auto">
              Everything you need to find, evaluate, and hire the perfect candidate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {features.map(f => (
              <div key={f.title} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col justify-between">
                <div className="space-y-3">
                  <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-xl">{f.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{f.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.description}</p>
                </div>
                <button
                  onClick={f.action}
                  className="text-xs text-[#F26522] font-bold hover:underline flex items-center gap-1 mt-5"
                >
                  {f.actionLabel}
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
