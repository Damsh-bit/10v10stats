import { getSupabaseClient } from '@/lib/supabase'

export type Player = {
  id: string
  name: string
  badge: string
  avatarColor: string
}

export type MatchPlayer = {
  playerId: string
  team: 'CT' | 'T'
  kills: number
  deaths: number
  assists: number
  damage: number
  adr: number
  hsPct: number
  mvps: number
  won: boolean
}

export type HighlightType = 'ACE' | 'CLUTCH' | '1v3' | 'NINJA' | 'NO-SCOPE'

export type Highlight = {
  id: string
  playerId: string
  matchId: string
  type: HighlightType
  description: string
  round: number
  clipUrl?: string
}

export type CSMap = 'Mirage' | 'Dust2' | 'Inferno' | 'Nuke' | 'Ancient'

export type Match = {
  id: string
  map: CSMap
  date: string
  ctScore: number
  tScore: number
  durationMin: number
  players: MatchPlayer[]
}

export const players: Player[] = [
  { id: 'damian', name: 'Damian', badge: 'El Clutcher', avatarColor: '#ff4500' },
  { id: 'azul', name: 'Azul', badge: 'AWP Diva', avatarColor: '#3b82f6' },
  { id: 'hannah', name: 'Hannah', badge: 'Headshot Queen', avatarColor: '#ec4899' },
  { id: 'rex', name: 'Rex', badge: 'Entry Fragger', avatarColor: '#22c55e' },
  { id: 'kano', name: 'Kano', badge: 'Lurker', avatarColor: '#eab308' },
  { id: 'viper', name: 'Viper', badge: 'IGL', avatarColor: '#14b8a6' },
  { id: 'nova', name: 'Nova', badge: 'Support', avatarColor: '#f97316' },
  { id: 'ghost', name: 'Ghost', badge: 'Ninja Defuser', avatarColor: '#a3a3a3' },
  { id: 'milo', name: 'Milo', badge: 'Spray Control', avatarColor: '#06b6d4' },
  { id: 'zeta', name: 'Zeta', badge: 'Anchor', avatarColor: '#ef4444' },
]

export const matches: Match[] = [
  {
    id: 'm1',
    map: 'Mirage',
    date: '2026-06-18',
    ctScore: 16,
    tScore: 12,
    durationMin: 42,
    players: [
      { playerId: 'damian', team: 'CT', kills: 28, deaths: 15, assists: 6, damage: 3120, adr: 111, hsPct: 61, mvps: 4, won: true },
      { playerId: 'rex', team: 'CT', kills: 22, deaths: 18, assists: 4, damage: 2480, adr: 88, hsPct: 48, mvps: 2, won: true },
      { playerId: 'viper', team: 'CT', kills: 18, deaths: 17, assists: 9, damage: 2010, adr: 71, hsPct: 40, mvps: 1, won: true },
      { playerId: 'nova', team: 'CT', kills: 14, deaths: 19, assists: 11, damage: 1740, adr: 62, hsPct: 35, mvps: 0, won: true },
      { playerId: 'milo', team: 'CT', kills: 19, deaths: 16, assists: 5, damage: 2120, adr: 75, hsPct: 52, mvps: 2, won: true },
      { playerId: 'azul', team: 'T', kills: 24, deaths: 20, assists: 3, damage: 2680, adr: 95, hsPct: 33, mvps: 3, won: false },
      { playerId: 'hannah', team: 'T', kills: 21, deaths: 19, assists: 7, damage: 2390, adr: 85, hsPct: 70, mvps: 2, won: false },
      { playerId: 'kano', team: 'T', kills: 17, deaths: 21, assists: 6, damage: 1980, adr: 70, hsPct: 44, mvps: 1, won: false },
      { playerId: 'ghost', team: 'T', kills: 15, deaths: 22, assists: 8, damage: 1810, adr: 64, hsPct: 41, mvps: 0, won: false },
      { playerId: 'zeta', team: 'T', kills: 13, deaths: 22, assists: 5, damage: 1620, adr: 57, hsPct: 38, mvps: 1, won: false },
    ],
  },
  {
    id: 'm2',
    map: 'Dust2',
    date: '2026-06-15',
    ctScore: 13,
    tScore: 16,
    durationMin: 38,
    players: [
      { playerId: 'hannah', team: 'T', kills: 30, deaths: 14, assists: 5, damage: 3340, adr: 119, hsPct: 73, mvps: 5, won: true },
      { playerId: 'azul', team: 'T', kills: 25, deaths: 16, assists: 4, damage: 2790, adr: 99, hsPct: 36, mvps: 3, won: true },
      { playerId: 'kano', team: 'T', kills: 20, deaths: 17, assists: 8, damage: 2240, adr: 80, hsPct: 47, mvps: 2, won: true },
      { playerId: 'ghost', team: 'T', kills: 16, deaths: 18, assists: 10, damage: 1900, adr: 68, hsPct: 42, mvps: 1, won: true },
      { playerId: 'zeta', team: 'T', kills: 14, deaths: 19, assists: 6, damage: 1720, adr: 61, hsPct: 39, mvps: 0, won: true },
      { playerId: 'damian', team: 'CT', kills: 26, deaths: 19, assists: 4, damage: 2910, adr: 104, hsPct: 58, mvps: 3, won: false },
      { playerId: 'rex', team: 'CT', kills: 19, deaths: 20, assists: 5, damage: 2150, adr: 77, hsPct: 50, mvps: 1, won: false },
      { playerId: 'viper', team: 'CT', kills: 15, deaths: 21, assists: 9, damage: 1770, adr: 63, hsPct: 38, mvps: 1, won: false },
      { playerId: 'nova', team: 'CT', kills: 13, deaths: 21, assists: 12, damage: 1640, adr: 58, hsPct: 34, mvps: 0, won: false },
      { playerId: 'milo', team: 'CT', kills: 18, deaths: 20, assists: 4, damage: 2010, adr: 72, hsPct: 51, mvps: 1, won: false },
    ],
  },
  {
    id: 'm3',
    map: 'Inferno',
    date: '2026-06-12',
    ctScore: 16,
    tScore: 9,
    durationMin: 34,
    players: [
      { playerId: 'azul', team: 'CT', kills: 27, deaths: 11, assists: 6, damage: 2980, adr: 118, hsPct: 38, mvps: 5, won: true },
      { playerId: 'milo', team: 'CT', kills: 21, deaths: 13, assists: 7, damage: 2310, adr: 92, hsPct: 55, mvps: 2, won: true },
      { playerId: 'nova', team: 'CT', kills: 16, deaths: 14, assists: 13, damage: 1880, adr: 75, hsPct: 36, mvps: 1, won: true },
      { playerId: 'ghost', team: 'CT', kills: 18, deaths: 13, assists: 8, damage: 2040, adr: 81, hsPct: 43, mvps: 3, won: true },
      { playerId: 'viper', team: 'CT', kills: 15, deaths: 15, assists: 10, damage: 1750, adr: 70, hsPct: 41, mvps: 1, won: true },
      { playerId: 'damian', team: 'T', kills: 22, deaths: 18, assists: 3, damage: 2480, adr: 99, hsPct: 60, mvps: 2, won: false },
      { playerId: 'hannah', team: 'T', kills: 19, deaths: 18, assists: 5, damage: 2160, adr: 86, hsPct: 71, mvps: 2, won: false },
      { playerId: 'rex', team: 'T', kills: 14, deaths: 19, assists: 6, damage: 1640, adr: 65, hsPct: 49, mvps: 0, won: false },
      { playerId: 'kano', team: 'T', kills: 12, deaths: 20, assists: 7, damage: 1480, adr: 59, hsPct: 45, mvps: 1, won: false },
      { playerId: 'zeta', team: 'T', kills: 10, deaths: 20, assists: 4, damage: 1290, adr: 51, hsPct: 37, mvps: 0, won: false },
    ],
  },
  {
    id: 'm4',
    map: 'Nuke',
    date: '2026-06-08',
    ctScore: 14,
    tScore: 16,
    durationMin: 45,
    players: [
      { playerId: 'rex', team: 'T', kills: 29, deaths: 17, assists: 4, damage: 3210, adr: 107, hsPct: 52, mvps: 4, won: true },
      { playerId: 'damian', team: 'T', kills: 25, deaths: 18, assists: 6, damage: 2820, adr: 94, hsPct: 59, mvps: 3, won: true },
      { playerId: 'kano', team: 'T', kills: 18, deaths: 19, assists: 9, damage: 2070, adr: 69, hsPct: 46, mvps: 1, won: true },
      { playerId: 'zeta', team: 'T', kills: 15, deaths: 20, assists: 7, damage: 1760, adr: 59, hsPct: 40, mvps: 1, won: true },
      { playerId: 'ghost', team: 'T', kills: 17, deaths: 19, assists: 8, damage: 1950, adr: 65, hsPct: 42, mvps: 1, won: true },
      { playerId: 'azul', team: 'CT', kills: 26, deaths: 20, assists: 3, damage: 2890, adr: 96, hsPct: 35, mvps: 3, won: false },
      { playerId: 'hannah', team: 'CT', kills: 23, deaths: 19, assists: 5, damage: 2560, adr: 85, hsPct: 69, mvps: 2, won: false },
      { playerId: 'milo', team: 'CT', kills: 19, deaths: 21, assists: 6, damage: 2110, adr: 70, hsPct: 53, mvps: 1, won: false },
      { playerId: 'viper', team: 'CT', kills: 14, deaths: 22, assists: 11, damage: 1670, adr: 56, hsPct: 39, mvps: 0, won: false },
      { playerId: 'nova', team: 'CT', kills: 12, deaths: 22, assists: 13, damage: 1540, adr: 51, hsPct: 33, mvps: 1, won: false },
    ],
  },
  {
    id: 'm5',
    map: 'Ancient',
    date: '2026-06-04',
    ctScore: 16,
    tScore: 14,
    durationMin: 47,
    players: [
      { playerId: 'damian', team: 'CT', kills: 31, deaths: 19, assists: 5, damage: 3380, adr: 102, hsPct: 63, mvps: 4, won: true },
      { playerId: 'viper', team: 'CT', kills: 20, deaths: 18, assists: 12, damage: 2240, adr: 68, hsPct: 42, mvps: 2, won: true },
      { playerId: 'nova', team: 'CT', kills: 17, deaths: 20, assists: 14, damage: 1920, adr: 58, hsPct: 35, mvps: 1, won: true },
      { playerId: 'milo', team: 'CT', kills: 22, deaths: 19, assists: 6, damage: 2470, adr: 75, hsPct: 54, mvps: 2, won: true },
      { playerId: 'rex', team: 'CT', kills: 18, deaths: 19, assists: 7, damage: 2030, adr: 62, hsPct: 47, mvps: 1, won: true },
      { playerId: 'hannah', team: 'T', kills: 27, deaths: 21, assists: 4, damage: 3010, adr: 91, hsPct: 72, mvps: 3, won: false },
      { playerId: 'azul', team: 'T', kills: 24, deaths: 22, assists: 5, damage: 2680, adr: 81, hsPct: 37, mvps: 2, won: false },
      { playerId: 'kano', team: 'T', kills: 19, deaths: 21, assists: 8, damage: 2140, adr: 65, hsPct: 45, mvps: 1, won: false },
      { playerId: 'ghost', team: 'T', kills: 16, deaths: 22, assists: 9, damage: 1820, adr: 55, hsPct: 41, mvps: 1, won: false },
      { playerId: 'zeta', team: 'T', kills: 14, deaths: 22, assists: 6, damage: 1600, adr: 48, hsPct: 38, mvps: 0, won: false },
    ],
  },
]

export const highlights: Highlight[] = [
  {
    id: 'h1',
    playerId: 'damian',
    matchId: 'm1',
    type: 'ACE',
    description: 'Full ace on B site to close out the pistol round.',
    round: 4,
    clipUrl: 'https://example.com/clip/h1',
  },
  {
    id: 'h2',
    playerId: 'hannah',
    matchId: 'm2',
    type: 'CLUTCH',
    description: '1v3 clutch with the AWP to win the half.',
    round: 15,
    clipUrl: 'https://example.com/clip/h2',
  },
  {
    id: 'h3',
    playerId: 'ghost',
    matchId: 'm3',
    type: 'NINJA',
    description: 'Silent ninja defuse under two enemies for the round.',
    round: 22,
  },
  {
    id: 'h4',
    playerId: 'rex',
    matchId: 'm4',
    type: '1v3',
    description: 'Clutched the eco round with only a pistol.',
    round: 19,
    clipUrl: 'https://example.com/clip/h4',
  },
  {
    id: 'h5',
    playerId: 'azul',
    matchId: 'm5',
    type: 'NO-SCOPE',
    description: 'No-scope flick across mid to deny the entry.',
    round: 8,
  },
]

// ---- Nelson League ----
// A 10-person ladder ranked by Nelson Points. The bottom seed is crowned
// the SUPERNELSON (the running joke of the lobby).

export type NelsonTrend = 'up' | 'down' | 'same'

export type NelsonEntry = {
  rank: number
  name: string
  points: number
  trend: NelsonTrend
}

export const nelsonLeague: NelsonEntry[] = [
  { rank: 1, name: 'Damian', points: 1840, trend: 'same' },
  { rank: 2, name: 'Azul', points: 1715, trend: 'up' },
  { rank: 3, name: 'Hannah', points: 1690, trend: 'up' },
  { rank: 4, name: 'Rex', points: 1560, trend: 'down' },
  { rank: 5, name: 'Viper', points: 1485, trend: 'same' },
  { rank: 6, name: 'Milo', points: 1402, trend: 'up' },
  { rank: 7, name: 'Kano', points: 1330, trend: 'down' },
  { rank: 8, name: 'Nova', points: 1255, trend: 'up' },
  { rank: 9, name: 'Ghost', points: 1180, trend: 'down' },
  { rank: 10, name: 'Zeta', points: 1042, trend: 'down' },
]

// ---- Derived helpers ----

export type PlayerStats = {
  player: Player
  matches: number
  wins: number
  losses: number
  kills: number
  deaths: number
  assists: number
  damage: number
  kda: number
}

type SupabasePlayerRecord = {
  id: string
  name: string
  badge: string
  avatar_color: string
}

type SupabaseMatchRecord = {
  id: string
  map: string
  date: string
  ct_score: number
  t_score: number
  duration_min: number
}

type SupabaseMatchPlayerRecord = {
  match_id: string
  player_id: string
  team: 'CT' | 'T'
  kills: number
  deaths: number
  assists: number
  damage: number
  adr: number
  hs_pct: number
  mvps: number
  won: boolean
}

type SupabaseHighlightRecord = {
  id: string
  player_id: string
  match_id: string
  type: HighlightType
  description: string
  round: number
  clip_url?: string | null
}

type SupabaseNelsonEntry = {
  rank: number
  name: string
  points: number
  trend: NelsonTrend
}

export type LiveData = {
  players: Player[]
  matches: Match[]
  highlights: Highlight[]
  nelsonLeague: NelsonEntry[]
}

async function getSupabaseLiveData(): Promise<LiveData | null> {
  const supabase = getSupabaseClient()
  if (!supabase) return null

  try {
    const { data: playerRows, error: playersError } = await supabase
      .from('players')
      .select('id, name, badge, avatar_color')
      .order('name')

    if (playersError || !playerRows) return null

    const players = playerRows.map((row) => ({
      id: row.id,
      name: row.name,
      badge: row.badge,
      avatarColor: row.avatar_color,
    }))

    const { data: matchRows, error: matchesError } = await supabase
      .from('matches')
      .select('id, map, date, ct_score, t_score, duration_min')
      .order('date', { ascending: false })

    if (matchesError || !matchRows) return null

    const matchIds = matchRows.map((row) => row.id)
    let matchPlayers: SupabaseMatchPlayerRecord[] = []

    if (matchIds.length > 0) {
      const { data: matchPlayerRows, error: matchPlayersError } = await supabase
        .from('match_players')
        .select('match_id, player_id, team, kills, deaths, assists, damage, adr, hs_pct, mvps, won')
        .in('match_id', matchIds)

      if (!matchPlayersError && matchPlayerRows) {
        matchPlayers = matchPlayerRows as SupabaseMatchPlayerRecord[]
      }
    }

    const matches = matchRows.map((row) => ({
      id: row.id,
      map: row.map as CSMap,
      date: row.date,
      ctScore: row.ct_score,
      tScore: row.t_score,
      durationMin: row.duration_min,
      players: matchPlayers
        .filter((entry) => entry.match_id === row.id)
        .map((entry) => ({
          playerId: entry.player_id,
          team: entry.team,
          kills: entry.kills,
          deaths: entry.deaths,
          assists: entry.assists,
          damage: entry.damage,
          adr: entry.adr,
          hsPct: entry.hs_pct,
          mvps: entry.mvps,
          won: entry.won,
        })),
    }))

    let highlights: Highlight[] = []
    const { data: highlightRows, error: highlightsError } = await supabase
      .from('highlights')
      .select('id, player_id, match_id, type, description, round, clip_url')
      .order('round')

    if (!highlightsError && highlightRows) {
      highlights = (highlightRows as SupabaseHighlightRecord[]).map((row) => ({
        id: row.id,
        playerId: row.player_id,
        matchId: row.match_id,
        type: row.type,
        description: row.description,
        round: row.round,
        clipUrl: row.clip_url ?? undefined,
      }))
    }

    let nelsonLeague: NelsonEntry[] = []
    const { data: nelsonRows, error: nelsonError } = await supabase
      .from('nelson_league')
      .select('rank, name, points, trend')
      .order('rank')

    if (!nelsonError && nelsonRows) {
      nelsonLeague = (nelsonRows as SupabaseNelsonEntry[]).map((row) => ({
        rank: row.rank,
        name: row.name,
        points: row.points,
        trend: row.trend,
      }))
    }

    return {
      players,
      matches,
      highlights,
      nelsonLeague,
    }
  } catch {
    return null
  }
}

export async function getLiveData(): Promise<LiveData> {
  const liveData = await getSupabaseLiveData()
  if (liveData) {
    return liveData
  }

  return {
    players,
    matches,
    highlights,
    nelsonLeague,
  }
}

function buildPlayerStatsForData(data: LiveData, playerId: string): PlayerStats | null {
  const player = data.players.find((p) => p.id === playerId)
  if (!player) return null

  const entries = data.matches.flatMap((m) =>
    m.players.filter((mp) => mp.playerId === playerId),
  )
  const kills = sum(entries.map((e) => e.kills))
  const deaths = sum(entries.map((e) => e.deaths))
  const assists = sum(entries.map((e) => e.assists))
  const damage = sum(entries.map((e) => e.damage))
  const wins = entries.filter((e) => e.won).length
  const losses = entries.length - wins
  const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths

  return {
    player,
    matches: entries.length,
    wins,
    losses,
    kills,
    deaths,
    assists,
    damage,
    kda: Math.round(kda * 100) / 100,
  }
}

function buildAllPlayerStatsForData(data: LiveData): PlayerStats[] {
  return data.players
    .map((p) => buildPlayerStatsForData(data, p.id))
    .filter((s): s is PlayerStats => s !== null)
    .sort((a, b) => b.kda - a.kda)
}

export function getPlayerStatsSync(playerId: string): PlayerStats | null {
  return buildPlayerStatsForData(
    { players, matches, highlights, nelsonLeague },
    playerId,
  )
}

export async function getPlayerStats(playerId: string): Promise<PlayerStats | null> {
  const data = await getLiveData()
  return buildPlayerStatsForData(data, playerId)
}

export function getAllPlayerStatsSync(): PlayerStats[] {
  return buildAllPlayerStatsForData({ players, matches, highlights, nelsonLeague })
}

export async function getAllPlayerStats(): Promise<PlayerStats[]> {
  const data = await getLiveData()
  return buildAllPlayerStatsForData(data)
}

export function getPlayerMatches(playerId: string) {
  return matches
    .filter((m) => m.players.some((mp) => mp.playerId === playerId))
    .map((m) => ({
      match: m,
      entry: m.players.find((mp) => mp.playerId === playerId)!,
    }))
    .sort((a, b) => b.match.date.localeCompare(a.match.date))
}

export function getPlayerHighlights(playerId: string) {
  return highlights.filter((h) => h.playerId === playerId)
}

export function getMatchHighlights(matchId: string) {
  return highlights.filter((h) => h.matchId === matchId)
}

export function getMatch(matchId: string) {
  return matches.find((m) => m.id === matchId) ?? null
}

export function getPlayer(playerId: string) {
  return players.find((p) => p.id === playerId) ?? null
}

export const leaderHighlights = {
  mostKills: topBySync('kills'),
  bestKda: topBySync('kda'),
  mostDamage: topBySync('damage'),
}

function topBySync(key: 'kills' | 'kda' | 'damage') {
  const stats = getAllPlayerStatsSync()
  return [...stats].sort((a, b) => (b[key] as number) - (a[key] as number))[0]
}

export const highlightTypeColors: Record<HighlightType, string> = {
  ACE: '#ff4500',
  CLUTCH: '#22c55e',
  '1v3': '#3b82f6',
  NINJA: '#a855f7',
  'NO-SCOPE': '#eab308',
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0)
}

export function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
