import { Swords, Users, Crosshair, Flame, Skull } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Stat = {
  label: string
  value: string
  sub: string
  icon: LucideIcon
}

export function DashboardStats({ stats }: { stats: Stat[] }) {
  return (
    <div className={`grid grid-cols-2 gap-3 lg:grid-cols-${stats.length}`}>
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
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {s.sub}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const dashboardIcons = { Swords, Users, Crosshair, Flame, Skull }
