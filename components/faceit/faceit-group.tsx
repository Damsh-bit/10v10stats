import Link from 'next/link'
import { Flame, Gamepad2, Snowflake, Target, TrendingDown, TrendingUp, Users, type LucideIcon } from 'lucide-react'
import { timeAgo, type FaceitEntry, type SharedMatch } from '@/lib/faceit'
import { faceitMatchUrl, formatEloDelta } from '@/lib/faceit-format'
import { mapImageUrl } from '@/lib/format'
import { FaceitAvatar } from '@/components/faceit/faceit-bits'
import { cn } from '@/lib/utils'

type Highlight = {
  key: string
  icon: LucideIcon
  title: string
  entry: FaceitEntry
  value: string
  detail: string
  tone: string
}

/** Tarjetas de destacados: quién viene mejor, peor, más activo… */
export function FaceitHighlights({ entries }: { entries: FaceitEntry[] }) {
  const withTrend = entries.filter((e) => e.summary.trendMatches > 0)
  const pick = (list: FaceitEntry[], score: (e: FaceitEntry) => number) =>
    list.reduce<FaceitEntry | null>((best, e) => (!best || score(e) > score(best) ? e : best), null)

  const highlights: Highlight[] = []

  const hottest = pick(withTrend, (e) => e.summary.eloTrend)
  if (hottest && hottest.summary.eloTrend > 0) {
    highlights.push({
      key: 'hot',
      icon: TrendingUp,
      title: 'Viene volando',
      entry: hottest,
      value: formatEloDelta(hottest.summary.eloTrend),
      detail: `elo en las últimas ${hottest.summary.trendMatches}`,
      tone: 'text-emerald-400',
    })
  }

  const coldest = pick(withTrend, (e) => -e.summary.eloTrend)
  if (coldest && coldest.summary.eloTrend < 0) {
    highlights.push({
      key: 'cold',
      icon: TrendingDown,
      title: 'En picada',
      entry: coldest,
      value: formatEloDelta(coldest.summary.eloTrend),
      detail: `elo en las últimas ${coldest.summary.trendMatches}`,
      tone: 'text-rose-400',
    })
  }

  const streaker = pick(entries, (e) => (e.summary.streak?.won ? e.summary.streak.count : 0))
  if (streaker?.summary.streak?.won && streaker.summary.streak.count >= 2) {
    highlights.push({
      key: 'streak',
      icon: Flame,
      title: 'Racha',
      entry: streaker,
      value: `${streaker.summary.streak.count}W`,
      detail: 'victorias seguidas',
      tone: 'text-orange-400',
    })
  }

  const loser = pick(entries, (e) => (e.summary.streak && !e.summary.streak.won ? e.summary.streak.count : 0))
  if (loser?.summary.streak && !loser.summary.streak.won && loser.summary.streak.count >= 3) {
    highlights.push({
      key: 'losing',
      icon: Snowflake,
      title: 'Congelado',
      entry: loser,
      value: `${loser.summary.streak.count}L`,
      detail: 'derrotas seguidas',
      tone: 'text-cyan-400',
    })
  }

  const grinder = pick(entries, (e) => e.summary.matchesLast7Days)
  if (grinder && grinder.summary.matchesLast7Days > 0) {
    highlights.push({
      key: 'grinder',
      icon: Gamepad2,
      title: 'El más viciado',
      entry: grinder,
      value: grinder.summary.matchesLast7Days.toString(),
      detail: 'partidas en 7 días',
      tone: 'text-sky-300',
    })
  }

  const fragger = pick(
    entries.filter((e) => e.summary.sample >= 5),
    (e) => e.summary.kd,
  )
  if (fragger) {
    highlights.push({
      key: 'kd',
      icon: Target,
      title: 'Mejor K/D',
      entry: fragger,
      value: fragger.summary.kd.toFixed(2),
      detail: `últimas ${fragger.summary.sample}`,
      tone: 'text-amber-300',
    })
  }

  const closest = pick(
    entries.filter((e) => e.summary.nextLevel),
    (e) => -(e.summary.nextLevel?.eloNeeded ?? Infinity),
  )
  if (closest?.summary.nextLevel) {
    highlights.push({
      key: 'next',
      icon: TrendingUp,
      title: 'A punto de subir',
      entry: closest,
      value: `${closest.summary.nextLevel.eloNeeded}`,
      detail: `de elo para nivel ${closest.summary.nextLevel.level}`,
      tone: 'text-orange-300',
    })
  }

  if (highlights.length === 0) return null

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      {highlights.map((h) => (
        <li key={h.key}>
          <Link
            href={`/players/${h.entry.player.id}#faceit`}
            className="flex h-full flex-col gap-2 rounded-xl border border-border bg-card/90 p-3 transition-colors hover:border-muted-foreground/40 hover:bg-card"
          >
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <h.icon className={cn('h-3.5 w-3.5', h.tone)} aria-hidden="true" />
              {h.title}
            </span>
            <span className="flex items-center gap-2">
              <FaceitAvatar player={h.entry.player} avatar={h.entry.profile.avatar} size={28} />
              <span className="truncate text-[13px] font-semibold text-foreground">{h.entry.player.name}</span>
            </span>
            <span className="mt-auto flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-black text-foreground">{h.value}</span>
              <span className="text-[10px] leading-tight text-muted-foreground">{h.detail}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

/** Partidas de FACEIT en las que coincidieron jugadores del grupo. */
export function SharedFaceitMatches({ shared, now = Date.now() }: { shared: SharedMatch[]; now?: number }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
          <Users className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">Jugaron juntos</h2>
          <span className="text-[11px] text-muted-foreground">Partidas de FACEIT con dos o más del grupo</span>
        </div>
      </header>

      {shared.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
          No hay partidas recientes de FACEIT jugadas en grupo.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border/60">
          {shared.map(({ match, players, sameTeam }) => {
            const first = players[0].match
            return (
              <li key={match.id}>
                <a
                  href={faceitMatchUrl(match.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/30 sm:px-4"
                >
                  <span className="relative hidden h-10 w-16 shrink-0 overflow-hidden rounded-md bg-muted sm:block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mapImageUrl(match.map)} alt="" loading="lazy" className="h-full w-full object-cover opacity-80" />
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
                      <span className="font-semibold text-foreground">{match.map}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{timeAgo(match.playedAt, now)}</span>
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider',
                          sameTeam ? 'bg-sky-500/15 text-sky-300' : 'bg-purple-500/15 text-purple-300',
                        )}
                      >
                        {sameTeam ? 'Mismo equipo' : 'Cara a cara'}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      {players.map(({ player, match: own }) => (
                        <span
                          key={player.id}
                          className={cn(
                            'flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2 text-[11px] font-medium',
                            own.won ? 'bg-emerald-500/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200',
                          )}
                          title={`${player.name}: ${own.won ? 'victoria' : 'derrota'} · ${own.kills}/${own.deaths}/${own.assists}${own.eloDelta !== null ? ` · ${formatEloDelta(own.eloDelta)} elo` : ''}`}
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black/30 font-mono text-[8px] font-black">
                            {own.won ? 'W' : 'L'}
                          </span>
                          {player.name}
                          <span className="font-mono text-[10px] opacity-70">
                            {own.kills}-{own.deaths}
                          </span>
                        </span>
                      ))}
                    </span>
                  </div>

                  {sameTeam && (
                    <span className={cn('shrink-0 font-mono text-[13px] font-black tabular-nums', first.won ? 'text-emerald-400' : 'text-rose-400')}>
                      {first.teamScore}-{first.enemyScore}
                    </span>
                  )}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
