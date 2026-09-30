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
  placementMatches: number
  records: RecordType[]
  isLast: boolean
  nelsons: number
}

function rankLabel(scope: PlayerScope) {
  if (scope.seasonId === null) return null
  const matches = scope.stats?.matches ?? 0
  if (scope.rank) return `#${scope.rank} de ${scope.rankedCount}`
  if (matches === 0) return scope.isCurrent ? 'Sin debut' : 'No jugó'
  return `En clasificación ${matches}/${scope.placementMatches}`
}

export function PlayerSeasonView({
  scopes,
  history,
  beforeHistory,
}: {
  scopes: PlayerScope[]
  history: (MatchEntry & { seasonId: number })[]
  /** Contenido entre las cifras y el historial (ej. la comparación entre temporadas). */
  beforeHistory?: React.ReactNode
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

  const cards = [
    { label: 'Partidas', value: matches },
    { label: 'W / D / L', text: s ? `${s.wins} / ${s.draws} / ${s.losses}` : '0 / 0 / 0' },
    { label: 'Winrate', value: winrate, suffix: '%' },
    { label: 'KDA', value: s?.kda ?? 0, decimals: 2, accent: true },
    { label: 'Kills', value: s?.kills ?? 0 },
    { label: 'Deaths', value: s?.deaths ?? 0 },
    { label: 'ADM', value: s?.adm ?? 0, title: 'Daño promedio por partida' },
    { label: 'HS %', value: s?.hsPct ?? 0, suffix: '%' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
              scope.rank === 1
                ? 'border-amber-300/50 bg-amber-300/10 text-amber-200'
                : 'border-border bg-card text-muted-foreground',
            )}
          >
            {scope.rank === 1 ? '👑 ' : ''}
            {label}
          </span>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={scope.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-4"
        >
          {(scope.records.length > 0 || scope.isLast || (s?.mvps ?? 0) > 0 || (s?.currentStreak ?? 0) >= 3 || scope.nelsons > 0 || matches > 0) && (
            <div className="flex flex-wrap items-center gap-2">
              {scope.records.map((record) => (
                <RecordBadge key={record} type={record} />
              ))}
              {scope.isLast && (
                <span
                  title="Último lugar del ladder"
                  className="flex cursor-help items-center gap-1 rounded border border-amber-700/50 bg-[#101010] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-amber-600"
                >
                  💩 Menuda mierda
                </span>
              )}
              {(s?.mvps ?? 0) > 0 && (
                <span className="flex items-center gap-1.5 rounded border border-[#d4af37]/30 bg-[#101010] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-[#d4af37]">
                  👑 {s?.mvps} MVP{s?.mvps !== 1 ? 's' : ''}
                </span>
              )}
              {(s?.currentStreak ?? 0) >= 3 && scope.isCurrent && (
                <span className="flex items-center gap-1.5 rounded border border-orange-500/30 bg-[#101010] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-orange-500">
                  🔥 Racha de {s?.currentStreak}
                </span>
              )}
              {scope.nelsons > 0 && (
                <span className="flex items-center gap-1.5 rounded border border-primary/40 bg-[#101010] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-brand">
                  💀 {scope.nelsons} Nelson{scope.nelsons !== 1 ? 's' : ''}
                </span>
              )}
              {s && <KDaBadges positiveGames={s.positiveGames} negativeGames={s.negativeGames} size="md" />}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {cards.map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className={cn(
                  'flex flex-col gap-1.5 rounded-xl border p-4 transition-colors',
                  card.accent ? 'border-primary/40 bg-primary/10' : 'border-border/60 bg-card/70 hover:bg-card',
                )}
                title={card.title}
              >
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{card.label}</span>
                <span
                  className={cn(
                    'whitespace-nowrap font-mono font-bold tracking-tight',
                    card.text ? 'text-lg' : 'text-xl',
                    card.accent ? 'text-brand' : 'text-foreground',
                  )}
                >
                  {card.text ?? <AnimatedNumber value={card.value ?? 0} decimals={card.decimals ?? 0} suffix={card.suffix ?? ''} />}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      {beforeHistory}

      <section>
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Historial · {scope.label}
        </h2>
        <PlayerMatchHistory key={scope.key} matches={scopedHistory} />
      </section>
    </div>
  )
}
