import { getLeagueData, getSeasonData, getPlayerStatsForData } from '@/lib/api'
import { getPlayerRecords } from '@/lib/records'
import { getNelsonData } from '@/lib/nelson'
import { formatSeasonDate, getPreviousSeason, getSeasonDay } from '@/lib/seasons'
import {
  computeMatchRecords,
  computeRankBattles,
  computeSeasonSummary,
  toMapWinrateRows,
} from '@/lib/season-stats'
import { SeasonHero } from '@/components/season/season-hero'
import { SeasonLegacyCard } from '@/components/season/season-legacy-card'
import { SeasonLadder } from '@/components/stats/season-ladder'
import { RankBattles } from '@/components/stats/rank-battles'
import { SeasonRecords } from '@/components/stats/season-records'
import { NelsonLeague } from '@/components/stats/nelson-league'
import { NelsonVotePanel } from '@/components/stats/nelson-vote-panel'
import { MapWinrateSection } from '@/components/stats/map-winrate-section'
import { RecentMatches } from '@/components/matches/recent-matches'
import { RecentMatchScoreboard } from '@/components/matches/recent-match-scoreboard'
import { NewMatchModal } from '@/components/matches/new-match-modal'
import { FakeLeaderboard } from '@/components/TeamGenerator/FakeLeaderboard'
import { Reveal } from '@/components/motion/reveal'
import { FaceitLadder } from '@/components/faceit/faceit-ladder'
import { getFaceitEntries, toLadderRows } from '@/lib/faceit'

export const revalidate = 60
// Margen para refrescar FACEIT (los pedidos van de a uno).
export const maxDuration = 60

const RECENT_MATCH_COUNT = 30

export default async function Page() {
  const [league, nelsonData] = await Promise.all([getLeagueData(), getNelsonData()])
  const faceitRows = toLadderRows(await getFaceitEntries(league.players))
  const season = league.currentSeason
  const previousSeason = getPreviousSeason(league.seasons, season)

  const data = getSeasonData(league, season.id)
  // Todos suman desde su primera partida de la temporada.
  const ranked = getPlayerStatsForData(data, { minMatches: 1 })
  const playedIds = new Set(data.matches.flatMap((m) => m.players.map((p) => p.playerId)))
  const unplayed = data.players.filter((p) => !playedIds.has(p.id))

  const recent =
    data.matches.length > RECENT_MATCH_COUNT
      ? {
          stats: getPlayerStatsForData(data, { lastNMatches: RECENT_MATCH_COUNT, minMatches: 1 }),
          matchCount: RECENT_MATCH_COUNT,
        }
      : null

  const summary = computeSeasonSummary(data)
  const records = computeMatchRecords(data)
  const battles = computeRankBattles(ranked)
  const playerRecords = getPlayerRecords(data, ranked)
  const topFakador = [...data.players].filter((p) => (p.fakes ?? 0) > 0).sort((a, b) => (b.fakes ?? 0) - (a.fakes ?? 0))[0]

  const previousData = previousSeason ? getSeasonData(league, previousSeason.id) : null
  const previousStandings =
    previousSeason && previousData
      ? getPlayerStatsForData(previousData, { minMatches: 1 })
      : []
  const previousChampion =
    previousSeason && previousStandings[0]
      ? { seasonName: previousSeason.name, seasonSlug: previousSeason.slug, stats: previousStandings[0] }
      : null

  const recentMatch = data.matches[0]

  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-2 py-5 sm:px-4 sm:py-8">
        <SeasonHero
          seasonNumber={season.id}
          seasonName={season.name}
          tagline={season.tagline}
          dayNumber={getSeasonDay(season)}
          matches={summary.matches}
          totalKills={summary.totalKills}
          activePlayers={summary.activePlayers}
          leader={ranked[0] ?? null}
          previousChampion={previousChampion}
          primaryAction={<NewMatchModal triggerLabel="Cargar partida" triggerClassName="h-9 px-3.5 shadow-lg shadow-primary/30" />}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
            <Reveal immediate delay={0.2}>
              <SeasonLadder
                seasonName={season.name}
                ranked={ranked}
                recent={recent}
                unplayed={unplayed}
                records={playerRecords}
                topFakadorId={topFakador?.id ?? null}
                emptyAction={<NewMatchModal triggerLabel="Cargar la primera partida" />}
              />
            </Reveal>

            {battles.length > 0 && (
              <Reveal>
                <RankBattles battles={battles} />
              </Reveal>
            )}

            {recentMatch && <RecentMatchScoreboard match={recentMatch} players={data.players} />}

            <MapWinrateSection rows={toMapWinrateRows(data.matches)} />

            <Reveal>
              <FakeLeaderboard />
            </Reveal>
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            {faceitRows.length > 0 && (
              <Reveal immediate delay={0.25}>
                <FaceitLadder rows={faceitRows} variant="compact" />
              </Reveal>
            )}

            {previousSeason && previousData && previousStandings.length > 0 && (
              <Reveal immediate delay={0.3}>
                <SeasonLegacyCard
                  seasonName={previousSeason.name}
                  seasonSlug={previousSeason.slug}
                  podium={previousStandings.slice(0, 3)}
                  matches={previousData.matches.length}
                  dateRange={`${formatSeasonDate(previousSeason.startsAt)} → ${formatSeasonDate(previousSeason.endsAt)}`}
                />
              </Reveal>
            )}

            <Reveal>
              <SeasonRecords
                records={records}
                seasonName={season.name}
                previous={previousSeason && previousData ? { records: computeMatchRecords(previousData), seasonName: previousSeason.name } : null}
              />
            </Reveal>

            <Reveal>
              <NelsonLeague entries={data.nelsonLeague} subtitle={`Ranking por Nelson Points · ${season.name}`} />
            </Reveal>

            <Reveal>
              <NelsonVotePanel
                initialPlayers={nelsonData.players.map((player) => ({
                  id: player.id,
                  name: player.name,
                  nelsonPoints: player.nelsonPoints,
                }))}
                initialVoteState={nelsonData.voteState}
                initialAdminPasswordConfigured={nelsonData.adminPasswordConfigured}
              />
            </Reveal>

            <Reveal>
              <RecentMatches matches={data.matches.slice(0, 4)} />
            </Reveal>
          </div>
        </div>
      </div>
    </main>
  )
}
