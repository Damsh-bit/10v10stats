'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { Crown } from 'lucide-react'
import type { PlayerStats } from '@/types'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { cn } from '@/lib/utils'

const PLACES = [
  { rank: 2, height: 'h-16 sm:h-20', compactHeight: 'h-10', ring: 'ring-slate-300', text: 'text-slate-200', block: 'from-slate-400/30 to-slate-500/5 border-slate-300/30', delay: 0.15 },
  { rank: 1, height: 'h-24 sm:h-28', compactHeight: 'h-14', ring: 'ring-amber-300', text: 'text-amber-300', block: 'from-amber-400/35 to-amber-500/5 border-amber-300/40', delay: 0 },
  { rank: 3, height: 'h-12 sm:h-14', compactHeight: 'h-8', ring: 'ring-orange-400', text: 'text-orange-300', block: 'from-orange-500/30 to-orange-600/5 border-orange-400/30', delay: 0.3 },
] as const

/** Podio de los tres primeros del ladder. Se muestra en el orden 2 · 1 · 3. */
export function SeasonPodium({ top, compact = false }: { top: PlayerStats[]; compact?: boolean }) {
  if (top.length === 0) return null

  return (
    <div className="grid grid-cols-3 items-end gap-2 sm:gap-3" role="list" aria-label="Podio">
      {PLACES.map((place) => {
        const stats = top[place.rank - 1]
        if (!stats) return <div key={place.rank} aria-hidden="true" />
        const isFirst = place.rank === 1
        const avatarSize = compact ? (isFirst ? 44 : 36) : isFirst ? 60 : 48
        const winrate = stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0

        return (
          <Link
            key={place.rank}
            href={`/players/${stats.player.id}`}
            role="listitem"
            className="group flex min-w-0 flex-col items-center"
          >
            <motion.div
              className="relative flex flex-col items-center"
              initial={{ opacity: 0, y: -24, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: place.delay + 0.25 }}
            >
              {isFirst && (
                <motion.span
                  className="absolute -top-5 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.7)]"
                  animate={{ y: [0, -3, 0], rotate: [-6, 6, -6] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                  aria-hidden="true"
                >
                  <Crown className="h-5 w-5 fill-amber-300/40" />
                </motion.span>
              )}
              <span className={cn('rounded-full ring-2 ring-offset-2 ring-offset-card transition-transform group-hover:scale-105', place.ring)}>
                <PlayerAvatar player={stats.player} size={avatarSize} />
              </span>
              <span className="mt-2 max-w-full truncate text-center text-[12px] font-semibold text-foreground sm:text-[13px]">
                {stats.player.name}
              </span>
              <span className={cn('font-mono text-[15px] font-black leading-tight sm:text-lg', place.text)}>
                {stats.kda.toFixed(2)}
              </span>
              {!compact && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  {stats.wins}W · {winrate}% WR
                </span>
              )}
            </motion.div>

            <motion.div
              className={cn(
                'mt-2 flex w-full origin-bottom items-start justify-center rounded-t-md border border-b-0 bg-gradient-to-b pt-1.5',
                compact ? place.compactHeight : place.height,
                place.block,
              )}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: place.delay }}
            >
              <span className={cn('font-heading text-xl font-black sm:text-2xl', place.text)}>{place.rank}</span>
            </motion.div>
          </Link>
        )
      })}
    </div>
  )
}
