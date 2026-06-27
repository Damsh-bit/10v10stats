import { Suspense } from 'react'
import Link from 'next/link'
import { getAllPlayerStats, getLiveData, formatDate } from '@/lib/mockData'
import { getPlayerRecords } from '@/lib/records'
import { MiniLeaderboard } from '@/components/mini-leaderboard'
import { NelsonLeague } from '@/components/nelson-league'
import { RecentMatches } from '@/components/recent-matches'
import { DashboardStats, dashboardIcons } from '@/components/dashboard-stats'
import { NewHighlightModal } from '@/components/new-highlight-modal'
import { NewMatchModal } from '@/components/new-match-modal'
import { NelsonVotePanel } from '@/components/nelson-vote-panel'
import { getNelsonData } from '@/lib/nelson'
import { VideoEmbed } from '@/components/video-embed'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'
import { MapWinrateSection } from '@/components/map-winrate-section'

export const dynamic = 'force-dynamic'

function resolveClipUrl(clipUrl: string | null | undefined): string | null {
  if (!clipUrl) return null
  const trimmed = clipUrl.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed

  const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
  if (!supabase) return null
  const { data } = supabase.storage.from('highlights').getPublicUrl(trimmed)
  return data.publicUrl
}

export default async function Page() {
  const data = await getLiveData()
  const stats = await getAllPlayerStats()
  const nelsonData = await getNelsonData()

  const totalKills = data.matches.reduce(
    (acc, m) => acc + m.players.reduce((s, p) => s + p.kills, 0),
    0,
  )

  const bestKda = [...stats].sort((a, b) => b.kda - a.kda)[0] ?? null
  const playerRecords = getPlayerRecords(data, stats)
  
  let recordKills = { value: 0, playerName: 'Sin datos', matchId: '' }
  let recordDeaths = { value: 0, playerName: 'Sin datos', matchId: '' }
  let recordDamage = { value: 0, playerName: 'Sin datos', matchId: '' }
  let recordMinDamage = { value: Infinity, playerName: 'Sin datos', matchId: '' }
  
  const excludedPlayerNames = ['sergio vergara']
  const excludedPlayerIds = data.players.filter(p => excludedPlayerNames.includes(p.name.toLowerCase())).map(p => p.id)

  data.matches.forEach(m => {
    m.players.forEach(p => {
      if (excludedPlayerIds.includes(p.playerId)) return

      const pName = data.players.find(pl => pl.id === p.playerId)?.name || 'Jugador'
      if (p.kills > recordKills.value) recordKills = { value: p.kills, playerName: pName, matchId: m.id }
      if (p.deaths > recordDeaths.value) recordDeaths = { value: p.deaths, playerName: pName, matchId: m.id }
      if (p.damage > recordDamage.value) recordDamage = { value: p.damage, playerName: pName, matchId: m.id }
      if (p.damage < recordMinDamage.value) recordMinDamage = { value: p.damage, playerName: pName, matchId: m.id }
    })
  })

  const hasMinDamage = Number.isFinite(recordMinDamage.value)

  const latestHighlight = data.highlights[0]
  const latestHighlightPlayer = latestHighlight
    ? data.players.find((p) => p.id === latestHighlight.playerId)?.name || 'Jugador'
    : null

  const overview = [
    {
      label: 'Partidas',
      value: String(data.matches.length),
      sub: 'jugadas en total',
      icon: dashboardIcons.Swords,
    },
    {
      label: 'Más Kills',
      value: String(recordKills.value),
      sub: recordKills.value > 0 ? `por ${recordKills.playerName}` : 'Sin datos',
      icon: dashboardIcons.Crosshair,
      matchId: recordKills.matchId,
    },
    {
      label: 'Más Muertes',
      value: String(recordDeaths.value),
      sub: recordDeaths.value > 0 ? `por ${recordDeaths.playerName}` : 'Sin datos',
      icon: dashboardIcons.Skull,
      matchId: recordDeaths.matchId,
    },
    {
      label: 'Menor daño',
      value: hasMinDamage ? recordMinDamage.value.toLocaleString() : 'Sin datos',
      sub: hasMinDamage ? `por ${recordMinDamage.playerName}` : 'Sin datos',
      icon: dashboardIcons.Flame,
      matchId: hasMinDamage ? recordMinDamage.matchId : undefined,
    },
  ]

  const chips = [
    {
      label: 'Mejor KDA',
      playerName: bestKda?.player.name,
      value: bestKda ? bestKda.kda.toFixed(2) : 'Sin info',
    },
    {
      label: 'Más daño',
      playerName: recordDamage.value > 0 ? recordDamage.playerName : undefined,
      value: recordDamage.value > 0 ? recordDamage.value.toLocaleString() : 'Sin info',
      matchId: recordDamage.matchId,
    },
    {
      label: 'Menor daño',
      playerName: hasMinDamage ? recordMinDamage.playerName : undefined,
      value: hasMinDamage ? recordMinDamage.value.toLocaleString() : 'Sin info',
      matchId: hasMinDamage ? recordMinDamage.matchId : undefined,
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
            <div className="flex items-center gap-4">
              <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">
                Dashboard
              </h1>
              <Link href="/estadisticas" className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-white">
                Ver más ➔
              </Link>
            </div>
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



        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Suspense fallback={<div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-4 py-8 text-sm text-muted-foreground"><img src="/Sticker loader.png" alt="loader" className="h-10 w-10 opacity-60 animate-pulse" /><span>Cargando leaderboard…</span></div>}>
              <MiniLeaderboard stats={stats} records={playerRecords} />
            </Suspense>

            {/* Ladder de la partida más reciente */}
            {(() => {
              const recentMatch = data.matches[0]
              if (!recentMatch) return null
              const playerMap = new Map(data.players.map((p) => [p.id, p.name]))

              const teams = [...new Set(recentMatch.players.map((p) => p.team))].sort()
              const teamA = teams[0] ?? 'CT'
              const teamB = teams[1] ?? 'T'

              const playersTeamA = recentMatch.players
                .filter((p) => p.team === teamA)
                .sort((a, b) => b.damage - a.damage)
              const playersTeamB = recentMatch.players
                .filter((p) => p.team === teamB)
                .sort((a, b) => b.damage - a.damage)

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

                  <div className="grid grid-cols-[1fr_repeat(5,_auto)] items-center gap-x-3 border-b border-border/60 bg-black/30 px-3 py-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Player</span>
                    <span className="w-6 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">K</span>
                    <span className="w-6 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">D</span>
                    <span className="w-6 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">A</span>
                    <span className="w-8 text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">HS%</span>
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
                          className={`grid grid-cols-[1fr_repeat(5,_auto)] items-center gap-x-3 px-3 py-1.5 ${i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-black/20'
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
                          <span className="w-8 text-center font-mono text-[12px] text-yellow-500/80">{p.hsPct}%</span>
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

            <MapWinrateSection />
          </div>

          <div className="flex flex-col gap-6 lg:col-span-1">
            <Suspense fallback={<div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-4 py-8 text-sm text-muted-foreground"><img src="/Sticker loader.png" alt="loader" className="h-10 w-10 opacity-60 animate-pulse" /><span>Cargando resumen…</span></div>}>
              <DashboardStats stats={overview} forceCols={2} />
            </Suspense>

            {latestHighlight && resolveClipUrl(latestHighlight.clipUrl) && (
              <section className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-heading text-[13px] font-bold uppercase tracking-[0.2em] text-foreground flex items-center gap-2">
                    <span className="text-[#950c42]">▶</span> Highlight Reciente
                  </h2>
                  <span className="rounded bg-[#950c42]/10 px-2 py-0.5 font-mono text-[11px] font-bold text-[#950c42]">
                    {latestHighlight.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="overflow-hidden rounded-md border border-border/60">
                  <VideoEmbed url={resolveClipUrl(latestHighlight.clipUrl)!} title={latestHighlight.description || 'Highlight'} />
                </div>
                <div className="text-[13px] font-medium text-foreground">
                  Por <Link href={`/players/${latestHighlight.playerId}`} className="font-semibold text-primary hover:underline transition-colors">{latestHighlightPlayer}</Link>
                  {latestHighlight.description ? <p className="mt-1 text-[12px] text-muted-foreground font-normal">{latestHighlight.description}</p> : null}
                </div>
              </section>
            )}

            <Suspense fallback={<div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-4 py-8 text-sm text-muted-foreground"><img src="/Sticker loader.png" alt="loader" className="h-10 w-10 opacity-60 animate-pulse" /><span>Cargando Nelson…</span></div>}>
              <NelsonLeague entries={nelsonData.league} />
            </Suspense>
            <Suspense fallback={<div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-4 py-8 text-sm text-muted-foreground"><img src="/Sticker loader.png" alt="loader" className="h-10 w-10 opacity-60 animate-pulse" /><span>Cargando votos…</span></div>}>
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
            <Suspense fallback={<div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-card px-4 py-8 text-sm text-muted-foreground"><img src="/Sticker loader.png" alt="loader" className="h-10 w-10 opacity-60 animate-pulse" /><span>Cargando partidas recientes…</span></div>}>
              <RecentMatches matches={data.matches.slice(0, 4)} />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  )
}
