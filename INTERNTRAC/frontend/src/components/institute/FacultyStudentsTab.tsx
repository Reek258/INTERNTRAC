import { useState, useEffect } from 'react'
import { Avatar, EmptyState, statusBadge, statusLabel, CardSkeleton, getApiHeaders, API_BASE } from './helpers'

interface FacultyStudent {
  id: string; name: string; email: string; degree: string; branch: string; semester: string
  cgpa: number | null; skills: string[]; profile_picture: string | null; mentor_name: string | null; mentor_email: string | null
  internship_title: string | null; internship_company: string | null; internship_status: string
  profile_completion: number; attendance_count: number; feedback_count: number
}

export default function FacultyStudentsTab() {
  const [students, setStudents] = useState<FacultyStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState<FacultyStudent | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/institutes/my-students`, { headers: getApiHeaders() })
      .then(r => r.json())
      .then(data => setStudents(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.branch.toLowerCase().includes(search.toLowerCase()) ||
    (s.internship_company || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-headline font-bold text-sm text-slate-900">My Mentored Students</h2>
          <p className="text-xs text-slate-500">{students.length} student{students.length !== 1 ? 's' : ''} assigned to you</p>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
          <input
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Search students..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {students.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
          <EmptyState icon="school" message="No students are currently assigned to you as a mentor. Ask your TPO/HOD to assign students to you." />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="person_search" message="No students match your search." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div
              key={s.id}
              onClick={() => setSelectedStudent(s)}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer space-y-3"
            >
              <div className="flex items-center gap-3">
                <Avatar name={s.name} color="bg-emerald-100 text-emerald-700" profilePicture={s.profile_picture} />
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xs text-slate-900 truncate">{s.name}</h3>
                  <p className="text-[11px] text-slate-500">{s.branch} - {s.semester}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${statusBadge[s.internship_status] || 'bg-slate-100 text-slate-600'}`}>
                  {statusLabel[s.internship_status] || s.internship_status}
                </span>
              </div>

              {s.internship_title ? (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <p className="font-bold text-slate-800">{s.internship_title}</p>
                  <p className="text-[11px] text-[#4B1881] font-semibold">{s.internship_company}</p>
                </div>
              ) : (
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 italic">No active internship</div>
              )}

              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="font-bold text-blue-700">{s.cgpa || 'N/A'}</p>
                  <p className="text-blue-500 font-semibold">CGPA</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="font-bold text-purple-700">{s.attendance_count}</p>
                  <p className="text-purple-500 font-semibold">Logs</p>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="font-bold text-amber-700">{s.feedback_count}</p>
                  <p className="text-amber-500 font-semibold">Reviews</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {(s.skills || []).slice(0, 3).map(sk => (
                  <span key={sk} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-semibold">{sk}</span>
                ))}
                {(s.skills || []).length > 3 && (
                  <span className="text-[10px] text-slate-400">+{(s.skills || []).length - 3}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <Avatar name={selectedStudent.name} color="bg-emerald-100 text-emerald-700" profilePicture={selectedStudent.profile_picture} />
                <div>
                  <h3 className="font-headline font-bold text-sm text-slate-900">{selectedStudent.name}</h3>
                  <p className="text-[11px] text-slate-500">{selectedStudent.branch} - {selectedStudent.semester}</p>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-600 text-sm">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Degree</span>
                <span className="font-bold text-slate-800">{selectedStudent.degree}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">CGPA</span>
                <span className="font-bold text-purple-700">{selectedStudent.cgpa || 'N/A'}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Attendance Logs</span>
                <span className="font-bold text-blue-700">{selectedStudent.attendance_count}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Feedback Given</span>
                <span className="font-bold text-amber-700">{selectedStudent.feedback_count}</span>
              </div>
            </div>

            {selectedStudent.internship_title && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs space-y-1">
                <span className="text-[10px] font-bold text-purple-600 uppercase block">Current Internship</span>
                <p className="font-bold text-purple-900">{selectedStudent.internship_title}</p>
                <p className="text-[11px] text-purple-700">{selectedStudent.internship_company}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase block">Skills</span>
              <div className="flex flex-wrap gap-1.5">
                {(selectedStudent.skills || []).map(sk => (
                  <span key={sk} className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-semibold">{sk}</span>
                ))}
                {(!selectedStudent.skills || selectedStudent.skills.length === 0) && (
                  <span className="text-slate-400 text-xs italic">No skills listed</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
