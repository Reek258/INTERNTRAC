import { useState, useEffect } from 'react'
import type { Student, Feedback } from './helpers'
import { Avatar, EmptyState, StarRating, CardSkeleton, getApiHeaders, API_BASE } from './helpers'

interface FacultyMember {
  id: string
  name: string
  email: string
  department: string
  institute_role: string
}

export default function MentorTab() {
  const [students, setStudents] = useState<Student[]>([])
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [faculty, setFaculty] = useState<FacultyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [mentorSelections, setMentorSelections] = useState<Record<string, string>>({})
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, { text: string; rating: number; mentor: string }>>({})
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [activeStudent, setActiveStudent] = useState<string | null>(null)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetch(`${API_BASE}/api/institutes/students`, { headers: getApiHeaders() }).then(r => r.json()),
      fetch(`${API_BASE}/api/institutes/feedback`, { headers: getApiHeaders() }).then(r => r.json()),
      fetch(`${API_BASE}/api/institutes/faculty`, { headers: getApiHeaders() }).then(r => r.json()),
    ])
      .then(([sr, fr, fcr]) => {
        setStudents(sr)
        setFeedbacks(fr)
        setFaculty(Array.isArray(fcr) ? fcr : [])
        const initFb: Record<string, { text: string; rating: number; mentor: string }> = {}
        sr.forEach((s: Student) => { initFb[s.id] = { text: '', rating: 5, mentor: s.mentor_name || '' } })
        setFeedbackInputs(initFb)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const handleAssignMentor = async (studentId: string) => {
    const facultyId = mentorSelections[studentId]
    if (!facultyId) return
    const member = faculty.find(f => f.id === facultyId)
    if (!member) return
    setSubmitting('mentor_' + studentId)
    try {
      const res = await fetch(`${API_BASE}/api/institutes/mentor/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({
          student_id: studentId,
          mentor_name: member.name,
          mentor_email: member.email || undefined,
          mentor_department: member.department || undefined,
        })
      })
      if (res.ok) {
        setStudents(prev => prev.map(s => s.id === studentId ? {
          ...s,
          mentor_name: member.name,
          mentor_email: member.email,
          mentor_department: member.department,
        } : s))
        setMentorSelections(prev => ({ ...prev, [studentId]: '' }))
      }
    } catch (err) { console.error(err) }
    finally { setSubmitting(null) }
  }

  const handleSubmitFeedback = async (studentId: string) => {
    const fb = feedbackInputs[studentId]
    if (!fb?.text.trim() || !fb?.mentor.trim()) return alert('Please fill in mentor name and feedback text.')
    setSubmitting('fb_' + studentId)
    try {
      const res = await fetch(`${API_BASE}/api/institutes/feedback/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getApiHeaders() },
        body: JSON.stringify({ student_id: studentId, mentor_name: fb.mentor, feedback_text: fb.text, rating: fb.rating })
      })
      if (res.ok) { loadData(); setActiveStudent(null) }
    } catch (err) { console.error(err) }
    finally { setSubmitting(null) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* Student Mentor Assignment */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-bold text-sm text-slate-900">Faculty Mentorship & Feedback</h2>
          {faculty.length > 0 && (
            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {faculty.length} Faculty Member{faculty.length !== 1 ? 's' : ''} Available
            </span>
          )}
        </div>

        {loading ? (
          <div className="space-y-3"><CardSkeleton /><CardSkeleton /></div>
        ) : students.length === 0 ? (
          <EmptyState icon="school" message="No students registered yet." />
        ) : faculty.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-2">
            <span className="material-symbols-outlined text-3xl text-amber-500">person_add</span>
            <p className="text-xs font-bold text-amber-800">No Faculty Mentors Registered Yet</p>
            <p className="text-[11px] text-amber-600">
              Faculty members must register as "Faculty Mentor" from the institute registration page before they can be assigned to students.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map(s => {
              const fbInput = feedbackInputs[s.id] || { text: '', rating: 5, mentor: s.mentor_name || '' }
              const isExpanded = activeStudent === s.id
              const studentFbs = feedbacks.filter(f => f.student_id === s.id)

              return (
                <div key={s.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5">
                    <div className="flex items-center gap-3">
                      <Avatar name={s.name} profilePicture={s.profile_picture} />
                      <div>
                        <h3 className="font-bold text-xs text-slate-900">{s.name}</h3>
                        <p className="text-[11px] text-slate-500">
                          {s.branch} - Mentor: <strong className="text-[#4B1881]">{s.mentor_name || 'Not assigned'}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        className="w-48 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4B1881] appearance-none cursor-pointer"
                        value={mentorSelections[s.id] || ''}
                        onChange={e => setMentorSelections(prev => ({ ...prev, [s.id]: e.target.value }))}
                      >
                        <option value="">Select Faculty Mentor</option>
                        {faculty.map(f => (
                          <option key={f.id} value={f.id}>
                            {f.name}{f.department ? ` (${f.department})` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleAssignMentor(s.id)}
                        disabled={submitting === 'mentor_' + s.id || !mentorSelections[s.id]}
                        className="btn-primary text-xs py-1.5 px-3 rounded-xl shadow-orange disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting === 'mentor_' + s.id ? '...' : 'Assign'}
                      </button>
                      <button
                        onClick={() => setActiveStudent(isExpanded ? null : s.id)}
                        className="btn-secondary text-xs py-1.5 px-3 rounded-xl"
                      >
                        + Feedback
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 p-5 bg-slate-50/70 space-y-3 text-xs">
                      <h4 className="font-bold text-slate-900">Submit Evaluation for {s.name}</h4>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mentor Name</label>
                        <select
                          className="input-field text-xs appearance-none cursor-pointer"
                          value={fbInput.mentor}
                          onChange={e => setFeedbackInputs(prev => ({ ...prev, [s.id]: { ...fbInput, mentor: e.target.value } }))}
                        >
                          <option value="">Select Faculty Mentor</option>
                          {faculty.map(f => (
                            <option key={f.id} value={f.name}>
                              {f.name}{f.department ? ` (${f.department})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Rating</label>
                        <StarRating value={fbInput.rating} onChange={v => setFeedbackInputs(prev => ({ ...prev, [s.id]: { ...fbInput, rating: v } }))} />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Comments</label>
                        <textarea
                          rows={3}
                          className="input-field text-xs resize-none"
                          placeholder="Provide constructive feedback..."
                          value={fbInput.text}
                          onChange={e => setFeedbackInputs(prev => ({ ...prev, [s.id]: { ...fbInput, text: e.target.value } }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setActiveStudent(null)} className="btn-secondary py-1.5 px-3">Cancel</button>
                        <button
                          onClick={() => handleSubmitFeedback(s.id)}
                          disabled={submitting === 'fb_' + s.id}
                          className="btn-primary py-1.5 px-4 shadow-orange"
                        >
                          {submitting === 'fb_' + s.id ? 'Submitting...' : 'Submit'}
                        </button>
                      </div>

                      {studentFbs.length > 0 && (
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <span className="font-bold text-slate-700 text-[11px] block">Previous Feedback:</span>
                          {studentFbs.map(fb => (
                            <div key={fb.id} className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                              <div className="flex justify-between font-bold text-slate-800">
                                <span>{fb.mentor_name}</span>
                                <span className="text-amber-500">{'★'.repeat(fb.rating)}</span>
                              </div>
                              <p className="text-slate-600 italic">"{fb.feedback_text}"</p>
                              <span className="text-[10px] text-slate-400 block">{fb.created_at}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Activity Feed */}
      <div className="space-y-4">
        <h2 className="font-headline font-bold text-sm text-slate-900">Recent Feedback</h2>
        {feedbacks.length === 0 ? (
          <EmptyState icon="reviews" message="No feedback submitted yet." />
        ) : (
          <div className="space-y-3">
            {feedbacks.slice(0, 6).map(f => (
              <div key={f.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">{f.student_name}</h4>
                    <span className="text-[10px] text-slate-400">by {f.mentor_name} - {f.created_at}</span>
                  </div>
                  <span className="text-amber-500 font-bold">{'★'.repeat(f.rating)}</span>
                </div>
                <p className="text-slate-600 italic line-clamp-3">"{f.feedback_text}"</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
