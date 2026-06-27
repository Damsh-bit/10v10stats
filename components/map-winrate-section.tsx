'use client'

import { useState, useEffect } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { getSupabaseClient } from '@/lib/supabase'

// ─── Team identifier configuration ───────────────────────────────────────────
// The team name matching is case-insensitive and uses substring matching.
// "papi" matches "Equipo Papi", "papi", etc.
// "viejo" matches "Equipo Viejo", "viejo", etc.
// Adjust these constants if the team name values in the DB change.
const TEAM_PAPI_KEYWORD = 'papi'
const TEAM_VIEJO_KEYWORD = 'viejo'

// ─── Team visual config ───────────────────────────────────────────────────────
// Papi: blue (matches getTeamColorClass in utils.ts)
// Viejo: purple (matches getTeamColorClass in utils.ts)
const TEAM_PAPI_COLOR = '#60a5fa'   // blue-400
const TEAM_VIEJO_COLOR = '#a78bfa'  // violet-400

// ─── Types ────────────────────────────────────────────────────────────────────
type MapStat = { map: string; won: number; played: number; winrate: number }
type TeamStats = Record<string, MapStat>

type MatchRow = {
  map: string | null
  team_a_name: string | null
  team_b_name: string | null
  winner_team: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function matchesTeam(name: string | null | undefined, keyword: string): boolean {
  if (!name) return false
  return name.toLowerCase().trim().includes(keyword)
}

function buildTeamStats(rows: MatchRow[], keyword: string): TeamStats {
  const stats: TeamStats = {}

  for (const row of rows) {
    if (!row.map) continue

    const isTeamA = matchesTeam(row.team_a_name, keyword)
    const isTeamB = matchesTeam(row.team_b_name, keyword)

    if (!isTeamA && !isTeamB) continue

    const map = row.map.trim()
    if (!stats[map]) {
      stats[map] = { map, won: 0, played: 0, winrate: 0 }
    }

    stats[map].played += 1

    // winner_team is 'CT' for team_a, 'T' for team_b (or custom team name)
    // We compare winner_team against both the keyword and the positional CT/T values.
    const winnerRaw = row.winner_team?.toLowerCase().trim() ?? ''
    const isCtWinner = winnerRaw === 'ct'
    const isTWinner = winnerRaw === 't'
    const winnerMatchesPapi = winnerRaw.includes(keyword)

    let won = false
    if (isTeamA) {
      // Team A is always CT side (positional convention in this app)
      won = isCtWinner || (!isTWinner && winnerMatchesPapi)
    } else {
      // Team B is always T side
      won = isTWinner || (!isCtWinner && winnerMatchesPapi)
    }

    if (won) stats[map].won += 1
  }

  // Compute winrates
  for (const key of Object.keys(stats)) {
    const s = stats[key]
    s.winrate = s.played > 0 ? Math.round((s.won / s.played) * 100) : 0
  }

  return stats
}

function buildChartData(maps: string[], stats: TeamStats) {
  return maps.map((map) => ({
    map,
    winrate: stats[map]?.winrate ?? 0,
  }))
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: { map: string; winrate: number } }>
}) {
  if (!active || !payload?.length) return null
  const { map, winrate } = payload[0].payload
  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 shadow-lg">
      <p className="text-[12px] font-bold text-foreground">{map}</p>
      <p className="text-[12px] text-muted-foreground">{winrate}% de victorias</p>
    </div>
  )
}

// ─── Team card ────────────────────────────────────────────────────────────────
function TeamRadarCard({
  title,
  color,
  maps,
  stats,
}: {
  title: string
  color: string
  maps: string[]
  stats: TeamStats
}) {
  const chartData = buildChartData(maps, stats)
  const sorted = [...chartData].sort((a, b) => b.winrate - a.winrate)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      {/* Card title */}
      <h3
        className="font-heading text-sm font-bold uppercase tracking-[0.2em]"
        style={{ color }}
      >
        {title}
      </h3>

      {/* Radar chart */}
      {maps.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center text-[13px] text-muted-foreground">
          Sin datos suficientes
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart
            data={chartData}
            margin={{ top: 10, right: 30, bottom: 10, left: 30 }}
          >
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="map"
              tick={{
                fill: '#93b3c9',
                fontSize: 11,
                fontFamily: 'var(--font-mono, monospace)',
              }}
            />
            <Radar
              name={title}
              dataKey="winrate"
              stroke={color}
              fill={color}
              fillOpacity={0.25}
              dot={false}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      )}

      {/* Legend table */}
      {sorted.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-md border border-border/60">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-border/60 bg-black/20">
                <th className="px-3 py-1.5 text-left font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Mapa
                </th>
                <th className="px-3 py-1.5 text-right font-semibold uppercase tracking-wider text-muted-foreground/70">
                  WR
                </th>
                <th className="px-3 py-1.5 text-right font-semibold uppercase tracking-wider text-muted-foreground/70">
                  Registro
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row, i) => {
                const s = stats[row.map]
                const losses = (s?.played ?? 0) - (s?.won ?? 0)
                return (
                  <tr
                    key={row.map}
                    className={`${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-black/10'} transition-colors`}
                  >
                    <td className="px-3 py-1.5 font-mono text-foreground/80">
                      {row.map}
                    </td>
                    <td
                      className="px-3 py-1.5 text-right font-mono font-bold"
                      style={{ color: row.winrate >= 50 ? color : '#6b7280' }}
                    >
                      {s?.played ? `${row.winrate}%` : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                      {s?.played ? `${s.won}W ${losses}L` : 'Sin partidas'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Main section ─────────────────────────────────────────────────────────────
export function MapWinrateSection() {
  const [papiStats, setPapiStats] = useState<TeamStats>({})
  const [viejoStats, setViejoStats] = useState<TeamStats>({})
  const [maps, setMaps] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = getSupabaseClient()
        if (!supabase) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('matches')
          .select('map, team_a_name, team_b_name, winner_team')

        if (error || !data) {
          setLoading(false)
          return
        }

        const rows = data as MatchRow[]

        const papi = buildTeamStats(rows, TEAM_PAPI_KEYWORD)
        const viejo = buildTeamStats(rows, TEAM_VIEJO_KEYWORD)

        // Collect all unique maps that appear in either team's stats,
        // sorted alphabetically so both charts share the same axis order.
        const allMaps = Array.from(
          new Set([...Object.keys(papi), ...Object.keys(viejo)])
        ).sort()

        // Ensure both teams have an entry for every map (winrate = 0 if not played)
        for (const map of allMaps) {
          if (!papi[map]) papi[map] = { map, won: 0, played: 0, winrate: 0 }
          if (!viejo[map]) viejo[map] = { map, won: 0, played: 0, winrate: 0 }
        }

        setPapiStats(papi)
        setViejoStats(viejo)
        setMaps(allMaps)
      } catch {
        // Silently fail — section just won't render data
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <section className="mt-6">
        <div className="mb-2">
          <h2 className="font-heading text-sm font-bold uppercase tracking-[0.2em] text-foreground">
            ▶ Winrate por mapa
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="flex h-[380px] items-center justify-center rounded-lg border border-border bg-card"
            >
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <img
                  src="/Sticker loader.png"
                  alt="loader"
                  className="h-10 w-10 animate-pulse opacity-60"
                />
                <span>Cargando…</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold uppercase tracking-[0.2em] text-foreground">
          ▶ Winrate por mapa
        </h2>
        {maps.length > 0 && (
          <span className="rounded bg-card border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
            {maps.length} mapas
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TeamRadarCard
          title="Equipo Papi"
          color={TEAM_PAPI_COLOR}
          maps={maps}
          stats={papiStats}
        />
        <TeamRadarCard
          title="Equipo Viejo"
          color={TEAM_VIEJO_COLOR}
          maps={maps}
          stats={viejoStats}
        />
      </div>
    </section>
  )
}
