import { getCareerData, getLeagueData, getPlayerStatsForData, getSeasonData } from '@/lib/api'
import { TeamGenerator, type RatingSource } from '@/components/TeamGenerator/TeamGenerator'
import { Reveal } from '@/components/motion/reveal'

export const revalidate = 60

export default async function TeamGeneratorPage() {
  const league = await getLeagueData()
  const career = getCareerData(league)
  const season = getSeasonData(league, league.currentSeason.id)

  const careerStats = getPlayerStatsForData(career)
  const sources: RatingSource[] = [
    { key: 'carrera', label: 'Carrera', hint: 'todas las temporadas', stats: careerStats },
    { key: 'temporada', label: league.currentSeason.name, hint: `${season.matches.length} partidas`, stats: getPlayerStatsForData(season) },
    { key: 'recientes', label: 'Últimas 20', stats: getPlayerStatsForData(career, { lastNMatchesPerPlayer: 20 }) },
  ]

  return (
    <main className="cs-grid min-h-screen">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <Reveal immediate className="mb-6">
          <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">10v10 Stats</span>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">Generador de equipos</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
            Elegí a los 10 de hoy y armamos dos equipos parejos según su rendimiento: toda la carrera, solo la temporada
            actual o las últimas 20 partidas de cada uno.
          </p>
        </Reveal>

        <TeamGenerator players={careerStats} sources={sources} />
      </div>
    </main>
  )
}
