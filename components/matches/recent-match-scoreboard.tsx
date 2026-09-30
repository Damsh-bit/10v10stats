'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import type { Match, MatchPlayer, Player } from '@/types'
import { formatDate, mapImageUrl } from '@/lib/format'
import { cn } from '@/lib/utils'

type TeamProps = {
  players: MatchPlayer[]
  names: Map<string, string>
  teamName: string
  score: number
  won: boolean
  accentClass: string
  borderClass: string
  delay: number
}

function ScoreboardTeam({ players, names, teamName, score, won, accentClass, borderClass, delay }: TeamProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn('flex flex-col overflow-hidden rounded-xl border bg-card', borderClass)}
    >
      <div className={cn('flex items-center justify-between px-3 py-2', accentClass)}>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-white drop-shadow">{teamName}</span>
          {won && (
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white">
              Win
            </span>
          )}
        </div>
        <span className="font-mono text-2xl font-black text-white drop-shadow">{score}</span>
      </div>

      <div className="grid grid-cols-[1fr_repeat(5,_auto)] items-center gap-x-1.5 border-b border-border/60 bg-black/30 px-2 py-1 sm:gap-x-3 sm:px-3">
        {['Player', 'K', 'D', 'A', 'HS%', 'DMG'].map((label, i) => (
          <span
            key={label}
            className={cn(
              'text-[9px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-[10px]',
              i === 0 ? '' : i === 5 ? 'w-10 text-right sm:w-12' : i === 4 ? 'w-7 text-center sm:w-8' : 'w-5 text-center sm:w-6',
            )}
          >
            {label}
          </span>
        ))}
      </div>

      <ol>
        {players.map((p, i) => {
          const name = names.get(p.playerId) ?? p.playerId.slice(0, 8)
          const isTopFragger = i === 0
          return (
            <li key={p.playerId}>
              <Link
                href={`/players/${p.playerId}`}
                className={cn(
                  'grid grid-cols-[1fr_repeat(5,_auto)] items-center gap-x-1.5 px-2 py-1.5 transition-colors hover:bg-accent/50 sm:gap-x-3 sm:px-3',
                  i % 2 === 0 ? 'bg-white/[0.02]' : 'bg-black/20',
                  isTopFragger && 'border-l-2 border-yellow-400',
                )}
              >
                <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
                  <span className="w-3 shrink-0 font-mono text-[9px] text-muted-foreground/60 sm:w-4 sm:text-[10px]">{i + 1}.</span>
                  <span className={cn('truncate font-mono text-[11px] font-semibold sm:text-[12px]', isTopFragger ? 'text-yellow-300' : 'text-foreground')}>
                    {name}
                  </span>
                  {p.mvps > 0 && <span className="shrink-0 text-[9px]" title="MVP de la partida">👑</span>}
                </div>
                <span className="w-5 text-center font-mono text-[11px] font-bold text-green-400 sm:w-6 sm:text-[12px]">{p.kills}</span>
                <span className="w-5 text-center font-mono text-[11px] text-red-400 sm:w-6 sm:text-[12px]">{p.deaths}</span>
                <span className="w-5 text-center font-mono text-[11px] text-blue-300 sm:w-6 sm:text-[12px]">{p.assists}</span>
                <span className="w-7 text-center font-mono text-[11px] text-yellow-500/80 sm:w-8 sm:text-[12px]">{p.hsPct}%</span>
                <span className="w-10 text-right font-mono text-[10px] text-muted-foreground sm:w-12 sm:text-[11px]">{p.damage.toLocaleString()}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </motion.div>
  )
}

/** Tabulador de la última partida jugada, separado por equipo. */
export function RecentMatchScoreboard({ match, players }: { match: Match; players: Player[] }) {
  const names = new Map(players.map((p) => [p.id, p.name]))
  const teams = [...new Set(match.players.map((p) => p.team))].sort()
  const teamA = match.teamAName && teams.includes(match.teamAName) ? match.teamAName : teams[0] ?? 'CT'
  const teamB = teams.find((t) => t !== teamA) ?? 'T'

  const byDamage = (a: MatchPlayer, b: MatchPlayer) => b.damage - a.damage
  const playersA = match.players.filter((p) => p.team === teamA).sort(byDamage)
  const playersB = match.players.filter((p) => p.team === teamB).sort(byDamage)

  const isDraw = match.ctScore === match.tScore
  const wonA = !isDraw && match.ctScore > match.tScore

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-heading text-sm font-bold uppercase tracking-[0.2em] text-foreground">▶ Partida reciente</h2>
        <Link
          href={`/matches/${match.id}`}
          className="group flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-0.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <span
            className="h-3 w-5 rounded-sm bg-cover bg-center"
            style={{ backgroundImage: `url('${mapImageUrl(match.map)}')` }}
            aria-hidden="true"
          />
          {match.map} · {formatDate(match.date)}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ScoreboardTeam
          players={playersA}
          names={names}
          teamName={teamA}
          score={match.ctScore}
          won={wonA}
          accentClass="bg-gradient-to-r from-sky-700 to-sky-600"
          borderClass="border-sky-700/50"
          delay={0}
        />
        <ScoreboardTeam
          players={playersB}
          names={names}
          teamName={teamB}
          score={match.tScore}
          won={!isDraw && !wonA}
          accentClass="bg-gradient-to-r from-orange-700 to-orange-600"
          borderClass="border-orange-700/50"
          delay={0.1}
        />
      </div>
    </section>
  )
}
