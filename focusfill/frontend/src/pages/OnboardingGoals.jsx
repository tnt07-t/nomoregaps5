// STATUS: complete
// Step 3 — "Your Goals": two-column goal builder (list left, editor right)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepDots from '../components/StepDots'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth'

const QUICK_FILL = [
  { label: 'Fitness', category: 'Health', tasks: [{ title: 'Morning run', estimated_minutes: 30 }, { title: 'Stretch / mobility', estimated_minutes: 15 }] },
  { label: 'Language', category: 'Learning', tasks: [{ title: 'Duolingo practice', estimated_minutes: 15 }, { title: 'Vocabulary review', estimated_minutes: 20 }] },
  { label: 'Job Search', category: 'Career', tasks: [{ title: 'Apply to one job', estimated_minutes: 25 }, { title: 'LinkedIn outreach', estimated_minutes: 15 }, { title: 'Update resume', estimated_minutes: 45 }] },
]

const DURATION_OPTS = [10, 15, 20, 25, 30, 45, 60]

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} onClick={() => onChange(n)} className="text-base leading-none">
          <span className={n <= value ? 'text-amber-400' : 'text-stone-300'}>★</span>
        </button>
      ))}
    </div>
  )
}

export default function OnboardingGoals() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [goals, setGoals] = useState([])
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)

  const [editTitle, setEditTitle]       = useState('')
  const [editHours, setEditHours]       = useState(2)
  const [editPriority, setEditPriority] = useState(3)
  const [editTasks, setEditTasks]       = useState([])

  function selectGoal(i) {
    const g = goals[i]
    setSelected(i)
    setEditTitle(g.title)
    setEditHours(g.weekly_hours || 2)
    setEditPriority(g.priority || 3)
    setEditTasks(g.tasks || [])
  }

  function saveEdit() {
    if (selected === null) return
    setGoals(gs => gs.map((g, i) =>
      i === selected
        ? { ...g, title: editTitle, weekly_hours: editHours, priority: editPriority, tasks: editTasks }
        : g
    ))
  }

  function addNewGoal(title = 'New Goal', category = 'Learning', tasks = []) {
    const newGoal = { title, category, weekly_hours: 2, priority: 3, tasks }
    const newGoals = [...goals, newGoal]
    setGoals(newGoals)
    const idx = newGoals.length - 1
    setSelected(idx)
    setEditTitle(title)
    setEditHours(2)
    setEditPriority(3)
    setEditTasks(tasks.map(t => ({ ...t })))
  }

  function addTask() {
    setEditTasks(t => [...t, { title: '', estimated_minutes: 25 }])
  }

  function updateTask(i, field, val) {
    setEditTasks(ts => ts.map((t, j) => j === i ? { ...t, [field]: val } : t))
  }

  function removeTask(i) {
    setEditTasks(ts => ts.filter((_, j) => j !== i))
  }

  async function handlePreviewCalendar() {
    setSaving(true)
    saveEdit()
    try {
      const allGoals = goals.map((g, i) => ({
        ...g,
        title: i === selected ? editTitle : g.title,
        weekly_hours: i === selected ? editHours : g.weekly_hours,
        priority: i === selected ? editPriority : g.priority,
        tasks: i === selected ? editTasks : g.tasks,
      }))
      for (const [idx, g] of allGoals.entries()) {
        await api.post('/goals/', {
          user_id: parseInt(userId),
          title: g.title,
          category: g.category,
          weekly_target_minutes: (g.weekly_hours || 2) * 60,
          priority_order: idx,
          tasks: (g.tasks || []).map(t => ({
            title: t.title || 'Task',
            estimated_minutes: t.estimated_minutes || 25,
          })),
        })
      }
    } catch (_) { /* non-fatal for demo */ }
    navigate('/onboarding/preview')
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
      <StepDots current={3} />

      {/* Decorative circle */}
      <div className="absolute w-[560px] h-[560px] rounded-full border border-stone-200 pointer-events-none" />

      <div className="relative z-10 flex gap-5 w-full max-w-[640px] px-6">

        {/* ── Left column: goal list ── */}
        <div className="w-44 flex flex-col gap-2 flex-shrink-0 pt-1">
          <h2 className="text-xs font-semibold text-stone-600 mb-1 uppercase tracking-wider">Your Goals</h2>

          {goals.map((g, i) => (
            <button
              key={i}
              onClick={() => selectGoal(i)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                selected === i
                  ? 'border-stone-400 bg-white shadow-sm'
                  : 'border-stone-200 bg-white/60 hover:border-stone-300'
              }`}
            >
              <div className="font-medium text-stone-800 text-xs leading-snug truncate">{g.title}</div>
              <div className="text-stone-400 text-[10px] mt-0.5">
                {(g.tasks || []).length} tasks · {g.weekly_hours || 2} hrs/week
              </div>
            </button>
          ))}

          <button
            onClick={() => addNewGoal()}
            className="w-full px-3 py-2 rounded-lg border border-dashed border-stone-300 text-xs text-stone-400 hover:border-stone-400 hover:text-stone-600 transition-colors"
          >
            + Add Goal
          </button>

          {/* Quick fill */}
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1.5">Quick Fill</p>
            <div className="flex flex-wrap gap-1">
              {QUICK_FILL.map(qf => (
                <button
                  key={qf.label}
                  onClick={() => addNewGoal(qf.label, qf.category, qf.tasks)}
                  className="px-2 py-0.5 rounded border border-stone-300 text-[10px] text-stone-600 bg-white hover:bg-stone-50 transition-colors"
                >
                  {qf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right column: editor ── */}
        <div className="flex-1 bg-white/70 rounded-xl border border-stone-200 p-5 flex flex-col min-h-[400px]">
          {selected === null ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <p className="text-sm text-stone-400 leading-relaxed">Select a goal to edit,<br />or add one on the left.</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end mb-2">
                <button onClick={saveEdit} className="text-stone-300 hover:text-emerald-600 transition-colors" title="Save changes">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </div>

              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-1">Goal Title</p>
              <input
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                className="text-xl font-serif text-stone-800 bg-transparent border-b border-stone-200 outline-none pb-1 mb-5 w-full"
                placeholder="Goal name…"
              />

              <div className="flex gap-8 mb-5">
                <div className="flex-1">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">Weekly Target</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="range" min={1} max={10} value={editHours}
                      onChange={e => setEditHours(Number(e.target.value))}
                      className="flex-1 accent-stone-700"
                    />
                    <span className="text-sm text-stone-700 font-medium w-10 text-right">{editHours} hrs</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-2">Priority</p>
                  <StarRating value={editPriority} onChange={setEditPriority} />
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Specific Tasks</p>
                <button onClick={addTask} className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium">+ Add Task</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 mb-4">
                {editTasks.length === 0 && (
                  <p className="text-xs text-stone-400 py-2">No tasks yet.</p>
                )}
                {editTasks.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 group">
                    <span className="text-stone-300 text-xs flex-shrink-0">›</span>
                    <input
                      value={t.title}
                      onChange={e => updateTask(i, 'title', e.target.value)}
                      className="flex-1 text-xs text-stone-700 bg-transparent outline-none border-b border-transparent hover:border-stone-200 focus:border-stone-400 py-0.5"
                      placeholder="Task title…"
                    />
                    <select
                      value={t.estimated_minutes}
                      onChange={e => updateTask(i, 'estimated_minutes', Number(e.target.value))}
                      className="text-[10px] text-stone-500 bg-stone-100 border border-stone-200 rounded px-1 py-0.5 outline-none"
                    >
                      {DURATION_OPTS.map(d => <option key={d} value={d}>{d}m</option>)}
                    </select>
                    <button
                      onClick={() => removeTask(i)}
                      className="text-stone-200 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >✕</button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="flex gap-3 pt-3 border-t border-stone-100 mt-auto">
            <button
              onClick={() => navigate('/onboarding/audio')}
              className="px-4 py-2 rounded-lg border border-stone-300 text-stone-600 text-xs font-medium hover:bg-stone-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handlePreviewCalendar}
              disabled={saving}
              className="flex-1 py-2 rounded-lg bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Preview Calendar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
