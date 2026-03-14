// STATUS: complete
// Step 1 — "Set the pace": user picks transition buffer (5 or 10 min)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepDots from '../components/StepDots'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth'

export default function OnboardingBuffer() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [buffer, setBuffer] = useState(10)
  const [saving, setSaving] = useState(false)

  async function handleContinue() {
    setSaving(true)
    try {
      await api.put(`/preferences/?user_id=${userId}`, { transition_buffer_minutes: buffer })
    } catch (e) {
      // non-fatal — preferences can be saved later
    }
    navigate('/onboarding/audio')
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
      <StepDots current={1} />

      {/* Decorative circle */}
      <div className="absolute w-[420px] h-[420px] rounded-full border border-stone-200 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-xs px-4">
        {/* Clock icon */}
        <div className="mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7A9E7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h1 className="text-2xl font-serif text-stone-800 mb-2">Set the pace</h1>
        <p className="text-sm text-stone-500 mb-8 leading-relaxed">
          How much time do you need to transition between tasks? We'll leave this buffer automatically.
        </p>

        {/* Radio options */}
        <div className="w-full space-y-3 mb-8">
          {[
            { value: 5, label: '5 minutes', sub: 'Quick transitions' },
            { value: 10, label: '10 minutes', sub: 'Relaxed breathing room' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setBuffer(opt.value)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                buffer === opt.value
                  ? 'border-stone-400 bg-stone-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              {/* Radio dot */}
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                buffer === opt.value ? 'border-stone-700' : 'border-stone-300'
              }`}>
                {buffer === opt.value && (
                  <span className="w-2 h-2 rounded-full bg-stone-700" />
                )}
              </span>
              <span>
                <span className="block text-sm font-medium text-stone-800">{opt.label}</span>
                <span className="block text-xs text-stone-400">{opt.sub}</span>
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={handleContinue}
          disabled={saving}
          className="w-full py-3 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
