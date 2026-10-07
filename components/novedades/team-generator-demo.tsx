'use client'

import { useEffect } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { Flame, Snowflake } from 'lucide-react'
import { FaceitLevel } from '@/components/faceit/faceit-bits'
import { cn } from '@/lib/utils'

type DemoPlayer = { name: string; level: number; streak?: 'hot' | 'cold' }

/** Ejemplo ilustrativo: no son números reales. */
const DUELS: { a: DemoPlayer; b: DemoPlayer; pct: number }[] = [
  { a: { name: 'Roro', level: 10 }, b: { name: 'Papi', level: 8 }, pct: 64 },
  { a: { name: 'Pepo', level: 7, streak: 'hot' }, b: { name: 'Padri', level: 7 }, pct: 53 },
  { a: { name: 'Asta', level: 4, streak: 'cold' }, b: { name: 'Jey', level: 7 }, pct: 38 },
]

const EASE = [0.22, 1, 0.36, 1] as const

/** Mini generador: la balanza se mueve hasta quedar pareja y aparecen los duelos. */
export function TeamGeneratorDemo() {
  const reduceMotion = useReducedMotion()
  const share = useMotionValue(reduceMotion ? 51 : 76)

  useEffect(() => {
    if (reduceMotion) return
    const controls = animate(share, [76, 31, 63, 51], {
      duration: 2.6,
      times: [0, 0.35, 0.7, 1],
      ease: 'easeInOut',
      delay: 0.5,
      repeat: Infinity,
      repeatDelay: 3.4,
    })
    return () => controls.stop()
  }, [share, reduceMotion])

  const left = useTransform(share, (v) => `${Math.round(v)}%`)
  const right = useTransform(share, (v) => `${100 - Math.round(v)}%`)
  const width = useTransform(share, (v) => `${v}%`)
  const balanced = useTransform(share, (v) => Math.abs(v - 50) <= 2)
  const verdict = useTransform(balanced, (ok): string => (ok ? 'Muy parejo' : 'Balanceando…'))
  const verdictColor = useTransform(balanced, (ok) => (ok ? '#6ee7b7' : '#fcd34d'))
  const verdictBorder = useTransform(balanced, (ok) => (ok ? 'rgba(110,231,183,0.45)' : 'rgba(252,211,77,0.45)'))

  return (
    <div className="relative w-full max-w-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#011b2c]/95 p-3 shadow-2xl shadow-black/50">
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
        animate={reduceMotion ? undefined : { x: ['0%', '400%'] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3.6, ease: 'easeInOut' }}
      />

      <div className="relative flex items-end justify-between">
        <div className="flex flex-col">
          <span className="font-heading text-[9px] font-bold uppercase tracking-[0.22em] text-brand">Equipo 1</span>
          <motion.span className="font-mono text-2xl font-black leading-none tabular-nums text-foreground">{left}</motion.span>
        </div>
        <motion.span
          className="mb-0.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em]"
          style={{ color: verdictColor, borderColor: verdictBorder }}
        >
          {verdict}
        </motion.span>
        <div className="flex flex-col items-end">
          <span className="font-heading text-[9px] font-bold uppercase tracking-[0.22em] text-sky-300">Equipo 2</span>
          <motion.span className="font-mono text-2xl font-black leading-none tabular-nums text-foreground">{right}</motion.span>
        </div>
      </div>

      <div className="relative mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted/50">
        <motion.span className="h-full bg-brand" style={{ width }} />
        <span className="h-full w-0.5 bg-[#011b2c]" />
        <span className="h-full flex-1 bg-sky-400" />
      </div>

      <ul className="relative mt-3 flex flex-col gap-1.5">
        {DUELS.map((duel, i) => (
          <motion.li
            key={duel.a.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 + i * 0.12, ease: EASE }}
            className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-md bg-white/[0.03] px-2 py-1.5"
          >
            <DemoName player={duel.a} />
            <div className="flex w-[74px] flex-col gap-0.5">
              <div className="flex justify-between font-mono text-[10px] font-bold tabular-nums">
                <span className={duel.pct >= 50 ? 'text-brand' : 'text-muted-foreground'}>{duel.pct}%</span>
                <span className={duel.pct < 50 ? 'text-sky-300' : 'text-muted-foreground'}>{100 - duel.pct}%</span>
              </div>
              <div className="flex h-1 overflow-hidden rounded-full bg-muted/50">
                <motion.span
                  className="h-full bg-brand"
                  initial={{ width: '50%' }}
                  animate={{ width: `${duel.pct}%` }}
                  transition={{ duration: 0.7, delay: 0.6 + i * 0.12, ease: EASE }}
                />
                <span className="h-full flex-1 bg-sky-400/80" />
              </div>
            </div>
            <DemoName player={duel.b} right />
          </motion.li>
        ))}
      </ul>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 1.1, ease: EASE }}
        className="relative mt-2 flex items-center justify-center gap-1.5 rounded-md border border-emerald-400/25 bg-emerald-400/[0.07] px-2 py-1 text-[10px] text-emerald-200/90"
      >
        <Flame className="h-3 w-3 text-orange-400" aria-hidden="true" />
        Pepo con
        <Snowflake className="h-3 w-3 text-cyan-400" aria-hidden="true" />
        Asta: rachas compensadas
      </motion.div>

      <span className="absolute bottom-1 right-2 text-[8px] uppercase tracking-widest text-muted-foreground/50">Ejemplo</span>
    </div>
  )
}

function DemoName({ player, right = false }: { player: DemoPlayer; right?: boolean }) {
  return (
    <span className={cn('flex min-w-0 items-center gap-1.5', right && 'flex-row-reverse')}>
      <FaceitLevel level={player.level} size={18} />
      <span className="truncate text-[11px] font-semibold text-foreground">{player.name}</span>
      {player.streak === 'hot' && <Flame className="h-3 w-3 shrink-0 text-orange-400" aria-label="En racha" />}
      {player.streak === 'cold' && <Snowflake className="h-3 w-3 shrink-0 text-cyan-400" aria-label="En mala racha" />}
    </span>
  )
}
