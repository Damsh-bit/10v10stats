'use client'

import { Fragment, useMemo, useState } from 'react'
import { Bomb, Clock, Crosshair, Scissors, Skull } from 'lucide-react'
import type { DetalleXplay } from '@/lib/xplay/leer'
import type { Compra, EquipoXplay, MotivoRonda } from '@/lib/xplay/tipos'
import { nombreArma } from '@/lib/xplay/armas'
import { cn } from '@/lib/utils'
import { segundosATexto, tonoEquipo, type Participante } from './comun'

const MOTIVOS: Record<MotivoRonda, { icono: typeof Bomb; texto: string }> = {
  bomba: { icono: Bomb, texto: 'explotó la bomba' },
  desactivada: { icono: Scissors, texto: 'desactivaron la bomba' },
  eliminacion: { icono: Skull, texto: 'eliminaron a todos' },
  tiempo: { icono: Clock, texto: 'se terminó el tiempo' },
  otro: { icono: Crosshair, texto: 'otro motivo' },
}

const COMPRAS: Record<Compra, { texto: string; clase: string }> = {
  pistolas: { texto: 'Pistolas', clase: 'bg-sky-500/15 text-sky-300' },
  eco: { texto: 'Eco', clase: 'bg-rose-500/15 text-rose-300' },
  semi: { texto: 'Semi', clase: 'bg-amber-400/15 text-amber-200' },
  full: { texto: 'Full', clase: 'bg-emerald-500/15 text-emerald-300' },
}

/** Rondas: quién ganó cada una y cómo, y el detalle de la elegida (compras, kills, daño). */
export function RondasXplay({
  detalle,
  participantes,
  nombres,
}: {
  detalle: DetalleXplay
  participantes: Map<number, Participante>
  nombres: Record<EquipoXplay, string>
}) {
  const [elegida, setElegida] = useState(1)
  const orden: EquipoXplay[] = detalle.equipoA === 1 ? [1, 2] : [2, 1]
  const mitad = detalle.rondasEnMitad ?? 12
  const ronda = detalle.rondas[elegida - 1]
  const kills = useMemo(() => detalle.kills.filter((k) => k.ronda === elegida), [detalle.kills, elegida])

  const resumen = useMemo(() => {
    const porEquipo = (equipo: EquipoXplay) => {
      const ganadas = detalle.rondas.filter((r) => r.ganador === equipo)
      const pistolas = detalle.rondas.filter((r) => r.equipos.find((e) => e.equipo === equipo)?.compra === 'pistolas')
      const conCompra = (compra: Compra) => detalle.rondas.filter((r) => r.equipos.find((e) => e.equipo === equipo)?.compra === compra)
      return {
        pistolas: `${pistolas.filter((r) => r.ganador === equipo).length}/${pistolas.length}`,
        ecos: `${conCompra('eco').filter((r) => r.ganador === equipo).length}/${conCompra('eco').length}`,
        full: `${conCompra('full').filter((r) => r.ganador === equipo).length}/${conCompra('full').length}`,
        bombas: ganadas.filter((r) => r.motivo === 'bomba').length,
        desactivadas: ganadas.filter((r) => r.motivo === 'desactivada').length,
      }
    }
    return { 1: porEquipo(1), 2: porEquipo(2) } as Record<EquipoXplay, ReturnType<typeof porEquipo>>
  }, [detalle.rondas])

  if (detalle.rondas.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <div className="overflow-x-auto pb-1">
          <div className="inline-grid min-w-full gap-y-1" style={{ gridTemplateColumns: `110px repeat(${detalle.rondas.length}, minmax(26px, 1fr))` }}>
            {orden.map((equipo) => {
              const tono = tonoEquipo(nombres[equipo])
              return (
                <Fragment key={equipo}>
                  <span className={cn('flex items-center truncate pr-2 text-[11px] font-bold uppercase tracking-wider', tono.texto)}>{nombres[equipo]}</span>
                  {detalle.rondas.map((r) => {
                    const gano = r.ganador === equipo
                    const Icono = MOTIVOS[r.motivo].icono
                    return (
                      <button
                        key={r.n}
                        type="button"
                        onClick={() => setElegida(r.n)}
                        title={`Ronda ${r.n}${gano ? `: ganó ${nombres[equipo]}` : ''}`}
                        aria-label={`Ronda ${r.n}`}
                        className={cn(
                          'flex h-8 items-center justify-center border-y border-border/40 transition-colors',
                          r.n === mitad + 1 || (r.n > 2 * mitad && (r.n - 2 * mitad - 1) % 3 === 0) ? 'ml-1.5 border-l' : '',
                          gano ? cn(tono.fondo, tono.texto) : 'bg-muted/20 text-transparent',
                          elegida === r.n && 'ring-2 ring-inset ring-white/70',
                        )}
                      >
                        {gano ? <Icono className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                      </button>
                    )
                  })}
                </Fragment>
              )
            })}
            <span className="pr-2 text-[10px] uppercase tracking-wider text-muted-foreground">Ronda</span>
            {detalle.rondas.map((r) => (
              <span
                key={r.n}
                className={cn(
                  'text-center font-mono text-[10px]',
                  elegida === r.n ? 'font-bold text-foreground' : 'text-muted-foreground',
                  r.n === mitad + 1 || (r.n > 2 * mitad && (r.n - 2 * mitad - 1) % 3 === 0) ? 'ml-1.5' : '',
                )}
              >
                {r.n}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {Object.entries(MOTIVOS)
            .filter(([key]) => key !== 'otro')
            .map(([key, { icono: Icono, texto }]) => (
              <span key={key} className="inline-flex items-center gap-1">
                <Icono className="h-3 w-3" aria-hidden="true" /> {texto}
              </span>
            ))}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {orden.map((equipo) => {
          const r = resumen[equipo]
          return (
            <div key={equipo} className="rounded-xl border border-border bg-card p-3">
              <p className={cn('mb-2 text-[12px] font-bold', tonoEquipo(nombres[equipo]).texto)}>{nombres[equipo]}</p>
              <dl className="grid grid-cols-3 gap-2 text-center">
                <Dato label="Pistolas" valor={r.pistolas} />
                <Dato label="Con eco" valor={r.ecos} />
                <Dato label="Con full" valor={r.full} />
              </dl>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {r.bombas} ronda{r.bombas === 1 ? '' : 's'} con la bomba explotada · {r.desactivadas} desactivada{r.desactivadas === 1 ? '' : 's'}
              </p>
            </div>
          )
        })}
      </section>

      {ronda ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2.5">
            <div>
              <h3 className="font-heading text-base font-bold uppercase tracking-wider text-foreground">Ronda {ronda.n}</h3>
              <p className="text-[12px] text-muted-foreground">
                Ganó <span className={cn('font-semibold', tonoEquipo(nombres[ronda.ganador]).texto)}>{nombres[ronda.ganador]}</span> ({ronda.ladoGanador}):{' '}
                {MOTIVOS[ronda.motivo].texto}
                {ronda.duracion !== null ? ` · ${segundosATexto(ronda.duracion)}` : ''}
              </p>
            </div>
            <span className="font-mono text-lg font-bold text-foreground">
              {ronda.marcador[orden[0] - 1]} - {ronda.marcador[orden[1] - 1]}
            </span>
          </header>

          <div className="grid gap-3 border-b border-border p-3 sm:grid-cols-2">
            {orden.map((equipo) => {
              const e = ronda.equipos.find((x) => x.equipo === equipo)
              if (!e) return null
              return (
                <div key={equipo} className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className={cn('font-bold', tonoEquipo(nombres[equipo]).texto)}>{nombres[equipo]}</span>
                  <span className="rounded bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{e.lado}</span>
                  <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider', COMPRAS[e.compra].clase)}>
                    {COMPRAS[e.compra].texto}
                  </span>
                  <span className="text-muted-foreground">
                    equipo de ${e.valor.toLocaleString('es-AR')} · gastó ${e.gastado.toLocaleString('es-AR')}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="grid gap-0 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="border-b border-border p-3 lg:border-b-0 lg:border-r">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kills</h4>
              {kills.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">Nadie murió en esta ronda.</p>
              ) : (
                <ol className="flex flex-col gap-1.5">
                  {kills.map((k) => {
                    const killer = k.killer !== null ? participantes.get(k.killer) : null
                    const victima = participantes.get(k.victima)
                    const asistente = k.asistente !== null ? participantes.get(k.asistente) : null
                    return (
                      <li key={k.orden} className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-muted/20 px-2 py-1.5 text-[12px]">
                        <span className="w-9 shrink-0 font-mono text-[11px] text-muted-foreground">{segundosATexto(k.segundo)}</span>
                        {killer ? (
                          <span className={cn('font-semibold', tonoEquipo(nombres[killer.equipo]).texto)}>{killer.nombre}</span>
                        ) : (
                          <span className="italic text-muted-foreground">Se murió solo</span>
                        )}
                        {asistente ? <span className="text-[11px] text-muted-foreground">+ {asistente.nombre}</span> : null}
                        <span className="rounded bg-background/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">{nombreArma(k.arma)}</span>
                        {k.headshot ? (
                          <span className="text-[10px] font-bold text-yellow-400" title="De cabeza">
                            HS
                          </span>
                        ) : null}
                        {victima ? (
                          <span className={cn('font-semibold', tonoEquipo(nombres[victima.equipo]).texto)}>{victima.nombre}</span>
                        ) : null}
                        {k.apertura ? <Etiqueta>apertura</Etiqueta> : null}
                        {k.tradeada ? <Etiqueta>vengada</Etiqueta> : null}
                        {k.fuegoAmigo ? <Etiqueta>fuego amigo</Etiqueta> : null}
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
            <div className="p-3">
              <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Daño en la ronda</h4>
              <DanioRonda danio={ronda.danio} participantes={participantes} nombres={nombres} orden={orden} kills={kills} />
            </div>
          </div>
        </section>
      ) : null}
    </div>
  )
}

function DanioRonda({
  danio,
  participantes,
  nombres,
  orden,
  kills,
}: {
  danio: Record<string, number>
  participantes: Map<number, Participante>
  nombres: Record<EquipoXplay, string>
  orden: EquipoXplay[]
  kills: { killer: number | null; victima: number; fuegoAmigo: boolean }[]
}) {
  const filas = [...participantes.values()]
    .map((p) => ({
      p,
      danio: danio[String(p.accountId)] ?? 0,
      kills: kills.filter((k) => k.killer === p.accountId && !k.fuegoAmigo).length,
      murio: kills.some((k) => k.victima === p.accountId),
    }))
    .sort((a, b) => orden.indexOf(a.p.equipo) - orden.indexOf(b.p.equipo) || b.danio - a.danio)
  const max = Math.max(100, ...filas.map((f) => f.danio))
  return (
    <ul className="flex flex-col gap-1.5">
      {filas.map((f) => {
        const tono = tonoEquipo(nombres[f.p.equipo])
        return (
          <li key={f.p.accountId} className="flex items-center gap-2 text-[12px]">
            <span className={cn('w-24 shrink-0 truncate', f.murio ? 'text-muted-foreground line-through decoration-rose-400/60' : 'text-foreground')}>
              {f.p.nombre}
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted/50" aria-hidden="true">
              <span className={cn('block h-full rounded-full', tono.solido)} style={{ width: `${(f.danio / max) * 100}%` }} />
            </span>
            <span className="w-16 text-right font-mono text-[11px] text-muted-foreground">
              {f.danio}
              {f.kills > 0 ? <span className="ml-1 text-foreground">· {f.kills}K</span> : null}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-lg bg-muted/30 px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-mono text-[14px] font-bold text-foreground">{valor}</dd>
    </div>
  )
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-border px-1.5 py-0 text-[10px] text-muted-foreground">{children}</span>
}

