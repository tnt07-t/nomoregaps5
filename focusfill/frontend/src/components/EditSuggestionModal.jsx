import React, { useState } from 'react'

export default function EditSuggestionModal({ suggestion, onClose, onSave }) {
  const task  = suggestion?.task  || {}
  const block = suggestion?.time_block || {}

  const [title,    setTitle]    = useState(task.title || '')
  const [duration, setDuration] = useState(block.duration_minutes || 30)

  function handleSave() {
    onSave && onSave({ title, duration_minutes: duration })
    onClose()
  }

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
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-serif text-lg text-stone-800">Edit Suggestion</h2>
          <button
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 text-stone-400 hover:text-stone-600 transition-colors"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {/* Task title */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
            Task Title
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
            placeholder="Task name"
          />
        </div>

        {/* Duration */}
        <div className="mb-6">
          <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1.5">
            Duration
          </label>
          <div className="flex items-center gap-3">
            <button
              className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 text-lg font-bold leading-none"
              onClick={() => setDuration(d => Math.max(5, d - 5))}
            >−</button>
            <input
              type="number"
              value={duration}
              onChange={e => setDuration(Math.max(5, parseInt(e.target.value) || 5))}
              className="w-16 text-center rounded-lg border border-stone-200 px-2 py-1.5 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-stone-300"
              min={5}
              max={240}
            />
            <button
              className="w-8 h-8 rounded-full border border-stone-200 flex items-center justify-center text-stone-600 hover:bg-stone-50 text-lg font-bold leading-none"
              onClick={() => setDuration(d => Math.min(240, d + 5))}
            >+</button>
            <span className="text-sm text-stone-500">minutes</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold border border-stone-200 text-stone-600 hover:bg-stone-50 transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 rounded-lg py-2.5 text-sm font-semibold bg-stone-800 text-white hover:bg-stone-900 transition-colors"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
