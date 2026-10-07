import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
  getCareerData,
  getLeagueData,
  getPlayerStatsForData,
  getSeasonData,
  getSinglePlayerStats,
} from '@/lib/api'
import { getPlayerRecords } from '@/lib/records'
import { getPreviousSeason } from '@/lib/seasons'
import { buildSeasonComparison } from '@/lib/season-stats'
import { buildPerfilAlcance } from '@/lib/perfil/datos'
import { contarMeGusta, listarRecomendaciones } from '@/lib/perfil/social'
import { formatDate } from '@/lib/format'
import { BadgePill } from '@/components/shared/strike-ui'
import { EnlargeableAvatar } from '@/components/players/enlargeable-avatar'
import { EditPlayerModal } from '@/components/players/edit-player-modal'
import { SeasonComparison } from '@/components/players/season-comparison'
import { PerfilJugador } from '@/components/players/perfil/perfil-jugador'
import { MeGusta } from '@/components/players/perfil/me-gusta'
import type { AlcancePerfil } from '@/components/players/perfil/tipos'
import { Reveal } from '@/components/motion/reveal'
import { FaceitHeaderChip, FaceitProfileSection } from '@/components/faceit/faceit-profile-section'
import { getFaceitProfile, summarizeFaceit } from '@/lib/faceit'
import type { LiveData } from '@/types'

export const revalidate = 60
// Margen para refrescar FACEIT (los pedidos van de a uno).
export const maxDuration = 60

export async function generateStaticParams() {
  return []
}

function rankText(alcance: AlcancePerfil) {
  return alcance.rank ? `#${alcance.rank}` : '—'
}

export default async function PlayerProfile({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const league = await getLeagueData()
  const player = league.players.find((p) => p.id === id)
  if (!player) notFound()

  const [faceitProfile, likes, recomendaciones] = await Promise.all([
    getFaceitProfile(player),
    contarMeGusta(id),
    listarRecomendaciones(id).catch(() => null),
  ])
  const faceitSummary = faceitProfile ? summarizeFaceit(faceitProfile) : null

  const current = league.currentSeason
  const previous = getPreviousSeason(league.seasons, current)

  const buildAlcance = (
    key: string,
    label: string,
    data: LiveData,
    options: { seasonId: number | null; isCurrent: boolean },
  ): AlcancePerfil => {
    const ranked = getPlayerStatsForData(data, { minMatches: 1 })
    const rankIndex = ranked.findIndex((s) => s.player.id === id)
    return {
      key,
      label,
      seasonId: options.seasonId,
      isCurrent: options.isCurrent,
      stats: getSinglePlayerStats(data, id),
      rank: rankIndex >= 0 ? rankIndex + 1 : null,
      rankedCount: ranked.length,
      records: getPlayerRecords(data, ranked)[id] ?? [],
      menudaMierda: !!player.menudaMierda,
      nelsons: data.players.find((p) => p.id === id)?.nelsons ?? 0,
      perfil: buildPerfilAlcance(data, id, options.seasonId === null ? 'carrera' : 'temporada'),
    }
  }

  const seasonAlcances = [...league.seasons]
    .sort((a, b) => b.id - a.id)
    .map((season) =>
      buildAlcance(season.slug, season.name, getSeasonData(league, season.id), {
        seasonId: season.id,
        isCurrent: season.isCurrent,
      }),
    )
  const carrera = buildAlcance('carrera', 'Carrera', getCareerData(league), { seasonId: null, isCurrent: false })
  const alcances = [...seasonAlcances, carrera]

  const currentAlcance = seasonAlcances.find((s) => s.seasonId === current.id) ?? null
  const previousAlcance = previous ? seasonAlcances.find((s) => s.seasonId === previous.id) ?? null : null

  const history = league.matches
    .filter((m) => m.players.some((mp) => mp.playerId === id))
    .map((m) => ({ match: m, entry: m.players.find((mp) => mp.playerId === id)!, seasonId: m.seasonId }))
    .sort((a, b) => b.match.date.localeCompare(a.match.date))

  const debut = history[history.length - 1]
  const estilo = carrera.perfil.estilo
  const partidas = carrera.stats?.matches ?? 0
  const mvps = carrera.stats?.mvps ?? 0

  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-3 py-5 sm:gap-5 sm:px-4 sm:py-7">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Ladder
        </Link>

        <Reveal
          immediate
          className="relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/10 bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_120%_at_0%_0%,rgba(149,12,66,0.35),transparent_60%)]"
            aria-hidden="true"
          />
          {/* En el celular el me gusta va en la esquina: deja lugar a la derecha del nombre. */}
          <div className="relative flex min-w-0 items-center gap-3 pr-20 sm:gap-4 sm:pr-0">
            <EnlargeableAvatar player={player} size={72} />
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate font-heading text-2xl font-bold uppercase tracking-wide text-foreground sm:text-3xl">
                  {player.name}
                </h1>
                <EditPlayerModal
                  player={{ id: player.id, name: player.name, photoUrl: player.photoUrl, faceitNickname: player.faceitNickname }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {player.badge && player.badge !== 'Sin info' && <BadgePill>{player.badge}</BadgePill>}
                {currentAlcance && (
                  <span className="season-chip rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black">
                    {current.name}: {currentAlcance.rank ? `#${currentAlcance.rank}` : 'sin debut'}
                  </span>
                )}
                {faceitProfile && <FaceitHeaderChip profile={faceitProfile} />}
                {previous && previousAlcance?.rank && (
                  <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {previousAlcance.rank === 1 ? '👑 Campeón' : `#${previousAlcance.rank}`} {previous.name}
                  </span>
                )}
                {estilo && (
                  <span
                    className="rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-200"
                    title={estilo.detalle}
                  >
                    {estilo.emoji} {estilo.label}
                  </span>
                )}
              </div>
              {partidas > 0 && (
                <p className="text-[12px] text-muted-foreground">
                  {partidas} partida{partidas !== 1 ? 's' : ''} en el 10v10
                  {mvps > 0 && ` · ${mvps} MVP${mvps !== 1 ? 's' : ''}`}
                  {debut && ` · debutó el ${formatDate(debut.match.date)}`}
                </p>
              )}
            </div>
          </div>
          <div className="absolute right-3 top-3 sm:relative sm:right-auto sm:top-auto">
            <MeGusta playerId={player.id} playerName={player.name} totalInicial={likes} />
          </div>
        </Reveal>

        <Reveal immediate delay={0.05}>
          <PerfilJugador
            playerId={player.id}
            nombre={player.name}
            alcances={alcances}
            history={history}
            recomendacionesIniciales={recomendaciones}
            faceit={player.faceitNickname ? <FaceitProfileSection profile={faceitProfile} summary={faceitSummary} /> : undefined}
            comparacion={
              previous && currentAlcance && previousAlcance ? (
                <SeasonComparison
                  metrics={buildSeasonComparison(currentAlcance.stats, previousAlcance.stats)}
                  currentLabel={current.name}
                  previousLabel={previous.name}
                  currentRank={rankText(currentAlcance)}
                  previousRank={rankText(previousAlcance)}
                />
              ) : null
            }
          />
        </Reveal>
      </div>
    </main>
  )
}
