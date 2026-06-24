import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getMatch, getMatchHighlights, formatDate } from '@/lib/mockData'
import { Scoreboard } from '@/components/scoreboard'
import { HighlightCard } from '@/components/highlight-card'

export default async function MatchDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const match = getMatch(id)
  if (!match) notFound()

  const ctPlayers = match.players.filter((p) => p.team === 'CT')
  const tPlayers = match.players.filter((p) => p.team === 'T')
  const ctWins = match.ctScore > match.tScore
  const matchHighlights = getMatchHighlights(id)

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
            {formatDate(match.date)} · {match.durationMin} min
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono">
          <span
            className={`text-3xl font-bold ${ctWins ? 'text-primary' : 'text-muted-foreground'}`}
          >
            CT {match.ctScore}
          </span>
          <span className="text-xl text-muted-foreground">—</span>
          <span
            className={`text-3xl font-bold ${!ctWins ? 'text-primary' : 'text-muted-foreground'}`}
          >
            {match.tScore} T
          </span>
        </div>
      </div>

      {/* Scoreboards */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Scoreboard
          team="CT"
          score={match.ctScore}
          entries={ctPlayers}
          isWinner={ctWins}
        />
        <Scoreboard
          team="T"
          score={match.tScore}
          entries={tPlayers}
          isWinner={!ctWins}
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
