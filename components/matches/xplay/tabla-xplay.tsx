'use client'

import { useMemo, useState } from 'react'
import type { DetalleXplay } from '@/lib/xplay/leer'
import type { CifrasXplay, EquipoXplay, Lado, PremiosEquipo } from '@/lib/xplay/tipos'
import { cn } from '@/lib/utils'
import { NombreJugador, tonoEquipo, type Participante } from './comun'

type LadoVista = 'general' | 't' | 'ct'
type Categoria = 'principal' | 'punteria' | 'granadas' | 'diversion'

type Fila = { p: Participante; c: CifrasXplay; hs: number | null }

type Columna = {
  key: string
  label: string
  title: string
  valor: (f: Fila) => number | null
  texto?: (v: number) => string
  /** Pinta el valor: verde si es bueno, rojo si es malo. */
  tono?: (v: number) => 'bueno' | 'malo' | null
}

const pctTexto = (v: number) => `${Math.round(v)}%`

const COLUMNAS: Record<Categoria, Columna[]> = {
  principal: [
    { key: 'k', label: 'K', title: 'Kills', valor: (f) => f.c.kills },
    { key: 'd', label: 'D', title: 'Muertes', valor: (f) => f.c.deaths },
    { key: 'a', label: 'A', title: 'Asistencias', valor: (f) => f.c.assists },
    {
      key: 'dif',
      label: '+/-',
      title: 'Kills menos muertes',
      valor: (f) => f.c.kills - f.c.deaths,
      texto: (v) => (v > 0 ? `+${v}` : String(v)),
      tono: (v) => (v > 0 ? 'bueno' : v < 0 ? 'malo' : null),
    },
    { key: 'adr', label: 'ADR', title: 'Daño promedio por ronda', valor: (f) => f.c.adr, texto: (v) => String(Math.round(v)), tono: (v) => (v >= 90 ? 'bueno' : v < 60 ? 'malo' : null) },
    { key: 'kast', label: 'KAST', title: '% de rondas con kill, asistencia, supervivencia o trade', valor: (f) => f.c.kast, texto: pctTexto },
    { key: 'hs', label: 'HS%', title: '% de kills de cabeza', valor: (f) => f.hs, texto: pctTexto },
    { key: 'ap', label: '1ª', title: 'Kills de apertura (la primera de la ronda)', valor: (f) => f.c.aperturas },
    { key: 'cl', label: 'Clutch', title: 'Clutches ganados', valor: (f) => f.c.clutches },
    {
      key: 'rating',
      label: 'Rating',
      title: 'Rating HLTV 2.1',
      valor: (f) => f.c.rating,
      texto: (v) => v.toFixed(2),
      tono: (v) => (v >= 1.15 ? 'bueno' : v < 0.85 ? 'malo' : null),
    },
  ],
  punteria: [
    { key: 'prec', label: 'Precisión', title: 'Balas con rifle que pegan cuando ve al rival', valor: (f) => f.c.precisionRifle, texto: pctTexto },
    { key: 'pb', label: '1ª bala', title: 'Precisión de la primera bala con rifle', valor: (f) => f.c.primeraBala, texto: pctTexto },
    { key: 'hsr', label: 'HS rifle', title: '% de tiros a la cabeza con rifle', valor: (f) => f.c.hsRifle, texto: pctTexto },
    { key: 'hsp', label: 'HS pistola', title: '% de tiros a la cabeza con pistola', valor: (f) => f.c.hsPistola, texto: pctTexto },
    { key: 'tk', label: 'T. kill', title: 'Segundos que tarda en matar con rifle', valor: (f) => f.c.tiempoKill, texto: (v) => `${v.toFixed(2)}s` },
  ],
  granadas: [
    { key: 'fl', label: 'Flasheados', title: 'Rivales flasheados', valor: (f) => f.c.flasheados },
    { key: 'sf', label: 'Seg. flash', title: 'Segundos de ceguera que les hizo a los rivales', valor: (f) => f.c.segundosFlash, texto: (v) => `${Math.round(v)}s` },
    { key: 'af', label: 'Asist. flash', title: 'Kills de compañeros sobre rivales que había flasheado', valor: (f) => f.c.asistFlash },
    { key: 'dg', label: 'Daño gran.', title: 'Daño con granadas', valor: (f) => f.c.danioGranadas },
    { key: 'q', label: 'Quemados', title: 'Rivales dañados con molotov o incendiaria', valor: (f) => f.c.quemados },
    { key: 'sm', label: 'Smokes', title: 'Smokes tiradas', valor: (f) => f.c.smokes },
  ],
  diversion: [
    { key: 'cu', label: 'Cuchillo', title: 'Kills con cuchillo', valor: (f) => f.c.cuchillazos },
    { key: 'ze', label: 'Zeus', title: 'Kills con la Zeus', valor: (f) => f.c.zeus },
    { key: 'ga', label: 'Gallinas', title: 'Gallinas asesinadas', valor: (f) => f.c.gallinas },
    { key: 'ai', label: 'Seg. solo', title: 'Segundos jugados lejos de sus compañeros', valor: (f) => f.c.segundosAislado, texto: (v) => `${Math.round(v)}s` },
    { key: 'in', label: 'Inspecciones', title: 'Veces que miró el arma', valor: (f) => f.c.inspecciones },
  ],
}

const CATEGORIAS: { key: Categoria; label: string }[] = [
  { key: 'principal', label: 'Principal' },
  { key: 'punteria', label: 'Puntería' },
  { key: 'granadas', label: 'Granadas' },
  { key: 'diversion', label: 'Diversión' },
]

const PREMIOS: { key: keyof PremiosEquipo; emoji: string; label: string; detalle: string }[] = [
  { key: 'entry', emoji: '🚪', label: 'Entry fragger', detalle: 'El que más abrió las rondas' },
  { key: 'clutcher', emoji: '🧊', label: 'Clutcher', detalle: 'El que mejor jugó en desventaja' },
  { key: 'soporte', emoji: '🤝', label: 'Soporte', detalle: 'Flashes y granadas para el equipo' },
  { key: 'trader', emoji: '⚔️', label: 'Vengador', detalle: 'El que más vengó a sus compañeros' },
  { key: 'superviviente', emoji: '🛡️', label: 'Superviviente', detalle: 'El que más rondas terminó vivo' },
  { key: 'wallbanger', emoji: '🧱', label: 'Wallbanger', detalle: 'Daño a través de paredes' },
  { key: 'smokes', emoji: '🌫️', label: 'Rey de las smokes', detalle: 'Según SCOPE, el que mejor se manejó con las smokes' },
  { key: 'tradeado', emoji: '🎯', label: 'Carnada', detalle: 'Al que más vengaron' },
  { key: 'desafortunado', emoji: '🍀', label: 'Desafortunado', detalle: 'Murió más veces sin culpa' },
]

/** HS% de cada jugador en un lado, contado kill por kill. */
function hsPorLado(detalle: DetalleXplay, participantes: Map<number, Participante>, lado: Lado) {
  const ladoDe = (ronda: number, cuenta: number) => {
    const equipo = participantes.get(cuenta)?.equipo
    return detalle.rondas[ronda - 1]?.equipos.find((e) => e.equipo === equipo)?.lado
  }
  const cuenta = new Map<number, { kills: number; hs: number }>()
  for (const k of detalle.kills) {
    if (k.killer === null || k.fuegoAmigo || ladoDe(k.ronda, k.killer) !== lado) continue
    const actual = cuenta.get(k.killer) ?? { kills: 0, hs: 0 }
    actual.kills++
    if (k.headshot) actual.hs++
    cuenta.set(k.killer, actual)
  }
  return cuenta
}

export function TablaXplay({
  detalle,
  participantes,
  nombres,
  ganador,
  mvpPlayerId,
}: {
  detalle: DetalleXplay
  participantes: Map<number, Participante>
  nombres: Record<EquipoXplay, string>
  ganador: EquipoXplay | null
  mvpPlayerId?: string
}) {
  const [lado, setLado] = useState<LadoVista>('general')
  const [categoria, setCategoria] = useState<Categoria>('principal')
  const columnas = COLUMNAS[categoria]

  const filasPorEquipo = useMemo(() => {
    const hsLado = lado === 'general' ? null : hsPorLado(detalle, participantes, lado === 't' ? 'T' : 'CT')
    const filas: Record<EquipoXplay, Fila[]> = { 1: [], 2: [] }
    for (const j of detalle.jugadores) {
      const p = participantes.get(j.accountId)
      const c = j.stats?.[lado]
      if (!p || !c) continue
      const propio = hsLado?.get(j.accountId)
      const hs = lado === 'general' ? j.hsPct : propio && propio.kills > 0 ? (propio.hs / propio.kills) * 100 : 0
      filas[j.equipo].push({ p, c, hs })
    }
    for (const equipo of [1, 2] as EquipoXplay[]) filas[equipo].sort((a, b) => b.c.rating - a.c.rating || b.c.kills - a.c.kills)
    return filas
  }, [detalle, participantes, lado])

  const orden: EquipoXplay[] = detalle.equipoA === 1 ? [1, 2] : [2, 1]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Selector
          opciones={[
            { key: 'general', label: 'Todo' },
            { key: 't', label: 'T' },
            { key: 'ct', label: 'CT' },
          ]}
          valor={lado}
          onChange={setLado}
          ariaLabel="Lado"
        />
        <Selector opciones={CATEGORIAS} valor={categoria} onChange={setCategoria} ariaLabel="Qué cifras ver" />
      </div>

      {orden.map((equipo) => {
        const tono = tonoEquipo(nombres[equipo])
        const resumen = detalle.equipos.find((e) => e.equipo === equipo)
        const puntaje = detalle.marcador[equipo - 1]
        const filas = filasPorEquipo[equipo]
        return (
          <div key={equipo} className={cn('overflow-hidden rounded-xl border bg-card', ganador === equipo ? tono.borde : 'border-border')}>
            <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
              <span className={cn('flex items-center gap-2 text-[14px] font-bold', tono.texto)}>
                {nombres[equipo]}
                {ganador === equipo ? (
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Ganó</span>
                ) : null}
              </span>
              <span className="flex items-baseline gap-2 font-mono">
                {resumen ? (
                  <span className="text-[11px] text-muted-foreground">
                    T {resumen.puntajeT} · CT {resumen.puntajeCT}
                  </span>
                ) : null}
                <span className="text-lg font-bold text-foreground">{puntaje}</span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="sticky left-0 z-10 bg-card px-3 py-2 font-medium">Jugador</th>
                    {columnas.map((col) => (
                      <th key={col.key} title={col.title} className="whitespace-nowrap px-2 py-2 text-right font-medium">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr key={fila.p.accountId} className="border-t border-border">
                      <td className="sticky left-0 z-10 max-w-[170px] bg-card px-3 py-2">
                        <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                          <NombreJugador p={fila.p} conNick className="min-w-0" />
                          {mvpPlayerId && fila.p.player?.id === mvpPlayerId ? (
                            <span title="MVP de la partida" className="shrink-0 text-[12px]">
                              👑
                            </span>
                          ) : null}
                        </span>
                      </td>
                      {columnas.map((col) => {
                        const v = col.valor(fila)
                        const tono = v === null ? null : col.tono?.(v)
                        return (
                          <td
                            key={col.key}
                            className={cn(
                              'whitespace-nowrap px-2 py-2 text-right font-mono text-[12px] sm:text-[13px]',
                              tono === 'bueno' ? 'text-emerald-300' : tono === 'malo' ? 'text-rose-300' : 'text-foreground',
                              col.key === 'rating' && 'font-bold',
                            )}
                          >
                            {v === null ? '—' : col.texto ? col.texto(v) : v}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      <Premios detalle={detalle} participantes={participantes} nombres={nombres} orden={orden} />
    </div>
  )
}

function Premios({
  detalle,
  participantes,
  nombres,
  orden,
}: {
  detalle: DetalleXplay
  participantes: Map<number, Participante>
  nombres: Record<EquipoXplay, string>
  orden: EquipoXplay[]
}) {
  if (detalle.equipos.length === 0) return null
  return (
    <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Premios de la partida</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {orden.map((equipo) => {
          const premios = detalle.equipos.find((e) => e.equipo === equipo)?.premios ?? {}
          return (
            <div key={equipo}>
              <p className={cn('mb-2 text-[12px] font-bold', tonoEquipo(nombres[equipo]).texto)}>{nombres[equipo]}</p>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {PREMIOS.filter((premio) => premios[premio.key]).map((premio) => {
                  const p = participantes.get(premios[premio.key]!)
                  if (!p) return null
                  return (
                    <li key={premio.key} title={premio.detalle} className="flex items-center gap-2 rounded-lg bg-muted/30 px-2 py-1.5">
                      <span className="text-base" aria-hidden="true">
                        {premio.emoji}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">{premio.label}</span>
                        <span className="block truncate text-[13px] font-semibold text-foreground">{p.nombre}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function Selector<T extends string>({
  opciones,
  valor,
  onChange,
  ariaLabel,
}: {
  opciones: { key: T; label: string }[]
  valor: T
  onChange: (valor: T) => void
  ariaLabel: string
}) {
  return (
    <div className="flex flex-wrap items-center rounded-full bg-muted/40 p-0.5" role="group" aria-label={ariaLabel}>
      {opciones.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={valor === o.key}
          onClick={() => onChange(o.key)}
          className={cn(
            'h-7 rounded-full px-3 text-[11px] font-semibold uppercase tracking-wider transition-colors',
            valor === o.key ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
