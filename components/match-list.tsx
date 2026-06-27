'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Match, CSMap } from '@/lib/mockData'
import { formatDate } from '@/lib/mockData'
import { toDateKey } from '@/lib/matches-calendar'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const mapColors: Record<CSMap, string> = {
  Mirage: '#c2853b',
  Dust2: '#c2a83b',
  Inferno: '#c2453b',
  Nuke: '#3b8ac2',
  Ancient: '#3b8a5a',
  Anubis: '#8c7657',
}

const PAGE_SIZE = 25

export function MatchList({
  matches,
  calendarDateFilter = null,
}: {
  matches: Match[]
  calendarDateFilter?: string | null
}) {
  const maps = Array.from(new Set(matches.map((m) => m.map)))
  const dates = Array.from(new Set(matches.map((m) => formatDate(m.date)))).filter((d) => d !== 'Sin info')

  const [mapFilter, setMapFilter] = useState<CSMap | 'ALL'>('ALL')
  const [dateFilter, setDateFilter] = useState<string | 'ALL'>('ALL')
  const [page, setPage] = useState(0)

  // Reset to page 0 whenever a filter changes
  const handleSetMapFilter = (v: CSMap | 'ALL') => { setMapFilter(v); setPage(0) }
  const handleSetDateFilter = (v: string) => { setDateFilter(v); setPage(0) }

  const filtered = matches.filter((m) => {
    const passMap = mapFilter === 'ALL' || m.map === mapFilter
    const passDate = dateFilter === 'ALL' || formatDate(m.date) === dateFilter
    const passCalendar = !calendarDateFilter || toDateKey(m.date) === calendarDateFilter
    return passMap && passDate && passCalendar
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  // Clamp page in case filters reduce total pages
  const currentPage = Math.min(page, totalPages - 1)
  const paginated = filtered.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE)

  return (
    <div>
      {/* Filters */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterButton active={mapFilter === 'ALL'} onClick={() => handleSetMapFilter('ALL')}>
            Todos los mapas
          </FilterButton>
          {maps.map((m) => (
            <FilterButton
              key={m}
              active={mapFilter === m}
              onClick={() => handleSetMapFilter(m)}
            >
              {m}
            </FilterButton>
          ))}
        </div>

        {dates.length > 0 && (
          <select
            className="bg-card border border-border text-foreground text-[13px] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer w-full sm:w-auto"
            value={dateFilter}
            onChange={(e) => handleSetDateFilter(e.target.value)}
          >
            <option value="ALL">Todas las fechas</option>
            {dates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Match cards */}
      <div className="flex flex-col gap-3">
        {paginated.map((match) => {
          const isCtWinner = match.winnerTeam
            ? (match.winnerTeam === 'CT' || match.winnerTeam === match.teamAName)
            : (match.ctScore > match.tScore)
          const winnerLabel = isCtWinner
            ? (match.teamAName || 'CT')
            : (match.teamBName || 'T')
          return (
            <div
              key={match.id}
              className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary/50 sm:flex-row"
            >
              <div
                className="h-24 w-full shrink-0 bg-cover bg-center sm:h-auto sm:w-40"
                style={{
                  backgroundImage: `url('/maps/${match.map.toLowerCase().replace(/\s+/g, '')}.webp')`,
                  backgroundColor: mapColors[match.map] ?? '#1e293b',
                }}
              />

              <div className="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-xl font-bold text-foreground">
                    {match.ctScore}-{match.tScore}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {formatDate(match.date)} · {match.durationMin ? `${match.durationMin} rondas` : 'Sin info'}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1 sm:mt-0">
                  <span
                    className={cn(
                      'inline-flex items-center rounded px-2 py-1 font-mono text-[11px] font-bold',
                      winnerLabel.toLowerCase().includes('papi')
                        ? 'bg-amber-500/15 text-amber-500 ring-1 ring-inset ring-amber-500/30'
                        : 'bg-primary/15 text-primary',
                    )}
                  >
                    {winnerLabel} WINS
                  </span>
                  <Link
                    href={`/matches/${match.id}`}
                    className="rounded border border-border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent group-hover:border-primary/50"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            </div>
          )
        })}

        {paginated.length === 0 && (
          <p className="py-10 text-center text-[13px] text-muted-foreground">
            No se encontraron partidas con los filtros seleccionados.
          </p>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between gap-2">
          <span className="text-[12px] text-muted-foreground">
            Página {currentPage + 1} de {totalPages}{' '}
            <span className="text-muted-foreground/60">
              ({filtered.length} partidas)
            </span>
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 0}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Página anterior"
              className="flex h-7 w-7 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i).map((i) => {
              const showPage =
                i === 0 ||
                i === totalPages - 1 ||
                Math.abs(i - currentPage) <= 1

              if (!showPage) {
                const prevShown =
                  i - 1 === 0 ||
                  i - 1 === totalPages - 1 ||
                  Math.abs(i - 1 - currentPage) <= 1
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
                  aria-current={i === currentPage ? 'page' : undefined}
                  className={cn(
                    'flex h-7 min-w-[28px] items-center justify-center rounded border px-2 text-[12px] font-medium transition-colors',
                    i === currentPage
                      ? 'border-primary bg-primary/15 text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {i + 1}
                </button>
              )
            })}

            <button
              type="button"
              disabled={currentPage === totalPages - 1}
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

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors',
        active
          ? 'border-primary bg-primary/15 text-primary'
          : 'border-border text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
