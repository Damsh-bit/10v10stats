'use client'

import { useState } from 'react'
import { Copy, CreditCard, Loader2 } from 'lucide-react'
import type { Posicion } from '@/lib/apuestas/tipos'
import { formatPesos, redondearCentavos } from '@/lib/apuestas/cuotas'
import { llamar, useAccion } from './cliente'
import { Aviso, EstadoPosicionChip } from './ui'
import { GlowButton } from '@/components/amicro/glow-button'
import { useWebHaptics } from '@/components/amicro/hooks/use-web-haptics'

type InicioPago = { tipo: 'checkout'; url: string } | { tipo: 'manual'; alias: string; total: number }

/**
 * Pagar una posición propia. Con Mercado Pago lleva al checkout (y al volver
 * la página verifica el pago); en modo manual muestra el alias de la banca y
 * un "Ya transferí" para que el admin lo confirme.
 */
export function PagarBoton({ posicion, etiqueta }: { posicion: Posicion; etiqueta: string }) {
  const { run, pendiente, error, setError } = useAccion()
  const [manual, setManual] = useState<{ alias: string; total: number } | null>(null)
  const [yendo, setYendo] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const haptics = useWebHaptics()
  const total = redondearCentavos(posicion.monto + posicion.recargo)

  const pagar = async () => {
    setYendo(true)
    setError(null)
    try {
      const inicio = await llamar<InicioPago>(`/api/apuestas/posiciones/${posicion.id}`, { accion: 'pagar' })
      if (inicio.tipo === 'checkout') {
        window.location.href = inicio.url
        return
      }
      setManual({ alias: inicio.alias, total: inicio.total })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo arrancar el pago')
    }
    setYendo(false)
  }

  const copiar = async (texto: string) => {
    await navigator.clipboard.writeText(texto).catch(() => null)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-amber-400/30 bg-amber-400/5 px-3 py-2.5 text-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="min-w-0 text-muted-foreground">
          {etiqueta} · <strong className="font-mono text-foreground">{formatPesos(posicion.monto)}</strong>
          {posicion.recargo > 0 && <span> + {formatPesos(posicion.recargo)} de comisión MP</span>}
        </span>
        {posicion.estado === 'en_proceso' ? (
          <EstadoPosicionChip estado="en_proceso" />
        ) : (
          <GlowButton
            onClick={() => {
              haptics.trigger('medium')
              pagar()
            }}
            disabled={yendo}
            glowColor="rgba(255, 255, 255, 0.35)"
            className="flex h-auto items-center gap-1.5 rounded-full border-0 bg-sky-500 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-none transition-colors hover:bg-sky-400 disabled:opacity-60"
          >
            {yendo ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />}
            Pagar {formatPesos(total)}
          </GlowButton>
        )}
      </div>

      {manual && posicion.estado === 'pendiente' && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-background/60 p-2.5">
          <span>
            Transferí <strong className="font-mono text-foreground">{formatPesos(manual.total)}</strong> al alias de la banca:
          </span>
          <button onClick={() => copiar(manual.alias)} className="flex w-fit items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-foreground hover:bg-accent">
            {manual.alias}
            <Copy className="h-3 w-3" aria-hidden="true" />
            {copiado && <span className="font-sans text-[10px] text-emerald-300">copiado</span>}
          </button>
          <button
            onClick={() => run('transferi', () => llamar(`/api/apuestas/posiciones/${posicion.id}`, { accion: 'transferi' }))}
            disabled={pendiente === 'transferi'}
            className="w-fit rounded-md bg-primary px-3 py-1.5 font-semibold text-white disabled:opacity-60"
          >
            Ya transferí
          </button>
          <span className="text-[11px] text-muted-foreground">Cuenta cuando el admin confirma que llegó, antes de que cierren las apuestas.</span>
        </div>
      )}

      {error && <Aviso tipo="error">{error}</Aviso>}
    </div>
  )
}
