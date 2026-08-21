import { Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import LoginPageStudent from './pages/LoginPageStudent'
import LoginPageCompany from './pages/LoginPageCompany'
import LoginPageInstitute from './pages/LoginPageInstitute'
import RegisterPage from './pages/RegisterPage'
import StudentDashboardPage from './pages/StudentDashboardPage'
import StudentProfilePage from './pages/StudentProfilePage'
import MyApplicationsPage from './pages/MyApplicationsPage'
import MentorGuidancePage from './pages/MentorGuidancePage'
import CompanyPortalPage from './pages/CompanyPortalPage'
import CompanyDashboardPage from './pages/CompanyDashboardPage'
import PostInternshipPage from './pages/PostInternshipPage'
import ManageInternshipsPage from './pages/ManageInternshipsPage'
import ATSPage from './pages/ATSPage'
import TaskManagerPage from './pages/TaskManagerPage'
import InstitutePortalPage from './pages/InstitutePortalPage'
import InternshipHistoryPage from './pages/InternshipHistoryPage'
import StudentTasksPage from './pages/StudentTasksPage'

function AuthGuard({ allowedRole, children }: { allowedRole: string; children: React.ReactNode }) {
  const role = localStorage.getItem('role')
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to={`/login/${allowedRole.toLowerCase()}`} replace />
  if (role !== allowedRole) return <Navigate to={`/login/${role?.toLowerCase() || ''}`} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      {/* Public Landing & Auth */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/student" element={<LoginPageStudent />} />
      <Route path="/login/company" element={<LoginPageCompany />} />
      <Route path="/login/institute" element={<LoginPageInstitute />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/:panel" element={<RegisterPage />} />

      {/* Student Panel Routes */}
      <Route path="/dashboard/student" element={<AuthGuard allowedRole="STUDENT"><StudentDashboardPage /></AuthGuard>} />
      <Route path="/student-profile" element={<AuthGuard allowedRole="STUDENT"><StudentProfilePage /></AuthGuard>} />
      <Route path="/my-applications" element={<AuthGuard allowedRole="STUDENT"><MyApplicationsPage /></AuthGuard>} />
      <Route path="/mentor" element={<AuthGuard allowedRole="STUDENT"><MentorGuidancePage /></AuthGuard>} />
      <Route path="/internship-history" element={<AuthGuard allowedRole="STUDENT"><InternshipHistoryPage /></AuthGuard>} />
      <Route path="/student-tasks" element={<AuthGuard allowedRole="STUDENT"><StudentTasksPage /></AuthGuard>} />

      {/* Company Panel Routes */}
      <Route path="/company-portal" element={<AuthGuard allowedRole="COMPANY"><CompanyPortalPage /></AuthGuard>} />
      <Route path="/dashboard/company" element={<AuthGuard allowedRole="COMPANY"><CompanyDashboardPage /></AuthGuard>} />
      <Route path="/post-internship" element={<AuthGuard allowedRole="COMPANY"><PostInternshipPage /></AuthGuard>} />
      <Route path="/manage-internships" element={<AuthGuard allowedRole="COMPANY"><ManageInternshipsPage /></AuthGuard>} />
      <Route path="/ats" element={<AuthGuard allowedRole="COMPANY"><ATSPage /></AuthGuard>} />
      <Route path="/tasks" element={<AuthGuard allowedRole="COMPANY"><TaskManagerPage /></AuthGuard>} />

      {/* Institute Panel Routes */}
      <Route path="/dashboard/institute" element={<AuthGuard allowedRole="INSTITUTE"><InstitutePortalPage /></AuthGuard>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
