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
import { getPlacementMatches, getPreviousSeason } from '@/lib/seasons'
import { buildSeasonComparison } from '@/lib/season-stats'
import { BadgePill } from '@/components/shared/strike-ui'
import { EnlargeableAvatar } from '@/components/players/enlargeable-avatar'
import { EditPlayerModal } from '@/components/players/edit-player-modal'
import { PlayerSeasonView, type PlayerScope } from '@/components/players/player-season-view'
import { SeasonComparison } from '@/components/players/season-comparison'
import { Reveal } from '@/components/motion/reveal'
import type { LiveData } from '@/types'

export const revalidate = 60

export async function generateStaticParams() {
  return []
}

function rankText(scope: PlayerScope) {
  const matches = scope.stats?.matches ?? 0
  if (scope.rank) return `#${scope.rank}`
  if (matches === 0) return '—'
  return `Clasif. ${matches}/${scope.placementMatches}`
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

  const current = league.currentSeason
  const previous = getPreviousSeason(league.seasons, current)

  const buildScope = (
    key: string,
    label: string,
    data: LiveData,
    options: { seasonId: number | null; isCurrent: boolean; placementMatches: number },
  ): PlayerScope => {
    const ranked = getPlayerStatsForData(data, { minMatches: options.placementMatches })
    const rankIndex = ranked.findIndex((s) => s.player.id === id)
    const stats = getSinglePlayerStats(data, id)
    return {
      key,
      label,
      seasonId: options.seasonId,
      isCurrent: options.isCurrent,
      stats,
      rank: rankIndex >= 0 ? rankIndex + 1 : null,
      rankedCount: ranked.length,
      placementMatches: options.placementMatches,
      records: getPlayerRecords(data, ranked)[id] ?? [],
      isLast: ranked.length > 3 && rankIndex === ranked.length - 1,
      nelsons: data.players.find((p) => p.id === id)?.nelsons ?? 0,
    }
  }

  const seasonScopes = [...league.seasons]
    .sort((a, b) => b.id - a.id)
    .map((season) =>
      buildScope(season.slug, season.name, getSeasonData(league, season.id), {
        seasonId: season.id,
        isCurrent: season.isCurrent,
        placementMatches: getPlacementMatches(season),
      }),
    )
  const careerScope = buildScope('carrera', 'Carrera', getCareerData(league), {
    seasonId: null,
    isCurrent: false,
    placementMatches: 1,
  })
  const scopes = [...seasonScopes, careerScope]

  const currentScope = seasonScopes.find((s) => s.seasonId === current.id) ?? null
  const previousScope = previous ? seasonScopes.find((s) => s.seasonId === previous.id) ?? null : null

  const history = league.matches
    .filter((m) => m.players.some((mp) => mp.playerId === id))
    .map((m) => ({ match: m, entry: m.players.find((mp) => mp.playerId === id)!, seasonId: m.seasonId }))
    .sort((a, b) => b.match.date.localeCompare(a.match.date))

  return (
    <main className="cs-grid min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-3 py-6 sm:px-4 sm:py-8">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Ladder
        </Link>

        <Reveal immediate className="flex items-center gap-4">
          <EnlargeableAvatar player={player} size={84} />
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-heading text-3xl font-bold uppercase tracking-wide text-foreground">{player.name}</h1>
              <EditPlayerModal player={{ id: player.id, name: player.name, photoUrl: player.photoUrl }} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {player.badge && player.badge !== 'Sin info' && <BadgePill>{player.badge}</BadgePill>}
              {currentScope && (
                <span className="season-chip rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black">
                  {current.name}: {currentScope.rank ? `#${currentScope.rank}` : currentScope.stats?.matches ? 'en clasificación' : 'sin debut'}
                </span>
              )}
              {previous && previousScope?.rank && (
                <span className="rounded-full border border-border bg-card px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {previousScope.rank === 1 ? '👑 Campeón' : `#${previousScope.rank}`} {previous.name}
                </span>
              )}
            </div>
          </div>
        </Reveal>

        <Reveal immediate delay={0.1}>
          <PlayerSeasonView
            scopes={scopes}
            history={history}
            beforeHistory={
              previous && currentScope && previousScope ? (
                <SeasonComparison
                  metrics={buildSeasonComparison(currentScope.stats, previousScope.stats)}
                  currentLabel={current.name}
                  previousLabel={previous.name}
                  currentRank={rankText(currentScope)}
                  previousRank={rankText(previousScope)}
                />
              ) : null
            }
          />
        </Reveal>
      </div>
    </main>
  )
}
