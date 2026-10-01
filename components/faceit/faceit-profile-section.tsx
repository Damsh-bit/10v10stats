import Link from 'next/link'
import { ExternalLink, Gauge, Mountain } from 'lucide-react'
import { toEloChartPoints, type FaceitProfile, type FaceitSummary } from '@/lib/faceit'
import { EloDelta, FaceitForm, FaceitLevel } from '@/components/faceit/faceit-bits'
import { FaceitEloChart } from '@/components/faceit/faceit-charts'
import { FaceitMatchList } from '@/components/faceit/faceit-matches'
import { cn } from '@/lib/utils'

/** Chip para el encabezado del perfil: nivel y elo, lleva a la sección. */
export function FaceitHeaderChip({ profile }: { profile: FaceitProfile }) {
  return (
    <a
      href="#faceit"
      className="flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 py-0.5 pl-0.5 pr-2.5 text-[10px] font-bold uppercase tracking-wider text-orange-200 transition-colors hover:bg-orange-500/20"
    >
      <FaceitLevel level={profile.level} size={18} />
      FACEIT · <span className="font-mono">{profile.elo}</span>
    </a>
  )
}

export function FaceitProfileSection({
  profile,
  summary,
  now = Date.now(),
}: {
  profile: FaceitProfile | null
  summary: FaceitSummary | null
  now?: number
}) {
  if (!profile || !summary) {
    return (
      <section id="faceit" className="scroll-mt-20 rounded-xl border border-border bg-card/80 px-4 py-5 text-[13px] text-muted-foreground">
        No se pudieron traer los datos de FACEIT ahora. Se reintenta solo en unos minutos.
      </section>
    )
  }

  const points = toEloChartPoints(summary)
  const tiles = [
    { label: 'Win rate', value: `${summary.winRate}%`, tone: summary.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400' },
    { label: 'K/D', value: summary.kd.toFixed(2), tone: summary.kd >= 1 ? 'text-emerald-400' : 'text-rose-400' },
    { label: 'ADR', value: Math.round(summary.adr).toString() },
    { label: 'HS', value: `${summary.hsPct}%` },
    { label: '7 días', value: summary.matchesLast7Days.toString(), title: 'Partidas en los últimos 7 días' },
  ]

  return (
    <section id="faceit" className="scroll-mt-20 overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 text-orange-400">
            <Gauge className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col">
            <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">FACEIT</h2>
            <a
              href={profile.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 truncate font-mono text-[11px] text-muted-foreground transition-colors hover:text-orange-300"
            >
              {profile.nickname}
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <FaceitLevel level={profile.level} size={44} />
          <div className="flex flex-col items-end leading-none">
            <span className="font-mono text-2xl font-black tabular-nums text-foreground">{profile.elo}</span>
            {summary.trendMatches > 0 && (
              <span className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                <EloDelta value={summary.eloTrend} className="text-[11px]" /> últimas {summary.trendMatches}
              </span>
            )}
          </div>
        </div>
      </header>

      {summary.nextLevel && (
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-2">
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Nv {profile.level}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
            <span className="block h-full rounded-full bg-orange-400" style={{ width: `${Math.max(4, summary.nextLevel.progress * 100)}%` }} />
          </span>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            faltan <span className="font-mono font-bold text-foreground">{summary.nextLevel.eloNeeded}</span> para nivel {summary.nextLevel.level}
          </span>
        </div>
      )}

      <div className="grid gap-x-5 gap-y-4 p-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Forma</span>
              <FaceitForm results={summary.lastFive} size="md" />
            </div>
            {summary.streak && summary.streak.count >= 2 && (
              <span className={cn('text-[11px] font-semibold', summary.streak.won ? 'text-emerald-300' : 'text-rose-300')}>
                {summary.streak.won ? '🔥' : '🧊'} {summary.streak.count} {summary.streak.won ? 'victorias' : 'derrotas'} seguidas
              </span>
            )}
          </div>

          <div className="grid grid-cols-5 gap-1.5">
            {tiles.map((t) => (
              <div key={t.label} className="flex min-w-0 flex-col rounded-lg border border-border/60 bg-background/40 px-2 py-1.5" title={t.title ?? `Últimas ${summary.sample} partidas`}>
                <span className="truncate text-[9px] uppercase tracking-wider text-muted-foreground">{t.label}</span>
                <span className={cn('truncate font-mono text-[15px] font-bold', t.tone ?? 'text-foreground')}>{t.value}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Elo · últimas {points.length} partidas
              </h3>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground" title="Elo más alto en estas partidas">
                <Mountain className="h-3 w-3" aria-hidden="true" /> pico <span className="font-mono text-foreground">{summary.peakElo}</span>
              </span>
            </div>
            <FaceitEloChart points={points} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col">
          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Historial FACEIT</h3>
          <FaceitMatchList matches={profile.matches.slice(0, 8)} now={now} />
          <Link href="/faceit" className="mt-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
            Ver la ladder de FACEIT →
          </Link>
        </div>
      </div>
    </section>
  )
}
