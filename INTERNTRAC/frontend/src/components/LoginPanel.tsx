import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

interface RoleConfig {
  role: string
  expectedRole: string
  label: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
  description: string
  registerPath: string
  placeholder: string
}

const ROLE_CONFIGS: Record<string, RoleConfig> = {
  student: {
    role: 'student',
    expectedRole: 'STUDENT',
    label: 'Student',
    icon: 'school',
    color: 'text-[#4B1881]',
    bgColor: 'bg-gradient-to-br from-[#4B1881] to-[#321153]',
    borderColor: 'border-[#4B1881]',
    description: 'Access your internship dashboard, applications, and tasks',
    registerPath: '/register/student',
    placeholder: 'student@raisoni.edu',
  },
  company: {
    role: 'company',
    expectedRole: 'COMPANY',
    label: 'Company',
    icon: 'apartment',
    color: 'text-[#F26522]',
    bgColor: 'bg-gradient-to-br from-[#F26522] to-[#D4500A]',
    borderColor: 'border-[#F26522]',
    description: 'Post internships, manage applicants, and assign tasks',
    registerPath: '/register/company',
    placeholder: 'hr@company.com',
  },
  institute: {
    role: 'institute',
    expectedRole: 'INSTITUTE',
    label: 'Institute',
    icon: 'account_balance',
    color: 'text-[#4B1881]',
    bgColor: 'bg-gradient-to-br from-[#4B1881] to-[#321153]',
    borderColor: 'border-[#4B1881]',
    description: 'Manage students, verify registrations, and review NOCs',
    registerPath: '/register/institute',
    placeholder: 'tpo@raisoni.edu',
  },
}

export default function LoginPanel({ panel }: { panel: 'student' | 'company' | 'institute' }) {
  const navigate = useNavigate()
  const config = ROLE_CONFIGS[panel]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const ROLE_REDIRECTS: Record<string, string> = {
    STUDENT: '/dashboard/student',
    COMPANY: '/dashboard/company',
    INSTITUTE: '/dashboard/institute',
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          expected_role: config.expectedRole,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Invalid email or password.')

      localStorage.setItem('token', data.access_token)
      localStorage.setItem('role', data.role)
      localStorage.setItem('user_id', data.user_id)
      localStorage.setItem('profile_id', data.profile_id || '')
      localStorage.setItem('user_name', data.name || '')
      if (data.institute_role) localStorage.setItem('institute_role', data.institute_role)

      navigate(ROLE_REDIRECTS[data.role] || '/')
    } catch (err: any) {
      setError(err.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <div className="bg-[#321153] py-1.5 px-6 text-purple-200 text-xs hidden sm:block">
        <div className="max-w-md mx-auto flex justify-between items-center text-[11px]">
          <span>INTERNTRAC — Smart Internship Portal</span>
          <span className="text-[#F26522] font-bold">NAAC A++ Autonomous</span>
        </div>
      </div>

      <header className="glass-header h-16 flex items-center px-6 sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2.5 max-w-md mx-auto w-full">
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

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className={`w-16 h-16 ${config.bgColor} rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg`}>
              <span className="material-symbols-outlined text-3xl text-white" style={{ fontVariationSettings: "'FILL' 1" }}>{config.icon}</span>
            </div>
            <h1 className="font-headline text-3xl font-bold text-[#0F172A] mb-2">{config.label} Login</h1>
            <p className="text-xs text-slate-500">{config.description}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError('') }}
                  placeholder={config.placeholder}
                  required
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#0F172A] mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError('') }}
                    placeholder="Enter your password"
                    required
                    className="input-field text-xs pr-10"
                  />
                  <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined text-sm">{showPwd ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">error</span>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-xs mt-2">
                {loading ? 'Authenticating...' : `Sign In as ${config.label}`}
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200 text-center space-y-2">
              <p className="text-xs text-slate-500">
                Don't have an account?{' '}
                <Link to={config.registerPath} className="font-bold hover:underline" style={{ color: config.color === 'text-[#F26522]' ? '#F26522' : '#4B1881' }}>
                  Create a {config.label} account
                </Link>
              </p>
              <p className="text-[11px] text-slate-400">
                Not a {config.label}?{' '}
                {panel === 'student' && (
                  <span className="space-x-2">
                    <Link to="/login/company" className="text-[#F26522] font-bold hover:underline">Company Login</Link>
                    <span>•</span>
                    <Link to="/login/institute" className="text-[#4B1881] font-bold hover:underline">Institute Login</Link>
                  </span>
                )}
                {panel === 'company' && (
                  <span className="space-x-2">
                    <Link to="/login/student" className="text-[#4B1881] font-bold hover:underline">Student Login</Link>
                    <span>•</span>
                    <Link to="/login/institute" className="text-[#4B1881] font-bold hover:underline">Institute Login</Link>
                  </span>
                )}
                {panel === 'institute' && (
                  <span className="space-x-2">
                    <Link to="/login/student" className="text-[#4B1881] font-bold hover:underline">Student Login</Link>
                    <span>•</span>
                    <Link to="/login/company" className="text-[#F26522] font-bold hover:underline">Company Login</Link>
                  </span>
                )}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
