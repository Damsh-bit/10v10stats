'use client'

import { motion } from 'motion/react'
import { AlertTriangle, CheckCircle2, ChevronDown, Info, Scale } from 'lucide-react'
import type { BalanceOption, ReasonTone } from '@/lib/teamBalancer'
import { cn } from '@/lib/utils'
import { RichText } from './team-ui'

const TONE_ICONS: Record<ReasonTone, { icon: typeof Info; className: string; label: string }> = {
  good: { icon: CheckCircle2, className: 'text-emerald-400', label: 'A favor del balance' },
  warn: { icon: AlertTriangle, className: 'text-amber-400', label: 'Para tener en cuenta' },
  info: { icon: Info, className: 'text-sky-300', label: 'Dato' },
}

/** Por qué esta combinación es pareja, en criollo, y cómo se calcula todo. */
export function BalanceReasons({
  option,
  sourceLabel,
  total,
}: {
  option: BalanceOption
  sourceLabel: string
  total: number
}) {
  const fair = option.verdict.tone === 'good'

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
          <Scale className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col">
          <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">
            {fair ? 'Por qué está balanceado' : 'Por qué quedó así'}
          </h2>
          <span className="text-[11px] text-muted-foreground">
            Rating de Xplay: {sourceLabel} · forma de las últimas 5
          </span>
        </div>
      </header>

      <ul className="grid grid-cols-1 gap-x-6 gap-y-2.5 p-4 md:grid-cols-2">
        {option.reasons.map((reason, i) => {
          const { icon: Icon, className, label } = TONE_ICONS[reason.tone]
          return (
            <motion.li
              key={`${option.id}-${i}`}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              className="flex gap-2.5 text-[13px] leading-snug text-muted-foreground"
            >
              <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', className)} aria-label={label} />
              <RichText text={reason.text} />
            </motion.li>
          )
        })}
      </ul>

      <details className="group border-t border-border/60 px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
          Cómo se calcula
        </summary>
        <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[12px] leading-relaxed text-muted-foreground marker:text-border">
          <li>
            <strong className="text-foreground">Rating</strong> de cada jugador = su Rating 2.1 de Xplay ({sourceLabel}),
            promediado por ronda: junta kills, muertes, daño, KAST y aperturas, y sale de partidas contra nosotros mismos. Suma o
            resta hasta 0,04 según cómo viene en sus últimas 5 del 10v10.
          </li>
          <li>
            Con pocas partidas no se le cree del todo: se mezcla con un punto de partida que vale como 3 partidas. En la carrera
            ese punto es el promedio del grupo; en una temporada o en las últimas partidas, su carrera.
          </li>
          <li>
            El FACEIT no cuenta. Sólo al que recién empieza con Xplay se lo ubica con lo que suele sacar acá la gente de su elo, y
            eso deja de contar a las 5 partidas.
          </li>
          <li>
            Se prueban las {total} formas de dividir a los 10 y se ordenan por qué tan parejos quedan el rating, las rachas (los
            que vienen ganando con los que vienen perdiendo) y cada duelo por posición.
          </li>
          <li>Las duplas que ganan mucho juntas en el 10v10 le suman fuerza a su equipo.</li>
          <li>
            La chance de ganar sale de las partidas de Xplay: 0,10 de rating promedio de diferencia ≈ 60% para el que tiene más, y
            0,20 ≈ 68%.
          </li>
          <li>&quot;Otra opción&quot; recorre las combinaciones más parejas que siguen (hasta 8, entre 42% y 58% de chances).</li>
        </ul>
      </details>
    </section>
  )
}
