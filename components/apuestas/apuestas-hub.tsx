'use client'

import Link from 'next/link'
import { ChevronRight, HandCoins, Trophy } from 'lucide-react'
import type { ApuestasPublicConfig } from '@/lib/apuestas/config'
import type { EventoResumen, RankingApostador, SesionJugador } from '@/lib/apuestas/tipos'
import { formatPesos, formatProb } from '@/lib/apuestas/cuotas'
import { useSesionApuestas } from './cliente'
import { SesionApuestas } from './sesion-apuestas'
import { EstadoEventoChip, JugadorAvatar } from './ui'
import { cn } from '@/lib/utils'

const PASOS = [
  ['Abrí las apuestas', 'En el generador de equipos, con los equipos que salieron, tocá “Abrir apuestas”. Quedan congelados con sus chances.'],
  ['Entrá o desafiá', 'Poné plata en el pozo de tu equipo o desafiá a un rival 1v1 (gana la partida o mejor partida).'],
  ['Pagá', 'Cada uno paga lo suyo con Mercado Pago antes de que cierren. Si el otro no paga, se te devuelve.'],
  ['Cobrá', 'Al cargar la partida se liquida sola. La banca le transfiere el premio a tu alias.'],
] as const

export function ApuestasHub({
  sesion: sesionInicial,
  eventos,
  ranking,
  config,
}: {
  sesion: SesionJugador | null
  eventos: EventoResumen[]
  ranking: RankingApostador[]
  config: ApuestasPublicConfig
}) {
  const { sesion, jugadores, setSesion } = useSesionApuestas(config.habilitadas, sesionInicial)
  const activos = eventos.filter((e) => e.evento.estado === 'abierto' || e.evento.estado === 'en_juego')
  const terminados = eventos.filter((e) => e.evento.estado === 'resuelto' || e.evento.estado === 'cancelado')

  return (
    <div className="flex flex-col gap-6">
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {PASOS.map(([titulo, texto], i) => (
          <li key={titulo} className="flex gap-3 rounded-lg border border-border bg-card/70 px-3 py-2.5">
            <span className="font-mono text-2xl font-black text-amber-300/80">{i + 1}</span>
            <span className="flex flex-col gap-0.5">
              <strong className="text-[13px] text-foreground">{titulo}</strong>
              <span className="text-[11px] leading-snug text-muted-foreground">{texto}</span>
            </span>
          </li>
        ))}
      </ol>

      <SesionApuestas key={sesion?.playerId ?? 'anon'} sesion={sesion} jugadores={jugadores} onCambio={setSesion} />

      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Partidas con apuestas</h2>
        {activos.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-4 text-[13px] text-muted-foreground">
            No hay apuestas abiertas.
            <Link href="/creacion-de-equipos" className="flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-1.5 text-[12px] font-bold uppercase tracking-wider text-black">
              <HandCoins className="h-3.5 w-3.5" aria-hidden="true" />
              Armar equipos y abrir
            </Link>
          </div>
        ) : (
          activos.map((resumen) => <EventoFila key={resumen.evento.id} resumen={resumen} />)
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <header className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Trophy className="h-4 w-4 text-amber-300" aria-hidden="true" />
          <h2 className="font-heading text-base font-bold uppercase tracking-widest text-foreground">Ranking de apostadores</h2>
        </header>
        {ranking.length === 0 ? (
          <p className="px-4 py-4 text-[12px] text-muted-foreground">Cuando se liquide la primera apuesta aparece acá quién la está levantando.</p>
        ) : (
          <ol className="flex flex-col">
            {ranking.map((r, i) => (
              <li key={r.playerId} className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-border/50 px-4 py-2 text-[12px] last:border-b-0">
                <span className="font-mono text-muted-foreground">{i + 1}</span>
                <span className="flex min-w-0 items-center gap-2">
                  <JugadorAvatar jugador={{ id: r.playerId, name: r.name, photoUrl: r.photoUrl }} size={24} />
                  <span className="truncate font-semibold text-foreground">{r.name}</span>
                </span>
                <span className="font-mono text-muted-foreground">
                  {r.ganadas}G · {r.perdidas}P
                </span>
                <span className={cn('w-24 text-right font-mono font-bold tabular-nums', r.neto >= 0 ? 'text-emerald-300' : 'text-rose-300')}>
                  {r.neto >= 0 ? '+' : '−'}
                  {formatPesos(Math.abs(r.neto))}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

      {terminados.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Historial</h2>
          {terminados.map((resumen) => (
            <EventoFila key={resumen.evento.id} resumen={resumen} />
          ))}
        </section>
      )}
    </div>
  )
}

function EventoFila({ resumen }: { resumen: EventoResumen }) {
  const { evento } = resumen
  // Zona fija: el servidor (UTC) y el navegador tienen que escribir lo mismo.
  const fecha = new Date(evento.createdAt).toLocaleString('es-AR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  })
  return (
    <Link
      href={`/apuestas/${evento.id}`}
      className="group flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-primary/50"
    >
      <span className="flex min-w-0 flex-col gap-1">
        <span className="flex items-center gap-2">
          <EstadoEventoChip estado={evento.estado} />
          <span className="text-[11px] text-muted-foreground">
            {fecha}
            {evento.mapa && ` · ${evento.mapa}`}
          </span>
        </span>
        <span className="text-[13px] font-semibold text-foreground">
          {evento.equipoANombre} <span className="font-mono text-muted-foreground">{formatProb(evento.probA)}</span> vs{' '}
          <span className="font-mono text-muted-foreground">{formatProb(1 - evento.probA)}</span> {evento.equipoBNombre}
          {evento.ganador && evento.ganador !== 'empate' && (
            <span className="ml-2 text-[12px] text-emerald-300">ganó el {evento.ganador === 'A' ? evento.equipoANombre : evento.equipoBNombre}</span>
          )}
        </span>
      </span>
      <span className="flex items-center gap-3 text-[12px] text-muted-foreground">
        <span>
          Pozo <strong className="font-mono text-foreground">{formatPesos(resumen.pozo.A + resumen.pozo.B)}</strong>
        </span>
        <span>
          {resumen.duelos} {resumen.duelos === 1 ? 'duelo' : 'duelos'}
        </span>
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </span>
    </Link>
  )
}
