'use client'

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { BarChart3 } from 'lucide-react'
import { formatRating, type BalanceOption } from '@/lib/teamBalancer'
import { cn } from '@/lib/utils'
import { TEAM_TONES } from './team-ui'

type Row = {
  label: string
  left: ReactNode
  right: ReactNode
  /** Valores a comparar (más alto = mejor). */
  a: number
  b: number
  /** Para valores que pueden ser negativos: la barra se mueve según la diferencia sobre este rango. */
  range?: number
}

/** Los dos equipos lado a lado, métrica por métrica. */
export function TeamComparison({ option, sourceLabel }: { option: BalanceOption; sourceLabel: string }) {
  const [t1, t2] = option.teams
  const p1 = Math.round(t1.winProb * 100)
  const duo = (team: typeof t1) =>
    team.bestDuo ? `${team.bestDuo.a.stats.player.name} + ${team.bestDuo.b.stats.player.name}` : '—'

  const xplayRow = (label: string, a: number | null, b: number | null, format: (v: number) => string): Row => ({
    label,
    left: a === null ? '—' : format(a),
    right: b === null ? '—' : format(b),
    a: a ?? 0,
    b: b ?? 0,
  })

  const rows: Row[] = [
    { label: 'Chance de ganar', left: `${p1}%`, right: `${100 - p1}%`, a: p1, b: 100 - p1 },
    {
      label: 'Rating Xplay',
      left: formatRating(t1.avgRating),
      right: formatRating(t2.avgRating),
      a: t1.avgRating - t2.avgRating,
      b: 0,
      range: 0.2,
    },
    xplayRow('ADR', t1.adr, t2.adr, (v) => String(Math.round(v))),
    xplayRow('KAST', t1.kast, t2.kast, (v) => `${Math.round(v)}%`),
    { label: 'KDA', left: t1.kda.toFixed(2), right: t2.kda.toFixed(2), a: t1.kda, b: t2.kda },
    {
      label: 'Forma (últimas 5)',
      left: `${t1.recentWins}V–${t1.recentLosses}D`,
      right: `${t2.recentWins}V–${t2.recentLosses}D`,
      a: t1.formSum,
      b: t2.formSum,
      range: 5,
    },
    { label: 'Química', left: duo(t1), right: duo(t2), a: t1.synergy, b: t2.synergy, range: 1 },
  ]

  return (
    <section className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300">
          <BarChart3 className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">
            Equipo contra equipo
          </h2>
          <span className="text-[11px] text-muted-foreground">Promedios de los 5 · según {sourceLabel}</span>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-border/60 bg-black/10 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]">
        <span className={TEAM_TONES[0].text}>{t1.name}</span>
        <span />
        <span className={cn('text-right', TEAM_TONES[1].text)}>{t2.name}</span>
      </div>

      <ul className="flex flex-1 flex-col justify-around">
        {rows.map((row, i) => (
          <ComparisonRow key={row.label} row={row} index={i} />
        ))}
      </ul>
    </section>
  )
}

function ComparisonRow({ row, index }: { row: Row; index: number }) {
  const share =
    row.range !== undefined
      ? 0.5 + Math.max(-0.5, Math.min(0.5, (row.a - row.b) / (2 * row.range)))
      : row.a + row.b > 0
        ? row.a / (row.a + row.b)
        : 0.5
  const leader = Math.abs(row.a - row.b) < 1e-6 ? null : row.a > row.b ? 0 : 1

  return (
    <li className="flex flex-col gap-1 border-b border-border/40 px-4 py-2 last:border-b-0">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <span
          className={cn(
            'truncate font-mono text-[12px] font-bold tabular-nums',
            leader === 0 ? TEAM_TONES[0].text : 'text-foreground/80',
          )}
        >
          {row.left}
        </span>
        <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{row.label}</span>
        <span
          className={cn(
            'truncate text-right font-mono text-[12px] font-bold tabular-nums',
            leader === 1 ? TEAM_TONES[1].text : 'text-foreground/80',
          )}
        >
          {row.right}
        </span>
      </div>
      <div className="flex h-1 overflow-hidden rounded-full bg-muted/40">
        <motion.span
          className={cn('h-full opacity-70', TEAM_TONES[0].bar)}
          initial={{ width: '50%' }}
          animate={{ width: `${share * 100}%` }}
          transition={{ duration: 0.6, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
        />
        <span className="h-full w-px bg-card" />
        <span className={cn('h-full flex-1 opacity-70', TEAM_TONES[1].bar)} />
      </div>
    </li>
  )
}
