'use client'

import { Stagger, StaggerItem } from '@/components/motion/reveal'
import AnimatedNumber from '@/components/ui/animated-number'

export type StripStat = { label: string; value: number | string; hint?: string }

/** Fila de cifras clave de una temporada. */
export function SeasonStatStrip({ stats }: { stats: StripStat[] }) {
  return (
    <Stagger className="grid grid-cols-2 gap-2.5 sm:grid-cols-4" immediate stagger={0.07}>
      {stats.map((stat) => (
        <StaggerItem key={stat.label} className="rounded-xl border border-border bg-card/80 p-3.5 backdrop-blur-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</p>
          <p className="mt-1 truncate font-mono text-2xl font-bold text-foreground">
            {typeof stat.value === 'number' ? <AnimatedNumber value={stat.value} /> : stat.value}
          </p>
          {stat.hint && <p className="truncate text-[11px] text-muted-foreground">{stat.hint}</p>}
        </StaggerItem>
      ))}
    </Stagger>
  )
}
