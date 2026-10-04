import { Skull } from 'lucide-react'
import { type NelsonEntry } from '@/types'
import { Stagger, StaggerItem } from '@/components/motion/reveal'
import { cn } from '@/lib/utils'
import { Spotlight } from '@/components/amicro/spotlight'
import { BlurText } from '@/components/amicro/blur-text'

export function NelsonLeague({
  entries,
  subtitle = 'Ranking por Nelson Points',
  archived = false,
}: {
  entries: NelsonEntry[]
  subtitle?: string
  archived?: boolean
}) {
  const leader = entries[0]
  const hasNelson = !!leader && leader.points > 0
  const maxPoints = Math.max(...entries.map((e) => e.points), 1)
  // Solo los que sumaron: una lista de ceros no aporta nada.
  const visible = entries.filter((e) => e.points > 0)

  return (
    <Spotlight as="section" glowColor="rgba(255, 92, 141, 0.08)" className="overflow-hidden rounded-xl border border-border bg-card p-0">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-brand">
          <Skull className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">
            <BlurText text="Nelson League" />
          </h2>
          <span className="text-[11px] text-muted-foreground">{subtitle}</span>
        </div>
      </header>

      {!hasNelson ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
          {archived
            ? 'Nadie sumó Nelsons en esta temporada.'
            : 'Nadie es Nelson todavía esta temporada. La próxima votación define al primero.'}
        </p>
      ) : (
        <Stagger className="flex flex-col" stagger={0.04}>
          {visible.map((entry, i) => {
            const isSuperNelson = i === 0
            return (
              <StaggerItem
                key={entry.id}
                className={cn(
                  'flex items-center gap-3 border-b border-border px-4 py-2 last:border-b-0',
                  isSuperNelson && 'bg-primary/10',
                )}
              >
                <span
                  className={cn(
                    'w-5 text-center font-mono text-[13px] font-bold',
                    isSuperNelson ? 'text-brand' : 'text-muted-foreground',
                  )}
                >
                  {entry.rank}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="flex items-center gap-2 truncate text-[14px] font-semibold text-foreground">
                    {entry.name}
                    {isSuperNelson && (
                      <span className="flex items-center gap-1 rounded-sm bg-primary px-1.5 py-0.5 font-heading text-[9px] font-bold uppercase tracking-widest text-primary-foreground">
                        <Skull className="h-3 w-3" aria-hidden="true" />
                        Supernelson
                      </span>
                    )}
                  </span>
                  <span className="h-1 w-full overflow-hidden rounded-full bg-muted/50" aria-hidden="true">
                    <span
                      className="block h-full rounded-full bg-primary/80"
                      style={{ width: `${(entry.points / maxPoints) * 100}%` }}
                    />
                  </span>
                </div>
                <span className="w-10 text-right font-mono text-[13px] font-bold text-foreground">
                  {entry.points.toLocaleString()}
                </span>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}
    </Spotlight>
  )
}
