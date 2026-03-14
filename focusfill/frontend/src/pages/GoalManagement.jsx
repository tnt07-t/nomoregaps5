// STATUS: complete
// Goal Management page — view, expand, edit, archive goals + Quick Start templates
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { api } from '../utils/api'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  Career:       { dot: '#3B82F6', badge: 'bg-blue-50 text-blue-600' },
  Learning:     { dot: '#22C55E', badge: 'bg-green-50 text-green-700' },
  Health:       { dot: '#F97316', badge: 'bg-orange-50 text-orange-600' },
  'Life Admin': { dot: '#A855F7', badge: 'bg-purple-50 text-purple-600' },
}

const DURATION_OPTS = [10, 15, 20, 25, 30, 45, 60]

const QUICK_START_TEMPLATES = [
  {
    label: 'Job Search',
    category: 'Career',
    weekly_hours: 3,
    priority: 4,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </svg>
    ),
    tasks: [
      { title: 'Tailor resume for 1 job', estimated_minutes: 25 },
      { title: 'Find 3 new listings', estimated_minutes: 15 },
      { title: 'Draft outreach message', estimated_minutes: 20 },
    ],
  },
  {
    label: 'Language',
    category: 'Learning',
    weekly_hours: 2,
    priority: 3,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 8l6 6" /><path d="M4 14l6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="M22 22l-5-10-5 10" /><path d="M14 18h6" />
      </svg>
    ),
    tasks: [
      { title: 'Learn 10 vocab words', estimated_minutes: 15 },
      { title: 'Grammar exercise', estimated_minutes: 20 },
      { title: 'Podcast listening', estimated_minutes: 25 },
    ],
  },
  {
    label: 'Fitness',
    category: 'Health',
    weekly_hours: 3,
    priority: 3,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" />
      </svg>
    ),
    tasks: [
      { title: '7-min workout', estimated_minutes: 10 },
      { title: 'Stretch routine', estimated_minutes: 15 },
      { title: 'Walk 1 mile', estimated_minutes: 20 },
    ],
  },
  {
    label: 'Creative Writing',
    category: 'Learning',
    weekly_hours: 2,
    priority: 2,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    tasks: [
      { title: 'Free-write 10 minutes', estimated_minutes: 10 },
      { title: 'Edit yesterday\'s draft', estimated_minutes: 20 },
      { title: 'Read 1 short story', estimated_minutes: 25 },
    ],
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange && onChange(n)} className="text-sm leading-none">
          <span className={n <= value ? 'text-amber-400' : 'text-stone-300'}>★</span>
        </button>
      ))}
    </div>
  )
}

function GoalCard({ goal, isExpanded, onToggle, onUpdate, onArchive, onReactivate, isArchived }) {
  const [tasks, setTasks]       = useState(goal.tasks || [])
  const [weeklyHrs, setWeeklyHrs] = useState(Math.round((goal.weekly_target_minutes || 60) / 60))
  const [priority, setPriority]   = useState(goal.priority || 3)
  const [saving, setSaving]       = useState(false)
  const [newTask, setNewTask]     = useState('')
  const [newDur, setNewDur]       = useState(25)

  const color = CATEGORY_COLORS[goal.category] || CATEGORY_COLORS['Learning']
  const scheduledMins = goal.scheduled_minutes || 0
  const targetMins    = goal.weekly_target_minutes || 60
  const progress      = Math.min(100, Math.round((scheduledMins / targetMins) * 100))

  async function saveGoal() {
    setSaving(true)
    try {
      await api.updateGoal(goal.id, {
        title: goal.title,
        category: goal.category,
        weekly_target_minutes: weeklyHrs * 60,
        priority_order: priority,
        is_active: goal.is_active,
      })
      onUpdate && onUpdate()
    } catch (_) {}
    setSaving(false)
  }

  async function addTask() {
    if (!newTask.trim()) return
    try {
      await api.addTaskToGoal(goal.id, goal.user_id, {
        title: newTask.trim(),
        estimated_minutes: newDur,
        goal_id: goal.id,
        user_id: goal.user_id,
      })
      setNewTask('')
      setNewDur(25)
      onUpdate && onUpdate()
    } catch (_) {}
  }

  async function deleteTask(taskId) {
    try {
      await api.deleteTask(goal.id, taskId)
      setTasks(t => t.filter(x => x.id !== taskId))
      onUpdate && onUpdate()
    } catch (_) {}
  }

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${isArchived ? 'opacity-60 border-stone-200' : 'border-stone-200 bg-white'}`}>
      {/* Collapsed header */}
      <div
        className="flex items-center px-4 py-3 cursor-pointer hover:bg-stone-50 transition-colors"
        onClick={onToggle}
      >
        {/* Active dot */}
        <span
          className="w-2 h-2 rounded-full flex-shrink-0 mr-3"
          style={{ backgroundColor: color.dot }}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-stone-800">{goal.title}</span>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${color.badge}`}>
              {goal.category}
            </span>
          </div>
          <StarRating value={priority} />
        </div>

        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          <div className="text-right">
            <div className="text-[10px] text-stone-400 uppercase tracking-wide">Weekly Target</div>
            <div className="text-sm font-medium text-stone-700">{weeklyHrs} hrs</div>
          </div>
          {isArchived && (
            <button
              onClick={e => { e.stopPropagation(); onReactivate && onReactivate() }}
              className="text-xs text-emerald-600 hover:text-emerald-700 border border-emerald-200 rounded px-2 py-0.5"
            >
              Reactivate
            </button>
          )}
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Expanded body */}
      {isExpanded && !isArchived && (
        <div className="border-t border-stone-100 px-4 py-3 space-y-4">

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-xs text-stone-500 mb-1">
              <span>Progress</span>
              <span>{(scheduledMins / 60).toFixed(1)} / {(targetMins / 60).toFixed(1)} hrs</span>
            </div>
            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Weekly hours slider */}
          <div>
            <div className="flex justify-between text-xs text-stone-500 mb-1">
              <span>Weekly commitment</span>
              <span className="font-medium text-stone-700">{weeklyHrs} hrs</span>
            </div>
            <input
              type="range" min={1} max={20} value={weeklyHrs}
              onChange={e => setWeeklyHrs(Number(e.target.value))}
              onMouseUp={saveGoal}
              className="w-full accent-stone-700"
            />
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-stone-500">Priority</span>
            <StarRating value={priority} onChange={v => { setPriority(v); }} />
          </div>

          {/* Task list */}
          <div>
            <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Specific Tasks</div>
            <div className="space-y-1.5">
              {(goal.tasks || []).map(task => (
                <div key={task.id} className="flex items-center gap-2 group">
                  <input type="checkbox" className="w-3.5 h-3.5 rounded border-stone-300 accent-emerald-500 flex-shrink-0" />
                  <span className="flex-1 text-xs text-stone-700">{task.title}</span>
                  <span className="text-[10px] text-stone-400">{task.estimated_minutes}m</span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-stone-300 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >✕</button>
                </div>
              ))}
            </div>

            {/* Add task inline */}
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-100">
              <span className="text-stone-300 text-xs">+</span>
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTask()}
                placeholder="Add specific task…"
                className="flex-1 text-xs text-stone-600 bg-transparent outline-none placeholder-stone-300"
              />
              <select
                value={newDur}
                onChange={e => setNewDur(Number(e.target.value))}
                className="text-[10px] text-stone-500 bg-stone-100 border border-stone-200 rounded px-1 py-0.5 outline-none"
              >
                {DURATION_OPTS.map(d => <option key={d} value={d}>{d}m</option>)}
              </select>
              <button onClick={addTask} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Add</button>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex gap-3 pt-1 border-t border-stone-100">
            <button
              onClick={saveGoal}
              disabled={saving}
              className="text-xs text-stone-500 hover:text-stone-700 transition-colors"
            >
              {saving ? 'Saving…' : 'Pause Goal'}
            </button>
            <button
              onClick={() => onArchive && onArchive()}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Archive
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function QuickStartCard({ template, onAdd }) {
  const [adding, setAdding] = useState(false)

  async function handleAdd() {
    setAdding(true)
    await onAdd(template)
    setAdding(false)
  }

  return (
    <button
      onClick={handleAdd}
      disabled={adding}
      className="w-full text-left p-3 rounded-lg border border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50 transition-all disabled:opacity-60"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 flex-shrink-0">
          {template.icon}
        </div>
        <div>
          <div className="text-sm font-medium text-stone-800">{template.label}</div>
          <div className="text-xs text-stone-400 mt-0.5">Pre-filled tasks included</div>
        </div>
      </div>
    </button>
  )
}

// ─── New Goal modal ───────────────────────────────────────────────────────────

function NewGoalModal({ userId, onClose, onCreated }) {
  const [title, setTitle]     = useState('')
  const [category, setCategory] = useState('Learning')
  const [hours, setHours]     = useState(2)
  const [saving, setSaving]   = useState(false)

  async function handleCreate() {
    if (!title.trim()) return
    setSaving(true)
    try {
      await api.createGoal({
        user_id: parseInt(userId),
        title: title.trim(),
        category,
        weekly_target_minutes: hours * 60,
        priority_order: 3,
        tasks: [],
      })
      onCreated()
      onClose()
    } catch (_) {}
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-stone-800">New Goal</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Title</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Learn Spanish"
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg outline-none focus:border-stone-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg outline-none focus:border-stone-400 bg-white"
            >
              {['Career', 'Learning', 'Health', 'Life Admin'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide block mb-1">
              Weekly commitment — {hours} hrs
            </label>
            <input
              type="range" min={1} max={20} value={hours}
              onChange={e => setHours(Number(e.target.value))}
              className="w-full accent-stone-700"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-stone-200 text-sm text-stone-600 hover:bg-stone-50">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={saving || !title.trim()}
            className="flex-1 py-2 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 disabled:opacity-50"
          >
            {saving ? 'Creating…' : 'Create Goal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function GoalManagement() {
  const navigate          = useNavigate()
  const { userId }        = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading]         = useState(true)
  const [expandedId, setExpandedId]   = useState(null)
  const [showNewGoal, setShowNewGoal] = useState(false)
  const [showArchived, setShowArchived] = useState(false)

  const activeGoals   = goals.filter(g => g.is_active !== false)
  const archivedGoals = goals.filter(g => g.is_active === false)

  async function loadGoals() {
    try {
      const data = await api.getGoals(userId)
      setGoals(Array.isArray(data) ? data : [])
    } catch (_) { setGoals([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadGoals() }, [userId])

  async function archiveGoal(goalId) {
    try {
      const goal = goals.find(g => g.id === goalId)
      if (!goal) return
      await api.updateGoal(goalId, {
        title: goal.title,
        category: goal.category,
        weekly_target_minutes: goal.weekly_target_minutes,
        priority_order: goal.priority_order,
        is_active: false,
      })
      loadGoals()
    } catch (_) {}
  }

  async function reactivateGoal(goalId) {
    try {
      const goal = goals.find(g => g.id === goalId)
      if (!goal) return
      await api.updateGoal(goalId, {
        title: goal.title,
        category: goal.category,
        weekly_target_minutes: goal.weekly_target_minutes,
        priority_order: goal.priority_order,
        is_active: true,
      })
      loadGoals()
    } catch (_) {}
  }

  async function addFromTemplate(template) {
    try {
      await api.createGoal({
        user_id: parseInt(userId),
        title: template.label,
        category: template.category,
        weekly_target_minutes: (template.weekly_hours || 2) * 60,
        priority_order: template.priority || 3,
        tasks: template.tasks,
      })
      loadGoals()
    } catch (_) {}
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F0E8' }}>
      {/* Top bar */}
      <div className="bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Calendar
          </button>
          <span className="text-stone-300">|</span>
          <h1 className="text-sm font-semibold text-stone-800">Your Goals</h1>
        </div>
        <button
          onClick={() => setShowNewGoal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-medium hover:bg-stone-800 transition-colors"
        >
          + New Goal
        </button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 flex gap-6">

        {/* ── Left: goal list ── */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {activeGoals.length === 0 && (
                <div className="text-center py-12 text-stone-400 text-sm">
                  No active goals yet. Add one or use a Quick Start template →
                </div>
              )}
              {activeGoals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  isExpanded={expandedId === goal.id}
                  onToggle={() => setExpandedId(expandedId === goal.id ? null : goal.id)}
                  onUpdate={loadGoals}
                  onArchive={() => archiveGoal(goal.id)}
                  isArchived={false}
                />
              ))}

              {/* Archived section */}
              {archivedGoals.length > 0 && (
                <div className="mt-4">
                  <button
                    onClick={() => setShowArchived(v => !v)}
                    className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-700 mb-2"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                      className={`transition-transform ${showArchived ? 'rotate-90' : ''}`}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                    Archived Goals ({archivedGoals.length})
                  </button>
                  {showArchived && (
                    <div className="space-y-2">
                      {archivedGoals.map(goal => (
                        <GoalCard
                          key={goal.id}
                          goal={goal}
                          isExpanded={false}
                          onToggle={() => {}}
                          onUpdate={loadGoals}
                          onReactivate={() => reactivateGoal(goal.id)}
                          isArchived={true}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Quick Start ── */}
        <div className="w-56 flex-shrink-0">
          <div className="sticky top-20 space-y-3">
            <h2 className="text-xs font-semibold text-stone-600 uppercase tracking-wider">Quick Start</h2>
            <div className="space-y-2">
              {QUICK_START_TEMPLATES.map(t => (
                <QuickStartCard key={t.label} template={t} onAdd={addFromTemplate} />
              ))}
            </div>

            {/* Did you know */}
            <div className="mt-4 p-3 rounded-lg bg-stone-100 border border-stone-200">
              <p className="text-xs font-semibold text-stone-600 mb-1">Did you know?</p>
              <p className="text-xs text-stone-500 leading-relaxed">
                Goals with at least 3 specific tasks are 50% more likely to be scheduled consistently.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* New goal modal */}
      {showNewGoal && (
        <NewGoalModal
          userId={userId}
          onClose={() => setShowNewGoal(false)}
          onCreated={loadGoals}
        />
      )}
    </div>
  )
}
