import type { Match, PlayerStats } from '@/types'

/**
 * Puntaje de la ladder: desde la Season 2 no manda sólo el KDA, también cuánto
 * jugaste. El KDA se multiplica por la asistencia (partidas jugadas sobre las
 * partidas de la temporada): si jugaste todas queda igual, y cada partida que
 * faltás descuenta un poco, hasta un 30% si no jugaste ninguna.
 *
 * Así el que deja de jugar va bajando, en vez de subir solo porque a los que
 * juegan les baja el KDA. La Season 1 queda como terminó (sólo KDA).
 */
export const LADDER_ASISTENCIA_FROM_SEASON = 2
export const DESCUENTO_MAXIMO_ASISTENCIA = 0.3

const redondear = (v: number) => Math.round(v * 100) / 100

/** La regla rige si todas las partidas son de la Season 2 en adelante (la carrera mezcla temporadas: sólo KDA). */
export function ladderPorAsistencia(matches: Pick<Match, 'seasonId'>[]) {
  return matches.length > 0 && matches.every((m) => m.seasonId >= LADDER_ASISTENCIA_FROM_SEASON)
}

/** Entre 0.7 (no jugó ninguna) y 1 (jugó todas). */
export function factorAsistencia(jugadas: number, total: number) {
  if (total <= 0) return 1
  return 1 - DESCUENTO_MAXIMO_ASISTENCIA * (1 - Math.min(jugadas / total, 1))
}

export function puntajeLadder(kda: number, jugadas: number, total: number) {
  return redondear(kda * factorAsistencia(jugadas, total))
}

/** Lo que ordena la ladder: el puntaje si la temporada lo usa, si no el KDA. */
export function valorLadder(s: Pick<PlayerStats, 'kda' | 'puntaje'>) {
  return s.puntaje ?? s.kda
}

/** Cómo se llama ese número al lado de un valor ("1.79 pts" o "1.83 KDA"). */
export function unidadLadder(s: Pick<PlayerStats, 'puntaje'>) {
  return s.puntaje !== undefined ? 'pts' : 'KDA'
}
