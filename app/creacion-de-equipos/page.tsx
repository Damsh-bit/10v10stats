import { getCareerData, getLeagueData, getPlayerStatsForData, getSeasonData } from '@/lib/api'
import { getFaceitEntries } from '@/lib/faceit'
import { buildPairStats, buildPlayerForm } from '@/lib/team-history'
import type { FaceitInfo } from '@/lib/teamBalancer'
import { TeamGenerator, type RatingSource } from '@/components/TeamGenerator/TeamGenerator'
import { Reveal } from '@/components/motion/reveal'

export const revalidate = 60
// Margen para refrescar FACEIT (los pedidos van de a uno).
export const maxDuration = 60

const RECENT_MATCHES = 20

export default async function TeamGeneratorPage() {
  const league = await getLeagueData()
  const career = getCareerData(league)
  const season = getSeasonData(league, league.currentSeason.id)

  const faceitEntries = await getFaceitEntries(league.players)
  const faceit: Record<string, FaceitInfo> = Object.fromEntries(
    faceitEntries.map(({ player, profile }) => [player.id, { level: profile.level, elo: profile.elo }]),
  )

  const careerStats = getPlayerStatsForData(career)
  const sources: RatingSource[] = [
    {
      key: 'carrera',
      label: 'Carrera',
      hint: 'todas las temporadas',
      isCareer: true,
      stats: careerStats,
      pairs: buildPairStats(career.matches),
    },
    {
      key: 'temporada',
      label: league.currentSeason.name,
      hint: `${season.matches.length} partidas`,
      stats: getPlayerStatsForData(season),
      pairs: buildPairStats(season.matches),
    },
    {
      key: 'recientes',
      label: `Últimas ${RECENT_MATCHES}`,
      stats: getPlayerStatsForData(career, { lastNMatchesPerPlayer: RECENT_MATCHES }),
      pairs: buildPairStats(career.matches.slice(0, RECENT_MATCHES)),
    },
  ]
  // Cómo viene cada uno: siempre con las partidas más recientes, sin importar la temporada.
  const form = buildPlayerForm(career.matches, league.players.map((p) => p.id))

  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <Reveal immediate className="mb-6">
          <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">10v10 Stats</span>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">Generador de equipos</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
            Elegí a los 10 de hoy y armamos los dos equipos más parejos posibles cruzando el nivel de FACEIT de cada uno, su
            rendimiento en el 10v10 (toda la carrera, la temporada o las últimas {RECENT_MATCHES}) y cómo viene en las últimas
            partidas: al que viene ganando lo juntamos con el que viene perdiendo.
          </p>
        </Reveal>

        <TeamGenerator players={careerStats} sources={sources} faceit={faceit} form={form} />
      </div>
    </main>
  )
}
