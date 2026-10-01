'use client'

import { motion } from 'motion/react'
import { Flame, Snowflake } from 'lucide-react'
import { formatElo, type BalanceOption, type TeamSummary } from '@/lib/teamBalancer'
import { FaceitLevel } from '@/components/faceit/faceit-bits'
import { cn } from '@/lib/utils'
import { TEAM_TONES } from './team-ui'

const VERDICT_STYLES = {
  good: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  warn: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  bad: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
} as const

/** Chance de victoria de cada equipo, a los lados, con el veredicto en el medio. */
export function MatchupHeader({
  option,
  optionIndex,
  optionCount,
}: {
  option: BalanceOption
  optionIndex: number
  optionCount: number
}) {
  const [t1, t2] = option.teams
  const p1 = Math.round(t1.winProb * 100)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/20">
      <div className="grid grid-cols-2 items-center gap-x-3 gap-y-4 p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1fr)] sm:gap-x-6 sm:p-5">
        <TeamHead team={t1} pct={p1} tone={0} />

        <div className="order-last col-span-2 flex flex-col items-center gap-2 sm:order-none sm:col-span-1">
          <span
            className={cn(
              'rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em]',
              VERDICT_STYLES[option.verdict.tone],
            )}
          >
            {option.verdict.label}
          </span>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted/50" role="img" aria-label={`Equipo 1 ${p1}%, Equipo 2 ${100 - p1}%`}>
            <motion.span
              className={cn('h-full', TEAM_TONES[0].bar)}
              initial={{ width: '50%' }}
              animate={{ width: `${p1}%` }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            />
            <span className="h-full w-0.5 bg-card" />
            <span className={cn('h-full flex-1', TEAM_TONES[1].bar)} />
          </div>
          <span className="text-center text-[11px] text-muted-foreground">
            Chance de ganar · opción {optionIndex + 1} de {optionCount}
          </span>
        </div>

        <TeamHead team={t2} pct={100 - p1} tone={1} />
      </div>
    </section>
  )
}

function TeamHead({ team, pct, tone }: { team: TeamSummary; pct: number; tone: 0 | 1 }) {
  const right = tone === 1
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', right && 'items-end text-right')}>
      <span className={cn('font-heading text-[12px] font-bold uppercase tracking-[0.22em]', TEAM_TONES[tone].text)}>
        {team.name}
      </span>
      <span className="font-mono text-4xl font-black leading-none tabular-nums text-foreground sm:text-5xl">
        {pct}
        <span className="text-xl text-muted-foreground sm:text-2xl">%</span>
      </span>
      <span className={cn('mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground', right && 'flex-row-reverse')}>
        <FaceitLevel level={team.avgLevel} size={18} />
        <span className="font-mono tabular-nums">{formatElo(team.avgElo)} elo</span>
      </span>
      <span className={cn('flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground', right && 'justify-end')}>
        <span>
          Poder <span className="font-mono font-semibold text-foreground">{team.avgPower.toFixed(1)}</span>
        </span>
        {team.hot.length > 0 && (
          <span className="flex items-center gap-0.5 text-orange-400" title={`En racha: ${team.hot.map((p) => p.stats.player.name).join(', ')}`}>
            <Flame className="h-3 w-3" aria-hidden="true" />
            {team.hot.length}
          </span>
        )}
        {team.cold.length > 0 && (
          <span className="flex items-center gap-0.5 text-cyan-400" title={`En mala racha: ${team.cold.map((p) => p.stats.player.name).join(', ')}`}>
            <Snowflake className="h-3 w-3" aria-hidden="true" />
            {team.cold.length}
          </span>
        )}
      </span>
    </div>
  )
}
