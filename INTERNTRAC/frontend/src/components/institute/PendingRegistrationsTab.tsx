import { useState, useEffect } from 'react'
import type { PendingStudent } from './helpers'
import { Avatar, EmptyState, TableRowSkeleton, getApiHeaders, API_BASE } from './helpers'

export default function PendingRegistrationsTab({ onAction }: { onAction?: () => void }) {
  const [students, setStudents] = useState<PendingStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchPending = () => {
    setLoading(true)
    fetch(`${API_BASE}/api/institutes/pending-students`, { headers: getApiHeaders() })
      .then(r => r.json())
      .then(data => setStudents(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPending() }, [])

  const handleAction = async (studentId: string, status: string) => {
    setActionLoading(studentId + status)
    try {
      const res = await fetch(`${API_BASE}/api/institutes/students/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({ student_id: studentId, status })
      })
      if (res.ok) { fetchPending(); onAction?.() }
    } catch (err) { console.error(err) }
    finally { setActionLoading(null) }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="font-headline font-bold text-sm text-slate-900">Pending Student Registrations</h2>
          <p className="text-xs text-slate-500">Review and approve student registration requests.</p>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-[#4B1881] border border-purple-200">
          {students.length} Pending
        </span>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          <TableRowSkeleton cols={5} />
          <TableRowSkeleton cols={5} />
        </div>
      ) : students.length === 0 ? (
        <EmptyState icon="how_to_reg" message="No pending student registrations at this time." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                <th className="py-3 px-5">Student</th>
                <th className="py-3 px-5">Branch & CGPA</th>
                <th className="py-3 px-5">Degree & Semester</th>
                <th className="py-3 px-5">Registered</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} color="bg-amber-100 text-amber-700" profilePicture={s.profile_picture} />
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{s.name}</p>
                        <p className="text-[11px] text-slate-400">{s.email}</p>
                        {s.mobile && <p className="text-[11px] text-slate-400">{s.mobile}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5">
                    <p className="font-bold text-slate-800">{s.branch}</p>
                    <p className="text-[11px] text-slate-500">CGPA: <strong>{s.cgpa || 'N/A'}</strong></p>
                  </td>
                  <td className="py-3.5 px-5">
                    <p className="font-bold text-slate-800">{s.degree}</p>
                    <p className="text-[11px] text-slate-500">{s.semester}</p>
                  </td>
                  <td className="py-3.5 px-5">
                    <span className="text-[11px] text-slate-500">{s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}</span>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        disabled={!!actionLoading}
                        onClick={() => handleAction(s.id, 'REJECTED')}
                        className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        {actionLoading === s.id + 'REJECTED' ? '...' : 'Reject'}
                      </button>
                      <button
                        disabled={!!actionLoading}
                        onClick={() => handleAction(s.id, 'APPROVED')}
                        className="btn-primary text-xs py-1.5 px-3 rounded-xl shadow-orange disabled:opacity-50"
                      >
                        {actionLoading === s.id + 'APPROVED' ? 'Approving...' : 'Approve'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
