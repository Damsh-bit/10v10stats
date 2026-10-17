import {
  getCareerData,
  getLadderData,
  getLadderStats,
  getLeagueData,
  getSeasonData,
  getPlayerStatsForData,
  getSinglePlayerStats,
} from '@/lib/api'
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
import { HomenajeQepd, type Difunto } from '@/components/stats/homenaje-qepd'
import { BannerTemporadaNueva } from '@/components/season/banner-temporada-nueva'
import { NelsonVotePanel } from '@/components/stats/nelson-vote-panel'
import { MapWinrateSection } from '@/components/stats/map-winrate-section'
import { RecentMatches } from '@/components/matches/recent-matches'
import { RecentMatchScoreboard } from '@/components/matches/recent-match-scoreboard'
import { NewMatchModal } from '@/components/matches/new-match-modal'
import { FakeLeaderboard } from '@/components/TeamGenerator/FakeLeaderboard'
import { Reveal } from '@/components/motion/reveal'
import { FaceitLadderHome } from '@/components/faceit/faceit-ladder-home'
import { WhatsNewModal } from '@/components/novedades/whats-new-modal'
import { getCartelHistorial } from '@/lib/cartel/servicio'
import { CartelVivo } from '@/components/cartel/cartel-vivo'
import { TopDonadores } from '@/components/cartel/top-donadores'

// Lo que cambia por partidas, Nelson y el cartel ya se refresca al cargarlo; esto
// cubre lo demás (fakasos, el día de la temporada). FACEIT lo pide el navegador.
export const revalidate = 300

const RECENT_MATCH_COUNT = 30

export default async function Page() {
  const [league, nelsonData, cartel] = await Promise.all([getLeagueData(), getNelsonData(), getCartelHistorial()])
  const faceitLinked = league.players.filter((player) => player.faceitNickname).length
  const season = league.currentSeason
  const previousSeason = getPreviousSeason(league.seasons, season)

  const data = getSeasonData(league, season.id)
  // Todos suman desde su primera partida de la temporada. Los inactivos no van en
  // la ladder, pero sus partidas siguen contando para los récords.
  const ranked = getLadderStats(data, { minMatches: 1 })
  const playedIds = new Set(data.matches.flatMap((m) => m.players.map((p) => p.playerId)))
  const unplayed = getLadderData(data).players.filter((p) => !playedIds.has(p.id))

  const recent =
    data.matches.length > RECENT_MATCH_COUNT
      ? {
          stats: getLadderStats(data, { lastNMatches: RECENT_MATCH_COUNT, minMatches: 1 }),
          matchCount: RECENT_MATCH_COUNT,
        }
      : null

  const summary = computeSeasonSummary(data)
  const records = computeMatchRecords(data)
  const battles = computeRankBattles(ranked)
  const playerRecords = getPlayerRecords(data, getPlayerStatsForData(data, { minMatches: 1 }))
  const topFakador = [...data.players].filter((p) => (p.fakes ?? 0) > 0).sort((a, b) => (b.fakes ?? 0) - (a.fakes ?? 0))[0]

  const previousData = previousSeason ? getSeasonData(league, previousSeason.id) : null
  const previousStandings =
    previousSeason && previousData
      ? getLadderStats(previousData, { minMatches: 1 })
      : []
  const previousChampion =
    previousSeason && previousStandings[0]
      ? { seasonName: previousSeason.name, seasonSlug: previousSeason.slug, stats: previousStandings[0] }
      : null

  const recentMatch = data.matches[0]

  // Homenaje QEPD: los que ya no juegan más, con las cifras de toda su carrera.
  const career = getCareerData(league)
  const homenaje: Difunto[] = league.players
    .filter((player) => player.qepd)
    .flatMap((player) => {
      const stats = getSinglePlayerStats(career, player.id)
      if (!stats?.matches) return []
      const jugadas = league.matches.filter((m) => m.players.some((mp) => mp.playerId === player.id))
      return [{ stats, desde: jugadas[jugadas.length - 1]?.date ?? null, hasta: jugadas[0]?.date ?? null }]
    })

  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <WhatsNewModal />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-2 py-5 sm:px-4 sm:py-8">
        <BannerTemporadaNueva seasonName={season.name} depresivos={league.players.filter((player) => player.qepd)} />

        {cartel && (
          <div className="flex flex-col gap-2">
            <CartelVivo
              inicial={cartel.estado}
              jugadores={league.players.map((player) => ({ id: player.id, name: player.name, photoUrl: player.photoUrl ?? null }))}
            />
            <TopDonadores donadores={cartel.donadores} />
          </div>
        )}

        <SeasonHero
          seasonNumber={season.id}
          seasonName={season.name}
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

            {homenaje.length > 0 && (
              <Reveal>
                <HomenajeQepd difuntos={homenaje} />
              </Reveal>
            )}

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
            {faceitLinked > 0 && (
              <Reveal immediate delay={0.25} className="empty:hidden">
                <FaceitLadderHome expected={faceitLinked} />
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
