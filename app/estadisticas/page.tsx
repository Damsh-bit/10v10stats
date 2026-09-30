import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCareerData, getLeagueData, getPlayerStatsForData, getSeasonData } from '@/lib/api'
import { getPlacementMatches } from '@/lib/seasons'
import { computeMatchRecords, computeSeasonSummary, type MatchRecord } from '@/lib/season-stats'
import { mapImageUrl } from '@/lib/format'
import { HallOfFameView, type HallCard, type HallScope } from '@/components/stats/hall-of-fame-view'
import { Reveal } from '@/components/motion/reveal'
import type { LiveData } from '@/types'

export const revalidate = 60

function recordCard(title: string, record: MatchRecord | null, color: string, format = (v: number) => String(v)): HallCard {
  return {
    title,
    value: record ? format(record.value) : '—',
    subtitle: record ? record.playerName : 'Sin datos',
    color,
    matchId: record?.matchId,
    playerId: record?.playerId,
  }
}

function buildCards(data: LiveData, placementMatches: number, leaderTitle: string): HallCard[] {
  const summary = computeSeasonSummary(data)
  const records = computeMatchRecords(data)
  const standings = getPlayerStatsForData(data, { minMatches: placementMatches })
  const byWins = [...standings].sort((a, b) => b.wins - a.wins)[0]
  const byLosses = [...standings].sort((a, b) => b.losses - a.losses)[0]
  const leader = standings[0]
  const damage = (v: number) => v.toLocaleString('es-AR')

  return [
    {
      title: leaderTitle,
      value: leader ? leader.kda.toFixed(2) : '—',
      subtitle: leader ? `${leader.player.name} · KDA` : 'Vacante',
      color: 'text-amber-300',
      playerId: leader?.player.id,
      highlight: true,
    },
    { title: 'Partidas', value: String(summary.matches), subtitle: `${summary.totalKills.toLocaleString('es-AR')} kills en total`, color: 'text-brand' },
    {
      title: 'Mapa más jugado',
      value: summary.mostPlayedMap?.map ?? '—',
      subtitle: summary.mostPlayedMap ? `${summary.mostPlayedMap.count} partidas` : 'Sin datos',
      color: 'text-white',
      bgImage: summary.mostPlayedMap ? mapImageUrl(summary.mostPlayedMap.map) : undefined,
    },
    {
      title: 'Más victorias',
      value: byWins && byWins.wins > 0 ? String(byWins.wins) : '—',
      subtitle: byWins && byWins.wins > 0 ? byWins.player.name : 'Sin datos',
      color: 'text-emerald-400',
      playerId: byWins?.player.id,
    },
    {
      title: 'Más derrotas',
      value: byLosses && byLosses.losses > 0 ? String(byLosses.losses) : '—',
      subtitle: byLosses && byLosses.losses > 0 ? byLosses.player.name : 'Sin datos',
      color: 'text-rose-500',
      playerId: byLosses?.player.id,
    },
    recordCard('Más kills (partida)', records.maxKills, 'text-green-400'),
    recordCard('Menos kills (partida)', records.minKills, 'text-red-300'),
    recordCard('Más muertes (partida)', records.maxDeaths, 'text-red-400'),
    recordCard('Menos muertes (partida)', records.minDeaths, 'text-green-300'),
    recordCard('Más asistencias (partida)', records.maxAssists, 'text-purple-400'),
    recordCard('Más daño (partida)', records.maxDamage, 'text-orange-400', damage),
    recordCard('Menor daño (partida)', records.minDamage, 'text-slate-400', damage),
  ]
}

export default async function EstadisticasPage() {
  const league = await getLeagueData()
  const seasons = [...league.seasons].sort((a, b) => b.id - a.id)

  const scopes: HallScope[] = [
    ...seasons.map((season) => {
      const data = getSeasonData(league, season.id)
      return {
        key: season.slug,
        label: season.name,
        hint: season.isCurrent ? 'actual' : undefined,
        cards: buildCards(data, getPlacementMatches(season), season.isCurrent ? 'Líder actual' : 'Campeón'),
      }
    }),
    { key: 'historico', label: 'Histórico', cards: buildCards(getCareerData(league), 1, 'Mejor KDA histórico') },
  ]

  // Recién arrancada la temporada no hay récords: se abre en la última con partidas.
  const initialKey =
    seasons.find((s) => league.matches.some((m) => m.seasonId === s.id))?.slug ?? league.currentSeason.slug

  return (
    <main className="cs-grid min-h-screen">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <Reveal immediate className="mb-6 flex items-center gap-3">
          <Link
            href="/"
            className="rounded-full bg-card p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Volver al dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">10v10 Stats</span>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">Hall of Fame</h1>
          </div>
        </Reveal>

        <HallOfFameView scopes={scopes} initialKey={initialKey} />
      </div>
    </main>
  )
}
