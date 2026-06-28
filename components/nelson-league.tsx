import { ChevronUp, ChevronDown, Equal, Skull } from 'lucide-react'
import { type NelsonEntry } from '@/lib/mockData'
import { cn } from '@/lib/utils'

function TrendIcon({ trend }: { trend: NelsonEntry['trend'] }) {
  if (trend === 'up')
    return <ChevronUp className="h-3.5 w-3.5 text-success" aria-label="sube" />
  if (trend === 'down')
    return (
      <ChevronDown className="h-3.5 w-3.5 text-destructive" aria-label="baja" />
    )
  return <Equal className="h-3.5 w-3.5 text-muted-foreground" aria-label="igual" />
}

export function NelsonLeague({ entries }: { entries: NelsonEntry[] }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex flex-col">
          <h2 className="font-heading text-base font-bold uppercase tracking-widest text-foreground">
            Nelson League
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Ladder de 10 · ranking por Nelson Points
          </span>
        </div>
        <Skull className="h-5 w-5 text-primary" aria-hidden="true" />
      </header>

      <ol className="flex flex-col">
        {entries.map((entry, i) => {
          const isSuperNelson = i === 0
          return (
            <li
              key={entry.rank}
              className={cn(
                'flex items-center gap-3 border-b border-border px-4 py-2.5 last:border-b-0',
                isSuperNelson && 'bg-primary/10',
              )}
            >
              <span
                className={cn(
                  'w-5 text-center font-mono text-[13px] font-bold',
                  isSuperNelson ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {entry.rank}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-semibold text-foreground">
                  {entry.name}
                </span>
                {isSuperNelson && (
                  <span className="flex w-fit items-center gap-1 rounded-sm bg-primary px-1.5 py-0.5 font-heading text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                    <Skull className="h-3 w-3" aria-hidden="true" />
                    Supernelson
                  </span>
                )}
              </div>
              <TrendIcon trend={entry.trend} />
              <span className="w-16 text-right font-mono text-[13px] font-bold text-foreground">
                {entry.points.toLocaleString()}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
