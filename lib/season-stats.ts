import type { LiveData, Match, PlayerStats } from '@/types'

export type MatchRecordKey =
  | 'maxKills'
  | 'minKills'
  | 'maxDeaths'
  | 'minDeaths'
  | 'maxAssists'
  | 'maxDamage'
  | 'minDamage'

export type MatchRecord = {
  value: number
  playerId: string
  playerName: string
  matchId: string
  map: string
  date: string
}

export type MatchRecords = Record<MatchRecordKey, MatchRecord | null>

type Comparator = (next: number, current: number) => boolean
const higher: Comparator = (next, current) => next > current
const lower: Comparator = (next, current) => next < current

const RECORD_RULES: Record<MatchRecordKey, { field: 'kills' | 'deaths' | 'assists' | 'damage'; beats: Comparator }> = {
  maxKills: { field: 'kills', beats: higher },
  minKills: { field: 'kills', beats: lower },
  maxDeaths: { field: 'deaths', beats: higher },
  minDeaths: { field: 'deaths', beats: lower },
  maxAssists: { field: 'assists', beats: higher },
  maxDamage: { field: 'damage', beats: higher },
  minDamage: { field: 'damage', beats: lower },
}

/** Récords individuales por partida (el primero en marcarlo se lo queda en caso de empate). */
export function computeMatchRecords(data: LiveData): MatchRecords {
  const names = new Map(data.players.map((p) => [p.id, p]))
  const records = Object.fromEntries(
    Object.keys(RECORD_RULES).map((key) => [key, null]),
  ) as MatchRecords

  // Se recorre de la partida más vieja a la más nueva para respetar quién lo marcó primero.
  const chronological = [...data.matches].reverse()

  for (const match of chronological) {
    for (const entry of match.players) {
      const player = names.get(entry.playerId)
      if (!player) continue

      for (const [key, rule] of Object.entries(RECORD_RULES) as [MatchRecordKey, (typeof RECORD_RULES)[MatchRecordKey]][]) {
        const value = entry[rule.field]
        const current = records[key]
        if (!current || rule.beats(value, current.value)) {
          records[key] = {
            value,
            playerId: player.id,
            playerName: player.name,
            matchId: match.id,
            map: match.map,
            date: match.date,
          }
        }
      }
    }
  }

  return records
}

export type SeasonSummary = {
  matches: number
  totalKills: number
  totalRounds: number
  activePlayers: number
  mostPlayedMap: { map: string; count: number } | null
  lastMatch: Match | null
  closestMatch: Match | null
}

export function computeSeasonSummary(data: LiveData): SeasonSummary {
  const active = new Set<string>()
  const mapCounts = new Map<string, number>()
  let totalKills = 0
  let totalRounds = 0

  for (const match of data.matches) {
    totalRounds += match.ctScore + match.tScore
    mapCounts.set(match.map, (mapCounts.get(match.map) ?? 0) + 1)
    for (const entry of match.players) {
      active.add(entry.playerId)
      totalKills += entry.kills
    }
  }

  const [topMap] = [...mapCounts.entries()].sort((a, b) => b[1] - a[1])
  const closestMatch = [...data.matches]
    .filter((m) => m.ctScore + m.tScore > 0)
    .sort((a, b) => Math.abs(a.ctScore - a.tScore) - Math.abs(b.ctScore - b.tScore))[0] ?? null

  return {
    matches: data.matches.length,
    totalKills,
    totalRounds,
    activePlayers: active.size,
    mostPlayedMap: topMap ? { map: topMap[0], count: topMap[1] } : null,
    lastMatch: data.matches[0] ?? null,
    closestMatch,
  }
}

export type RankBattle = {
  chaser: PlayerStats
  target: PlayerStats
  chaserRank: number
  targetRank: number
  gap: number
}

/** Los puestos más peleados del ladder: pares consecutivos con menor diferencia de KDA. */
export function computeRankBattles(ranked: PlayerStats[], limit = 3): RankBattle[] {
  const battles: RankBattle[] = []
  for (let i = 1; i < ranked.length; i++) {
    battles.push({
      chaser: ranked[i],
      target: ranked[i - 1],
      chaserRank: i + 1,
      targetRank: i,
      gap: Math.max(0, ranked[i - 1].kda - ranked[i].kda),
    })
  }
  return battles.sort((a, b) => a.gap - b.gap || a.targetRank - b.targetRank).slice(0, limit)
}

export type MapWinrateRow = {
  map: string
  teamAName: string | null
  teamBName: string | null
  winnerTeam: string | null
}

export function toMapWinrateRows(matches: Match[]): MapWinrateRow[] {
  return matches.map((m) => ({
    map: m.map,
    teamAName: m.teamAName ?? null,
    teamBName: m.teamBName ?? null,
    winnerTeam: m.winnerTeam ?? null,
  }))
}

export type ComparableMetric = {
  key: string
  label: string
  current: number | null
  previous: number | null
  decimals: number
  suffix?: string
  /** true si un número más bajo es mejor (ej. muertes por partida). */
  lowerIsBetter?: boolean
}

function perMatch(total: number, matches: number) {
  return matches > 0 ? total / matches : 0
}

/** Métricas para comparar el rendimiento de un jugador entre dos temporadas. */
export function buildSeasonComparison(current: PlayerStats | null, previous: PlayerStats | null): ComparableMetric[] {
  const has = (s: PlayerStats | null) => (s && s.matches > 0 ? s : null)
  const c = has(current)
  const p = has(previous)
  const winrate = (s: PlayerStats | null) => (s ? (s.wins / s.matches) * 100 : null)

  return [
    { key: 'kda', label: 'KDA', current: c?.kda ?? null, previous: p?.kda ?? null, decimals: 2 },
    { key: 'winrate', label: 'Winrate', current: winrate(c), previous: winrate(p), decimals: 0, suffix: '%' },
    { key: 'adm', label: 'Daño / partida', current: c?.adm ?? null, previous: p?.adm ?? null, decimals: 0 },
    { key: 'kpm', label: 'Kills / partida', current: c ? perMatch(c.kills, c.matches) : null, previous: p ? perMatch(p.kills, p.matches) : null, decimals: 1 },
    { key: 'dpm', label: 'Muertes / partida', current: c ? perMatch(c.deaths, c.matches) : null, previous: p ? perMatch(p.deaths, p.matches) : null, decimals: 1, lowerIsBetter: true },
    { key: 'hs', label: 'Headshot', current: c?.hsPct ?? null, previous: p?.hsPct ?? null, decimals: 0, suffix: '%' },
    { key: 'mvp', label: 'MVP / partida', current: c ? perMatch(c.mvps, c.matches) * 100 : null, previous: p ? perMatch(p.mvps, p.matches) * 100 : null, decimals: 0, suffix: '%' },
    { key: 'matches', label: 'Partidas', current: c?.matches ?? 0, previous: p?.matches ?? 0, decimals: 0 },
  ]
}
