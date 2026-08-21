import { useState, useEffect } from 'react'
import {
  Brain, CheckCircle2, AlertCircle, Sparkles,
  ArrowRight, X, Briefcase,
  Building2, MapPin, IndianRupee, Clock,
  BarChart3, ShieldCheck, AlertTriangle
} from 'lucide-react'

interface AtsEvaluationModalProps {
  isOpen: boolean
  onClose: () => void
  internship: {
    id?: string
    title: string
    company?: string
    company_name?: string
    location?: string
    stipend?: string
    duration?: string
    work_mode?: string
    department?: string
    required_skills?: string[]
    preferred_skills?: string[]
    requiredSkills?: string[]
    min_cgpa?: number
    eligible_branches?: string[]
    eligible_degree?: string
    description?: string
    requirements?: string
    source?: string
    scraped_from?: string
    link?: string
  }
  onApplySuccess?: () => void
}

interface EligibilityReport {
  ats_score: number
  verdict: 'ELIGIBLE' | 'PARTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE' | string
  verdict_explanation: string
  deterministic_passed: boolean
  deterministic_failures: string[]
  deterministic_passes: string[]
  matched_skills: string[]
  missing_skills: string[]
  strengths: string[]
  improvements: string[]
  score_breakdown?: {
    skill_alignment?: number
    experience_relevance?: number
    education?: number
    communication?: number
    domain_fit?: number
  }
}

export default function AtsEvaluationModal({
  isOpen,
  onClose,
  internship,
  onApplySuccess
}: AtsEvaluationModalProps) {
  const [phase, setPhase] = useState<'idle' | 'checking' | 'applying' | 'report' | 'applied_success' | 'error'>('idle')
  const [report, setReport] = useState<EligibilityReport | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (isOpen) {
      setPhase('idle')
      setReport(null)
      setErrorMsg('')
    }
  }, [isOpen, internship.id, internship.title])

  if (!isOpen) return null

  const companyName = internship.company_name || internship.company || 'Company'
  const token = localStorage.getItem('token')

  const requiredSkillsList = internship.required_skills || internship.requiredSkills || (
    internship.requirements ? internship.requirements.split(',').map(s => s.trim()).filter(Boolean) : []
  )

  const handleCheckEligibility = async () => {
    if (!token) {
      setErrorMsg('You must be logged in to check eligibility.')
      setPhase('error')
      return
    }

    setPhase('checking')
    setErrorMsg('')
    try {
      const res = await fetch('http://localhost:8000/api/students/check-eligibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          internship_id: internship.id || null,
          title: internship.title,
          company_name: companyName,
          description: internship.description || internship.title,
          requirements: internship.requirements || requiredSkillsList.join(', '),
          required_skills: requiredSkillsList,
          preferred_skills: internship.preferred_skills || [],
          min_cgpa: internship.min_cgpa || 0.0,
          eligible_branches: internship.eligible_branches || [],
          eligible_degree: internship.eligible_degree || ''
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.detail || 'Eligibility evaluation failed.')
      }

      setReport(data)
      setPhase('report')
    } catch (err: any) {
      setErrorMsg(err.message || 'Error running eligibility check.')
      setPhase('error')
    }
  }

  const handleApply = async () => {
    if (!token) {
      setErrorMsg('You must be logged in to apply. Please sign in first.')
      setPhase('error')
      return
    }

    setPhase('applying')
    setErrorMsg('')
    try {
      const formData = new FormData()
      if (internship.id) formData.append('job_id', internship.id)
      formData.append('title', internship.title)
      formData.append('company_name', companyName)
      formData.append('description', internship.description || internship.title)
      formData.append('requirements', internship.requirements || requiredSkillsList.join(', '))
      formData.append('stipend', internship.stipend || 'Not Disclosed')
      formData.append('location', internship.location || 'Remote')
      formData.append('source', internship.source || 'INTERNAL')
      formData.append('scraped_from', internship.scraped_from || 'Platform')
      formData.append('link', internship.link || '')

      const res = await fetch('http://localhost:8000/api/students/apply', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || 'Failed to submit application. Please upload your resume first.')
      }

      const verdictObj = data.ai_verdict || {}
      setReport({
        ats_score: data.ats_score ?? verdictObj.ats_score ?? 0,
        verdict: verdictObj.verdict || (data.status === 'SHORTLISTED_FOR_INTERVIEW' ? 'ELIGIBLE' : 'APPLIED'),
        verdict_explanation: verdictObj.verdict_explanation || 'Application submitted and screened by Groq AI.',
        deterministic_passed: verdictObj.deterministic_passed ?? true,
        deterministic_failures: verdictObj.deterministic_failures || [],
        deterministic_passes: verdictObj.deterministic_passes || [],
        matched_skills: verdictObj.matched_skills || [],
        missing_skills: verdictObj.missing_skills || verdictObj.skill_gaps || [],
        strengths: verdictObj.strengths || [],
        improvements: verdictObj.improvements || verdictObj.recommendations || [],
        score_breakdown: verdictObj.score_breakdown
      })

      setPhase('applied_success')
      if (internship.link) {
        window.open(internship.link, '_blank', 'noopener,noreferrer')
      }
      if (onApplySuccess) onApplySuccess()
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error while submitting application.')
      setPhase('error')
    }
  }

  const score = report?.ats_score ?? 0
  const scoreColor =
    score >= 75 ? 'text-emerald-600' :
    score >= 50 ? 'text-amber-600' :
    'text-red-500'
  const scoreBg =
    score >= 75 ? 'bg-emerald-600' :
    score >= 50 ? 'bg-amber-500' :
    'bg-red-500'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden my-6">

        {/* Header */}
        <div className="bg-gradient-to-r from-[#4B1881] to-[#321153] px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Brain size={22} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">AI ATS &amp; Deterministic Eligibility Engine</h2>
              <p className="text-xs text-purple-200">Real-time analysis powered by Groq AI — No fake or hardcoded scores</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 md:p-8">
          <div className="grid md:grid-cols-2 gap-8">

            {/* Left: Job Details & Criteria */}
            <div className="space-y-5 border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-8">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-[#4B1881] mb-2 border border-purple-200">
                  <Building2 size={13} /> {companyName}
                </span>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">
                  {internship.title}
                </h3>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl text-xs text-slate-700 border border-slate-200">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-[#F26522]" />
                  <span>{internship.location || 'Remote'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <IndianRupee size={14} className="text-emerald-600" />
                  <span>{internship.stipend || 'Not Disclosed'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-[#4B1881]" />
                  <span>{internship.duration || '3-6 Months'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Briefcase size={14} className="text-blue-600" />
                  <span>{internship.work_mode || 'Remote'}</span>
                </div>
              </div>

              {/* Criteria */}
              <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200 text-xs text-blue-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck size={14} className="text-blue-700" /> Mandatory Eligibility Criteria
                </div>
                <div className="space-y-1 text-slate-700">
                  {internship.min_cgpa && internship.min_cgpa > 0 ? (
                    <div>• Min CGPA Required: <strong>{internship.min_cgpa.toFixed(1)}</strong></div>
                  ) : null}
                  {internship.eligible_degree ? (
                    <div>• Degree: <strong>{internship.eligible_degree}</strong></div>
                  ) : null}
                </div>
              </div>

              {/* Required Skills */}
              {requiredSkillsList.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                    Required Competencies
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {requiredSkillsList.map(s => (
                      <span key={s} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Job Description */}
              {internship.description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">Role Overview</h4>
                  <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{internship.description}</p>
                </div>
              )}
            </div>

            {/* Right: AI & Eligibility Result Panel */}
            <div className="flex flex-col justify-between">

              {/* IDLE: Prompt to Check or Apply */}
              {phase === 'idle' && (
                <div className="h-full flex flex-col items-center justify-center text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center border border-purple-200">
                    <Sparkles size={30} className="text-[#4B1881]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-lg mb-1">Evaluate Your Profile</h4>
                    <p className="text-xs text-slate-500 max-w-xs">
                      Run an instant AI ATS scan on your active resume and check all deterministic academic requirements before submitting.
                    </p>
                  </div>
                  
                  <div className="w-full space-y-2 pt-2">
                    <button
                      onClick={handleCheckEligibility}
                      className="btn-secondary w-full justify-center text-xs py-3 bg-purple-50 text-[#4B1881] border-purple-200 hover:bg-purple-100"
                    >
                      <Brain size={15} />
                      Check Eligibility Preview
                    </button>
                    <button
                      onClick={handleApply}
                      className="btn-primary w-full justify-center text-xs py-3"
                    >
                      Apply Now &amp; Record ATS Score
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {/* CHECKING / APPLYING: Loading */}
              {(phase === 'checking' || phase === 'applying') && (
                <div className="h-full flex flex-col items-center justify-center text-center py-10">
                  <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center mb-4 relative">
                    <Sparkles size={28} className="text-[#4B1881] animate-spin" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base mb-1">
                    {phase === 'checking' ? 'Evaluating Academic & ATS Compatibility...' : 'Screening Resume & Submitting Application...'}
                  </h4>
                  <p className="text-xs text-slate-500 max-w-xs">
                    Comparing your resume, CGPA, and branch against job criteria using Groq AI.
                  </p>
                </div>
              )}

              {/* ERROR */}
              {phase === 'error' && (
                <div className="h-full flex flex-col items-center justify-center text-center py-8">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4 border border-red-200">
                    <AlertCircle size={28} className="text-red-500" />
                  </div>
                  <h4 className="font-bold text-slate-900 text-base mb-2">Notice</h4>
                  <p className="text-xs text-red-600 max-w-sm bg-red-50 p-3 rounded-xl border border-red-200 mb-4">{errorMsg}</p>
                  <button onClick={() => setPhase('idle')} className="btn-secondary text-xs py-2 px-4">
                    Try Again
                  </button>
                </div>
              )}

              {/* REPORT / APPLIED SUCCESS */}
              {(phase === 'report' || phase === 'applied_success') && report && (
                <div className="space-y-4 overflow-y-auto max-h-[460px] pr-1">

                  {/* Verdict & Score Banner */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl ${scoreBg} text-white flex items-center justify-center font-black text-xl shadow`}>
                        {score}
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ATS Resume Match</div>
                        <div className={`text-xs font-bold ${scoreColor}`}>
                          {report.verdict === 'ELIGIBLE' ? '✓ Eligible & Strongly Matched' :
                           report.verdict === 'PARTIALLY_ELIGIBLE' ? '⚠️ Partially Eligible' :
                           '✕ Criteria Not Met'}
                        </div>
                        <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">{report.verdict_explanation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Deterministic Rules Breakdown */}
                  {report.deterministic_failures.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs space-y-1">
                      <div className="font-bold text-red-800 flex items-center gap-1.5">
                        <AlertTriangle size={13} /> Mandatory Eligibility Gaps
                      </div>
                      <ul className="space-y-0.5 text-red-700 pl-4 list-disc">
                        {report.deterministic_failures.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Score Breakdown Bars */}
                  {report.score_breakdown && Object.keys(report.score_breakdown).length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200">
                      <h4 className="text-xs font-bold text-[#4B1881] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <BarChart3 size={13} /> Sub-Category Score Breakdown
                      </h4>
                      <div className="space-y-1.5">
                        {[
                          { key: 'skill_alignment', label: 'Skill Alignment', max: 40 },
                          { key: 'experience_relevance', label: 'Experience', max: 25 },
                          { key: 'education', label: 'Education', max: 15 },
                          { key: 'communication', label: 'Communication', max: 10 },
                          { key: 'domain_fit', label: 'Domain Fit', max: 10 }
                        ].map(({ key, label, max }) => {
                          const val = (report.score_breakdown as Record<string, number>)[key] ?? 0
                          const pct = Math.round((val / max) * 100)
                          return (
                            <div key={key} className="flex items-center gap-2 text-xs">
                              <span className="w-28 text-slate-600 shrink-0 text-[11px]">{label}</span>
                              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#4B1881]"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="w-10 text-right font-bold text-slate-700 text-[11px]">{val}/{max}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Strengths */}
                  {report.strengths.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-600" /> Resume Strengths
                      </h4>
                      <ul className="space-y-1">
                        {report.strengths.map((pt, i) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-2 bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {report.missing_skills.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <AlertCircle size={13} className="text-amber-600" /> Missing / Recommended Skills
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {report.missing_skills.map((sk, i) => (
                          <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-md text-xs font-semibold">
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <div className="pt-3 border-t border-slate-200 space-y-2">
                    {phase === 'applied_success' ? (
                      <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                        <p className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                          <CheckCircle2 size={16} /> Application Logged Successfully!
                        </p>
                        <p className="text-[11px] text-emerald-700">Track your application status under My Applications.</p>
                        {internship.link && (
                          <a
                            href={internship.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary w-full justify-center text-xs py-2.5 bg-emerald-700 hover:bg-emerald-800 flex items-center gap-1.5 shadow-sm"
                          >
                            Re-Open Official Career Site 🔗
                          </a>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={handleApply}
                          className="btn-primary w-full justify-center text-xs py-3"
                        >
                          {internship.link ? 'Confirm & Apply on Official Site 🔗' : 'Confirm & Apply Now'}
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
