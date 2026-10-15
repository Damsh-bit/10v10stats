import { cache } from 'react'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'
import { linkXplay } from './fuente'
import type { CifrasXplay, EquipoResumen, EquipoXplay, JugadorXplay, KillXplay, RondaXplay, StatsJugadorXplay } from './tipos'

/** Lo que guardamos de una partida de Xplay, listo para la página de la partida. */
export type JugadorDetalleXplay = JugadorXplay & { playerId: string | null }

export type DetalleXplay = {
  hash: string
  link: string
  demoUrl: string | null
  scopeMatchId: string | null
  procesada: boolean
  estadoProceso: string | null
  inicio: string | null
  /** El equipo de Xplay que es el "Equipo A" de la partida. */
  equipoA: EquipoXplay
  marcador: [number, number]
  rondasEnMitad: number | null
  rondas: RondaXplay[]
  equipos: EquipoResumen[]
  jugadores: JugadorDetalleXplay[]
  kills: KillXplay[]
}

/** Lo mínimo de cada partida con Xplay, para las listas. */
export type EstadoXplay = { procesada: boolean; inicio: string | null }

const PAGE = 1000

function cliente() {
  return getSupabaseAdminClient() ?? getSupabaseClient()
}

type FilaKill = {
  match_id?: string
  round: number
  seq: number
  at_second: number | null
  killer: number | null
  victim: number
  assister: number | null
  weapon: number
  headshot: boolean
  opening: boolean
  traded: boolean
  team_kill: boolean
}

function aKill(f: FilaKill): KillXplay {
  return {
    ronda: f.round,
    orden: f.seq,
    segundo: f.at_second,
    killer: f.killer === null ? null : Number(f.killer),
    victima: Number(f.victim),
    asistente: f.assister === null ? null : Number(f.assister),
    arma: f.weapon,
    headshot: f.headshot,
    apertura: f.opening,
    tradeada: f.traded,
    fuegoAmigo: f.team_kill,
  }
}

export const getEstadosXplay = cache(async (): Promise<Map<string, EstadoXplay>> => {
  const supabase = cliente()
  const estados = new Map<string, EstadoXplay>()
  if (!supabase) return estados
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('xplay_matches')
      .select('match_id, has_stats, started_at')
      .range(from, from + PAGE - 1)
    if (error || !data) break
    for (const row of data) estados.set(String(row.match_id), { procesada: row.has_stats === true, inicio: row.started_at ?? null })
    if (data.length < PAGE) break
  }
  return estados
})

export const getDetalleXplay = cache(async (matchId: string): Promise<DetalleXplay | null> => {
  const supabase = cliente()
  if (!supabase) return null
  const [partida, jugadores] = await Promise.all([
    supabase.from('xplay_matches').select('*').eq('match_id', matchId).maybeSingle(),
    supabase.from('xplay_match_players').select('*').eq('match_id', matchId),
  ])
  if (partida.error || !partida.data) return null

  const kills: KillXplay[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('xplay_kills')
      .select('round, seq, at_second, killer, victim, assister, weapon, headshot, opening, traded, team_kill')
      .eq('match_id', matchId)
      .order('round')
      .order('seq')
      .range(from, from + PAGE - 1)
    if (error || !data) break
    kills.push(...(data as FilaKill[]).map(aKill))
    if (data.length < PAGE) break
  }

  const row = partida.data
  return {
    hash: row.hash,
    link: linkXplay(row.hash),
    demoUrl: row.demo_url ?? null,
    scopeMatchId: row.scope_match_id ?? null,
    procesada: row.has_stats === true,
    estadoProceso: row.parse_state ?? null,
    inicio: row.started_at ?? null,
    equipoA: row.team_a === 2 ? 2 : 1,
    marcador: [Number(row.score_team1 ?? 0), Number(row.score_team2 ?? 0)],
    rondasEnMitad: row.rounds_in_half ?? null,
    rondas: (row.rounds ?? []) as RondaXplay[],
    equipos: (row.teams ?? []) as EquipoResumen[],
    jugadores: (jugadores.data ?? []).map((j) => ({
      accountId: Number(j.account_id),
      playerId: j.player_id ?? null,
      nombre: j.name,
      avatar: j.avatar_url ?? null,
      equipo: j.team === 2 ? 2 : 1,
      faceitElo: j.faceit_elo ?? null,
      faceitNivel: j.faceit_level ?? null,
      stats: (j.stats ?? null) as StatsJugadorXplay | null,
      hsPct: j.hs_pct === null ? null : Number(j.hs_pct),
    })),
    kills,
  }
})

/** Cifras de Xplay de cada jugador del sitio en cada partida (para los récords). */
export type FilaCifrasXplay = {
  matchId: string
  playerId: string
  rondas: number
  rating: number
  adr: number
  kast: number
  aperturas: number
  clutches: number
}

export const getCifrasXplayTodas = cache(async (): Promise<FilaCifrasXplay[]> => {
  const supabase = cliente()
  const filas: FilaCifrasXplay[] = []
  if (!supabase) return filas
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('xplay_match_players')
      .select('match_id, player_id, rating, adr, kast, opening_kills, clutches_won, rondas:stats->general->rondas')
      .not('player_id', 'is', null)
      .not('rating', 'is', null)
      .range(from, from + PAGE - 1)
    if (error || !data) break
    for (const f of data) {
      filas.push({
        matchId: String(f.match_id),
        playerId: String(f.player_id),
        rondas: Number(f.rondas ?? 0),
        rating: Number(f.rating ?? 0),
        adr: Number(f.adr ?? 0),
        kast: Number(f.kast ?? 0),
        aperturas: Number(f.opening_kills ?? 0),
        clutches: Number(f.clutches_won ?? 0),
      })
    }
    if (data.length < PAGE) break
  }
  return filas
})

/** Una kill en la que estuvo el jugador, con a quién de los dos le tocó. */
export type KillDeJugador = {
  matchId: string
  killer: number
  victima: number
  headshot: boolean
  apertura: boolean
}

export type ParticipanteXplay = { matchId: string; accountId: number; playerId: string | null; nombre: string }

export type CifrasPartidaXplay = { matchId: string; cifras: CifrasXplay; hsPct: number | null }

/**
 * Todo lo de Xplay de un jugador: sus kills y muertes contra rivales (para los
 * duelos), quién era quién en cada una y sus cifras partida por partida.
 */
export async function getXplayDeJugador(playerId: string) {
  const supabase = cliente()
  const vacio = { kills: [] as KillDeJugador[], participantes: [] as ParticipanteXplay[], cifras: [] as CifrasPartidaXplay[] }
  if (!supabase) return vacio

  const { data: propias } = await supabase
    .from('xplay_match_players')
    .select('match_id, account_id, stats, hs_pct')
    .eq('player_id', playerId)
  if (!propias || propias.length === 0) return vacio

  const matchIds = [...new Set(propias.map((p) => String(p.match_id)))]
  const cuentas = [...new Set(propias.map((p) => Number(p.account_id)))]
  const cifras: CifrasPartidaXplay[] = propias
    .filter((p) => p.stats?.general)
    .map((p) => ({ matchId: String(p.match_id), cifras: (p.stats as StatsJugadorXplay).general, hsPct: p.hs_pct === null ? null : Number(p.hs_pct) }))

  // Sólo las partidas en las que jugó con esa cuenta (una cuenta puede haber pasado de mano).
  const suyas = new Set(matchIds)
  const kills: KillDeJugador[] = []
  const filtro = cuentas.flatMap((c) => [`killer.eq.${c}`, `victim.eq.${c}`]).join(',')
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('xplay_kills')
      .select('match_id, killer, victim, headshot, opening')
      .eq('team_kill', false)
      .not('killer', 'is', null)
      .or(filtro)
      .order('match_id')
      .order('round')
      .order('seq')
      .range(from, from + PAGE - 1)
    if (error || !data) break
    for (const k of data) {
      if (!suyas.has(String(k.match_id))) continue
      kills.push({
        matchId: String(k.match_id),
        killer: Number(k.killer),
        victima: Number(k.victim),
        headshot: k.headshot === true,
        apertura: k.opening === true,
      })
    }
    if (data.length < PAGE) break
  }

  const participantes: ParticipanteXplay[] = []
  for (let i = 0; i < matchIds.length; i += 100) {
    const { data } = await supabase
      .from('xplay_match_players')
      .select('match_id, account_id, player_id, name')
      .in('match_id', matchIds.slice(i, i + 100))
    for (const p of data ?? []) {
      participantes.push({ matchId: String(p.match_id), accountId: Number(p.account_id), playerId: p.player_id ?? null, nombre: p.name })
    }
  }

  return { kills, participantes, cifras }
}
