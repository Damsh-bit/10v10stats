'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { Swords } from 'lucide-react'
import { formatElo, type BalanceOption, type Duel, type PlayerProfile } from '@/lib/teamBalancer'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { cn } from '@/lib/utils'
import { FormDots, ProfileLevel, StreakBadge, TEAM_TONES, formatHalf } from './team-ui'

/** Los dos equipos enfrentados por posición (el mejor de cada uno contra el mejor del otro, y así). */
export function DuelBoard({ option, sourceLabel }: { option: BalanceOption; sourceLabel: string }) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-brand">
          <Swords className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">
            Duelos por posición
          </h2>
          <span className="text-[11px] text-muted-foreground">Chance de que cada uno tenga mejor partida que su rival directo</span>
        </div>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 border-b border-border/60 bg-black/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] sm:gap-4 sm:px-4">
        <span className={TEAM_TONES[0].text}>{option.teams[0].name}</span>
        <span className="w-16 text-center text-muted-foreground sm:w-40">vs</span>
        <span className={cn('text-right', TEAM_TONES[1].text)}>{option.teams[1].name}</span>
      </div>

      <ol className="flex flex-col">
        {option.duels.map((duel, i) => (
          <DuelRow key={`${option.id}-${i}`} duel={duel} index={i} sourceLabel={sourceLabel} />
        ))}
      </ol>

      <p className="border-t border-border/60 px-4 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        El % mezcla la diferencia de poder con el historial real: cuántas veces cada uno tuvo mejor partida (KDA + daño) cuando
        coincidieron en el 10v10 ({sourceLabel}).
      </p>
    </section>
  )
}

function DuelRow({ duel, index, sourceLabel }: { duel: Duel; index: number; sourceLabel: string }) {
  const pa = Math.round(duel.probA * 100)
  return (
    <motion.li
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="border-b border-border/50 px-3 py-3 last:border-b-0 sm:px-4"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4">
        <DuelPlayer profile={duel.a} side="left" />
        <div className="flex w-16 flex-col items-center gap-1 sm:w-40">
          <div className="flex w-full items-baseline justify-between font-mono text-[12px] font-bold tabular-nums sm:text-[13px]">
            <span className={pa >= 50 ? TEAM_TONES[0].text : 'text-muted-foreground'}>{pa}%</span>
            <span className={pa < 50 ? TEAM_TONES[1].text : 'text-muted-foreground'}>{100 - pa}%</span>
          </div>
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
            <motion.span
              className={cn('h-full', TEAM_TONES[0].bar)}
              initial={{ width: '50%' }}
              animate={{ width: `${pa}%` }}
              transition={{ duration: 0.6, delay: 0.1 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
            />
            <span className="h-full w-px bg-card" />
            <span className={cn('h-full flex-1 opacity-80', TEAM_TONES[1].bar)} />
          </div>
        </div>
        <DuelPlayer profile={duel.b} side="right" />
      </div>
      <p className="mt-1.5 text-center text-[10px] leading-snug text-muted-foreground">{duelDetail(duel, sourceLabel)}</p>
    </motion.li>
  )
}

function duelDetail(duel: Duel, sourceLabel: string) {
  const a = duel.a.stats.player.name
  const b = duel.b.stats.player.name
  if (duel.shared === 0) return `Nunca coincidieron en ${sourceLabel}: sale sólo del nivel de cada uno.`
  const better = `Mejor partida: ${a} ${formatHalf(duel.betterA)} · ${b} ${formatHalf(duel.shared - duel.betterA)}`
  const rivals = duel.apart > 0 ? ` · Como rivales: ${duel.apartWinsA}–${duel.apartLossesA}` : ''
  return `${better}${rivals}`
}

function DuelPlayer({ profile, side }: { profile: PlayerProfile; side: 'left' | 'right' }) {
  const right = side === 'right'
  const { player } = profile.stats
  const power = Math.round(profile.power)
  const formPoints = Math.round(profile.power - profile.basePower)
  const breakdown = `Poder ${power}: FACEIT ${Math.round(profile.faceitScore)}${profile.faceit ? '' : ' (estimado)'} · 10v10 ${Math.round(profile.perf)} · forma ${formPoints > 0 ? '+' : ''}${formPoints}`

  return (
    <div className={cn('flex min-w-0 items-center gap-2', right && 'flex-row-reverse')}>
      <span className="hidden shrink-0 sm:inline-flex">
        <PlayerAvatar player={player} size={34} />
      </span>
      <ProfileLevel profile={profile} size={24} />
      <div className={cn('flex min-w-0 flex-1 flex-col gap-0.5', right && 'items-end text-right')}>
        <span className={cn('flex min-w-0 max-w-full items-center gap-1', right && 'flex-row-reverse')}>
          <Link
            href={`/players/${player.id}`}
            className="truncate text-[13px] font-semibold leading-tight text-foreground transition-colors hover:text-brand sm:text-[14px]"
          >
            {player.name}
          </Link>
          <StreakBadge form={profile.form} />
        </span>
        <span className="max-w-full truncate font-mono text-[10px] text-muted-foreground" title={breakdown}>
          <span className="sm:hidden">P {power}</span>
          {profile.faceit ? (
            <>
              <span className="sm:hidden"> · </span>
              {formatElo(profile.faceit.elo)}
              <span className="hidden sm:inline"> elo</span>
            </>
          ) : (
            <span className="hidden sm:inline">sin FACEIT</span>
          )}
        </span>
        <FormDots results={profile.form.recent} className="hidden sm:flex" />
      </div>
      <div className={cn('hidden shrink-0 flex-col sm:flex', right ? 'items-start' : 'items-end')} title={breakdown}>
        <span className="font-mono text-lg font-black leading-none tabular-nums text-foreground">{power}</span>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">poder</span>
      </div>
    </div>
  )
}
