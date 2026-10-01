'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Loader2, LogOut, Wallet } from 'lucide-react'
import type { JugadorMini, SesionJugador } from '@/lib/apuestas/tipos'
import { llamar } from './cliente'
import { Aviso } from './ui'
import { cn } from '@/lib/utils'

/**
 * "¿Quién sos?": elegir el jugador y poner el PIN que armó el admin. Ya
 * adentro, muestra con quién estás apostando y el alias donde cobrás.
 */
export function SesionApuestas({
  sesion,
  jugadores,
  onCambio,
  className,
}: {
  sesion: SesionJugador | null
  jugadores: JugadorMini[]
  onCambio: (sesion: SesionJugador | null) => void
  className?: string
}) {
  const router = useRouter()
  const [playerId, setPlayerId] = useState('')
  const [pin, setPin] = useState('')
  const [alias, setAlias] = useState(sesion?.aliasCobro ?? '')
  const [editandoAlias, setEditandoAlias] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError(null)
    try {
      const data = await llamar<{ sesion: SesionJugador }>('/api/apuestas/sesion', { playerId, pin })
      setPin('')
      setAlias(data.sesion.aliasCobro ?? '')
      onCambio(data.sesion)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar')
    } finally {
      setCargando(false)
    }
  }

  const salir = async () => {
    await llamar('/api/apuestas/sesion', undefined, { method: 'DELETE' }).catch(() => null)
    onCambio(null)
    router.refresh()
  }

  const guardarAlias = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sesion) return
    setCargando(true)
    setError(null)
    try {
      await llamar('/api/apuestas/sesion', { aliasCobro: alias }, { method: 'PATCH' })
      onCambio({ ...sesion, aliasCobro: alias.trim() || null })
      setEditandoAlias(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setCargando(false)
    }
  }

  if (sesion) {
    return (
      <div className={cn('flex flex-col gap-2 rounded-lg border border-border bg-card/70 px-3 py-2.5 text-[12px]', className)}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-muted-foreground">
            Apostás como <strong className="text-foreground">{sesion.name}</strong>
          </span>
          <button onClick={salir} className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground">
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            Salir
          </button>
        </div>
        {editandoAlias ? (
          <form onSubmit={guardarAlias} className="flex flex-wrap items-center gap-2">
            <input
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              placeholder="tu.alias.mp o CVU"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-[12px] outline-none focus:border-primary"
              aria-label="Alias o CVU para cobrar"
              autoFocus
            />
            <button type="submit" disabled={cargando} className="rounded-md bg-primary px-2.5 py-1 font-semibold text-white disabled:opacity-50">
              Guardar
            </button>
          </form>
        ) : (
          <button onClick={() => setEditandoAlias(true)} className="flex items-center gap-1.5 text-left text-muted-foreground transition-colors hover:text-foreground">
            <Wallet className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {sesion.aliasCobro ? (
              <span>
                Cobrás en <span className="font-mono text-foreground">{sesion.aliasCobro}</span> · cambiar
              </span>
            ) : (
              <span className="text-amber-300">Cargá tu alias de Mercado Pago para cobrar los premios</span>
            )}
          </button>
        )}
        {error && <Aviso tipo="error">{error}</Aviso>}
      </div>
    )
  }

  return (
    <form onSubmit={entrar} className={cn('flex flex-col gap-2 rounded-lg border border-border bg-card/70 px-3 py-3 text-[12px]', className)}>
      <span className="flex items-center gap-1.5 font-semibold text-foreground">
        <KeyRound className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
        Entrá con tu PIN para apostar
      </span>
      {jugadores.length === 0 ? (
        <span className="text-muted-foreground">Todavía nadie tiene PIN: el admin los arma desde el panel de la banca.</span>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="rounded-md border border-border bg-background px-2 py-1.5 text-[12px] text-foreground outline-none focus:border-primary"
            aria-label="Quién sos"
            required
          >
            <option value="">¿Quién sos?</option>
            {jugadores.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={8}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="PIN"
            className="w-24 rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[12px] tracking-widest outline-none focus:border-primary"
            aria-label="PIN"
            required
          />
          <button
            type="submit"
            disabled={cargando || !playerId || pin.length < 4}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 font-semibold text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {cargando && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            Entrar
          </button>
        </div>
      )}
      {error && <Aviso tipo="error">{error}</Aviso>}
    </form>
  )
}
