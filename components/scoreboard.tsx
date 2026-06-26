import Link from 'next/link'
import type { MatchPlayer, Player } from '@/lib/mockData'
import { PlayerAvatar } from '@/components/strike-ui'
import { cn } from '@/lib/utils'

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
        'overflow-hidden rounded-lg border border-border bg-card',
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
            isWinner ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {score}
        </span>
      </div>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <th className="px-3 py-2 font-medium">Player</th>
            <th className="px-2 py-2 text-right font-medium">K</th>
            <th className="px-2 py-2 text-right font-medium">D</th>
            <th className="px-2 py-2 text-right font-medium">A</th>
            <th className="px-2 py-2 text-right font-medium">HS%</th>
            <th className="px-2 py-2 text-right font-medium">Dmg</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => {
            const player = players.find((p) => p.id === e.playerId) ?? {
              id: e.playerId,
              name: 'Sin info',
              badge: 'Sin info',
              avatarColor: '#64748b',
            }
            const kills = e.kills ?? 0
            const deaths = e.deaths ?? 0
            const assists = e.assists ?? 0
            const hsPct = e.hsPct ?? 0
            const damage = e.damage ?? 0
            
            return (
              <tr key={e.playerId} className="border-t border-border">
                <td className="px-3 py-2.5">
                  <Link
                    href={`/players/${e.playerId}`}
                    className="flex items-center gap-2 transition-colors hover:text-primary"
                  >
                    <PlayerAvatar player={player} size={26} />
                    <span className="text-[14px] font-medium text-foreground flex items-center gap-1.5">
                      {player.name}
                      {e.mvps > 0 && (
                        <span title="Match MVP" className="text-yellow-500 text-[12px]">👑</span>
                      )}
                    </span>
                  </Link>
                </td>
                <Cell>{kills}</Cell>
                <Cell>{deaths}</Cell>
                <Cell>{assists}</Cell>
                <Cell className="text-yellow-500/80">{hsPct}%</Cell>
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
        'px-2 py-2.5 text-right font-mono text-[13px] text-foreground',
        className,
      )}
    >
      {children}
    </td>
  )
}
