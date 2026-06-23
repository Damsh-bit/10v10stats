'use client'

import { useRouter } from 'next/navigation'
import type { PlayerStats } from '@/lib/mockData'
import { PlayerAvatar, BadgePill } from '@/components/strike-ui'
import { cn } from '@/lib/utils'

export function LeaderboardTable({ stats }: { stats: PlayerStats[] }) {
  const router = useRouter()
  return (
    <div className="rounded-lg border border-border bg-card">
      <table className="w-full border-collapse text-left">
        <thead className="sticky top-14 z-20 bg-muted">
          <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <Th className="w-12 text-center">#</Th>
            <Th>Player</Th>
            <Th className="text-center">W</Th>
            <Th className="text-center">L</Th>
            <Th className="text-right">Kills</Th>
            <Th className="text-right">Deaths</Th>
            <Th className="text-right">Assists</Th>
            <Th className="text-right">Damage</Th>
            <Th className="text-right">KDA</Th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr
              key={s.player.id}
              onClick={() => router.push(`/players/${s.player.id}`)}
              className="cursor-pointer border-t border-border transition-colors hover:bg-accent/60"
            >
              <td className="px-3 py-3 text-center">
                <span
                  className={cn(
                    'font-mono text-[13px] font-bold',
                    i === 0 ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {i + 1}
                </span>
              </td>
              <td className="px-3 py-3">
                <div className="flex items-center gap-3">
                  <PlayerAvatar player={s.player} size={36} />
                  <div className="flex flex-col gap-1">
                    <span className="text-[15px] font-semibold leading-none text-foreground">
                      {s.player.name}
                    </span>
                    <BadgePill>{s.player.badge}</BadgePill>
                  </div>
                </div>
              </td>
              <Td className="text-center text-success">{s.wins}</Td>
              <Td className="text-center text-destructive">{s.losses}</Td>
              <Td className="text-right">{s.kills}</Td>
              <Td className="text-right">{s.deaths}</Td>
              <Td className="text-right">{s.assists}</Td>
              <Td className="text-right">{s.damage.toLocaleString()}</Td>
              <td className="px-3 py-3 text-right">
                <span className="font-mono text-[13px] font-bold text-primary">
                  {s.kda.toFixed(2)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Th({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th className={cn('px-3 py-2.5 font-medium', className)}>{children}</th>
  )
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td className={cn('px-3 py-3 font-mono text-[13px] text-foreground', className)}>
      {children}
    </td>
  )
}
