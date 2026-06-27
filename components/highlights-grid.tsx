'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Film, ChevronDown } from 'lucide-react'
import { highlightTypeColors, type HighlightType } from '@/lib/mockData'
import { VideoEmbed } from '@/components/video-embed'

// ─── Types ────────────────────────────────────────────────────────────────────
export type HighlightRow = {
  id: string
  player_id: string
  type: string | null
  description: string | null
  round_number: number | null
  clip_url: string | null
  created_at?: string | null
}

export type PlayerEntry = {
  id: string
  name: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeType(value: string | null): HighlightType {
  const validTypes: HighlightType[] = [
    'ACE', 'QUAD_KILL', 'TRIPLE_KILL', 'CLUTCH', 'ENTRY_FRAG', 'KNIFE_KILL', 'OTHER',
  ]
  if (!value) return 'OTHER'
  const upper = value.trim().toUpperCase()
  return validTypes.includes(upper as HighlightType) ? (upper as HighlightType) : 'OTHER'
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/30">
        <Film className="h-7 w-7 text-muted-foreground/60" />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        {filtered ? 'Ningún highlight coincide con el filtro' : 'Todavía no hay highlights registrados'}
      </p>
      {!filtered && (
        <p className="max-w-xs text-xs text-muted-foreground/70">
          Los clips se agregan desde el botón &quot;Nuevo highlight&quot; en el dashboard.
        </p>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function HighlightsGrid({
  highlights,
  players,
}: {
  highlights: HighlightRow[]
  players: PlayerEntry[]
}) {
  const [selectedPlayer, setSelectedPlayer] = useState<string>('all')

  // Players that actually have at least one highlight (for the filter dropdown)
  const playersWithHighlights = useMemo(() => {
    const ids = new Set(highlights.map((h) => h.player_id))
    return players.filter((p) => ids.has(p.id)).sort((a, b) => a.name.localeCompare(b.name))
  }, [highlights, players])

  const playerMap = useMemo(
    () => new Map(players.map((p) => [p.id, p.name])),
    [players],
  )

  const filtered = useMemo(
    () =>
      selectedPlayer === 'all'
        ? highlights
        : highlights.filter((h) => h.player_id === selectedPlayer),
    [highlights, selectedPlayer],
  )

  const isFiltered = selectedPlayer !== 'all'

  return (
    <div className="flex flex-col gap-5">
      {/* ── Filter bar ── */}
      {playersWithHighlights.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Jugador
          </span>

          {/* "Todos" pill */}
          <button
            type="button"
            onClick={() => setSelectedPlayer('all')}
            className={`h-7 rounded-full px-3 text-[12px] font-medium transition-colors ${
              selectedPlayer === 'all'
                ? 'bg-primary text-white'
                : 'bg-muted/40 text-muted-foreground hover:bg-muted/80'
            }`}
          >
            Todos
          </button>

          {playersWithHighlights.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedPlayer(p.id)}
              className={`h-7 rounded-full px-3 text-[12px] font-medium transition-colors ${
                selectedPlayer === p.id
                  ? 'bg-primary text-white'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {p.name}
            </button>
          ))}

          {isFiltered && (
            <span className="ml-auto font-mono text-[11px] text-muted-foreground/60">
              {filtered.length} highlight{filtered.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* ── Grid ── */}
      {filtered.length === 0 ? (
        <EmptyState filtered={isFiltered} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((row) => {
            const type = normalizeType(row.type)
            const color = highlightTypeColors[type]
            const playerName = playerMap.get(row.player_id) || 'Jugador desconocido'

            return (
              <div
                key={row.id}
                className="group flex flex-col gap-2 rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-lg hover:shadow-primary/5"
              >
                {/* Video player */}
                {row.clip_url ? (
                  <div className="overflow-hidden rounded-lg border border-border/60">
                    <VideoEmbed url={row.clip_url} title={row.description || type} />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted/20 text-xs text-muted-foreground">
                    Sin video disponible
                  </div>
                )}

                {/* Player link & round */}
                <div className="mt-1 flex items-center justify-between">
                  <Link
                    href={`/players/${row.player_id}`}
                    className="text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    {playerName}
                  </Link>
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {row.round_number ? `R${row.round_number}` : ''}
                  </span>
                </div>

                {/* Type badge */}
                <div className="flex items-center mt-1">
                  <span
                    className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-background"
                    style={{ backgroundColor: color }}
                  >
                    {type.replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Description */}
                {row.description ? (
                  <p className="line-clamp-2 mt-1 text-[13px] leading-relaxed text-foreground/80">
                    {row.description}
                  </p>
                ) : null}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
