import React from 'react'

const TYPE_STYLES = {
  work:     'bg-stone-200 border-stone-400 text-stone-800',
  focus:    'bg-teal-100 border-teal-400 text-teal-900',
  personal: 'bg-green-100 border-green-400 text-green-900',
  commute:  'bg-amber-100 border-amber-400 text-amber-900',
}

function fmt(dtStr) {
  if (!dtStr) return ''
  const d = new Date(dtStr)
  let h = d.getHours(), m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

export default function EventBlock({ event, style, onClick, isSelected }) {
  const typeKey = event.event_type || 'work'
  const colorClass = TYPE_STYLES[typeKey] || TYPE_STYLES.work
  const durationMin = Math.round(
    (new Date(event.end_time) - new Date(event.start_time)) / 60000
  )

  return (
    <div
      className={`absolute rounded-md border px-1.5 py-0.5 cursor-pointer overflow-hidden select-none transition-all
        ${colorClass}
        ${isSelected ? 'ring-2 ring-stone-500 ring-offset-1 z-20' : 'hover:brightness-95 z-10'}
      `}
      style={style}
      onClick={() => onClick && onClick(event)}
      title={`${event.title}\n${fmt(event.start_time)} – ${fmt(event.end_time)}`}
    >
      <p className="text-xs font-semibold leading-tight truncate">{event.title}</p>
      {durationMin >= 30 && (
        <p className="text-xs opacity-70 leading-tight truncate">
          {fmt(event.start_time)} – {fmt(event.end_time)}
        </p>
      )}
    </div>
  )
}
