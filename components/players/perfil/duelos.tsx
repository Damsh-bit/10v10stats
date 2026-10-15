'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Crosshair, Swords } from 'lucide-react'
import type { FilaDuelo, ResumenCifrasXplay, ResumenDuelos } from '@/lib/xplay/duelos'
import { MIN_DUELOS_DESTACADO } from '@/lib/xplay/duelos'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { cn } from '@/lib/utils'
import { Tarjeta } from './tarjeta'

type Orden = 'duelos' | 'ganados' | 'perdidos'

const ORDENES: { key: Orden; label: string }[] = [
  { key: 'duelos', label: 'Más cruces' },
  { key: 'ganados', label: 'Le gana' },
  { key: 'perdidos', label: 'Le cuesta' },
]

/** Duelos contra cada rival y las cifras de Xplay, sacados kill por kill de las partidas de Xplay. */
export function Duelos({ duelos, cifras, nombre }: { duelos: ResumenDuelos; cifras: ResumenCifrasXplay | null; nombre: string }) {
  const [orden, setOrden] = useState<Orden>('duelos')

  if (duelos.filas.length === 0 && !cifras) {
    return (
      <Tarjeta icono={<Swords className="h-4 w-4" aria-hidden="true" />} tono="rose" titulo="Duelos" subtitulo="Sale de las partidas cargadas con Xplay">
        <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">Todavía no jugó partidas de Xplay en este período.</p>
      </Tarjeta>
    )
  }

  const filas = [...duelos.filas].sort((a, b) => {
    if (orden === 'ganados') return Number(volumen(b)) - Number(volumen(a)) || b.pct - a.pct || b.mato - a.mato
    if (orden === 'perdidos') return Number(volumen(b)) - Number(volumen(a)) || a.pct - b.pct || b.murio - a.murio
    return b.mato + b.murio - (a.mato + a.murio)
  })

  return (
    <div className="flex flex-col gap-4">
      {cifras ? <CifrasXplay cifras={cifras} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Destacado titulo="Su víctima favorita" fila={duelos.victima} texto={(f) => `Le ganó ${f.mato} duelo${f.mato === 1 ? '' : 's'}`} tono="emerald" />
        <Destacado titulo="Su verdugo" fila={duelos.verdugo} texto={(f) => `Le perdió ${f.murio} duelo${f.murio === 1 ? '' : 's'}`} tono="rose" />
        <Destacado titulo="Su mejor cruce" fila={duelos.mejor} texto={(f) => `Gana el ${f.pct}% de los duelos`} tono="emerald" />
        <Destacado titulo="Su peor cruce" fila={duelos.peor} texto={(f) => `Pierde el ${100 - f.pct}% de los duelos`} tono="rose" />
      </div>

      <Tarjeta
        icono={<Swords className="h-4 w-4" aria-hidden="true" />}
        tono="rose"
        titulo="Duelos"
        subtitulo={`${nombre} contra cada rival: ganó ${duelos.mato} y perdió ${duelos.murio} (${duelos.pct}%)`}
        extra={
          <div className="flex items-center rounded-full bg-muted/40 p-0.5" role="group" aria-label="Ordenar duelos">
            {ORDENES.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                aria-pressed={orden === key}
                onClick={() => setOrden(key)}
                className={cn(
                  'h-7 rounded-full px-3 text-[11px] font-semibold uppercase tracking-wider transition-colors',
                  orden === key ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        }
      >
        <ul>
          {filas.map((f) => (
            <li key={f.key} className="border-b border-border/60 last:border-b-0">
              <FilaRival fila={f} />
            </li>
          ))}
        </ul>
        <p className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
          Un duelo es una kill entre los dos. "Le gana" y "Le cuesta" ordenan primero a los rivales con {MIN_DUELOS_DESTACADO} duelos o más.
        </p>
      </Tarjeta>
    </div>
  )
}

const volumen = (f: FilaDuelo) => f.mato + f.murio >= MIN_DUELOS_DESTACADO

function FilaRival({ fila }: { fila: FilaDuelo }) {
  const contenido = (
    <>
      {fila.player ? (
        <PlayerAvatar player={fila.player} size={32} />
      ) : (
        <span className="h-8 w-8 shrink-0 rounded-full bg-muted" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-foreground">{fila.nombre}</p>
        <p className="text-[11px] text-muted-foreground">
          Ganó <span className="font-semibold text-emerald-300">{fila.mato}</span> · perdió{' '}
          <span className="font-semibold text-rose-300">{fila.murio}</span>
          <span className="hidden sm:inline">
            {fila.headshots > 0 ? ` · ${fila.headshots} de cabeza` : ''}
            {fila.aperturasGanadas + fila.aperturasPerdidas > 0
              ? ` · aperturas ${fila.aperturasGanadas}-${fila.aperturasPerdidas}`
              : ''}
            {` · ${fila.partidas} partida${fila.partidas === 1 ? '' : 's'}`}
          </span>
        </p>
      </div>
      <span className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-rose-400/40 sm:block" aria-hidden="true">
        <span className="block h-full rounded-full bg-emerald-400/90" style={{ width: `${fila.pct}%` }} />
      </span>
      <span className={cn('w-11 text-right font-mono text-[14px] font-bold', fila.pct >= 50 ? 'text-emerald-300' : 'text-rose-300')}>
        {fila.pct}%
      </span>
    </>
  )
  const clases = 'flex items-center gap-3 px-4 py-2.5'
  return fila.player ? (
    <Link href={`/players/${fila.player.id}`} className={cn(clases, 'transition-colors hover:bg-accent/40')}>
      {contenido}
    </Link>
  ) : (
    <div className={clases}>{contenido}</div>
  )
}

function Destacado({
  titulo,
  fila,
  texto,
  tono,
}: {
  titulo: string
  fila: FilaDuelo | null
  texto: (f: FilaDuelo) => string
  tono: 'emerald' | 'rose'
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      {fila ? (
        <div className="mt-2 flex items-center gap-2.5">
          {fila.player ? <PlayerAvatar player={fila.player} size={36} /> : <span className="h-9 w-9 rounded-full bg-muted" aria-hidden="true" />}
          <div className="min-w-0">
            <p className="truncate font-heading text-lg font-bold uppercase leading-tight tracking-wide text-foreground">{fila.nombre}</p>
            <p className={cn('text-[12px]', tono === 'emerald' ? 'text-emerald-300' : 'text-rose-300')}>{texto(fila)}</p>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-[12px] text-muted-foreground">Faltan duelos para saberlo.</p>
      )}
    </div>
  )
}

function CifrasXplay({ cifras }: { cifras: ResumenCifrasXplay }) {
  const datos: { label: string; valor: string; title: string }[] = [
    { label: 'Rating', valor: cifras.rating.toFixed(2), title: 'Rating HLTV 2.1 promedio' },
    { label: 'ADR', valor: String(Math.round(cifras.adr)), title: 'Daño promedio por ronda' },
    { label: 'KAST', valor: `${Math.round(cifras.kast)}%`, title: '% de rondas con kill, asistencia, supervivencia o trade' },
    { label: 'HS%', valor: `${cifras.hsPct}%`, title: '% de kills de cabeza' },
    { label: 'Aperturas', valor: cifras.aperturasPorPartida.toFixed(1), title: 'Primeras kills de ronda por partida' },
    { label: 'Clutches', valor: String(cifras.clutches), title: 'Clutches ganados' },
  ]
  return (
    <Tarjeta
      icono={<Crosshair className="h-4 w-4" aria-hidden="true" />}
      tono="sky"
      titulo="Cifras de Xplay"
      subtitulo={`En ${cifras.partidas} partida${cifras.partidas === 1 ? '' : 's'} cargada${cifras.partidas === 1 ? '' : 's'} con Xplay`}
    >
      <dl className="grid grid-cols-3 gap-px bg-border sm:grid-cols-6">
        {datos.map((d) => (
          <div key={d.label} title={d.title} className="bg-card px-3 py-3 text-center">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d.label}</dt>
            <dd className="font-mono text-xl font-bold text-foreground">{d.valor}</dd>
          </div>
        ))}
      </dl>
    </Tarjeta>
  )
}
