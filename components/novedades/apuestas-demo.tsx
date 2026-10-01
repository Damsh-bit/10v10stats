'use client'

import { useEffect, useState } from 'react'
import { animate, AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { CheckCircle2, Coins, Swords, Wallet } from 'lucide-react'
import { cuotasPozo, formatCuota, formatPesos, formatProb, montoJustoRival } from '@/lib/apuestas/cuotas'
import { TEAM_TONES } from '@/components/TeamGenerator/team-ui'
import { cn } from '@/lib/utils'

type DemoBet = { name: string; side: 'A' | 'B'; amount: number }

/** Ejemplo ilustrativo: no son apuestas reales. */
const BETS: DemoBet[] = [
  { name: 'Roro', side: 'A', amount: 3000 },
  { name: 'Jey', side: 'B', amount: 2500 },
  { name: 'Papi', side: 'A', amount: 2000 },
  { name: 'Asta', side: 'B', amount: 3000 },
  { name: 'Pepo', side: 'A', amount: 5000 },
  { name: 'Padri', side: 'B', amount: 3000 },
]

const DUEL = { a: 'Pepo', b: 'Padri', probA: 0.58, montoA: 1000 }
const DUEL_STATES = [
  { label: 'Desafío enviado', className: 'border-amber-400/40 bg-amber-400/10 text-amber-300' },
  { label: 'Aceptado', className: 'border-sky-400/40 bg-sky-400/10 text-sky-300' },
  { label: 'Pagado', className: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
]

const STEP_MS = 800
/** Pasos quietos con el pozo lleno antes de volver a empezar. */
const HOLD_STEPS = 5
const EASE = [0.22, 1, 0.36, 1] as const

/** Mini partida con apuestas: el pozo se llena, las cuotas se mueven y el duelo pasa de desafío a pagado. */
export function ApuestasDemo() {
  const reduceMotion = useReducedMotion()
  const [step, setStep] = useState(reduceMotion ? BETS.length : 0)

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setInterval(() => setStep((s) => (s >= BETS.length + HOLD_STEPS ? 0 : s + 1)), STEP_MS)
    return () => window.clearInterval(timer)
  }, [reduceMotion])

  const count = Math.min(step, BETS.length)
  const placed = BETS.slice(0, count)
  const totales = {
    A: placed.filter((b) => b.side === 'A').reduce((acc, b) => acc + b.amount, 0),
    B: placed.filter((b) => b.side === 'B').reduce((acc, b) => acc + b.amount, 0),
  }
  const total = totales.A + totales.B
  const cuotas = cuotasPozo(totales)
  const shareA = total > 0 ? (totales.A / total) * 100 : 50
  const last = count > 0 ? BETS[count - 1] : null
  const duelState = DUEL_STATES[count < 2 ? 0 : count < 4 ? 1 : 2]

  return (
    <div className="relative w-full max-w-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#011b2c]/85 p-3 shadow-2xl shadow-black/50 backdrop-blur-md">
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/[0.07] to-transparent"
        animate={reduceMotion ? undefined : { x: ['0%', '400%'] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 3.6, ease: 'easeInOut' }}
      />

      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-heading text-[9px] font-bold uppercase tracking-[0.22em] text-amber-300">
          <Coins className="h-3 w-3" aria-hidden="true" />
          Pozo por equipos
        </span>
        <span className="relative">
          {last && !reduceMotion && (
            <motion.span
              key={count}
              aria-hidden="true"
              className="pointer-events-none absolute right-full top-1/2 mr-1.5 whitespace-nowrap font-mono text-[10px] font-bold text-emerald-300"
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: [0, 1, 1, 0], y: [2, -6, -10, -14] }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
            >
              +{formatPesos(last.amount)}
            </motion.span>
          )}
          <AnimatedPesos value={total} className="font-mono text-lg font-black leading-none tabular-nums text-foreground" />
        </span>
      </div>

      <div className="relative mt-2 grid grid-cols-2 gap-2">
        {(['A', 'B'] as const).map((side, i) => {
          const tone = TEAM_TONES[i as 0 | 1]
          const cuota = formatCuota(cuotas[side])
          return (
            <div key={side} className={cn('flex items-center justify-between rounded-md border px-2 py-1', tone.border, tone.soft)}>
              <span className={cn('font-heading text-[9px] font-bold uppercase tracking-[0.2em]', tone.text)}>Equipo {i + 1}</span>
              <motion.span
                key={cuota}
                initial={reduceMotion ? false : { scale: 1.3, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="inline-block font-mono text-sm font-black tabular-nums text-foreground"
              >
                {cuota}
              </motion.span>
            </div>
          )
        })}
      </div>

      <div className="relative mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted/50">
        <motion.span className="h-full bg-brand" initial={false} animate={{ width: `${shareA}%` }} transition={{ duration: 0.5, ease: EASE }} />
        <span className="h-full w-0.5 bg-[#011b2c]" />
        <span className="h-full flex-1 bg-sky-400" />
      </div>

      <div className="relative mt-1.5 h-4 overflow-hidden text-[10px] text-muted-foreground">
        <AnimatePresence initial={false}>
          <motion.p
            key={last ? count : 'vacio'}
            className="absolute inset-x-0 top-0 truncate"
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {last ? (
              <>
                <strong className="font-semibold text-foreground">{last.name}</strong> puso{' '}
                <span className="font-mono font-bold text-amber-300">{formatPesos(last.amount)}</span> a{' '}
                <span className={TEAM_TONES[last.side === 'A' ? 0 : 1].text}>Equipo {last.side === 'A' ? 1 : 2}</span>
              </>
            ) : (
              'Apuestas abiertas: entrá antes de que cierre'
            )}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="relative mt-1.5 rounded-md bg-white/[0.03] px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-heading text-[9px] font-bold uppercase tracking-[0.2em] text-brand">
            <Swords className="h-3 w-3" aria-hidden="true" />
            Duelo · mejor partida
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={duelState.label}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              className={cn('flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em]', duelState.className)}
            >
              {duelState.label === 'Pagado' && <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />}
              {duelState.label}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 text-[11px]">
          <DuelSide name={DUEL.a} prob={DUEL.probA} amount={DUEL.montoA} />
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">vs</span>
          <DuelSide name={DUEL.b} prob={1 - DUEL.probA} amount={montoJustoRival(DUEL.montoA, DUEL.probA)} right />
        </div>
      </div>

      <div className="relative mt-2 flex items-center justify-center gap-1.5 rounded-md border border-sky-400/25 bg-sky-400/[0.07] px-2 py-1 text-[10px] text-sky-100/90">
        <Wallet className="h-3 w-3 text-sky-300" aria-hidden="true" />
        Pagás con Mercado Pago · si se anula, vuelve solo
      </div>

      <span className="absolute bottom-1 right-2 text-[8px] uppercase tracking-widest text-muted-foreground/50">Ejemplo</span>
    </div>
  )
}

function AnimatedPesos({ value, className }: { value: number; className?: string }) {
  const reduceMotion = useReducedMotion()
  const amount = useMotionValue(value)
  const text = useTransform(amount, (v) => formatPesos(Math.round(v / 50) * 50))

  useEffect(() => {
    if (reduceMotion) {
      amount.set(value)
      return
    }
    const controls = animate(amount, value, { duration: 0.6, ease: EASE })
    return () => controls.stop()
  }, [amount, value, reduceMotion])

  return <motion.span className={className}>{text}</motion.span>
}

function DuelSide({ name, prob, amount, right = false }: { name: string; prob: number; amount: number; right?: boolean }) {
  return (
    <span className={cn('flex min-w-0 items-baseline gap-1.5', right && 'flex-row-reverse')}>
      <span className="truncate font-semibold text-foreground">{name}</span>
      <span className="font-mono text-[10px] font-bold tabular-nums text-amber-300">{formatPesos(amount)}</span>
      <span className="font-mono text-[9px] tabular-nums text-muted-foreground">{formatProb(prob)}</span>
    </span>
  )
}
