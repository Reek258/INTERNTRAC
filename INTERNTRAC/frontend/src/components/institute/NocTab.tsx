import { useState, useEffect } from 'react'
import type { NocRequest } from './helpers'
import { Avatar, EmptyState, statusBadge, statusLabel, TableRowSkeleton, getApiHeaders, API_BASE } from './helpers'

export default function NocTab() {
  const [nocs, setNocs] = useState<NocRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchNocs = () => {
    setLoading(true)
    fetch(`${API_BASE}/api/institutes/noc-requests`, { headers: getApiHeaders() })
      .then(r => r.json())
      .then(data => setNocs(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchNocs() }, [])

  const handleAction = async (nocId: string, status: string) => {
    setActionLoading(nocId + status)
    try {
      const res = await fetch(`${API_BASE}/api/institutes/noc/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({ noc_id: nocId, status })
      })
      if (res.ok) fetchNocs()
    } catch (err) { console.error(err) }
    finally { setActionLoading(null) }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <div>
          <h2 className="font-headline font-bold text-sm text-slate-900">NOC Requests</h2>
          <p className="text-xs text-slate-500">Academic approvals for student internships.</p>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-[#4B1881] border border-purple-200">
          {nocs.filter(n => n.status === 'PENDING').length} Pending
        </span>
      </div>

      {loading ? (
        <div className="p-6 space-y-3"><TableRowSkeleton cols={5} /><TableRowSkeleton cols={5} /></div>
      ) : nocs.length === 0 ? (
        <EmptyState icon="description" message="No NOC requests at this time." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                <th className="py-3 px-5">Student</th>
                <th className="py-3 px-5">Internship</th>
                <th className="py-3 px-5">Company</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">Document</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {nocs.map(n => (
                <tr key={n.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <Avatar name={n.student_name} color="bg-blue-100 text-blue-700" />
                      <div>
                        <span className="font-bold text-slate-900 block">{n.student_name}</span>
                        <span className="text-[11px] text-slate-500">{n.student_branch} - CGPA: {n.student_cgpa}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 font-bold text-slate-800">{n.internship_title}</td>
                  <td className="py-3.5 px-5 text-[#4B1881] font-semibold">{n.company_name}</td>
                  <td className="py-3.5 px-5">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${statusBadge[n.status] || 'bg-slate-100 text-slate-600'}`}>
                      {statusLabel[n.status] || n.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-5">
                    {n.noc_document_path ? (
                      <a
                        href={`${API_BASE}/${n.noc_document_path.replace('./', '')}`}
                        target="_blank" rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        Download PDF
                      </a>
                    ) : (
                      <span className="text-slate-400 italic">Not Generated</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    {n.status === 'PENDING' ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          disabled={!!actionLoading}
                          onClick={() => handleAction(n.id, 'REJECTED')}
                          className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all disabled:opacity-50"
                        >
                          Reject
                        </button>
                        <button
                          disabled={!!actionLoading}
                          onClick={() => handleAction(n.id, 'APPROVED')}
                          className="btn-primary text-xs py-1.5 px-3 rounded-xl shadow-orange disabled:opacity-50"
                        >
                          {actionLoading === n.id + 'APPROVED' ? 'Generating...' : 'Approve & Issue PDF'}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-semibold text-[11px]">Resolved</span>
                    )}
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
