// STATUS: complete
// Step dots shown in top-right corner across all onboarding screens
export default function StepDots({ current, total = 4 }) {
  return (
    <div className="fixed top-6 right-8 flex items-center gap-1.5 z-10">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i + 1 === current
              ? 'w-2 h-2 bg-stone-700'
              : i + 1 < current
              ? 'w-2 h-2 bg-stone-400'
              : 'w-2 h-2 bg-stone-300'
          }`}
        />
      ))}
    </div>
  )
}
