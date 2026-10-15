'use client'

import { useMemo } from 'react'
import type { DetalleXplay } from '@/lib/xplay/leer'
import type { EquipoXplay } from '@/lib/xplay/tipos'
import { cruces } from '@/lib/xplay/duelos'
import { cn } from '@/lib/utils'
import { Avatar, tonoEquipo, type Participante } from './comun'

/** Duelos de la partida: cuántas veces se mató cada uno con cada rival. */
export function DuelosXplay({
  detalle,
  participantes,
  nombres,
}: {
  detalle: DetalleXplay
  participantes: Map<number, Participante>
  nombres: Record<EquipoXplay, string>
}) {
  const orden: EquipoXplay[] = detalle.equipoA === 1 ? [1, 2] : [2, 1]
  const mapa = useMemo(() => cruces(detalle.kills), [detalle.kills])
  const lista = [...participantes.values()]
  const filas = lista.filter((p) => p.equipo === orden[0]).sort((a, b) => a.nombre.localeCompare(b.nombre))
  const columnas = lista.filter((p) => p.equipo === orden[1]).sort((a, b) => a.nombre.localeCompare(b.nombre))
  const tonoFila = tonoEquipo(nombres[orden[0]])
  const tonoColumna = tonoEquipo(nombres[orden[1]])

  const rivalidades = useMemo(() => {
    const pares = filas.flatMap((a) =>
      columnas.map((b) => {
        const ab = mapa.get(`${a.accountId}-${b.accountId}`) ?? 0
        const ba = mapa.get(`${b.accountId}-${a.accountId}`) ?? 0
        return { a, b, ab, ba, total: ab + ba }
      }),
    )
    return pares.filter((p) => p.total > 0).sort((x, y) => y.total - x.total || Math.abs(y.ab - y.ba) - Math.abs(x.ab - x.ba)).slice(0, 6)
  }, [filas, columnas, mapa])

  const aperturas = useMemo(() => {
    const cuenta = new Map<number, { ganadas: number; perdidas: number }>()
    for (const k of detalle.kills) {
      if (!k.apertura || k.killer === null) continue
      const ganador = cuenta.get(k.killer) ?? { ganadas: 0, perdidas: 0 }
      ganador.ganadas++
      cuenta.set(k.killer, ganador)
      const perdedor = cuenta.get(k.victima) ?? { ganadas: 0, perdidas: 0 }
      perdedor.perdidas++
      cuenta.set(k.victima, perdedor)
    }
    return lista
      .map((p) => ({ p, ...(cuenta.get(p.accountId) ?? { ganadas: 0, perdidas: 0 }) }))
      .filter((x) => x.ganadas + x.perdidas > 0)
      .sort((a, b) => b.ganadas - b.perdidas - (a.ganadas - a.perdidas) || b.ganadas - a.ganadas)
  }, [detalle.kills, lista])

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
        <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Cara a cara</h3>
        <p className="mb-3 text-[12px] text-muted-foreground">
          Cada casilla: cuántas veces el de la fila mató al de la columna, y al revés.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-card" />
                {columnas.map((c) => (
                  <th key={c.accountId} className="px-1 pb-2 align-bottom">
                    <span className="flex flex-col items-center gap-1">
                      <Avatar p={c} size={26} />
                      <span className={cn('max-w-[72px] truncate text-[11px] font-semibold', tonoColumna.texto)}>{c.nombre}</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr key={f.accountId}>
                  <th scope="row" className="sticky left-0 z-10 bg-card py-1 pr-2 text-left">
                    <span className="flex items-center gap-2">
                      <Avatar p={f} size={24} />
                      <span className={cn('max-w-[90px] truncate text-[12px] font-semibold', tonoFila.texto)}>{f.nombre}</span>
                    </span>
                  </th>
                  {columnas.map((c) => {
                    const gana = mapa.get(`${f.accountId}-${c.accountId}`) ?? 0
                    const pierde = mapa.get(`${c.accountId}-${f.accountId}`) ?? 0
                    return (
                      <td key={c.accountId} className="p-0.5">
                        <span
                          title={`${f.nombre} mató ${gana} ${gana === 1 ? 'vez' : 'veces'} a ${c.nombre} · ${c.nombre} lo mató ${pierde}`}
                          className={cn(
                            'flex h-10 items-center justify-center rounded-md font-mono text-[13px]',
                            gana > pierde ? 'bg-emerald-500/15 text-emerald-200' : gana < pierde ? 'bg-rose-500/15 text-rose-200' : 'bg-muted/30 text-muted-foreground',
                          )}
                        >
                          <span className="font-bold">{gana}</span>
                          <span className="mx-1 opacity-50">-</span>
                          <span>{pierde}</span>
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Las rivalidades de la partida</h3>
          <ul className="flex flex-col gap-2">
            {rivalidades.map(({ a, b, ab, ba }) => {
              const lider = ab >= ba ? a : b
              const otro = ab >= ba ? b : a
              const mas = Math.max(ab, ba)
              const menos = Math.min(ab, ba)
              return (
                <li key={`${a.accountId}-${b.accountId}`} className="flex items-center gap-2 rounded-lg bg-muted/20 px-2.5 py-2 text-[13px]">
                  <Avatar p={lider} size={22} />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold text-foreground">{lider.nombre}</span> mató {mas} {mas === 1 ? 'vez' : 'veces'} a{' '}
                    <span className="font-semibold text-foreground">{otro.nombre}</span>
                    {menos > 0 ? (
                      <span className="text-muted-foreground">
                        {' '}
                        · {otro.nombre} {menos}
                      </span>
                    ) : (
                      <span className="text-muted-foreground"> · sin respuesta</span>
                    )}
                  </span>
                  <Avatar p={otro} size={22} />
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded-xl border border-border bg-card p-3 sm:p-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Duelos de apertura</h3>
          <p className="mb-3 text-[12px] text-muted-foreground">La primera kill de cada ronda: quién la hizo y a quién le tocó.</p>
          <ul className="flex flex-col gap-1.5">
            {aperturas.map(({ p, ganadas, perdidas }) => (
              <li key={p.accountId} className="flex items-center gap-2 text-[13px]">
                <Avatar p={p} size={22} />
                <span className={cn('min-w-0 flex-1 truncate font-medium', tonoEquipo(nombres[p.equipo]).texto)}>{p.nombre}</span>
                <span className="font-mono text-[12px] text-emerald-300">{ganadas} ganadas</span>
                <span className="font-mono text-[12px] text-rose-300">{perdidas} perdidas</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
