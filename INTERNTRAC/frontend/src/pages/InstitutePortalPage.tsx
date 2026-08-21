import { useState, useEffect } from 'react'
import type { ChangeEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import type { InstituteRole } from '../components/institute/helpers'
import { ROLE_TABS, ROLE_LABELS, ROLE_COLORS, ROLE_DESCRIPTIONS } from '../components/institute/helpers'
import OverviewTab from '../components/institute/OverviewTab'
import PendingRegistrationsTab from '../components/institute/PendingRegistrationsTab'
import StudentsTab from '../components/institute/StudentsTab'
import CompaniesTab from '../components/institute/CompaniesTab'
import NocTab from '../components/institute/NocTab'
import AttendanceTab from '../components/institute/AttendanceTab'
import MentorTab from '../components/institute/MentorTab'
import FacultyStudentsTab from '../components/institute/FacultyStudentsTab'
import FacultyAttendanceTab from '../components/institute/FacultyAttendanceTab'
import HODReportsTab from '../components/institute/HODReportsTab'

export default function InstitutePortalPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const instituteRole: InstituteRole = (localStorage.getItem('institute_role') as InstituteRole) || 'TPO'
  const tabs = ROLE_TABS[instituteRole] || ROLE_TABS.TPO
  const defaultTab = tabs[0]?.key || 'overview'
  const initialTab = searchParams.get('tab') || defaultTab
  const validTab = tabs.some(t => t.key === initialTab) ? initialTab : defaultTab

  const [activeTab, setActiveTab] = useState(validTab)
  const [pendingCompanies, setPendingCompanies] = useState(0)
  const [pendingStudents, setPendingStudents] = useState(0)
  const [instituteName, setInstituteName] = useState<string>('')
  const [instituteLogo, setInstituteLogo] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl && tabs.some(t => t.key === tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams, tabs])

  const switchTab = (tab: string) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  const fetchPendingCounts = () => {
    const token = localStorage.getItem('token')
    if (!token) return
    if (instituteRole === 'TPO') {
      fetch('http://localhost:8000/api/institutes/analytics', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => setPendingCompanies(data?.pending_companies || 0))
        .catch(() => { })
      fetch('http://localhost:8000/api/institutes/pending-students', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => setPendingStudents(Array.isArray(data) ? data.length : 0))
        .catch(() => { })
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    if (!token || role !== 'INSTITUTE') {
      navigate('/login/institute')
      return
    }
    fetchPendingCounts()
    fetch('http://localhost:8000/api/institutes/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          setInstituteName(data.name || '')
          setInstituteLogo(data.profile_picture || null)
        }
      })
      .catch(() => { })
  }, [navigate])

  const handleLogoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) return
    if (file.size > 5 * 1024 * 1024) return

    const token = localStorage.getItem('token')
    if (!token) return
    setUploadingLogo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('http://localhost:8000/api/institutes/profile/picture', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })
      const data = await res.json()
      if (res.ok && data.profile_picture) setInstituteLogo(data.profile_picture)
    } catch { } finally {
      setUploadingLogo(false)
    }
  }

  const handleDeleteLogo = async () => {
    const token = localStorage.getItem('token')
    if (!token || !instituteLogo) return
    try {
      const res = await fetch('http://localhost:8000/api/institutes/profile/picture', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) setInstituteLogo(null)
    } catch { }
  }

  const roleColors = ROLE_COLORS[instituteRole] || ROLE_COLORS.TPO
  const currentTabDef = tabs.find(t => t.key === activeTab)
  const tabDescription = ROLE_DESCRIPTIONS[activeTab]?.[instituteRole] || ''

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return <OverviewTab />
      case 'pending': return <PendingRegistrationsTab onAction={fetchPendingCounts} />
      case 'students': return <StudentsTab />
      case 'companies': return <CompaniesTab onAction={fetchPendingCounts} />
      case 'noc': return <NocTab />
      case 'attendance': return <AttendanceTab />
      case 'mentor': return <MentorTab />
      case 'reports': return <HODReportsTab />
      case 'my_students': return <FacultyStudentsTab />
      case 'faculty_attendance': return <FacultyAttendanceTab />
      default: return <OverviewTab />
    }
  }

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col font-sans">
      <Navbar role="institute" activeTab={currentTabDef?.label || 'Overview'} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 space-y-5">

        {/* TPO-only Alerts */}
        {instituteRole === 'TPO' && pendingCompanies > 0 && activeTab !== 'companies' && (
          <div
            className="flex items-center justify-between gap-4 px-5 py-3 bg-amber-50 border border-amber-200 rounded-xl shadow-sm cursor-pointer hover:bg-amber-100/80 transition-colors"
            onClick={() => switchTab('companies')}
            role="alert"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
              </span>
              <span className="material-symbols-outlined text-amber-700 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <p className="text-xs font-bold text-amber-900">
                {pendingCompanies} Corporate Registration{pendingCompanies > 1 ? 's' : ''} Awaiting Review
              </p>
            </div>
            <span className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors">Review</span>
          </div>
        )}

        {instituteRole === 'TPO' && pendingStudents > 0 && activeTab !== 'pending' && (
          <div
            className="flex items-center justify-between gap-4 px-5 py-3 bg-purple-50 border border-purple-200 rounded-xl shadow-sm cursor-pointer hover:bg-purple-100/80 transition-colors"
            onClick={() => switchTab('pending')}
            role="alert"
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
              </span>
              <span className="material-symbols-outlined text-purple-700 text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
              <p className="text-xs font-bold text-purple-900">
                {pendingStudents} Student Registration{pendingStudents > 1 ? 's' : ''} Awaiting Approval
              </p>
            </div>
            <span className="shrink-0 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors">Review</span>
          </div>
        )}

        {/* Header */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <label className="relative group cursor-pointer shrink-0">
              {instituteLogo ? (
                <img
                  src={`http://localhost:8000/${instituteLogo.replace(/^\.\//, '')}`}
                  alt={instituteName || 'Institute'}
                  className="w-14 h-14 rounded-xl object-cover shadow-md border border-slate-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#4B1881] to-[#321153] flex items-center justify-center text-white text-lg font-black shadow-md">
                  {instituteName ? instituteName.charAt(0).toUpperCase() : 'I'}
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
                <span className="material-symbols-outlined text-white text-sm">{uploadingLogo ? 'hourglass_top' : 'photo_camera'}</span>
              </div>
              {instituteLogo && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteLogo() }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-md hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                  title="Remove logo"
                >
                  ✕
                </button>
              )}
            </label>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${roleColors.badge}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {ROLE_LABELS[instituteRole]}
                </span>
              </div>
              <h1 className="font-headline text-2xl font-black text-slate-900 leading-tight">
                Institute Administration Panel
              </h1>
              {tabDescription && (
                <p className="text-xs text-slate-500 mt-1">{tabDescription}</p>
              )}
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {tabs.map(tab => {
              const isActive = activeTab === tab.key
              const hasAlert = (tab.key === 'companies' && pendingCompanies > 0) || (tab.key === 'pending' && pendingStudents > 0)
              return (
                <button
                  key={tab.key}
                  onClick={() => switchTab(tab.key)}
                  className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${isActive
                      ? `${roleColors.active} shadow-sm`
                      : 'text-slate-600 hover:text-[#4B1881] hover:bg-slate-50'
                    }`}
                >
                  <span className="material-symbols-outlined text-base">{tab.icon}</span>
                  {tab.label}
                  {hasAlert && !isActive && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#F26522] animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tab Content */}
        <section className="min-h-[400px]">
          {renderTabContent()}
        </section>
      </main>

      <Footer />
    </div>
  )
}
