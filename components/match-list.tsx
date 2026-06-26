'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Match, CSMap } from '@/lib/mockData'
import { formatDate } from '@/lib/mockData'
import { toDateKey } from '@/lib/matches-calendar'
import { cn } from '@/lib/utils'

const mapColors: Record<CSMap, string> = {
  Mirage: '#c2853b',
  Dust2: '#c2a83b',
  Inferno: '#c2453b',
  Nuke: '#3b8ac2',
  Ancient: '#3b8a5a',
  Anubis: '#8c7657',
}

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

  const filtered = matches.filter((m) => {
    const passMap = mapFilter === 'ALL' || m.map === mapFilter
    const passDate = dateFilter === 'ALL' || formatDate(m.date) === dateFilter
    const passCalendar = !calendarDateFilter || toDateKey(m.date) === calendarDateFilter
    return passMap && passDate && passCalendar
  })

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <FilterButton active={mapFilter === 'ALL'} onClick={() => setMapFilter('ALL')}>
            All maps
          </FilterButton>
          {maps.map((m) => (
            <FilterButton
              key={m}
              active={mapFilter === m}
              onClick={() => setMapFilter(m)}
            >
              {m}
            </FilterButton>
          ))}
        </div>

        {dates.length > 0 && (
          <select
            className="bg-card border border-border text-foreground text-[13px] rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 cursor-pointer w-full sm:w-auto"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
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

      <div className="flex flex-col gap-3">
        {filtered.map((match) => {
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
                  backgroundColor: mapColors[match.map] ?? '#1e293b' 
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
                      "inline-flex items-center rounded px-2 py-1 font-mono text-[11px] font-bold",
                      winnerLabel.toLowerCase().includes('papi') 
                        ? "bg-blue-500/15 text-blue-500" 
                        : "bg-primary/15 text-primary"
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
      </div>
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
