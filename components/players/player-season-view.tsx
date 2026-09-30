'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { PlayerStats } from '@/types'
import type { RecordType } from '@/lib/records'
import { SeasonTabs } from '@/components/season/season-tabs'
import { PlayerMatchHistory, type MatchEntry } from '@/components/players/player-match-history'
import { RecordBadge } from '@/components/players/record-badges'
import { KDaBadges } from '@/components/players/kda-badges'
import AnimatedNumber from '@/components/ui/animated-number'
import { cn } from '@/lib/utils'

export type PlayerScope = {
  key: string
  label: string
  /** Temporada a la que corresponde; null para "Carrera". */
  seasonId: number | null
  isCurrent: boolean
  stats: PlayerStats | null
  rank: number | null
  rankedCount: number
  records: RecordType[]
  isLast: boolean
  nelsons: number
}

function rankLabel(scope: PlayerScope) {
  if (scope.seasonId === null) return null
  if (scope.rank) return `#${scope.rank} de ${scope.rankedCount}`
  return scope.isCurrent ? 'Sin debut' : 'No jugó'
}

const chipClass = 'flex items-center gap-1 rounded border bg-[#101010] px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest'

export function PlayerSeasonView({
  scopes,
  history,
  aside,
}: {
  scopes: PlayerScope[]
  history: (MatchEntry & { seasonId: number })[]
  /** Columna derecha en desktop (entre las cifras y el historial en mobile). */
  aside?: React.ReactNode
}) {
  // Arranca en la temporada más reciente donde jugó (al inicio de temporada la actual está vacía).
  const [activeKey, setActiveKey] = useState(
    () => (scopes.find((sc) => (sc.stats?.matches ?? 0) > 0) ?? scopes[0])?.key ?? '',
  )
  const scope = scopes.find((s) => s.key === activeKey) ?? scopes[0]

  const scopedHistory = useMemo(
    () => (scope?.seasonId === null ? history : history.filter((h) => h.seasonId === scope?.seasonId)),
    [history, scope?.seasonId],
  )

  if (!scope) return null
  const s = scope.stats
  const matches = s?.matches ?? 0
  const winrate = matches > 0 && s ? Math.round((s.wins / matches) * 100) : 0
  const label = rankLabel(scope)
  const hasBadges =
    scope.records.length > 0 || scope.isLast || (s?.mvps ?? 0) > 0 || (s?.currentStreak ?? 0) >= 3 || scope.nelsons > 0 || matches > 0

  const cards = [
    { label: 'Partidas', value: matches },
    { label: 'W-D-L', text: s ? `${s.wins}-${s.draws}-${s.losses}` : '0-0-0' },
    { label: 'Winrate', value: winrate, suffix: '%' },
    { label: 'KDA', value: s?.kda ?? 0, decimals: 2, accent: true },
    { label: 'Kills', value: s?.kills ?? 0 },
    { label: 'Deaths', value: s?.deaths ?? 0 },
    { label: 'ADM', value: s?.adm ?? 0, title: 'Daño promedio por partida' },
    { label: 'HS', value: s?.hsPct ?? 0, suffix: '%' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <SeasonTabs
          options={scopes.map((sc) => ({ value: sc.key, label: sc.label, hint: sc.isCurrent ? 'actual' : undefined }))}
          value={scope.key}
          onChange={setActiveKey}
          layoutId="player-scope-tab"
          ariaLabel="Temporada de las estadísticas"
        />
        {label && (
          <span
            className={cn(
              'rounded-full border px-3 py-1 font-mono text-[12px] font-semibold',
              scope.rank === 1 ? 'border-amber-300/50 bg-amber-300/10 text-amber-200' : 'border-border bg-card text-muted-foreground',
            )}
          >
            {scope.rank === 1 ? '👑 ' : ''}
            {label}
          </span>
        )}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-5">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={scope.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            className="flex min-w-0 flex-col gap-3 lg:col-start-1"
          >
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
              {cards.map((card, i) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.025 }}
                  className={cn(
                    'flex min-w-0 flex-col gap-0.5 rounded-lg border px-2 py-2 sm:rounded-xl sm:px-3 sm:py-2.5',
                    card.accent ? 'border-primary/40 bg-primary/10' : 'border-border/60 bg-card/70',
                  )}
                  title={card.title}
                >
                  <span className="truncate text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[10px]">
                    {card.label}
                  </span>
                  <span
                    className={cn(
                      'truncate font-mono font-bold tracking-tight',
                      card.text ? 'text-[13px] sm:text-base' : 'text-[15px] sm:text-lg',
                      card.accent ? 'text-brand' : 'text-foreground',
                    )}
                  >
                    {card.text ?? <AnimatedNumber value={card.value ?? 0} decimals={card.decimals ?? 0} suffix={card.suffix ?? ''} />}
                  </span>
                </motion.div>
              ))}
            </div>

            {hasBadges && (
              <div className="flex flex-wrap items-center gap-1.5">
                {scope.records.map((record) => (
                  <RecordBadge key={record} type={record} />
                ))}
                {scope.isLast && (
                  <span title="Último lugar del ladder" className={cn(chipClass, 'cursor-help border-amber-700/50 text-amber-600')}>
                    💩 Menuda mierda
                  </span>
                )}
                {(s?.mvps ?? 0) > 0 && (
                  <span className={cn(chipClass, 'border-[#d4af37]/30 text-[#d4af37]')}>
                    👑 {s?.mvps} MVP{s?.mvps !== 1 ? 's' : ''}
                  </span>
                )}
                {(s?.currentStreak ?? 0) >= 3 && scope.isCurrent && (
                  <span className={cn(chipClass, 'border-orange-500/30 text-orange-500')}>🔥 Racha de {s?.currentStreak}</span>
                )}
                {scope.nelsons > 0 && (
                  <span className={cn(chipClass, 'border-primary/40 text-brand')}>
                    💀 {scope.nelsons} Nelson{scope.nelsons !== 1 ? 's' : ''}
                  </span>
                )}
                {s && <KDaBadges positiveGames={s.positiveGames} negativeGames={s.negativeGames} size="sm" />}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {aside && <aside className="min-w-0 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-2 lg:row-start-1">{aside}</aside>}

        <section className="min-w-0 lg:col-start-1">
          <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Historial · {scope.label}</h2>
          <PlayerMatchHistory key={scope.key} matches={scopedHistory} />
        </section>
      </div>
    </div>
  )
}
