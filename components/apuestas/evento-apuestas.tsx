'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Loader2, Map as MapIcon } from 'lucide-react'
import type { ApuestasPublicConfig } from '@/lib/apuestas/config'
import type { EventoDetalle, Lado, SesionJugador } from '@/lib/apuestas/tipos'
import { cuotaJusta, formatCuota, formatProb } from '@/lib/apuestas/cuotas'
import { TEAM_TONES } from '@/components/TeamGenerator/team-ui'
import { llamar, useAccion, useClaveAdmin, useSesionApuestas } from './cliente'
import { DuelosCard } from './duelos-card'
import { PagarBoton } from './pagar-boton'
import { PozoCard } from './pozo-card'
import { SesionApuestas } from './sesion-apuestas'
import { Aviso, EstadoEventoChip, JugadorChip, useCuentaRegresiva } from './ui'
import { cn } from '@/lib/utils'

export type RetornoPago = { estado: string; posicionId: string } | null

/** Página de una partida con apuestas: equipos, pozo, duelos y lo que me falta pagar. */
export function EventoApuestas({
  detalle,
  sesion: sesionInicial,
  config,
  retornoPago,
}: {
  detalle: EventoDetalle
  sesion: SesionJugador | null
  config: ApuestasPublicConfig
  retornoPago: RetornoPago
}) {
  const router = useRouter()
  const { evento, jugadores, pozo, duelos } = detalle
  const { sesion, jugadores: habilitados, setSesion } = useSesionApuestas(config.habilitadas, sesionInicial)
  const { esAdmin } = useClaveAdmin()
  const { run, pendiente, error } = useAccion()
  const restante = useCuentaRegresiva(evento.cierraAt)
  const abierto = evento.estado === 'abierto' && restante !== null
  const [avisoPago, setAvisoPago] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const verificado = useRef(false)

  // Al volver del checkout de Mercado Pago: se consulta el pago por si el webhook todavía no llegó.
  useEffect(() => {
    if (!retornoPago || verificado.current) return
    verificado.current = true
    const limpiar = () => router.replace(`/apuestas/${evento.id}`, { scroll: false })
    if (retornoPago.estado === 'error') {
      setAvisoPago({ tipo: 'error', texto: 'El pago no se completó. Podés volver a intentarlo.' })
      limpiar()
      return
    }
    llamar<{ posicion: { estado: string } }>(`/api/apuestas/posiciones/${retornoPago.posicionId}`, { accion: 'verificar' })
      .then(({ posicion }) =>
        setAvisoPago(
          posicion.estado === 'pagada'
            ? { tipo: 'ok', texto: '¡Pago acreditado! Ya estás adentro.' }
            : { tipo: 'error', texto: 'Mercado Pago todavía no confirmó el pago. Se actualiza solo apenas llegue.' },
        ),
      )
      .catch((err) => setAvisoPago({ tipo: 'error', texto: err instanceof Error ? err.message : 'No se pudo verificar el pago' }))
      .finally(() => {
        limpiar()
        router.refresh()
      })
  }, [retornoPago, evento.id, router])

  const apuestas = [...(pozo ? [pozo] : []), ...duelos]
  const misPendientes = sesion
    ? apuestas.flatMap((apuesta) =>
        apuesta.estado === 'abierta'
          ? apuesta.posiciones
              .filter((p) => p.playerId === sesion.playerId && (p.estado === 'pendiente' || p.estado === 'en_proceso'))
              .map((posicion) => ({
                posicion,
                etiqueta:
                  apuesta.tipo === 'pozo'
                    ? `Pozo · ${posicion.lado === 'A' ? evento.equipoANombre : evento.equipoBNombre}`
                    : `Duelo vs ${jugadores[apuesta.retadorId === sesion.playerId ? (apuesta.rivalId ?? '') : (apuesta.retadorId ?? '')]?.name ?? '?'}`,
              }))
          : [],
      )
    : []

  const puedeGestionar = esAdmin || (sesion && sesion.playerId === evento.creadoPor)
  const accionEvento = (accion: 'cerrar' | 'cancelar') => {
    if (accion === 'cancelar' && !window.confirm('¿Cancelar la partida? Se anulan todas las apuestas y se devuelve lo pagado.')) return
    run(accion, () => llamar(`/api/apuestas/eventos/${evento.id}`, { accion }, { admin: esAdmin }))
  }

  return (
    <div className="flex flex-col gap-5">
      <Link href="/apuestas" className="flex w-fit items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        Todas las apuestas
      </Link>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/20">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-3">
            <EstadoEventoChip estado={evento.estado} />
            {evento.mapa && (
              <span className="flex items-center gap-1">
                <MapIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {evento.mapa}
              </span>
            )}
          </span>
          {evento.estado === 'abierto' && (
            <span className="flex items-center gap-1" suppressHydrationWarning>
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              {restante ? `Cierran en ${restante}` : 'Cerrando…'}
            </span>
          )}
          {evento.ganador && (
            <span className="font-semibold text-foreground">
              {evento.ganador === 'empate' ? 'Terminó empatada' : `Ganó el ${evento.ganador === 'A' ? evento.equipoANombre : evento.equipoBNombre}`}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
          {(['A', 'B'] as Lado[]).map((lado, i) => {
            const tone = TEAM_TONES[i as 0 | 1]
            const prob = lado === 'A' ? evento.probA : 1 - evento.probA
            const ids = lado === 'A' ? evento.equipoA : evento.equipoB
            return (
              <div key={lado} className={cn('flex flex-col gap-2', i === 1 && 'sm:items-end sm:text-right')}>
                <span className={cn('font-heading text-[12px] font-bold uppercase tracking-[0.22em]', tone.text)}>
                  {lado === 'A' ? evento.equipoANombre : evento.equipoBNombre} {evento.ganador === lado && '🏆'}
                </span>
                <span className="font-mono text-4xl font-black leading-none tabular-nums text-foreground">
                  {formatProb(prob)}
                  <span className="ml-2 text-base text-muted-foreground">{formatCuota(cuotaJusta(prob))}</span>
                </span>
                <ul className={cn('flex flex-wrap gap-x-3 gap-y-1.5 text-[12px]', i === 1 && 'sm:justify-end')}>
                  {ids.map((id) => (
                    <li key={id}>
                      <JugadorChip jugador={jugadores[id]} />
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        {evento.cuotas.fuente && (
          <p className="border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
            Chances del generador al abrir las apuestas ({evento.cuotas.fuente}
            {typeof evento.cuotas.pesoFaceit === 'number' && ` · FACEIT ${Math.round(evento.cuotas.pesoFaceit * 100)}%`}).
          </p>
        )}
        {puedeGestionar && evento.estado !== 'resuelto' && evento.estado !== 'cancelado' && (
          <div className="flex flex-wrap items-center gap-3 border-t border-border bg-black/10 px-4 py-2.5 text-[12px]">
            {evento.estado === 'abierto' && (
              <button
                onClick={() => accionEvento('cerrar')}
                disabled={Boolean(pendiente)}
                className="rounded-full bg-amber-400 px-3.5 py-1.5 font-bold text-black disabled:opacity-60"
              >
                Arrancó la partida: cerrar apuestas
              </button>
            )}
            <button onClick={() => accionEvento('cancelar')} disabled={Boolean(pendiente)} className="text-rose-300 underline-offset-2 hover:underline">
              Cancelar partida
            </button>
            {pendiente && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />}
            <span className="text-muted-foreground">Cuando se cargue la partida con estos 10, todo se liquida solo.</span>
          </div>
        )}
      </section>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {avisoPago && <Aviso tipo={avisoPago.tipo}>{avisoPago.texto}</Aviso>}

      {config.habilitadas && (abierto || sesion) && (
        <SesionApuestas key={sesion?.playerId ?? 'anon'} sesion={sesion} jugadores={habilitados} onCambio={setSesion} />
      )}

      {misPendientes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Te falta pagar</h2>
          {misPendientes.map(({ posicion, etiqueta }) => (
            <PagarBoton key={posicion.id} posicion={posicion} etiqueta={etiqueta} />
          ))}
        </section>
      )}

      {pozo && <PozoCard detalle={detalle} pozo={pozo} sesion={sesion} config={config} abierto={abierto} />}
      <DuelosCard detalle={detalle} sesion={sesion} config={config} abierto={abierto} esAdmin={esAdmin} />
    </div>
  )
}
