'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Match, CSMap } from '@/lib/mockData'
import { formatDate } from '@/lib/mockData'
import { cn } from '@/lib/utils'

const mapColors: Record<CSMap, string> = {
  Mirage: '#c2853b',
  Dust2: '#c2a83b',
  Inferno: '#c2453b',
  Nuke: '#3b8ac2',
  Ancient: '#3b8a5a',
}

export function MatchList({ matches }: { matches: Match[] }) {
  const maps = Array.from(new Set(matches.map((m) => m.map)))
  const [filter, setFilter] = useState<CSMap | 'ALL'>('ALL')

  const filtered =
    filter === 'ALL' ? matches : matches.filter((m) => m.map === filter)

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')}>
          All maps
        </FilterButton>
        {maps.map((m) => (
          <FilterButton
            key={m}
            active={filter === m}
            onClick={() => setFilter(m)}
          >
            {m}
          </FilterButton>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((match) => {
          const winner = match.winnerTeam || (match.ctScore > match.tScore ? 'CT' : 'T')
          const winnerLabel = winner === 'CT'
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
                  <span className="inline-flex items-center rounded bg-primary/15 px-2 py-1 font-mono text-[11px] font-bold text-primary">
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
