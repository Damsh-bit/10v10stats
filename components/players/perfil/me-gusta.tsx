'use client'

import { useEffect, useState } from 'react'
import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getDeviceId } from './dispositivo'

type Estado = { total: number; mio: boolean }

/** Me gusta del perfil: uno por navegador, se puede sacar. */
export function MeGusta({ playerId, playerName, totalInicial }: { playerId: string; playerName: string; totalInicial: number | null }) {
  const [estado, setEstado] = useState<Estado | null>(totalInicial === null ? null : { total: totalInicial, mio: false })
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Cambia en cada me gusta nuevo: remonta el ícono y repite el "latido" (CSS).
  const [latidos, setLatidos] = useState(0)

  useEffect(() => {
    let vivo = true
    fetch(`/api/players/${playerId}/me-gusta?device=${getDeviceId()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: Estado | null) => {
        if (vivo && data) setEstado(data)
      })
      .catch(() => undefined)
    return () => {
      vivo = false
    }
  }, [playerId])

  const disponible = estado !== null

  const alternar = async () => {
    if (!estado || enviando) return
    const quiero = !estado.mio
    const anterior = estado
    setEstado({ total: estado.total + (quiero ? 1 : -1), mio: quiero })
    if (quiero) setLatidos((n) => n + 1)
    setEnviando(true)
    setError(null)
    try {
      const res = await fetch(`/api/players/${playerId}/me-gusta`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ device: getDeviceId(), quiero }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error ?? 'No se pudo guardar')
      setEstado(data as Estado)
    } catch (e) {
      setEstado(anterior)
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
    } finally {
      setEnviando(false)
    }
  }

  const mio = estado?.mio ?? false

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <button
        type="button"
        onClick={alternar}
        disabled={!disponible || enviando}
        aria-pressed={mio}
        title={mio ? 'Te gusta. Tocá para sacarlo.' : `¿Te gusta ${playerName}? Dale un me gusta.`}
        className={cn(
          'flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-bold transition-colors disabled:cursor-default',
          mio
            ? 'border-rose-400/50 bg-rose-500/15 text-rose-200 hover:bg-rose-500/25'
            : 'border-border bg-card text-muted-foreground hover:border-rose-400/40 hover:text-rose-200',
        )}
      >
        <Heart
          key={latidos}
          className={cn('h-4.5 w-4.5', mio && 'fill-rose-400 text-rose-400', latidos > 0 && mio && 'like-pop')}
          aria-hidden="true"
        />
        <span className="sr-only">Me gusta a {playerName}: </span>
        <span className="font-mono tabular-nums">{estado ? estado.total : '–'}</span>
        <span className="sr-only"> en total</span>
      </button>
      {error && (
        <span role="alert" className="text-[11px] text-rose-300">
          {error}
        </span>
      )}
    </div>
  )
}
