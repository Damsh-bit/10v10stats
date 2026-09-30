'use client'

import Link from 'next/link'
import { Crosshair, Flame, HandHelping, ShieldCheck, Skull, Snail, Medal } from 'lucide-react'
import type { MatchRecordKey, MatchRecords } from '@/lib/season-stats'
import { Stagger, StaggerItem } from '@/components/motion/reveal'

const RECORD_ROWS: { key: MatchRecordKey; label: string; icon: React.ElementType; color: string; format?: (v: number) => string }[] = [
  { key: 'maxKills', label: 'Más kills', icon: Crosshair, color: 'text-emerald-400' },
  { key: 'maxDamage', label: 'Más daño', icon: Flame, color: 'text-orange-400', format: (v) => v.toLocaleString('es-AR') },
  { key: 'maxAssists', label: 'Más asistencias', icon: HandHelping, color: 'text-purple-400' },
  { key: 'minDeaths', label: 'Menos muertes', icon: ShieldCheck, color: 'text-sky-400' },
  { key: 'maxDeaths', label: 'Más muertes', icon: Skull, color: 'text-rose-400' },
  { key: 'minDamage', label: 'Menor daño', icon: Snail, color: 'text-slate-400', format: (v) => v.toLocaleString('es-AR') },
]

/**
 * Récords de una partida dentro de la temporada. Si la temporada todavía no
 * tiene récords y se pasa `previous`, muestra los de la anterior como "a batir".
 */
export function SeasonRecords({
  records: seasonRecords,
  seasonName,
  previous,
}: {
  records: MatchRecords
  seasonName: string
  previous?: { records: MatchRecords; seasonName: string } | null
}) {
  const hasOwn = RECORD_ROWS.some((row) => seasonRecords[row.key])
  const showingPrevious = !hasOwn && !!previous && RECORD_ROWS.some((row) => previous.records[row.key])
  const records = showingPrevious && previous ? previous.records : seasonRecords
  const hasAny = hasOwn || showingPrevious

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
          <Medal className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">
            {showingPrevious ? 'Récords a batir' : 'Récords'}
          </h2>
          <p className="text-[11px] text-muted-foreground">
            {showingPrevious && previous
              ? `Los de la ${previous.seasonName}: la ${seasonName} todavía no marcó ninguno`
              : `Mejores (y peores) partidas de la ${seasonName}`}
          </p>
        </div>
      </header>

      {!hasAny ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">
          Sin récords todavía. La primera partida de la temporada los estrena todos.
        </p>
      ) : (
        <Stagger className="flex flex-col" stagger={0.05}>
          {RECORD_ROWS.map(({ key, label, icon: Icon, color, format }) => {
            const record = records[key]
            if (!record) return null
            return (
              <StaggerItem key={key} className="border-b border-border last:border-b-0">
                <Link
                  href={`/matches/${record.matchId}`}
                  className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50"
                  title={`Ver la partida en ${record.map}`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} aria-hidden="true" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
                    <span className="truncate text-[13px] font-semibold text-foreground group-hover:text-white">
                      {record.playerName}
                      <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">en {record.map}</span>
                    </span>
                  </div>
                  <span className={`font-mono text-lg font-bold tabular-nums ${color} ${showingPrevious ? 'opacity-70' : ''}`}>
                    {format ? format(record.value) : record.value}
                  </span>
                </Link>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}
    </section>
  )
}
