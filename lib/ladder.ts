import type { Match, PlayerStats } from '@/types'

/**
 * Strikes de la ladder (desde la Season 2): cada día de partidas que faltás
 * seguido es un strike. Con 3 strikes se te descuenta 0.10 de KDA en la ladder,
 * y 0.10 más por cada día que sigas faltando. Apenas volvés a jugar se borran.
 *
 * Así el que no juega no se queda arriba (o sube) mientras los demás juegan.
 * Es sólo para el orden de la ladder: el KDA real no cambia, y el perfil, los
 * récords y el generador de equipos lo usan tal cual. La Season 1 queda como
 * terminó.
 */
export const LADDER_STRIKES_FROM_SEASON = 2
export const STRIKES_PARA_DESCUENTO = 3
export const DESCUENTO_POR_STRIKE = 0.1

const redondear = (v: number) => Math.round(v * 100) / 100

/** La regla rige si todas las partidas son de la Season 2 en adelante (la carrera mezcla temporadas: sin strikes). */
export function ladderConStrikes(matches: Pick<Match, 'seasonId'>[]) {
  return matches.length > 0 && matches.every((m) => m.seasonId >= LADDER_STRIKES_FROM_SEASON)
}

/** Las partidas se guardan a medianoche: el día es la fecha sin la hora. */
const diaDePartida = (date: string) => date.slice(0, 10)

/** Strikes de cada jugador: días de partidas seguidos, hasta el último, en los que no jugó. */
export function contarStrikes(matches: Pick<Match, 'date' | 'players'>[]): Map<string, number> {
  const dias = [...new Set(matches.map((m) => diaDePartida(m.date)))].sort().reverse()
  const ultimoDia = new Map<string, string>()
  for (const match of matches) {
    const dia = diaDePartida(match.date)
    for (const entry of match.players) {
      const previo = ultimoDia.get(entry.playerId)
      if (!previo || dia > previo) ultimoDia.set(entry.playerId, dia)
    }
  }
  return new Map([...ultimoDia].map(([playerId, dia]) => [playerId, dias.filter((d) => d > dia).length]))
}

/** 0 con 1 o 2 strikes; 0.10 con 3, 0.20 con 4, y así. */
export function descuentoPorStrikes(strikes: number) {
  return strikes >= STRIKES_PARA_DESCUENTO ? redondear((strikes - STRIKES_PARA_DESCUENTO + 1) * DESCUENTO_POR_STRIKE) : 0
}

/** El KDA con el que se ordena la ladder: el real, menos el descuento por strikes. */
export function valorLadder(s: Pick<PlayerStats, 'kda' | 'strikes'>) {
  const descuento = descuentoPorStrikes(s.strikes ?? 0)
  return descuento > 0 ? Math.max(0, redondear(s.kda - descuento)) : s.kda
}
