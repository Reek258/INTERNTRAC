import { useState, useEffect } from 'react'
import type { AttendanceLog } from './helpers'
import { Avatar, EmptyState, statusBadge, statusLabel, TableRowSkeleton, getApiHeaders, API_BASE } from './helpers'

export default function AttendanceTab() {
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchLogs = () => {
    setLoading(true)
    fetch(`${API_BASE}/api/institutes/attendance-logs`, { headers: getApiHeaders() })
      .then(r => r.json())
      .then(data => setLogs(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchLogs() }, [])

  const handleApprove = async (logId: string, status: string) => {
    setActionLoading(logId + status)
    try {
      const res = await fetch(`${API_BASE}/api/institutes/attendance/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({ log_id: logId, status })
      })
      if (res.ok) fetchLogs()
    } catch (err) { console.error(err) }
    finally { setActionLoading(null) }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="font-headline font-bold text-sm text-slate-900">Attendance & Progress Logs</h2>
          <p className="text-xs text-slate-500">Track daily logged hours and deliverables.</p>
        </div>
        <div className="flex gap-3 text-xs">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-purple-50 text-[#4B1881] border border-purple-200">
            {logs.filter(l => l.status === 'PENDING').length} Pending
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {logs.filter(l => l.status === 'APPROVED').length} Approved
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-6 space-y-3"><TableRowSkeleton cols={4} /><TableRowSkeleton cols={4} /></div>
      ) : logs.length === 0 ? (
        <EmptyState icon="fact_check" message="No attendance logs submitted yet." />
      ) : (
        <div className="divide-y divide-slate-100">
          {logs.map(l => (
            <div key={l.id} className="transition-colors hover:bg-slate-50/60 p-5 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar name={l.student_name} color="bg-purple-100 text-[#4B1881]" />
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
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-700 block mb-1">Task Summary:</span>
                    <p className="text-slate-600 leading-relaxed italic">"{l.task_details}"</p>
                  </div>
                  {l.status === 'PENDING' && (
                    <div className="flex gap-2 justify-end pt-2 border-t border-slate-200">
                      <button
                        disabled={!!actionLoading}
                        onClick={() => handleApprove(l.id, 'REJECTED')}
                        className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        disabled={!!actionLoading}
                        onClick={() => handleApprove(l.id, 'APPROVED')}
                        className="btn-primary text-xs py-1.5 px-4 rounded-xl shadow-orange disabled:opacity-50"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
