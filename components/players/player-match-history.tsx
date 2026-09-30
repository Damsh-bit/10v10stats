'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import type { Match, MatchPlayer } from '@/types'

import { formatDate, formatShortDate } from '@/lib/format'
import { ResultChip } from '@/components/shared/strike-ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getTeamColorClass, getPlayerMatchScore, cn } from '@/lib/utils'
import AnimatedNumber from '@/components/ui/animated-number'

export type MatchEntry = {
  match: Match
  entry: MatchPlayer
}

const PAGE_SIZE = 15

export function PlayerMatchHistory({ matches }: { matches: MatchEntry[] }) {
  const [page, setPage] = useState(0)
  const [mapFilter, setMapFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [mvpFilter, setMvpFilter] = useState<string>('all')
  const [resultFilter, setResultFilter] = useState<string>('all')

  const uniqueMaps = useMemo(() => Array.from(new Set(matches.map((m) => m.match.map))).sort(), [matches])
  const uniqueTeams = useMemo(() => Array.from(new Set(matches.map((m) => m.entry.team))).sort(), [matches])

  const filteredMatches = useMemo(() => {
    return matches.filter(({ match, entry }) => {
      if (mapFilter !== 'all' && match.map !== mapFilter) return false
      if (teamFilter !== 'all' && entry.team !== teamFilter) return false
      if (mvpFilter === 'yes' && entry.mvps === 0) return false
      if (mvpFilter === 'no' && entry.mvps > 0) return false
      if (resultFilter === 'win' && !entry.won) return false
      if (resultFilter === 'loss' && (entry.won || entry.draw)) return false
      if (resultFilter === 'draw' && !entry.draw) return false
      return true
    })
  }, [matches, mapFilter, teamFilter, mvpFilter, resultFilter])

  useEffect(() => {
    setPage(0)
  }, [mapFilter, teamFilter, mvpFilter, resultFilter])

  const totalPages = Math.max(1, Math.ceil(filteredMatches.length / PAGE_SIZE))
  const start = page * PAGE_SIZE
  const pageMatches = filteredMatches.slice(start, start + PAGE_SIZE)

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      {matches.length > 0 && (
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <select
            value={mapFilter}
            onChange={(e) => setMapFilter(e.target.value)}
            className="h-7 cursor-pointer appearance-none rounded-full bg-muted/40 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/80 focus:outline-none sm:px-3 sm:text-[12px]"
          >
            <option value="all">Mapas</option>
            {uniqueMaps.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="h-7 cursor-pointer appearance-none rounded-full bg-muted/40 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/80 focus:outline-none sm:px-3 sm:text-[12px]"
          >
            <option value="all">Equipos</option>
            {uniqueTeams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          <select
            value={resultFilter}
            onChange={(e) => setResultFilter(e.target.value)}
            className="h-7 cursor-pointer appearance-none rounded-full bg-muted/40 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/80 focus:outline-none sm:px-3 sm:text-[12px]"
          >
            <option value="all">Resultados</option>
            <option value="win">Victorias</option>
            <option value="draw">Empates</option>
            <option value="loss">Derrotas</option>
          </select>

          <select
            value={mvpFilter}
            onChange={(e) => setMvpFilter(e.target.value)}
            className="h-7 cursor-pointer appearance-none rounded-full bg-muted/40 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted/80 focus:outline-none sm:px-3 sm:text-[12px]"
          >
            <option value="all">MVP (Todos)</option>
            <option value="yes">Solo MVP</option>
          </select>
        </div>
      )}

      {/* Match list */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {pageMatches.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            {matches.length === 0 ? 'Sin partidas registradas.' : 'No hay partidas que coincidan con los filtros.'}
          </p>
        ) : (
          pageMatches.map(({ match, entry }, i) => {
            const { playerScore, opponentScore } = getPlayerMatchScore(match, entry)

            return (
            <Link
              key={match.id}
              href={`/matches/${match.id}`}
              className={`flex items-center justify-between gap-2 px-2.5 py-2 transition-colors hover:bg-accent/60 sm:gap-3 sm:px-3 ${i > 0 ? 'border-t border-border' : ''
                }`}
            >
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <ResultChip
                  won={entry.won}
                  draw={entry.draw}
                  playerScore={playerScore}
                  opponentScore={opponentScore}
                />
                <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-2">
                  <span className="truncate text-[13px] font-medium text-foreground sm:text-[14px]">
                    {match.map}
                  </span>
                  <div className="flex items-center gap-1">
                    <span
                      className={cn('whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-medium sm:px-2 sm:text-[11px]', getTeamColorClass(entry.team))}
                      title={entry.team}
                    >
                      {entry.team.replace(/^Equipo\s+/i, '')}
                    </span>
                    {entry.mvps > 0 && (
                      <span className="rounded bg-yellow-500/20 px-1.5 py-0.5 text-[10px] font-bold text-yellow-500" title="MVP de la partida">
                        MVP
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2.5 font-mono text-[11px] text-muted-foreground sm:gap-4 sm:text-[12px]">
                  <div className="flex items-center gap-1 font-semibold tracking-wide">
                  <span className="text-green-400"><AnimatedNumber value={entry.kills} /></span>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="text-brand"><AnimatedNumber value={entry.deaths} direction="down" /></span>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="text-blue-400"><AnimatedNumber value={entry.assists} /></span>
                </div>
                <span className="hidden sm:inline"><AnimatedNumber value={entry.damage} /> dmg</span>
                <span className="w-12 text-right sm:w-14" title={formatDate(match.date)}>
                  {formatShortDate(match.date)}
                </span>
              </div>
            </Link>
            )
          })
        )}
      </div>

      {/* Pagination controls — only shown when needed */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-muted-foreground">
            Página {page + 1} de {totalPages}{' '}
            <span className="text-muted-foreground/60">
              ({filteredMatches.length} partidas)
            </span>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Página anterior"
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {/* Page number pills */}
            {Array.from({ length: totalPages }, (_, i) => i).map((i) => {
              // Show first, last, current ±1, and ellipsis
              const showPage =
                i === 0 ||
                i === totalPages - 1 ||
                Math.abs(i - page) <= 1

              if (!showPage) {
                // Show ellipsis only once between gaps
                const prevShown =
                  i - 1 === 0 ||
                  i - 1 === totalPages - 1 ||
                  Math.abs(i - 1 - page) <= 1
                return prevShown ? (
                  <span
                    key={`ellipsis-${i}`}
                    className="px-1 text-[12px] text-muted-foreground/50"
                  >
                    …
                  </span>
                ) : null
              }

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  aria-label={`Ir a página ${i + 1}`}
                  aria-current={i === page ? 'page' : undefined}
                  className={`flex h-7 min-w-[28px] items-center justify-center rounded border px-2 text-[12px] font-medium transition-colors ${i === page
                      ? 'border-primary bg-primary/15 text-brand'
                      : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                >
                  {i + 1}
                </button>
              )
            })}

            <button
              type="button"
              disabled={page === totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Página siguiente"
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
