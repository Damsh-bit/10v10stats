import Image from 'next/image'
import { cn } from '@/lib/utils'
import type { Player } from '@/types'


export function PlayerAvatar({
  player,
  size = 32,
}: {
  player: Player
  size?: number
}) {
  const initials = (player.name || '??').slice(0, 2).toUpperCase()
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-mono font-bold text-background relative"
      style={{
        width: size,
        height: size,
        backgroundColor: player.avatarColor || '#64748b',
        fontSize: size * 0.4,
      }}
      aria-hidden="true"
    >
      {player.photoUrl ? (
        <Image
          src={player.photoUrl}
          alt={player.name}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
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

export function ResultChip({
  won,
  draw,
  playerScore,
  opponentScore,
}: {
  won: boolean
  draw?: boolean
  playerScore?: number
  opponentScore?: number
}) {
  const hasScore = playerScore !== undefined && opponentScore !== undefined
  const label = hasScore
    ? draw
      ? 'Empate'
      : won
        ? 'Victoria'
        : 'Derrota'
    : draw
      ? 'DRAW'
      : won
        ? 'WIN'
        : 'LOSS'
  const scoreSuffix = hasScore ? ` ${playerScore}-${opponentScore}` : ''

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[11px] font-bold',
        draw
          ? 'bg-muted/40 text-muted-foreground'
          : won
            ? 'bg-success/15 text-success'
            : 'bg-destructive/15 text-destructive',
      )}
    >
      {label}{scoreSuffix}
    </span>
  )
}
