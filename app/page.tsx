import { getAllPlayerStats, getLiveData } from '@/lib/mockData'
import { MiniLeaderboard } from '@/components/mini-leaderboard'
import { NelsonLeague } from '@/components/nelson-league'
import { RecentMatches } from '@/components/recent-matches'
import { DashboardStats, dashboardIcons } from '@/components/dashboard-stats'

export default async function Page() {
  const data = await getLiveData()
  const stats = await getAllPlayerStats()

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
        <div className="mb-6">
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

        <div className="mb-6">
          <DashboardStats stats={overview} />
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
          <div className="lg:col-span-2">
            <MiniLeaderboard stats={stats} />
          </div>
          <div className="flex flex-col gap-6">
            <NelsonLeague entries={data.nelsonLeague} />
            <RecentMatches matches={data.matches.slice(0, 4)} />
          </div>
        </div>
      </div>
    </main>
  )
}
