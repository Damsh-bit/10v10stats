import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import type { Player } from '@/types'
import { LEVEL_MIN_ELO } from '@/lib/faceit-format'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

/**
 * Datos de FACEIT en vivo.
 *
 * Perfil e historial salen de la API que usa la propia web de FACEIT: no pide
 * clave y es la única que trae el elo después de cada partida. Se pide con un
 * User-Agent que identifica al sitio y de a un pedido por vez, porque FACEIT
 * corta las ráfagas. Cuando FACEIT responde, las partidas y el elo se guardan en
 * Supabase (faceit_matches, faceit_elo_snapshots); si un pedido falla se usa lo
 * guardado, así la página nunca queda vacía por un corte de FACEIT.
 * Con FACEIT_API_KEY (developers.faceit.com) hay respaldo en la Data API
 * oficial: mismo historial, pero sin el elo por partida.
 */

const WEB_API = 'https://api.faceit.com'
const DATA_API = 'https://open.faceit.com/data/v4'
const USER_AGENT = '10v10stats/2.0 (+https://github.com/Damsh-bit/10v10stats)'
/** Cada cuánto se vuelven a pedir los datos a FACEIT. */
export const FACEIT_REVALIDATE_SECONDS = 300
const MATCHES_TO_FETCH = 40
const REQUEST_TIMEOUT_MS = 8000

export type FaceitMatch = {
  id: string
  playedAt: number
  /** Nombre para mostrar: "Dust 2", "Mirage"… */
  map: string
  won: boolean
  teamScore: number
  enemyScore: number
  kills: number
  deaths: number
  assists: number
  kd: number
  adr: number
  hsPct: number
  /** Elo después de la partida (null si FACEIT no lo informa). */
  elo: number | null
  eloDelta: number | null
  /** Equipo dentro de la partida, para saber quién jugó con quién. */
  teamId: string | null
}

export type FaceitProfile = {
  nickname: string
  faceitId: string
  url: string
  avatar: string | null
  country: string | null
  level: number
  elo: number
  /** Más nueva primero. */
  matches: FaceitMatch[]
  /** Elo registrado en cada sincronización (más viejo primero): completa el gráfico entre partidas. */
  snapshots: { at: number; elo: number }[]
}

export type FaceitSummary = {
  /** Últimos 5 resultados, más nuevo primero. */
  lastFive: boolean[]
  streak: { won: boolean; count: number } | null
  /** Elo ganado/perdido en las últimas 10 partidas. */
  eloTrend: number
  trendMatches: number
  /** Elo después de cada partida (o registro), del más viejo al actual. */
  eloHistory: EloPoint[]
  peakElo: number
  /** Promedios de las últimas 20 partidas. */
  sample: number
  winRate: number
  kd: number
  adr: number
  hsPct: number
  matchesLast7Days: number
  lastPlayedAt: number | null
  nextLevel: { level: number; eloNeeded: number; progress: number } | null
}

/** Un punto del elo en el tiempo: una partida, o un registro sin partida asociada. */
export type EloPoint = { at: number; elo: number; won: boolean | null; map: string | null; delta: number | null }

export type FaceitEntry = {
  player: Player
  profile: FaceitProfile
  summary: FaceitSummary
}

// ─── Pedidos ──────────────────────────────────────────────────────────────────

/** Cola que hace un pedido por vez, con una pausa entre cada uno. */
function createQueue(gapMs: number) {
  let tail: Promise<unknown> = Promise.resolve()
  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = tail.then(task, task)
    tail = run.then(
      () => sleep(gapMs),
      () => sleep(gapMs),
    )
    return run
  }
}

// El historial es lo que FACEIT más limita; los perfiles aguantan un ritmo mayor.
const profileQueue = createQueue(100)
const historyQueue = createQueue(200)

async function getJson<T>(
  url: string,
  queue: ReturnType<typeof createQueue>,
  headers: Record<string, string> = {},
): Promise<T | null> {
  return queue(async () => {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json', ...headers },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!res.ok) return null
      return (await res.json()) as T
    } catch {
      return null
    }
  })
}

function dataApiHeaders() {
  const key = process.env.FACEIT_API_KEY?.trim()
  return key ? { Authorization: `Bearer ${key}` } : null
}

type WebUser = {
  payload?: {
    id: string
    nickname: string
    avatar?: string
    country?: string
    games?: { cs2?: { faceit_elo?: number; skill_level?: number } }
  }
}

type DataApiUser = {
  player_id: string
  nickname: string
  avatar?: string
  country?: string
  games?: { cs2?: { faceit_elo?: number; skill_level?: number } }
}

type ProfileBase = Omit<FaceitProfile, 'matches' | 'snapshots'>

async function fetchProfileBase(nickname: string): Promise<ProfileBase | null> {
  const web = await getJson<WebUser>(`${WEB_API}/users/v1/nicknames/${encodeURIComponent(nickname)}`, profileQueue)
  let user: DataApiUser | null = web?.payload
    ? { ...web.payload, player_id: web.payload.id }
    : null

  if (!user) {
    const headers = dataApiHeaders()
    if (headers) {
      user = await getJson<DataApiUser>(`${DATA_API}/players?nickname=${encodeURIComponent(nickname)}`, profileQueue, headers)
    }
  }
  if (!user) return null

  const cs2 = user.games?.cs2
  const elo = toNumber(cs2?.faceit_elo)
  return {
    nickname: user.nickname,
    faceitId: user.player_id,
    url: `https://www.faceit.com/es/players/${encodeURIComponent(user.nickname)}`,
    avatar: user.avatar || null,
    country: user.country ?? null,
    level: toNumber(cs2?.skill_level) || levelForElo(elo),
    elo,
  }
}

/** Fila de /stats/v1/stats/time: las claves son códigos internos de FACEIT. */
type WebMatchRow = {
  matchId: string
  date: number
  gameMode?: string
  teamId?: string
  i1?: string // mapa
  i2?: string // equipo ganador
  i6?: string // kills
  i7?: string // asistencias
  i8?: string // muertes
  i12?: string // rondas
  i13?: string // headshots
  c2?: string // K/D
  c4?: string // % HS
  c5?: string // rondas del propio equipo
  c10?: string // ADR
  elo?: string
  elo_delta?: string
}

function fromWebRow(row: WebMatchRow): FaceitMatch {
  const rounds = toNumber(row.i12)
  const teamScore = toNumber(row.c5)
  const kills = toNumber(row.i6)
  const deaths = toNumber(row.i8)
  return {
    id: row.matchId,
    playedAt: row.date,
    map: prettyMap(row.i1),
    won: !!row.teamId && row.i2 === row.teamId,
    teamScore,
    enemyScore: Math.max(0, rounds - teamScore),
    kills,
    deaths,
    assists: toNumber(row.i7),
    kd: toNumber(row.c2) || (deaths ? kills / deaths : kills),
    adr: toNumber(row.c10),
    hsPct: toNumber(row.c4),
    elo: row.elo ? toNumber(row.elo) : null,
    eloDelta: row.elo_delta ? toNumber(row.elo_delta) : null,
    teamId: row.teamId ?? null,
  }
}

type DataApiStats = { items?: { stats: Record<string, string> }[] }

function fromDataApiRow(stats: Record<string, string>): FaceitMatch {
  const [a, b] = String(stats['Score'] ?? '').split('/').map((n) => toNumber(n))
  const teamScore = toNumber(stats['Final Score'])
  const won = stats['Result'] === '1'
  const kills = toNumber(stats['Kills'])
  const deaths = toNumber(stats['Deaths'])
  return {
    id: stats['Match Id'],
    playedAt: toNumber(stats['Match Finished At']) || Date.parse(stats['Created At'] ?? '') || 0,
    map: prettyMap(stats['Map']),
    won,
    teamScore,
    enemyScore: Math.max(0, (a ?? 0) + (b ?? 0) - teamScore),
    kills,
    deaths,
    assists: toNumber(stats['Assists']),
    kd: toNumber(stats['K/D Ratio']) || (deaths ? kills / deaths : kills),
    adr: toNumber(stats['ADR']),
    hsPct: toNumber(stats['Headshots %']),
    elo: null,
    eloDelta: null,
    teamId: stats['Team'] ?? null,
  }
}

/** null = FACEIT no respondió (distinto de "no tiene partidas"). */
async function fetchMatches(faceitId: string): Promise<FaceitMatch[] | null> {
  const rows = await getJson<WebMatchRow[]>(
    `${WEB_API}/stats/v1/stats/time/users/${faceitId}/games/cs2?size=${MATCHES_TO_FETCH}`,
    historyQueue,
  )
  if (Array.isArray(rows)) {
    return rows.filter((row) => row.matchId && (!row.gameMode || row.gameMode === '5v5')).map(fromWebRow)
  }

  const headers = dataApiHeaders()
  if (!headers) return null
  const data = await getJson<DataApiStats>(
    `${DATA_API}/players/${faceitId}/games/cs2/stats?limit=${MATCHES_TO_FETCH}`,
    historyQueue,
    headers,
  )
  return data?.items ? data.items.map((item) => fromDataApiRow(item.stats)).filter((m) => m.id) : null
}

// ─── Guardado en Supabase ─────────────────────────────────────────────────────

const STORED_MATCHES = 40
const STORED_DAYS = 60

function toRow(playerId: string, m: FaceitMatch) {
  return {
    player_id: playerId,
    match_id: m.id,
    played_at: new Date(m.playedAt).toISOString(),
    map: m.map,
    won: m.won,
    team_score: m.teamScore,
    enemy_score: m.enemyScore,
    kills: m.kills,
    deaths: m.deaths,
    assists: m.assists,
    kd: Math.round(m.kd * 100) / 100,
    adr: Math.round(m.adr * 10) / 10,
    hs_pct: Math.round(m.hsPct),
    elo: m.elo,
    elo_delta: m.eloDelta,
    team_id: m.teamId,
    updated_at: new Date().toISOString(),
  }
}

type StoredMatchRow = Omit<ReturnType<typeof toRow>, 'player_id' | 'updated_at'>

function fromRow(row: StoredMatchRow): FaceitMatch {
  return {
    id: row.match_id,
    playedAt: Date.parse(row.played_at),
    map: row.map,
    won: row.won,
    teamScore: row.team_score,
    enemyScore: row.enemy_score,
    kills: row.kills,
    deaths: row.deaths,
    assists: row.assists,
    kd: toNumber(row.kd),
    adr: toNumber(row.adr),
    hsPct: row.hs_pct,
    elo: row.elo,
    eloDelta: row.elo_delta,
    teamId: row.team_id,
  }
}

/** Guarda lo que trajo FACEIT. Nunca tira error: si falla, la próxima sincronización lo reintenta. */
async function persistSync(playerId: string, base: ProfileBase, matches: FaceitMatch[] | null) {
  const supabase = getSupabaseAdminClient()
  if (!supabase) return

  try {
    const { data: last } = await supabase
      .from('faceit_elo_snapshots')
      .select('elo')
      .eq('player_id', playerId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!last || last.elo !== base.elo) {
      await supabase.from('faceit_elo_snapshots').insert({ player_id: playerId, elo: base.elo, level: base.level })
    }

    if (matches && matches.length > 0) {
      // Con elo (API de la web) se pisa todo; sin elo (Data API) sólo se suman las nuevas, para no borrar el elo guardado.
      const withElo = matches.some((m) => m.elo !== null)
      await supabase
        .from('faceit_matches')
        .upsert(
          matches.map((m) => toRow(playerId, m)),
          { onConflict: 'player_id,match_id', ignoreDuplicates: !withElo },
        )
    }
  } catch (err) {
    console.error('No se pudo guardar FACEIT en Supabase', err)
  }
}

/** Lo guardado de un jugador, para cuando FACEIT no devuelve el historial. */
const readStored = unstable_cache(
  async (playerId: string) => {
    const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
    if (!supabase) return { matches: [] as FaceitMatch[], snapshots: [] as FaceitProfile['snapshots'] }

    const since = new Date(Date.now() - STORED_DAYS * 24 * 60 * 60 * 1000).toISOString()
    const [matchesResult, snapshotsResult] = await Promise.all([
      supabase
        .from('faceit_matches')
        .select('match_id, played_at, map, won, team_score, enemy_score, kills, deaths, assists, kd, adr, hs_pct, elo, elo_delta, team_id')
        .eq('player_id', playerId)
        .order('played_at', { ascending: false })
        .limit(STORED_MATCHES),
      supabase
        .from('faceit_elo_snapshots')
        .select('elo, recorded_at')
        .eq('player_id', playerId)
        .gte('recorded_at', since)
        .order('recorded_at', { ascending: true })
        .limit(200),
    ])

    return {
      matches: ((matchesResult.data ?? []) as StoredMatchRow[]).map(fromRow),
      snapshots: (snapshotsResult.data ?? []).map((row) => ({ at: Date.parse(row.recorded_at), elo: Number(row.elo) })),
    }
  },
  ['faceit-stored-v1'],
  { revalidate: FACEIT_REVALIDATE_SECONDS, tags: ['faceit'] },
)

// ─── Sincronización ───────────────────────────────────────────────────────────

/**
 * Perfil + historial de FACEIT, como mucho una vez cada FACEIT_REVALIDATE_SECONDS
 * por jugador. Si el perfil no llega se tira error y unstable_cache sigue
 * devolviendo el último valor bueno.
 */
const syncPlayer = unstable_cache(
  async (playerId: string, nickname: string) => {
    const base = await fetchProfileBase(nickname)
    if (!base) throw new Error(`FACEIT no devolvió el perfil de ${nickname}`)
    const matches = await fetchMatches(base.faceitId)
    await persistSync(playerId, base, matches)
    return { base, matches: matches ? matches.sort((a, b) => b.playedAt - a.playedAt) : null }
  },
  ['faceit-sync-v1'],
  { revalidate: FACEIT_REVALIDATE_SECONDS, tags: ['faceit'] },
)

/** Datos de FACEIT de un jugador del 10v10 (null si no tiene nick o FACEIT nunca respondió). */
export const getFaceitProfile = cache(async (player: Player): Promise<FaceitProfile | null> => {
  if (!player.faceitNickname) return null
  const synced = await syncPlayer(player.id, player.faceitNickname).catch(() => null)
  // Sin historial nuevo (o sin perfil) se completa con lo guardado.
  const stored = synced?.matches ? null : await readStored(player.id).catch(() => null)

  const latestSnapshot = stored?.snapshots[stored.snapshots.length - 1]
  const base: ProfileBase | null =
    synced?.base ??
    (latestSnapshot
      ? {
          nickname: player.faceitNickname,
          faceitId: '',
          url: `https://www.faceit.com/es/players/${encodeURIComponent(player.faceitNickname)}`,
          avatar: null,
          country: null,
          level: levelForElo(latestSnapshot.elo),
          elo: latestSnapshot.elo,
        }
      : null)
  if (!base) return null

  return {
    ...base,
    matches: synced?.matches ?? stored?.matches ?? [],
    snapshots: stored?.snapshots ?? [],
  }
})

/** Jugadores con nick de FACEIT cargado y sus datos, ordenados por elo. */
export async function getFaceitEntries(players: Player[]): Promise<FaceitEntry[]> {
  const linked = players.filter((p) => p.faceitNickname)
  const entries = await Promise.all(
    linked.map(async (player) => {
      const profile = await getFaceitProfile(player)
      return profile ? { player, profile, summary: summarizeFaceit(profile) } : null
    }),
  )
  return entries.filter((e): e is FaceitEntry => e !== null).sort((a, b) => b.profile.elo - a.profile.elo)
}

// ─── Cálculos ─────────────────────────────────────────────────────────────────

export function summarizeFaceit(profile: FaceitProfile, now = Date.now()): FaceitSummary {
  const { matches } = profile
  const lastFive = matches.slice(0, 5).map((m) => m.won)

  let streak: FaceitSummary['streak'] = null
  if (matches.length > 0) {
    const won = matches[0].won
    let count = 0
    while (count < matches.length && matches[count].won === won) count++
    streak = { won, count }
  }

  const trendSlice = matches.slice(0, 10).filter((m) => m.eloDelta !== null)
  const eloTrend = trendSlice.reduce((acc, m) => acc + (m.eloDelta ?? 0), 0)

  const eloHistory = eloTimeline(profile, now).slice(-30)

  const sample = matches.slice(0, 20)
  const kills = sum(sample.map((m) => m.kills))
  const deaths = sum(sample.map((m) => m.deaths))

  return {
    lastFive,
    streak,
    eloTrend,
    trendMatches: trendSlice.length,
    eloHistory,
    peakElo: Math.max(profile.elo, ...eloHistory.map((p) => p.elo)),
    sample: sample.length,
    winRate: sample.length ? Math.round((sample.filter((m) => m.won).length / sample.length) * 100) : 0,
    kd: deaths ? round(kills / deaths, 2) : kills,
    adr: sample.length ? round(sum(sample.map((m) => m.adr)) / sample.length, 1) : 0,
    hsPct: sample.length ? Math.round(sum(sample.map((m) => m.hsPct)) / sample.length) : 0,
    matchesLast7Days: matches.filter((m) => now - m.playedAt < 7 * 24 * 60 * 60 * 1000).length,
    lastPlayedAt: matches[0]?.playedAt ?? null,
    nextLevel: nextLevelInfo(profile.elo),
  }
}

/**
 * Elo en el tiempo, del más viejo al actual: el elo después de cada partida,
 * los registros guardados entre partidas y, si cambió, el elo de ahora.
 */
export function eloTimeline(profile: FaceitProfile, now = Date.now()): EloPoint[] {
  const points: EloPoint[] = profile.matches
    .filter((m) => m.elo !== null)
    .map((m) => ({ at: m.playedAt, elo: m.elo!, won: m.won, map: m.map, delta: m.eloDelta }))
  for (const snap of profile.snapshots) points.push({ at: snap.at, elo: snap.elo, won: null, map: null, delta: null })
  points.sort((a, b) => a.at - b.at)

  // Un registro que repite el elo del punto anterior no aporta nada.
  const timeline: EloPoint[] = []
  for (const point of points) {
    const prev = timeline[timeline.length - 1]
    if (point.won === null && prev?.elo === point.elo) continue
    if (point.won === null && prev) point.delta = point.elo - prev.elo
    timeline.push(point)
  }

  const last = timeline[timeline.length - 1]
  if (last && last.elo !== profile.elo) {
    timeline.push({ at: now, elo: profile.elo, won: null, map: null, delta: profile.elo - last.elo })
  }
  return timeline
}

export function levelForElo(elo: number) {
  let level = 1
  for (let l = 1; l < LEVEL_MIN_ELO.length; l++) if (elo >= LEVEL_MIN_ELO[l]) level = l
  return level
}

function nextLevelInfo(elo: number): FaceitSummary['nextLevel'] {
  const level = levelForElo(elo)
  if (level >= 10) return null
  const floor = LEVEL_MIN_ELO[level]
  const ceiling = LEVEL_MIN_ELO[level + 1]
  return {
    level: level + 1,
    eloNeeded: ceiling - elo,
    progress: Math.min(1, Math.max(0, (elo - floor) / (ceiling - floor))),
  }
}

export type SharedMatch = {
  match: FaceitMatch
  players: { player: Player; match: FaceitMatch }[]
  /** Todos del mismo lado. */
  sameTeam: boolean
}

/** Partidas de FACEIT en las que coincidieron dos o más jugadores del grupo. */
export function findSharedMatches(entries: FaceitEntry[], limit = 8): SharedMatch[] {
  const byId = new Map<string, { player: Player; match: FaceitMatch }[]>()
  for (const { player, profile } of entries) {
    for (const match of profile.matches) {
      const list = byId.get(match.id) ?? []
      list.push({ player, match })
      byId.set(match.id, list)
    }
  }

  return [...byId.values()]
    .filter((list) => list.length >= 2)
    .map((list) => ({
      match: list[0].match,
      players: list,
      sameTeam: new Set(list.map((p) => p.match.teamId)).size === 1,
    }))
    .sort((a, b) => b.match.playedAt - a.match.playedAt)
    .slice(0, limit)
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

function prettyMap(raw: unknown) {
  const slug = String(raw ?? '').replace(/^de_/, '').trim()
  if (!slug) return 'Sin mapa'
  if (slug === 'dust2') return 'Dust 2'
  return slug.charAt(0).toUpperCase() + slug.slice(1)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function toNumber(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0)
}

function round(value: number, decimals: number) {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

// ─── Filas livianas para la ladder (lo que viaja al navegador) ───────────────

export type FaceitLadderRow = {
  player: Player
  nickname: string
  url: string
  avatar: string | null
  level: number
  elo: number
  lastFive: boolean[]
  streak: FaceitSummary['streak']
  eloTrend: number
  trendMatches: number
  /** Elo de las últimas 10 partidas (11 puntos), del más viejo al actual: el mismo tramo que eloTrend. */
  spark: number[]
  winRate: number
  kd: number
  adr: number
  sample: number
  matchesLast7Days: number
  lastPlayedLabel: string | null
  nextLevel: FaceitSummary['nextLevel']
}

export function toLadderRows(entries: FaceitEntry[], now = Date.now()): FaceitLadderRow[] {
  return entries.map(({ player, profile, summary }) => ({
    player,
    nickname: profile.nickname,
    url: profile.url,
    avatar: profile.avatar,
    level: profile.level,
    elo: profile.elo,
    lastFive: summary.lastFive,
    streak: summary.streak,
    eloTrend: summary.eloTrend,
    trendMatches: summary.trendMatches,
    spark: summary.eloHistory.slice(-11).map((p) => p.elo),
    winRate: summary.winRate,
    kd: summary.kd,
    adr: summary.adr,
    sample: summary.sample,
    matchesLast7Days: summary.matchesLast7Days,
    lastPlayedLabel: summary.lastPlayedAt ? timeAgo(summary.lastPlayedAt, now) : null,
    nextLevel: summary.nextLevel,
  }))
}

/** "hace 3 h", "hace 2 d": corto, para filas apretadas. */
export function timeAgo(timestamp: number, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - timestamp) / 60000))
  if (minutes < 60) return `hace ${Math.max(1, minutes)} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  if (days < 30) return `hace ${days} d`
  const months = Math.round(days / 30)
  return `hace ${months} ${months === 1 ? 'mes' : 'meses'}`
}

// ─── Carrera de elo (todos juntos, por día) ──────────────────────────────────

export type EloRaceSeries = { id: string; name: string; elo: number; level: number }
export type EloRaceDay = { day: string; label: string } & Record<string, number | string | null>

const DAY_MS = 24 * 60 * 60 * 1000
/** Argentina no tiene horario de verano: UTC−3 fijo. */
const AR_OFFSET_MS = -3 * 60 * 60 * 1000
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/**
 * Elo de cada jugador al final de cada día de la ventana. Antes de su primera
 * partida conocida se usa el elo previo a esa partida, salvo que la muestra no
 * alcance a cubrir la ventana (ahí queda vacío para no inventar datos).
 */
export function buildEloRace(entries: FaceitEntry[], days = 30, now = Date.now()) {
  const todayStart = Math.floor((now + AR_OFFSET_MS) / DAY_MS) * DAY_MS - AR_OFFSET_MS
  const windowStart = todayStart - (days - 1) * DAY_MS

  const series: EloRaceSeries[] = entries.map(({ player, profile }) => ({
    id: player.id,
    name: player.name,
    elo: profile.elo,
    level: profile.level,
  }))

  // Antes del primer dato conocido de cada uno no se inventa nada: su línea arranca ahí.
  const timelines = entries.map(({ player, profile }) => ({ id: player.id, points: eloTimeline(profile, now) }))

  const rows: EloRaceDay[] = []
  for (let d = 0; d < days; d++) {
    const start = windowStart + d * DAY_MS
    const end = start + DAY_MS
    const local = new Date(start + AR_OFFSET_MS)
    const row: EloRaceDay = {
      day: local.toISOString().slice(0, 10),
      label: `${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]}`,
    }
    for (const t of timelines) {
      const last = [...t.points].reverse().find((p) => p.at < end)
      row[t.id] = last ? last.elo : null
    }
    rows.push(row)
  }

  // Ganancia neta de la ventana por jugador: desde su primer dato dentro de la ventana.
  const change = Object.fromEntries(
    series.map((s) => {
      const values = rows.map((r) => r[s.id]).filter((v): v is number => typeof v === 'number')
      return [s.id, values.length >= 2 ? values[values.length - 1] - values[0] : 0]
    }),
  )

  return { series, rows, change }
}

/** "28 sep" en hora de Argentina (se calcula en el servidor: sin diferencias al hidratar). */
export function shortDate(timestamp: number) {
  const local = new Date(timestamp + AR_OFFSET_MS)
  return `${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]}`
}

export type EloChartPoint = { label: string; elo: number; won: boolean | null; map: string | null; delta: number | null }

export function toEloChartPoints(summary: FaceitSummary): EloChartPoint[] {
  return summary.eloHistory.map((p) => ({ label: shortDate(p.at), elo: p.elo, won: p.won, map: p.map, delta: p.delta }))
}

