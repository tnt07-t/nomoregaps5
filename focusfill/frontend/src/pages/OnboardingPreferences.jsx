import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth'
import StepIndicator from '../components/StepIndicator'
import BrandHeader from '../components/BrandHeader'

// ─── Hour options for work start/end ─────────────────────────────────────────
function formatHour(h) {
  if (h === 0) return '12:00 AM'
  if (h === 12) return '12:00 PM'
  if (h < 12) return `${h}:00 AM`
  return `${h - 12}:00 PM`
}

const HOURS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: formatHour(i) }))

// ─── Toggle button group helper ───────────────────────────────────────────────
function ButtonGroup({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
            value === opt.value
              ? 'border-stone-700 bg-stone-700 text-white'
              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-400'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Toggle switch ────────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, sublabel }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-stone-700">{label}</p>
        {sublabel && <p className="text-xs text-stone-400 mt-0.5">{sublabel}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
          checked ? 'bg-stone-700' : 'bg-stone-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

// ─── Auto task checkbox row ───────────────────────────────────────────────────
function AutoTaskRow({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          checked ? 'bg-stone-700 border-stone-700' : 'border-stone-300 bg-white'
        }`}
      >
        {checked && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-sm text-stone-600">{label}</span>
    </label>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OnboardingPreferences() {
  const navigate = useNavigate()
  const { userId } = useAuth()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Preference state
  const [buffer, setBuffer] = useState(10)
  const [minGap, setMinGap] = useState(15)
  const [maxGap, setMaxGap] = useState(90)
  const [workStart, setWorkStart] = useState(8)
  const [workEnd, setWorkEnd] = useState(22)
  const [enablePodcasts, setEnablePodcasts] = useState(false)

  // Auto tasks
  const [autoTasks, setAutoTasks] = useState({
    emails: true,
    reviewTasks: true,
    tidyDesk: true,
  })

  const handleContinue = async () => {
    setSaving(true)
    setError(null)

    try {
      await api.updatePreferences(userId, {
        transition_buffer_minutes: buffer,
        min_gap_minutes: minGap,
        max_gap_minutes: maxGap,
        work_start_hour: workStart,
        work_end_hour: workEnd,
        enable_podcasts: enablePodcasts,
      })

      navigate('/onboarding/goals')
    } catch (err) {
      setError(err.message || 'Failed to save preferences')
      setSaving(false)
    }
  }

  const bufferOptions = [
    { value: 5, label: '5 min' },
    { value: 10, label: '10 min' },
  ]

  const minGapOptions = [
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
    { value: 20, label: '20 min' },
    { value: 30, label: '30 min' },
  ]

  const maxGapOptions = [
    { value: 45, label: '45 min' },
    { value: 60, label: '60 min' },
    { value: 90, label: '90 min' },
    { value: 120, label: '120 min' },
  ]

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden py-8"
      style={{ backgroundColor: '#F4EFE6' }}
    >
      {/* Decorative circle */}
      <div
        className="absolute -left-32 top-1/3 w-80 h-80 rounded-full opacity-40 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#D6CFC4' }}
      />
      <div
        className="absolute -right-16 bottom-16 w-64 h-64 rounded-full opacity-30 blur-3xl pointer-events-none"
        style={{ backgroundColor: '#C8BFB0' }}
      />

      <div className="relative z-10 w-full max-w-lg mx-4">
        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 px-10 py-10">
          {/* Step indicator */}
          <StepIndicator step={2} total={4} />

          {/* Brand */}
          <BrandHeader />

          {/* Heading */}
          <div className="mb-8 text-center">
            <h2 className="font-serif text-2xl text-stone-800 mb-2">Set your preferences</h2>
            <p className="text-sm text-stone-500">
              Tell us how you like to work so we can find the right moments for you.
            </p>
          </div>

          <div className="space-y-7">
            {/* Transition Buffer */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">
                Transition buffer
              </label>
              <p className="text-xs text-stone-400 mb-3">Time added before and after each meeting.</p>
              <ButtonGroup
                options={bufferOptions}
                value={buffer}
                onChange={setBuffer}
              />
            </div>

            {/* Min gap */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">
                Minimum gap to fill
              </label>
              <p className="text-xs text-stone-400 mb-3">Ignore free slots shorter than this.</p>
              <ButtonGroup
                options={minGapOptions}
                value={minGap}
                onChange={setMinGap}
              />
            </div>

            {/* Max gap */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-1">
                Maximum gap to fill
              </label>
              <p className="text-xs text-stone-400 mb-3">Larger blocks may be left unscheduled.</p>
              <ButtonGroup
                options={maxGapOptions}
                value={maxGap}
                onChange={setMaxGap}
              />
            </div>

            {/* Working hours */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-3">
                Working hours
              </label>
              <div className="flex items-center gap-3">
                <select
                  value={workStart}
                  onChange={(e) => setWorkStart(Number(e.target.value))}
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>
                      From {h.label}
                    </option>
                  ))}
                </select>
                <span className="text-stone-400 text-sm">to</span>
                <select
                  value={workEnd}
                  onChange={(e) => setWorkEnd(Number(e.target.value))}
                  className="flex-1 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-700 bg-white focus:outline-none focus:ring-1 focus:ring-stone-400"
                >
                  {HOURS.map((h) => (
                    <option key={h.value} value={h.value}>
                      Until {h.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Podcast toggle */}
            <div className="border border-stone-100 rounded-xl p-4">
              <Toggle
                checked={enablePodcasts}
                onChange={setEnablePodcasts}
                label="Enable Podcast Suggestions"
                sublabel="Coming soon — Spotify integration"
              />
            </div>

            {/* Auto tasks */}
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-3">
                Automated tasks
              </label>
              <p className="text-xs text-stone-400 mb-3">
                We'll auto-suggest these quick wins to fill small gaps.
              </p>
              <div className="space-y-3">
                <AutoTaskRow
                  label="Check & respond to emails"
                  checked={autoTasks.emails}
                  onChange={(v) => setAutoTasks((prev) => ({ ...prev, emails: v }))}
                />
                <AutoTaskRow
                  label="Review upcoming tasks"
                  checked={autoTasks.reviewTasks}
                  onChange={(v) => setAutoTasks((prev) => ({ ...prev, reviewTasks: v }))}
                />
                <AutoTaskRow
                  label="Tidy desk / quick reset"
                  checked={autoTasks.tidyDesk}
                  onChange={(v) => setAutoTasks((prev) => ({ ...prev, tidyDesk: v }))}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mt-6 rounded-lg p-3 border text-sm"
              style={{ backgroundColor: '#FEF0ED', borderColor: '#F5C6BC', color: '#C0392B' }}
            >
              {error}
            </div>
          )}

          {/* Continue */}
          <button
            onClick={handleContinue}
            disabled={saving}
            className="mt-8 w-full rounded-xl px-6 py-4 text-sm font-semibold text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#3D3530' }}
            onMouseEnter={(e) => { if (!saving) e.target.style.backgroundColor = '#2D2520' }}
            onMouseLeave={(e) => { if (!saving) e.target.style.backgroundColor = '#3D3530' }}
          >
            {saving ? 'Saving…' : 'Continue'}
          </button>
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
