'use client'

import { motion } from 'motion/react'
import { ArrowDownRight, ArrowUpRight, GitCompareArrows, Minus } from 'lucide-react'
import type { ComparableMetric } from '@/lib/season-stats'
import { cn } from '@/lib/utils'

function format(value: number | null, decimals: number, suffix = '') {
  if (value === null) return '—'
  return `${value.toFixed(decimals)}${suffix}`
}

/** Tabla "temporada actual vs anterior" con la variación de cada métrica. */
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

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
            <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">
              {currentLabel} vs {previousLabel}
            </h2>
            <p className="text-[11px] text-muted-foreground">Cómo viene rindiendo respecto a la temporada pasada</p>
          </div>
        </div>
      </header>

      {!hasPrevious && !hasCurrent ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">Sin partidas en ninguna de las dos temporadas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <th className="px-4 py-2 font-semibold">Métrica</th>
                <th className="px-3 py-2 text-right font-semibold">{previousLabel}</th>
                <th className="px-3 py-2 text-right font-semibold">{currentLabel}</th>
                <th className="px-4 py-2 text-right font-semibold">Cambio</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border/60 bg-black/10">
                <td className="px-4 py-2 text-[13px] text-foreground">Puesto</td>
                <td className="px-3 py-2 text-right font-mono text-[13px] text-muted-foreground">{previousRank}</td>
                <td className="px-3 py-2 text-right font-mono text-[13px] font-semibold text-foreground">{currentRank}</td>
                <td className="px-4 py-2" />
              </tr>
              {metrics.map((metric, i) => {
                const canCompare = metric.current !== null && metric.previous !== null && metric.key !== 'matches'
                const diff = canCompare ? (metric.current as number) - (metric.previous as number) : 0
                const threshold = metric.decimals === 0 ? 0.5 : 0.5 * 10 ** -metric.decimals
                const neutral = !canCompare || Math.abs(diff) < threshold
                const better = metric.lowerIsBetter ? diff < 0 : diff > 0

                return (
                  <motion.tr
                    key={metric.key}
                    initial={{ opacity: 0, x: -8 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: i * 0.04 }}
                    className="border-b border-border/60 last:border-b-0"
                  >
                    <td className="px-4 py-2 text-[13px] text-foreground">{metric.label}</td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] text-muted-foreground">
                      {format(metric.previous, metric.decimals, metric.suffix)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-[13px] font-semibold text-foreground">
                      {format(metric.current, metric.decimals, metric.suffix)}
                    </td>
                    <td className="px-4 py-2">
                      {canCompare ? (
                        <span
                          className={cn(
                            'ml-auto flex w-fit items-center gap-0.5 rounded-md px-1.5 py-0.5 font-mono text-[12px] font-bold',
                            neutral
                              ? 'bg-muted/40 text-muted-foreground'
                              : better
                                ? 'bg-emerald-500/15 text-emerald-400'
                                : 'bg-rose-500/15 text-rose-400',
                          )}
                        >
                          {neutral ? (
                            <Minus className="h-3 w-3" aria-hidden="true" />
                          ) : diff > 0 ? (
                            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
                          )}
                          {neutral ? '0' : `${diff > 0 ? '+' : '−'}${Math.abs(diff).toFixed(metric.decimals)}${metric.suffix ?? ''}`}
                        </span>
                      ) : (
                        <span className="block text-right text-[12px] text-muted-foreground/60">—</span>
                      )}
                    </td>
                  </motion.tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!hasCurrent && hasPrevious && (
        <p className="border-t border-border bg-amber-300/5 px-4 py-2.5 text-center text-[12px] text-amber-100/80">
          Todavía no jugó en la {currentLabel}. Estos son los números a superar.
        </p>
      )}
    </section>
  )
}
