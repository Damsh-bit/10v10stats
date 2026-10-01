import type { Match, MatchPlayer } from '@/types'

/**
 * Historial del 10v10 que usa el generador de equipos: cómo viene cada uno
 * (racha y últimas partidas) y qué pasa cuando dos jugadores coinciden.
 * Funciones puras: se calculan en el servidor y viajan al navegador como datos.
 */

export type MatchResult = 'W' | 'L' | 'D'

export type PlayerForm = {
  /** Últimos resultados en el 10v10, la más nueva primero. */
  recent: MatchResult[]
  /** Positiva = victorias seguidas, negativa = derrotas seguidas (los empates no cortan). */
  streak: number
}

/** Lo que pasó cuando A y B coincidieron en una partida. A es siempre el id menor. */
export type PairStats = {
  /** Partidas en el mismo equipo, victorias y puntos que sacaron (victoria 1, empate 0,5). */
  together: number
  togetherWins: number
  togetherPoints: number
  /** Partidas en equipos rivales y cuántas ganó el equipo de cada uno. */
  apart: number
  apartWinsA: number
  apartWinsB: number
  /** Partidas en las que coincidieron (de cualquier lado) y en cuántas A tuvo mejor partida que B (empate 0,5). */
  shared: number
  betterA: number
}

export type PairStatsMap = Record<string, PairStats>

/** La misma dupla vista desde un jugador. */
export type PairView = {
  together: number
  togetherWins: number
  togetherPoints: number
  /** Partidas como rivales, ganadas y perdidas por el equipo de `a`. */
  apart: number
  apartWins: number
  apartLosses: number
  shared: number
  /** Partidas en las que `a` tuvo mejor partida que `b`. */
  better: number
}

const RECENT_RESULTS = 5

export function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** Puntaje de una partida individual: el mismo que elige al MVP. */
export function matchScore(entry: Pick<MatchPlayer, 'kills' | 'assists' | 'deaths' | 'damage'>) {
  return (entry.kills + entry.assists) / Math.max(1, entry.deaths) + entry.damage / 100
}

function points(entry: MatchPlayer) {
  return entry.won ? 1 : entry.draw ? 0.5 : 0
}

/** Racha y últimos resultados de cada jugador. `matches` va de la más nueva a la más vieja. */
export function buildPlayerForm(matches: Match[], playerIds: string[]): Record<string, PlayerForm> {
  const results = new Map<string, MatchResult[]>(playerIds.map((id) => [id, []]))
  for (const match of matches) {
    for (const entry of match.players) {
      results.get(entry.playerId)?.push(entry.won ? 'W' : entry.draw ? 'D' : 'L')
    }
  }

  return Object.fromEntries(
    playerIds.map((id) => {
      const all = results.get(id) ?? []
      const decided = all.filter((r) => r !== 'D')
      let streak = 0
      if (decided.length > 0) {
        const first = decided[0]
        let count = 0
        while (count < decided.length && decided[count] === first) count++
        streak = first === 'W' ? count : -count
      }
      return [id, { recent: all.slice(0, RECENT_RESULTS), streak }]
    }),
  )
}

/** Estadísticas de cada dupla que coincidió al menos una vez en `matches`. */
export function buildPairStats(matches: Match[]): PairStatsMap {
  const pairs: PairStatsMap = {}

  for (const match of matches) {
    const entries = [...match.players].sort((x, y) => (x.playerId < y.playerId ? -1 : 1))
    const scores = entries.map(matchScore)

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i]
        const b = entries[j]
        if (a.playerId === b.playerId) continue
        const key = pairKey(a.playerId, b.playerId)
        const pair = (pairs[key] ??= { together: 0, togetherWins: 0, togetherPoints: 0, apart: 0, apartWinsA: 0, apartWinsB: 0, shared: 0, betterA: 0 })

        pair.shared++
        pair.betterA += scores[i] > scores[j] ? 1 : scores[i] === scores[j] ? 0.5 : 0
        if (a.team === b.team) {
          pair.together++
          if (a.won) pair.togetherWins++
          pair.togetherPoints += points(a)
        } else {
          pair.apart++
          if (a.won) pair.apartWinsA++
          if (b.won) pair.apartWinsB++
        }
      }
    }
  }

  return pairs
}

export function getPair(pairs: PairStatsMap, a: string, b: string): PairView {
  const pair = pairs[pairKey(a, b)]
  if (!pair) return { together: 0, togetherWins: 0, togetherPoints: 0, apart: 0, apartWins: 0, apartLosses: 0, shared: 0, better: 0 }
  const aIsFirst = a < b
  return {
    together: pair.together,
    togetherWins: pair.togetherWins,
    togetherPoints: pair.togetherPoints,
    apart: pair.apart,
    apartWins: aIsFirst ? pair.apartWinsA : pair.apartWinsB,
    apartLosses: aIsFirst ? pair.apartWinsB : pair.apartWinsA,
    shared: pair.shared,
    better: aIsFirst ? pair.betterA : pair.shared - pair.betterA,
  }
}
