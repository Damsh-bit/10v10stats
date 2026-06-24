import { cn } from '@/lib/utils'
import type { Player } from '@/lib/mockData'

export function PlayerAvatar({
  player,
  size = 32,
}: {
  player: Player
  size?: number
}) {
  const initials = player.name.slice(0, 2).toUpperCase()
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-mono font-bold text-background"
      style={{
        width: size,
        height: size,
        backgroundColor: player.avatarColor,
        fontSize: size * 0.4,
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  )
}

export function BadgePill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex w-fit items-center rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
      {children}
    </span>
  )
}

export function ResultChip({ won }: { won: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-bold',
        won
          ? 'bg-success/15 text-success'
          : 'bg-destructive/15 text-destructive',
      )}
    >
      {won ? 'WIN' : 'LOSS'}
    </span>
  )
}
