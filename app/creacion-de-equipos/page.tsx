import { getCareerData, getLeagueData, getPlayerStatsForData, getSeasonData } from '@/lib/api'
import { getFaceitEntries } from '@/lib/faceit'
import { buildPairStats, buildPlayerForm } from '@/lib/team-history'
import { getCifrasXplayTodas, getKillsXplayTodas } from '@/lib/xplay/leer'
import { RONDAS_FACEIT, armarCaraACara, ratingsCarrera, ratingsContexto, ultimasDeCada } from '@/lib/xplay/rating'
import { TeamGenerator, type RatingSource } from '@/components/TeamGenerator/TeamGenerator'
import { Reveal } from '@/components/motion/reveal'
import { getApuestasConfig } from '@/lib/apuestas/config'

// Las partidas ya la refrescan al cargarse; esto es para el FACEIT de los que
// recién empiezan con Xplay (más seguido sería reescribirla por cada partida).
export const revalidate = 1800
// Margen para refrescar FACEIT (los pedidos van de a uno).
export const maxDuration = 60

const RECENT_MATCHES = 20

export default async function TeamGeneratorPage() {
  const [league, cifras, kills] = await Promise.all([getLeagueData(), getCifrasXplayTodas(), getKillsXplayTodas()])
  const career = getCareerData(league)
  const season = getSeasonData(league, league.currentSeason.id)
  const playerIds = league.players.map((p) => p.id)

  // El FACEIT sólo cuenta para los que jugaron poco con Xplay: a los demás ni se les pide.
  const rondas = new Map<string, number>()
  for (const f of cifras) rondas.set(f.playerId, (rondas.get(f.playerId) ?? 0) + f.rondas)
  const nuevos = league.players.filter((p) => (rondas.get(p.id) ?? 0) < RONDAS_FACEIT)
  const faceitEntries = nuevos.length > 0 ? await getFaceitEntries(nuevos) : []
  const eloFaceit = Object.fromEntries(faceitEntries.map(({ player, profile }) => [player.id, profile.elo]))

  const ratings = ratingsCarrera(cifras, playerIds, eloFaceit)
  const seasonIds = new Set(season.matches.map((m) => m.id))
  const recent = career.matches.slice(0, RECENT_MATCHES)
  const orden = new Map(career.matches.map((m, i) => [m.id, i]))

  const careerStats = getPlayerStatsForData(career)
  const sources: RatingSource[] = [
    {
      key: 'carrera',
      label: 'Carrera',
      hint: 'todas las temporadas',
      isCareer: true,
      stats: careerStats,
      ratings,
      pairs: buildPairStats(career.matches),
      caraACara: armarCaraACara(kills, cifras),
    },
    {
      key: 'temporada',
      label: league.currentSeason.name,
      hint: `${season.matches.length} partidas`,
      stats: getPlayerStatsForData(season),
      ratings: ratingsContexto(cifras.filter((f) => seasonIds.has(f.matchId)), ratings),
      pairs: buildPairStats(season.matches),
      caraACara: armarCaraACara(kills, cifras, seasonIds),
    },
    {
      key: 'recientes',
      label: `Últimas ${RECENT_MATCHES}`,
      stats: getPlayerStatsForData(career, { lastNMatchesPerPlayer: RECENT_MATCHES }),
      ratings: ratingsContexto(ultimasDeCada(cifras, orden, RECENT_MATCHES), ratings),
      pairs: buildPairStats(recent),
      caraACara: armarCaraACara(kills, cifras, new Set(recent.map((m) => m.id))),
    },
  ]
  // Cómo viene cada uno: siempre con las partidas más recientes, sin importar la temporada.
  const form = buildPlayerForm(career.matches, playerIds)

  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <Reveal immediate className="mb-6">
          <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">10v10 Stats</span>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">Generador de equipos</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
            Elegí a los 10 de hoy y armamos los dos equipos más parejos posibles con el rating de Xplay de cada uno (toda la
            carrera, la temporada o las últimas {RECENT_MATCHES}), medido en las partidas que jugamos entre nosotros, y cómo viene
            en las últimas partidas: al que viene ganando lo juntamos con el que viene perdiendo.
          </p>
        </Reveal>

        <TeamGenerator players={careerStats} sources={sources} form={form} apuestas={getApuestasConfig()} />
      </div>
    </main>
  )
}
