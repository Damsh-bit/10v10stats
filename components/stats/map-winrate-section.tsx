'use client'

import { useMemo } from 'react'
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import AnimatedNumber from '@/components/ui/animated-number'
import { Reveal } from '@/components/motion/reveal'
import type { MapWinrateRow } from '@/lib/season-stats'

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

type MatchRow = MapWinrateRow

// ─── Helpers ──────────────────────────────────────────────────────────────────
function matchesTeam(name: string | null | undefined, keyword: string): boolean {
  if (!name) return false
  return name.toLowerCase().trim().includes(keyword)
}

function buildTeamStats(rows: MatchRow[], keyword: string): TeamStats {
  const stats: TeamStats = {}

  for (const row of rows) {
    if (!row.map) continue

    const isTeamA = matchesTeam(row.teamAName, keyword)
    const isTeamB = matchesTeam(row.teamBName, keyword)

    if (!isTeamA && !isTeamB) continue

    const map = row.map.trim()
    if (!stats[map]) {
      stats[map] = { map, won: 0, played: 0, winrate: 0 }
    }

    stats[map].played += 1

    // winner_team is 'CT' for team_a, 'T' for team_b (or custom team name)
    // We compare winner_team against both the keyword and the positional CT/T values.
    const winnerRaw = row.winnerTeam?.toLowerCase().trim() ?? ''
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
    <div className="flex h-full flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
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
                      {s?.played ? <AnimatedNumber value={row.winrate} decimals={0} suffix="%" /> : '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">
                      {s?.played ? (<><AnimatedNumber value={s.won} />W <AnimatedNumber value={losses} direction="down" />L</>) : 'Sin partidas'}
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
export function MapWinrateSection({ rows }: { rows: MapWinrateRow[] }) {
  const { papiStats, viejoStats, maps } = useMemo(() => {
    const papi = buildTeamStats(rows, TEAM_PAPI_KEYWORD)
    const viejo = buildTeamStats(rows, TEAM_VIEJO_KEYWORD)

    // Mismo orden de ejes en ambos radares; winrate 0 si un equipo no jugó el mapa.
    const allMaps = Array.from(new Set([...Object.keys(papi), ...Object.keys(viejo)])).sort()
    for (const map of allMaps) {
      if (!papi[map]) papi[map] = { map, won: 0, played: 0, winrate: 0 }
      if (!viejo[map]) viejo[map] = { map, won: 0, played: 0, winrate: 0 }
    }

    return { papiStats: papi, viejoStats: viejo, maps: allMaps }
  }, [rows])

  if (maps.length === 0) return null

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-heading text-sm font-bold uppercase tracking-[0.2em] text-foreground">
          ▶ Winrate por mapa
        </h2>
        <span className="rounded border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {maps.length} mapas
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Reveal>
          <TeamRadarCard title="Equipo Papi" color={TEAM_PAPI_COLOR} maps={maps} stats={papiStats} />
        </Reveal>
        <Reveal delay={0.1}>
          <TeamRadarCard title="Equipo Viejo" color={TEAM_VIEJO_COLOR} maps={maps} stats={viejoStats} />
        </Reveal>
      </div>
    </section>
  )
}
