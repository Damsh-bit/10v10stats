'use client'

import { useState } from 'react'
import { Coins, Loader2 } from 'lucide-react'
import type { ApuestasPublicConfig } from '@/lib/apuestas/config'
import type { ApuestaConPosiciones, EventoDetalle, Lado, SesionJugador } from '@/lib/apuestas/tipos'
import { calcularRecargo, cobroEstimadoPozo, cuotaJusta, cuotasPozo, formatCuota, formatPesos, formatProb } from '@/lib/apuestas/cuotas'
import { TEAM_TONES } from '@/components/TeamGenerator/team-ui'
import { llamar, useAccion } from './cliente'
import { Aviso, Devolucion, EstadoApuestaChip, EstadoPosicionChip, JugadorChip, MontoInput } from './ui'
import { cn } from '@/lib/utils'

/**
 * Pozo por equipos (parimutuel): cada uno pone lo que quiere en un equipo y
 * los que le pegan se reparten todo. Los que juegan sólo pueden ir con su equipo.
 */
export function PozoCard({
  detalle,
  pozo,
  sesion,
  config,
  abierto,
}: {
  detalle: EventoDetalle
  pozo: ApuestaConPosiciones
  sesion: SesionJugador | null
  config: ApuestasPublicConfig
  abierto: boolean
}) {
  const { evento, jugadores } = detalle
  const miLado: Lado | null = sesion ? (evento.equipoA.includes(sesion.playerId) ? 'A' : evento.equipoB.includes(sesion.playerId) ? 'B' : null) : null
  const [lado, setLado] = useState<Lado>(miLado ?? 'A')
  const [monto, setMonto] = useState(Math.max(1000, pozo.montoMinimo ?? config.montoMin))
  const { run, pendiente, error } = useAccion()

  const pagadas = pozo.posiciones.filter((p) => p.estado === 'pagada')
  const totales = {
    A: pagadas.filter((p) => p.lado === 'A').reduce((acc, p) => acc + p.monto, 0),
    B: pagadas.filter((p) => p.lado === 'B').reduce((acc, p) => acc + p.monto, 0),
  }
  const cuotas = cuotasPozo(totales)
  const visibles = pozo.posiciones.filter((p) => p.estado !== 'anulada' || p.resultado)
  const nombres = { A: evento.equipoANombre, B: evento.equipoBNombre }
  const recargo = calcularRecargo(monto, config.recargoPct)
  const ladoElegido = miLado ?? lado
  const verboCuota = pozo.estado === 'liquidada' ? 'pagó' : pozo.estado === 'abierta' ? 'paga hoy' : 'paga'

  const entrar = () =>
    run('pozo', () => llamar(`/api/apuestas/eventos/${evento.id}`, { accion: 'pozo', lado: ladoElegido, monto }))

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
            <Coins className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">Pozo por equipos</h2>
            <span className="text-[11px] text-muted-foreground">Los que le pegan se reparten todo, en proporción a lo que puso cada uno</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold tabular-nums text-foreground">{formatPesos(totales.A + totales.B)}</span>
          <EstadoApuestaChip estado={pozo.estado} tipo="pozo" />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        {(['A', 'B'] as const).map((l, i) => {
          const tone = TEAM_TONES[i as 0 | 1]
          const prob = l === 'A' ? evento.probA : 1 - evento.probA
          const entradas = visibles.filter((p) => p.lado === l)
          const gano = pozo.resultado === l
          return (
            <div key={l} className={cn('flex flex-col gap-2 rounded-lg border px-3 py-2.5', tone.border, tone.soft, gano && 'ring-2 ring-emerald-400/60')}>
              <div className="flex items-baseline justify-between gap-2">
                <span className={cn('font-heading text-[12px] font-bold uppercase tracking-[0.22em]', tone.text)}>
                  {nombres[l]} {gano && '🏆'}
                </span>
                <span className="font-mono text-[12px] font-semibold tabular-nums text-foreground">{formatPesos(totales[l])}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-2xl font-black tabular-nums text-foreground" title="Lo que paga hoy el pozo: total / lo puesto en este equipo">
                  {formatCuota(cuotas[l])}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {verboCuota} · justa {formatCuota(cuotaJusta(prob))} ({formatProb(prob)})
                </span>
              </div>
              {entradas.length === 0 ? (
                <span className="text-[11px] text-muted-foreground">Nadie todavía.</span>
              ) : (
                <ul className="flex flex-col gap-1">
                  {entradas.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-2 text-[12px]">
                      <JugadorChip jugador={jugadores[p.playerId]} />
                      <span className="flex shrink-0 items-center gap-1.5">
                        <span className="font-mono tabular-nums text-foreground">{formatPesos(p.monto)}</span>
                        {p.resultado === 'gana' && p.premio !== null ? (
                          <span className="font-mono text-[11px] font-bold text-emerald-300">+{formatPesos(p.premio)}</span>
                        ) : p.resultado === 'devuelve' ? (
                          <Devolucion posicion={p} />
                        ) : p.resultado === 'pierde' ? null : (
                          <EstadoPosicionChip estado={p.estado} />
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {pozo.estado === 'anulada' && pozo.motivo && (
        <p className="border-t border-border/60 px-4 py-2.5 text-[12px] text-muted-foreground">Anulado: {pozo.motivo}. Lo pagado se devuelve.</p>
      )}

      {abierto && pozo.estado === 'abierta' && sesion && (
        <div className="flex flex-col gap-3 border-t border-border bg-black/10 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] text-muted-foreground">Voy con</span>
            {(['A', 'B'] as const).map((l, i) => (
              <button
                key={l}
                type="button"
                onClick={() => setLado(l)}
                disabled={Boolean(miLado) && miLado !== l}
                className={cn(
                  'rounded-full border px-3 py-1 text-[12px] font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                  ladoElegido === l ? cn(TEAM_TONES[i as 0 | 1].border, TEAM_TONES[i as 0 | 1].soft, TEAM_TONES[i as 0 | 1].text) : 'border-border text-muted-foreground',
                )}
              >
                {nombres[l]}
              </button>
            ))}
            {miLado && <span className="text-[11px] text-muted-foreground">(jugás para el {nombres[miLado]}: sólo podés ir con tu equipo)</span>}
          </div>
          <MontoInput value={monto} onChange={setMonto} min={pozo.montoMinimo ?? config.montoMin} max={config.montoMax} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12px] text-muted-foreground">
              Si gana el {nombres[ladoElegido]} cobrás ~
              <strong className="font-mono text-foreground">{formatPesos(Math.floor(cobroEstimadoPozo(monto, ladoElegido, totales)))}</strong> con el pozo como
              está ahora{recargo > 0 && <> · pagás {formatPesos(recargo)} de comisión de MP encima</>}.
            </span>
            <button
              onClick={entrar}
              disabled={pendiente === 'pozo' || !(monto > 0)}
              className="flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-1.5 text-[12px] font-bold uppercase tracking-wider text-black transition-transform hover:scale-105 disabled:opacity-60"
            >
              {pendiente === 'pozo' && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Entrar con {formatPesos(monto)}
            </button>
          </div>
          {error && <Aviso tipo="error">{error}</Aviso>}
        </div>
      )}
    </section>
  )
}
