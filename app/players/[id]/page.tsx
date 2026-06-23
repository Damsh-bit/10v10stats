import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  getPlayerStats,
  getPlayerMatches,
  getPlayerHighlights,
  formatDate,
} from '@/lib/mockData'
import { PlayerAvatar, BadgePill, ResultChip } from '@/components/strike-ui'
import { HighlightCard } from '@/components/highlight-card'

export default async function PlayerProfile({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const stats = getPlayerStats(id)
  if (!stats) notFound()

  const playerMatches = getPlayerMatches(id)
  const playerHighlights = getPlayerHighlights(id)

  const statCards = [
    { label: 'Matches', value: `${stats.matches}` },
    { label: 'W / L', value: `${stats.wins} / ${stats.losses}` },
    { label: 'KDA', value: stats.kda.toFixed(2), accent: true },
    { label: 'Kills', value: `${stats.kills}` },
    { label: 'Deaths', value: `${stats.deaths}` },
    { label: 'Damage', value: stats.damage.toLocaleString() },
  ]

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Link
        href="/"
        className="mb-6 inline-block text-[13px] text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Leaderboard
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <PlayerAvatar player={stats.player} size={80} />
          <div className="flex flex-col gap-2">
            <h1 className="text-xl font-bold leading-none text-foreground">
              {stats.player.name}
            </h1>
            <BadgePill>{stats.player.badge}</BadgePill>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {statCards.map((c) => (
            <div
              key={c.label}
              className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5"
            >
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <span
                className={`font-mono text-lg font-bold ${c.accent ? 'text-primary' : 'text-foreground'}`}
              >
                {c.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Two columns */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Match history */}
        <section>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Match History
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {playerMatches.map(({ match, entry }, i) => (
              <Link
                key={match.id}
                href={`/matches/${match.id}`}
                className={`flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-accent/60 ${i > 0 ? 'border-t border-border' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <ResultChip won={entry.won} />
                  <span className="text-[14px] font-medium text-foreground">
                    {match.map}
                  </span>
                </div>
                <div className="flex items-center gap-4 font-mono text-[12px] text-muted-foreground">
                  <span className="text-foreground">
                    {entry.kills}/{entry.deaths}/{entry.assists}
                  </span>
                  <span className="hidden sm:inline">{entry.damage} dmg</span>
                  <span className="w-20 text-right">{formatDate(match.date)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Highlights */}
        <section>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Highlights
          </h2>
          {playerHighlights.length > 0 ? (
            <div className="flex flex-col gap-3">
              {playerHighlights.map((h) => (
                <HighlightCard key={h.id} highlight={h} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card px-3 py-6 text-center text-[13px] text-muted-foreground">
              No highlights recorded yet.
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
