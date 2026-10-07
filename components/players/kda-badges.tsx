import React from 'react'

export function KDaBadges({
  positiveGames,
  negativeGames,
  size = 'sm',
}: {
  positiveGames: number
  negativeGames: number
  size?: 'sm' | 'md'
}) {
  if (positiveGames === 0 && negativeGames === 0) return null

  const wrapperClass = size === 'sm' ? 'gap-1' : 'gap-1.5'
  const textClass =
    size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  return (
    <div className={`flex ${wrapperClass} items-center cursor-default`}>
      {positiveGames > 0 && (
        <div className="group relative flex items-center justify-center">
          <span
            className={`rounded-full border border-green-600/50 bg-green-900/40 font-semibold text-green-400 ${textClass}`}
          >
            ▲ {positiveGames}
          </span>
          <div className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            Salió positivo en {positiveGames} partidas (kills &gt; deaths)
          </div>
        </div>
      )}
      {negativeGames > 0 && (
        <div className="group relative flex items-center justify-center">
          <span
            className={`rounded-full border border-red-600/50 bg-red-900/40 font-semibold text-red-400 ${textClass}`}
          >
            ▼ {negativeGames}
          </span>
          <div className="pointer-events-none absolute -top-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-xs text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
            Salió negativo en {negativeGames} partidas (deaths &gt; kills)
          </div>
        </div>
      )}
    </div>
  )
}
