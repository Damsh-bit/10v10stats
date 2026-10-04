'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { ArrowRight, Crown, History, Swords, Target, Trophy, Users } from 'lucide-react'
import type { PlayerStats } from '@/types'
import AnimatedNumber from '@/components/ui/animated-number'
import { PlayerAvatar } from '@/components/shared/strike-ui'

type Props = {
  seasonNumber: number
  seasonName: string
  dayNumber: number
  matches: number
  totalKills: number
  activePlayers: number
  leader: PlayerStats | null
  previousChampion: { seasonName: string; seasonSlug: string; stats: PlayerStats } | null
  primaryAction: React.ReactNode
}

export function SeasonHero({
  seasonNumber,
  seasonName,
  dayNumber,
  matches,
  totalKills,
  activePlayers,
  leader,
  previousChampion,
  primaryAction,
}: Props) {
  const letters = seasonName.toUpperCase().split('')

  return (
    <section className="season-hero relative isolate overflow-hidden rounded-2xl border border-white/10 px-4 py-4 sm:px-6 sm:py-5">
      {/* Fondo: glows, grilla y la marca de agua de la temporada */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <motion.div
          className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/40 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.8, 0.55] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-32 right-0 h-80 w-80 rounded-full bg-amber-500/25 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="cs-grid absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <span className="season-watermark absolute -right-4 top-1/2 -translate-y-1/2 select-none font-heading text-[6rem] font-black leading-none sm:text-[8rem]">
          S{seasonNumber}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-8">
        <div className="flex flex-col items-start gap-3">
          <span
            className="enter flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300"
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Temporada en curso · Día {dayNumber}
          </span>

          <h1 className="font-heading text-4xl font-black uppercase leading-[0.9] tracking-tight sm:text-5xl" aria-label={seasonName}>
            <span className="flex" aria-hidden="true">
              {letters.map((letter, i) => (
                <span
                  key={`${letter}-${i}`}
                  className="enter-letter season-gradient-text"
                  style={{ animationDelay: `${0.1 + i * 0.045}s` }}
                >
                  {letter === ' ' ? ' ' : letter}
                </span>
              ))}
            </span>
          </h1>

          <div className="enter flex flex-wrap items-center gap-2" style={{ animationDelay: '0.45s' }}>
            {primaryAction}
            <Link
              href="/creacion-de-equipos"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 text-sm font-medium text-foreground transition-colors hover:bg-white/10"
            >
              <Users className="h-4 w-4" aria-hidden="true" />
              Armar equipos
            </Link>
            {previousChampion && (
              <Link
                href={`/temporadas/${previousChampion.seasonSlug}`}
                className="group inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-amber-200 transition-colors hover:bg-amber-300/10"
              >
                <History className="h-4 w-4" aria-hidden="true" />
                Ver {previousChampion.seasonName}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <HeroStat icon={Swords} label="Partidas" delay={0.35}>
            <AnimatedNumber value={matches} className="font-mono text-xl font-bold sm:text-2xl" />
          </HeroStat>
          <HeroStat icon={Target} label="Kills" delay={0.45}>
            <AnimatedNumber value={totalKills} className="font-mono text-xl font-bold sm:text-2xl" />
          </HeroStat>
          <HeroStat icon={Trophy} label="Líder actual" delay={0.55}>
            {leader ? (
              <Link href={`/players/${leader.player.id}`} className="flex min-w-0 items-center gap-2 hover:text-white">
                <PlayerAvatar player={leader.player} size={26} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] leading-tight">{leader.player.name}</span>
                  <span className="block font-mono text-[11px] font-semibold text-emerald-300">{leader.kda.toFixed(2)} KDA</span>
                </span>
              </Link>
            ) : (
              <span className="text-[15px] text-muted-foreground">Vacante</span>
            )}
          </HeroStat>
          {previousChampion ? (
            <HeroStat icon={Crown} label={`Campeón ${previousChampion.seasonName.replace(/^Season\s*/i, 'S')}`} delay={0.65} gold>
              <Link
                href={`/players/${previousChampion.stats.player.id}`}
                className="flex min-w-0 items-center gap-2 hover:text-white"
              >
                <PlayerAvatar player={previousChampion.stats.player} size={26} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] leading-tight">{previousChampion.stats.player.name}</span>
                  <span className="block font-mono text-[11px] font-semibold text-amber-300">
                    {previousChampion.stats.kda.toFixed(2)} KDA
                  </span>
                </span>
              </Link>
            </HeroStat>
          ) : (
            <HeroStat icon={Users} label="Jugadores activos" delay={0.65}>
              <AnimatedNumber value={activePlayers} className="font-mono text-xl font-bold sm:text-2xl" />
            </HeroStat>
          )}
        </div>
      </div>
    </section>
  )
}

function HeroStat({
  icon: Icon,
  label,
  children,
  delay,
  gold = false,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
  delay: number
  gold?: boolean
}) {
  return (
    <div
      style={{ animationDelay: `${delay}s` }}
      className={
        gold
          ? 'enter flex min-h-[64px] min-w-0 flex-col justify-between gap-1.5 rounded-xl border border-amber-300/30 bg-gradient-to-br from-amber-300/15 to-black/20 p-2.5 transition-transform hover:-translate-y-0.5 sm:p-3'
          : 'enter flex min-h-[64px] min-w-0 flex-col justify-between gap-1.5 rounded-xl border border-white/10 bg-black/25 p-2.5 transition-transform hover:-translate-y-0.5 sm:p-3'
      }
    >
      <span className={`flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${gold ? 'text-amber-200' : 'text-muted-foreground'}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {label}
      </span>
      <div className="min-w-0 font-semibold text-foreground">{children}</div>
    </div>
  )
}
