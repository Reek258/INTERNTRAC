import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import CompanyTabBar from '../components/CompanyTabBar'
import { CardSkeleton } from '../components/Skeleton'

interface Intern {
  application_id: string
  student_id: string
  student_name: string
  student_branch: string
  student_cgpa: number
  internship_title: string
  internship_id: string
  github_url: string | null
  status: string
  task_title: string | null
  task_status: string | null
}

interface Task {
  id: string
  application_id: string
  student_id: string
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
  student_name: string
  student_branch: string
  student_cgpa: number
  internship_title: string
}

const STATUS_COLORS: Record<string, string> = {
  ASSIGNED: 'bg-amber-50 text-amber-700 border-amber-200',
  SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
  EVALUATED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  REVISION_REQUIRED: 'bg-red-50 text-red-600 border-red-200',
}

function StarsInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110"
        >
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: `'FILL' ${(hover || value) >= star ? 1 : 0}`, color: (hover || value) >= star ? '#F26522' : '#CBD5E1' }}>
            star
          </span>
        </button>
      ))}
    </div>
  )
}

function StarsDisplay({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: `'FILL' ${count >= star ? 1 : 0}`, color: count >= star ? '#F26522' : '#CBD5E1' }}>
          star
        </span>
      ))}
    </div>
  )
}

export default function TaskManagerPage() {
  const navigate = useNavigate()
  const [activeView, setActiveView] = useState<'assign' | 'tasks'>('tasks')
  const [interns, setInterns] = useState<Intern[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'ASSIGNED' | 'SUBMITTED' | 'EVALUATED'>('all')

  const [taskFilter, _setTaskFilter] = useState('all')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const token = localStorage.getItem('token')

  const fetchInterns = useCallback(async () => {
    if (!token) { navigate('/login'); return }
    try {
      const res = await fetch('http://localhost:8000/api/companies/interns', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setInterns(await res.json())
    } catch {}
  }, [token, navigate])

  const fetchTasks = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch(`http://localhost:8000/api/companies/tasks?status=${taskFilter}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setTasks(await res.json())
    } catch {}
  }, [token, taskFilter])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchInterns(), fetchTasks()]).finally(() => setLoading(false))
  }, [fetchInterns, fetchTasks])

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
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar role="company" activeTab="Tasks" />
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
          <span className="material-symbols-outlined text-base">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          {toast.msg}
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <CompanyTabBar />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-1">Task Manager</h1>
            <p className="text-sm text-slate-500">Assign tasks to interns, review submissions, and provide feedback.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveView('tasks')} className={`text-xs px-4 py-2.5 rounded-xl font-bold transition-all ${activeView === 'tasks' ? 'bg-[#4B1881] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-sm align-middle mr-1">task_alt</span> All Tasks
            </button>
            <button onClick={() => setActiveView('assign')} className={`text-xs px-4 py-2.5 rounded-xl font-bold transition-all ${activeView === 'assign' ? 'bg-[#F26522] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              <span className="material-symbols-outlined text-sm align-middle mr-1">add_task</span> Assign New
            </button>
          </div>
        </div>

        {activeView === 'assign' ? (
          <AssignTaskView interns={interns} onAssigned={() => { setActiveView('tasks'); fetchTasks(); showToast('Task assigned successfully!') }} showToast={showToast} />
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2 flex-wrap">
              {(['all', 'ASSIGNED', 'SUBMITTED', 'EVALUATED'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} className={`text-xs px-4 py-2 rounded-xl font-bold transition-all border ${filter === f ? 'bg-[#4B1881] text-white border-[#4B1881]' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
                  {f === 'all' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()} <span className="ml-1 opacity-70">({taskCounts[f]})</span>
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : filteredTasks.length === 0 ? (
              <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">task_alt</span>
                <p className="text-sm font-bold text-slate-500">No tasks found.</p>
                <p className="text-xs text-slate-400 mt-1">Assign tasks to your active interns to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredTasks.map(task => (
                  <TaskCard key={task.id} task={task} onEvaluated={() => { fetchTasks(); showToast('Task evaluated!') }} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

function AssignTaskView({ interns, onAssigned, showToast }: { interns: Intern[]; onAssigned: () => void; showToast: (msg: string, type?: 'success' | 'error') => void }) {
  const token = localStorage.getItem('token')
  const [selectedIntern, setSelectedIntern] = useState<Intern | null>(null)
  const [form, setForm] = useState({ title: '', description: '', deadline: '' })
  const [loading, setLoading] = useState(false)

  const activeInterns = interns.filter(i => i.status !== 'COMPLETED')

  const handleAssign = async () => {
    if (!selectedIntern || !form.title || !form.deadline) { showToast('Fill all fields', 'error'); return }
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/companies/tasks/assign', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ application_id: selectedIntern.application_id, ...form })
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || 'Failed') }
      onAssigned()
    } catch (e: any) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <div className="lg:col-span-1 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 mb-2">Select Intern</h3>
        {activeInterns.length === 0 ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">No active interns to assign tasks to.</div>
        ) : (
          activeInterns.map(intern => (
            <div
              key={intern.application_id}
              onClick={() => setSelectedIntern(intern)}
              className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${selectedIntern?.application_id === intern.application_id ? 'border-[#F26522] ring-2 ring-[#F26522]/20 bg-orange-50/30' : 'border-slate-200 hover:border-slate-300'}`}
            >
              <p className="text-sm font-bold text-slate-900">{intern.student_name}</p>
              <p className="text-xs text-slate-500">{intern.internship_title} • {intern.student_branch}</p>
            </div>
          ))
        )}
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
        <h3 className="text-sm font-bold text-slate-900">Task Details</h3>
        {selectedIntern ? (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="font-bold text-slate-700">Assigning to:</span> <span className="text-[#4B1881] font-bold">{selectedIntern.student_name}</span> for <span className="font-bold">{selectedIntern.internship_title}</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Task Title *</label>
              <input type="text" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Build REST API for user management" className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Task Description *</label>
              <textarea rows={4} required value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the task, requirements, and expected deliverables..." className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Deadline *</label>
              <input type="date" required value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} className="input-field text-sm" />
            </div>
            <button onClick={handleAssign} disabled={loading} className="btn-primary w-full justify-center text-sm py-3">
              {loading ? 'Assigning...' : (
                <>
                  <span className="material-symbols-outlined text-base align-middle mr-1">add_task</span> Assign Task
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">person_search</span>
            Select an intern from the left to assign a task.
          </div>
        )}
      </div>
    </div>
  )
}

function TaskCard({ task, onEvaluated }: { task: Task; onEvaluated: () => void }) {
  const [expanded, setExpanded] = useState(false)
  const [evalForm, setEvalForm] = useState({ feedback: '', stars: 3 })
  const [loading, setLoading] = useState(false)
  const token = localStorage.getItem('token')

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status === 'ASSIGNED'

  const handleEvaluate = async () => {
    if (!evalForm.feedback.trim()) return
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/companies/tasks/evaluate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id, ...evalForm })
      })
      if (!res.ok) throw new Error('Failed')
      onEvaluated()
    } catch { }
    finally { setLoading(false) }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-sm text-slate-900 leading-tight truncate">{task.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{task.student_name} • {task.internship_title}</p>
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border shrink-0 ml-2 ${STATUS_COLORS[task.status] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            {task.status}
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">{task.description}</p>

        <div className="flex items-center gap-3 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">schedule</span>
            Due: {task.deadline}
          </span>
          {isOverdue && <span className="text-red-600 font-bold">Overdue</span>}
          {task.submitted_at && (
            <span className="flex items-center gap-1 text-blue-600">
              <span className="material-symbols-outlined text-xs">upload</span>
              Submitted: {task.submitted_at}
            </span>
          )}
        </div>

        {task.stars !== null && (
          <div className="flex items-center gap-2">
            <StarsDisplay count={task.stars} />
            <span className="text-[11px] text-slate-500 font-bold">{task.stars}/5</span>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 px-5 py-3">
        <button onClick={() => setExpanded(!expanded)} className="text-xs font-bold text-[#4B1881] hover:underline flex items-center gap-1">
          {expanded ? 'Hide Details' : 'View Details'}
          <span className="material-symbols-outlined text-sm">{expanded ? 'expand_less' : 'expand_more'}</span>
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-5 space-y-4 bg-slate-50">
          {task.submission_notes && (
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Submission Notes</h4>
              <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">{task.submission_notes}</p>
            </div>
          )}
          {task.github_link && (
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">GitHub Repository</h4>
              <a href={task.github_link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#4B1881] hover:underline bg-white px-3 py-2 rounded-xl border border-slate-200">
                <span className="material-symbols-outlined text-sm">code</span>
                {task.github_link}
              </a>
            </div>
          )}

          {task.status === 'SUBMITTED' && (
            <div className="space-y-3 pt-3 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Evaluate Submission</h4>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rating</label>
                <StarsInput value={evalForm.stars} onChange={v => setEvalForm({ ...evalForm, stars: v })} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Feedback *</label>
                <textarea rows={3} required value={evalForm.feedback} onChange={e => setEvalForm({ ...evalForm, feedback: e.target.value })} placeholder="Provide constructive feedback on the work submitted..." className="input-field text-xs" />
              </div>
              <button onClick={handleEvaluate} disabled={loading || !evalForm.feedback.trim()} className="btn-primary text-xs py-2.5 w-full justify-center">
                {loading ? 'Evaluating...' : (
                  <>
                    <span className="material-symbols-outlined text-sm align-middle mr-1">grade</span> Submit Evaluation
                  </>
                )}
              </button>
            </div>
          )}

          {task.feedback && (
            <div className="space-y-1 pt-3 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Your Feedback</h4>
              <p className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">{task.feedback}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
