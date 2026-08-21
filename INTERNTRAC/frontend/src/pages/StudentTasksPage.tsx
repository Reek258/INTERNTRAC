import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { CardSkeleton } from '../components/Skeleton'

interface StudentTask {
  id: string
  application_id: string
  student_id: string
  company_profile_id: string
  title: string
  description: string
  deadline: string
  assigned_date: string
  status: string
  github_link: string | null
  submission_notes: string | null
  submitted_at: string | null
  feedback: string | null
  stars: number | null
  evaluated_at: string | null
  company_name: string
}

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  ASSIGNED: { color: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Pending Submission', icon: 'pending' },
  SUBMITTED: { color: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Under Review', icon: 'rate_review' },
  EVALUATED: { color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Reviewed', icon: 'verified' },
  REVISION_REQUIRED: { color: 'bg-red-50 text-red-600 border-red-200', label: 'Revision Required', icon: 'replay' },
}

function StarsDisplay({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <span
          key={star}
          className="material-symbols-outlined text-sm"
          style={{
            fontVariationSettings: `'FILL' ${count >= star ? 1 : 0}`,
            color: count >= star ? '#F26522' : '#CBD5E1'
          }}
        >
          star
        </span>
      ))}
    </div>
  )
}

export default function StudentTasksPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState<StudentTask[]>([])
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const [selectedTask, setSelectedTask] = useState<StudentTask | null>(null)
  const [githubUrl, setGithubUrl] = useState('')
  const [submissionNotes, setSubmissionNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [filter, setFilter] = useState<'all' | 'ASSIGNED' | 'SUBMITTED' | 'EVALUATED'>('all')

  const token = localStorage.getItem('token')

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchTasks = async () => {
    if (!token) { navigate('/login?role=student'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('http://localhost:8000/api/students/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.status === 401 || res.status === 403) {
        localStorage.clear()
        navigate('/login?role=student')
        return
      }
      if (!res.ok) throw new Error('Failed to load tasks')
      const data = await res.json()
      setTasks(data || [])
    } catch (err: any) {
      setError(err.message || 'Error loading tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTask || !submissionNotes.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch(`http://localhost:8000/api/students/tasks/${selectedTask.id}/submit-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          github_link: githubUrl.trim() || null,
          submission_notes: submissionNotes.trim()
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Submission failed.')

      showToast('Task submitted successfully! Company will review your work.')
      setSelectedTask(null)
      setGithubUrl('')
      setSubmissionNotes('')
      await fetchTasks()
    } catch (err: any) {
      showToast(err.message || 'Error submitting task.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const openSubmitModal = (task: StudentTask) => {
    setSelectedTask(task)
    setGithubUrl(task.github_link || '')
    setSubmissionNotes(task.submission_notes || '')
  }

  const filteredTasks = tasks.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false
    return true
  })

  const taskCounts = {
    all: tasks.length,
    ASSIGNED: tasks.filter(t => t.status === 'ASSIGNED').length,
    SUBMITTED: tasks.filter(t => t.status === 'SUBMITTED').length,
    EVALUATED: tasks.filter(t => t.status === 'EVALUATED').length,
  }

  return (
    <div className="bg-[#F8FAFC] text-[#0F172A] min-h-screen flex flex-col font-sans">
      <Navbar role="student" activeTab="Tasks" />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <span className="material-symbols-outlined text-base">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-8">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <button onClick={() => navigate('/dashboard/student')} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 mb-2">
              <span className="material-symbols-outlined text-sm">arrow_back</span> Dashboard
            </button>
            <h1 className="font-headline text-3xl font-black text-slate-900 mb-1">My Tasks</h1>
            <p className="text-xs text-slate-500">View assigned tasks, submit your work, and track company feedback.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-xs text-red-700 font-bold">{error}</div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'ASSIGNED', 'SUBMITTED', 'EVALUATED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs px-4 py-2 rounded-xl font-bold transition-all border ${
                filter === f
                  ? 'bg-[#4B1881] text-white border-[#4B1881]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {f === 'all' ? 'All Tasks' : STATUS_CONFIG[f]?.label || f}
              <span className="ml-1 opacity-70">({taskCounts[f]})</span>
            </button>
          ))}
        </div>

        {/* Task List */}
        {loading ? (
          <div className="space-y-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl border border-slate-200 text-center">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-3">task_alt</span>
            <p className="text-sm font-bold text-slate-500">
              {filter === 'all' ? 'No tasks assigned yet.' : `No ${STATUS_CONFIG[filter]?.label.toLowerCase() || ''} tasks.`}
            </p>
            <p className="text-xs text-slate-400 mt-1">Tasks assigned by your company will appear here.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map(task => {
              const config = STATUS_CONFIG[task.status] || STATUS_CONFIG.ASSIGNED
              const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status === 'ASSIGNED'

              return (
                <div key={task.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <div className="p-6 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${config.color}`}>
                            <span className="material-symbols-outlined text-xs align-middle mr-0.5">{config.icon}</span>
                            {config.label}
                          </span>
                          {isOverdue && (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200">
                              Overdue
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-black text-slate-900">{task.title}</h3>
                        <p className="text-sm font-bold text-[#4B1881]">{task.company_name || 'Company'}</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{task.description}</p>
                      </div>

                      <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
                        <div className="text-xs text-slate-500 space-y-1 text-left md:text-right">
                          <div className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">calendar_today</span>
                            Assigned: {task.assigned_date}
                          </div>
                          {task.deadline && (
                            <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                              <span className="material-symbols-outlined text-xs">schedule</span>
                              Due: {task.deadline}
                            </div>
                          )}
                          {task.submitted_at && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <span className="material-symbols-outlined text-xs">upload</span>
                              Submitted: {task.submitted_at}
                            </div>
                          )}
                        </div>

                        {task.stars !== null && (
                          <div className="flex items-center gap-2">
                            <StarsDisplay count={task.stars} />
                            <span className="text-[11px] font-bold text-slate-600">{task.stars}/5</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Submitted Work Details (shown when SUBMITTED or EVALUATED) */}
                    {(task.status === 'SUBMITTED' || task.status === 'EVALUATED') && task.submission_notes && (
                      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                        <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Your Submission</h4>
                        <p className="text-xs text-slate-700 leading-relaxed">{task.submission_notes}</p>
                        {task.github_link && (
                          <a
                            href={task.github_link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4B1881] hover:underline bg-white px-3 py-2 rounded-xl border border-slate-200 mt-1"
                          >
                            <span className="material-symbols-outlined text-sm">code</span>
                            {task.github_link}
                          </a>
                        )}
                      </div>
                    )}

                    {/* Company Feedback (shown when EVALUATED) */}
                    {task.status === 'EVALUATED' && task.feedback && (
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Company Feedback</h4>
                          {task.stars !== null && (
                            <div className="flex items-center gap-1.5">
                              <StarsDisplay count={task.stars} />
                              <span className="text-xs font-bold text-emerald-700">{task.stars}/5</span>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{task.feedback}</p>
                        {task.evaluated_at && (
                          <p className="text-[10px] text-slate-500">Reviewed on: {task.evaluated_at}</p>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-xs text-slate-400">
                        {task.status === 'ASSIGNED' && 'Complete your task and submit for review.'}
                        {task.status === 'SUBMITTED' && 'Waiting for company to review your submission.'}
                        {task.status === 'EVALUATED' && 'Review complete. Check your feedback above.'}
                      </div>
                      {task.status === 'ASSIGNED' && (
                        <button
                          onClick={() => openSubmitModal(task)}
                          className="btn-primary text-xs py-2.5 px-6 rounded-xl shadow-orange flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">upload</span>
                          Proceed to Submit
                        </button>
                      )}
                      {task.status === 'REVISION_REQUIRED' && (
                        <button
                          onClick={() => openSubmitModal(task)}
                          className="btn-primary text-xs py-2.5 px-6 rounded-xl shadow-orange flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">replay</span>
                          Resubmit Work
                        </button>
                      )}
                      {task.github_link && (
                        <a
                          href={task.github_link}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-secondary text-xs py-2 px-4 rounded-xl flex items-center gap-1.5"
                        >
                          <span className="material-symbols-outlined text-sm">code</span>
                          View Repository
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Submission Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline font-bold text-base text-[#0F172A]">
                  Submit Task Work
                </h3>
                <p className="text-xs text-[#4B1881] font-bold">{selectedTask.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{selectedTask.company_name}</p>
              </div>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Task Details */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Task Description</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{selectedTask.description}</p>
              {selectedTask.deadline && (
                <p className="text-[11px] text-red-600 font-bold mt-1">
                  <span className="material-symbols-outlined text-xs align-middle mr-0.5">schedule</span>
                  Deadline: {selectedTask.deadline}
                </p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  GitHub Repository URL <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={githubUrl}
                  onChange={e => setGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/repo"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  What did you work on? <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  value={submissionNotes}
                  onChange={e => setSubmissionNotes(e.target.value)}
                  placeholder="Describe your implementation approach, key features delivered, technologies used, and any challenges you overcame..."
                  className="input-field text-xs resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="btn-secondary flex-1 justify-center py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !submissionNotes.trim()}
                  className="btn-primary flex-1 justify-center py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                      Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">send</span>
                      Submit for Review
                    </span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  )
}
