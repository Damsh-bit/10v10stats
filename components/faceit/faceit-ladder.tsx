'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { ArrowRight, ExternalLink, Flame, Gauge, Snowflake } from 'lucide-react'
import type { FaceitLadderRow } from '@/lib/faceit'
import { EloDelta, EloSparkline, FaceitAvatar, FaceitForm, FaceitLevel } from '@/components/faceit/faceit-bits'
import { cn } from '@/lib/utils'

type SortKey = 'elo' | 'trend' | 'activity'

const SORTS: { key: SortKey; label: string; hint: string }[] = [
  { key: 'elo', label: 'Elo', hint: 'por elo actual' },
  { key: 'trend', label: 'Forma', hint: 'por elo ganado en las últimas 10' },
  { key: 'activity', label: 'Actividad', hint: 'por partidas en los últimos 7 días' },
]

const MEDALS = [
  { row: 'bg-gradient-to-r from-amber-400/[0.12] to-transparent', bar: 'border-l-amber-300', rank: 'text-amber-300' },
  { row: 'bg-gradient-to-r from-slate-300/[0.08] to-transparent', bar: 'border-l-slate-300', rank: 'text-slate-200' },
  { row: 'bg-gradient-to-r from-orange-500/[0.08] to-transparent', bar: 'border-l-orange-400', rank: 'text-orange-300' },
]

function sortRows(rows: FaceitLadderRow[], key: SortKey) {
  const sorted = [...rows]
  if (key === 'trend') sorted.sort((a, b) => b.eloTrend - a.eloTrend || b.elo - a.elo)
  else if (key === 'activity') sorted.sort((a, b) => b.matchesLast7Days - a.matchesLast7Days || b.elo - a.elo)
  else sorted.sort((a, b) => b.elo - a.elo)
  return sorted
}

export function FaceitLadder({
  rows,
  variant = 'full',
  updatedLabel,
}: {
  rows: FaceitLadderRow[]
  /** compact: tarjeta del inicio · full: página de FACEIT. */
  variant?: 'compact' | 'full'
  updatedLabel?: string
}) {
  const [sortKey, setSortKey] = useState<SortKey>('elo')
  const sorted = useMemo(() => sortRows(rows, sortKey), [rows, sortKey])
  const compact = variant === 'compact'
  const activeSort = SORTS.find((s) => s.key === sortKey)!

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
            <Gauge className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">
              Ladder FACEIT
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {rows.length} jugadores · {activeSort.hint}
              {updatedLabel && !compact && ` · ${updatedLabel}`}
            </span>
          </div>
        </div>

        <div className="relative flex items-center rounded-full bg-muted/40 p-0.5" role="tablist" aria-label="Ordenar ladder de FACEIT">
          {SORTS.map(({ key, label }) => {
            const active = sortKey === key
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSortKey(key)}
                className={cn(
                  'relative h-7 rounded-full px-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors sm:px-3',
                  active ? 'text-white' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`faceit-sort-${variant}`}
                    className="absolute inset-0 rounded-full bg-orange-600"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{label}</span>
              </button>
            )
          })}
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
          No se pudieron traer los datos de FACEIT. Se reintenta solo en unos minutos.
        </p>
      ) : (
        <LayoutGroup>
          <ol className="flex flex-col">
            <AnimatePresence initial={false}>
              {sorted.map((row, i) => (
                <FaceitRow key={row.player.id} row={row} index={i} compact={compact} />
              ))}
            </AnimatePresence>
          </ol>
        </LayoutGroup>
      )}

      {compact && (
        <Link
          href="/faceit"
          className="group flex items-center justify-center gap-1.5 border-t border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
        >
          Gráficos, destacados y partidas en grupo
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      )}
    </section>
  )
}

function FaceitRow({ row, index: i, compact }: { row: FaceitLadderRow; index: number; compact: boolean }) {
  const medal = MEDALS[i]
  const hot = row.streak?.won && row.streak.count >= 3
  const cold = row.streak && !row.streak.won && row.streak.count >= 3

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.35, delay: Math.min(i * 0.035, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group relative flex items-center gap-2.5 border-b border-l-2 border-b-border border-l-transparent px-2.5 py-2.5 transition-colors last:border-b-0 hover:bg-accent/50 sm:gap-3 sm:px-4',
        medal?.row,
        medal?.bar,
      )}
    >
      <span
        className={cn(
          'w-5 shrink-0 text-center font-heading text-lg font-black tabular-nums sm:w-7',
          medal?.rank ?? 'text-muted-foreground',
        )}
      >
        {i + 1}
      </span>

      <FaceitAvatar player={row.player} avatar={row.avatar} size={compact ? 34 : 40} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          {/* El link cubre toda la fila; el de FACEIT queda por encima. */}
          <Link
            href={`/players/${row.player.id}#faceit`}
            className="truncate text-[14px] font-semibold leading-tight text-foreground after:absolute after:inset-0 group-hover:text-white"
          >
            {row.player.name}
          </Link>
          {hot && (
            <span
              className="flex shrink-0 items-center gap-0.5 rounded border border-orange-500/40 bg-black/30 px-1 py-0.5 text-[9px] font-semibold uppercase text-orange-400"
              title={`Ganó las últimas ${row.streak!.count}`}
            >
              <Flame className="h-3 w-3" aria-hidden="true" /> {row.streak!.count}W
            </span>
          )}
          {row.player.menudaMierda && (
            <span
              className="flex shrink-0 items-center rounded border border-amber-700/50 bg-black/30 px-1 py-0.5 text-[9px] font-semibold uppercase text-amber-600"
              title="Menuda mierda"
            >
              💩
            </span>
          )}
          {cold && (
            <span
              className="flex shrink-0 items-center gap-0.5 rounded border border-cyan-500/40 bg-black/30 px-1 py-0.5 text-[9px] font-semibold uppercase text-cyan-400"
              title={`Perdió las últimas ${row.streak!.count}`}
            >
              <Snowflake className="h-3 w-3" aria-hidden="true" /> {row.streak!.count}L
            </span>
          )}
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <FaceitForm results={row.lastFive} />
          <span className="truncate font-mono text-[10px] text-muted-foreground">
            {compact ? row.lastPlayedLabel : row.nickname}
            {!compact && row.lastPlayedLabel && <span className="hidden sm:inline"> · {row.lastPlayedLabel}</span>}
          </span>
        </div>
      </div>

      {!compact && (
        <div className="hidden shrink-0 flex-col items-end gap-0.5 font-mono text-[10px] text-muted-foreground lg:flex" title={`Últimas ${row.sample} partidas`}>
          <span>
            <span className={row.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400/90'}>{row.winRate}%</span> WR
          </span>
          <span>
            <span className="text-foreground">{row.kd.toFixed(2)}</span> K/D · <span className="text-foreground">{Math.round(row.adr)}</span> ADR
          </span>
        </div>
      )}

      <div className="flex shrink-0 flex-col items-center gap-0.5" title={`Elo en las últimas ${Math.max(0, row.spark.length - 1)} partidas`}>
        <EloSparkline
          id={`${compact ? 'c' : 'f'}-${row.player.id}`}
          values={row.spark}
          trend={row.trendMatches > 0 ? row.eloTrend : undefined}
          width={compact ? 56 : 96}
          height={compact ? 24 : 30}
        />
        {row.trendMatches > 0 && <EloDelta value={row.eloTrend} className="text-[10px]" />}
      </div>

      <div className={cn('flex shrink-0 items-center gap-1.5', compact ? 'w-[74px]' : 'w-[92px] sm:w-[104px]')}>
        <FaceitLevel level={row.level} size={compact ? 24 : 30} />
        <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
          <span className={cn('font-mono font-black tabular-nums leading-none', compact ? 'text-[15px]' : 'text-base sm:text-lg', medal?.rank ?? 'text-foreground')}>
            {row.elo}
          </span>
          {!compact && row.nextLevel && (
            <span
              className="h-1 w-full overflow-hidden rounded-full bg-muted/60"
              title={`Faltan ${row.nextLevel.eloNeeded} de elo para nivel ${row.nextLevel.level}`}
            >
              <motion.span
                className="block h-full rounded-full bg-orange-400"
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(6, row.nextLevel.progress * 100)}%` }}
                transition={{ duration: 0.8, delay: 0.15 + Math.min(i * 0.035, 0.4), ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          )}
        </div>
      </div>

      {!compact && (
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="relative z-10 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-orange-500/15 hover:text-orange-300 sm:flex"
          title={`Perfil de ${row.nickname} en FACEIT`}
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">Perfil de {row.nickname} en FACEIT</span>
        </a>
      )}
    </motion.li>
  )
}
