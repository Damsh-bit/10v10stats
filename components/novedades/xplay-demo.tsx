'use client'

import { useEffect, useState } from 'react'
import { isMotionOff } from '@/components/motion/motion-preference'
import { cn } from '@/lib/utils'

const STEP_MS = 2600

/** El Mirage del 13/10: números reales de Xplay. */
const TABLA = [
  { nombre: 'Papi', k: 28, d: 12, rating: '1.68' },
  { nombre: 'Roro', k: 28, d: 16, rating: '1.64' },
  { nombre: 'Jey', k: 20, d: 16, rating: '1.30' },
]

/** Quién ganó cada ronda (P = Equipo Papi, V = Equipo Viejo). */
const RONDAS = 'VVVVVPPPVPPPVPPPVVVPPPP'

const DUELOS = [
  { a: 'Papi', b: 'Foco', ab: 7, ba: 0 },
  { a: 'Roro', b: 'Asta', ab: 9, ba: 3 },
  { a: 'Papi', b: 'Pucha', ab: 8, ba: 3 },
]

const PESTANAS = ['Tabla', 'Rondas', 'Duelos'] as const

/** Mini partida de Xplay: pasa por la tabla, las rondas y los duelos. */
export function XplayDemo() {
  const [paso, setPaso] = useState(0)

  useEffect(() => {
    if (isMotionOff() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setPaso((n) => (n + 1) % PESTANAS.length), STEP_MS)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="relative w-full max-w-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#011b2c]/95 p-3 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-heading text-[15px] font-bold uppercase leading-tight tracking-wide text-foreground">Mirage</p>
          <p className="text-[10px] uppercase tracking-wider text-emerald-300">Cargada con Xplay</p>
        </div>
        <span className="font-mono text-lg font-black text-foreground">
          <span className="text-blue-400">13</span> <span className="text-muted-foreground">-</span> <span className="text-purple-400">10</span>
        </span>
      </div>

      <div className="mt-2.5 flex gap-3 border-b border-white/10 text-[9px] font-semibold uppercase tracking-wider">
        {PESTANAS.map((p, i) => (
          <span key={p} className={cn('-mb-px border-b-2 pb-1.5', i === paso ? 'border-brand text-white' : 'border-transparent text-muted-foreground')}>
            {p}
          </span>
        ))}
      </div>

      <div key={paso} className="perfil-panel mt-2 min-h-[92px]">
        {paso === 0 && (
          <ul className="flex flex-col gap-1">
            {TABLA.map((f) => (
              <li key={f.nombre} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1 text-[11px]">
                <span className="flex-1 font-semibold text-foreground">{f.nombre}</span>
                <span className="font-mono text-muted-foreground">
                  {f.k}/{f.d}
                </span>
                <span className="w-10 text-right font-mono font-bold text-emerald-300">{f.rating}</span>
              </li>
            ))}
          </ul>
        )}
        {paso === 1 && (
          <div className="flex flex-col gap-1.5 pt-1">
            {(['P', 'V'] as const).map((equipo) => (
              <div key={equipo} className="flex gap-[2px]">
                {RONDAS.split('').map((ganador, i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-5 flex-1 rounded-[2px]',
                      ganador === equipo ? (equipo === 'P' ? 'bg-blue-400/80' : 'bg-purple-400/80') : 'bg-white/5',
                      i === 12 && 'ml-1',
                    )}
                  />
                ))}
              </div>
            ))}
            <p className="text-[10px] text-muted-foreground">Ronda por ronda: compras, kills y daño de cada uno.</p>
          </div>
        )}
        {paso === 2 && (
          <ul className="flex flex-col gap-1">
            {DUELOS.map((d) => (
              <li key={`${d.a}-${d.b}`} className="rounded-lg bg-white/5 px-2 py-1 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{d.a}</span> mató {d.ab} veces a <span className="font-semibold text-foreground">{d.b}</span> · {d.b} {d.ba}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
