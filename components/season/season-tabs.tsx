'use client'

import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export type SeasonTabOption = {
  value: string
  label: string
  /** Texto chico al lado del label (ej. "En curso", cantidad de partidas). */
  hint?: string
}

/** Selector segmentado con indicador animado. `layoutId` debe ser único por instancia. */
export function SeasonTabs({
  options,
  value,
  onChange,
  layoutId,
  className,
  ariaLabel = 'Temporada',
}: {
  options: SeasonTabOption[]
  value: string
  onChange: (value: string) => void
  layoutId: string
  className?: string
  ariaLabel?: string
}) {
  return (
    <div
      className={cn('inline-flex w-fit max-w-full items-center gap-0.5 overflow-x-auto rounded-full border border-border bg-card p-1', className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'relative flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors',
              active ? 'text-white' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-full bg-primary shadow-[0_0_16px_-4px_rgba(149,12,66,0.9)]"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">{option.label}</span>
            {option.hint && (
              <span className={cn('relative font-normal normal-case tracking-normal', active ? 'text-white/75' : 'text-muted-foreground/70')}>
                {option.hint}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
