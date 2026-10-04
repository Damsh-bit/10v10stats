'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EyeOff, Eye, Loader2, ShieldAlert } from 'lucide-react'
import { formatPesos } from '@/lib/apuestas/cuotas'
import { formatDuracion, type EntradaHistorial } from '@/lib/cartel/tipos'
import { JugadorAvatar } from '@/components/apuestas/ui'
import { cn } from '@/lib/utils'
import { FotoCartel, useAhora } from './cartel-billboard'
import { ESTILOS } from './estilos'

const CLAVE_KEY = 'cartel-admin-key'
const HEADER_ADMIN = 'x-cartel-admin'

/** Fecha fija en hora argentina: igual en el servidor y en el navegador. */
function formatFecha(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function useClaveModeracion() {
  const [clave, setClave] = useState<string | null>(null)
  useEffect(() => {
    try {
      setClave(sessionStorage.getItem(CLAVE_KEY))
    } catch {
      // sin sessionStorage: se pide cada vez
    }
  }, [])
  const guardar = useCallback((nueva: string | null) => {
    try {
      if (nueva) sessionStorage.setItem(CLAVE_KEY, nueva)
      else sessionStorage.removeItem(CLAVE_KEY)
    } catch {
      // sin sessionStorage
    }
    setClave(nueva)
  }, [])
  return { clave, guardar }
}

function Miniatura({ entrada }: { entrada: EntradaHistorial }) {
  const estilo = ESTILOS[entrada.estilo]
  const marco = cn('relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 bg-black/40 sm:h-16 sm:w-16', estilo.marco)
  const foto = entrada.imagenUrl ?? entrada.objetivo?.photoUrl ?? null
  if (foto) {
    return (
      <div className={marco}>
        <FotoCartel src={foto} alt="" sizes="64px" />
      </div>
    )
  }
  return (
    <div className={cn(marco, 'flex items-center justify-center text-[26px]')} aria-hidden="true">
      {entrada.oculto ? '🚫' : estilo.emoji}
    </div>
  )
}

function Duracion({ entrada, actual }: { entrada: EntradaHistorial; actual: boolean }) {
  const ahora = useAhora()
  if (entrada.hastaAt) {
    return (
      <>
        Estuvo <strong className="text-foreground/90">{formatDuracion(Date.parse(entrada.hastaAt) - Date.parse(entrada.pagadoAt))}</strong> arriba
        {entrada.sacadoPor && (
          <>
            {' '}
            · lo sacó <strong className="text-foreground/90">{entrada.sacadoPor}</strong>
          </>
        )}
      </>
    )
  }
  if (!actual || ahora === null) return null
  return (
    <>
      Lleva <strong className="text-foreground/90">{formatDuracion(ahora - Date.parse(entrada.pagadoAt))}</strong> arriba
    </>
  )
}

/** Todos los carteles que estuvieron arriba, del más nuevo al más viejo (con moderación para el admin). */
export function HistorialCarteles({ entradas, actualId }: { entradas: EntradaHistorial[]; actualId: string | null }) {
  const router = useRouter()
  const { clave, guardar } = useClaveModeracion()
  const [pendiente, setPendiente] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [claveInput, setClaveInput] = useState('')

  const entrar = async () => {
    setError(null)
    setPendiente('entrar')
    const response = await fetch('/api/cartel/admin', { headers: { [HEADER_ADMIN]: claveInput }, cache: 'no-store' }).catch(() => null)
    setPendiente(null)
    if (response?.ok) {
      guardar(claveInput)
      setClaveInput('')
    } else setError('Clave incorrecta')
  }

  const moderar = async (id: string, accion: 'ocultar' | 'mostrar') => {
    if (!clave) return
    setError(null)
    setPendiente(id)
    try {
      const response = await fetch('/api/cartel/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [HEADER_ADMIN]: clave },
        body: JSON.stringify({ accion, id }),
      })
      const data = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? 'No se pudo moderar')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo moderar')
    } finally {
      setPendiente(null)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {entradas.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-[13px] text-muted-foreground">Todavía no hubo ningún cartel.</p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {entradas.map((entrada) => {
            const estilo = ESTILOS[entrada.estilo]
            const actual = entrada.id === actualId
            return (
              <li
                key={entrada.id}
                className={cn(
                  'relative flex gap-3 overflow-hidden rounded-xl border bg-card/80 p-3 backdrop-blur-sm',
                  actual ? cn('border-2', estilo.marco) : 'border-border',
                )}
              >
                <span className={cn('absolute inset-y-0 left-0 w-1', actual ? 'bg-current' : 'bg-white/10', estilo.acento)} aria-hidden="true" />
                <Miniatura entrada={entrada} />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                    {actual && (
                      <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/40">
                        Arriba ahora
                      </span>
                    )}
                    <span className={cn('rounded bg-black/40 px-1.5 py-0.5 font-mono text-[11px] font-black', entrada.esCasa ? 'text-white/70' : estilo.acento)}>
                      {entrada.esCasa ? 'De la casa' : formatPesos(entrada.monto)}
                    </span>
                    <span>{formatFecha(entrada.pagadoAt)}</span>
                  </div>

                  <p className={cn('font-heading text-[17px] font-bold leading-tight text-foreground [overflow-wrap:anywhere]', entrada.oculto && 'italic text-muted-foreground')}>
                    {entrada.oculto ? 'Cartel bajado por la moderación' : entrada.mensaje}
                  </p>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                    <span className="inline-flex min-w-0 items-center gap-1.5">
                      —{entrada.autorJugador && <JugadorAvatar jugador={entrada.autorJugador} size={18} />}
                      <span className="truncate font-semibold text-foreground">{entrada.autor}</span>
                    </span>
                    {entrada.objetivo && (
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        🎯 para <JugadorAvatar jugador={entrada.objetivo} size={18} />
                        <span className="truncate font-semibold text-foreground">{entrada.objetivo.name}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    <Duracion entrada={entrada} actual={actual} />
                  </p>
                </div>

                {clave && !entrada.esCasa && (
                  <button
                    type="button"
                    onClick={() => moderar(entrada.id, entrada.oculto ? 'mostrar' : 'ocultar')}
                    disabled={pendiente === entrada.id}
                    className={cn(
                      'flex h-fit shrink-0 items-center gap-1 self-start rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50',
                      entrada.oculto ? 'border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10' : 'border-rose-400/40 text-rose-300 hover:bg-rose-400/10',
                    )}
                  >
                    {pendiente === entrada.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    ) : entrada.oculto ? (
                      <Eye className="h-3 w-3" aria-hidden="true" />
                    ) : (
                      <EyeOff className="h-3 w-3" aria-hidden="true" />
                    )}
                    {entrada.oculto ? 'Mostrar' : 'Bajar'}
                  </button>
                )}
              </li>
            )
          })}
        </ol>
      )}

      <details className="group rounded-lg border border-border/60 bg-card/40 px-3 py-2 text-[12px] text-muted-foreground">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold hover:text-foreground">
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
          Moderación
        </summary>
        <div className="mt-2 flex flex-col gap-2">
          {clave ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>Estás moderando: cada cartel tiene su botón para bajarlo o volver a mostrarlo. Bajarlo no cambia el precio.</span>
              <button type="button" onClick={() => guardar(null)} className="rounded-md border border-border px-2 py-1 font-semibold hover:text-foreground">
                Salir
              </button>
            </div>
          ) : (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                entrar()
              }}
            >
              <input
                type="password"
                value={claveInput}
                onChange={(event) => setClaveInput(event.target.value)}
                placeholder="Clave de moderación"
                autoComplete="off"
                className="min-w-0 flex-1 rounded-md border border-border bg-background/60 px-2.5 py-1.5 text-foreground outline-none focus:border-brand"
              />
              <button type="submit" disabled={!claveInput || pendiente === 'entrar'} className="rounded-md bg-primary px-3 py-1.5 font-semibold text-white disabled:opacity-50">
                Entrar
              </button>
            </form>
          )}
          {error && <p className="text-rose-300">{error}</p>}
        </div>
      </details>
    </div>
  )
}
