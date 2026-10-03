/**
 * MVP de una partida: el mejor puntaje (K + A) / D + daño / 100.
 *
 * Desde la Season 2 el MVP sólo puede salir del equipo que ganó el mapa: el
 * que perdió no es MVP aunque haya hecho más daño. En un empate no hay
 * ganador y compiten los diez. La Season 1 queda como terminó.
 */
export const MVP_WINNERS_ONLY_FROM_SEASON = 2

export type MvpCandidate = {
  player_id: string
  kills?: number | null
  deaths?: number | null
  assists?: number | null
  damage?: number | null
  won?: boolean | null
}

export function mvpScore(p: MvpCandidate) {
  const deaths = Math.max(1, p.deaths || 0)
  return ((p.kills || 0) + (p.assists || 0)) / deaths + (p.damage || 0) / 100
}

/** La regla del equipo ganador rige para la temporada indicada (sin dato: la activa). */
export function mvpWinnersOnly(seasonId: number | null | undefined) {
  return seasonId == null || seasonId >= MVP_WINNERS_ONLY_FROM_SEASON
}

export function pickMvp(players: MvpCandidate[], { winnersOnly }: { winnersOnly: boolean }): string | null {
  const winners = players.filter((p) => p.won === true)
  const pool = winnersOnly && winners.length > 0 ? winners : players

  let mvpId: string | null = null
  let maxScore = -1
  for (const p of pool) {
    const score = mvpScore(p)
    if (score > maxScore) {
      maxScore = score
      mvpId = p.player_id
    }
  }
  return mvpId
}
