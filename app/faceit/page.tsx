import type { Metadata } from 'next'
import { LineChart } from 'lucide-react'
import { getLeagueData } from '@/lib/api'
import { buildEloRace, findSharedMatches, getFaceitEntries, levelForElo, toLadderRows } from '@/lib/faceit'
import { FaceitLadder } from '@/components/faceit/faceit-ladder'
import { FaceitEloRace } from '@/components/faceit/faceit-charts'
import { FaceitHighlights, SharedFaceitMatches } from '@/components/faceit/faceit-group'
import { FaceitLevel } from '@/components/faceit/faceit-bits'
import { Reveal } from '@/components/motion/reveal'

// Igual que el cache de los pedidos a FACEIT (FACEIT_REVALIDATE_SECONDS).
export const revalidate = 300
// Margen para refrescar FACEIT (los pedidos van de a uno).
export const maxDuration = 60

export const metadata: Metadata = {
  title: 'FACEIT — 10v10 STATS',
  description: 'Nivel, elo, forma y partidas de FACEIT de cada jugador del 10v10, en vivo.',
}

const RACE_DAYS = 30

export default async function FaceitPage() {
  const league = await getLeagueData()
  const entries = await getFaceitEntries(league.players)
  const now = Date.now()

  const rows = toLadderRows(entries, now)
  const race = buildEloRace(entries, RACE_DAYS, now)
  const shared = findSharedMatches(entries, 8)

  const avgElo = entries.length ? Math.round(entries.reduce((acc, e) => acc + e.profile.elo, 0) / entries.length) : 0
  const weekMatches = entries.reduce((acc, e) => acc + e.summary.matchesLast7Days, 0)
  const groupTrend = Object.values(race.change).reduce((acc, v) => acc + v, 0)
  const updatedAt = new Date(now).toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const stats = [
    { label: 'Elo promedio', value: avgElo.toString(), extra: <FaceitLevel level={levelForElo(avgElo)} size={22} /> },
    { label: 'Partidas (7 días)', value: weekMatches.toString() },
    {
      label: `Elo del grupo (${RACE_DAYS} d)`,
      value: `${groupTrend > 0 ? '+' : groupTrend < 0 ? '−' : '±'}${Math.abs(groupTrend)}`,
      tone: groupTrend > 0 ? 'text-emerald-400' : groupTrend < 0 ? 'text-rose-400' : undefined,
    },
    { label: 'Jugaron juntos', value: shared.length.toString(), hint: 'partidas recientes' },
  ]

  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-3 py-6 sm:px-4 sm:py-8">
        <Reveal immediate className="flex flex-col gap-4">
          <div>
            <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-orange-400">10v10 Stats</span>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">FACEIT</h1>
            <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
              Nivel, elo y forma de cada uno, en vivo desde FACEIT. Se actualiza solo cada 5 minutos · última vez a las{' '}
              {updatedAt}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col gap-1 rounded-xl border border-border bg-card/90 px-3 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                <span className="flex items-center gap-2">
                  {s.extra}
                  <span className={`font-mono text-xl font-black tabular-nums ${s.tone ?? 'text-foreground'}`}>{s.value}</span>
                  {s.hint && <span className="text-[10px] text-muted-foreground">{s.hint}</span>}
                </span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal immediate delay={0.08}>
          <FaceitHighlights entries={entries} />
        </Reveal>

        <Reveal immediate delay={0.14}>
          <FaceitLadder rows={rows} variant="full" updatedLabel={`actualizado ${updatedAt}`} />
        </Reveal>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Reveal>
            <section className="overflow-hidden rounded-xl border border-border bg-card">
              <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
                  <LineChart className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="flex flex-col">
                  <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">
                    Carrera de elo
                  </h2>
                  <span className="text-[11px] text-muted-foreground">Elo al final de cada día · últimos {RACE_DAYS} días</span>
                </div>
              </header>
              <div className="p-4">
                <FaceitEloRace series={race.series} rows={race.rows} change={race.change} />
              </div>
            </section>
          </Reveal>

          <Reveal>
            <SharedFaceitMatches shared={shared} now={now} />
          </Reveal>
        </div>
      </div>
    </main>
  )
}
