import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import CompanyTabBar from '../components/CompanyTabBar'

interface Institute {
  id: string
  name: string
  location: string
}

export default function PostInternshipPage() {
  const navigate = useNavigate()
  const [institutes, setInstitutes] = useState<Institute[]>([])
  const [selectedInstituteIds, setSelectedInstituteIds] = useState<string[]>([])
  const [showInstituteDropdown, setShowInstituteDropdown] = useState(false)
  const [rejection, setRejection] = useState<{ reason: string; reviewer?: string } | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    department: 'Engineering',
    locationType: 'Hybrid',
    location: 'Pune, Maharashtra',
    duration: '6',
    stipend: '15000',
    skills: 'React, Node.js, TypeScript, REST APIs',
    description: '',
    vacancies: '1',
    deadline: ''
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    fetch('http://localhost:8000/api/auth/institutes')
      .then(r => r.json())
      .then(data => setInstitutes(data))
      .catch(() => {})
    fetch('http://localhost:8000/api/companies/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(profile => {
        if (profile.verification_status === 'REJECTED') {
          setRejection({ reason: profile.rejection_reason || 'Your company registration was rejected during verification.', reviewer: profile.reviewed_by })
        }
      })
      .catch(() => {})
  }, [])

  const toggleInstitute = (id: string) => {
    setSelectedInstituteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('http://localhost:8000/api/companies/internships', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          requirements: formData.description,
          location: `${formData.locationType} - ${formData.location}`,
          stipend: `₹${formData.stipend}/month`,
          duration: `${formData.duration} Months`,
          required_skills: formData.skills.split(',').map(s => s.trim()),
          eligible_institute_ids: selectedInstituteIds,
          vacancies: parseInt(formData.vacancies) || 1,
          deadline: formData.deadline || null
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Failed to post internship.' }))
        setError(err?.detail || 'Failed to post internship.')
        return
      }
      setSuccess(true)
      setTimeout(() => navigate('/manage-internships'), 1500)
    } catch {
      setError('Network error. Make sure the backend server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar role="company" activeTab="Post Internship" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        <CompanyTabBar />

        {/* Header */}
        <div>
          <button onClick={() => navigate(-1)} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-3">
            <span className="material-symbols-outlined text-sm">arrow_back</span> Back
          </button>
          <h1 className="text-2xl font-black text-slate-900 mb-1">Post a New Internship</h1>
          <p className="text-sm text-slate-500">Fill out the details to attract top talent from colleges.</p>
        </div>

        {/* Rejected: block posting entirely */}
        {rejection && (
          <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-red-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-600 text-3xl">block</span>
            </div>
            <h2 className="text-lg font-black text-slate-900">Posting Disabled — Company Not Approved</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Your company registration was <span className="font-bold text-red-600">rejected</span> during verification
              {rejection.reviewer ? ` by ${rejection.reviewer}` : ''}. You cannot post internships until your account is approved.
            </p>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 max-w-md mx-auto text-left">
              <p className="text-[10px] font-black uppercase tracking-wider text-red-700 mb-1">Rejection Reason</p>
              <p className="text-xs text-red-800 leading-relaxed">{rejection.reason}</p>
            </div>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary text-xs py-2.5 px-5 justify-center">
              Back to Dashboard
            </button>
          </div>
        )}

        {/* 2-Column Grid */}
        {!rejection && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Left Form */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Basic Information</h2>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Internship Title *</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Software Engineering Intern" className="input-field text-sm" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Department *</label>
                  <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="input-field text-sm cursor-pointer">
                    <option value="Engineering">Engineering / Computer Science</option>
                    <option value="Data & Analytics">Data & Analytics</option>
                    <option value="Design">Product & UI/UX Design</option>
                    <option value="Marketing">Marketing & Growth</option>
                    <option value="Operations">Finance & Operations</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Location Type *</label>
                  <select value={formData.locationType} onChange={e => setFormData({ ...formData, locationType: e.target.value })} className="input-field text-sm cursor-pointer">
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Details & Requirements</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Duration (Months) *</label>
                  <input type="number" min="1" max="12" required value={formData.duration} onChange={e => setFormData({ ...formData, duration: e.target.value })} className="input-field text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Stipend (Monthly ₹) *</label>
                  <input type="text" required value={formData.stipend} onChange={e => setFormData({ ...formData, stipend: e.target.value })} className="input-field text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Number of Vacancies *</label>
                  <input type="number" min="1" max="100" required value={formData.vacancies} onChange={e => setFormData({ ...formData, vacancies: e.target.value })} className="input-field text-sm" placeholder="e.g. 5" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Date to Apply</label>
                  <input type="date" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} className="input-field text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Required Skills (Comma separated) *</label>
                <input type="text" required value={formData.skills} onChange={e => setFormData({ ...formData, skills: e.target.value })} className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Detailed Description *</label>
                <textarea rows={5} required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Describe responsibilities, learning outcomes, and expectations..." className="input-field text-sm" />
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-sm font-bold text-slate-900 pb-2 border-b border-slate-100">Target Colleges</h2>
              <p className="text-xs text-slate-500">Leave empty to make it public for all colleges.</p>
              <div className="relative">
                <button type="button" onClick={() => setShowInstituteDropdown(!showInstituteDropdown)} className="input-field text-sm w-full text-left flex items-center justify-between cursor-pointer">
                  <span className={selectedInstituteIds.length === 0 ? 'text-slate-400' : 'text-slate-900'}>
                    {selectedInstituteIds.length === 0 ? 'All Colleges (Public)' : `${selectedInstituteIds.length} college(s) selected`}
                  </span>
                  <span className="material-symbols-outlined text-slate-400 text-lg">{showInstituteDropdown ? 'expand_less' : 'expand_more'}</span>
                </button>
                {showInstituteDropdown && (
                  <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
                    {institutes.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-slate-400">No colleges registered yet</div>
                    ) : (
                      institutes.map(inst => (
                        <label key={inst.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-50 last:border-0">
                          <input type="checkbox" checked={selectedInstituteIds.includes(inst.id)} onChange={() => toggleInstitute(inst.id)} className="w-4 h-4 rounded border-slate-300 text-[#4B1881] focus:ring-[#4B1881]" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 truncate">{inst.name}</p>
                            <p className="text-[10px] text-slate-400">{inst.location}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>
              {selectedInstituteIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedInstituteIds.map(id => {
                    const inst = institutes.find(i => i.id === id)
                    return inst ? (
                      <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-[#4B1881] text-[11px] font-bold rounded-lg border border-purple-200">
                        {inst.name}
                        <button type="button" onClick={() => toggleInstitute(id)} className="text-purple-400 hover:text-purple-700 ml-0.5">×</button>
                      </span>
                    ) : null
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <h3 className="font-bold text-sm text-slate-900">Ready to post?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">Review your details before publishing.</p>
              <button
                type="button"
                onClick={() => alert("Preview:\n" + JSON.stringify(formData, null, 2))}
                className="btn-secondary w-full justify-center text-xs py-3 border-orange-200 text-[#F26522] hover:bg-orange-50"
              >
                <span className="material-symbols-outlined text-sm">visibility</span> Preview
              </button>
              <button type="submit" disabled={loading} className="btn-primary w-full justify-center text-xs py-3.5">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">rocket_launch</span> Publish Internship
                  </>
                )}
              </button>
              {error && <div className="p-2.5 bg-red-50 text-red-700 text-xs font-semibold rounded-lg text-center">{error}</div>}
              {success && <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg text-center">Internship Published!</div>}
            </div>

            <div className="rounded-2xl p-5 bg-purple-50 border border-purple-200 space-y-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4B1881] text-base">lightbulb</span>
                <h4 className="font-bold text-sm text-purple-950">Pro Tips</h4>
              </div>
              <ul className="space-y-2 text-xs text-purple-800/90 leading-relaxed list-disc list-inside">
                <li>Be specific in required skills to attract qualified candidates.</li>
                <li>Highlight mentorship and learning outcomes.</li>
                <li>Transparent stipend ranges increase applications by 3x.</li>
              </ul>
            </div>
          </div>
        </form>
        )}
      </main>

      <Footer />
    </div>
  )
}
