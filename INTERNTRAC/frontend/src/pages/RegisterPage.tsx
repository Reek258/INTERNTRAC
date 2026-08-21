import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom'

const ROLES: Record<RoleId, { id: string; label: string; icon: string; bgColor: string; subtitle: string; emailPlaceholder: string }> = {
  student: { id: 'student', label: 'Student', icon: 'school', bgColor: 'bg-gradient-to-br from-[#4B1881] to-[#321153]', subtitle: 'Register to explore internships and track your applications', emailPlaceholder: 'student@raisoni.edu' },
  institute: { id: 'institute', label: 'Institute', icon: 'account_balance', bgColor: 'bg-gradient-to-br from-[#4B1881] to-[#321153]', subtitle: 'Manage students, placements, and institute-level internships', emailPlaceholder: 'placement@raisoni.net' },
  company: { id: 'company', label: 'Company', icon: 'apartment', bgColor: 'bg-gradient-to-br from-[#F26522] to-[#D4500A]', subtitle: 'Post internships, find top talent, and manage hiring', emailPlaceholder: 'hr@company.com' },
}
type RoleId = 'student' | 'institute' | 'company'

const ENDPOINTS: Record<RoleId, string> = {
  student: 'http://localhost:8000/api/auth/register/student',
  institute: 'http://localhost:8000/api/auth/register/institute',
  company: 'http://localhost:8000/api/auth/register/company',
}

const INSTITUTE_ROLES = [
  { id: 'TPO', label: 'TPO (Training & Placement Officer)', icon: 'work', desc: 'Manage placements, verify students, coordinate with companies' },
  { id: 'HOD_ADMIN', label: 'HOD / Administrator', icon: 'admin_panel_settings', desc: 'Department head with full institute management access' },
  { id: 'FACULTY_MENTOR', label: 'Faculty Mentor', icon: 'school', desc: 'Guide and mentor students through their internship journey' },
]

interface InstituteOption {
  id: string
  name: string
  location: string
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { panel } = useParams<{ panel?: string }>()
  const [role] = useState<RoleId>(
    (panel as RoleId) || (searchParams.get('role') as RoleId) || 'student'
  )
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [institutes, setInstitutes] = useState<InstituteOption[]>([])
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirmPwd, setShowConfirmPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    // Fetch institute list for dropdown
    fetch('http://localhost:8000/api/auth/institutes')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setInstitutes(data)
      })
      .catch(() => {})
  }, [])

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }))
    setError('')
  }

  const validateForm = (): boolean => {
    // 1. Email check
    const email = (formData.email || '').trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.')
      return false
    }

    // 2. Student specific validation
    if (role === 'student') {
      const mobile = (formData.mobile || '').replace(/\D/g, '')
      if (formData.mobile && mobile.length !== 10) {
        setError('Please enter a valid 10-digit mobile number.')
        return false
      }
    }

    // 3. Password checks
    const pwd = formData.password || ''
    const confirmPwd = formData.confirm_password || ''
    if (pwd.length < 6) {
      setError('Password must be at least 6 characters long.')
      return false
    }
    if (pwd !== confirmPwd) {
      setError('Passwords do not match.')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    setError('')
    try {
      const payload: Record<string, any> = { ...formData }
      if (payload.mobile) {
        payload.mobile = payload.mobile.replace(/\D/g, '')
      }

      const res = await fetch(ENDPOINTS[role], {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Registration failed')
      setSuccess(true)
      setTimeout(() => navigate(`/login/${role}`), 2000)
    } catch (err: any) {
      setError(err.message || 'Network error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
        <div className="text-center card max-w-sm w-full mx-4 p-8 shadow-card">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
            <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <h2 className="font-headline text-2xl font-bold text-[#0F172A] mb-1">Account Created! 🎉</h2>
          <p className="text-xs text-slate-500">Redirecting to sign in...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      
      {/* Top INTERNTRAC bar */}
      <div className="bg-[#321153] py-1.5 px-6 text-purple-200 text-xs hidden sm:block">
        <div className="max-w-lg mx-auto flex justify-between items-center text-[11px]">
          <span>INTERNTRAC — Smart Internship Portal</span>
          <span className="text-[#F26522] font-bold">NAAC A++ Autonomous</span>
        </div>
      </div>

      {/* Header - Glassmorphic */}
      <header className="glass-header h-16 flex items-center px-6 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2.5 max-w-lg mx-auto w-full">
          <img
            src="/interntrac-logo.png"
            alt="INTERNTRAC Logo"
            className="w-10 h-10 rounded-lg shadow-lg shadow-purple-900/20 object-contain"
          />
          <span className="font-headline font-bold text-base text-[#4B1881]">
            INTERN<span className="text-[#F26522]">TRAC</span>
          </span>
        </Link>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          
          <div className="text-center mb-6">
            <div className={`w-16 h-16 ${ROLES[role].bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
              <span className="material-symbols-outlined text-3xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>{ROLES[role].icon}</span>
            </div>
            <h1 className="font-headline text-3xl font-bold text-[#0F172A] mb-1">Create {ROLES[role].label} Account</h1>
            <p className="text-xs text-slate-500">{ROLES[role].subtitle}</p>
          </div>

          <div className="card shadow-card">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* STUDENT FIELDS */}
              {role === 'student' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={e => handleInputChange('name', e.target.value)}
                      placeholder="e.g. Arjun Sharma"
                      required
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">College Email ID</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => handleInputChange('email', e.target.value)}
                      placeholder={ROLES[role].emailPlaceholder}
                      required
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Mobile Number (10 digits)</label>
                    <input
                      type="tel"
                      maxLength={10}
                      value={formData.mobile || ''}
                      onChange={e => handleInputChange('mobile', e.target.value.replace(/\D/g, ''))}
                      placeholder="9876543210"
                      className="input-field text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] mb-1">Degree</label>
                      <select
                        value={formData.degree || 'B.Tech'}
                        onChange={e => handleInputChange('degree', e.target.value)}
                        className="input-field text-xs bg-white"
                      >
                        <option value="B.Tech">B.Tech</option>
                        <option value="M.Tech">M.Tech</option>
                        <option value="BCA">BCA</option>
                        <option value="MCA">MCA</option>
                        <option value="B.Sc">B.Sc Computer Science</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] mb-1">Branch / Department</label>
                      <select
                        value={formData.branch || ''}
                        onChange={e => handleInputChange('branch', e.target.value)}
                        className="input-field text-xs bg-white"
                      >
                        <option value="">Select Branch</option>
                        <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
                        <option value="Electrical Engineering">Electrical Engineering</option>
                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                        <option value="Mechatronics Engineering">Mechatronics Engineering</option>
                        <option value="Civil Engineering">Civil Engineering</option>
                        <option value="Chemical Engineering">Chemical Engineering</option>
                        <option value="AI & Data Science">AI & Data Science</option>
                        <option value="Cyber Security">Cyber Security</option>
                        <option value="Biotechnology">Biotechnology</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Affiliated College / Institute</label>
                    <select
                      value={formData.institute_id || ''}
                      onChange={e => handleInputChange('institute_id', e.target.value)}
                      className="input-field text-xs bg-white"
                    >
                      <option value="">Select College / Institute (Optional)</option>
                      {institutes.map(inst => (
                        <option key={inst.id} value={inst.id}>{inst.name} ({inst.location})</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* INSTITUTE FIELDS */}
              {role === 'institute' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Your Role at Institute *</label>
                    <div className="space-y-2">
                      {INSTITUTE_ROLES.map(r => (
                        <label key={r.id} className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${(formData.institute_role || 'TPO') === r.id ? 'border-[#4B1881] bg-purple-50 ring-1 ring-[#4B1881]/20' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
                          <input type="radio" name="institute_role" value={r.id} checked={(formData.institute_role || 'TPO') === r.id} onChange={e => handleInputChange('institute_role', e.target.value)} className="mt-0.5 w-4 h-4 text-[#4B1881] border-slate-300 focus:ring-[#4B1881]" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-sm text-[#4B1881]">{r.icon}</span>
                              <span className="text-xs font-bold text-slate-900">{r.label}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5">{r.desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Institute Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={e => handleInputChange('name', e.target.value)}
                      placeholder="G.H. Raisoni College of Engineering"
                      required
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Admin / Placement Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => handleInputChange('email', e.target.value)}
                      placeholder={ROLES[role].emailPlaceholder}
                      required
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Campus Location</label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={e => handleInputChange('location', e.target.value)}
                      placeholder="Nagpur, Maharashtra"
                      required
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Institutional Domain</label>
                    <input
                      type="text"
                      value={formData.domain || ''}
                      onChange={e => handleInputChange('domain', e.target.value)}
                      placeholder="ghrce.raisoni.net"
                      required
                      className="input-field text-xs"
                    />
                  </div>
                </>
              )}

              {/* COMPANY FIELDS */}
              {role === 'company' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Company Name</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={e => handleInputChange('name', e.target.value)}
                      placeholder="e.g. TechNova Solutions Pvt Ltd"
                      required
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Recruiter / HR Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={e => handleInputChange('email', e.target.value)}
                      placeholder={ROLES[role].emailPlaceholder}
                      required
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Industry Domain</label>
                    <input
                      type="text"
                      value={formData.industry || ''}
                      onChange={e => handleInputChange('industry', e.target.value)}
                      placeholder="Software / AI / Fintech / Embedded"
                      required
                      className="input-field text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#0F172A] mb-1">Official Website</label>
                    <input
                      type="text"
                      value={formData.website || ''}
                      onChange={e => handleInputChange('website', e.target.value)}
                      placeholder="https://technova.com"
                      required
                      className="input-field text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] mb-1">
                        CIN <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.cin || ''}
                        onChange={e => handleInputChange('cin', e.target.value)}
                        placeholder="U72900MH2021PTC361234"
                        className="input-field text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#0F172A] mb-1">
                        GSTIN <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.gstin || ''}
                        onChange={e => handleInputChange('gstin', e.target.value)}
                        placeholder="27AABCA1234F1Z5"
                        className="input-field text-xs"
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-[#C2410C] bg-[#FFF7ED] border border-[#FFEDD5] rounded-lg p-3 leading-relaxed">
                    ⚠️ Note: Corporate registration details will be verified by the GHRCE AI Verification engine.
                  </div>
                </>
              )}

              {/* COMMON PASSWORD FIELDS */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={formData.password || ''}
                    onChange={e => handleInputChange('password', e.target.value)}
                    placeholder="Create a secure password (min 6 chars)"
                    required
                    className="input-field text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={formData.confirm_password || ''}
                    onChange={e => handleInputChange('confirm_password', e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    className="input-field text-xs pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {showConfirmPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 text-xs mt-2"
              >
                {loading ? 'Creating Account...' : `Register as ${ROLES[role].label}`}
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200 text-center">
              <p className="text-xs text-slate-500">
                Already registered?{' '}
                <Link to={`/login/${role}`} className="text-[#4B1881] font-bold hover:underline">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
