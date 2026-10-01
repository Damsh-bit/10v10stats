import { ExternalLink } from 'lucide-react'
import { timeAgo, type FaceitMatch } from '@/lib/faceit'
import { faceitMatchUrl, formatEloDelta } from '@/lib/faceit-format'
import { mapImageUrl } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Últimas partidas de FACEIT de un jugador; cada fila abre la sala en FACEIT. */
export function FaceitMatchList({ matches, now = Date.now() }: { matches: FaceitMatch[]; now?: number }) {
  if (matches.length === 0) {
    return <p className="py-6 text-center text-[12px] text-muted-foreground">Sin partidas recientes en FACEIT.</p>
  }

  return (
    <ul className="flex flex-col divide-y divide-border/60">
      {matches.map((m) => (
        <li key={m.id}>
          <a
            href={faceitMatchUrl(m.id)}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-2.5 py-2 transition-colors hover:bg-accent/30 sm:px-1"
          >
            <span className="relative h-9 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mapImageUrl(m.map)} alt="" loading="lazy" className="h-full w-full object-cover opacity-80" />
              <span
                className={cn(
                  'absolute bottom-0 left-0 rounded-tr px-1 font-mono text-[9px] font-black',
                  m.won ? 'bg-emerald-500 text-emerald-950' : 'bg-rose-500 text-rose-950',
                )}
              >
                {m.won ? 'W' : 'L'}
              </span>
            </span>

            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-foreground">
                <span className="font-mono tabular-nums">
                  {m.teamScore}-{m.enemyScore}
                </span>
                <span className="truncate text-muted-foreground">{m.map}</span>
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">{timeAgo(m.playedAt, now)}</span>
            </div>

            <div className="flex shrink-0 flex-col items-end font-mono text-[11px] leading-tight">
              <span className="text-foreground">
                {m.kills}/{m.deaths}/{m.assists}
              </span>
              <span className={cn('text-[10px]', m.kd >= 1 ? 'text-emerald-400/90' : 'text-rose-400/90')}>{m.kd.toFixed(2)} K/D</span>
            </div>

            <span className="hidden w-14 shrink-0 text-right font-mono text-[11px] text-muted-foreground sm:block">
              {Math.round(m.adr)} ADR
            </span>

            <span
              className={cn(
                'w-11 shrink-0 text-right font-mono text-[12px] font-bold tabular-nums',
                m.eloDelta === null ? 'text-muted-foreground' : m.eloDelta > 0 ? 'text-emerald-400' : m.eloDelta < 0 ? 'text-rose-400' : 'text-muted-foreground',
              )}
              title="Elo ganado o perdido"
            >
              {m.eloDelta === null ? '—' : formatEloDelta(m.eloDelta)}
            </span>

            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-orange-300" aria-hidden="true" />
          </a>
        </li>
      ))}
    </ul>
  )
}
