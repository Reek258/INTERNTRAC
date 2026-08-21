import { useNavigate, useLocation } from 'react-router-dom'

const COMPANY_TABS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/dashboard/company' },
  { key: 'post', label: 'Post Internship', icon: 'add_circle', href: '/post-internship' },
  { key: 'manage', label: 'Manage', icon: 'work', href: '/manage-internships' },
  { key: 'ats', label: 'ATS Pipeline', icon: 'fact_check', href: '/ats' },
  { key: 'tasks', label: 'Tasks', icon: 'task_alt', href: '/tasks' },
  { key: 'profile', label: 'Profile', icon: 'domain', href: '/company-portal' },
] as const

export default function CompanyTabBar() {
  const navigate = useNavigate()
  const location = useLocation()

  const getCurrentKey = () => {
    const path = location.pathname
    if (path === '/dashboard/company') return 'dashboard'
    if (path === '/post-internship') return 'post'
    if (path === '/manage-internships') return 'manage'
    if (path === '/ats') return 'ats'
    if (path === '/tasks') return 'tasks'
    if (path === '/company-portal') return 'profile'
    return 'dashboard'
  }

  const activeKey = getCurrentKey()

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1.5 overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {COMPANY_TABS.map(tab => {
          const isActive = activeKey === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => navigate(tab.href)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-[#F26522] text-white shadow-sm'
                  : 'text-slate-600 hover:text-[#F26522] hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
