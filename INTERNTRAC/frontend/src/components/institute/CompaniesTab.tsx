import { useState, useEffect } from 'react'
import type { Company } from './helpers'
import { EmptyState, statusBadge, statusLabel, CardSkeleton, getApiHeaders, API_BASE } from './helpers'

export default function CompaniesTab({ onAction }: { onAction?: () => void }) {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [modalType, setModalType] = useState<'REJECT' | 'ADDITIONAL_INFO' | null>(null)
  const [selectedComp, setSelectedComp] = useState<Company | null>(null)
  const [modalNotes, setModalNotes] = useState('')

  const fetchQueue = () => {
    setLoading(true)
    fetch(`${API_BASE}/api/institutes/companies-queue`, { headers: getApiHeaders() })
      .then(r => r.json())
      .then(data => setCompanies(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchQueue() }, [])

  const handleApprove = async (companyId: string) => {
    setActionLoading('approve_' + companyId)
    try {
      const res = await fetch(`${API_BASE}/api/institutes/companies/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({ company_id: companyId, status: 'APPROVED' })
      })
      if (res.ok) { fetchQueue(); onAction?.() }
    } catch (err) { console.error(err) }
    finally { setActionLoading(null) }
  }

  const handleReVerify = async (companyId: string) => {
    setActionLoading('reverify_' + companyId)
    try {
      const res = await fetch(`${API_BASE}/api/institutes/companies/${companyId}/re-verify`, {
        method: 'POST',
        headers: getApiHeaders()
      })
      if (res.ok) { fetchQueue(); onAction?.() }
    } catch (err) { console.error(err) }
    finally { setActionLoading(null) }
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedComp || !modalType) return
    const status = modalType === 'REJECT' ? 'REJECTED' : 'ADDITIONAL_INFO_REQUIRED'
    setActionLoading('modal_action')
    try {
      const res = await fetch(`${API_BASE}/api/institutes/companies/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({
          company_id: selectedComp.id,
          status,
          reason: modalType === 'REJECT' ? modalNotes : undefined,
          additional_info_notes: modalType === 'ADDITIONAL_INFO' ? modalNotes : undefined
        })
      })
      if (res.ok) { setModalType(null); setSelectedComp(null); setModalNotes(''); fetchQueue(); onAction?.() }
    } catch (err) { console.error(err) }
    finally { setActionLoading(null) }
  }

  const filtered = companies.filter(c => {
    if (filter === 'PENDING') return !['APPROVED', 'REJECTED'].includes(c.verification_status)
    if (filter === 'APPROVED') return c.verification_status === 'APPROVED' || c.verification_status === 'AUTO_APPROVED'
    if (filter === 'REJECTED') return c.verification_status === 'REJECTED'
    return true
  })

  return (
    <div className="space-y-5">

      {/* Filter Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-amber-50 border border-amber-200 rounded-2xl gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-amber-600 text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <div>
            <h2 className="font-bold text-sm text-amber-950">Corporate Verification Pipeline</h2>
            <p className="text-xs text-amber-800">CIN, GSTIN, MSME validation + Groq AI risk analysis.</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f ? 'bg-amber-800 text-white shadow-sm' : 'bg-amber-100/70 text-amber-900 hover:bg-amber-200'
              }`}
            >
              {f === 'ALL' ? 'All' : f === 'PENDING' ? 'Pending' : f === 'APPROVED' ? 'Verified' : 'Rejected'}
            </button>
          ))}
        </div>
      </div>

      {/* Company Cards */}
      {loading ? (
        <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="done_all" message="No corporate verification requests match this filter." />
      ) : (
        <div className="space-y-4">
          {filtered.map(c => {
            const hasMismatches = (c.verification_details?.mismatches?.length || 0) > 0 || c.verification_errors.length > 0
            const riskLevel = c.verification_risk_level || 'MEDIUM'

            return (
              <div key={c.id} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">

                {/* Title & Status */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  <div>
                    <h3 className="font-headline font-bold text-base text-slate-900">{c.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {c.industry} - <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">{c.website}</a>
                      {c.contact_email ? ` - ${c.contact_email}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${statusBadge[c.verification_status] || 'bg-slate-100 text-slate-700'}`}>
                      {statusLabel[c.verification_status] || c.verification_status}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${riskLevel === 'LOW' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : riskLevel === 'HIGH' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      Risk: {riskLevel} ({Math.round((c.verification_confidence || 0.8) * 100)}%)
                    </span>
                  </div>
                </div>

                {/* Credentials Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: 'CIN (MCA)', value: c.cin || 'Not provided' },
                    { label: 'GSTIN', value: c.gstin || 'Not provided' },
                    { label: 'MSME Number', value: c.msme_number || 'Not provided' },
                    { label: 'Certificate', value: c.msme_certificate_url ? 'On File' : 'No File' },
                  ].map(item => (
                    <div key={item.label} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">{item.label}</span>
                      <span className="font-bold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* AI Findings */}
                <div className="space-y-2 text-xs">
                  {c.verification_details?.verified_matches && c.verification_details.verified_matches.length > 0 && (
                    <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-900 space-y-1">
                      <span className="font-bold block">Verified Checks:</span>
                      <ul className="list-disc list-inside text-[11px] space-y-0.5">
                        {c.verification_details.verified_matches.map((m, i) => <li key={i}>{m}</li>)}
                      </ul>
                    </div>
                  )}
                  {hasMismatches && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-1">
                      <span className="font-bold block">Discrepancies Detected:</span>
                      <ul className="list-disc list-inside text-[11px] space-y-0.5">
                        {(c.verification_details?.mismatches || c.verification_errors).map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Posted Internships */}
                {c.posted_internships && c.posted_internships.length > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                      <span className="material-symbols-outlined text-sm text-[#F26522]">work</span>
                      Posted Internships ({c.posted_internships.length})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {c.posted_internships.map(internship => (
                        <div key={internship.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center">
                          <div>
                            <span className="font-bold text-slate-900 block truncate max-w-[180px]">{internship.title}</span>
                            <span className="text-[10px] text-slate-500 block">{internship.location || 'Remote'} - {internship.stipend || 'Unpaid'}</span>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {internship.eligible_degree || 'B.Tech'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {c.reviewed_by && (
                  <p className="text-[11px] text-slate-400">
                    Reviewed by: <strong>{c.reviewed_by}</strong> on {c.verified_at}
                  </p>
                )}

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    disabled={actionLoading === 'reverify_' + c.id}
                    onClick={() => handleReVerify(c.id)}
                    className="btn-secondary text-xs py-2 px-3 rounded-xl"
                  >
                    <span className="material-symbols-outlined text-sm text-[#4B1881]">refresh</span>
                    {actionLoading === 'reverify_' + c.id ? 'Analyzing...' : 'Re-Run AI'}
                  </button>
                  <button
                    onClick={() => { setSelectedComp(c); setModalType('ADDITIONAL_INFO'); setModalNotes(''); }}
                    className="btn-secondary text-xs py-2 px-3 rounded-xl text-amber-700 hover:border-amber-300"
                  >
                    Request Info
                  </button>
                  <button
                    onClick={() => { setSelectedComp(c); setModalType('REJECT'); setModalNotes(''); }}
                    className="px-3.5 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-all"
                  >
                    Reject
                  </button>
                  <button
                    disabled={actionLoading === 'approve_' + c.id}
                    onClick={() => handleApprove(c.id)}
                    className="btn-primary text-xs py-2 px-5 rounded-xl shadow-orange"
                  >
                    {actionLoading === 'approve_' + c.id ? 'Approving...' : 'Approve'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Action Modal */}
      {modalType && selectedComp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-sm text-slate-900">
                {modalType === 'REJECT' ? `Reject: ${selectedComp.name}` : `Request Info: ${selectedComp.name}`}
              </h3>
              <button onClick={() => { setModalType(null); setSelectedComp(null); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleModalSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  {modalType === 'REJECT' ? 'Rejection Reason' : 'Corrections Required'} <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4} required value={modalNotes}
                  onChange={e => setModalNotes(e.target.value)}
                  placeholder={modalType === 'REJECT' ? 'State the discrepancies...' : 'Upload valid registration certificate...'}
                  className="input-field text-xs resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setModalType(null); setSelectedComp(null); }} className="btn-secondary flex-1 justify-center py-2.5">
                  Cancel
                </button>
                <button
                  type="submit" disabled={actionLoading === 'modal_action'}
                  className={`btn flex-1 justify-center py-2.5 text-white font-bold rounded-xl ${modalType === 'REJECT' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'}`}
                >
                  {actionLoading === 'modal_action' ? 'Submitting...' : modalType === 'REJECT' ? 'Confirm Rejection' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
