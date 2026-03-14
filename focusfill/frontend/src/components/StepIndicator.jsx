/**
 * StepIndicator - thin progress dots shown at the top of onboarding cards.
 * step: current step (1-indexed)
 * total: total steps
 */
export default function StepIndicator({ step, total = 4 }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => {
        const isComplete = i + 1 < step
        const isCurrent = i + 1 === step

        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`rounded-full transition-all duration-300 ${
                isCurrent
                  ? 'w-6 h-2 bg-stone-700'
                  : isComplete
                  ? 'w-2 h-2 bg-stone-400'
                  : 'w-2 h-2 bg-stone-200'
              }`}
            />
          </div>
        )
      })}
    </div>
  )
}
