'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { Swords } from 'lucide-react'
import type { RankBattle } from '@/lib/season-stats'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { Stagger, StaggerItem } from '@/components/motion/reveal'
import { BlurText } from '@/components/amicro/blur-text'

/** Los puestos más peleados: quién está a un paso de pasar a quién. */
export function RankBattles({ battles }: { battles: RankBattle[] }) {
  if (battles.length === 0) return null

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
            <Swords className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">
              <BlurText text="Duelos por el puesto" />
            </h2>
            <p className="text-[11px] text-muted-foreground">Las diferencias de KDA más chicas del ladder</p>
          </div>
        </div>
      </header>

      <Stagger
        className={`grid gap-px bg-border ${battles.length >= 3 ? 'sm:grid-cols-3' : battles.length === 2 ? 'sm:grid-cols-2' : ''}`}
        stagger={0.08}
      >
        {battles.map((battle) => {
          const tight = battle.gap < 0.05
          return (
            <StaggerItem key={`${battle.chaser.player.id}-${battle.target.player.id}`} className="bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <BattlePlayer rank={battle.chaserRank} id={battle.chaser.player.id} name={battle.chaser.player.name} player={battle.chaser.player} />
                <motion.span
                  className="shrink-0 font-heading text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
                  animate={tight ? { scale: [1, 1.15, 1] } : undefined}
                  transition={{ duration: 1.2, repeat: Infinity }}
                >
                  vs
                </motion.span>
                <BattlePlayer rank={battle.targetRank} id={battle.target.player.id} name={battle.target.player.name} player={battle.target.player} alignRight />
              </div>
              <p className="mt-3 text-center text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground">{battle.chaser.player.name}</span>
                {battle.gap < 0.005 ? (
                  <>
                    {' '}está <span className="font-bold text-rose-400">empatado en KDA</span> con el #{battle.targetRank}
                  </>
                ) : (
                  <>
                    {' '}está a{' '}
                    <span className={tight ? 'font-mono font-bold text-rose-400' : 'font-mono font-bold text-amber-300'}>
                      {battle.gap.toFixed(2)}
                    </span>{' '}
                    de KDA del #{battle.targetRank}
                  </>
                )}
              </p>
            </StaggerItem>
          )
        })}
      </Stagger>
    </section>
  )
}

function BattlePlayer({
  rank,
  id,
  name,
  player,
  alignRight = false,
}: {
  rank: number
  id: string
  name: string
  player: RankBattle['chaser']['player']
  alignRight?: boolean
}) {
  return (
    <Link
      href={`/players/${id}`}
      className={`flex min-w-0 items-center gap-2 ${alignRight ? 'flex-row-reverse text-right' : ''} hover:text-white`}
    >
      <PlayerAvatar player={player} size={30} />
      <span className="min-w-0">
        <span className="block font-mono text-[10px] text-muted-foreground">#{rank}</span>
        <span className="block truncate text-[13px] font-semibold text-foreground">{name}</span>
      </span>
    </Link>
  )
}
