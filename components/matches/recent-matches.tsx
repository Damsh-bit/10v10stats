'use client'

import Link from 'next/link'
import { ArrowRight, History } from 'lucide-react'
import type { Match } from '@/types'
import { formatDate, mapImageUrl } from '@/lib/format'
import { getTeamColorClass, cn } from '@/lib/utils'
import { Stagger, StaggerItem } from '@/components/motion/reveal'
import { BlurText } from '@/components/amicro/blur-text'

export function RecentMatches({
  matches,
  href = '/matches',
  emptyText = 'Todavía no hay partidas en la temporada.',
}: {
  matches: Match[]
  href?: string
  emptyText?: string
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300">
            <History className="h-4 w-4" aria-hidden="true" />
          </span>
          <h2 className="font-heading text-base font-bold uppercase tracking-widest text-foreground"><BlurText text="Últimas partidas" /></h2>
        </div>
        <Link href={href} className="group flex items-center gap-1 text-[12px] font-medium text-brand hover:underline">
          Ver todas <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </header>

      {matches.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-muted-foreground">{emptyText}</p>
      ) : (
        <Stagger className="flex flex-col" stagger={0.05}>
          {matches.map((match) => {
            const isDraw = match.ctScore === match.tScore
            const isTeamAWinner = match.ctScore > match.tScore
            const winnerLabel = isDraw ? 'Empate' : isTeamAWinner ? match.teamAName || 'CT' : match.teamBName || 'T'
            return (
              <StaggerItem key={match.id} className="border-b border-border last:border-b-0">
                <Link href={`/matches/${match.id}`} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/50">
                  <div
                    className="h-9 w-16 shrink-0 overflow-hidden rounded-md bg-slate-800 bg-cover bg-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] transition-transform group-hover:scale-105"
                    style={{ backgroundImage: `url('${mapImageUrl(match.map)}')` }}
                    title={match.map}
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-mono text-[15px] font-bold text-foreground">
                      {match.ctScore}-{match.tScore}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {match.map} · {formatDate(match.date)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'max-w-[45%] truncate rounded-sm border px-2 py-1 font-mono text-[10px] font-bold uppercase',
                      isDraw ? 'border-muted-foreground/30 bg-muted/20 text-muted-foreground' : getTeamColorClass(winnerLabel),
                    )}
                  >
                    {isDraw ? 'Empate' : `${winnerLabel.replace(/^Equipo\s+/i, '')} gana`}
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
