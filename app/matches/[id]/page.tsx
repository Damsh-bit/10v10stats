import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate, getLiveData } from '@/lib/mockData'
import { Scoreboard } from '@/components/scoreboard'
import { HighlightCard } from '@/components/highlight-card'

export default async function MatchDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getLiveData()
  const match = data.matches.find((m) => m.id === id)
  if (!match) notFound()

  const ctPlayers = match.players.filter((p) => p.team === 'CT')
  const tPlayers = match.players.filter((p) => p.team === 'T')
  const ctWins = match.ctScore > match.tScore
  const matchHighlights = data.highlights.filter((h) => h.matchId === id)
  const teamALabel = match.teamAName || 'CT'
  const teamBLabel = match.teamBName || 'T'

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/matches"
        className="mb-6 inline-block text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Partidas
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {match.map}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {formatDate(match.date)} · {match.durationMin ? `${match.durationMin} rondas` : 'Sin info'}
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span
            className={`text-3xl font-bold ${ctWins ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {teamALabel} {match.ctScore}
          </span>
          <span className="text-xl text-muted-foreground">—</span>
          <span
            className={`text-3xl font-bold ${!ctWins ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {match.tScore} {teamBLabel}
          </span>
        </div>
      </div>

      {/* Scoreboards */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Scoreboard
          team="CT"
          teamLabel={teamALabel}
          score={match.ctScore}
          entries={ctPlayers}
          isWinner={ctWins}
          players={data.players}
        />
        <Scoreboard
          team="T"
          teamLabel={teamBLabel}
          score={match.tScore}
          entries={tPlayers}
          isWinner={!ctWins}
          players={data.players}
        />
      </div>

      {/* Highlights */}
      <section className="mt-8">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Highlights of this match
        </h2>
        {matchHighlights.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {matchHighlights.map((h) => (
              <HighlightCard
                key={h.id}
                highlight={h}
                className="w-72 shrink-0"
                matchLabel={match.map}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-card px-3 py-6 text-center text-[13px] text-muted-foreground">
            No highlights recorded for this match.
          </div>
        )}
      </section>
    </main>
  )
}
