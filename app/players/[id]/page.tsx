import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getLiveData, getAllPlayerStats } from '@/lib/mockData'
import { PlayerAvatar, BadgePill } from '@/components/strike-ui'
import { EnlargeableAvatar } from '@/components/enlargeable-avatar'
import {
  PlayerHighlightsGrid,
  PlayerHighlightsSkeleton,
} from '@/components/player-highlights-grid'
import { EditPlayerModal } from '@/components/edit-player-modal'
import { PlayerMatchHistory } from '@/components/player-match-history'
import { KDaBadges } from '@/components/kda-badges'
import { getPlayerRecords } from '@/lib/records'
import { RecordBadge } from '@/components/record-badges'

export default async function PlayerProfile({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const data = await getLiveData()
  const allStats = await getAllPlayerStats()
  const stats = data.players.find((p) => p.id === id)
  if (!stats) notFound()

  const playerRecords = getPlayerRecords(data, allStats)
  const myRecords = playerRecords[id] || []

  const isLastPlace = allStats.length > 0 && allStats[allStats.length - 1].player.id === id

  const playerMatches = data.matches
    .filter((m) => m.players.some((mp) => mp.playerId === id))
    .map((m) => ({
      match: m,
      entry: m.players.find((mp) => mp.playerId === id)!,
    }))
    .sort((a, b) => b.match.date.localeCompare(a.match.date))

  const playerMatchMapById = new Map(data.matches.map((match) => [match.id, match.map]))

  const playerStats = data.matches
    .flatMap((m) => m.players.filter((entry) => entry.playerId === id))
    .reduce(
      (acc, entry) => {
        acc.matches += 1
        acc.kills += entry.kills
        acc.deaths += entry.deaths
        acc.assists += entry.assists
        acc.damage += entry.damage
        acc.wins += entry.won ? 1 : 0
        acc.losses += entry.won ? 0 : 1
        acc.mvps += entry.mvps || 0
        if (entry.kills > entry.deaths) acc.positiveGames += 1
        else if (entry.deaths > entry.kills) acc.negativeGames += 1
        return acc
      },
      {
        matches: 0,
        wins: 0,
        losses: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        damage: 0,
        mvps: 0,
        positiveGames: 0,
        negativeGames: 0,
      },
    )

  const kda = playerStats.deaths === 0 ? playerStats.kills + playerStats.assists : (playerStats.kills + playerStats.assists) / playerStats.deaths
  const adm = playerStats.matches > 0 ? Math.round(playerStats.damage / playerStats.matches) : 0
  const winrate = playerStats.matches > 0 ? ((playerStats.wins / playerStats.matches) * 100).toFixed(1) + '%' : '0%'
  const statCards = [
    { label: 'Matches', value: `${playerStats.matches}` },
    { label: 'W / L', value: `${playerStats.wins} / ${playerStats.losses}` },
    { label: 'Win %', value: winrate },
    { label: 'KDA', value: kda.toFixed(2), accent: true },
    { label: 'Kills', value: `${playerStats.kills}` },
    { label: 'Deaths', value: `${playerStats.deaths}` },
    { label: 'Damage', value: playerStats.damage.toLocaleString() },
    { label: 'ADM', value: adm.toLocaleString(), title: 'Average Damage per Match' },
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
          <EnlargeableAvatar player={stats} size={80} />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold leading-none text-foreground">
                {stats.name}
              </h1>
              <EditPlayerModal player={{ id: stats.id, name: stats.name, photoUrl: stats.photoUrl }} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <BadgePill>{stats.badge}</BadgePill>
              {myRecords.map((record) => (
                <RecordBadge key={record} type={record} />
              ))}
              {isLastPlace && (
                <span 
                  title="Último lugar del ladder histórico"
                  className="flex shrink-0 items-center gap-1 rounded border border-amber-700/50 bg-[#101010] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-amber-600 shadow-sm cursor-help"
                >
                  💩 MENUDA MIERDA
                </span>
              )}
              {playerStats.mvps > 0 && (
                <div className="flex items-center gap-1.5 rounded border border-[#d4af37]/30 bg-[#101010] px-2.5 py-0.5 shadow-sm">
                  <span className="text-[11px] text-[#d4af37] opacity-90">👑</span>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-[#d4af37]">
                    {playerStats.mvps} MVP{playerStats.mvps !== 1 ? 'S' : ''}
                  </span>
                </div>
              )}
              {(() => {
                const fullStats = allStats.find(s => s.player.id === id)
                const currentStreak = fullStats?.currentStreak || 0
                if (currentStreak >= 3) {
                  return (
                    <div className="flex items-center gap-1.5 rounded border border-orange-500/30 bg-[#101010] px-2.5 py-0.5 shadow-sm" title={`Racha de ${currentStreak} victorias`}>
                      <span className="text-[11px] text-orange-500 opacity-90">🔥</span>
                      <span className="text-[10px] font-medium uppercase tracking-widest text-orange-500">
                        RACHA DE {currentStreak}
                      </span>
                    </div>
                  )
                }
                return null
              })()}
              {stats.nelsons > 0 && (
                <div className="flex items-center gap-1.5 rounded border border-primary/30 bg-[#101010] px-2.5 py-0.5 shadow-sm">
                  <span className="text-[11px] text-primary opacity-90">💀</span>
                  <span className="text-[10px] font-medium uppercase tracking-widest text-primary">
                    {stats.nelsons} NELSON{stats.nelsons !== 1 ? 'S' : ''}
                  </span>
                </div>
              )}
              <KDaBadges positiveGames={playerStats.positiveGames} negativeGames={playerStats.negativeGames} size="md" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {statCards.map((c) => (
            <div
              key={c.label}
              className="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-2.5"
              title={'title' in c ? c.title : undefined}
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

      {/* Two columns: Match history (left) + Highlights (right) */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Match history */}
        <section>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Match History
          </h2>
          <PlayerMatchHistory matches={playerMatches} />
        </section>

        {/* Highlights — streams with Suspense skeleton */}
        <section>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
            Highlights
          </h2>
          <Suspense fallback={<PlayerHighlightsSkeleton />}>
            <PlayerHighlightsGrid playerId={id} />
          </Suspense>
        </section>
      </div>
    </main>
  )
}
