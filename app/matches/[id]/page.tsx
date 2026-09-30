import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { getLeagueData } from '@/lib/api'
import { formatDate, mapImageUrl } from '@/lib/format'
import { Scoreboard } from '@/components/matches/scoreboard'
import { EditMatchModal } from '@/components/matches/edit-match-modal'
import { Reveal } from '@/components/motion/reveal'
import { cn } from '@/lib/utils'

export const revalidate = 60

export async function generateStaticParams() {
  return []
}

export default async function MatchDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const league = await getLeagueData()
  const match = league.matches.find((m) => m.id === id)
  if (!match) notFound()

  const season = league.seasons.find((s) => s.id === match.seasonId)
  const teamALabel = match.teamAName || 'CT'
  const teamBLabel = match.teamBName || 'T'

  // Los invitados no suman estadísticas pero sí aparecen en el tabulador y en el editor.
  const entries = [...match.players, ...match.guests]
  const ctPlayers = entries.filter((p) => p.team === teamALabel || p.team === 'CT')
  const tPlayers = entries.filter((p) => p.team === teamBLabel || p.team === 'T')
  const isDraw = match.ctScore === match.tScore
  const ctWins = !isDraw && match.ctScore > match.tScore

  return (
    <main className="cs-grid min-h-screen">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <Link
            href={season && !season.isCurrent ? `/matches?temporada=${season.slug}` : '/matches'}
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Partidas
          </Link>

          <EditMatchModal
            matchId={match.id}
            initialCtScore={match.ctScore}
            initialTScore={match.tScore}
            initialMap={match.map}
            initialDate={match.date}
            teamALabel={teamALabel}
            teamBLabel={teamBLabel}
            matchPlayers={entries}
            allPlayers={league.players}
          />
        </div>

        <Reveal immediate>
          <div className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div
              className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-60"
              style={{ backgroundImage: `url('${mapImageUrl(match.map)}')` }}
              aria-hidden="true"
            />
            <div className="absolute inset-0 z-0 bg-gradient-to-r from-card/95 via-card/40 to-card/95" aria-hidden="true" />
            <div className="absolute inset-0 z-0 bg-gradient-to-t from-card/85 via-transparent to-transparent sm:hidden" aria-hidden="true" />

            <div className="relative z-10">
              {season && (
                <Link
                  href={season.isCurrent ? '/' : `/temporadas/${season.slug}`}
                  className={cn(
                    'mb-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider',
                    season.isCurrent ? 'season-chip text-black' : 'border border-white/20 bg-black/30 text-foreground/80',
                  )}
                >
                  {season.name}
                </Link>
              )}
              <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground drop-shadow-md">{match.map}</h1>
              <p className="mt-1 text-[13px] text-foreground/70 drop-shadow-sm">
                {formatDate(match.date)} · {match.durationMin ? `${match.durationMin} rondas` : 'Sin info'}
              </p>
            </div>

            <div className="relative z-10 flex items-center gap-3 font-mono drop-shadow-md sm:gap-4">
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-foreground/70">{teamALabel}</span>
                <span className={cn('text-4xl font-black sm:text-5xl', ctWins ? 'text-emerald-300' : 'text-foreground/60')}>{match.ctScore}</span>
              </div>
              <span className="text-xl text-muted-foreground">—</span>
              <div className="flex flex-col items-start">
                <span className="text-[11px] font-sans font-semibold uppercase tracking-wider text-foreground/70">{teamBLabel}</span>
                <span className={cn('text-4xl font-black sm:text-5xl', !ctWins && !isDraw ? 'text-emerald-300' : 'text-foreground/60')}>{match.tScore}</span>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Reveal delay={0.05}>
            <Scoreboard team="CT" teamLabel={teamALabel} score={match.ctScore} entries={ctPlayers} isWinner={ctWins} players={league.players} />
          </Reveal>
          <Reveal delay={0.15}>
            <Scoreboard team="T" teamLabel={teamBLabel} score={match.tScore} entries={tPlayers} isWinner={!ctWins && !isDraw} players={league.players} />
          </Reveal>
        </div>

        {match.fotoUrl ? (
          <Reveal className="mt-6">
            <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">Captura del tabulador</h2>
            <div className="overflow-hidden rounded-xl border border-border bg-card p-3">
              <img
                src={match.fotoUrl}
                alt={`Captura del tabulador de ${match.map}`}
                loading="lazy"
                className="mx-auto max-h-[480px] w-full rounded-md object-contain"
              />
            </div>
          </Reveal>
        ) : null}
      </div>
    </main>
  )
}
