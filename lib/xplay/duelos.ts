import type { Player } from '@/types'
import type { KillXplay } from './tipos'
import type { CifrasPartidaXplay, KillDeJugador, ParticipanteXplay } from './leer'

/**
 * Duelos: cuántas veces un jugador mató a cada rival y cuántas lo mataron.
 * Un "duelo" es una kill entre los dos (no cuenta el fuego amigo ni las
 * muertes solas). Funciones puras: corren en el servidor y viajan como datos.
 */

/** Con menos duelos que esto no se elige el mejor ni el peor cruce. */
export const MIN_DUELOS_DESTACADO = 5

export type FilaDuelo = {
  /** Id del jugador del sitio, o `cuenta-…` si no está en el sitio. */
  key: string
  player: Player | null
  nombre: string
  mato: number
  murio: number
  /** % de los duelos que ganó (0–100). */
  pct: number
  /** De las veces que lo mató, cuántas fueron de cabeza. */
  headshots: number
  aperturasGanadas: number
  aperturasPerdidas: number
  /** Partidas en las que se cruzaron. */
  partidas: number
}

export type ResumenDuelos = {
  filas: FilaDuelo[]
  mato: number
  murio: number
  pct: number
  victima: FilaDuelo | null
  verdugo: FilaDuelo | null
  mejor: FilaDuelo | null
  peor: FilaDuelo | null
}

const porcentaje = (a: number, total: number) => (total > 0 ? Math.round((a / total) * 100) : 0)

export function resumirDuelos({
  playerId,
  kills,
  participantes,
  matchIds,
  players,
}: {
  playerId: string
  kills: KillDeJugador[]
  participantes: ParticipanteXplay[]
  /** Partidas del período (temporada o carrera). */
  matchIds: Set<string>
  players: Player[]
}): ResumenDuelos {
  const playerById = new Map(players.map((p) => [p.id, p]))
  const quien = new Map(participantes.map((p) => [`${p.matchId}:${p.accountId}`, p]))
  const propia = new Map(participantes.filter((p) => p.playerId === playerId).map((p) => [p.matchId, p.accountId]))
  const filas = new Map<string, FilaDuelo & { _partidas: Set<string> }>()

  for (const kill of kills) {
    if (!matchIds.has(kill.matchId)) continue
    const yo = propia.get(kill.matchId)
    if (yo === undefined) continue
    const gane = kill.killer === yo
    if (!gane && kill.victima !== yo) continue
    const cuentaRival = gane ? kill.victima : kill.killer
    const rival = quien.get(`${kill.matchId}:${cuentaRival}`)
    if (rival?.playerId === playerId) continue
    const key = rival?.playerId ?? `cuenta-${cuentaRival}`
    const player = rival?.playerId ? playerById.get(rival.playerId) ?? null : null
    let fila = filas.get(key)
    if (!fila) {
      fila = {
        key,
        player,
        nombre: player?.name ?? rival?.nombre ?? 'Desconocido',
        mato: 0,
        murio: 0,
        pct: 0,
        headshots: 0,
        aperturasGanadas: 0,
        aperturasPerdidas: 0,
        partidas: 0,
        _partidas: new Set(),
      }
      filas.set(key, fila)
    }
    fila._partidas.add(kill.matchId)
    if (gane) {
      fila.mato++
      if (kill.headshot) fila.headshots++
      if (kill.apertura) fila.aperturasGanadas++
    } else {
      fila.murio++
      if (kill.apertura) fila.aperturasPerdidas++
    }
  }

  const lista: FilaDuelo[] = [...filas.values()]
    .map(({ _partidas, ...fila }) => ({ ...fila, partidas: _partidas.size, pct: porcentaje(fila.mato, fila.mato + fila.murio) }))
    .sort((a, b) => b.mato + b.murio - (a.mato + a.murio) || b.pct - a.pct)

  const mato = lista.reduce((acc, f) => acc + f.mato, 0)
  const murio = lista.reduce((acc, f) => acc + f.murio, 0)
  const conVolumen = lista.filter((f) => f.mato + f.murio >= MIN_DUELOS_DESTACADO)
  const maxPor = (fn: (f: FilaDuelo) => number, pool: FilaDuelo[]) =>
    pool.reduce<FilaDuelo | null>((best, f) => (best === null || fn(f) > fn(best) ? f : best), null)

  return {
    filas: lista,
    mato,
    murio,
    pct: porcentaje(mato, mato + murio),
    victima: maxPor((f) => f.mato * 1000 + f.pct, lista.filter((f) => f.mato > 0)),
    verdugo: maxPor((f) => f.murio * 1000 - f.pct, lista.filter((f) => f.murio > 0)),
    mejor: maxPor((f) => f.pct * 1000 + f.mato, conVolumen),
    peor: maxPor((f) => (100 - f.pct) * 1000 + f.murio, conVolumen),
  }
}

/** Cifras de Xplay de un jugador sumadas en un período. */
export type ResumenCifrasXplay = {
  partidas: number
  rating: number
  adr: number
  kast: number
  hsPct: number
  aperturas: number
  clutches: number
  tradeKills: number
  flasheados: number
  /** Promedio por partida. */
  aperturasPorPartida: number
}

export function resumirCifrasXplay(cifras: CifrasPartidaXplay[], matchIds: Set<string>): ResumenCifrasXplay | null {
  const propias = cifras.filter((c) => matchIds.has(c.matchId))
  if (propias.length === 0) return null
  let rondas = 0
  let damage = 0
  let kastRondas = 0
  let ratingRondas = 0
  let kills = 0
  let hsKills = 0
  let aperturas = 0
  let clutches = 0
  let tradeKills = 0
  let flasheados = 0
  for (const { cifras: c, hsPct } of propias) {
    const r = Math.max(1, c.rondas)
    rondas += r
    damage += c.damage
    kastRondas += (c.kast / 100) * r
    ratingRondas += c.rating * r
    kills += c.kills
    hsKills += ((hsPct ?? 0) / 100) * c.kills
    aperturas += c.aperturas
    clutches += c.clutches
    tradeKills += c.tradeKills
    flasheados += c.flasheados
  }
  const redondear = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d
  return {
    partidas: propias.length,
    rating: redondear(ratingRondas / rondas, 2),
    adr: redondear(damage / rondas),
    kast: redondear((kastRondas / rondas) * 100),
    hsPct: kills > 0 ? Math.round((hsKills / kills) * 100) : 0,
    aperturas,
    clutches,
    tradeKills,
    flasheados,
    aperturasPorPartida: redondear(aperturas / propias.length),
  }
}

/** Kills de cada jugador contra cada rival en una partida: `${killer}-${victima}` → cantidad. */
export function cruces(kills: KillXplay[]) {
  const mapa = new Map<string, number>()
  for (const k of kills) {
    if (k.killer === null || k.fuegoAmigo) continue
    const key = `${k.killer}-${k.victima}`
    mapa.set(key, (mapa.get(key) ?? 0) + 1)
  }
  return mapa
}
