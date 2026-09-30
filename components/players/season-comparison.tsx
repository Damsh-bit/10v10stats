'use client'

import { ArrowDownRight, ArrowUpRight, GitCompareArrows, Minus } from 'lucide-react'
import type { ComparableMetric } from '@/lib/season-stats'
import { cn } from '@/lib/utils'

function format(value: number | null, decimals: number, suffix = '') {
  if (value === null) return '—'
  return `${value.toFixed(decimals)}${suffix}`
}

function shortName(name: string) {
  return name.replace(/^Season\s*/i, 'S')
}

/** Comparación "temporada actual vs anterior", compacta para una columna angosta. */
export function SeasonComparison({
  metrics,
  currentLabel,
  previousLabel,
  currentRank,
  previousRank,
}: {
  metrics: ComparableMetric[]
  currentLabel: string
  previousLabel: string
  currentRank: string
  previousRank: string
}) {
  const hasCurrent = metrics.some((m) => m.key !== 'matches' && m.current !== null)
  const hasPrevious = metrics.some((m) => m.key !== 'matches' && m.previous !== null)
  const cols = 'grid grid-cols-[minmax(0,1fr)_3.25rem_3.25rem_4rem] items-center gap-x-2'

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2.5 border-b border-border px-3 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
          <GitCompareArrows className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-sm font-bold uppercase leading-tight tracking-widest text-foreground">
            {shortName(currentLabel)} vs {shortName(previousLabel)}
          </h2>
          <p className="truncate text-[11px] text-muted-foreground">Cómo viene respecto a la temporada pasada</p>
        </div>
      </header>

      {!hasPrevious && !hasCurrent ? (
        <p className="px-3 py-5 text-center text-[12px] text-muted-foreground">Sin partidas en ninguna de las dos temporadas.</p>
      ) : (
        <div className="enter-stagger text-[12px]">
          <div className={cn(cols, 'border-b border-border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted-foreground')}>
            <span>Métrica</span>
            <span className="text-right">{shortName(previousLabel)}</span>
            <span className="text-right">{shortName(currentLabel)}</span>
            <span className="text-right">Cambio</span>
          </div>

          <div className={cn(cols, 'border-b border-border/60 bg-black/10 px-3 py-1.5')}>
            <span className="text-foreground">Puesto</span>
            <span className="text-right font-mono text-muted-foreground">{previousRank}</span>
            <span className="text-right font-mono font-semibold text-foreground">{currentRank}</span>
            <span />
          </div>

          {metrics.map((metric) => {
            const canCompare = metric.current !== null && metric.previous !== null && metric.key !== 'matches'
            const diff = canCompare ? (metric.current as number) - (metric.previous as number) : 0
            const threshold = metric.decimals === 0 ? 0.5 : 0.5 * 10 ** -metric.decimals
            const neutral = !canCompare || Math.abs(diff) < threshold
            const better = metric.lowerIsBetter ? diff < 0 : diff > 0

            return (
              <div key={metric.key} className={cn(cols, 'border-b border-border/60 px-3 py-1.5 last:border-b-0')}>
                <span className="truncate text-foreground">{metric.label}</span>
                <span className="text-right font-mono text-muted-foreground">
                  {format(metric.previous, metric.decimals, metric.suffix)}
                </span>
                <span className="text-right font-mono font-semibold text-foreground">
                  {format(metric.current, metric.decimals, metric.suffix)}
                </span>
                {canCompare ? (
                  <span
                    className={cn(
                      'ml-auto flex w-fit items-center gap-0.5 rounded px-1 py-0.5 font-mono text-[11px] font-bold',
                      neutral ? 'bg-muted/40 text-muted-foreground' : better ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400',
                    )}
                  >
                    {neutral ? (
                      <Minus className="h-3 w-3" aria-hidden="true" />
                    ) : diff > 0 ? (
                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                    )}
                    {neutral ? '0' : `${diff > 0 ? '+' : '−'}${Math.abs(diff).toFixed(metric.decimals)}`}
                  </span>
                ) : (
                  <span className="text-right text-muted-foreground/60">—</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {!hasCurrent && hasPrevious && (
        <p className="border-t border-border bg-amber-300/5 px-3 py-2 text-center text-[11px] text-amber-100/80">
          Todavía no jugó en la {currentLabel}. Estos son los números a superar.
        </p>
      )}
    </section>
  )
}
