import type { LiveData, Match, Player, PlayerStats } from '@/types'
import { getPlayerStatsForData } from '@/lib/api'

export type InsightCategory =
  | 'day_performance'
  | 'map_specialist'
  | 'duo_synergy'
  | 'nemesis'
  | 'streak'
  | 'headshots'
  | 'damage'
  | 'map_balance'
  | 'highlights'
  | 'nelson'
  | 'close_match'
  | 'side_preference'

export type Insight = {
  id: string
  category: InsightCategory
  title: string
  text: string
  highlightedText: string
  icon: string
  /** Temporada de la que sale el dato, cuando no es la activa. */
  scope?: string
}

const DAY_NAMES = [
  'los domingos',
  'los lunes',
  'los martes',
  'los miércoles',
  'los jueves',
  'los viernes',
  'los sábados',
]

export function generateInsights(data: LiveData): Insight[] {
  const insights: Insight[] = []
  if (!data || !data.matches || data.matches.length === 0) return insights

  const validPlayers = data.players
  const playerMap = new Map<string, Player>()
  validPlayers.forEach((p) => playerMap.set(p.id, p))

  const stats = getPlayerStatsForData(data)

  // 1. Day of Week Performance (e.g. "El jugador Roro juega mejor los domingos")
  validPlayers.forEach((player) => {
    const playerMatches = data.matches.filter((m) =>
      m.players.some((mp) => mp.playerId === player.id)
    )

    if (playerMatches.length < 3) return

    const dayStats: Record<number, { wins: number; total: number; kills: number; deaths: number }> = {}

    playerMatches.forEach((m) => {
      const date = new Date(m.date)
      if (Number.isNaN(date.getTime())) return
      const day = date.getUTCDay()
      if (!dayStats[day]) dayStats[day] = { wins: 0, total: 0, kills: 0, deaths: 0 }
      dayStats[day].total += 1

      const pEntry = m.players.find((mp) => mp.playerId === player.id)
      if (pEntry) {
        if (pEntry.won) dayStats[day].wins += 1
        dayStats[day].kills += pEntry.kills
        dayStats[day].deaths += Math.max(1, pEntry.deaths)
      }
    })

    let bestDay = -1
    let bestWinrate = -1
    let bestDayTotal = 0
    let bestDayWins = 0

    Object.entries(dayStats).forEach(([dayStr, s]) => {
      const day = Number(dayStr)
      if (s.total >= 2) {
        const wr = s.wins / s.total
        if (wr > bestWinrate || (wr === bestWinrate && s.total > bestDayTotal)) {
          bestWinrate = wr
          bestDay = day
          bestDayTotal = s.total
          bestDayWins = s.wins
        }
      }
    })

    if (bestDay !== -1 && bestWinrate >= 0.6) {
      const pct = Math.round(bestWinrate * 100)
      const dayName = DAY_NAMES[bestDay]
      insights.push({
        id: `day-${player.id}-${bestDay}`,
        category: 'day_performance',
        title: 'Día Favorito',
        icon: '📅',
        text: `El jugador ${player.name} rinde mejor ${dayName}: acumula un ${pct}% de victorias (${bestDayWins}V-${bestDayTotal - bestDayWins}D).`,
        highlightedText: `El jugador <strong class="text-brand font-semibold">${player.name}</strong> rinde mejor <span class="text-emerald-400 font-semibold">${dayName}</span>: acumula un <span class="text-amber-400 font-bold">${pct}%</span> de victorias (${bestDayWins}V-${bestDayTotal - bestDayWins}D).`,
      })
    }
  })

  // 2. Map Specialist
  validPlayers.forEach((player) => {
    const playerMatches = data.matches.filter((m) =>
      m.players.some((mp) => mp.playerId === player.id)
    )

    const mapStats: Record<string, { wins: number; total: number; kills: number; deaths: number }> = {}

    playerMatches.forEach((m) => {
      if (!m.map || m.map === 'Sin mapa') return
      if (!mapStats[m.map]) mapStats[m.map] = { wins: 0, total: 0, kills: 0, deaths: 0 }
      mapStats[m.map].total += 1
      const pEntry = m.players.find((mp) => mp.playerId === player.id)
      if (pEntry) {
        if (pEntry.won) mapStats[m.map].wins += 1
        mapStats[m.map].kills += pEntry.kills
        mapStats[m.map].deaths += Math.max(1, pEntry.deaths)
      }
    })

    let bestMap = ''
    let maxWr = -1
    let mapWins = 0
    let mapTotal = 0
    let mapKd = 0

    Object.entries(mapStats).forEach(([map, s]) => {
      if (s.total >= 2) {
        const wr = s.wins / s.total
        const kd = Math.round((s.kills / s.deaths) * 100) / 100
        if (wr > maxWr || (wr === maxWr && kd > mapKd)) {
          maxWr = wr
          bestMap = map
          mapWins = s.wins
          mapTotal = s.total
          mapKd = kd
        }
      }
    })

    if (bestMap && maxWr >= 0.6) {
      const pct = Math.round(maxWr * 100)
      insights.push({
        id: `map-${player.id}-${bestMap}`,
        category: 'map_specialist',
        title: 'Especialista de Mapa',
        icon: '🗺️',
        text: `${player.name} domina en ${bestMap} con un winrate del ${pct}% (${mapWins}V-${mapTotal - mapWins}D) y K/D de ${mapKd}.`,
        highlightedText: `<strong class="text-brand font-semibold">${player.name}</strong> domina en <span class="text-sky-400 font-semibold">${bestMap}</span> con un winrate del <span class="text-amber-400 font-bold">${pct}%</span> (${mapWins}V-${mapTotal - mapWins}D) y K/D de <span class="text-emerald-400 font-bold">${mapKd}</span>.`,
      })
    }
  })

  // 3. Dynamic Duos (Synergy)
  const duoStats: Record<string, { p1: Player; p2: Player; togetherWins: number; togetherTotal: number }> = {}

  for (let i = 0; i < validPlayers.length; i++) {
    for (let j = i + 1; j < validPlayers.length; j++) {
      const p1 = validPlayers[i]
      const p2 = validPlayers[j]
      const key = [p1.id, p2.id].sort().join('_')

      let wins = 0
      let total = 0

      data.matches.forEach((m) => {
        const mp1 = m.players.find((p) => p.playerId === p1.id)
        const mp2 = m.players.find((p) => p.playerId === p2.id)

        if (mp1 && mp2 && mp1.team === mp2.team) {
          total += 1
          if (mp1.won) wins += 1
        }
      })

      if (total >= 2) {
        duoStats[key] = { p1, p2, togetherWins: wins, togetherTotal: total }
      }
    }
  }

  const topDuos = Object.values(duoStats)
    .filter((d) => d.togetherWins / d.togetherTotal >= 0.6)
    .sort((a, b) => b.togetherWins / b.togetherTotal - a.togetherWins / a.togetherTotal)

  topDuos.slice(0, 3).forEach((d) => {
    const pct = Math.round((d.togetherWins / d.togetherTotal) * 100)
    insights.push({
      id: `duo-${d.p1.id}-${d.p2.id}`,
      category: 'duo_synergy',
      title: 'Dupla Letal',
      icon: '🤝',
      text: `${d.p1.name} y ${d.p2.name} son una dupla temible: jugando juntos ganan el ${pct}% de las partidas (${d.togetherWins}V-${d.togetherTotal - d.togetherWins}D).`,
      highlightedText: `<strong class="text-brand font-semibold">${d.p1.name}</strong> y <strong class="text-brand font-semibold">${d.p2.name}</strong> son una dupla temible: jugando juntos ganan el <span class="text-amber-400 font-bold">${pct}%</span> de las partidas (${d.togetherWins}V-${d.togetherTotal - d.togetherWins}D).`,
    })
  })

  // 4. Nemesis (Rivalry)
  const rivalryStats: Record<string, { p1: Player; p2: Player; p1Wins: number; total: number }> = {}

  for (let i = 0; i < validPlayers.length; i++) {
    for (let j = 0; j < validPlayers.length; j++) {
      if (i === j) continue
      const p1 = validPlayers[i]
      const p2 = validPlayers[j]
      const key = `${p1.id}_vs_${p2.id}`

      let p1Wins = 0
      let total = 0

      data.matches.forEach((m) => {
        const mp1 = m.players.find((p) => p.playerId === p1.id)
        const mp2 = m.players.find((p) => p.playerId === p2.id)

        if (mp1 && mp2 && mp1.team !== mp2.team) {
          total += 1
          if (mp1.won) p1Wins += 1
        }
      })

      if (total >= 3) {
        rivalryStats[key] = { p1, p2, p1Wins, total }
      }
    }
  }

  Object.values(rivalryStats)
    .filter((r) => r.p1Wins / r.total >= 0.7)
    .forEach((r) => {
      const pct = Math.round((r.p1Wins / r.total) * 100)
      insights.push({
        id: `nemesis-${r.p2.id}-${r.p1.id}`,
        category: 'nemesis',
        title: 'Némesis Directo',
        icon: '⚔️',
        text: `El rival más difícil de ${r.p2.name} es ${r.p1.name}: en enfrentamientos directos, ${r.p1.name} se ha llevado el ${pct}% de las victorias (${r.p1Wins}V-${r.total - r.p1Wins}D).`,
        highlightedText: `El rival más difícil de <strong class="text-rose-400 font-semibold">${r.p2.name}</strong> es <strong class="text-brand font-semibold">${r.p1.name}</strong>: en duelos directos, ${r.p1.name} ganó el <span class="text-amber-400 font-bold">${pct}%</span> (${r.p1Wins}V-${r.total - r.p1Wins}D).`,
      })
    })

  // 5. Hot Streaks
  stats.forEach((s) => {
    if (s.currentStreak >= 2) {
      insights.push({
        id: `streak-win-${s.player.id}`,
        category: 'streak',
        title: 'En Racha 🔥',
        icon: '🔥',
        text: `¡${s.player.name} está encendido! Registra una racha activa de ${s.currentStreak} victorias consecutivas.`,
        highlightedText: `¡<strong class="text-brand font-semibold">${s.player.name}</strong> está encendido! Registra una racha activa de <span class="text-amber-400 font-bold">${s.currentStreak} victorias</span> consecutivas.`,
      })
    }
  })

  // 6. Headshot Machine
  const topHs = [...stats].filter((s) => s.matches >= 2 && s.hsPct > 0).sort((a, b) => b.hsPct - a.hsPct)[0]
  if (topHs) {
    insights.push({
      id: `hs-${topHs.player.id}`,
      category: 'headshots',
      title: 'Cirujano de Headshots',
      icon: '🎯',
      text: `${topHs.player.name} es el francotirador de la liga con un ${topHs.hsPct}% de bajas por tiros a la cabeza.`,
      highlightedText: `<strong class="text-brand font-semibold">${topHs.player.name}</strong> es el cirujano de los disparos con un <span class="text-amber-400 font-bold">${topHs.hsPct}%</span> de precisión en headshots.`,
    })
  }

  // 7. Damage Leader
  const topDamage = [...stats].filter((s) => s.matches >= 2).sort((a, b) => b.adm - a.adm)[0]
  if (topDamage) {
    insights.push({
      id: `damage-${topDamage.player.id}`,
      category: 'damage',
      title: 'Máquina de Daño',
      icon: '💥',
      text: `${topDamage.player.name} lidera la tabla de daño promedio con ${topDamage.adm} ADM por ronda.`,
      highlightedText: `<strong class="text-brand font-semibold">${topDamage.player.name}</strong> lidera en potencia de fuego promediando <span class="text-amber-400 font-bold">${topDamage.adm} ADM</span> por ronda.`,
    })
  }

  // 8. Top KDA
  const topKda = [...stats].filter((s) => s.matches >= 2).sort((a, b) => b.kda - a.kda)[0]
  if (topKda) {
    insights.push({
      id: `kda-${topKda.player.id}`,
      category: 'highlights',
      title: 'Impacto Global',
      icon: '👑',
      text: `${topKda.player.name} ostenta el mejor K/D global del torneo con un ratio de ${topKda.kda}.`,
      highlightedText: `<strong class="text-brand font-semibold">${topKda.player.name}</strong> ostenta el mejor K/D global del torneo con un ratio de <span class="text-emerald-400 font-bold">${topKda.kda}</span>.`,
    })
  }

  // 9. Nelson Spotlight
  const topNelsonPlayer = validPlayers.filter((p) => p.nelsons > 0).sort((a, b) => b.nelsons - a.nelsons)[0]
  if (topNelsonPlayer) {
    insights.push({
      id: `nelson-${topNelsonPlayer.id}`,
      category: 'nelson',
      title: 'Rey Nelson 🦩',
      icon: '🦩',
      text: `${topNelsonPlayer.name} lidera la tabla del pánico con ${topNelsonPlayer.nelsons} Nelsons acumulados.`,
      highlightedText: `<strong class="text-brand font-semibold">${topNelsonPlayer.name}</strong> encabeza la Liga Nelson con <span class="text-rose-400 font-bold">${topNelsonPlayer.nelsons} Nelsons</span> acumulados.`,
    })
  }

  // 10. Map CT/T Balance Insight
  const mapCtT: Record<string, { ctWins: number; tWins: number; total: number }> = {}
  data.matches.forEach((m) => {
    if (!m.map || m.map === 'Sin mapa') return
    if (!mapCtT[m.map]) mapCtT[m.map] = { ctWins: 0, tWins: 0, total: 0 }
    mapCtT[m.map].total += 1
    if (m.winnerTeam === 'CT') mapCtT[m.map].ctWins += 1
    if (m.winnerTeam === 'T') mapCtT[m.map].tWins += 1
  })

  Object.entries(mapCtT).forEach(([map, s]) => {
    if (s.total >= 3) {
      const ctPct = Math.round((s.ctWins / s.total) * 100)
      const tPct = Math.round((s.tWins / s.total) * 100)
      if (ctPct >= 60) {
        insights.push({
          id: `map-balance-${map}`,
          category: 'map_balance',
          title: 'Balance de Mapa',
          icon: '🛡️',
          text: `En el mapa ${map}, el bando CT domina con un ${ctPct}% de victorias globales.`,
          highlightedText: `En el mapa <span class="text-sky-400 font-semibold">${map}</span>, el bando <span class="text-blue-400 font-bold">CT</span> domina con un <span class="text-amber-400 font-bold">${ctPct}%</span> de victorias globales.`,
        })
      } else if (tPct >= 60) {
        insights.push({
          id: `map-balance-${map}`,
          category: 'map_balance',
          title: 'Balance de Mapa',
          icon: '💣',
          text: `En el mapa ${map}, el bando T domina con un ${tPct}% de victorias globales.`,
          highlightedText: `En el mapa <span class="text-sky-400 font-semibold">${map}</span>, el bando <span class="text-amber-500 font-bold">T</span> domina con un <span class="text-amber-400 font-bold">${tPct}%</span> de victorias globales.`,
        })
      }
    }
  })

  // 11. Closest Match
  const closeMatch = data.matches
    .filter((m) => m.ctScore > 0 || m.tScore > 0)
    .sort((a, b) => Math.abs(a.ctScore - a.tScore) - Math.abs(b.ctScore - b.tScore))[0]

  if (closeMatch) {
    const diff = Math.abs(closeMatch.ctScore - closeMatch.tScore)
    if (diff <= 2) {
      insights.push({
        id: `close-match-${closeMatch.id}`,
        category: 'close_match',
        title: 'Partida Épica',
        icon: '⚡',
        text: `La partida más ajustada registrada fue en ${closeMatch.map} con un marcador de ${closeMatch.ctScore}-${closeMatch.tScore}.`,
        highlightedText: `La partida más ajustada registrada se disputó en <span class="text-sky-400 font-semibold">${closeMatch.map}</span> con un marcador de <span class="text-amber-400 font-bold">${closeMatch.ctScore}-${closeMatch.tScore}</span>.`,
      })
    }
  }

  // Return generated insights
  return insights
}
