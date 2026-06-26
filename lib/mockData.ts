import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

export type Player = {
  id: string
  name: string
  badge: string
  avatarColor: string
  photoUrl?: string
  nelsons: number
}

export type MatchPlayer = {
  playerId: string
  team: string
  kills: number
  deaths: number
  assists: number
  damage: number
  adr: number
  hsPct: number
  mvps: number
  won: boolean
}

export type HighlightType = 'ACE' | 'QUAD_KILL' | 'TRIPLE_KILL' | 'CLUTCH' | 'ENTRY_FRAG' | 'KNIFE_KILL' | 'OTHER'

export type Highlight = {
  id: string
  playerId: string
  matchId?: string
  type: HighlightType
  description: string
  round: number
  clipUrl?: string
}

export type CSMap = string

export type Match = {
  id: string
  map: CSMap
  date: string
  ctScore: number
  tScore: number
  durationMin: number
  players: MatchPlayer[]
  winnerTeam?: 'CT' | 'T'
  totalRounds?: number
  videoUrl?: string
  notes?: string
  teamAName?: string
  teamBName?: string
}

export type NelsonTrend = 'up' | 'down' | 'same'

export type NelsonEntry = {
  rank: number
  name: string
  points: number
  trend: NelsonTrend
}

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
  mvps: number
}

type SupabasePlayerRecord = {
  id: string
  name: string | null
  photo_url?: string | null
  badge: string | null
  contador_nelson?: number | null
}

type SupabaseMatchRecord = {
  id: string
  played_at: string | null
  map: string | null
  winner_team: 'CT' | 'T' | null
  score_ct: number | null
  score_t: number | null
  total_rounds: number | null
  video_url?: string | null
  notes?: string | null
  team_a_name?: string | null
  team_b_name?: string | null
  mvp_id?: string | null
}

type SupabaseMatchPlayerRecord = {
  match_id: string
  player_id: string
  team: string | null
  won: boolean | null
  kills: number | null
  deaths: number | null
  assists: number | null
  damage: number | null
}

type SupabaseHighlightRecord = {
  id: string
  player_id: string
  type: string | null
  description: string | null
  round_number: number | null
  clip_url?: string | null
}

export type LiveData = {
  players: Player[]
  matches: Match[]
  highlights: Highlight[]
  nelsonLeague: NelsonEntry[]
}

const EMPTY_LIVE_DATA: LiveData = {
  players: [],
  matches: [],
  highlights: [],
  nelsonLeague: [],
}

function normalizeString(value: unknown, fallback = 'Sin info') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeBoolean(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function normalizeMap(value: unknown): CSMap {
  return typeof value === 'string' && value.trim() ? value.trim() : 'Sin mapa'
}

function createAvatarColor(value: string) {
  const seed = value
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return `hsl(${seed % 360} 65% 45%)`
}

async function getSupabaseLiveData(): Promise<LiveData | null> {
  const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
  if (!supabase) return null

  try {
    let players: Player[] = []
    const { data: playerRows, error: playersError } = await supabase
      .from('players')
      .select('id, name, photo_url, badge, contador_nelson')
      .order('name')

    if (!playersError && playerRows) {
      players = playerRows.map((row) => ({
        id: normalizeString(row.id, 'sin-id'),
        name: normalizeString(row.name),
        badge: normalizeString(row.badge),
        avatarColor: createAvatarColor(normalizeString(row.name)),
        photoUrl: row.photo_url ?? undefined,
        nelsons: row.contador_nelson ?? 0,
      }))
    }

    let matches: Match[] = []
    const { data: matchRows, error: matchesError } = await supabase
      .from('matches')
      .select('id, map, played_at, score_ct, score_t, total_rounds, winner_team, video_url, notes, team_a_name, team_b_name, mvp_id')
      .order('played_at', { ascending: false })

    if (!matchesError && matchRows) {
      const matchIds = matchRows.map((row) => row.id)
      let matchPlayers: SupabaseMatchPlayerRecord[] = []

      if (matchIds.length > 0) {
        const { data: matchPlayerRows, error: matchPlayersError } = await supabase
          .from('match_players')
          .select('match_id, player_id, team, won, kills, deaths, assists, damage')
          .in('match_id', matchIds)

        if (!matchPlayersError && matchPlayerRows) {
          matchPlayers = matchPlayerRows as SupabaseMatchPlayerRecord[]
        }
      }

      matches = matchRows.map((row) => {
        const filteredPlayers = matchPlayers.filter((entry) => entry.match_id === row.id)
        
        let mvpId = row.mvp_id || ''
        
        // Si la partida no tiene MVP guardado (partidas viejas), lo calculamos
        if (!mvpId) {
          let maxScore = -1
          filteredPlayers.forEach((p) => {
            const d = Math.max(1, p.deaths || 0)
            const score = ((p.kills || 0) + (p.assists || 0)) / d + ((p.damage || 0) / 100)
            if (score > maxScore) {
              maxScore = score
              mvpId = p.player_id
            }
          })
        }

        return {
          id: normalizeString(row.id, 'sin-id'),
          map: normalizeMap(row.map),
          date: normalizeString(row.played_at, ''),
          ctScore: normalizeNumber(row.score_ct),
          tScore: normalizeNumber(row.score_t),
          durationMin: normalizeNumber(row.total_rounds),
          winnerTeam: row.winner_team ?? undefined,
          totalRounds: normalizeNumber(row.total_rounds),
          videoUrl: row.video_url ?? undefined,
          notes: row.notes ?? undefined,
          teamAName: row.team_a_name ?? undefined,
          teamBName: row.team_b_name ?? undefined,
          players: filteredPlayers.map((entry) => ({
            playerId: normalizeString(entry.player_id, 'sin-player'),
            team: normalizeString(entry.team, 'CT'),
            kills: normalizeNumber(entry.kills),
            deaths: normalizeNumber(entry.deaths),
            assists: normalizeNumber(entry.assists),
            damage: normalizeNumber(entry.damage),
            adr: 0,
            hsPct: 0,
            mvps: entry.player_id === mvpId ? 1 : 0,
            won: normalizeBoolean(entry.won),
          })),
        }
      })
    }

    let highlights: Highlight[] = []
    const { data: highlightRows, error: highlightsError } = await supabase
      .from('highlights')
      .select('id, player_id, type, description, round_number, clip_url')
      .order('round_number')

    if (!highlightsError && highlightRows) {
      highlights = (highlightRows as SupabaseHighlightRecord[]).map((row) => ({
        id: normalizeString(row.id, 'sin-id'),
        playerId: normalizeString(row.player_id, 'sin-player'),
        matchId: undefined,
        type: (row.type as HighlightType | null) ?? 'OTHER',
        description: normalizeString(row.description),
        round: normalizeNumber(row.round_number),
        clipUrl: row.clip_url ?? undefined,
      }))
    }

    const nelsonLeague: NelsonEntry[] = []

    return {
      players,
      matches,
      highlights,
      nelsonLeague,
    }
  } catch {
    return EMPTY_LIVE_DATA
  }
}

export async function getLiveData(): Promise<LiveData> {
  const liveData = await getSupabaseLiveData()
  return liveData ?? EMPTY_LIVE_DATA
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
  const mvps = sum(entries.map((e) => e.mvps))

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
    mvps,
  }
}

function buildAllPlayerStatsForData(data: LiveData): PlayerStats[] {
  return data.players
    .map((p) => buildPlayerStatsForData(data, p.id))
    .filter((s): s is PlayerStats => s !== null)
    .sort((a, b) => b.kda - a.kda)
}

export function getPlayerStatsSync(playerId: string): PlayerStats | null {
  return buildPlayerStatsForData(EMPTY_LIVE_DATA, playerId)
}

export async function getPlayerStats(playerId: string): Promise<PlayerStats | null> {
  const data = await getLiveData()
  return buildPlayerStatsForData(data, playerId)
}

export function getAllPlayerStatsSync(): PlayerStats[] {
  return buildAllPlayerStatsForData(EMPTY_LIVE_DATA)
}

export async function getAllPlayerStats(): Promise<PlayerStats[]> {
  const data = await getLiveData()
  return buildAllPlayerStatsForData(data)
}

export async function getPlayerHighlights(playerId: string): Promise<Highlight[]> {
  const data = await getLiveData();
  return data.highlights.filter((h) => h.playerId === playerId);
}

export async function getMatchHighlights(matchId: string): Promise<Highlight[]> {
  const data = await getLiveData();
  return data.highlights.filter((h) => h.matchId === matchId);
}

// Returns matches for a specific player.
export async function getPlayerMatches(playerId: string): Promise<Match[]> {
  const data = await getLiveData();
  return data.matches.filter((m) =>
    m.players.some((p) => p.playerId === playerId)
  );
}

export async function getMatch(matchId: string): Promise<Match | null> {
  const data = await getLiveData();
  return data.matches.find((m) => m.id === matchId) ?? null;
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const data = await getLiveData();
  return data.players.find((p) => p.id === playerId) ?? null;
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
  QUAD_KILL: '#3b82f6',
  TRIPLE_KILL: '#22c55e',
  CLUTCH: '#a855f7',
  ENTRY_FRAG: '#eab308',
  KNIFE_KILL: '#f97316',
  OTHER: '#64748b',
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0)
}

export function formatDate(iso: string) {
  if (!iso) return 'Sin info'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return 'Sin info'

  return parsed.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
