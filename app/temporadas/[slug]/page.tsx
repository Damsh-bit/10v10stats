import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft, Archive, Crown } from 'lucide-react'
import { getLeagueData, getSeasonData, getPlayerStatsForData } from '@/lib/api'
import { getPlayerRecords } from '@/lib/records'
import { findSeasonBySlug, formatSeasonDate, getPlacementMatches, getSeasons } from '@/lib/seasons'
import { computeMatchRecords, computeSeasonSummary, toMapWinrateRows } from '@/lib/season-stats'
import { SeasonPodium } from '@/components/season/season-podium'
import { SeasonStatStrip } from '@/components/season/season-stat-strip'
import { SeasonLadder } from '@/components/stats/season-ladder'
import { SeasonRecords } from '@/components/stats/season-records'
import { NelsonLeague } from '@/components/stats/nelson-league'
import { MapWinrateSection } from '@/components/stats/map-winrate-section'
import { RecentMatches } from '@/components/matches/recent-matches'
import { FakeLeaderboard } from '@/components/TeamGenerator/FakeLeaderboard'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { Reveal } from '@/components/motion/reveal'

export const revalidate = 300

export async function generateStaticParams() {
  const seasons = await getSeasons()
  return seasons.filter((s) => !s.isCurrent).map((s) => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const season = findSeasonBySlug(await getSeasons(), slug)
  return { title: season ? `${season.name} — 10v10 Stats` : 'Temporada — 10v10 Stats' }
}

export default async function SeasonArchivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const league = await getLeagueData()
  const season = findSeasonBySlug(league.seasons, slug)
  if (!season) notFound()
  if (season.isCurrent) redirect('/')

  const data = getSeasonData(league, season.id)
  const standings = getPlayerStatsForData(data, { minMatches: getPlacementMatches(season) })
  const summary = computeSeasonSummary(data)
  const records = computeMatchRecords(data)
  const playerRecords = getPlayerRecords(data, standings)
  const champion = standings[0]
  const topFakador = [...data.players].filter((p) => (p.fakes ?? 0) > 0).sort((a, b) => (b.fakes ?? 0) - (a.fakes ?? 0))[0]

  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-2 py-5 sm:px-4 sm:py-8">
        <Link
          href="/temporadas"
          className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Todas las temporadas
        </Link>

        <section className="relative overflow-hidden rounded-2xl border border-amber-300/20 bg-gradient-to-br from-amber-300/[0.08] via-card to-card px-4 py-7 sm:px-8">
          <span
            className="season-watermark pointer-events-none absolute -right-2 top-1/2 -translate-y-1/2 select-none font-heading text-[10rem] font-black leading-none sm:text-[14rem]"
            aria-hidden="true"
          >
            S{season.id}
          </span>

          <div className="relative grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-end">
            <Reveal immediate>
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-300/90">
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                Archivo · Temporada finalizada
              </p>
              <h1 className="mt-2 font-heading text-5xl font-black uppercase tracking-tight text-foreground sm:text-6xl">
                {season.name}
              </h1>
              {season.tagline && <p className="mt-1 text-[15px] text-foreground/80">{season.tagline}</p>}
              <p className="mt-1 font-mono text-[12px] text-muted-foreground">
                {formatSeasonDate(season.startsAt)} → {formatSeasonDate(season.endsAt)}
              </p>

              {champion && (
                <Link
                  href={`/players/${champion.player.id}`}
                  className="group mt-6 flex w-fit items-center gap-3 rounded-xl border border-amber-300/30 bg-black/20 p-3 pr-5 transition-colors hover:border-amber-300/60"
                >
                  <span className="rounded-full ring-2 ring-amber-300 ring-offset-2 ring-offset-card">
                    <PlayerAvatar player={champion.player} size={44} />
                  </span>
                  <span>
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                      <Crown className="h-3 w-3" aria-hidden="true" /> Campeón
                    </span>
                    <span className="block font-heading text-xl font-bold uppercase text-foreground group-hover:text-white">
                      {champion.player.name}
                    </span>
                    <span className="block font-mono text-[11px] text-muted-foreground">
                      {champion.kda.toFixed(2)} KDA · {champion.wins}W en {champion.matches} partidas
                    </span>
                  </span>
                </Link>
              )}
            </Reveal>

            {standings.length > 0 && (
              <div className="pt-6">
                <SeasonPodium top={standings.slice(0, 3)} />
              </div>
            )}
          </div>
        </section>

        <SeasonStatStrip
          stats={[
            { label: 'Partidas', value: summary.matches },
            { label: 'Kills', value: summary.totalKills },
            { label: 'Jugadores', value: summary.activePlayers },
            {
              label: 'Mapa más jugado',
              value: summary.mostPlayedMap?.map ?? '—',
              hint: summary.mostPlayedMap ? `${summary.mostPlayedMap.count} partidas` : undefined,
            },
          ]}
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
            <Reveal>
              <SeasonLadder
                seasonName={season.name}
                ranked={standings}
                placementMatches={getPlacementMatches(season)}
                records={playerRecords}
                topFakadorId={topFakador?.id ?? null}
                archived
              />
            </Reveal>
            <MapWinrateSection rows={toMapWinrateRows(data.matches)} />
          </div>

          <div className="flex min-w-0 flex-col gap-6">
            <Reveal>
              <SeasonRecords records={records} seasonName={season.name} />
            </Reveal>
            <Reveal>
              <NelsonLeague entries={data.nelsonLeague} subtitle={`Tabla final · ${season.name}`} archived />
            </Reveal>
            <Reveal>
              <FakeLeaderboard archived={data.players.map((p) => ({ name: p.name, count: p.fakes ?? 0 }))} />
            </Reveal>
            <Reveal>
              <RecentMatches
                matches={data.matches.slice(0, 5)}
                href={`/matches?temporada=${season.slug}`}
                emptyText="No hay partidas en esta temporada."
              />
            </Reveal>
          </div>
        </div>
      </div>
    </main>
  )
}
