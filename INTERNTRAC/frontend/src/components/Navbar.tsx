import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'

interface NavbarProps {
  activeTab?: string
  role?: 'student' | 'company' | 'institute' | 'landing'
}

export default function Navbar({ activeTab, role }: NavbarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const [profilePicture, setProfilePicture] = useState<string | null>(null)

  const isLoggedIn = !!localStorage.getItem('token')

  useEffect(() => {
    setUserName(localStorage.getItem('user_name') || '')
    setUserRole(localStorage.getItem('role') || '')

    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    if (token && role) {
      const profileUrl = role === 'student' ? '/api/students/profile'
        : role === 'company' ? '/api/companies/profile'
          : role === 'institute' ? '/api/institutes/profile'
            : null
      if (profileUrl) {
        fetch(`http://localhost:8000${profileUrl}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => {
            if (data?.profile_picture) setProfilePicture(data.profile_picture)
          })
          .catch(() => { })
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    navigate('/')
  }

  const pathname = location.pathname

  let panelMode: 'STUDENT' | 'COMPANY' | 'INSTITUTE' | 'LANDING' = 'LANDING'

  if (role) {
    if (role === 'student') panelMode = 'STUDENT'
    else if (role === 'company') panelMode = 'COMPANY'
    else if (role === 'institute') panelMode = 'INSTITUTE'
    else panelMode = 'LANDING'
  } else if (
    pathname.startsWith('/dashboard/student') ||
    pathname === '/student-profile' ||
    pathname === '/my-applications' ||
    pathname === '/student-tasks' ||
    pathname === '/mentor' ||
    pathname === '/internship-history'
  ) {
    panelMode = 'STUDENT'
  } else if (
    pathname.startsWith('/dashboard/company') ||
    pathname === '/post-internship' ||
    pathname === '/manage-internships' ||
    pathname === '/ats' ||
    pathname === '/company-portal' ||
    pathname === '/tasks'
  ) {
    panelMode = 'COMPANY'
  } else if (pathname.startsWith('/dashboard/institute')) {
    panelMode = 'INSTITUTE'
  } else {
    panelMode = 'LANDING'
  }

  interface NavItem {
    label: string
    href: string
    icon?: string
  }

  const STUDENT_NAV: NavItem[] = [
    { label: 'Explore', href: '/dashboard/student', icon: 'search' },
    { label: 'Tasks', href: '/student-tasks', icon: 'task_alt' },
    { label: 'Applications', href: '/my-applications', icon: 'description' },
    { label: 'History', href: '/internship-history', icon: 'history' },
    { label: 'Mentor', href: '/mentor', icon: 'psychology' },
    { label: 'Profile', href: '/student-profile', icon: 'account_circle' },
  ]

  const COMPANY_NAV: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard/company', icon: 'dashboard' },
    { label: 'Tasks', href: '/tasks', icon: 'task_alt' },
    { label: 'Home', href: '/company-portal', icon: 'domain' },
  ]

  const INSTITUTE_NAV: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard/institute', icon: 'dashboard' },
    { label: 'Home', href: '/dashboard/institute', icon: 'account_balance' },
  ]

  const LANDING_NAV: NavItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Students', href: isLoggedIn && userRole === 'student' ? '/dashboard/student' : '/login/student' },
    { label: 'Institutes', href: isLoggedIn && userRole === 'institute' ? '/dashboard/institute' : '/login/institute' },
    { label: 'Companies', href: isLoggedIn && userRole === 'company' ? '/dashboard/company' : '/login/company' },
  ]

  let currentNav = LANDING_NAV
  let portalBadge = ''
  let portalBadgeColor = ''
  let logoHref = '/'

  if (panelMode === 'STUDENT') {
    currentNav = STUDENT_NAV
    portalBadge = 'Student Portal'
    portalBadgeColor = 'bg-purple-100 text-[#4B1881] border border-purple-200'
    logoHref = '/dashboard/student'
  } else if (panelMode === 'COMPANY') {
    currentNav = COMPANY_NAV
    portalBadge = 'Recruiter Portal'
    portalBadgeColor = 'bg-orange-100 text-[#F26522] border border-orange-200'
    logoHref = '/dashboard/company'
  } else if (panelMode === 'INSTITUTE') {
    currentNav = INSTITUTE_NAV
    portalBadge = 'TPO Admin Portal'
    portalBadgeColor = 'bg-[#321153] text-white border border-purple-900'
    logoHref = '/dashboard/institute'
  }

  const dashboardPath =
    userRole === 'student' ? '/dashboard/student'
      : userRole === 'company' ? '/dashboard/company'
        : userRole === 'institute' ? '/dashboard/institute'
          : '/dashboard/student'

  const userDisplayName = userName || (panelMode === 'STUDENT' ? 'Student' : panelMode === 'COMPANY' ? 'Recruiter' : 'TPO Admin')
  const userInitials = userDisplayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="sticky top-0 z-50 transition-all duration-300">

      {panelMode === 'LANDING' && (
        <div className="bg-[#321153]/90 backdrop-blur-xl text-purple-100 py-1.5 px-4 sm:px-6 lg:px-8 border-b border-purple-900/30 text-[11px] font-medium hidden md:block shadow-sm shadow-purple-900/10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="bg-[#F26522] text-white px-2 py-0.5 rounded font-bold text-[10px] tracking-wide uppercase shadow-sm">NAAC A++</span>
              <span className="text-purple-200">Autonomous Institution</span>
              <span className="text-purple-400">-</span>
              <span className="text-purple-200">NIRF Ranked</span>
              <span className="text-purple-400">-</span>
              <span className="text-purple-200">NBA Accredited</span>
            </div>
            <div className="flex items-center gap-4 text-purple-200">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-[#F26522]">call</span>
                +91 712 6617100
              </span>
              <span>-</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-xs text-[#F26522]">mail</span>
                info.ghrce@raisoni.net
              </span>
            </div>
          </div>
        </div>
      )}

      <nav className="glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16 sm:h-20">

          <div className="flex items-center gap-3">
            <Link to={logoHref} className="flex items-center gap-3 group">
              <img
                src="/interntrac-logo.png"
                alt="INTERNTRAC Logo"
                className="w-14 h-14 rounded-xl shadow-lg shadow-purple-900/20 group-hover:scale-105 transition-transform duration-300 object-contain"
              />
              <div className="flex flex-col">
                <span className="font-headline text-xl font-black text-[#4B1881] tracking-tight leading-none">
                  INTERN<span className="text-[#F26522]">TRAC</span>
                </span>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                  {panelMode === 'LANDING' ? 'Smart Internship Portal' : 'GHRCE Autonomous Campus'}
                </span>
              </div>
            </Link>

            {portalBadge && (
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold glass-pill ${portalBadgeColor}`}>
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                {portalBadge}
              </div>
            )}
          </div>

          <div className="hidden md:flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl glass-pill">
            {currentNav.map(({ label, href, icon }) => {
              const hrefPath = href.split('?')[0]
              const isActive = (pathname === hrefPath || (hrefPath !== '/' && pathname.startsWith(hrefPath))) && activeTab?.toLowerCase() === label.toLowerCase()

              return (
                <Link
                  key={label}
                  to={href}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${isActive ? 'glass-pill-active text-white' : 'text-slate-600 hover:text-[#4B1881] hover:bg-white/50'
                    }`}
                >
                  {icon && <span className="material-symbols-outlined text-base">{icon}</span>}
                  {label}
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            {panelMode !== 'LANDING' && isLoggedIn ? (
              <div className="flex items-center gap-3">
                <Link
                  to={panelMode === 'STUDENT' ? '/student-profile' : panelMode === 'COMPANY' ? '/company-portal' : '/dashboard/institute'}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full glass-pill hover:bg-white/80 transition-all duration-200 text-left group cursor-pointer"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4B1881] to-[#321153] text-white flex items-center justify-center text-xs font-black shadow-sm group-hover:from-[#F26522] group-hover:to-[#D64E07] transition-all duration-300 overflow-hidden">
                    {profilePicture ? (
                      <img
                        src={`http://localhost:8000/${profilePicture.replace(/^\.\//, '')}`}
                        alt={userDisplayName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      userInitials
                    )}
                  </div>
                  <div className="flex flex-col pr-1">
                    <span className="text-xs font-bold text-slate-800 leading-tight max-w-[120px] truncate">{userDisplayName}</span>
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">{panelMode}</span>
                  </div>
                </Link>
                <button onClick={handleLogout} className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-red-600 hover:bg-red-50/80 transition-all duration-200 px-3 py-2 rounded-xl glass-pill" title="Sign out">
                  <span className="material-symbols-outlined text-base">logout</span>
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            ) : panelMode === 'LANDING' && isLoggedIn ? (
              <div className="flex items-center gap-2">
                <Link to={dashboardPath} className="btn-primary text-xs py-2 px-4 rounded-xl shadow-orange hover:shadow-lg transition-all duration-200 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">dashboard</span>
                  Dashboard
                </Link>
                <button onClick={handleLogout} className="text-xs font-bold text-slate-600 hover:text-red-600 transition-all duration-200 px-3 py-2 rounded-xl glass-pill hover:bg-red-50/60">Logout</button>
              </div>
            ) : (
              <>
                <Link to="/login/student" className="text-xs font-bold text-slate-700 hover:text-[#4B1881] transition-all duration-200 px-3.5 py-2 rounded-xl glass-pill hover:bg-white/80">Login</Link>
                <Link to="/register" className="btn-primary text-xs py-2 px-5 rounded-xl shadow-orange hover:shadow-lg transition-all duration-200">Sign up</Link>
              </>
            )}

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-xl text-slate-600 hover:text-[#4B1881] glass-pill focus:outline-none transition-all duration-200">
              <span className="material-symbols-outlined text-2xl">{mobileMenuOpen ? 'close' : 'menu'}</span>
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden glass-mobile-menu px-4 pt-3 pb-6 space-y-3">
            {portalBadge && (
              <div className="flex items-center justify-between pb-2 border-b border-white/40">
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold glass-pill ${portalBadgeColor}`}>{portalBadge}</span>
                {isLoggedIn && <span className="text-xs text-slate-600 font-medium">Hi, {userDisplayName}</span>}
              </div>
            )}
            <div className="flex flex-col space-y-1">
              {currentNav.map(({ label, href, icon }) => {
                const hrefPath = href.split('?')[0]
                const isActive = pathname === hrefPath
                return (
                  <Link key={label} to={href} onClick={() => setMobileMenuOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${isActive ? 'glass-pill-active text-white' : 'text-slate-700 glass-pill hover:bg-white/70'}`}>
                    {icon && <span className="material-symbols-outlined text-lg">{icon}</span>}
                    {label}
                  </Link>
                )
              })}
            </div>
            {isLoggedIn && (
              <div className="pt-2 border-t border-white/40">
                <button onClick={() => { setMobileMenuOpen(false); handleLogout() }} className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-red-600 bg-red-50/80 hover:bg-red-100/80 rounded-xl transition-all duration-200 glass-pill">
                  <span className="material-symbols-outlined text-base">logout</span> Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </header>
  )
}
