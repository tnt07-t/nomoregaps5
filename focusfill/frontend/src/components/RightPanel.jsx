import React from 'react'

const CATEGORY_BADGE = {
  Career:      'bg-blue-100 text-blue-700',
  Learning:    'bg-green-100 text-green-700',
  Health:      'bg-orange-100 text-orange-700',
  'Life Admin':'bg-purple-100 text-purple-700',
}

function fmtDateTime(dtStr) {
  if (!dtStr) return ''
  const d = new Date(dtStr)
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  let h = d.getHours(), m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${days[d.getDay()]}, ${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtTime(dtStr) {
  if (!dtStr) return ''
  const d = new Date(dtStr)
  let h = d.getHours(), m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function RightPanel({
  selected,
  selectedType,
  onAccept,
  onReject,
  onReschedule,
  onEdit,
}) {
  // Default empty state
  if (!selected) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-4 py-8">
        <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center mb-3">
          <svg className="w-6 h-6 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-sm font-medium text-stone-600">Select an event or suggestion</p>
        <p className="text-xs text-stone-400 mt-1">View details and actions here.</p>
      </div>
    )
  }

  if (selectedType === 'suggestion') {
    return <SuggestionPanel
      suggestion={selected}
      onAccept={onAccept}
      onReject={onReject}
      onReschedule={onReschedule}
      onEdit={onEdit}
    />
  }

  if (selectedType === 'event') {
    return <EventPanel event={selected} />
  }

  return null
}

function SuggestionPanel({ suggestion, onAccept, onReject, onReschedule, onEdit }) {
  const task  = suggestion.task  || {}
  const block = suggestion.time_block || {}
  const category = task.category || 'Career'
  const badgeClass = CATEGORY_BADGE[category] || CATEGORY_BADGE.Career
  const isAccepted = suggestion.status === 'accepted'

  const durationMin = block.duration_minutes || 30
  const startLabel  = fmtDateTime(block.start_time)
  const endLabel    = fmtTime(block.end_time)

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      {/* Badge */}
      <div>
        <span className={`text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${badgeClass}`}>
          {isAccepted ? 'Scheduled Task' : 'Suggested Task'}
        </span>
      </div>

      {/* Title */}
      <div>
        <h2 className="font-serif text-xl text-stone-800 leading-snug">{task.title || 'Task'}</h2>
        <p className="text-xs text-stone-500 mt-0.5">From Goal: {category}</p>
      </div>

      {/* Time */}
      {block.start_time && (
        <div className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">
          <span className="font-semibold text-stone-700">{startLabel}</span>
          {block.end_time && <span> – {endLabel}</span>}
          <span className="ml-2 text-stone-400">({durationMin}m)</span>
        </div>
      )}

      {/* Rationale */}
      {suggestion.reason && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Rationale</p>
          <p className="text-sm text-stone-600 leading-relaxed">{suggestion.reason}</p>
        </div>
      )}

      {/* Task detail */}
      <div className="text-xs text-stone-500 space-y-1">
        {task.min_duration && task.max_duration && (
          <div className="flex justify-between">
            <span>Duration range</span>
            <span className="text-stone-700">{task.min_duration}–{task.max_duration} min</span>
          </div>
        )}
        {task.setup_cost && (
          <div className="flex justify-between">
            <span>Setup cost</span>
            <span className="text-stone-700 capitalize">{task.setup_cost}</span>
          </div>
        )}
        {task.effort_level && (
          <div className="flex justify-between">
            <span>Effort</span>
            <span className="text-stone-700 capitalize">{task.effort_level}</span>
          </div>
        )}
        {suggestion.score > 0 && (
          <div className="flex justify-between">
            <span>Match score</span>
            <span className="text-stone-700">{Math.round(suggestion.score)}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!isAccepted && (
        <div className="flex flex-col gap-2 mt-auto pt-2">
          <button
            className="w-full rounded-lg py-2.5 text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
            onClick={() => onAccept && onAccept(suggestion.id)}
          >
            ✓ Accept
          </button>
          <button
            className="w-full rounded-lg py-2.5 text-sm font-semibold border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            onClick={() => onReject && onReject(suggestion.id)}
          >
            Reject
          </button>
          <button
            className="w-full rounded-lg py-2.5 text-sm font-semibold border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            onClick={() => onReschedule && onReschedule(suggestion)}
          >
            Reschedule
          </button>
          {onEdit && (
            <button
              className="w-full rounded-lg py-2 text-xs text-stone-400 hover:text-stone-600 transition-colors"
              onClick={() => onEdit(suggestion)}
            >
              Edit Suggestion
            </button>
          )}
        </div>
      )}

      {isAccepted && (
        <div className="mt-auto pt-2">
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700 text-center">
            Added to your calendar ✓
          </div>
        </div>
      )}
    </div>
  )
}

function EventPanel({ event }) {
  const startLabel = fmtDateTime(event.start_time)
  const endLabel   = fmtTime(event.end_time)
  const typeLabels = { work: 'Work', focus: 'Focus Block', personal: 'Personal', commute: 'Commute' }

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto">
      {/* Badge */}
      <div>
        <span className="text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">
          {typeLabels[event.event_type] || 'Scheduled Event'}
        </span>
      </div>

      {/* Title */}
      <h2 className="font-serif text-xl text-stone-800 leading-snug">{event.title}</h2>

      {/* Time */}
      <div className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">
        <p className="font-semibold text-stone-700">{startLabel}</p>
        {event.end_time && <p className="text-stone-500">until {endLabel}</p>}
      </div>

      {/* Location */}
      {event.location && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Location</p>
          <p className="text-sm text-stone-600">{event.location}</p>
        </div>
      )}

      {/* Description */}
      {event.description && (
        <div>
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">Notes</p>
          <p className="text-sm text-stone-600 leading-relaxed">{event.description}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2 mt-auto pt-2">
        <button
          className="w-full rounded-lg py-2.5 text-sm font-semibold bg-stone-800 text-white hover:bg-stone-900 transition-colors"
          onClick={() => {}}
        >
          Open in Google Calendar
        </button>
        <button
          className="w-full rounded-lg py-2.5 text-sm font-semibold border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
          onClick={() => {}}
        >
          Remove from Calendar
        </button>
      </div>
    </div>
  )
}
