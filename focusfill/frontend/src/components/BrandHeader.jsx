/**
 * BrandHeader - pencil icon + "TimeFiller" + "RECLAIM YOUR DAY"
 */
export default function BrandHeader() {
  return (
    <div className="flex flex-col items-center gap-1 mb-6">
      {/* Pencil / Edit icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="w-6 h-6 text-stone-500 mb-1"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
        />
      </svg>

      <h1 className="font-serif text-3xl text-stone-800 tracking-tight leading-none">
        TimeFiller
      </h1>
      <p className="text-xs text-stone-400 tracking-[0.3em] uppercase font-medium">
        Reclaim Your Day
      </p>
    </div>
  )
}
