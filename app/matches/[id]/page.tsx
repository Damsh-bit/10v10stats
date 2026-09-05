import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate, getLiveData } from '@/lib/api'
import { Scoreboard } from '@/components/matches/scoreboard'
import { EditMatchModal } from '@/components/matches/edit-match-modal'

export const revalidate = 60

export default async function MatchDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getLiveData()
  const match = data.matches.find((m) => m.id === id)
  if (!match) notFound()

  const teamALabel = match.teamAName || 'CT'
  const teamBLabel = match.teamBName || 'T'

  const ctPlayers = match.players.filter((p) => p.team === teamALabel || p.team === 'CT')
  const tPlayers = match.players.filter((p) => p.team === teamBLabel || p.team === 'T')
  const ctWins = match.winnerTeam ? (match.winnerTeam === 'CT' || match.winnerTeam === match.teamAName) : (match.ctScore > match.tScore)

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/matches"
          className="inline-block text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Partidas
        </Link>

        <div className="flex items-center gap-2">
          <EditMatchModal
            matchId={match.id}
            initialCtScore={match.ctScore}
            initialTScore={match.tScore}
            initialMap={match.map}
            initialDate={match.date}
            teamALabel={teamALabel}
            teamBLabel={teamBLabel}
            matchPlayers={match.players}
            allPlayers={data.players}
          />
        </div>
      </div>

      {/* Header */}
      <div className="relative overflow-hidden flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-60 transition-all duration-700"
          style={{ backgroundImage: `url('/maps/${match.map.toLowerCase().replace(/\s+/g, '')}.webp')` }}
        />
        {/* Gradient Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-r from-card/90 via-card/30 to-card/90" />
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-card/80 via-transparent to-transparent sm:hidden" />

        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight text-foreground drop-shadow-md">
            {match.map}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground drop-shadow-sm">
            {formatDate(match.date)} · {match.durationMin ? `${match.durationMin} rondas` : 'Sin info'}
          </p>
        </div>
        <div className="relative z-10 flex items-center gap-3 font-mono drop-shadow-md">
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

      {match.fotoUrl ? (
        <section className="mt-6">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Captura del tabulador
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card p-3">
            <img
              src={match.fotoUrl}
              alt={`Captura de ${match.map}`}
              className="mx-auto max-h-[480px] w-full rounded-md object-contain"
            />
          </div>
        </section>
      ) : null}

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
    </main>
  )
}
