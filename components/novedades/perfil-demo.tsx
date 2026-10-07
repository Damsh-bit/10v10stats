'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { isMotionOff } from '@/components/motion/motion-preference'
import { cn } from '@/lib/utils'

const STEP_MS = 2200

/** Ejemplo ilustrativo: no son datos reales. */
const PESTANAS = [
  {
    nombre: 'Curiosidades',
    filas: [
      { icono: '📅', texto: 'Rinde mejor los sábados: 75%' },
      { icono: '🤜', texto: 'Con Padri en el equipo gana el 80%' },
      { icono: '😈', texto: 'Su némesis es Jey: perdió 4 de 5' },
    ],
  },
  {
    nombre: 'Mapas',
    filas: [
      { icono: '🗺️', texto: 'Mirage · 18 PJ · 61%' },
      { icono: '🗺️', texto: 'Dust 2 · 16 PJ · 56%' },
      { icono: '💀', texto: 'Ancient · 9 PJ · 22%' },
    ],
  },
  {
    nombre: 'Recomendaciones',
    filas: [
      { icono: '🕵️', texto: 'Comprá más granadas, crack' },
      { icono: '🕵️', texto: 'Dejá de pushear solo por B' },
      { icono: '🕵️', texto: 'Ese AWP no es para vos' },
    ],
  },
]

/** Mini perfil: pasa de pestaña en pestaña y le cae un me gusta. */
export function PerfilDemo() {
  const [paso, setPaso] = useState(0)

  useEffect(() => {
    if (isMotionOff() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = window.setInterval(() => setPaso((n) => (n + 1) % (PESTANAS.length * 2)), STEP_MS)
    return () => window.clearInterval(timer)
  }, [])

  const pestana = Math.floor(paso / 2) % PESTANAS.length
  const conLike = paso % 2 === 1
  const actual = PESTANAS[pestana]

  return (
    <div className="relative w-full max-w-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#011b2c]/95 p-3 shadow-2xl shadow-black/50">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-400 font-mono text-[13px] font-bold text-background">RO</span>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-[15px] font-bold uppercase leading-tight tracking-wide text-foreground">Roro</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-sky-300">🔫 Fragger · #1 de 13</p>
        </div>
        <span
          className={cn(
            'flex items-center gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold',
            conLike ? 'border-rose-400/50 bg-rose-500/15 text-rose-200' : 'border-border text-muted-foreground',
          )}
        >
          <Heart key={String(conLike)} className={cn('h-3.5 w-3.5', conLike && 'like-pop fill-rose-400 text-rose-400')} aria-hidden="true" />
          {conLike ? 13 : 12}
        </span>
      </div>

      <div className="mt-2.5 flex gap-3 border-b border-white/10 text-[9px] font-semibold uppercase tracking-wider">
        {PESTANAS.map((p, i) => (
          <span key={p.nombre} className={cn('-mb-px border-b-2 pb-1.5', i === pestana ? 'border-brand text-white' : 'border-transparent text-muted-foreground')}>
            {p.nombre}
          </span>
        ))}
      </div>

      <ul key={actual.nombre} className="perfil-panel mt-2 flex flex-col gap-1.5">
        {actual.filas.map((fila) => (
          <li key={fila.texto} className="flex items-center gap-2 rounded-md bg-white/[0.04] px-2 py-1.5 text-[11px] text-foreground/90">
            <span aria-hidden="true">{fila.icono}</span>
            {fila.texto}
          </li>
        ))}
      </ul>
    </div>
  )
}
