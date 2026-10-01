'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Copy, Landmark, Loader2, LogOut, RefreshCw } from 'lucide-react'
import type { ResumenAdmin } from '@/lib/apuestas/admin'
import { formatPesos } from '@/lib/apuestas/cuotas'
import { llamar, useClaveAdmin } from './cliente'
import { Aviso, Chip } from './ui'

/**
 * Panel de la banca (el que tiene la cuenta de Mercado Pago): premios a
 * transferir, transferencias a confirmar, partidas para resolver y PINs.
 */
export function AdminApuestas() {
  const { clave, guardar } = useClaveAdmin()
  const [entrada, setEntrada] = useState('')
  const [resumen, setResumen] = useState<ResumenAdmin | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setResumen(await llamar<ResumenAdmin>('/api/apuestas/admin', undefined, { admin: true }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar')
      if (err instanceof Error && err.message.includes('Clave')) guardar(null)
    } finally {
      setCargando(false)
    }
  }, [guardar])

  useEffect(() => {
    if (clave) cargar()
  }, [clave, cargar])

  const accion = async (body: Record<string, unknown>, mensaje: string) => {
    setError(null)
    setOk(null)
    try {
      await llamar('/api/apuestas/admin', body, { admin: true })
      setOk(mensaje)
      await cargar()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo')
      return false
    }
  }

  if (!clave) {
    return (
      <details className="rounded-xl border border-border bg-card/60 px-4 py-3 text-[12px]">
        <summary className="cursor-pointer font-semibold text-muted-foreground hover:text-foreground">Panel de la banca</summary>
        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            guardar(entrada.trim())
            setEntrada('')
          }}
        >
          <input
            type="password"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            placeholder="Clave de admin"
            className="rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-primary"
            aria-label="Clave de admin"
          />
          <button type="submit" className="rounded-md bg-primary px-3 py-1.5 font-semibold text-white">
            Entrar
          </button>
        </form>
        {error && <div className="mt-2"><Aviso tipo="error">{error}</Aviso></div>}
      </details>
    )
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-amber-400/30 bg-card p-4 text-[12px]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-heading text-base font-bold uppercase tracking-widest text-foreground">
          <Landmark className="h-4 w-4 text-amber-300" aria-hidden="true" />
          Banca
        </h2>
        <span className="flex items-center gap-3">
          {resumen && (
            <span className="text-muted-foreground">
              En custodia <strong className="font-mono text-foreground">{formatPesos(resumen.enCustodia)}</strong>
            </span>
          )}
          <button onClick={cargar} className="text-muted-foreground hover:text-foreground" aria-label="Recargar">
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </button>
          <button onClick={() => guardar(null)} className="text-muted-foreground hover:text-foreground" aria-label="Salir del panel">
            <LogOut className="h-4 w-4" />
          </button>
        </span>
      </header>

      {error && <Aviso tipo="error">{error}</Aviso>}
      {ok && <Aviso tipo="ok">{ok}</Aviso>}

      {resumen && (
        <>
          <Bloque titulo={`Para transferir (${resumen.deudas.length})`} vacio="No le debés nada a nadie.">
            {resumen.deudas.map((d) => (
              <DeudaFila key={d.posicionId} deuda={d} onPagado={(ref) => accion({ accion: 'premio_pagado', posicionId: d.posicionId, referencia: ref }, `Listo: ${d.name} cobrado`)} />
            ))}
          </Bloque>

          {resumen.transferencias.length > 0 && (
            <Bloque titulo="Transferencias avisadas (modo manual)" vacio="">
              {resumen.transferencias.map((t) => (
                <div key={t.posicionId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                  <span>
                    <strong className="text-foreground">{t.name}</strong> dice que transfirió{' '}
                    <strong className="font-mono text-foreground">{formatPesos(t.monto)}</strong> ({t.apuestaTipo})
                  </span>
                  <span className="flex gap-2">
                    <button onClick={() => accion({ accion: 'transferencia', posicionId: t.posicionId, aprobar: true }, 'Transferencia confirmada')} className="rounded-md bg-emerald-500 px-2.5 py-1 font-semibold text-black">
                      Llegó
                    </button>
                    <button onClick={() => accion({ accion: 'transferencia', posicionId: t.posicionId, aprobar: false }, 'Marcada como no recibida')} className="rounded-md border border-border px-2.5 py-1 text-muted-foreground">
                      No llegó
                    </button>
                  </span>
                </div>
              ))}
            </Bloque>
          )}

          <Bloque titulo="Partidas en curso" vacio="No hay partidas con apuestas abiertas.">
            {resumen.eventosActivos.map((e) => (
              <ResolverFila
                key={e.id}
                titulo={`${e.equipoANombre} vs ${e.equipoBNombre}${e.mapa ? ` · ${e.mapa}` : ''}`}
                eventoId={e.id}
                estado={e.estado}
                partidas={resumen.partidas}
                onResolver={(matchId) => accion({ accion: 'resolver', eventoId: e.id, matchId }, 'Partida liquidada')}
              />
            ))}
          </Bloque>

          <Bloque titulo="Jugadores y PINs" vacio="">
            {resumen.jugadores.map((j) => (
              <JugadorFila
                key={j.id}
                jugador={j}
                onGuardar={(pin, habilitado) => accion({ accion: 'pin', playerId: j.id, pin, habilitado }, `${j.name} actualizado`)}
              />
            ))}
          </Bloque>
        </>
      )}
    </section>
  )
}

function Bloque({ titulo, vacio, children }: { titulo: string; vacio: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children : [children]
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{titulo}</h3>
      {items.length === 0 ? <p className="text-muted-foreground">{vacio}</p> : children}
    </div>
  )
}

function DeudaFila({ deuda, onPagado }: { deuda: ResumenAdmin['deudas'][number]; onPagado: (ref: string) => Promise<boolean> }) {
  const [ref, setRef] = useState('')
  const [enviando, setEnviando] = useState(false)
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2">
          <strong className="text-foreground">{deuda.name}</strong>
          <Chip tono={deuda.motivo === 'gana' ? 'verde' : 'gris'}>{deuda.motivo === 'gana' ? 'Premio' : 'Devolución'}</Chip>
          <Link href={`/apuestas/${deuda.apuesta.eventoId}`} className="text-muted-foreground underline-offset-2 hover:underline">
            {deuda.apuesta.tipo === 'pozo' ? 'pozo' : 'duelo'}
          </Link>
        </span>
        <strong className="font-mono text-base text-foreground">{formatPesos(deuda.monto)}</strong>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {deuda.aliasCobro ? (
          <button onClick={() => navigator.clipboard.writeText(deuda.aliasCobro ?? '')} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 font-mono text-foreground hover:bg-accent">
            {deuda.aliasCobro}
            <Copy className="h-3 w-3" aria-hidden="true" />
          </button>
        ) : (
          <span className="text-amber-300">Sin alias cargado: pedíselo</span>
        )}
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder="N° de operación (opcional)"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 outline-none focus:border-primary"
        />
        <button
          disabled={enviando}
          onClick={async () => {
            setEnviando(true)
            await onPagado(ref)
            setEnviando(false)
          }}
          className="rounded-md bg-emerald-500 px-2.5 py-1 font-semibold text-black disabled:opacity-60"
        >
          Ya le transferí
        </button>
      </div>
    </div>
  )
}

function ResolverFila({
  titulo,
  eventoId,
  estado,
  partidas,
  onResolver,
}: {
  titulo: string
  eventoId: string
  estado: string
  partidas: ResumenAdmin['partidas']
  onResolver: (matchId: string) => Promise<boolean>
}) {
  const [matchId, setMatchId] = useState('')
  const [enviando, setEnviando] = useState(false)
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
      <Link href={`/apuestas/${eventoId}`} className="font-semibold text-foreground underline-offset-2 hover:underline">
        {titulo} <span className="font-normal text-muted-foreground">({estado === 'abierto' ? 'abierta' : 'en juego'})</span>
      </Link>
      <span className="flex flex-wrap items-center gap-2">
        <select value={matchId} onChange={(e) => setMatchId(e.target.value)} className="max-w-56 rounded-md border border-border bg-background px-2 py-1" aria-label="Partida cargada">
          <option value="">Elegí la partida cargada…</option>
          {partidas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.playedAt ? new Date(p.playedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : ''} · {p.map} · {p.equipos}
            </option>
          ))}
        </select>
        <button
          disabled={!matchId || enviando}
          onClick={async () => {
            setEnviando(true)
            await onResolver(matchId)
            setEnviando(false)
          }}
          className="rounded-md bg-primary px-2.5 py-1 font-semibold text-white disabled:opacity-50"
        >
          Liquidar
        </button>
      </span>
    </div>
  )
}

function JugadorFila({
  jugador,
  onGuardar,
}: {
  jugador: ResumenAdmin['jugadores'][number]
  onGuardar: (pin: string | null, habilitado: boolean) => Promise<boolean>
}) {
  const [pin, setPin] = useState('')
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-b-0">
      <span className="flex items-center gap-2">
        <strong className="text-foreground">{jugador.name}</strong>
        {jugador.tienePin ? (
          <Chip tono={jugador.habilitado ? 'verde' : 'gris'}>{jugador.habilitado ? 'Habilitado' : 'Pausado'}</Chip>
        ) : (
          <Chip tono="gris">Sin PIN</Chip>
        )}
        {jugador.bloqueado && <Chip tono="rojo">Bloqueado</Chip>}
        {jugador.aliasCobro && <span className="font-mono text-muted-foreground">{jugador.aliasCobro}</span>}
      </span>
      <span className="flex items-center gap-2">
        <input
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
          placeholder={jugador.tienePin ? 'Nuevo PIN' : 'PIN (4-8)'}
          inputMode="numeric"
          className="w-24 rounded-md border border-border bg-background px-2 py-1 font-mono outline-none focus:border-primary"
          aria-label={`PIN de ${jugador.name}`}
        />
        <button
          disabled={pin.length < 4}
          onClick={async () => {
            if (await onGuardar(pin, true)) setPin('')
          }}
          className="rounded-md bg-primary px-2.5 py-1 font-semibold text-white disabled:opacity-40"
        >
          Guardar
        </button>
        {jugador.tienePin && (
          <button onClick={() => onGuardar(null, !jugador.habilitado)} className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            {jugador.habilitado ? 'Pausar' : 'Habilitar'}
          </button>
        )}
      </span>
    </div>
  )
}
