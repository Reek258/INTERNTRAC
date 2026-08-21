import { useState, useEffect } from 'react'
import { EmptyState, CardSkeleton, getApiHeaders, API_BASE } from './helpers'

interface ReportSummary {
  total_students: number; placed_students: number; active_interns: number
  completed_internships: number; rejected_applications: number; pending_nocs: number
  placement_rate: number
}
interface MentorReport { mentor: string; total: number; placed: number; active: number; placement_rate: number }
interface BranchReport { branch: string; total: number; placed: number; active: number; placement_rate: number }
interface ReportData {
  summary: ReportSummary; mentor_wise: MentorReport[]; branch_wise: BranchReport[]
}

const DOWNLOADABLE_REPORTS = [
  { type: 'placement_summary', label: 'Placement Summary', desc: 'Overall KPIs with branch-wise and mentor-wise breakdown', icon: 'insights', color: 'bg-purple-50 text-[#4B1881] border-purple-200' },
  { type: 'students', label: 'Students Report', desc: 'All enrolled students with branch, CGPA, mentor and internship status', icon: 'groups', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { type: 'applications', label: 'Applications Report', desc: 'Every application with company, role, ATS score and status', icon: 'description', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { type: 'companies', label: 'Companies Report', desc: 'Partner companies with verification status and reviewer', icon: 'verified_user', color: 'bg-orange-50 text-[#F26522] border-orange-200' },
  { type: 'noc', label: 'NOC Report', desc: 'NOC requests with approval status and document availability', icon: 'task', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { type: 'attendance', label: 'Attendance Report', desc: 'Daily logged hours, task details and approval status', icon: 'fact_check', color: 'bg-teal-50 text-teal-700 border-teal-200' },
]

export default function HODReportsTab() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${API_BASE}/api/institutes/reports`, { headers: getApiHeaders() })
      .then(r => { if (!r.ok) throw new Error('Failed to load reports'); return r.json() })
      .then(d => setData(d))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const downloadCSV = () => {
    if (!data) return
    const rows = [['Branch', 'Total Students', 'Placed', 'Active Interns', 'Placement Rate %']]
    data.branch_wise.forEach(b => rows.push([b.branch, String(b.total), String(b.placed), String(b.active), String(b.placement_rate)]))
    rows.push([])
    rows.push(['Mentor', 'Total Students', 'Placed', 'Active Interns', 'Placement Rate %'])
    data.mentor_wise.forEach(m => rows.push([m.mentor, String(m.total), String(m.placed), String(m.active), String(m.placement_rate)]))
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'institute-report.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const downloadServerReport = async (type: string) => {
    setDownloading(type)
    try {
      const res = await fetch(`${API_BASE}/api/institutes/reports/download?report_type=${type}`, { headers: getApiHeaders() })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Download failed' }))
        throw new Error(err.detail || 'Download failed')
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="(.+)"/)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = match ? match[1] : `${type}_report.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) return <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
  if (error) return <div className="p-8 bg-white border border-red-200 rounded-2xl text-center text-xs text-red-600 font-bold">{error}</div>
  if (!data) return <EmptyState icon="assessment" message="No report data available." />

  return (
    <div className="space-y-6">

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Students', value: data.summary.total_students, icon: 'groups', color: 'bg-purple-50 text-[#4B1881] border-purple-200' },
          { label: 'Placed', value: data.summary.placed_students, icon: 'work', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
          { label: 'Active Interns', value: data.summary.active_interns, icon: 'badge', color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Completed', value: data.summary.completed_internships, icon: 'check_circle', color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'Rejected', value: data.summary.rejected_applications, icon: 'cancel', color: 'bg-red-50 text-red-700 border-red-200' },
          { label: 'Placement Rate', value: `${data.summary.placement_rate}%`, icon: 'trending_up', color: 'bg-amber-50 text-amber-700 border-amber-200' },
        ].map(k => (
          <div key={k.label} className={`p-4 rounded-2xl border ${k.color} flex items-center gap-3 shadow-sm bg-white`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${k.color}`}>
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-500">{k.label}</p>
              <p className="font-headline text-xl font-black text-slate-900">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Download Center */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
          <h3 className="font-headline font-bold text-sm text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#F26522] text-base">download</span>
            Download Reports
          </h3>
          <span className="text-[10px] font-semibold text-slate-400 hidden sm:block">CSV format — opens in Excel</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
          {DOWNLOADABLE_REPORTS.map(r => (
            <button
              key={r.type}
              onClick={() => downloadServerReport(r.type)}
              disabled={downloading !== null}
              className={`text-left p-4 rounded-xl border ${r.color} bg-white hover:shadow-md transition-all disabled:opacity-60 group`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${r.color}`}>
                  <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{r.icon}</span>
                </div>
                <span className="material-symbols-outlined text-sm text-slate-300 group-hover:text-current transition-colors">
                  {downloading === r.type ? 'hourglass_top' : 'download'}
                </span>
              </div>
              <p className="font-headline text-xs font-black text-slate-900">{r.label}</p>
              <p className="text-[10px] text-slate-500 leading-relaxed mt-0.5">{r.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={downloadCSV} className="btn-primary text-xs py-2 px-4 rounded-xl shadow-orange flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm">table_view</span>
          Quick Export (Visible Tables)
        </button>
      </div>

      {/* Branch-wise */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50">
          <h3 className="font-headline font-bold text-sm text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4B1881] text-base">school</span>
            Branch-Wise Placement Report
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                <th className="py-3 px-5">Branch</th>
                <th className="py-3 px-5 text-center">Total</th>
                <th className="py-3 px-5 text-center">Placed</th>
                <th className="py-3 px-5 text-center">Active</th>
                <th className="py-3 px-5 text-right">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.branch_wise.map(b => (
                <tr key={b.branch} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-slate-800">{b.branch}</td>
                  <td className="py-3.5 px-5 text-center font-semibold text-slate-600">{b.total}</td>
                  <td className="py-3.5 px-5 text-center font-bold text-emerald-700">{b.placed}</td>
                  <td className="py-3.5 px-5 text-center font-semibold text-blue-700">{b.active}</td>
                  <td className="py-3.5 px-5 text-right">
                    <span className={`font-bold px-2.5 py-1 rounded-lg ${b.placement_rate >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {b.placement_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mentor-wise */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50">
          <h3 className="font-headline font-bold text-sm text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#F26522] text-base">supervisor_account</span>
            Mentor-Wise Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                <th className="py-3 px-5">Mentor</th>
                <th className="py-3 px-5 text-center">Assigned</th>
                <th className="py-3 px-5 text-center">Placed</th>
                <th className="py-3 px-5 text-center">Active</th>
                <th className="py-3 px-5 text-right">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.mentor_wise.map(m => (
                <tr key={m.mentor} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-5 font-bold text-slate-800">{m.mentor}</td>
                  <td className="py-3.5 px-5 text-center font-semibold text-slate-600">{m.total}</td>
                  <td className="py-3.5 px-5 text-center font-bold text-emerald-700">{m.placed}</td>
                  <td className="py-3.5 px-5 text-center font-semibold text-blue-700">{m.active}</td>
                  <td className="py-3.5 px-5 text-right">
                    <span className={`font-bold px-2.5 py-1 rounded-lg ${m.placement_rate >= 70 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                      {m.placement_rate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
