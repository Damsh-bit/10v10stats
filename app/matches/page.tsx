import { Suspense } from 'react'
import { getLeagueData } from '@/lib/api'
import { MatchesPageContent } from '@/components/matches/matches-page-content'
import { Reveal } from '@/components/motion/reveal'

export const revalidate = 60

export default async function MatchesPage() {
  const league = await getLeagueData()
  const seasonMatches = league.matches.filter((m) => m.seasonId === league.currentSeason.id).length

  return (
    <main className="cs-grid min-h-screen">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <Reveal immediate className="mb-6">
          <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">10v10 Stats</span>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">Partidas</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {seasonMatches} {seasonMatches === 1 ? 'partida' : 'partidas'} en la {league.currentSeason.name} ·{' '}
            {league.matches.length} en total. Filtrá por temporada, mapa o fecha.
          </p>
        </Reveal>
        <Suspense
          fallback={
            <div className="flex flex-col gap-3" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
              ))}
            </div>
          }
        >
          <MatchesPageContent
            matches={league.matches}
            seasons={league.seasons}
            currentSeasonId={league.currentSeason.id}
          />
        </Suspense>
      </div>
    </main>
  )
}
