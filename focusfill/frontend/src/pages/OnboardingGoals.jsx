import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import StepIndicator from '../components/StepIndicator'
import BrandHeader from '../components/BrandHeader'

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES = ['Career', 'Learning', 'Health', 'Life Admin']

const CATEGORY_COLORS = {
  Career: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  Learning: { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0' },
  Health: { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA' },
  'Life Admin': { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' },
}

const DURATION_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 25, label: '25 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
]

const TIME_OF_DAY_OPTIONS = [
  { value: 'any', label: 'Any time' },
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
]

const WEEKLY_HOURS = [1, 2, 3, 4, 5, 7, 10]

// ─── Category badge ───────────────────────────────────────────────────────────
function CategoryBadge({ category, small = false }) {
  const colors = CATEGORY_COLORS[category] || { bg: '#F5F5F4', text: '#57534E', border: '#E7E5E4' }
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium border ${
        small ? 'text-xs px-2 py-0.5' : 'text-xs px-3 py-1'
      }`}
      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
    >
      {category}
    </span>
  )
}

// ─── Task row inside the goal form ────────────────────────────────────────────
function TaskRow({ task, index, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-stone-100 last:border-0">
      <input
        type="text"
        placeholder="Task title…"
        value={task.title}
        onChange={(e) => onChange(index, 'title', e.target.value)}
        className="flex-1 text-sm border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-stone-300 min-w-0"
      />
      <select
        value={task.estimated_minutes}
        onChange={(e) => onChange(index, 'estimated_minutes', Number(e.target.value))}
        className="text-sm border border-stone-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-stone-300 w-24 flex-shrink-0"
      >
        {DURATION_OPTIONS.map((d) => (
          <option key={d.value} value={d.value}>{d.label}</option>
        ))}
      </select>
      <select
        value={task.preferred_time_of_day}
        onChange={(e) => onChange(index, 'preferred_time_of_day', e.target.value)}
        className="text-sm border border-stone-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-stone-300 w-28 flex-shrink-0"
      >
        {TIME_OF_DAY_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onRemove(index)}
        className="flex-shrink-0 text-stone-300 hover:text-red-400 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

// ─── Add/Edit Goal Form ───────────────────────────────────────────────────────
function GoalForm({ onSave, onCancel, initialCategory }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(initialCategory || 'Career')
  const [weeklyHours, setWeeklyHours] = useState(2)
  const [tasks, setTasks] = useState([
    { title: '', estimated_minutes: 25, preferred_time_of_day: 'any' },
  ])
  const [titleError, setTitleError] = useState(false)

  const handleAddTask = () => {
    setTasks((prev) => [
      ...prev,
      { title: '', estimated_minutes: 25, preferred_time_of_day: 'any' },
    ])
  }

  const handleTaskChange = (index, field, value) => {
    setTasks((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const handleRemoveTask = (index) => {
    setTasks((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError(true)
      return
    }
    const validTasks = tasks.filter((t) => t.title.trim())
    onSave({
      title: title.trim(),
      category,
      weekly_target_minutes: weeklyHours * 60,
      tasks: validTasks,
    })
  }

  return (
    <div
      className="border rounded-xl p-5 mt-2 space-y-4"
      style={{ backgroundColor: '#FAFAF9', borderColor: '#E7E5E4' }}
    >
      {/* Title */}
      <div>
        <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
          Goal title
        </label>
        <input
          type="text"
          placeholder="e.g. Improve public speaking"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setTitleError(false) }}
          className={`w-full text-sm border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 ${
            titleError
              ? 'border-red-300 focus:ring-red-300'
              : 'border-stone-200 focus:ring-stone-300'
          }`}
        />
        {titleError && <p className="text-xs text-red-400 mt-1">Please enter a goal title.</p>}
      </div>

      {/* Category + weekly hours row */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-stone-300"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
            Weekly target
          </label>
          <select
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(Number(e.target.value))}
            className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-stone-300"
          >
            {WEEKLY_HOURS.map((h) => (
              <option key={h} value={h}>{h} hr{h !== 1 ? 's' : ''} / week</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-stone-500 uppercase tracking-wide">
            Tasks
          </label>
          <button
            type="button"
            onClick={handleAddTask}
            className="text-xs font-medium flex items-center gap-1 transition-colors"
            style={{ color: '#6B8F71' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add task
          </button>
        </div>

        {tasks.length === 0 ? (
          <p className="text-xs text-stone-400 italic py-2">No tasks yet. Add tasks to auto-schedule progress.</p>
        ) : (
          <div>
            {/* Column headers */}
            <div className="flex gap-2 mb-1 px-0">
              <span className="flex-1 text-xs text-stone-400">Title</span>
              <span className="w-24 text-xs text-stone-400 flex-shrink-0">Duration</span>
              <span className="w-28 text-xs text-stone-400 flex-shrink-0">Preferred time</span>
              <span className="w-4 flex-shrink-0" />
            </div>
            {tasks.map((task, i) => (
              <TaskRow
                key={i}
                task={task}
                index={i}
                onChange={handleTaskChange}
                onRemove={handleRemoveTask}
              />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-stone-200 rounded-xl py-2.5 text-sm text-stone-600 hover:bg-stone-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#3D3530' }}
          onMouseEnter={(e) => { e.target.style.backgroundColor = '#2D2520' }}
          onMouseLeave={(e) => { e.target.style.backgroundColor = '#3D3530' }}
        >
          Save Goal
        </button>
      </div>
    </div>
  )
}

// ─── Sortable goal card ───────────────────────────────────────────────────────
function SortableGoalCard({ goal, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal._localId })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-stone-100 rounded-xl px-5 py-4 flex items-start gap-3 shadow-sm"
    >
      {/* Drag handle */}
      <button
        className="mt-1 text-stone-300 hover:text-stone-500 cursor-grab active:cursor-grabbing flex-shrink-0"
        {...attributes}
        {...listeners}
        type="button"
        aria-label="Drag to reorder"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
        </svg>
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-stone-800 truncate">{goal.title}</h3>
          <CategoryBadge category={goal.category} small />
        </div>
        <p className="text-xs text-stone-400 mt-1">
          {Math.round(goal.weekly_target_minutes / 60)} hr{Math.round(goal.weekly_target_minutes / 60) !== 1 ? 's' : ''} / week
          {goal.tasks.length > 0 && ` · ${goal.tasks.length} task${goal.tasks.length !== 1 ? 's' : ''}`}
        </p>

        {goal.tasks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {goal.tasks.slice(0, 3).map((t, i) => (
              <span
                key={i}
                className="text-xs bg-stone-50 border border-stone-100 text-stone-500 rounded-full px-2 py-0.5"
              >
                {t.title}
              </span>
            ))}
            {goal.tasks.length > 3 && (
              <span className="text-xs text-stone-400">+{goal.tasks.length - 3} more</span>
            )}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onDelete(goal._localId)}
        className="mt-1 flex-shrink-0 text-stone-200 hover:text-red-400 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingGoals() {
  const navigate = useNavigate()
  const { userId } = useAuth()

  const [goals, setGoals] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [formCategory, setFormCategory] = useState(null)
  const [activeCategoryFilter, setActiveCategoryFilter] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Local ID counter for drag-and-drop keys
  const [nextId, setNextId] = useState(1)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = (event) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setGoals((items) => {
        const oldIndex = items.findIndex((g) => g._localId === active.id)
        const newIndex = items.findIndex((g) => g._localId === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleAddGoalClick = (category = null) => {
    setFormCategory(category)
    setShowForm(true)
  }

  const handleSaveGoal = (goalData) => {
    setGoals((prev) => [
      ...prev,
      { ...goalData, _localId: nextId },
    ])
    setNextId((n) => n + 1)
    setShowForm(false)
    setFormCategory(null)
  }

  const handleDeleteGoal = (localId) => {
    setGoals((prev) => prev.filter((g) => g._localId !== localId))
  }

  const filteredGoals = activeCategoryFilter
    ? goals.filter((g) => g.category === activeCategoryFilter)
    : goals

  const handleFinish = async () => {
    setSaving(true)
    setError(null)

    try {
      for (let i = 0; i < goals.length; i++) {
        const g = goals[i]
        await api.createGoal({
          user_id: userId,
          title: g.title,
          category: g.category,
          weekly_target_minutes: g.weekly_target_minutes,
          priority_order: i,
          tasks: g.tasks,
        })
      }

      navigate(`/dashboard?user_id=${userId}`)
    } catch (err) {
      setError(err.message || 'Failed to save goals')
      setSaving(false)
    }
  }

  const handleSkip = () => {
    navigate(`/dashboard?user_id=${userId}`)
  }

  return (
    <div
      className="min-h-screen flex items-start justify-center relative overflow-hidden py-8"
      style={{ backgroundColor: '#F4EFE6' }}
    >
      {/* Decorative circles */}
      <div
        className="absolute -left-32 top-1/4 w-80 h-80 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#D6CFC4' }}
      />
      <div
        className="absolute -right-16 bottom-16 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#C8BFB0' }}
      />

      <div className="relative z-10 w-full max-w-2xl mx-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 px-10 py-10">
          {/* Step indicator */}
          <StepIndicator step={3} total={4} />

          {/* Brand */}
          <BrandHeader />

          {/* Heading */}
          <div className="mb-6 text-center">
            <h2 className="font-serif text-2xl text-stone-800 mb-2">
              What do you want to accomplish?
            </h2>
            <p className="text-sm text-stone-500">
              Add your goals and we'll schedule focused time blocks automatically.
            </p>
          </div>

          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                !activeCategoryFilter
                  ? 'border-stone-700 bg-stone-700 text-white'
                  : 'border-stone-200 text-stone-600 hover:border-stone-400'
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => {
              const colors = CATEGORY_COLORS[cat]
              const isActive = activeCategoryFilter === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategoryFilter(isActive ? null : cat)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
                  style={{
                    backgroundColor: isActive ? colors.text : colors.bg,
                    color: isActive ? '#fff' : colors.text,
                    borderColor: colors.border,
                  }}
                >
                  {cat}
                </button>
              )
            })}
          </div>

          {/* Goal list */}
          {goals.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-stone-200 rounded-2xl mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10 text-stone-200 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
              </svg>
              <p className="text-sm text-stone-400 font-medium">Add your first goal to get started</p>
              <p className="text-xs text-stone-300 mt-1">We'll suggest tasks that fit your free time</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredGoals.map((g) => g._localId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3 mb-6">
                  {filteredGoals.map((goal) => (
                    <SortableGoalCard
                      key={goal._localId}
                      goal={goal}
                      onDelete={handleDeleteGoal}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          {/* Goal form */}
          {showForm && (
            <GoalForm
              initialCategory={formCategory}
              onSave={handleSaveGoal}
              onCancel={() => { setShowForm(false); setFormCategory(null) }}
            />
          )}

          {/* Add goal button */}
          {!showForm && (
            <button
              type="button"
              onClick={() => handleAddGoalClick(activeCategoryFilter)}
              className="w-full border-2 border-dashed border-stone-200 rounded-xl py-3 text-sm font-medium text-stone-500 hover:border-stone-400 hover:text-stone-700 transition-colors flex items-center justify-center gap-2 mb-6"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Goal{activeCategoryFilter ? ` · ${activeCategoryFilter}` : ''}
            </button>
          )}

          {/* Quick wins section */}
          <div
            className="rounded-xl p-4 mb-6 border"
            style={{ backgroundColor: '#F8F6F3', borderColor: '#E7E5E4' }}
          >
            <p className="text-xs font-semibold text-stone-600 uppercase tracking-wide mb-2">
              Auto-track these quick wins
            </p>
            <div className="space-y-2">
              {[
                'Check & respond to emails',
                'Review upcoming tasks',
                'Tidy desk / quick reset',
              ].map((label, i) => (
                <label key={i} className="flex items-center gap-2 cursor-pointer">
                  <div className="w-4 h-4 rounded border-2 border-stone-400 bg-stone-400 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-xs text-stone-600">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mb-6 rounded-lg p-3 border text-sm"
              style={{ backgroundColor: '#FEF0ED', borderColor: '#F5C6BC', color: '#C0392B' }}
            >
              {error}
            </div>
          )}

          {/* CTA buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSkip}
              className="px-6 py-4 border border-stone-200 rounded-xl text-sm text-stone-500 hover:bg-stone-50 transition-colors"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 rounded-xl px-6 py-4 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#3D3530' }}
              onMouseEnter={(e) => { if (!saving) e.target.style.backgroundColor = '#2D2520' }}
              onMouseLeave={(e) => { if (!saving) e.target.style.backgroundColor = '#3D3530' }}
            >
              {saving ? 'Saving…' : 'Start Optimizing'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-stone-400 mt-4">
          <a href="#" className="hover:text-stone-600 transition-colors">Privacy Policy</a>
          <span className="mx-2">•</span>
          <a href="#" className="hover:text-stone-600 transition-colors">Terms of Service</a>
        </p>
      </div>
    </div>
  )
}
