'use client'

import { useEffect, useState } from 'react'
import { Zap, ZapOff } from 'lucide-react'
import { isMotionOff } from '@/components/motion/motion-preference'
import { cn } from '@/lib/utils'

const STEP_MS = 2600

/** Ejemplo ilustrativo: no son números reales. */
const ROWS = [
  { name: 'Roro', width: '92%' },
  { name: 'Padri', width: '74%' },
  { name: 'Jey', width: '58%' },
]

/** El botón "Animaciones" prendiéndose y apagándose solo: con él apagado, la mini página queda quieta. */
export function ModoLivianoDemo() {
  const [on, setOn] = useState(true)

  useEffect(() => {
    if (isMotionOff() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOn(false)
      return
    }
    const timer = window.setInterval(() => setOn((value) => !value), STEP_MS)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <div className="relative w-full max-w-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#011b2c]/95 p-3 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <span className="font-heading text-[11px] font-bold uppercase tracking-[0.25em] text-foreground">
          10v10 <span className="text-brand">Stats</span>
        </span>
        <span
          key={String(on)}
          className={cn(
            'demo-press flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider',
            on ? 'border-border text-muted-foreground' : 'border-amber-300/45 bg-amber-300/10 text-amber-300',
          )}
        >
          {on ? <Zap className="h-3.5 w-3.5" aria-hidden="true" /> : <ZapOff className="h-3.5 w-3.5" aria-hidden="true" />}
          Animaciones
        </span>
      </div>

      <ol className="mt-2.5 flex flex-col gap-2">
        {ROWS.map((row, i) => (
          <li key={row.name} className="flex items-center gap-2.5">
            <span className="w-3 font-heading text-[12px] font-black text-amber-300/90">{i + 1}</span>
            <span className="w-11 truncate text-[11px] font-semibold text-foreground">{row.name}</span>
            <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
              <span className="absolute inset-y-0 left-0 rounded-full bg-sky-400/80" style={{ width: row.width }} />
              {on && (
                <span
                  className="demo-sweep absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              )}
            </span>
          </li>
        ))}
      </ol>

      <p className={cn('mt-3 text-center text-[11px] font-semibold', on ? 'text-muted-foreground' : 'text-amber-300')}>
        {on ? 'Animaciones prendidas' : 'Modo liviano: todo quieto'}
      </p>
    </div>
  )
}
