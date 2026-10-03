import { cache } from 'react'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'
import {
  getCurrentSeason,
  getSeasonSnapshots,
  getSeasons,
  seasonIdForDate,
  type Season,
  type SeasonSnapshot,
} from '@/lib/seasons'
import type { Player, CSMap, Match, PlayerStats, LiveData, NelsonEntry } from '@/types'
import { computeKDRecord } from '@/lib/utils'
import { mvpWinnersOnly, pickMvp } from '@/lib/mvp'

export { formatDate } from '@/lib/format'

type SupabaseMatchPlayerRecord = {
  player_id: string
  team: string | null
  won: boolean | null
  kills: number | null
  deaths: number | null
  assists: number | null
  damage: number | null
  hs_pct: number | null
  is_guest?: boolean | null
}

type SupabaseMatchRecord = {
  id: string
  played_at: string | null
  map: string | null
  winner_team: string | null
  score_ct: number | null
  score_t: number | null
  total_rounds: number | null
  foto_url?: string | null
  notes?: string | null
  team_a_name?: string | null
  team_b_name?: string | null
  mvp_id?: string | null
  season_id?: number | null
  match_players: SupabaseMatchPlayerRecord[] | null
}

/**
 * Todo lo que la app necesita para cualquier temporada, en una sola carga.
 * `players` trae los contadores "vivos" (Nelson, Fakasos) de la temporada activa.
 */
export type LeagueData = {
  players: Player[]
  matches: Match[]
  seasons: Season[]
  currentSeason: Season
  snapshots: SeasonSnapshot[] | null
}

const EMPTY_LIVE_DATA: LiveData = {
  players: [],
  matches: [],
  nelsonLeague: [],
}

const PAGE_SIZE = 1000
const MATCH_COLUMNS =
  'id, map, played_at, score_ct, score_t, total_rounds, winner_team, foto_url, notes, team_a_name, team_b_name, mvp_id'
const MATCH_PLAYER_FIELDS = 'player_id, team, won, kills, deaths, assists, damage, hs_pct'

function normalizeString(value: unknown, fallback = 'Sin info') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeNumber(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return fallback
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

type SupabaseClient = NonNullable<ReturnType<typeof getSupabaseClient>>

/**
 * Trae todas las partidas (con sus jugadores embebidos) paginando de a 1000:
 * PostgREST corta en 1000 filas por request y sin paginar las partidas nuevas
 * dejarían de aparecer.
 */
async function fetchAllMatchRows(supabase: SupabaseClient, withSeasonColumns: boolean) {
  const columns = withSeasonColumns
    ? `${MATCH_COLUMNS}, season_id, match_players(${MATCH_PLAYER_FIELDS}, is_guest)`
    : `${MATCH_COLUMNS}, match_players(${MATCH_PLAYER_FIELDS})`
  const rows: SupabaseMatchRecord[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('matches')
      .select(columns)
      .order('played_at', { ascending: false })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) return { rows: null, error }
    rows.push(...((data ?? []) as unknown as SupabaseMatchRecord[]))
    if (!data || data.length < PAGE_SIZE) break
  }

  return { rows, error: null }
}

function toMatch(row: SupabaseMatchRecord, seasons: Season[]): Match {
  const allEntries = row.match_players ?? []
  const counted = allEntries.filter((entry) => !entry.is_guest)
  const isDraw = row.score_ct === row.score_t
  const date = normalizeString(row.played_at, '')
  const seasonId = row.season_id ?? seasonIdForDate(seasons, date)
  const winnersOnly = mvpWinnersOnly(seasonId)
  let mvpId = row.mvp_id || ''

  // Desde la Season 2 un MVP guardado del equipo que perdió no vale: se recalcula.
  const winners = counted.filter((p) => p.won === true)
  if (winnersOnly && mvpId && winners.length > 0 && !winners.some((p) => p.player_id === mvpId)) mvpId = ''

  // Partidas viejas sin MVP guardado: se calcula igual que al cargarlas.
  if (!mvpId) mvpId = pickMvp(counted, { winnersOnly }) ?? ''

  const toEntry = (entry: SupabaseMatchPlayerRecord) => ({
    playerId: normalizeString(entry.player_id, 'sin-player'),
    team: normalizeString(entry.team, 'CT'),
    kills: normalizeNumber(entry.kills),
    deaths: normalizeNumber(entry.deaths),
    assists: normalizeNumber(entry.assists),
    damage: normalizeNumber(entry.damage),
    adr: 0,
    hsPct: normalizeNumber(entry.hs_pct),
    mvps: !entry.is_guest && entry.player_id === mvpId ? 1 : 0,
    won: isDraw ? false : normalizeBoolean(entry.won),
    draw: isDraw,
    ...(entry.is_guest ? { guest: true } : {}),
  })

  return {
    id: normalizeString(row.id, 'sin-id'),
    seasonId,
    map: normalizeMap(row.map),
    date,
    ctScore: normalizeNumber(row.score_ct),
    tScore: normalizeNumber(row.score_t),
    durationMin: normalizeNumber(row.total_rounds),
    winnerTeam: (row.winner_team ?? undefined) as Match['winnerTeam'],
    totalRounds: normalizeNumber(row.total_rounds),
    fotoUrl: row.foto_url ?? undefined,
    notes: row.notes ?? undefined,
    teamAName: row.team_a_name ?? undefined,
    teamBName: row.team_b_name ?? undefined,
    players: counted.map(toEntry),
    guests: allEntries.filter((entry) => entry.is_guest).map(toEntry),
  }
}

export const getLeagueData = cache(async (): Promise<LeagueData> => {
  const [seasons, snapshots] = await Promise.all([getSeasons(), getSeasonSnapshots()])
  const currentSeason = getCurrentSeason(seasons)
  const empty: LeagueData = { players: [], matches: [], seasons, currentSeason, snapshots }

  const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
  if (!supabase) return empty

  try {
    const [playersResult, fakesResult, faceitResult] = await Promise.all([
      supabase.from('players').select('id, name, photo_url, badge, contador_nelson').order('name'),
      supabase.from('fake_leaderboard').select('player_name, fake_count'),
      // Aparte: si estas columnas no existen, el resto de la app sigue andando sin ellas.
      supabase.from('players').select('id, faceit_nickname, menuda_mierda'),
    ])

    const fakesByName = new Map<string, number>(
      (fakesResult.data ?? []).map((row) => [String(row.player_name).toLowerCase(), Number(row.fake_count ?? 0)]),
    )
    const menudaMierdaIds = new Set(
      (faceitResult.data ?? []).filter((row) => row.menuda_mierda === true).map((row) => String(row.id)),
    )
    const faceitById = new Map<string, string>(
      (faceitResult.data ?? [])
        .filter((row) => typeof row.faceit_nickname === 'string' && row.faceit_nickname.trim())
        .map((row) => [String(row.id), String(row.faceit_nickname).trim()]),
    )

    const players: Player[] = (playersResult.data ?? []).map((row) => {
      const name = normalizeString(row.name)
      return {
        id: normalizeString(row.id, 'sin-id'),
        name,
        badge: normalizeString(row.badge),
        avatarColor: createAvatarColor(name),
        photoUrl: row.photo_url ?? undefined,
        nelsons: normalizeNumber(row.contador_nelson),
        fakes: fakesByName.get(name.toLowerCase()) ?? 0,
        faceitNickname: faceitById.get(String(row.id)),
        menudaMierda: menudaMierdaIds.has(String(row.id)),
      }
    })

    // Con las migraciones aplicadas las partidas traen `season_id` e `is_guest`; si
    // todavía no existen se reintenta sin ellas y se asigna la temporada por fecha.
    let result = await fetchAllMatchRows(supabase, true)
    if (result.error) result = await fetchAllMatchRows(supabase, false)

    const matches = (result.rows ?? []).map((row) => toMatch(row, seasons))

    return { players, matches, seasons, currentSeason, snapshots }
  } catch {
    return empty
  }
})

/**
 * Datos de una temporada: sus partidas y los contadores de esa temporada.
 * Para temporadas cerradas los contadores salen del snapshot; si no hay
 * snapshot (migración sin aplicar) se usan los contadores vivos.
 */
export function getSeasonData(league: LeagueData, seasonId: number): LiveData {
  const isCurrent = seasonId === league.currentSeason.id
  const seasonSnapshots = league.snapshots?.filter((s) => s.seasonId === seasonId) ?? []
  const snapshotByPlayer = new Map(seasonSnapshots.map((s) => [s.playerId, s]))
  const useSnapshot = !isCurrent && seasonSnapshots.length > 0

  const players = league.players.map((player) => {
    if (!useSnapshot) return player
    const snapshot = snapshotByPlayer.get(player.id)
    return { ...player, nelsons: snapshot?.nelsonPoints ?? 0, fakes: snapshot?.fakeCount ?? 0 }
  })

  return {
    players,
    matches: league.matches.filter((m) => m.seasonId === seasonId),
    nelsonLeague: buildNelsonLeague(players),
  }
}

/** Todas las temporadas juntas, con Nelsons/Fakasos acumulados. */
export function getCareerData(league: LeagueData): LiveData {
  const archived = league.snapshots?.filter((s) => s.seasonId !== league.currentSeason.id) ?? []

  const players = league.players.map((player) => {
    const past = archived.filter((s) => s.playerId === player.id)
    return {
      ...player,
      nelsons: player.nelsons + past.reduce((acc, s) => acc + s.nelsonPoints, 0),
      fakes: (player.fakes ?? 0) + past.reduce((acc, s) => acc + s.fakeCount, 0),
    }
  })

  return { players, matches: league.matches, nelsonLeague: buildNelsonLeague(players) }
}

function buildNelsonLeague(players: Player[]): NelsonEntry[] {
  return players
    .map((p) => ({ rank: 0, id: p.id, name: p.name, points: p.nelsons, trend: 'same' as const }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }))
}

/** Datos de la temporada activa. */
export async function getLiveData(): Promise<LiveData> {
  const league = await getLeagueData()
  return getSeasonData(league, league.currentSeason.id)
}

function buildPlayerStatsForData(data: LiveData, playerId: string, lastN?: number): PlayerStats | null {
  const player = data.players.find((p) => p.id === playerId)
  if (!player) return null

  const allEntries = data.matches.flatMap((m) =>
    m.players.filter((mp) => mp.playerId === playerId),
  )
  const entries = lastN ? allEntries.slice(0, lastN) : allEntries
  const kills = sum(entries.map((e) => e.kills))
  const deaths = sum(entries.map((e) => e.deaths))
  const assists = sum(entries.map((e) => e.assists))
  const damage = sum(entries.map((e) => e.damage))
  const wins = entries.filter((e) => e.won).length
  const draws = entries.filter((e) => e.draw).length
  const losses = entries.length - wins - draws
  const adm = entries.length > 0 ? Math.round(damage / entries.length) : 0
  const kda = deaths === 0 ? kills + assists : (kills + assists) / deaths
  const mvps = sum(entries.map((e) => e.mvps))

  const validHsEntries = entries.filter((e) => e.hsPct > 0)
  const hsPct = validHsEntries.length > 0
    ? sum(validHsEntries.map((e) => e.hsPct)) / validHsEntries.length
    : 0

  const kdRecord = computeKDRecord(entries)

  let currentStreak = 0
  let currentLossStreak = 0
  for (const entry of entries) {
    if (entry.won) {
      currentStreak++
    } else if (!entry.draw) {
      break
    }
  }

  for (const entry of entries) {
    if (!entry.won && !entry.draw) {
      currentLossStreak++
    } else if (!entry.draw) {
      break
    }
  }

  return {
    player,
    matches: entries.length,
    wins,
    draws,
    losses,
    kills,
    deaths,
    assists,
    damage,
    adm,
    kda: Math.round(kda * 100) / 100,
    mvps,
    hsPct: Math.round(hsPct),
    currentStreak,
    currentLossStreak,
    ...kdRecord,
  }
}

function rankStats(data: LiveData, lastNPerPlayer?: number, minMatches = 0) {
  return data.players
    .map((p) => buildPlayerStatsForData(data, p.id, lastNPerPlayer))
    .filter((s): s is PlayerStats => s !== null && s.matches >= minMatches)
    .sort((a, b) => b.kda - a.kda)
}

function buildAllPlayerStatsForData(data: LiveData, lastNPerPlayer?: number, minMatches = 0): PlayerStats[] {
  const currentStats = rankStats(data, lastNPerPlayer, minMatches)
  if (data.matches.length === 0) return currentStats

  // Tendencia: posición actual vs. posición antes de la última partida.
  const prevStats = rankStats({ ...data, matches: data.matches.slice(1) }, lastNPerPlayer, minMatches)

  currentStats.forEach((stat, currentIndex) => {
    const prevIndex = prevStats.findIndex((p) => p.player.id === stat.player.id)
    if (prevIndex === -1) {
      stat.trend = minMatches > 0 ? 'new' : 'same'
    } else if (currentIndex < prevIndex) {
      stat.trend = 'up'
    } else if (currentIndex > prevIndex) {
      stat.trend = 'down'
    } else {
      stat.trend = 'same'
    }
  })

  return currentStats
}

export function getPlayerStatsForData(
  data: LiveData,
  options?: { minMatches?: number; lastNMatches?: number; lastNMatchesPerPlayer?: number },
): PlayerStats[] {
  let filteredData = data
  if (options?.lastNMatches) {
    filteredData = { ...filteredData, matches: filteredData.matches.slice(0, options.lastNMatches) }
  }

  return buildAllPlayerStatsForData(filteredData, options?.lastNMatchesPerPlayer, options?.minMatches ?? 0)
}

export function getSinglePlayerStats(data: LiveData, playerId: string): PlayerStats | null {
  return buildPlayerStatsForData(data, playerId)
}

export async function getAllPlayerStats(
  options?: { minMatches?: number; lastNMatches?: number; lastNMatchesPerPlayer?: number },
): Promise<PlayerStats[]> {
  const data = await getLiveData()
  return getPlayerStatsForData(data, options)
}

function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0)
}
