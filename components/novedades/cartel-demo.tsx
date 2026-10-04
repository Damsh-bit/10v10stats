'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { EstiloCartel } from '@/lib/cartel/tipos'
import { ESTILOS } from '@/components/cartel/estilos'
import { cn } from '@/lib/utils'

/** Ejemplo ilustrativo: no son carteles reales. */
const CARTELES: { autor: string; para: string; mensaje: string; estilo: EstiloCartel; monto: number; caption: string }[] = [
  { autor: 'Papi', para: 'Tiky', mensaje: 'Tiky, el badge 💩 no se gana solo', estilo: 'fuego', monto: 10, caption: 'Pagás y tu cartel queda arriba de todo' },
  { autor: 'Jey', para: 'Papi', mensaje: '¿$10 nomás pusiste? Rata 🐀', estilo: 'neon', monto: 11, caption: 'Hasta que otro pone más y te lo saca' },
  { autor: 'Anónimo', para: 'Jey', mensaje: 'Jey: 0 kills, 1 cartel', estilo: 'oro', monto: 500, caption: 'Si ponés de más, más caro le sale al próximo' },
]

const DURACION_MS = 2900

function Inicial({ nombre, className }: { nombre: string; className?: string }) {
  const hue = nombre.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-mono font-bold text-background', className)}
      style={{ backgroundColor: `hsl(${hue} 65% 50%)` }}
      aria-hidden="true"
    >
      {nombre === 'Anónimo' ? '🕵️' : nombre.slice(0, 2).toUpperCase()}
    </span>
  )
}

/** Mini cartel que se va pisando: cada uno paga más que el anterior y lo saca. */
export function CartelDemo() {
  const reduceMotion = useReducedMotion()
  const [paso, setPaso] = useState(0)

  useEffect(() => {
    if (reduceMotion) return
    const timer = window.setTimeout(() => setPaso((p) => (p + 1) % CARTELES.length), DURACION_MS)
    return () => window.clearTimeout(timer)
  }, [paso, reduceMotion])

  const cartel = CARTELES[paso]
  const estilo = ESTILOS[cartel.estilo]

  return (
    <div className="relative flex w-full max-w-[340px] flex-col items-center gap-2.5">
      <div className="relative h-[136px] w-full">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={paso}
            initial={{ opacity: 0, rotateX: -80 }}
            animate={{ opacity: 1, rotateX: 0 }}
            exit={{ opacity: 0, rotateX: 80 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            style={{ transformPerspective: 800 }}
            className={cn('absolute inset-0 overflow-hidden rounded-xl border-2 bg-[#06121e]/95 shadow-2xl shadow-black/50', estilo.marco, estilo.glow)}
          >
            <div className={cn('pointer-events-none absolute inset-0', estilo.fondo)} aria-hidden="true" />
            <div className={cn('cartel-bulbs relative flex justify-between px-2 pt-1.5', estilo.acento)} aria-hidden="true">
              {Array.from({ length: 16 }, (_, i) => (
                <span key={i} className="h-1 w-1 rounded-full bg-current" />
              ))}
            </div>
            <div className="relative flex items-center gap-3 px-3 py-2">
              <div className={cn('relative flex h-[68px] w-[68px] shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 bg-black/40', estilo.marco)}>
                <Inicial nombre={cartel.para} className="h-12 w-12 text-[15px]" />
                <span className="absolute bottom-0.5 right-0.5 text-[10px]" aria-hidden="true">
                  🎯
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full bg-black/50 px-1.5 py-px font-heading text-[8px] font-bold uppercase tracking-[0.2em] text-white ring-1 ring-white/15">
                    📢 El cartel
                  </span>
                  <span className={cn('-rotate-2 rounded bg-black/60 px-1 py-px font-mono text-[9px] font-black uppercase ring-1 ring-current', estilo.acento)}>
                    Puso ${cartel.monto}
                  </span>
                </div>
                <p className="font-heading text-[18px] font-bold leading-[1.05] text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.6)]">{cartel.mensaje}</p>
                <span className="flex items-center gap-1 text-[10px] text-white/70">
                  — <Inicial nombre={cartel.autor} className="h-3.5 w-3.5 text-[6px]" /> <strong className="text-white">{cartel.autor}</strong>
                  <span className="text-white/50">· para {cartel.para}</span>
                </span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Lo que sale sacarlo: siempre sube. */}
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Para sacarlo
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={paso}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            className={cn('font-mono text-[13px] font-black tracking-normal', estilo.acento)}
          >
            ${cartel.monto + 1}
          </motion.span>
        </AnimatePresence>
      </div>

      <div className="grid h-5 place-items-center">
        {CARTELES.map((c, i) => (
          <motion.span
            key={c.caption}
            aria-hidden={i !== paso}
            initial={false}
            animate={{ opacity: i === paso ? 1 : 0, y: i === paso ? 0 : 6 }}
            transition={{ duration: 0.3 }}
            className="[grid-area:1/1] whitespace-nowrap text-[11px] font-semibold text-foreground/85"
          >
            {c.caption}
          </motion.span>
        ))}
      </div>
    </div>
  )
}
