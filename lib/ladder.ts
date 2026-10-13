import type { Match, PlayerStats } from '@/types'

/**
 * Strikes de la ladder (desde la Season 2): cada día de partidas que faltás
 * seguido es un strike. Desde el 3.º, cada día que faltás te saca KDA en la
 * ladder, y cada vez más: 0.05 el primero, 0.10 el siguiente, 0.15 el otro...
 * Si volvés a jugar, los strikes vuelven a 0 (y la escalera arranca de nuevo),
 * pero lo perdido queda por el resto de la temporada: te lo tenés que volver a
 * ganar jugando.
 *
 * Así el que no juega no se queda arriba (o sube) mientras los demás juegan.
 * Es sólo para el orden de la ladder: el KDA real no cambia, y el perfil, los
 * récords y el generador de equipos lo usan tal cual. La Season 1 queda como
 * terminó.
 */
export const LADDER_STRIKES_FROM_SEASON = 2
export const STRIKES_PARA_DESCUENTO = 3
/** Lo que cuesta el primer día con descuento; cada día seguido más cuesta esto más que el anterior. */
export const DESCUENTO_POR_STRIKE = 0.05

const redondear = (v: number) => Math.round(v * 100) / 100

export type EstadoStrikes = {
  /** Días de partidas seguidos, hasta el último, en los que no jugó (vuelve a 0 cuando juega). */
  strikes: number
  /** KDA perdido en la temporada por faltar: no se devuelve al volver. */
  descuento: number
}

/** La regla rige si todas las partidas son de la Season 2 en adelante (la carrera mezcla temporadas: sin strikes). */
export function ladderConStrikes(matches: Pick<Match, 'seasonId'>[]) {
  return matches.length > 0 && matches.every((m) => m.seasonId >= LADDER_STRIKES_FROM_SEASON)
}

/** Las partidas se guardan a medianoche: el día es la fecha sin la hora. */
const diaDePartida = (date: string) => date.slice(0, 10)

/**
 * Recorre los días de partidas del más viejo al más nuevo. Desde su debut, cada
 * día que alguien no juega suma un strike; desde el 3.º seguido, cada día le
 * descuenta lo que marca descuentoDelDia. Jugar le pone los strikes en 0 pero el
 * descuento se queda.
 */
export function contarStrikes(matches: Pick<Match, 'date' | 'players'>[]): Map<string, EstadoStrikes> {
  const jugaronPorDia = new Map<string, Set<string>>()
  for (const match of matches) {
    const dia = diaDePartida(match.date)
    const jugaron = jugaronPorDia.get(dia) ?? new Set<string>()
    for (const entry of match.players) jugaron.add(entry.playerId)
    jugaronPorDia.set(dia, jugaron)
  }

  const estados = new Map<string, EstadoStrikes>()
  for (const dia of [...jugaronPorDia.keys()].sort()) {
    const jugaron = jugaronPorDia.get(dia)!
    for (const [playerId, estado] of estados) {
      if (jugaron.has(playerId)) continue
      estado.strikes++
      estado.descuento = redondear(estado.descuento + descuentoDelDia(estado.strikes))
    }
    for (const playerId of jugaron) {
      const estado = estados.get(playerId) ?? { strikes: 0, descuento: 0 }
      estado.strikes = 0
      estados.set(playerId, estado)
    }
  }
  return estados
}

/** Lo que cuesta el día del strike n.º `strikes`: 0 con 1 o 2; 0.05 con 3, 0.10 con 4, 0.15 con 5, y así. */
export function descuentoDelDia(strikes: number) {
  return strikes >= STRIKES_PARA_DESCUENTO ? redondear((strikes - STRIKES_PARA_DESCUENTO + 1) * DESCUENTO_POR_STRIKE) : 0
}

/** Lo que se pierde en total faltando `strikes` días seguidos: 0.05 con 3, 0.15 con 4, 0.30 con 5, y así. */
export function descuentoPorStrikes(strikes: number) {
  let total = 0
  for (let n = 1; n <= strikes; n++) total += descuentoDelDia(n)
  return redondear(total)
}

/** El KDA con el que se ordena la ladder: el real, menos lo perdido por faltar. */
export function valorLadder(s: Pick<PlayerStats, 'kda' | 'descuentoStrikes'>) {
  const descuento = s.descuentoStrikes ?? 0
  return descuento > 0 ? Math.max(0, redondear(s.kda - descuento)) : s.kda
}
