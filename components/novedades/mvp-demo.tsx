'use client'

import { useEffect, useState } from 'react'
import { LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

type DemoTeam = { label: string; score: number; won: boolean; rows: { name: string; dmg: number }[] }

/** Ejemplo ilustrativo: no son números reales. */
const TEAMS: DemoTeam[] = [
  {
    label: 'Equipo 1',
    score: 13,
    won: true,
    rows: [
      { name: 'Pepo', dmg: 2410 },
      { name: 'Papi', dmg: 2050 },
      { name: 'Pucha', dmg: 1780 },
    ],
  },
  {
    label: 'Equipo 2',
    score: 9,
    won: false,
    rows: [
      { name: 'Jey', dmg: 2980 },
      { name: 'Asta', dmg: 1890 },
      { name: 'Padri', dmg: 1560 },
    ],
  },
]

/** 0: antes (el mejor de los diez) · 1: perdió el mapa · 2: ahora (el mejor del que ganó). */
const STEPS = [
  { mvp: 'Jey', duration: 1800, caption: 'Antes: el mejor de los diez', className: 'border-white/15 bg-white/[0.04] text-muted-foreground' },
  { mvp: 'Jey', duration: 1500, caption: 'Pero Jey perdió el mapa…', className: 'border-rose-400/40 bg-rose-400/10 text-rose-300' },
  { mvp: 'Pepo', duration: 3200, caption: 'Ahora: el mejor del que ganó', className: 'border-amber-300/50 bg-amber-300/10 text-amber-200' },
]

/** Mini tabulador: la corona salta del que más daño hizo (pero perdió) al mejor del equipo ganador. */
export function MvpDemo() {
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState(reduceMotion ? 2 : 0)

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEPS[step].duration)
    return () => window.clearTimeout(timer)
  }, [step, reduceMotion])

  const current = STEPS[step]

  return (
    <div className="relative w-full max-w-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#011b2c]/85 p-3 shadow-2xl shadow-black/50 backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <span className="flex items-center gap-1.5 font-heading text-[9px] font-bold uppercase tracking-[0.22em] text-yellow-400">
          <Crown className="h-3 w-3" aria-hidden="true" />
          MVP del mapa
        </span>
        <span className="text-[8px] uppercase tracking-widest text-muted-foreground/50">Ejemplo</span>
      </div>

      <LayoutGroup>
        <div className="grid grid-cols-2 gap-2">
          {TEAMS.map((team) => {
            const dimmed = !team.won && step >= 1
            return (
              <div
                key={team.label}
                className={cn(
                  'rounded-lg border p-1.5 transition-colors duration-500',
                  team.won ? 'border-emerald-400/25 bg-emerald-400/[0.04]' : 'border-rose-400/20 bg-rose-400/[0.03]',
                )}
              >
                <div className="mb-1 flex items-baseline justify-between px-1">
                  <span
                    className={cn(
                      'font-heading text-[9px] font-bold uppercase tracking-[0.16em]',
                      team.won ? 'text-emerald-300' : 'text-rose-300',
                    )}
                  >
                    {team.won ? 'Ganó' : 'Perdió'}
                  </span>
                  <span className="font-mono text-[13px] font-black leading-none tabular-nums text-foreground">{team.score}</span>
                </div>
                <ul className="flex flex-col gap-0.5">
                  {team.rows.map((row) => {
                    const isMvp = current.mvp === row.name
                    return (
                      <motion.li
                        key={row.name}
                        animate={{ opacity: dimmed && !isMvp ? 0.4 : 1 }}
                        transition={{ duration: 0.4 }}
                        className={cn(
                          'grid grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-1.5 rounded-md px-1 py-[3px] transition-colors duration-500',
                          isMvp && step === 0 && 'bg-white/[0.06]',
                          isMvp && step === 1 && 'bg-rose-400/10 ring-1 ring-rose-400/40',
                          isMvp && step === 2 && 'bg-amber-300/10 ring-1 ring-amber-300/40',
                        )}
                      >
                        <span className="flex h-3.5 w-3.5 items-center justify-center">
                          {isMvp && (
                            <motion.span
                              layoutId="mvp-demo-crown"
                              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                              className={cn('flex', step === 1 ? 'text-rose-300' : 'text-yellow-400')}
                            >
                              <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                            </motion.span>
                          )}
                        </span>
                        <span className={cn('truncate text-[11px] font-semibold', isMvp ? 'text-foreground' : 'text-foreground/80')}>
                          {row.name}
                        </span>
                        <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {row.dmg}
                          <span className="ml-0.5 text-[8px] uppercase">dmg</span>
                        </span>
                      </motion.li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </div>
      </LayoutGroup>

      {/* Las tres leyendas apiladas en la misma celda: se cruzan sin desmontarse. */}
      <div className="mt-2.5 grid h-6 place-items-center">
        {STEPS.map((s, i) => (
          <motion.span
            key={s.caption}
            aria-hidden={i !== step}
            initial={false}
            animate={{ opacity: i === step ? 1 : 0, y: i === step ? 0 : i < step ? -6 : 6 }}
            transition={{ duration: 0.3 }}
            className={cn(
              '[grid-area:1/1] whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em]',
              s.className,
            )}
          >
            {s.caption}
          </motion.span>
        ))}
      </div>
    </div>
  )
}
