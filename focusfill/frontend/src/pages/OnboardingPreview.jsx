// STATUS: complete
// Step 4 — "Your week, curated": mini calendar preview then "Looks good. Start."
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StepDots from '../components/StepDots'
import { api } from '../utils/api'
import { useAuth } from '../hooks/useAuth'

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// Generate a deterministic-ish scatter of suggestion blocks across the week grid
// In real app this comes from the suggestion engine; here we show a preview mock
function generatePreviewBlocks(goals) {
  const blocks = []
  const colors = ['#C8D8C8', '#D4C8B8', '#C8C8D4', '#D4D4C8']
  // Each goal gets 2-3 blocks scattered across days/rows
  goals.forEach((g, gi) => {
    const label = (g.title || 'Task').split(' ')[0]
    const color = colors[gi % colors.length]
    const dayPattern = [[0, 0], [2, 1], [4, 0], [6, 1], [1, 2], [3, 0], [5, 1]]
    const picks = dayPattern.filter((_, i) => i % Math.max(1, goals.length) === gi % Math.max(1, goals.length))
    picks.slice(0, 3).forEach(([d, r]) => {
      blocks.push({ day: d, row: r, label, color })
    })
  })
  // Always show a few blocks even with no goals
  if (blocks.length === 0) {
    blocks.push({ day: 0, row: 0, label: 'Chess', color: '#C8D8C8' })
    blocks.push({ day: 2, row: 1, label: 'Chess', color: '#C8D8C8' })
    blocks.push({ day: 4, row: 0, label: 'Chess', color: '#C8D8C8' })
    blocks.push({ day: 6, row: 1, label: 'Chess', color: '#C8D8C8' })
  }
  return blocks
}

export default function OnboardingPreview() {
  const navigate = useNavigate()
  const { userId } = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        if (!userId) {
          setGoals([])
          return
        }
        const data = await api.getGoals(userId)
        setGoals(data || [])
      } catch (_) { setGoals([]) }
      finally { setLoading(false) }
    }
    load()
  }, [userId])

  const blocks = generatePreviewBlocks(goals)

  // Build a 3-row × 7-col grid
  const grid = Array.from({ length: 3 }, () => Array(7).fill(null))
  blocks.forEach(b => {
    if (b.row < 3 && b.day < 7) grid[b.row][b.day] = b
  })

  function handleStart() {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F5F0E8' }}>
      <StepDots current={4} />

      {/* Decorative circle */}
      <div className="absolute w-[460px] h-[460px] rounded-full border border-stone-200 pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center text-center w-full max-w-sm px-4">
        {/* Calendar check icon */}
        <div className="mb-5">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7A9E7E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
            <polyline points="9 16 11 18 15 14" />
          </svg>
        </div>

        <h1 className="text-2xl font-serif text-stone-800 mb-2">Your week, curated</h1>
        <p className="text-sm text-stone-500 mb-6 leading-relaxed">
          We've analyzed your calendar and filled the gaps with your new goals.
        </p>

        {/* Mini calendar grid */}
        {loading ? (
          <div className="w-full h-32 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-stone-300 border-t-stone-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-full bg-white/60 rounded-xl border border-stone-200 p-3 mb-6">
            {/* Header row */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS.map((d, i) => (
                <div key={i} className="text-center text-[10px] font-medium text-stone-400">{d}</div>
              ))}
            </div>
            {/* Data rows */}
            {grid.map((row, ri) => (
              <div key={ri} className="grid grid-cols-7 gap-1 mb-1">
                {row.map((cell, ci) => (
                  <div
                    key={ci}
                    className="h-7 rounded text-[9px] font-medium flex items-center justify-center overflow-hidden"
                    style={cell ? { backgroundColor: cell.color, color: '#555' } : { backgroundColor: 'transparent' }}
                  >
                    {cell ? cell.label : ''}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleStart}
          className="w-full py-3 rounded-lg bg-stone-900 text-white text-sm font-medium hover:bg-stone-800 transition-colors"
        >
          Looks good. Start.
        </button>
      </div>
    </div>
  )
}
