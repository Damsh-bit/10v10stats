'use client'

import { useId } from 'react'
import { Zap } from 'lucide-react'
import type { EquipoXplay } from '@/lib/xplay/tipos'
import type { ProbabilidadPartida } from '@/lib/xplay/probabilidad'
import { cn } from '@/lib/utils'
import { tonoEquipo } from './comun'

const ANCHO = 1000
const ALTO = 160

export const porcentaje = (p: number) => `${Math.round(p * 100)}%`

/**
 * Chances de ganar la partida antes de cada ronda (arriba, el primer equipo de
 * `orden`). La ronda bisagra queda marcada; tocar una ronda la elige.
 */
export function CurvaProbabilidad({
  prob,
  orden,
  nombres,
  elegida,
  onElegir,
}: {
  prob: ProbabilidadPartida
  orden: EquipoXplay[]
  nombres: Record<EquipoXplay, string>
  elegida: number
  onElegir: (ronda: number) => void
}) {
  const id = useId()
  const arriba = orden[0]
  const abajo = orden[1]
  const chance = (p1: number) => (arriba === 1 ? p1 : 1 - p1)
  const puntos = prob.puntos
  if (puntos.length < 2) return null

  const x = (i: number) => (i / (puntos.length - 1)) * ANCHO
  const y = (p1: number) => (1 - chance(p1)) * ALTO
  const linea = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.p1).toFixed(1)}`).join(' ')
  const area = `${linea} L${ANCHO},${ALTO / 2} L0,${ALTO / 2} Z`
  const rondas = puntos.length - 1
  const tonoArriba = tonoEquipo(nombres[arriba])
  const tonoAbajo = tonoEquipo(nombres[abajo])
  const bisagra = prob.bisagra

  return (
    <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Chances de ganar la partida</h3>
        <p className="text-[11px] text-muted-foreground">Antes de cada ronda, por el marcador y lo que compró cada equipo</p>
      </div>

      <div className="relative">
        <span className={cn('absolute left-1 top-0.5 z-10 text-[10px] font-bold uppercase tracking-wider', tonoArriba.texto)}>{nombres[arriba]}</span>
        <span className={cn('absolute bottom-0.5 left-1 z-10 text-[10px] font-bold uppercase tracking-wider', tonoAbajo.texto)}>{nombres[abajo]}</span>

        <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" className="block h-36 w-full overflow-visible" aria-hidden="true">
          <defs>
            <clipPath id={`${id}-arriba`}>
              <rect x="0" y="0" width={ANCHO} height={ALTO / 2} />
            </clipPath>
            <clipPath id={`${id}-abajo`}>
              <rect x="0" y={ALTO / 2} width={ANCHO} height={ALTO / 2} />
            </clipPath>
          </defs>
          <g className={tonoArriba.texto}>
            <path d={area} fill="currentColor" fillOpacity={0.22} clipPath={`url(#${id}-arriba)`} />
          </g>
          <g className={tonoAbajo.texto}>
            <path d={area} fill="currentColor" fillOpacity={0.22} clipPath={`url(#${id}-abajo)`} />
          </g>
          <line x1="0" x2={ANCHO} y1={ALTO / 2} y2={ALTO / 2} stroke="currentColor" className="text-muted-foreground/50" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <path d={linea} fill="none" stroke="currentColor" className="text-foreground" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>

        {bisagra ? (
          <div
            className="pointer-events-none absolute inset-y-0 z-10 flex -translate-x-1/2 flex-col items-center"
            style={{ left: `${(bisagra.ronda / rondas) * 100}%` }}
          >
            <span className="h-full w-px bg-amber-300/80" />
          </div>
        ) : null}

        {/* Una franja por ronda: muestra el cambio de chances y elige la ronda. */}
        <div className="absolute inset-0 flex">
          {puntos.slice(0, -1).map((punto, i) => {
            const n = punto.n
            const antes = chance(punto.p1)
            const despues = chance(puntos[i + 1].p1)
            return (
              <button
                key={n}
                type="button"
                onClick={() => onElegir(n)}
                title={`Ronda ${n}: ${nombres[arriba]} ${porcentaje(antes)} → ${porcentaje(despues)}`}
                aria-label={`Ronda ${n}`}
                className={cn('h-full flex-1 transition-colors hover:bg-white/5', elegida === n && 'bg-white/10')}
              />
            )
          })}
        </div>
      </div>

      <p className="mt-3 flex items-start gap-2 text-[13px] text-muted-foreground">
        {bisagra ? (
          <>
            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
            <span>
              <button type="button" onClick={() => onElegir(bisagra.ronda)} className="font-semibold text-amber-200 underline-offset-2 hover:underline">
                Ronda bisagra: la {bisagra.ronda}
              </button>
              . <span className={cn('font-semibold', tonoEquipo(nombres[bisagra.equipo]).texto)}>{nombres[bisagra.equipo]}</span> pasó de{' '}
              {porcentaje(bisagra.antes)} a {porcentaje(bisagra.despues)} de chances y no soltó más el favoritismo.
              {prob.vueltas.length > 1 ? ` El favorito cambió ${prob.vueltas.length} veces en la partida.` : ''}
            </span>
          </>
        ) : prob.ganador ? (
          <span>
            Sin bisagra: <span className={cn('font-semibold', tonoEquipo(nombres[prob.ganador]).texto)}>{nombres[prob.ganador]}</span> fue
            favorito toda la partida.
          </span>
        ) : (
          <span>Terminó empatada: nadie se quedó con el favoritismo.</span>
        )}
      </p>
    </section>
  )
}
