import React from 'react'

function fmtTime(dtStr) {
  if (!dtStr) return ''
  const d = new Date(dtStr)
  let h = d.getHours(), m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtDayLabel(dtStr) {
  if (!dtStr) return ''
  const d = new Date(dtStr)
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`
}

export default function RescheduleModal({ suggestion, availableBlocks = [], onClose, onSelect }) {
  const task  = suggestion?.task  || {}
  const block = suggestion?.time_block || {}
  const durationMin = block.duration_minutes || 30

  // Group available blocks by day label
  const byDay = {}
  availableBlocks.forEach(b => {
    const label = fmtDayLabel(b.start_time)
    if (!byDay[label]) byDay[label] = []
    byDay[label].push(b)
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.3)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-lg text-stone-800">Reschedule Suggestion</h2>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <p className="text-sm text-stone-500 mb-4">
          Select an available time slot to move{' '}
          <span className="font-medium text-stone-700">'{task.title}'</span>{' '}
          ({durationMin}m)
        </p>

        {/* Slots grouped by day */}
        <div className="space-y-4 max-h-72 overflow-y-auto">
          {Object.keys(byDay).length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">No other available slots this week.</p>
          ) : (
            Object.entries(byDay).map(([dayLabel, blocks]) => (
              <div key={dayLabel}>
                <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">{dayLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {blocks.map(b => (
                    <button
                      key={b.id}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-stone-200 text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition-colors"
                      onClick={() => { onSelect && onSelect(b); onClose() }}
                    >
                      {fmtTime(b.start_time)}
                      {b.duration_minutes && <span className="ml-1 text-stone-400">({b.duration_minutes}m)</span>}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cancel */}
        <div className="mt-5">
          <button
            className="w-full rounded-lg py-2.5 text-sm font-semibold border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
