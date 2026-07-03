import Link from 'next/link'
import { Swords, Users, Crosshair, Flame, Skull, ExternalLink } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Stat = {
  label: string
  value: string
  sub: string
  icon: LucideIcon
  matchId?: string
}

export function DashboardStats({ stats, forceCols }: { stats: Stat[], forceCols?: number }) {
  const gridClass = forceCols 
    ? `grid grid-cols-2 gap-3 lg:grid-cols-${forceCols}`
    : `grid grid-cols-2 gap-3 lg:grid-cols-${stats.length}`
    
  return (
    <div className={gridClass}>
      {stats.map((s) => {
        const Icon = s.icon
        return (
          <div
            key={s.label}
            className="relative overflow-hidden rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {s.label}
              </span>
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
            </div>
            <div className="mt-2 font-mono text-2xl font-bold text-foreground">
              {s.value}
            </div>
            <div className="mt-0.5 flex items-center justify-between">
              <div className="text-[11px] text-muted-foreground">
                {s.sub}
              </div>
              {s.matchId && (
                <Link 
                  href={`/matches/${s.matchId}`}
                  className="flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary transition-colors hover:bg-primary hover:text-white"
                  title="Ver partida del récord"
                >
                  Ver <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const dashboardIcons = { Swords, Users, Crosshair, Flame, Skull }
