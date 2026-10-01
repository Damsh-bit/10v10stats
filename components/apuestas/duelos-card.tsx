'use client'

import { useMemo, useState } from 'react'
import { Loader2, MessageCircle, Swords } from 'lucide-react'
import type { ApuestasPublicConfig } from '@/lib/apuestas/config'
import type { ApuestaConPosiciones, EventoDetalle, Mercado, SesionJugador } from '@/lib/apuestas/tipos'
import {
  cuotaJusta,
  formatCuota,
  formatPesos,
  formatProb,
  montoJustoRival,
  probRendimiento,
  valorEsperado,
} from '@/lib/apuestas/cuotas'
import { llamar, useAccion } from './cliente'
import { Aviso, Chip, Devolucion, EstadoApuestaChip, EstadoPosicionChip, JugadorChip, MontoInput } from './ui'
import { cn } from '@/lib/utils'

const MERCADOS: Record<Mercado, { label: string; hint: string }> = {
  equipo: { label: 'Gana la partida', hint: 'Gana el que esté en el equipo ganador' },
  rendimiento: { label: 'Mejor partida', hint: 'Gana el de mejor (K + A) / D + daño / 100, como el MVP' },
}

type Modalidad = 'parejo' | 'justo' | 'libre'

/** Duelos 1v1 de la partida y el formulario para desafiar a alguien. */
export function DuelosCard({
  detalle,
  sesion,
  config,
  abierto,
  esAdmin,
}: {
  detalle: EventoDetalle
  sesion: SesionJugador | null
  config: ApuestasPublicConfig
  abierto: boolean
  esAdmin: boolean
}) {
  const { evento } = detalle
  const juego = sesion && (evento.equipoA.includes(sesion.playerId) || evento.equipoB.includes(sesion.playerId))

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-brand">
          <Swords className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col">
          <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">Duelos 1v1</h2>
          <span className="text-[11px] text-muted-foreground">Desafiá a uno de la partida: ponen los dos y el ganador se lleva todo</span>
        </div>
      </header>

      {abierto && sesion && juego && <DesafioForm detalle={detalle} sesion={sesion} config={config} />}
      {abierto && sesion && !juego && (
        <p className="border-b border-border/60 px-4 py-2.5 text-[12px] text-muted-foreground">Los duelos son entre los que juegan. Vos podés entrar al pozo.</p>
      )}

      {detalle.duelos.length === 0 ? (
        <p className="px-4 py-4 text-[12px] text-muted-foreground">Todavía no hay desafíos.</p>
      ) : (
        <ul className="flex flex-col">
          {detalle.duelos.map((duelo) => (
            <DueloItem key={duelo.id} duelo={duelo} detalle={detalle} sesion={sesion} esAdmin={esAdmin} />
          ))}
        </ul>
      )}
    </section>
  )
}

function DesafioForm({ detalle, sesion, config }: { detalle: EventoDetalle; sesion: SesionJugador; config: ApuestasPublicConfig }) {
  const { evento, jugadores } = detalle
  const miLado = evento.equipoA.includes(sesion.playerId) ? 'A' : 'B'
  const rivales = miLado === 'A' ? evento.equipoB : evento.equipoA
  const companeros = (miLado === 'A' ? evento.equipoA : evento.equipoB).filter((id) => id !== sesion.playerId)

  const [rivalId, setRivalId] = useState(rivales[0] ?? '')
  const [mercado, setMercado] = useState<Mercado>('equipo')
  const [miMonto, setMiMonto] = useState(Math.max(1000, config.montoMin))
  const [modalidad, setModalidad] = useState<Modalidad>('parejo')
  const [montoLibre, setMontoLibre] = useState(miMonto)
  const [mensaje, setMensaje] = useState('')
  const { run, pendiente, error } = useAccion()

  const mismoEquipo = companeros.includes(rivalId)
  const mercadoEfectivo: Mercado = mismoEquipo ? 'rendimiento' : mercado
  const miProb = mercadoEfectivo === 'equipo' ? (miLado === 'A' ? evento.probA : 1 - evento.probA) : probRendimiento(evento.cuotas.duelos, sesion.playerId, rivalId)
  const montoRival = useMemo(() => {
    const crudo = modalidad === 'parejo' ? miMonto : modalidad === 'justo' ? montoJustoRival(miMonto, miProb) : montoLibre
    return Math.min(config.montoMax, Math.max(config.montoMin, Math.round(crudo)))
  }, [modalidad, miMonto, miProb, montoLibre, config.montoMax, config.montoMin])
  const ev = valorEsperado(miMonto, montoRival, miProb)
  const rival = jugadores[rivalId]

  const desafiar = () =>
    run('desafiar', async () => {
      await llamar(`/api/apuestas/eventos/${evento.id}`, {
        accion: 'desafiar',
        rivalId,
        mercado: mercadoEfectivo,
        montoRetador: miMonto,
        montoRival,
        mensaje,
      })
      setMensaje('')
    })

  return (
    <div className="flex flex-col gap-3 border-b border-border bg-black/10 px-4 py-3 text-[12px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">Desafío a</span>
        <select
          value={rivalId}
          onChange={(e) => setRivalId(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-1 text-foreground outline-none focus:border-primary"
          aria-label="Rival"
        >
          <optgroup label="Equipo rival">
            {rivales.map((id) => (
              <option key={id} value={id}>
                {jugadores[id]?.name ?? '?'}
              </option>
            ))}
          </optgroup>
          {companeros.length > 0 && (
            <optgroup label="Mi equipo (sólo mejor partida)">
              {companeros.map((id) => (
                <option key={id} value={id}>
                  {jugadores[id]?.name ?? '?'}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <span className="text-muted-foreground">a ver quién</span>
        {(Object.keys(MERCADOS) as Mercado[]).map((m) => (
          <button
            key={m}
            type="button"
            title={MERCADOS[m].hint}
            onClick={() => setMercado(m)}
            disabled={m === 'equipo' && mismoEquipo}
            className={cn(
              'rounded-full border px-2.5 py-1 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-30',
              mercadoEfectivo === m ? 'border-primary bg-primary/20 text-white' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'equipo' ? 'gana la partida' : 'tiene mejor partida'}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-muted-foreground">Yo pongo</span>
        <MontoInput value={miMonto} onChange={setMiMonto} min={config.montoMin} max={config.montoMax} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">{rival?.name ?? 'Él'} pone</span>
        {(
          [
            ['parejo', 'Lo mismo'],
            ['justo', 'Lo justo según chances'],
            ['libre', 'Otro monto'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setModalidad(key)}
            className={cn(
              'rounded-full border px-2.5 py-1 font-semibold transition-colors',
              modalidad === key ? 'border-primary bg-primary/20 text-white' : 'border-border text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
        {modalidad === 'libre' ? (
          <MontoInput value={montoLibre} onChange={setMontoLibre} min={config.montoMin} max={config.montoMax} sugeridos={[]} />
        ) : (
          <strong className="font-mono text-foreground">{formatPesos(montoRival)}</strong>
        )}
      </div>

      <div className="rounded-md border border-border bg-background/60 px-3 py-2 leading-relaxed">
        Si ganás te llevás <strong className="font-mono text-foreground">{formatPesos(miMonto + montoRival)}</strong>. Tu chance:{' '}
        <strong className="text-foreground">{formatProb(miProb)}</strong> (cuota justa {formatCuota(cuotaJusta(miProb))}) · valor esperado{' '}
        <strong className={cn('font-mono', ev >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
          {ev >= 0 ? '+' : '−'}
          {formatPesos(Math.abs(Math.round(ev)))}
        </strong>
        {Math.abs(ev) > miMonto * 0.1 && <span className="text-muted-foreground"> · {ev > 0 ? 'te conviene a vos' : 'le conviene a él'}: probá “lo justo”.</span>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value.slice(0, 140))}
          placeholder="Un mensajito para picantear (opcional)"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 outline-none focus:border-primary"
          aria-label="Mensaje del desafío"
        />
        <button
          onClick={desafiar}
          disabled={pendiente === 'desafiar' || !rivalId}
          className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 font-bold uppercase tracking-wider text-white transition-transform hover:scale-105 disabled:opacity-60"
        >
          {pendiente === 'desafiar' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Swords className="h-3.5 w-3.5" aria-hidden="true" />}
          Desafiar
        </button>
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
    </div>
  )
}

function DueloItem({
  duelo,
  detalle,
  sesion,
  esAdmin,
}: {
  duelo: ApuestaConPosiciones
  detalle: EventoDetalle
  sesion: SesionJugador | null
  esAdmin: boolean
}) {
  const { jugadores } = detalle
  const { run, pendiente, error } = useAccion()
  const retador = jugadores[duelo.retadorId ?? '']
  const rival = jugadores[duelo.rivalId ?? '']
  const montoRetador = duelo.montoRetador ?? 0
  const montoRival = duelo.montoRival ?? 0
  const soyRival = sesion?.playerId === duelo.rivalId
  const soyRetador = sesion?.playerId === duelo.retadorId
  const hayPlata = duelo.posiciones.some((p) => p.estado === 'pagada' || p.estado === 'en_proceso')
  const ganador =
    duelo.estado === 'liquidada' && duelo.resultado !== 'nula'
      ? duelo.resultado === duelo.ladoRetador
        ? retador
        : rival
      : null

  const responder = (accion: 'aceptar' | 'rechazar' | 'cancelar') =>
    run(accion, () => llamar(`/api/apuestas/duelos/${duelo.id}`, { accion }))
  const anular = () => run('anular', () => llamar('/api/apuestas/admin', { accion: 'anular', apuestaId: duelo.id }, { admin: true }))

  const mandarPorWhatsapp = () => {
    const texto = `${retador?.name} te desafió en 10v10 Stats: ${formatPesos(montoRetador)} contra ${formatPesos(montoRival)} a ver quién ${
      duelo.mercado === 'equipo' ? 'gana la partida' : 'tiene mejor partida'
    }. Aceptá acá: ${window.location.href}`
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <li className="flex flex-col gap-2 border-b border-border/50 px-4 py-3 text-[12px] last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 flex-wrap items-center gap-1.5">
          <JugadorChip jugador={retador} />
          <span className="text-muted-foreground">desafió a</span>
          <JugadorChip jugador={rival} />
        </span>
        <span className="flex items-center gap-1.5">
          <Chip tono="gris">{MERCADOS[duelo.mercado].label}</Chip>
          <EstadoApuestaChip estado={duelo.estado} />
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
        <span>
          {retador?.name} pone <strong className="font-mono text-foreground">{formatPesos(montoRetador)}</strong> · {rival?.name} pone{' '}
          <strong className="font-mono text-foreground">{formatPesos(montoRival)}</strong> · el ganador cobra{' '}
          <strong className="font-mono text-foreground">{formatPesos(montoRetador + montoRival)}</strong>
        </span>
        {duelo.prob !== null && (
          <span>
            Chance de {retador?.name}: <strong className="text-foreground">{formatProb(duelo.prob)}</strong>
          </span>
        )}
      </div>

      {duelo.mensaje && <p className="border-l-2 border-primary/50 pl-2 italic text-foreground/90">“{duelo.mensaje}”</p>}

      {duelo.posiciones.length > 0 && duelo.estado !== 'liquidada' && (
        <div className="flex flex-wrap gap-3">
          {duelo.posiciones.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5">
              <span className="text-muted-foreground">{jugadores[p.playerId]?.name}</span>
              {p.resultado === 'devuelve' ? <Devolucion posicion={p} /> : <EstadoPosicionChip estado={p.estado} />}
            </span>
          ))}
        </div>
      )}

      {ganador && (
        <p className="font-semibold text-emerald-300">
          🏆 Ganó {ganador.name} y cobra {formatPesos(montoRetador + montoRival)}
        </p>
      )}
      {(duelo.estado === 'anulada' || (duelo.estado === 'liquidada' && duelo.resultado === 'nula')) && duelo.motivo && (
        <p className="text-muted-foreground">
          {duelo.estado === 'anulada' ? 'Anulado' : 'Sin ganador'}: {duelo.motivo}.{hayPlata && ' Lo pagado se devuelve.'}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {soyRival && duelo.estado === 'propuesta' && (
          <>
            <button
              onClick={() => responder('aceptar')}
              disabled={Boolean(pendiente)}
              className="rounded-full bg-emerald-500 px-3.5 py-1.5 font-bold text-black transition-transform hover:scale-105 disabled:opacity-60"
            >
              Acepto
            </button>
            <button
              onClick={() => responder('rechazar')}
              disabled={Boolean(pendiente)}
              className="rounded-full border border-border px-3.5 py-1.5 font-semibold text-muted-foreground hover:text-foreground disabled:opacity-60"
            >
              Paso
            </button>
          </>
        )}
        {soyRetador && duelo.estado === 'propuesta' && (
          <button
            onClick={mandarPorWhatsapp}
            className="flex items-center gap-1.5 rounded-full border border-emerald-400/40 px-3 py-1.5 font-semibold text-emerald-300 hover:bg-emerald-400/10"
          >
            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
            Mandárselo por WhatsApp
          </button>
        )}
        {soyRetador && (duelo.estado === 'propuesta' || duelo.estado === 'abierta') && !hayPlata && (
          <button onClick={() => responder('cancelar')} disabled={Boolean(pendiente)} className="text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
            Cancelar desafío
          </button>
        )}
        {esAdmin && ['propuesta', 'abierta', 'confirmada'].includes(duelo.estado) && (
          <button onClick={anular} disabled={Boolean(pendiente)} className="text-rose-300 underline-offset-2 hover:underline">
            Anular (admin)
          </button>
        )}
        {pendiente && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />}
      </div>
      {error && <Aviso tipo="error">{error}</Aviso>}
    </li>
  )
}
