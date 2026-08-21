import { useState, useEffect } from 'react'
import type { Student } from './helpers'
import { Avatar, EmptyState, statusBadge, statusLabel, TableRowSkeleton, getApiHeaders, API_BASE } from './helpers'

export default function StudentsTab() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'ALL' | 'PLACED' | 'INTERVIEWING' | 'APPLIED' | 'UNPLACED'>('ALL')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [lifecycleData, setLifecycleData] = useState<any | null>(null)
  const [loadingLifecycle, setLoadingLifecycle] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`${API_BASE}/api/institutes/students`, { headers: getApiHeaders() })
      .then(r => r.json())
      .then(data => setStudents(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleOpenLifecycle = async (studentId: string) => {
    setSelectedStudentId(studentId)
    setLoadingLifecycle(true)
    try {
      const res = await fetch(`${API_BASE}/api/institutes/students/${studentId}/lifecycle`, { headers: getApiHeaders() })
      if (res.ok) setLifecycleData(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoadingLifecycle(false) }
  }

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.internship_company || '').toLowerCase().includes(search.toLowerCase()) ||
      s.branch.toLowerCase().includes(search.toLowerCase()) ||
      s.skills.some(sk => sk.toLowerCase().includes(search.toLowerCase()))

    const isPlaced = ['SELECTED', 'OFFER_SENT', 'INTERNSHIP_ACTIVE', 'COMPLETED'].includes(s.internship_status)
    const isInterviewing = ['SHORTLISTED', 'SHORTLISTED_FOR_INTERVIEW', 'INTERVIEW_SCHEDULED', 'INTERVIEWING'].includes(s.internship_status)

    const matchFilter =
      filter === 'ALL' ||
      (filter === 'PLACED' && isPlaced) ||
      (filter === 'INTERVIEWING' && isInterviewing) ||
      (filter === 'APPLIED' && s.internship_status === 'APPLIED') ||
      (filter === 'UNPLACED' && s.internship_status === 'UNPLACED')

    return matchSearch && matchFilter
  })

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm space-y-4 p-6">

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B1881]"
            placeholder="Search student, branch, company, skills..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'PLACED', 'INTERVIEWING', 'APPLIED', 'UNPLACED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f ? 'bg-[#4B1881] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'PLACED' ? 'Placed' : f === 'INTERVIEWING' ? 'Interviewing' : f === 'APPLIED' ? 'Applied' : 'Unplaced'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
              <th className="py-3 px-5">Student</th>
              <th className="py-3 px-5">Branch & CGPA</th>
              <th className="py-3 px-5">Current Role / Company</th>
              <th className="py-3 px-5">Status</th>
              <th className="py-3 px-5">Mentor</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <>{[...Array(5)].map((_, i) => <TableRowSkeleton key={i} cols={6} />)}</>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6}><EmptyState icon="person_search" message="No student records match the search criteria." /></td></tr>
            ) : (
              filtered.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} profilePicture={s.profile_picture} />
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{s.name}</p>
                        <p className="text-[11px] text-slate-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <p className="font-bold text-slate-800">{s.branch}</p>
                    <p className="text-[11px] text-slate-500">{s.degree} - CGPA: <strong>{s.cgpa || 'N/A'}</strong></p>
                  </td>
                  <td className="py-3.5 px-5">
                    {s.internship_title ? (
                      <div>
                        <p className="font-bold text-slate-800">{s.internship_title}</p>
                        <p className="text-[11px] text-[#4B1881] font-semibold">{s.internship_company}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No Active Application</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${statusBadge[s.internship_status] || 'bg-slate-100 text-slate-600'}`}>
                      {statusLabel[s.internship_status] || s.internship_status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="text-slate-700 font-semibold">{s.mentor_name || 'Not assigned'}</span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <button
                      onClick={() => handleOpenLifecycle(s.id)}
                      className="btn-secondary text-[11px] py-1.5 px-3 rounded-lg hover:border-purple-300"
                    >
                      <span className="material-symbols-outlined text-sm text-[#4B1881]">history_edu</span>
                      Lifecycle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Student Lifecycle Modal */}
      {selectedStudentId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#4B1881] border border-purple-200 uppercase">Official Student Record</span>
                <h3 className="font-headline font-bold text-base text-slate-900 mt-1">
                  {lifecycleData?.student?.name || 'Student Lifecycle'}
                </h3>
              </div>
              <button onClick={() => { setSelectedStudentId(null); setLifecycleData(null); }} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            {loadingLifecycle || !lifecycleData ? (
              <div className="py-12 text-center text-xs text-slate-500">Loading student lifecycle records...</div>
            ) : (
              <div className="space-y-5 text-xs">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Degree & Branch</span>
                    <span className="font-bold text-slate-800">{lifecycleData.student.degree} {lifecycleData.student.branch}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">CGPA</span>
                    <span className="font-bold text-purple-700">{lifecycleData.student.cgpa || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Mentor</span>
                    <span className="font-bold text-slate-800">{lifecycleData.student.mentor_name || 'Not assigned'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block font-bold uppercase">Resume</span>
                    {lifecycleData.student.resume_path ? (
                      <a href={`${API_BASE}/${lifecycleData.student.resume_path.replace('./', '')}`} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">View PDF</a>
                    ) : 'None'}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-headline font-bold text-xs text-slate-900 uppercase tracking-wider text-[#4B1881]">
                    Application Records ({lifecycleData.applications.length})
                  </h4>
                  {lifecycleData.applications.length === 0 ? (
                    <p className="text-slate-400 italic">No applications recorded.</p>
                  ) : (
                    lifecycleData.applications.map((app: any) => (
                      <div key={app.id} className="p-4 bg-white rounded-xl border border-slate-200 space-y-3 shadow-xs">
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-bold text-sm text-slate-900">{app.title}</h5>
                            <p className="text-xs text-[#4B1881] font-bold">{app.company_name} - {app.location}</p>
                          </div>
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${statusBadge[app.status] || 'bg-slate-100 text-slate-600'}`}>
                            {statusLabel[app.status] || app.status}
                          </span>
                        </div>
                        {app.ats_score && (
                          <div className="p-2.5 bg-purple-50 rounded-lg border border-purple-100 flex items-center justify-between text-xs">
                            <span className="text-slate-700">ATS Match Score:</span>
                            <span className="font-black text-[#4B1881]">{app.ats_score}%</span>
                          </div>
                        )}
                        {app.interview_date && (
                          <div className="p-2.5 bg-sky-50 rounded-lg border border-sky-100 text-xs space-y-1">
                            <div className="flex justify-between font-bold text-sky-900">
                              <span>Interview: {app.interview_date} {app.interview_time ? `(${app.interview_time})` : ''}</span>
                              <span>Duration: {app.interview_duration || '45 Mins'}</span>
                            </div>
                            {app.interview_link && (
                              <a href={app.interview_link} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline block">Meeting Link</a>
                            )}
                          </div>
                        )}
                        {app.ppo_status && (
                          <div className="p-2 bg-gradient-to-r from-purple-50 to-orange-50 rounded-lg border border-orange-200 text-xs font-bold text-[#F26522] flex justify-between">
                            <span>PPO: {app.ppo_status}</span>
                            <span className="material-symbols-outlined text-sm">military_tech</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
