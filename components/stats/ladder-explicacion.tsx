'use client'

import { useState } from 'react'
import { CalendarX, X } from 'lucide-react'
import type { PlayerStats } from '@/types'
import { DESCUENTO_POR_STRIKE, descuentoDelDia, descuentoPorStrikes, STRIKES_PARA_DESCUENTO, valorLadder } from '@/lib/ladder'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  /** Lo que muestra la tabla en este momento (temporada o últimas N). */
  stats: PlayerStats[]
  /** Vista "Últimas N": el KDA sale sólo de esas partidas. */
  recentCount?: number | null
}

const redondear = (v: number) => Math.round(v * 100) / 100
const kdaDe = (ka: number, deaths: number) => redondear(deaths === 0 ? ka : ka / deaths)
const porPartida = (v: number, partidas: number) => (partidas > 0 ? v / partidas : 0).toFixed(1)
const killsOAsistencias = (n: number) => (n === 1 ? '1 kill o asistencia' : `${n} kills o asistencias`)
const perdido = (s: PlayerStats) => s.descuentoStrikes ?? 0

/** Ejemplos de la escalera de strikes: los primeros avisan, desde STRIKES_PARA_DESCUENTO descuentan (y dos días más). */
const ESCALERA = Array.from({ length: STRIKES_PARA_DESCUENTO + 2 }, (_, i) => i + 1)

/**
 * Kills o asistencias (sin morir) que le faltan a `abajo` para superar `objetivo`.
 * Lo perdido por faltar no se devuelve: lo tiene que compensar con su KDA real.
 */
function faltanParaPasar(abajo: PlayerStats, objetivo: number) {
  const ka = abajo.kills + abajo.assists
  const d = abajo.deaths
  const valorCon = (extra: number) => Math.max(0, redondear(kdaDe(ka + extra, d) - perdido(abajo)))
  const kdaObjetivo = objetivo + perdido(abajo)
  let x = Math.max(1, Math.floor(d === 0 ? kdaObjetivo - ka : kdaObjetivo * d - ka))
  while (x > 1 && valorCon(x - 1) > objetivo) x--
  while (valorCon(x) <= objetivo) x++
  return x
}

/** Qué hace que el de arriba tenga mejor KDA: más kills+asistencias, menos muertes o las dos. */
function motivo(arriba: PlayerStats, abajo: PlayerStats) {
  const kaArriba = (arriba.kills + arriba.assists) / Math.max(arriba.matches, 1)
  const kaAbajo = (abajo.kills + abajo.assists) / Math.max(abajo.matches, 1)
  const dArriba = arriba.deaths / Math.max(arriba.matches, 1)
  const dAbajo = abajo.deaths / Math.max(abajo.matches, 1)
  const ka = `${porPartida(arriba.kills + arriba.assists, arriba.matches)} contra ${porPartida(abajo.kills + abajo.assists, abajo.matches)}`
  const d = `${porPartida(arriba.deaths, arriba.matches)} contra ${porPartida(abajo.deaths, abajo.matches)}`

  if (kaArriba >= kaAbajo && dArriba <= dAbajo) {
    return `hace más kills y asistencias por partida (${ka}) y muere menos (${d}).`
  }
  if (kaArriba >= kaAbajo) {
    return `muere más (${d} por partida), pero lo compensa con más kills y asistencias (${ka}).`
  }
  return `hace menos kills y asistencias (${ka} por partida), pero muere menos (${d}).`
}

/** El motivo sumando lo perdido por faltar: si sólo lo explica eso, o si encima alguno perdió KDA. */
function motivoConStrikes(arriba: PlayerStats, abajo: PlayerStats) {
  if (abajo.kda >= arriba.kda) {
    return `${abajo.player.name} perdió ${perdido(abajo).toFixed(2)} de KDA por faltar días de partidas (${abajo.kda.toFixed(2)} → ${valorLadder(abajo).toFixed(2)}).`
  }

  let texto = motivo(arriba, abajo)
  if (perdido(abajo) > 0) texto += ` Encima, ${abajo.player.name} perdió ${perdido(abajo).toFixed(2)} de KDA por faltar.`
  if (perdido(arriba) > 0) texto += ` Y eso que ${arriba.player.name} perdió ${perdido(arriba).toFixed(2)} por faltar.`
  return texto
}

export function LadderExplicacion({ open, onClose, stats, recentCount }: Props) {
  const [elegidos, setElegidos] = useState<[string, string] | null>(null)

  // Si cambia la vista y alguno ya no está en la tabla, vuelve al #1 contra el #2.
  const ids = stats.map((s) => s.player.id)
  const [idA, idB] =
    elegidos && ids.includes(elegidos[0]) && ids.includes(elegidos[1]) ? elegidos : [ids[0], ids[1]]
  const elegir = (lado: 0 | 1, id: string) => {
    const otro = lado === 0 ? idB : idA
    // Elegir al mismo de los dos lados los da vuelta.
    const par: [string, string] = lado === 0 ? [id, id === otro ? idA : otro] : [id === otro ? idB : otro, id]
    setElegidos(par)
  }

  const iA = ids.indexOf(idA)
  const iB = ids.indexOf(idB)
  const arriba = stats[Math.min(iA, iB)]
  const abajo = stats[Math.max(iA, iB)]
  const conStrikes = stats[0]?.strikes !== undefined
  const empatados = arriba && abajo && valorLadder(arriba) === valorLadder(abajo)

  const comoPasarlo =
    arriba && abajo ? (
      <>
        A {abajo.player.name} le faltan{' '}
        <span className="font-semibold text-foreground">{killsOAsistencias(faltanParaPasar(abajo, valorLadder(arriba)))}</span> sin
        morir para pasarlo{perdido(abajo) > 0 ? ': lo que perdió por faltar se lo tiene que volver a ganar.' : '.'}
      </>
    ) : null

  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]',
        open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
      )}
      inert={!open}
    >
      <div className="overflow-hidden">
        <div id="ladder-explicacion" className="relative flex flex-col gap-3 border-b border-border bg-black/15 px-4 py-3.5 text-[12px] leading-relaxed text-muted-foreground">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-2.5 top-2.5 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cerrar explicación"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <div className="flex flex-col gap-1.5 pr-6">
            <p className="font-heading text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">Cómo se arma la tabla</p>
            <p className="w-fit rounded-md border border-border bg-background/60 px-2.5 py-1 font-mono text-[12px] text-foreground">
              KDA = (kills + asistencias) ÷ muertes
            </p>
            <ul className="flex list-disc flex-col gap-0.5 pl-4 marker:text-muted-foreground/50">
              <li>
                Se suma todo lo de {recentCount ? `las últimas ${recentCount} partidas` : 'la temporada'} y se divide una sola vez: no es
                el promedio de cada partida. Si alguien no murió nunca, su KDA es kills + asistencias.
              </li>
              <li>Un KDA de 2.00 quiere decir 2 kills o asistencias por cada vez que murió.</li>
              <li>
                Sólo manda el KDA. Ganar, el daño, los HS y los MVPs no mueven el puesto. Con una partida ya entrás.
              </li>
            </ul>
          </div>

          {conStrikes && (
            <div className="flex flex-col gap-1.5 border-t border-border/60 pt-3">
              <p className="flex items-center gap-1.5 font-heading text-[11px] font-bold uppercase tracking-[0.2em] text-foreground">
                <CalendarX className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                Strikes por faltar
              </p>
              <p>
                Cada <span className="font-semibold text-foreground">día de partidas</span> que faltás seguido es un strike. Desde el{' '}
                {STRIKES_PARA_DESCUENTO}.º, cada día que faltás te saca KDA en la ladder,{' '}
                <span className="font-semibold text-foreground">y cada día un poco más</span>.
              </p>
              <ol className="flex flex-wrap items-center gap-1.5" aria-label="Cuánto descuenta cada strike">
                {ESCALERA.map((n) => {
                  const descuento = descuentoDelDia(n)
                  return (
                    <li
                      key={n}
                      className={cn(
                        'flex items-center gap-1 rounded border bg-black/30 px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                        descuento > 0 ? 'border-rose-500/50 text-rose-400' : 'border-amber-400/40 text-amber-300',
                      )}
                    >
                      {n} {n === 1 ? 'strike' : 'strikes'}
                      <span className="font-normal opacity-80">
                        → {descuento > 0 ? `−${descuento.toFixed(2)}${n > STRIKES_PARA_DESCUENTO ? ' más' : ''}` : 'aviso'}
                      </span>
                    </li>
                  )
                })}
              </ol>
              <p>
                Cada día seguido pega {DESCUENTO_POR_STRIKE.toFixed(2)} más que el anterior: faltar {ESCALERA.length} días seguidos te
                saca {descuentoPorStrikes(ESCALERA.length).toFixed(2)} de KDA en total.
              </p>
              <p>
                Si volvés a jugar, los strikes vuelven a 0 (y la próxima vez arranca de nuevo en {DESCUENTO_POR_STRIKE.toFixed(2)}), pero{' '}
                <span className="font-semibold text-foreground">lo que perdiste no vuelve: te lo tenés que ganar de nuevo jugando</span>.
              </p>
              <p>
                Es sólo para el orden de la ladder: tu KDA real no cambia, y el perfil y el generador de equipos lo usan tal cual.
              </p>
            </div>
          )}

          {arriba && abajo && (
            <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span>¿Por qué</span>
                <JugadorSelect stats={stats} value={idA} onChange={(id) => elegir(0, id)} label="Primer jugador" />
                <span>está {iA < iB ? 'arriba' : 'abajo'} de</span>
                <JugadorSelect stats={stats} value={idB} onChange={(id) => elegir(1, id)} label="Segundo jugador" />
                <span>?</span>
              </div>

              <table className="w-full max-w-sm font-mono text-[11px] tabular-nums">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    <th className="py-0.5 text-left font-semibold">Jugador</th>
                    <th className="py-0.5 text-right font-semibold" title="Kills">K</th>
                    <th className="py-0.5 text-right font-semibold" title="Asistencias">A</th>
                    <th className="py-0.5 text-right font-semibold" title="Muertes">M</th>
                    <th className="py-0.5 text-right font-semibold">KDA</th>
                  </tr>
                </thead>
                <tbody>
                  {[arriba, abajo].map((s) => {
                    const descuento = perdido(s)
                    return (
                      <tr key={s.player.id} className="text-foreground">
                        <td className="max-w-28 truncate py-0.5 pr-2 font-sans text-[12px] font-semibold">
                          <span className="mr-1 font-mono text-[10px] text-muted-foreground">#{ids.indexOf(s.player.id) + 1}</span>
                          {s.player.name}
                        </td>
                        <td className="py-0.5 text-right">{s.kills}</td>
                        <td className="py-0.5 text-right">{s.assists}</td>
                        <td className="py-0.5 text-right">{s.deaths}</td>
                        <td className={cn('py-0.5 text-right font-bold', s === arriba && !empatados && 'text-emerald-300')}>
                          {descuento > 0 && (
                            <s className="mr-1 font-normal text-muted-foreground" title={`KDA real; perdió ${descuento.toFixed(2)} por faltar`}>
                              {s.kda.toFixed(2)}
                            </s>
                          )}
                          {valorLadder(s).toFixed(2)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {empatados ? (
                <p>
                  Están <span className="font-semibold text-foreground">empatados en KDA</span>
                  {perdido(arriba) !== perdido(abajo) || (arriba.strikes ?? 0) !== (abajo.strikes ?? 0)
                    ? ': queda arriba el que faltó menos.'
                    : ': da lo mismo quién vaya primero.'}{' '}
                  {comoPasarlo}
                </p>
              ) : (
                <p>
                  <span className="font-semibold text-foreground">{arriba.player.name}</span> está arriba porque{' '}
                  {conStrikes ? motivoConStrikes(arriba, abajo) : motivo(arriba, abajo)} {comoPasarlo}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function JugadorSelect({
  stats,
  value,
  onChange,
  label,
}: {
  stats: PlayerStats[]
  value: string
  onChange: (id: string) => void
  label: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="max-w-36 rounded-md border border-border bg-background px-1.5 py-0.5 font-semibold text-foreground outline-none focus:border-primary"
    >
      {stats.map((s, i) => (
        <option key={s.player.id} value={s.player.id}>
          #{i + 1} {s.player.name}
        </option>
      ))}
    </select>
  )
}
