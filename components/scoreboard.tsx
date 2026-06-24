import Link from 'next/link'
import type { MatchPlayer, Player } from '@/lib/mockData'
import { PlayerAvatar } from '@/components/strike-ui'
import { cn } from '@/lib/utils'

export function Scoreboard({
  team,
  score,
  entries,
  isWinner,
  players,
}: {
  team: 'CT' | 'T'
  score: number
  entries: MatchPlayer[]
  isWinner: boolean
  players: Player[]
}) {
  const sorted = [...entries].sort((a, b) => b.kills - a.kills)
  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-border bg-card',
        isWinner && 'border-l-2 border-l-primary',
      )}
    >
      <div className="flex items-center justify-between border-b border-border bg-muted px-3 py-2.5">
        <span className="text-[14px] font-bold text-foreground">
          {team === 'CT' ? 'Counter-Terrorists' : 'Terrorists'}
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
            <th className="px-2 py-2 text-right font-medium">ADR</th>
            <th className="hidden px-2 py-2 text-right font-medium sm:table-cell">
              Dmg
            </th>
            <th className="px-2 py-2 text-right font-medium">HS%</th>
            <th className="px-2 py-2 text-center font-medium">MVP</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e) => {
            const player = players.find((p) => p.id === e.playerId)!
            return (
              <tr key={e.playerId} className="border-t border-border">
                <td className="px-3 py-2.5">
                  <Link
                    href={`/players/${e.playerId}`}
                    className="flex items-center gap-2 transition-colors hover:text-primary"
                  >
                    <PlayerAvatar player={player} size={26} />
                    <span className="text-[14px] font-medium text-foreground">
                      {player.name}
                    </span>
                  </Link>
                </td>
                <Cell>{e.kills}</Cell>
                <Cell>{e.deaths}</Cell>
                <Cell>{e.assists}</Cell>
                <Cell>{e.adr}</Cell>
                <Cell className="hidden sm:table-cell">{e.damage}</Cell>
                <Cell>{e.hsPct}</Cell>
                <td className="px-2 py-2.5 text-center">
                  {e.mvps > 0 ? (
                    <span className="font-mono text-[12px] font-bold text-primary">
                      ★{e.mvps}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
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
