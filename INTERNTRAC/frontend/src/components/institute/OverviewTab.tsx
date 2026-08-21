import { useState, useEffect } from 'react'
import type { Analytics } from './helpers'
import { statusLabel, EmptyState, CardSkeleton, getApiHeaders, API_BASE } from './helpers'

export default function OverviewTab() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch(`${API_BASE}/api/institutes/analytics`, { headers: getApiHeaders() })
      .then(res => {
        if (!res.ok) throw new Error('Failed to load analytics')
        return res.json()
      })
      .then(data => setAnalytics(data))
      .catch(err => setError(err.message || 'Error loading analytics.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="p-8 bg-white border border-red-200 rounded-2xl text-center text-xs text-red-600 font-bold">
        {error || 'Not enough data available for analysis.'}
      </div>
    )
  }

  const rate = analytics.placement_rate
  const circumference = 2 * Math.PI * 40
  const dashOffset = circumference - (rate / 100) * circumference

  const kpis = [
    { label: 'Total Students', value: analytics.total_students, icon: 'groups', color: 'bg-purple-50 text-[#4B1881] border-purple-200' },
    { label: 'Placed', value: analytics.placed_students, icon: 'work', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    { label: 'Active Interns', value: analytics.active_interns, icon: 'badge', color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { label: 'Interviews', value: analytics.interview_scheduled_count, icon: 'videocam', color: 'bg-orange-50 text-[#F26522] border-orange-200' },
    { label: 'Partner Companies', value: analytics.partner_companies, icon: 'domain', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    { label: 'Pending Approvals', value: analytics.pending_companies, icon: 'verified_user', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { label: 'Pending NOCs', value: analytics.pending_noc_requests, icon: 'hourglass_top', color: 'bg-rose-50 text-rose-700 border-rose-200' },
    { label: 'PPOs', value: analytics.ppo_count, icon: 'military_tech', color: 'bg-purple-50 text-[#4B1881] border-purple-200' },
  ]

  return (
    <div className="space-y-6">

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className={`p-5 rounded-2xl border ${k.color} flex items-center gap-4 shadow-sm bg-white`}>
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${k.color}`}>
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{k.icon}</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 mb-0.5">{k.label}</p>
              <p className="font-headline text-2xl font-black text-slate-900">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 3-Column Analytics Highlight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Placement Rate Donut */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-6 shadow-sm">
          <svg width="100" height="100" viewBox="0 0 100 100" className="shrink-0">
            <circle cx="50" cy="50" r="40" fill="none" stroke="#F1F5F9" strokeWidth="12" />
            <circle
              cx="50" cy="50" r="40" fill="none"
              stroke={rate >= 70 ? '#059669' : rate >= 40 ? '#F26522' : '#E11D48'}
              strokeWidth="12"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
            <text x="50" y="55" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#0F172A">
              {rate}%
            </text>
          </svg>
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Placement Rate</h3>
            <p className="text-base font-black text-slate-900">
              {analytics.placed_students} of {analytics.total_students} Placed
            </p>
            <p className={`text-xs font-bold ${rate >= 70 ? 'text-emerald-600' : rate >= 40 ? 'text-amber-600' : 'text-rose-600'}`}>
              {rate >= 70 ? 'Target Exceeded' : rate >= 40 ? 'Active Recruitment' : 'More Placement Drives Needed'}
            </p>
          </div>
        </div>

        {/* PPO Conversion Rate */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">PPO Rate</h3>
            <span className="material-symbols-outlined text-[#F26522]">military_tech</span>
          </div>
          <div className="my-2">
            <span className="text-3xl font-black text-[#4B1881]">{analytics.ppo_rate}%</span>
            <p className="text-xs text-slate-600 mt-1">
              {analytics.ppo_count} student(s) received Pre-Placement Offers.
            </p>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div className="bg-[#4B1881] h-full rounded-full" style={{ width: `${analytics.ppo_rate}%` }} />
          </div>
        </div>

        {/* Pipeline Distribution */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-wider">Pipeline</h3>
          <div className="space-y-2 text-xs">
            {Object.entries(analytics.status_distribution).slice(0, 4).map(([st, cnt]) => (
              <div key={st} className="flex justify-between items-center text-slate-700">
                <span>{statusLabel[st] || st}</span>
                <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">{cnt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Branch-Wise Analysis Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="font-headline font-bold text-sm text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4B1881] text-base">school</span>
            Branch-Wise Analysis
          </h3>
          <span className="text-xs text-slate-500">{analytics.branch_wise_stats.length} Departments</span>
        </div>

        {analytics.branch_wise_stats.length === 0 ? (
          <EmptyState icon="analytics" message="Not enough branch data available." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200">
                  <th className="py-3 px-5">Department</th>
                  <th className="py-3 px-5 text-center">Total</th>
                  <th className="py-3 px-5 text-center">Placed</th>
                  <th className="py-3 px-5 text-center">Active</th>
                  <th className="py-3 px-5 text-center">PPOs</th>
                  <th className="py-3 px-5 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analytics.branch_wise_stats.map((b) => (
                  <tr key={b.branch} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-slate-800">{b.branch}</td>
                    <td className="py-3.5 px-5 text-center font-semibold text-slate-600">{b.total}</td>
                    <td className="py-3.5 px-5 text-center font-bold text-emerald-700">{b.placed}</td>
                    <td className="py-3.5 px-5 text-center font-semibold text-blue-700">{b.active}</td>
                    <td className="py-3.5 px-5 text-center font-semibold text-[#4B1881]">{b.ppo}</td>
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
        )}
      </div>

      {/* Skill Gap Analysis */}
      {analytics.skill_gap_analysis && analytics.skill_gap_analysis.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div>
            <h3 className="font-headline font-bold text-sm text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#F26522] text-base">psychology</span>
              Skill Gap Analysis
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Industry demand vs. student supply from active corporate postings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {analytics.skill_gap_analysis.map(item => (
              <div key={item.skill} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{item.skill}</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${item.severity === 'HIGH' ? 'bg-rose-100 text-rose-800' : item.severity === 'MODERATE' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                    {item.severity}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600">
                  <span>Demand: <strong>{item.demand_percentage}%</strong></span>
                  <span>Supply: <strong>{item.student_percentage}%</strong></span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.severity === 'HIGH' ? 'bg-rose-500' : item.severity === 'MODERATE' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, item.demand_percentage)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
