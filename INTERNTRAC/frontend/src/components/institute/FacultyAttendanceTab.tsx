import { useState, useEffect } from 'react'
import type { AttendanceLog } from './helpers'
import { Avatar, EmptyState, statusBadge, statusLabel, TableRowSkeleton, getApiHeaders, API_BASE } from './helpers'

export default function FacultyAttendanceTab() {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/institutes/my-students/attendance`, { headers: getApiHeaders() })
      .then(r => r.json())
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const pendingLogs = logs.filter(l => l.status === 'PENDING')
  const approvedLogs = logs.filter(l => l.status === 'APPROVED')

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="font-headline font-bold text-sm text-slate-900">Student Attendance Logs</h2>
          <p className="text-xs text-slate-500">View daily logs from your mentored students.</p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
            {pendingLogs.length} Pending
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {approvedLogs.length} Approved
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-6 space-y-3"><TableRowSkeleton cols={4} /><TableRowSkeleton cols={4} /></div>
      ) : logs.length === 0 ? (
        <EmptyState icon="fact_check" message="No attendance logs from your mentored students yet." />
      ) : (
        <div className="divide-y divide-slate-100">
          {logs.map(l => (
            <div key={l.id} className="transition-colors hover:bg-slate-50/60 p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={l.student_name} color="bg-emerald-100 text-emerald-700" />
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{l.student_name}</h4>
                    <p className="text-[11px] text-slate-500">{l.student_branch} - {l.date} - <strong>{l.hours} Hours</strong></p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${statusBadge[l.status] || 'bg-slate-100 text-slate-600'}`}>
                    {statusLabel[l.status] || l.status}
                  </span>
                  <button
                    onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <span className="material-symbols-outlined text-base">
                      {expandedId === l.id ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                </div>
              </div>

              {expandedId === l.id && (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-700 block mb-1">Task Details:</span>
                  <p className="text-slate-600 leading-relaxed italic">"{l.task_details}"</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
