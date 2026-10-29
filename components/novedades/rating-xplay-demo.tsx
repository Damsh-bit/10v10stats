'use client'

import { useEffect, useState } from 'react'
import { isMotionOff } from '@/components/motion/motion-preference'
import { cn } from '@/lib/utils'

const STEP_MS = 2800

type DemoEquipo = { nombre: string; color: string; jugadores: [nombre: string, rating: string][] }

/** Ejemplo ilustrativo: no son números reales. */
const EQUIPOS: DemoEquipo[] = [
  { nombre: 'Equipo 1', color: 'text-brand', jugadores: [['Roro', '1.52'], ['Asta', '1.07'], ['Pucha', '1.01'], ['Foco', '0.90'], ['Tiky', '0.84']] },
  { nombre: 'Equipo 2', color: 'text-sky-300', jugadores: [['Papi', '1.33'], ['Jey', '1.21'], ['Padri', '1.08'], ['Kike', '0.93'], ['Neitor', '0.82']] },
]

const PROMEDIOS = ['1.07', '1.07']

const PASOS = ['El rating de cada uno', 'Los equipos'] as const

/** Mini generador: primero el rating de Xplay de cada uno, después los dos equipos parejos. */
export function RatingXplayDemo() {
  const [paso, setPaso] = useState(0)

  useEffect(() => {
    if (isMotionOff() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setPaso((n) => (n + 1) % PASOS.length), STEP_MS)
    return () => window.clearInterval(timer)
  }, [])

  const todos = EQUIPOS.flatMap((e) => e.jugadores).sort((a, b) => Number(b[1]) - Number(a[1]))

  return (
    <div className="relative w-full max-w-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#011b2c]/95 p-3 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading text-[15px] font-bold uppercase leading-tight tracking-wide text-foreground">Generador</p>
          <p className="text-[10px] uppercase tracking-wider text-emerald-300">Con el rating de Xplay</p>
        </div>
        <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground line-through decoration-rose-400/80">
          FACEIT
        </span>
      </div>

      <div className="mt-2.5 flex gap-3 border-b border-white/10 text-[9px] font-semibold uppercase tracking-wider">
        {PASOS.map((p, i) => (
          <span key={p} className={cn('-mb-px border-b-2 pb-1.5', i === paso ? 'border-brand text-white' : 'border-transparent text-muted-foreground')}>
            {p}
          </span>
        ))}
      </div>

      <div key={paso} className="perfil-panel mt-2 min-h-[118px]">
        {paso === 0 && (
          <ul className="grid grid-cols-2 gap-1">
            {todos.map(([nombre, rating]) => (
              <li key={nombre} className="flex items-center justify-between rounded-md bg-white/5 px-2 py-[3px] text-[11px]">
                <span className="font-semibold text-foreground">{nombre}</span>
                <span className="font-mono font-bold text-emerald-300">{rating}</span>
              </li>
            ))}
          </ul>
        )}
        {paso === 1 && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {EQUIPOS.map((equipo, i) => (
                <div key={equipo.nombre} className="flex flex-col gap-0.5 rounded-md bg-white/5 px-2 py-1.5">
                  <span className={cn('flex justify-between font-heading text-[9px] font-bold uppercase tracking-[0.2em]', equipo.color)}>
                    {equipo.nombre}
                    <span className="font-mono tracking-normal text-foreground">{PROMEDIOS[i]}</span>
                  </span>
                  <span className="text-[10px] leading-snug text-muted-foreground">{equipo.jugadores.map(([n]) => n).join(', ')}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold tabular-nums">
              <span className="text-brand">49%</span>
              <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50">
                <span className="h-full w-[49%] bg-brand" />
                <span className="h-full w-0.5 bg-[#011b2c]" />
                <span className="h-full flex-1 bg-sky-400" />
              </div>
              <span className="text-sky-300">51%</span>
            </div>
            <span className="self-center rounded-full border border-emerald-400/45 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300">
              Muy parejo
            </span>
          </div>
        )}
      </div>

      <span className="absolute bottom-1 right-2 text-[8px] uppercase tracking-widest text-muted-foreground/50">Ejemplo</span>
    </div>
  )
}
