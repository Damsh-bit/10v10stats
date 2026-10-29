import { pairKey } from '@/lib/team-history'
import type { FilaCifrasXplay, KillCruzada } from './leer'

/**
 * Rating de Xplay de cada jugador, el número con el que el generador arma los
 * equipos. Funciones puras: corren en el servidor y viajan como datos.
 *
 * Es el Rating 2.1 que SCOPE.GG le da en cada partida, promediado por ronda
 * jugada. Sale de partidas contra los mismos de siempre, así que todos se miden
 * con la misma vara (el FACEIT se juega contra otra gente).
 *
 * Con pocas rondas no se le cree del todo: se mezcla con un punto de partida
 * que vale como RONDAS_BASE rondas más.
 * - En la carrera, el punto de partida es el promedio del grupo. Si alguien
 *   recién empieza y tiene FACEIT, arranca con lo que suele sacar acá la gente
 *   de su elo, y eso se apaga a medida que juega: a las RONDAS_FACEIT rondas ya
 *   no cuenta nada.
 * - En una temporada o en las últimas partidas, el punto de partida es su carrera.
 */

/** Cuánto vale el punto de partida, en rondas (≈ 3 partidas). */
export const RONDAS_BASE = 60
/** Rondas con Xplay a partir de las cuales el FACEIT ya no cuenta (≈ 5 partidas). */
export const RONDAS_FACEIT = 100
/** Partidas con elo de FACEIT necesarias para traducir el elo a rating. */
const MIN_FILAS_FACEIT = 30
/** El rating que sale del FACEIT no se aleja más que esto del promedio del grupo. */
const TOPE_FACEIT = 0.4

/** Con qué se completó lo que le falta de muestra. */
export type OrigenBase = 'promedio' | 'faceit' | 'carrera'

export type RatingXplay = {
  /** El que usa el generador: su promedio mezclado con el punto de partida. */
  rating: number
  /** Su promedio real por ronda; null si no jugó ninguna con Xplay. */
  crudo: number | null
  partidas: number
  rondas: number
  adr: number | null
  kast: number | null
  base: OrigenBase
}

type Suma = { partidas: number; rondas: number; rating: number; adr: number; kast: number }

function sumarPorJugador(filas: FilaCifrasXplay[]) {
  const sumas = new Map<string, Suma>()
  for (const f of filas) {
    if (f.rondas <= 0) continue
    const s = sumas.get(f.playerId) ?? { partidas: 0, rondas: 0, rating: 0, adr: 0, kast: 0 }
    s.partidas++
    s.rondas += f.rondas
    s.rating += f.rating * f.rondas
    s.adr += f.adr * f.rondas
    s.kast += f.kast * f.rondas
    sumas.set(f.playerId, s)
  }
  return sumas
}

/** Rating promedio por ronda de todo el grupo (≈ 1). */
function promedioGrupo(filas: FilaCifrasXplay[]) {
  let rondas = 0
  let rating = 0
  for (const f of filas) {
    if (f.rondas <= 0) continue
    rondas += f.rondas
    rating += f.rating * f.rondas
  }
  return rondas > 0 ? rating / rondas : 1
}

/** Recta que traduce el elo de FACEIT al rating que se suele sacar acá con ese elo; null si no hay datos. */
function traducirFaceit(filas: FilaCifrasXplay[], promedio: number) {
  const puntos = filas.filter((f) => f.faceitElo && f.rondas > 0)
  if (puntos.length < MIN_FILAS_FACEIT) return null
  const mx = puntos.reduce((acc, f) => acc + f.faceitElo!, 0) / puntos.length
  const my = puntos.reduce((acc, f) => acc + f.rating, 0) / puntos.length
  let cov = 0
  let varx = 0
  for (const f of puntos) {
    cov += (f.faceitElo! - mx) * (f.rating - my)
    varx += (f.faceitElo! - mx) ** 2
  }
  const pendiente = varx > 0 ? cov / varx : 0
  if (pendiente <= 0) return null
  return (elo: number) =>
    Math.min(promedio + TOPE_FACEIT, Math.max(promedio - TOPE_FACEIT, my + pendiente * (elo - mx)))
}

function armar(suma: Suma | undefined, base: number, origen: OrigenBase): RatingXplay {
  const rondas = suma?.rondas ?? 0
  return {
    rating: ((suma?.rating ?? 0) + RONDAS_BASE * base) / (rondas + RONDAS_BASE),
    crudo: suma && rondas > 0 ? suma.rating / rondas : null,
    partidas: suma?.partidas ?? 0,
    rondas,
    adr: suma && rondas > 0 ? suma.adr / rondas : null,
    kast: suma && rondas > 0 ? suma.kast / rondas : null,
    base: origen,
  }
}

/** Rating de toda la carrera. `eloFaceit` sólo hace falta para los que jugaron poco con Xplay. */
export function ratingsCarrera(
  filas: FilaCifrasXplay[],
  playerIds: string[],
  eloFaceit: Record<string, number>,
): Record<string, RatingXplay> {
  const promedio = promedioGrupo(filas)
  const desdeElo = traducirFaceit(filas, promedio)
  const sumas = sumarPorJugador(filas)

  return Object.fromEntries(
    playerIds.map((id) => {
      const suma = sumas.get(id)
      const elo = eloFaceit[id]
      const semilla = elo && desdeElo ? desdeElo(elo) : null
      const peso = semilla === null ? 0 : Math.max(0, 1 - (suma?.rondas ?? 0) / RONDAS_FACEIT)
      const base = semilla === null ? promedio : promedio + (semilla - promedio) * peso
      return [id, armar(suma, base, peso > 0 ? 'faceit' : 'promedio')]
    }),
  )
}

/** Rating dentro de una temporada o de las últimas partidas: lo que falta se completa con la carrera. */
export function ratingsContexto(
  filas: FilaCifrasXplay[],
  carrera: Record<string, RatingXplay>,
): Record<string, RatingXplay> {
  const sumas = sumarPorJugador(filas)
  return Object.fromEntries(Object.entries(carrera).map(([id, c]) => [id, armar(sumas.get(id), c.rating, 'carrera')]))
}

/** Las últimas `n` partidas de Xplay de cada jugador. `orden`: posición de cada partida, la más nueva en 0. */
export function ultimasDeCada(filas: FilaCifrasXplay[], orden: Map<string, number>, n: number) {
  const porJugador = new Map<string, FilaCifrasXplay[]>()
  for (const f of filas) {
    if (!orden.has(f.matchId)) continue
    const lista = porJugador.get(f.playerId) ?? []
    lista.push(f)
    porJugador.set(f.playerId, lista)
  }
  return [...porJugador.values()].flatMap((lista) =>
    lista.sort((a, b) => orden.get(a.matchId)! - orden.get(b.matchId)!).slice(0, n),
  )
}

/**
 * Cara a cara: cuántas veces se mataron entre sí dos jugadores del sitio.
 * Clave de la dupla → [kills del id menor al mayor, kills del mayor al menor].
 */
export type CaraACaraMap = Record<string, [number, number]>

export function armarCaraACara(kills: KillCruzada[], filas: FilaCifrasXplay[], matchIds?: Set<string>): CaraACaraMap {
  const quien = new Map(filas.map((f) => [`${f.matchId}:${f.accountId}`, f.playerId]))
  const mapa: CaraACaraMap = {}
  for (const k of kills) {
    if (matchIds && !matchIds.has(k.matchId)) continue
    const killer = quien.get(`${k.matchId}:${k.killer}`)
    const victima = quien.get(`${k.matchId}:${k.victima}`)
    if (!killer || !victima || killer === victima) continue
    const par = (mapa[pairKey(killer, victima)] ??= [0, 0])
    par[killer < victima ? 0 : 1]++
  }
  return mapa
}

/** El cara a cara visto desde `a`: cuántas veces mató a `b` y cuántas lo mató `b`. */
export function getCaraACara(mapa: CaraACaraMap, a: string, b: string) {
  const par = mapa[pairKey(a, b)]
  if (!par) return { mato: 0, murio: 0 }
  return a < b ? { mato: par[0], murio: par[1] } : { mato: par[1], murio: par[0] }
}
