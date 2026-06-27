import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { Match, CSMap } from '@/lib/mockData'
import { formatDate } from '@/lib/mockData'
import { getTeamColorClass, cn } from '@/lib/utils'

const mapColors: Record<CSMap, string> = {
  Mirage: '#c2853b',
  Dust2: '#c2a83b',
  Inferno: '#c2453b',
  Nuke: '#3b8ac2',
  Ancient: '#3b8a5a',
  Anubis: '#8c7657',
}

export function RecentMatches({ matches }: { matches: Match[] }) {
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-base font-bold uppercase tracking-widest text-foreground">
          Últimas partidas
        </h2>
        <Link
          href="/matches"
          className="flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
        >
          Ver todas <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>
      <ul className="flex flex-col">
        {matches.map((match) => {
          const isCtWinner = match.winnerTeam 
            ? (match.winnerTeam === 'CT' || match.winnerTeam === match.teamAName)
            : (match.ctScore > match.tScore)
          const winnerLabel = isCtWinner
            ? (match.teamAName || 'CT')
            : (match.teamBName || 'T')
          return (
            <li key={match.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/matches/${match.id}`}
                className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-accent/60"
              >
                <div
                  className="h-9 w-16 shrink-0 overflow-hidden rounded-sm bg-cover bg-center shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]"
                  style={{ 
                    backgroundImage: `url('/maps/${match.map.toLowerCase().replace(/\s+/g, '')}.webp')`,
                    backgroundColor: mapColors[match.map] || '#1e293b'
                  }}
                  title={match.map}
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-mono text-[15px] font-bold text-foreground">
                    {match.ctScore}-{match.tScore}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatDate(match.date)} · {match.durationMin ? `${match.durationMin} rondas` : 'Sin info'}
                  </span>
                </div>
                <span className={cn("rounded-sm border px-2 py-1 font-mono text-[11px] font-bold", getTeamColorClass(winnerLabel))}>
                  {winnerLabel} WINS
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
