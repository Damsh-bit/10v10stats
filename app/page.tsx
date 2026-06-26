import { Suspense } from 'react'
import { getAllPlayerStats, getLiveData, formatDate } from '@/lib/mockData'
import { MiniLeaderboard } from '@/components/mini-leaderboard'
import { NelsonLeague } from '@/components/nelson-league'
import { RecentMatches } from '@/components/recent-matches'
import { DashboardStats, dashboardIcons } from '@/components/dashboard-stats'
import { NewHighlightModal } from '@/components/new-highlight-modal'
import { NewMatchModal } from '@/components/new-match-modal'
import { NelsonVotePanel } from '@/components/nelson-vote-panel'
import { getNelsonData } from '@/lib/nelson'

export default async function Page() {
  const data = await getLiveData()
  const stats = await getAllPlayerStats()
  const nelsonData = await getNelsonData()

  const totalKills = data.matches.reduce(
    (acc, m) => acc + m.players.reduce((s, p) => s + p.kills, 0),
    0,
  )
  const aces = data.highlights.filter((h) => h.type === 'ACE').length

  const overview = [
    {
      label: 'Partidas',
      value: String(data.matches.length),
      sub: 'jugadas en total',
      icon: dashboardIcons.Swords,
    },
    {
      label: 'Jugadores',
      value: String(data.players.length),
      sub: 'en el roster',
      icon: dashboardIcons.Users,
    },
    {
      label: 'Kills',
      value: totalKills.toLocaleString(),
      sub: 'acumuladas',
      icon: dashboardIcons.Crosshair,
    },
    {
      label: 'Highlights',
      value: String(data.highlights.length),
      sub: `${aces} aces registrados`,
      icon: dashboardIcons.Flame,
    },
  ]

  const rankedStats = [...stats].sort((a, b) => b.kills - a.kills)
  const mostKills = rankedStats[0] ?? null
  const bestKda = [...stats].sort((a, b) => b.kda - a.kda)[0] ?? null
  const mostDamage = [...stats].sort((a, b) => b.damage - a.damage)[0] ?? null

  const chips = [
    {
      label: 'Más kills',
      stat: mostKills,
      value: mostKills ? `${mostKills.kills}` : 'Sin info',
    },
    {
      label: 'Mejor KDA',
      stat: bestKda,
      value: bestKda ? bestKda.kda.toFixed(2) : 'Sin info',
    },
    {
      label: 'Más daño',
      stat: mostDamage,
      value: mostDamage ? mostDamage.damage.toLocaleString() : 'Sin info',
    },
  ]

  return (
    <main className="cs-grid min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-primary">
              10v10 Stats
            </span>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">
              Dashboard
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Resumen general de tu lobby de CS2 — leaderboard, Nelson League y
              últimas partidas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <NewMatchModal />
            <NewHighlightModal />
          </div>
        </div>

        <div className="mb-6">
          <Suspense fallback={<div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-4 py-8 text-sm text-muted-foreground"><img src="/Sticker loader.png" alt="loader" className="h-10 w-10 opacity-60 animate-pulse"/><span>Cargando resumen…</span></div>}>
            <DashboardStats stats={overview} />
          </Suspense>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {chips.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-1.5"
            >
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
              <span className="text-[13px] font-semibold text-foreground">
                {c.stat?.player?.name ?? 'Sin info'}
              </span>
              <span className="font-mono text-[13px] font-bold text-primary">
                {c.value}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Suspense fallback={<div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-4 py-8 text-sm text-muted-foreground"><img src="/Sticker loader.png" alt="loader" className="h-10 w-10 opacity-60 animate-pulse"/><span>Cargando leaderboard…</span></div>}>
              <MiniLeaderboard stats={stats} />
            </Suspense>

            {/* Ladder de la partida más reciente */}
            {(() => {
              const recentMatch = data.matches[0]
              if (!recentMatch) return null
              const playerMap = new Map(data.players.map((p) => [p.id, p.name]))

              const teams = [...new Set(recentMatch.players.map((p) => p.team))]
              const teamA = teams[0] ?? 'CT'
              const teamB = teams[1] ?? 'T'

              const playersTeamA = recentMatch.players
                .filter((p) => p.team === teamA)
                .sort((a, b) => b.kills - a.kills)
              const playersTeamB = recentMatch.players
                .filter((p) => p.team === teamB)
                .sort((a, b) => b.kills - a.kills)

              const scoreA = recentMatch.ctScore ?? 0
              const scoreB = recentMatch.tScore ?? 0
              const wonA = recentMatch.winnerTeam === teamA

              const ScoreboardTeam = ({
                players,
                teamName,
                score,
                won,
                accentClass,
                borderClass,
              }: {
                players: typeof playersTeamA
                teamName: string
                score: number
                won: boolean
                accentClass: string
                borderClass: string
              }) => (
                <div className={`flex flex-col overflow-hidden rounded-lg border ${borderClass} bg-card`}>
                  {/* Team header */}
                  <div className={`flex items-center justify-between px-3 py-2 ${accentClass}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white drop-shadow">
                        {teamName}
                      </span>
                      {won && (
                        <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
                          WIN
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-2xl font-black text-white drop-shadow">{score}</span>
                  </div>

                  {/* Column headers */}
                  <div className="grid grid-cols-[1fr_repeat(4,_auto)] items-center gap-x-3 border-b border-border/60 bg-black/30 px-3 py-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Player</span>
                    <span className="w-6 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">K</span>
                    <span className="w-6 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">D</span>
                    <span className="w-6 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">A</span>
                    <span className="w-12 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">DMG</span>
                  </div>

                  {/* Rows */}
                  <ol>
                    {players.map((p, i) => {
                      const name = playerMap.get(p.playerId) ?? p.playerId.slice(0, 8)
                      const isTopFragger = i === 0
                      return (
                        <li
                          key={p.playerId}
                          className={`grid grid-cols-[1fr_repeat(4,_auto)] items-center gap-x-3 px-3 py-1.5 ${
                            i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-black/20'
                          } ${isTopFragger ? 'border-l-2 border-yellow-400' : ''}`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-4 shrink-0 font-mono text-[10px] text-muted-foreground/60">
                              {i + 1}.
                            </span>
                            <span className={`truncate font-mono text-[12px] font-semibold ${isTopFragger ? 'text-yellow-300' : 'text-foreground'}`}>
                              {name}
                            </span>
                            {isTopFragger && (
                              <span className="shrink-0 text-[9px]">⭐</span>
                            )}
                          </div>
                          <span className="w-6 text-center font-mono text-[12px] font-bold text-green-400">{p.kills}</span>
                          <span className="w-6 text-center font-mono text-[12px] text-red-400">{p.deaths}</span>
                          <span className="w-6 text-center font-mono text-[12px] text-blue-300">{p.assists}</span>
                          <span className="w-12 text-right font-mono text-[11px] text-muted-foreground">{p.damage.toLocaleString()}</span>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              )

              return (
                <section>
                  {/* Scoreboard header */}
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="font-heading text-sm font-bold uppercase tracking-[0.2em] text-foreground">
                      ▶ Partida reciente
                    </h2>
                    <span className="rounded bg-card border border-border px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {recentMatch.map} · {formatDate(recentMatch.date)}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ScoreboardTeam
                      players={playersTeamA}
                      teamName={recentMatch.teamAName || teamA}
                      score={scoreA}
                      won={wonA}
                      accentClass="bg-gradient-to-r from-sky-700 to-sky-600"
                      borderClass="border-sky-700/50"
                    />
                    <ScoreboardTeam
                      players={playersTeamB}
                      teamName={recentMatch.teamBName || teamB}
                      score={scoreB}
                      won={!wonA}
                      accentClass="bg-gradient-to-r from-orange-700 to-orange-600"
                      borderClass="border-orange-700/50"
                    />
                  </div>
                </section>
              )
            })()}
          </div>

          <div className="flex flex-col gap-6">
            <Suspense fallback={<div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-4 py-8 text-sm text-muted-foreground"><img src="/Sticker loader.png" alt="loader" className="h-10 w-10 opacity-60 animate-pulse"/><span>Cargando Nelson…</span></div>}>
              <NelsonLeague entries={nelsonData.league} />
            </Suspense>
            <Suspense fallback={<div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-4 py-8 text-sm text-muted-foreground"><img src="/Sticker loader.png" alt="loader" className="h-10 w-10 opacity-60 animate-pulse"/><span>Cargando votos…</span></div>}>
              <NelsonVotePanel
                initialPlayers={nelsonData.players.map((player) => ({
                  id: player.id,
                  name: player.name,
                  nelsonPoints: player.nelsonPoints,
                }))}
                initialVoteState={nelsonData.voteState}
                initialAdminPasswordConfigured={nelsonData.adminPasswordConfigured}
              />
            </Suspense>
            <Suspense fallback={<div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-4 py-8 text-sm text-muted-foreground"><img src="/Sticker loader.png" alt="loader" className="h-10 w-10 opacity-60 animate-pulse"/><span>Cargando partidas recientes…</span></div>}>
              <RecentMatches matches={data.matches.slice(0, 4)} />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  )
}
