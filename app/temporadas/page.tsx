import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight, Crown, Sparkles, Trophy } from 'lucide-react'
import { getLeagueData, getSeasonData, getPlayerStatsForData } from '@/lib/api'
import { formatSeasonDate, getPlacementMatches, getSeasonDay } from '@/lib/seasons'
import { computeSeasonSummary } from '@/lib/season-stats'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { Stagger, StaggerItem, Reveal } from '@/components/motion/reveal'
import { cn } from '@/lib/utils'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Temporadas — 10v10 Stats',
  description: 'Todas las temporadas del 10v10: campeones, tablas finales y récords.',
}

export default async function SeasonsPage() {
  const league = await getLeagueData()
  const seasons = [...league.seasons].sort((a, b) => b.id - a.id)

  const cards = seasons.map((season) => {
    const data = getSeasonData(league, season.id)
    const standings = getPlayerStatsForData(data, { minMatches: getPlacementMatches(season) })
    return { season, summary: computeSeasonSummary(data), top: standings[0] ?? null }
  })

  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-3 py-6 sm:px-4 sm:py-10">
        <Reveal immediate className="mb-8">
          <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">10v10 Stats</span>
          <h1 className="font-heading text-4xl font-bold uppercase tracking-wide text-foreground">Temporadas</h1>
          <p className="mt-1 max-w-xl text-[14px] text-muted-foreground">
            Cada temporada arranca de cero. Las anteriores quedan acá: la tabla final, los récords, los Nelsons y los
            Fakasos, tal cual terminaron.
          </p>
        </Reveal>

        <Stagger className="grid gap-4 md:grid-cols-2" immediate stagger={0.1}>
          {cards.map(({ season, summary, top }) => {
            const href = season.isCurrent ? '/' : `/temporadas/${season.slug}`
            return (
              <StaggerItem key={season.id}>
                <Link
                  href={href}
                  className={cn(
                    'group relative flex h-full flex-col overflow-hidden rounded-2xl border p-5 transition-all hover:-translate-y-0.5 sm:p-6',
                    season.isCurrent
                      ? 'season-hero border-amber-300/30 hover:border-amber-300/60'
                      : 'border-border bg-card hover:border-primary/50',
                  )}
                >
                  <span
                    className="season-watermark pointer-events-none absolute -right-3 -top-6 select-none font-heading text-[9rem] font-black leading-none"
                    aria-hidden="true"
                  >
                    S{season.id}
                  </span>

                  <div className="relative flex items-center gap-2">
                    {season.isCurrent ? (
                      <span className="season-chip flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black">
                        <Sparkles className="h-3 w-3" aria-hidden="true" /> En curso · Día {getSeasonDay(season)}
                      </span>
                    ) : (
                      <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Finalizada
                      </span>
                    )}
                  </div>

                  <h2 className={cn('relative mt-3 font-heading text-4xl font-black uppercase', season.isCurrent ? 'season-gradient-text' : 'text-foreground')}>
                    {season.name}
                  </h2>
                  {season.tagline && <p className="relative text-[14px] text-foreground/75">{season.tagline}</p>}
                  <p className="relative mt-1 font-mono text-[11px] text-muted-foreground">
                    {formatSeasonDate(season.startsAt)} → {formatSeasonDate(season.endsAt)}
                  </p>

                  <dl className="relative mt-5 grid grid-cols-3 gap-2">
                    {[
                      ['Partidas', summary.matches],
                      ['Kills', summary.totalKills.toLocaleString('es-AR')],
                      ['Jugadores', summary.activePlayers],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-white/5 bg-black/20 px-3 py-2">
                        <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
                        <dd className="font-mono text-lg font-bold text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>

                  <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
                    {top ? (
                      <span className="flex min-w-0 items-center gap-2.5">
                        <PlayerAvatar player={top.player} size={32} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                            {season.isCurrent ? <Trophy className="h-3 w-3" aria-hidden="true" /> : <Crown className="h-3 w-3" aria-hidden="true" />}
                            {season.isCurrent ? 'Líder actual' : 'Campeón'}
                          </span>
                          <span className="block truncate text-[14px] font-semibold text-foreground">
                            {top.player.name} <span className="font-mono text-[12px] text-muted-foreground">· {top.kda.toFixed(2)} KDA</span>
                          </span>
                        </span>
                      </span>
                    ) : (
                      <span className="text-[13px] text-muted-foreground">El #1 todavía está vacante</span>
                    )}
                    <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold uppercase tracking-wider text-brand">
                      {season.isCurrent ? 'Ir al ladder' : 'Ver archivo'}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      </div>
    </main>
  )
}
