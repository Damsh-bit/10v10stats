import { getSupabaseAdminClient } from '@/lib/supabase'
import { mvpWinnersOnly, pickMvp } from '@/lib/mvp'
import { diaDeSesion } from './fuente'
import type { EquipoXplay, PartidaXplay } from './tipos'

/**
 * Guarda una partida de Xplay en la base.
 *
 * - Partida nueva: se crea en `matches` y `match_players` con los números de
 *   Xplay, igual que si se hubiera cargado a mano.
 * - Partida que ya estaba (cargada con la captura): se completa. Si SCOPE la
 *   procesó, sus números reemplazan a los de la captura; si no, se dejan como
 *   estaban y sólo se suma lo de Xplay (equipos, demo).
 *
 * En los dos casos se guardan las rondas, las kills y la cuenta de Steam de
 * cada jugador, para que la próxima vez se reconozcan solos.
 */

export type AsignacionXplay = {
  accountId: number
  playerId: string
  /** Juega de invitado: aparece en la tabla pero no suma estadísticas. */
  invitado?: boolean
}

export type GuardarXplayOpciones = {
  partida: PartidaXplay
  asignaciones: AsignacionXplay[]
  /** Partida del sitio que se completa; sin ella se crea una nueva. */
  matchId?: string | null
  /** Nombres de los equipos de Xplay 1 y 2, para una partida nueva. */
  nombres?: { 1: string; 2: string }
}

export class ErrorXplay extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly matchId?: string,
  ) {
    super(message)
  }
}

type MatchExistente = {
  id: string
  team_a_name: string | null
  team_b_name: string | null
  mvp_id: string | null
  season_id: number | null
  score_ct: number
  score_t: number
}

type FilaJugador = {
  player_id: string
  team: string
  won: boolean | null
  kills: number
  deaths: number
  assists: number
  damage: number
  hs_pct: number
  is_guest: boolean
}

function db() {
  const supabase = getSupabaseAdminClient()
  if (!supabase) throw new ErrorXplay('Falta la clave de servidor de Supabase', 500)
  return supabase
}

function check<T>(result: { data: T; error: { message: string } | null }, mensaje: string): T {
  if (result.error) throw new ErrorXplay(`${mensaje}: ${result.error.message}`, 500)
  return result.data
}

function validarAsignaciones(partida: PartidaXplay, asignaciones: AsignacionXplay[]) {
  const porCuenta = new Map(asignaciones.map((a) => [a.accountId, a]))
  for (const jugador of partida.jugadores) {
    if (!porCuenta.get(jugador.accountId)?.playerId) {
      throw new ErrorXplay(`Falta elegir quién es ${jugador.nombre}`)
    }
  }
  const ids = partida.jugadores.map((j) => porCuenta.get(j.accountId)!.playerId)
  if (new Set(ids).size !== ids.length) throw new ErrorXplay('Hay un jugador elegido dos veces')
  return porCuenta
}

/** El Equipo A de una partida existente: el equipo de Xplay que más coincide con sus jugadores. */
function equipoA(partida: PartidaXplay, porCuenta: Map<number, AsignacionXplay>, match: MatchExistente, filas: { player_id: string; team: string }[]): EquipoXplay {
  const nombreA = match.team_a_name || 'Equipo A'
  let votos1 = 0
  let votos2 = 0
  for (const jugador of partida.jugadores) {
    const fila = filas.find((f) => f.player_id === porCuenta.get(jugador.accountId)?.playerId)
    if (!fila) continue
    const enA = fila.team === nombreA || fila.team === 'CT'
    if ((jugador.equipo === 1) === enA) votos1++
    else votos2++
  }
  if (votos1 !== votos2) return votos1 > votos2 ? 1 : 2
  // Sin jugadores en común: por el marcador.
  const [s1, s2] = partida.marcador
  return match.score_ct === s2 && match.score_t === s1 && s1 !== s2 ? 2 : 1
}

async function ajustarContadorMvp(anterior: string | null, nuevo: string | null) {
  if (anterior === nuevo) return
  const supabase = db()
  if (anterior) {
    const { data } = await supabase.from('players').select('mvps').eq('id', anterior).single()
    if (data) await supabase.from('players').update({ mvps: Math.max(0, Number(data.mvps || 0) - 1) }).eq('id', anterior)
  }
  if (nuevo) {
    const { data } = await supabase.from('players').select('mvps').eq('id', nuevo).single()
    if (data) await supabase.from('players').update({ mvps: Number(data.mvps || 0) + 1 }).eq('id', nuevo)
  }
}

function filasDeJugadores(
  partida: PartidaXplay,
  porCuenta: Map<number, AsignacionXplay>,
  equipoA: EquipoXplay,
  nombreA: string,
  nombreB: string,
  invitadosPrevios = new Set<string>(),
): FilaJugador[] {
  const [s1, s2] = partida.marcador
  const empate = s1 === s2
  const ganador: EquipoXplay = s1 > s2 ? 1 : 2
  return partida.jugadores.map((jugador) => {
    const asignacion = porCuenta.get(jugador.accountId)!
    const general = jugador.stats?.general
    return {
      player_id: asignacion.playerId,
      team: jugador.equipo === equipoA ? nombreA : nombreB,
      won: empate ? null : jugador.equipo === ganador,
      kills: general?.kills ?? 0,
      deaths: general?.deaths ?? 0,
      assists: general?.assists ?? 0,
      damage: general?.damage ?? 0,
      hs_pct: Math.round(jugador.hsPct ?? 0),
      is_guest: Boolean(asignacion.invitado) || invitadosPrevios.has(asignacion.playerId),
    }
  })
}

async function guardarSteam(asignaciones: AsignacionXplay[]) {
  const supabase = db()
  for (const { accountId, playerId } of asignaciones) {
    // Una cuenta es de un solo jugador: si estaba en otro (se había elegido mal), se le saca.
    await supabase.from('players').update({ steam_account_id: null }).eq('steam_account_id', accountId).neq('id', playerId)
    await supabase.from('players').update({ steam_account_id: accountId }).eq('id', playerId)
  }
}

async function guardarDetalle(matchId: string, partida: PartidaXplay, porCuenta: Map<number, AsignacionXplay>, equipoA: EquipoXplay) {
  const supabase = db()
  check(
    await supabase.from('xplay_matches').upsert(
      {
        match_id: matchId,
        hash: partida.hash,
        xplay_id: partida.xplayId,
        scope_match_id: partida.scopeMatchId,
        map_name: partida.mapaInterno,
        started_at: partida.inicio,
        parse_state: partida.estadoProceso,
        has_stats: partida.procesada,
        demo_url: partida.demoUrl,
        score_team1: partida.marcador[0],
        score_team2: partida.marcador[1],
        team_a: equipoA,
        rounds_in_half: partida.rondasEnMitad,
        rounds: partida.rondas,
        teams: partida.equipos,
        imported_at: new Date().toISOString(),
      },
      { onConflict: 'match_id' },
    ),
    'No se pudo guardar la partida de Xplay',
  )

  check(await supabase.from('xplay_match_players').delete().eq('match_id', matchId), 'No se pudieron limpiar los jugadores')
  check(
    await supabase.from('xplay_match_players').insert(
      partida.jugadores.map((j) => {
        const g = j.stats?.general
        return {
          match_id: matchId,
          account_id: j.accountId,
          player_id: porCuenta.get(j.accountId)?.playerId ?? null,
          name: j.nombre,
          avatar_url: j.avatar,
          team: j.equipo,
          faceit_elo: j.faceitElo,
          faceit_level: j.faceitNivel,
          kills: g?.kills ?? null,
          deaths: g?.deaths ?? null,
          assists: g?.assists ?? null,
          damage: g?.damage ?? null,
          adr: g?.adr ?? null,
          rating: g?.rating ?? null,
          kast: g?.kast ?? null,
          hs_pct: j.hsPct,
          mvps: g?.mvps ?? null,
          opening_kills: g?.aperturas ?? null,
          trade_kills: g?.tradeKills ?? null,
          clutches_won: g?.clutches ?? null,
          stats: j.stats,
        }
      }),
    ),
    'No se pudieron guardar los jugadores de Xplay',
  )

  check(await supabase.from('xplay_kills').delete().eq('match_id', matchId), 'No se pudieron limpiar las kills')
  const kills = partida.kills.map((k) => ({
    match_id: matchId,
    round: k.ronda,
    seq: k.orden,
    at_second: k.segundo,
    killer: k.killer,
    victim: k.victima,
    assister: k.asistente,
    weapon: k.arma,
    headshot: k.headshot,
    opening: k.apertura,
    traded: k.tradeada,
    team_kill: k.fuegoAmigo,
  }))
  for (let i = 0; i < kills.length; i += 500) {
    check(await supabase.from('xplay_kills').insert(kills.slice(i, i + 500)), 'No se pudieron guardar las kills')
  }
}

async function completarExistente(matchId: string, partida: PartidaXplay, porCuenta: Map<number, AsignacionXplay>) {
  const supabase = db()
  const match = check(
    await supabase
      .from('matches')
      .select('id, team_a_name, team_b_name, mvp_id, season_id, score_ct, score_t')
      .eq('id', matchId)
      .maybeSingle(),
    'No se pudo leer la partida',
  ) as MatchExistente | null
  if (!match) throw new ErrorXplay('No se encontró la partida a completar', 404)

  const filas = (check(
    await supabase.from('match_players').select('id, player_id, team, is_guest').eq('match_id', matchId),
    'No se pudieron leer los jugadores',
  ) ?? []) as { id: string; player_id: string; team: string; is_guest: boolean }[]

  const a = equipoA(partida, porCuenta, match, filas)
  const nombreA = match.team_a_name || 'Equipo A'
  const nombreB = match.team_b_name || 'Equipo B'

  if (partida.procesada) {
    const invitados = new Set(filas.filter((f) => f.is_guest).map((f) => f.player_id))
    const nuevas = filasDeJugadores(partida, porCuenta, a, nombreA, nombreB, invitados)
    const ids = new Set(nuevas.map((n) => n.player_id))

    for (const fila of nuevas) {
      const previa = filas.find((f) => f.player_id === fila.player_id)
      if (previa) {
        check(await supabase.from('match_players').update(fila).eq('id', previa.id), 'No se pudo actualizar un jugador')
      } else {
        check(await supabase.from('match_players').insert({ match_id: matchId, ...fila }), 'No se pudo sumar un jugador')
      }
    }
    // Los que figuraban en la captura pero no jugaron según Xplay.
    const sobran = filas.filter((f) => !ids.has(f.player_id)).map((f) => f.id)
    if (sobran.length) check(await supabase.from('match_players').delete().in('id', sobran), 'No se pudo sacar un jugador')

    const [s1, s2] = partida.marcador
    const scoreA = a === 1 ? s1 : s2
    const scoreB = a === 1 ? s2 : s1
    const mvp = pickMvp(nuevas.filter((f) => !f.is_guest), { winnersOnly: mvpWinnersOnly(match.season_id) })
    check(
      await supabase
        .from('matches')
        .update({
          map: partida.mapa,
          score_ct: scoreA,
          score_t: scoreB,
          winner_team: scoreA === scoreB ? 'EMPATE' : scoreA > scoreB ? nombreA : nombreB,
          mvp_id: mvp,
        })
        .eq('id', matchId),
      'No se pudo actualizar la partida',
    )
    await ajustarContadorMvp(match.mvp_id, mvp)
  }

  await guardarDetalle(matchId, partida, porCuenta, a)
}

async function crearNueva(partida: PartidaXplay, porCuenta: Map<number, AsignacionXplay>, nombres: { 1: string; 2: string }) {
  if (!partida.procesada) {
    throw new ErrorXplay(
      'SCOPE todavía no procesó la demo de esta partida, así que no hay números para cargarla. Probá en un rato o cargala con la captura.',
    )
  }
  const supabase = db()
  const nombreA = nombres[1].trim() || 'Equipo A'
  const nombreB = nombres[2].trim() || 'Equipo B'
  const [s1, s2] = partida.marcador
  const filas = filasDeJugadores(partida, porCuenta, 1, nombreA, nombreB)
  const mvp = pickMvp(filas.filter((f) => !f.is_guest), { winnersOnly: true })

  const creada = check(
    await supabase
      .from('matches')
      .insert({
        map: partida.mapa,
        team_a_name: nombreA,
        team_b_name: nombreB,
        score_ct: s1,
        score_t: s2,
        winner_team: s1 === s2 ? 'EMPATE' : s1 > s2 ? nombreA : nombreB,
        played_at: diaDeSesion(partida.inicio),
        mvp_id: mvp,
      })
      .select('id')
      .single(),
    'No se pudo crear la partida',
  ) as { id: string }

  try {
    check(await supabase.from('match_players').insert(filas.map((f) => ({ match_id: creada.id, ...f }))), 'No se pudieron guardar los jugadores')
    await guardarDetalle(creada.id, partida, porCuenta, 1)
  } catch (error) {
    await supabase.from('match_players').delete().eq('match_id', creada.id)
    await supabase.from('matches').delete().eq('id', creada.id)
    throw error
  }
  await ajustarContadorMvp(null, mvp)
  return creada.id
}

export async function guardarPartidaXplay({ partida, asignaciones, matchId, nombres }: GuardarXplayOpciones) {
  const porCuenta = validarAsignaciones(partida, asignaciones)
  const supabase = db()

  const previa = check(
    await supabase.from('xplay_matches').select('match_id').eq('hash', partida.hash).maybeSingle(),
    'No se pudo revisar si ya estaba cargada',
  ) as { match_id: string } | null
  if (previa && previa.match_id !== matchId) {
    throw new ErrorXplay('Esta partida de Xplay ya está cargada.', 409, previa.match_id)
  }

  let id: string
  let creada = false
  if (matchId) {
    await completarExistente(matchId, partida, porCuenta)
    id = matchId
  } else {
    id = await crearNueva(partida, porCuenta, nombres ?? { 1: 'Equipo A', 2: 'Equipo B' })
    creada = true
  }

  await guardarSteam(partida.jugadores.map((j) => porCuenta.get(j.accountId)!))
  return { matchId: id, creada }
}
