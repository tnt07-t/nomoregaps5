// STATUS: complete
// Step 2 — "Audio Journeys": podcast suggestions toggle + Spotify connect (future)
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StepDots from '../components/StepDots'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth'

export default function OnboardingAudio() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [enabled, setEnabled] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleContinue() {
    setSaving(true)
    try {
      await api.put(`/preferences/?user_id=${userId}`, { enable_podcasts: enabled })
    } catch (e) {
      // non-fatal
    }
    navigate('/onboarding/goals')
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
      <StepDots current={2} />

      {/* Decorative circle */}
      <div className="absolute w-[420px] h-[420px] rounded-full border border-stone-200 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-xs px-4">
        {/* Headphones icon */}
        <div className="mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#C4A882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
            <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
          </svg>
        </div>

        <h1 className="text-2xl font-serif text-stone-800 mb-2">Audio Journeys</h1>
        <p className="text-sm text-stone-500 mb-8 leading-relaxed">
          Enable podcast suggestions for longer gaps. Listen and learn while you commute or rest.
        </p>

        {/* Toggle */}
        <div className="flex items-center gap-4 mb-6">
          <span className={`text-sm ${!enabled ? 'text-stone-700 font-medium' : 'text-stone-400'}`}>Disabled</span>
          <button
            onClick={() => setEnabled(v => !v)}
            className={`relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
              enabled ? 'bg-emerald-500' : 'bg-stone-300'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                enabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
          <span className={`text-sm ${enabled ? 'text-stone-700 font-medium' : 'text-stone-400'}`}>Enabled</span>
        </div>

        {/* Spotify button — enabled state */}
        <button
          disabled={!enabled}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium mb-1 transition-all ${
            enabled
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 cursor-pointer'
              : 'bg-emerald-200 text-emerald-400 cursor-not-allowed'
          }`}
        >
          {/* Music note icon */}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
          Connect Spotify Account
        </button>
        <p className="text-xs text-stone-400 mb-8">Required for deep-linking episodes.</p>

        {/* Actions */}
        <div className="w-full flex gap-3">
          <button
            onClick={() => navigate('/onboarding/goals')}
            className="flex-1 py-3 rounded-lg border border-stone-300 text-stone-600 text-sm font-medium hover:bg-stone-100 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={handleContinue}
            disabled={saving}
            className="flex-1 py-3 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
