import React from 'react'

const CATEGORY_COLORS = {
  Career:      'border-blue-400 bg-blue-50 text-blue-800',
  Learning:    'border-green-400 bg-green-50 text-green-800',
  Health:      'border-orange-400 bg-orange-50 text-orange-800',
  'Life Admin':'border-purple-400 bg-purple-50 text-purple-800',
}

function fmt(dtStr) {
  if (!dtStr) return ''
  const d = new Date(dtStr)
  let h = d.getHours(), m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function SuggestionBlock({ suggestion, style, onClick, onAccept, onReject, isSelected }) {
  const task = suggestion.task || {}
  const block = suggestion.time_block || {}
  const category = task.category || 'Career'
  const colorClass = CATEGORY_COLORS[category] || CATEGORY_COLORS.Career
  const durationMin = block.duration_minutes || 30

  if (suggestion.status === 'rejected') return null
  if (suggestion.status === 'accepted') {
    // Render as a solid accepted block
    return (
      <div
        className={`absolute rounded-md border-2 px-1.5 py-0.5 overflow-hidden select-none cursor-pointer z-10
          ${colorClass.replace('bg-', 'bg-').replace('50', '200')}
          ${isSelected ? 'ring-2 ring-stone-500 ring-offset-1 z-20' : ''}
        `}
        style={style}
        onClick={() => onClick && onClick(suggestion)}
        title={task.title}
      >
        <p className="text-xs font-semibold leading-tight truncate">✓ {task.title}</p>
        {durationMin >= 25 && (
          <p className="text-xs opacity-70 leading-tight">{durationMin}m · {category}</p>
        )}
      </div>
    )
  }

  return (
    <div
      className={`absolute rounded-md border-2 border-dashed px-1.5 py-0.5 overflow-hidden select-none cursor-pointer
        z-10
        ${colorClass}
        ${isSelected ? 'ring-2 ring-stone-500 ring-offset-1 z-20' : ''}
      `}
      style={style}
      onClick={() => onClick && onClick(suggestion)}
      title={`Suggested: ${task.title} (${durationMin}m)`}
    >
      <>
        <p className="text-xs font-semibold leading-tight truncate">{task.title || 'Suggested Task'}</p>
        {durationMin >= 20 && (
          <p className="text-xs opacity-70 leading-tight truncate">{durationMin}m · {category}</p>
        )}
      </>
    </div>
  )
}
