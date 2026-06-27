'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Match, MatchPlayer } from '@/lib/mockData'
import { formatDate } from '@/lib/mockData'
import { ResultChip } from '@/components/strike-ui'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export type MatchEntry = {
  match: Match
  entry: MatchPlayer
}

const PAGE_SIZE = 25

export function PlayerMatchHistory({ matches }: { matches: MatchEntry[] }) {
  const [page, setPage] = useState(0)

  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE))
  const start = page * PAGE_SIZE
  const pageMatches = matches.slice(start, start + PAGE_SIZE)

  return (
    <div className="flex flex-col gap-3">
      {/* Match list */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {pageMatches.length === 0 ? (
          <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
            Sin partidas registradas.
          </p>
        ) : (
          pageMatches.map(({ match, entry }, i) => (
            <Link
              key={match.id}
              href={`/matches/${match.id}`}
              className={`flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-accent/60 ${
                i > 0 ? 'border-t border-border' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <ResultChip won={entry.won} />
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-foreground">
                    {match.map}
                  </span>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    {entry.team}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 font-mono text-[12px] text-muted-foreground">
                <div className="flex items-center gap-1 font-semibold tracking-wide">
                  <span className="text-green-400">{entry.kills}</span>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="text-primary">{entry.deaths}</span>
                  <span className="text-muted-foreground/40">/</span>
                  <span className="text-blue-400">{entry.assists}</span>
                </div>
                <span className="hidden sm:inline">{entry.damage} dmg</span>
                <span className="w-20 text-right">{formatDate(match.date)}</span>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination controls — only shown when needed */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-muted-foreground">
            Página {page + 1} de {totalPages}{' '}
            <span className="text-muted-foreground/60">
              ({matches.length} partidas)
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
                  className={`flex h-7 min-w-[28px] items-center justify-center rounded border px-2 text-[12px] font-medium transition-colors ${
                    i === page
                      ? 'border-primary bg-primary/15 text-primary'
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
