import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCalendar } from '../hooks/useCalendar'
import { api } from '../utils/api'
import WeekView from '../components/calendar/WeekView'
import RightPanel from '../components/RightPanel'
import EditSuggestionModal from '../components/EditSuggestionModal'
import RescheduleModal from '../components/RescheduleModal'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  Career:      { bar: '#3B82F6', badge: 'bg-blue-100 text-blue-700' },
  Learning:    { bar: '#22C55E', badge: 'bg-green-100 text-green-700' },
  Health:      { bar: '#F97316', badge: 'bg-orange-100 text-orange-700' },
  'Life Admin':{ bar: '#A855F7', badge: 'bg-purple-100 text-purple-700' },
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

// ─── Helper functions ─────────────────────────────────────────────────────────

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function fmtMonthDay(date) {
  return `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getDate()}`
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth() &&
    a.getDate()     === b.getDate()
  )
}

function isToday(date) {
  return isSameDay(date, new Date())
}

// Calculate scheduled minutes per goal from accepted suggestions
function calcScheduledMinutes(suggestions, goals) {
  const map = {}
  goals.forEach(g => { map[g.id] = 0 })
  suggestions.forEach(s => {
    if (s.status !== 'accepted') return
    const task = s.task
    const block = s.time_block
    if (!task || !block) return
    // Match task category to goal
    goals.forEach(g => {
      if (g.category === task.category) {
        map[g.id] = (map[g.id] || 0) + (block.duration_minutes || 0)
      }
    })
  })
  return map
}

// ─── Mini Month Calendar ──────────────────────────────────────────────────────

function MiniMonthCalendar({ weekStart }) {
  const [viewDate, setViewDate] = useState(new Date())
  const today = new Date()

  const year  = viewDate.getFullYear()
  const month = viewDate.getMonth()

  // First day of the month
  const firstDay = new Date(year, month, 1)
  const startDow = firstDay.getDay() // 0=Sun
  // Pad so Monday is first column
  const startOffset = startDow === 0 ? 6 : startDow - 1

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d))

  const weekEnd = addDays(weekStart, 6)

  function inCurrentWeek(date) {
    if (!date) return false
    const t = date.getTime()
    return t >= weekStart.getTime() && t <= weekEnd.getTime()
  }

  return (
    <div className="select-none">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-stone-700">
          {MONTHS[month].slice(0, 3)} {year}
        </span>
        <div className="flex gap-1">
          <button
            className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 text-xs"
            onClick={() => setViewDate(new Date(year, month - 1, 1))}
          >‹</button>
          <button
            className="w-5 h-5 rounded flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 text-xs"
            onClick={() => setViewDate(new Date(year, month + 1, 1))}
          >›</button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="text-center text-xs text-stone-400 font-medium py-0.5">{d}</div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((date, i) => (
          <div
            key={i}
            className={`text-center text-xs rounded py-0.5 leading-5
              ${!date ? '' : inCurrentWeek(date) ? 'bg-stone-100' : ''}
              ${date && isToday(date) ? 'bg-stone-800 text-white rounded-full font-bold' : date ? 'text-stone-600' : ''}
            `}
          >
            {date ? date.getDate() : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { userId, userName, login, logout } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // Auth from URL
  useEffect(() => {
    const userIdParam = searchParams.get('user_id')
    if (userIdParam && !userId) login({ user_id: userIdParam })
  }, [searchParams])

  // Redirect if not logged in
  useEffect(() => {
    if (userId === null) {
      // Wait briefly to allow storage read
      const t = setTimeout(() => {
        const stored = localStorage.getItem('nomoregaps_user_id')
        if (!stored) navigate('/')
      }, 200)
      return () => clearTimeout(t)
    }
  }, [userId, navigate])

  // Calendar state
  const { events, suggestions, loading, sync, generateSuggestions, fetchSuggestions,
          acceptSuggestion, rejectSuggestion } = useCalendar(userId)

  // Goals
  const [goals, setGoals] = useState([])

  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0)
  const weekStart = useMemo(() => {
    const base = getMonday(new Date())
    return addDays(base, weekOffset * 7)
  }, [weekOffset])
  const weekEnd = addDays(weekStart, 6)

  // Selection state
  const [selectedId,   setSelectedId]   = useState(null)
  const [selectedType, setSelectedType] = useState(null) // 'event' | 'suggestion'
  const [showSuggestions, setShowSuggestions] = useState(true)

  // Modals
  const [editTarget,       setEditTarget]       = useState(null)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)

  // Syncing flag (prevent double-sync on mount)
  const [synced, setSynced] = useState(false)

  // On mount: sync + generate
  useEffect(() => {
    if (!userId || synced) return
    setSynced(true)
    ;(async () => {
      try {
        await sync(false)
        await generateSuggestions()
      } catch (err) {
        console.error('[Dashboard] initial load error:', err)
      }
    })()
  }, [userId, synced])

  // Load goals
  useEffect(() => {
    if (!userId) return
    api.getGoals(userId)
      .then(data => setGoals(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [userId])

  // Derived: selected object
  const selectedObject = useMemo(() => {
    if (!selectedId) return null
    if (selectedType === 'event')      return events.find(e => e.id === selectedId) || null
    if (selectedType === 'suggestion') return suggestions.find(s => s.id === selectedId) || null
    return null
  }, [selectedId, selectedType, events, suggestions])

  // Scheduled minutes per goal
  const scheduledMinutes = useMemo(() => calcScheduledMinutes(suggestions, goals), [suggestions, goals])

  // Handlers
  function handleSelectEvent(ev) {
    setSelectedId(ev.id)
    setSelectedType('event')
  }

  function handleSelectSuggestion(s) {
    setSelectedId(s.id)
    setSelectedType('suggestion')
  }

  async function handleAccept(suggestionId) {
    await acceptSuggestion(suggestionId)
    // Update selected if it's this one
    if (selectedId === suggestionId) {
      setSelectedId(suggestionId) // keep selected to show accepted state
    }
  }

  async function handleReject(suggestionId) {
    await rejectSuggestion(suggestionId)
    if (selectedId === suggestionId) {
      setSelectedId(null)
      setSelectedType(null)
    }
  }

  function handleReschedule(suggestion) {
    setRescheduleTarget(suggestion)
  }

  function handleEditSave({ title, duration_minutes }) {
    // In a real app, PATCH the suggestion; here we just log
    console.log('[Dashboard] Edit saved:', { title, duration_minutes })
  }

  function handleForceSync() {
    sync(true).then(() => generateSuggestions())
  }

  return (
    <div className="flex flex-col h-screen bg-white overflow-hidden font-sans">
      {/* ── Top Bar ──────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between h-14 px-4 border-b border-stone-200 bg-white z-30">
        {/* Brand */}
        <span className="font-serif text-lg text-stone-800 font-bold select-none">NoMoreGaps</span>

        {/* Week nav */}
        <div className="flex items-center gap-2">
          <button
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
            onClick={() => setWeekOffset(o => o - 1)}
          >‹</button>
          <span className="text-sm font-medium text-stone-700 w-36 text-center">
            {fmtMonthDay(weekStart)} – {fmtMonthDay(weekEnd)}
          </span>
          <button
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
            onClick={() => setWeekOffset(o => o + 1)}
          >›</button>
          <button
            className="ml-2 px-3 py-1 rounded-full text-xs font-semibold border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            onClick={() => setWeekOffset(0)}
          >Today</button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Sync button */}
          <button
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
              ${loading ? 'border-stone-200 text-stone-400' : 'border-stone-300 text-stone-600 hover:bg-stone-50'}
            `}
            onClick={handleForceSync}
            disabled={loading}
          >
            {loading ? '⟳ Syncing…' : '⟳ Sync'}
          </button>

          {/* Suggestions toggle */}
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors
              ${showSuggestions
                ? 'bg-green-600 border-green-600 text-white hover:bg-green-700'
                : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }
            `}
            onClick={() => setShowSuggestions(v => !v)}
          >
            <span>{showSuggestions ? '◉' : '○'}</span>
            Show Suggestions
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-sm font-bold text-stone-600 select-none cursor-pointer"
            title={userName || 'User'}
            onClick={() => { logout(); navigate('/') }}
          >
            {(userName || 'U').charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── Main layout ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
        <aside className="flex-shrink-0 w-52 border-r border-stone-200 flex flex-col overflow-y-auto"
          style={{ backgroundColor: '#F9F8F6' }}>

          <div className="p-3 pt-4">
            {/* Mini month calendar */}
            <MiniMonthCalendar weekStart={weekStart} />

            {/* Goals section */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => navigate('/goals')}
                  className="text-xs font-semibold text-stone-600 uppercase tracking-wide hover:text-stone-900 transition-colors"
                >Goals</button>
                <button
                  onClick={() => navigate('/goals')}
                  className="text-stone-400 hover:text-stone-600 text-lg leading-none w-5 h-5 flex items-center justify-center"
                >+</button>
              </div>

              {goals.length === 0 ? (
                <p className="text-xs text-stone-400 italic">No goals yet</p>
              ) : (
                <div className="space-y-3">
                  {goals.map(goal => {
                    const scheduled = scheduledMinutes[goal.id] || 0
                    const target    = goal.weekly_target_minutes || 60
                    const pct       = Math.min(100, Math.round((scheduled / target) * 100))
                    const color     = CATEGORY_COLORS[goal.category]?.bar || '#94A3B8'
                    return (
                      <div key={goal.id}>
                        <div className="flex justify-between items-baseline mb-0.5">
                          <span className="text-xs text-stone-700 font-medium truncate max-w-[110px]">{goal.title}</span>
                          <span className="text-xs text-stone-400 ml-1 flex-shrink-0">
                            {Math.round(scheduled / 60 * 10) / 10}/{Math.round(target / 60 * 10) / 10}h
                          </span>
                        </div>
                        <div className="h-1 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Bottom integrations */}
          <div className="mt-auto p-3 border-t border-stone-200 space-y-2">
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0"></span>
              Google Calendar: Connected
            </div>
            <div className="flex items-center gap-1.5 text-xs text-stone-400 cursor-pointer hover:text-stone-600">
              <span className="text-stone-300">♪</span>
              Spotify: Connect
            </div>
          </div>
        </aside>

        {/* ── Calendar grid ─────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden bg-white">
          <WeekView
            events={events}
            suggestions={suggestions}
            selectedId={selectedId}
            selectedType={selectedType}
            onSelectEvent={handleSelectEvent}
            onSelectSuggestion={handleSelectSuggestion}
            onAccept={handleAccept}
            onReject={handleReject}
            weekStart={weekStart}
            showSuggestions={showSuggestions}
          />
        </main>

        {/* ── Right Panel ───────────────────────────────────────────────────── */}
        <aside
          className="flex-shrink-0 w-56 border-l border-stone-200 overflow-y-auto"
          style={{ backgroundColor: '#F9F8F6' }}
        >
          <RightPanel
            selected={selectedObject}
            selectedType={selectedType}
            onAccept={handleAccept}
            onReject={handleReject}
            onReschedule={handleReschedule}
            onEdit={setEditTarget}
          />
        </aside>
      </div>

      {/* ── Modals ────────────────────────────────────────────────────────────── */}
      {editTarget && (
        <EditSuggestionModal
          suggestion={editTarget}
          onClose={() => setEditTarget(null)}
          onSave={handleEditSave}
        />
      )}

      {rescheduleTarget && (
        <RescheduleModal
          suggestion={rescheduleTarget}
          availableBlocks={
            // Other pending time blocks not already occupied by this suggestion
            suggestions
              .filter(s => s.id !== rescheduleTarget.id && s.status === 'pending' && s.time_block)
              .map(s => s.time_block)
              .filter((b, i, arr) => arr.findIndex(x => x.id === b.id) === i)
          }
          onClose={() => setRescheduleTarget(null)}
          onSelect={(block) => {
            console.log('[Dashboard] Rescheduled to block:', block)
            setRescheduleTarget(null)
          }}
        />
      )}
    </div>
  )
}
