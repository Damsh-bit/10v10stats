import Link from 'next/link'
import type { MatchPlayer, Player } from '@/types'

import { PlayerAvatar } from '@/components/shared/strike-ui'
import { cn } from '@/lib/utils'
import AnimatedNumber from '@/components/ui/animated-number'

export function Scoreboard({
  team,
  teamLabel,
  score,
  entries,
  isWinner,
  players,
}: {
  team: 'CT' | 'T'
  teamLabel?: string
  score: number
  entries: MatchPlayer[]
  isWinner: boolean
  players: Player[]
}) {
  const sorted = [...entries].sort((a, b) => b.damage - a.damage)
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card',
        isWinner && 'border-l-2 border-l-primary',
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-2.5">
        <span className="text-[14px] font-bold text-foreground">
          {teamLabel || (team === 'CT' ? 'Counter-Terrorists' : 'Terrorists')}
        </span>
        <span
          className={cn(
            'font-mono text-lg font-bold',
            isWinner ? 'text-brand' : 'text-muted-foreground',
          )}
        >
          <AnimatedNumber value={score} className="font-mono text-lg font-bold" />
        </span>
      </div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-2 py-2 font-medium sm:px-3">Jugador</th>
            <th className="px-1.5 py-2 text-right font-medium sm:px-2">K</th>
            <th className="px-1.5 py-2 text-right font-medium sm:px-2">D</th>
            <th className="px-1.5 py-2 text-right font-medium sm:px-2">A</th>
            <th className="px-1.5 py-2 text-right font-medium sm:px-2">HS%</th>
            <th className="px-1.5 py-2 pr-2 text-right font-medium sm:px-2 sm:pr-3">Dmg</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => {
            const fallback = { id: e.playerId, name: 'Sin info', badge: 'Sin info', avatarColor: '#64748b', nelsons: 0 }
            const player = e.guest
              ? { ...fallback, name: 'Invitado' }
              : players.find((p) => p.id === e.playerId) ?? fallback
            const kills = e.kills ?? 0
            const deaths = e.deaths ?? 0
            const assists = e.assists ?? 0
            const hsPct = e.hsPct ?? 0
            const damage = e.damage ?? 0
            
            return (
              <tr key={e.playerId} className="border-t border-border">
                <td className="w-full max-w-0 px-2 py-2 sm:px-3 sm:py-2.5">
                  {e.guest ? (
                    <div className="flex min-w-0 items-center gap-2 text-muted-foreground" title="Participación de invitado: no suma estadísticas">
                      <PlayerAvatar player={player} size={24} />
                      <span className="truncate text-[13px] italic sm:text-[14px]">{player.name}</span>
                    </div>
                  ) : (
                    <Link href={`/players/${e.playerId}`} className="flex min-w-0 items-center gap-2 transition-colors hover:text-brand">
                      <PlayerAvatar player={player} size={24} />
                      <span className="flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-foreground sm:text-[14px]">
                        <span className="truncate">{player.name}</span>
                        {e.mvps > 0 && (
                          <span title="MVP de la partida" className="shrink-0 text-[12px] text-yellow-500">👑</span>
                        )}
                      </span>
                    </Link>
                  )}
                </td>
                <Cell>{kills}</Cell>
                <Cell>{deaths}</Cell>
                <Cell>{assists}</Cell>
                <Cell className="text-yellow-500/80">{Math.round(hsPct)}%</Cell>
                <Cell>{damage}</Cell>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function Cell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td
      className={cn(
        'px-1.5 py-2 text-right font-mono text-[12px] text-foreground last:pr-2 sm:px-2 sm:py-2.5 sm:text-[13px] sm:last:pr-3',
        className,
      )}
    >
      {children}
    </td>
  )
}
