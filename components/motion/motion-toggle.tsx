'use client'

import { Zap, ZapOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { setMotionEnabled, useMotionEnabled } from './motion-provider'

/**
 * Prende o apaga las animaciones de todo el sitio (modo liviano para PCs lentas).
 * Se recuerda entre visitas. El ícono lo resuelve el CSS con el atributo de <html>,
 * así se ve bien desde el primer pintado, antes de que hidrate React.
 */
export function MotionToggle({ className }: { className?: string }) {
  const enabled = useMotionEnabled()

  return (
    <button
      type="button"
      onClick={() => setMotionEnabled(!enabled)}
      aria-pressed={enabled}
      aria-label="Animaciones"
      title={
        enabled
          ? 'Animaciones prendidas. Tocá para apagarlas si la página anda lenta.'
          : 'Animaciones apagadas (modo liviano). Tocá para prenderlas.'
      }
      className={cn(
        'motion-toggle flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
        className,
      )}
    >
      <Zap className="motion-toggle-on h-4 w-4" aria-hidden="true" />
      <ZapOff className="motion-toggle-off h-4 w-4" aria-hidden="true" />
    </button>
  )
}
