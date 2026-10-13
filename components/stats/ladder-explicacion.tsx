'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { PlayerStats } from '@/types'
import { DESCUENTO_MAXIMO_ASISTENCIA, factorAsistencia, puntajeLadder, valorLadder } from '@/lib/ladder'
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
const partidas = (n: number) => (n === 1 ? '1 partida' : `${n} partidas`)
const porcentajeDescuento = (s: PlayerStats) =>
  Math.round((1 - factorAsistencia(s.matches, s.partidasTotales ?? s.matches)) * 100)

/** Lo que vale `s` en la tabla si sumara `extra` kills o asistencias sin morir. */
function valorCon(s: PlayerStats, extra: number) {
  const kda = kdaDe(s.kills + s.assists + extra, s.deaths)
  return s.puntaje !== undefined ? puntajeLadder(kda, s.matches, s.partidasTotales ?? s.matches) : kda
}

/** Kills o asistencias (sin morir) que le faltan a `abajo` para superar `objetivo`. */
function faltanParaPasar(abajo: PlayerStats, objetivo: number) {
  const ka = abajo.kills + abajo.assists
  const d = abajo.deaths
  // Con puntaje, el KDA que hace falta es más alto: la asistencia lo descuenta.
  const kdaObjetivo = abajo.puntaje !== undefined ? objetivo / factorAsistencia(abajo.matches, abajo.partidasTotales ?? abajo.matches) : objetivo
  let x = Math.max(1, Math.floor(d === 0 ? kdaObjetivo - ka : kdaObjetivo * d - ka))
  while (x > 1 && valorCon(abajo, x - 1) > objetivo) x--
  while (valorCon(abajo, x) <= objetivo) x++
  return x
}

/**
 * Partidas que tendría que jugar `abajo` (con el mismo KDA) para pasar a `arriba`,
 * si los dos juegan todas las que vienen. Sólo tiene sentido si `abajo` tiene mejor KDA.
 */
function partidasParaPasar(arriba: PlayerStats, abajo: PlayerStats) {
  const total = abajo.partidasTotales
  if (abajo.puntaje === undefined || total === undefined || abajo.kda <= arriba.kda) return null
  for (let k = 1; k <= 60; k++) {
    if (puntajeLadder(abajo.kda, abajo.matches + k, total + k) > puntajeLadder(arriba.kda, arriba.matches + k, total + k)) return k
  }
  return null
}

/** Qué hace que el de arriba tenga mejor KDA: más kills+asistencias, menos muertes o las dos. */
function motivoKda(arriba: PlayerStats, abajo: PlayerStats) {
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

/** Con puntaje: si el de arriba le gana por KDA, por haber jugado más, o por las dos. */
function motivoPuntaje(arriba: PlayerStats, abajo: PlayerStats) {
  const jugaron = `${arriba.matches} contra ${abajo.matches}`

  if (arriba.kda > abajo.kda) {
    if (arriba.matches > abajo.matches) return `${motivoKda(arriba, abajo)} Además jugó más partidas (${jugaron}).`
    if (arriba.matches < abajo.matches) return `${motivoKda(arriba, abajo)} Jugó menos partidas (${jugaron}), pero la diferencia de KDA le alcanza.`
    return motivoKda(arriba, abajo)
  }
  if (arriba.kda === abajo.kda) return `jugó más partidas (${jugaron}) con el mismo KDA.`

  const faltas = (abajo.partidasTotales ?? abajo.matches) - abajo.matches
  const descuentoArriba = porcentajeDescuento(arriba)
  return `jugó más partidas (${jugaron}). ${abajo.player.name} tiene mejor KDA (${abajo.kda.toFixed(2)} contra ${arriba.kda.toFixed(2)}), pero por faltar a ${partidas(faltas)} la asistencia le descuenta un ${porcentajeDescuento(abajo)}%${descuentoArriba > 0 ? ` y a ${arriba.player.name}, un ${descuentoArriba}%` : ''}.`
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
  const porPuntaje = stats[0]?.puntaje !== undefined
  const medida = porPuntaje ? 'puntaje' : 'KDA'
  const empatados = arriba && abajo && valorLadder(arriba) === valorLadder(abajo)
  const periodo = recentCount ? `las últimas ${recentCount} partidas` : 'la temporada'
  const totalPartidas = stats[0]?.partidasTotales
  const descuentoMaximo = Math.round(DESCUENTO_MAXIMO_ASISTENCIA * 100)
  const jugando = arriba && abajo ? partidasParaPasar(arriba, abajo) : null

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
            <div className="flex flex-wrap gap-1.5">
              {porPuntaje && (
                <p className="w-fit rounded-md border border-border bg-background/60 px-2.5 py-1 font-mono text-[12px] text-foreground">
                  Puntaje = KDA × asistencia
                </p>
              )}
              <p className="w-fit rounded-md border border-border bg-background/60 px-2.5 py-1 font-mono text-[12px] text-foreground">
                KDA = (kills + asistencias) ÷ muertes
              </p>
            </div>
            <ul className="flex list-disc flex-col gap-0.5 pl-4 marker:text-muted-foreground/50">
              <li>
                Se suma todo lo de {periodo} y se divide una sola vez: no es el promedio de cada partida. Si alguien no murió nunca,
                su KDA es kills + asistencias.
              </li>
              <li>Un KDA de 2.00 quiere decir 2 kills o asistencias por cada vez que murió.</li>
              {porPuntaje ? (
                <>
                  <li>
                    La asistencia es cuántas de las {totalPartidas ?? ''} partidas de {periodo} jugaste. Si jugaste todas, tu puntaje es
                    tu KDA tal cual. Cada partida que faltás descuenta un poco: faltar a la mitad saca un {descuentoMaximo / 2}% y no
                    jugar ninguna, un {descuentoMaximo}%.
                  </li>
                  <li>
                    Así el que deja de jugar va bajando, en vez de subir solo porque a los que juegan les baja el KDA. Ganar, el daño,
                    los HS y los MVPs no mueven el puesto.
                  </li>
                </>
              ) : (
                <li>
                  Sólo manda el KDA. Ganar, el daño, los HS y los MVPs no mueven el puesto. Con una partida ya entrás.
                </li>
              )}
            </ul>
          </div>

          {arriba && abajo && (
            <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span>¿Por qué</span>
                <JugadorSelect stats={stats} value={idA} onChange={(id) => elegir(0, id)} label="Primer jugador" />
                <span>está {iA < iB ? 'arriba' : 'abajo'} de</span>
                <JugadorSelect stats={stats} value={idB} onChange={(id) => elegir(1, id)} label="Segundo jugador" />
                <span>?</span>
              </div>

              <table className="w-full max-w-md font-mono text-[11px] tabular-nums">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                    <th className="py-0.5 text-left font-semibold">Jugador</th>
                    <th className="py-0.5 text-right font-semibold" title="Kills">K</th>
                    <th className="py-0.5 text-right font-semibold" title="Asistencias">A</th>
                    <th className="py-0.5 text-right font-semibold" title="Muertes">M</th>
                    <th className="py-0.5 text-right font-semibold">KDA</th>
                    {porPuntaje && (
                      <>
                        <th className="py-0.5 text-right font-semibold" title="Partidas jugadas">PJ</th>
                        <th className="py-0.5 text-right font-semibold" title="Puntaje: KDA × asistencia">Pts</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[arriba, abajo].map((s) => (
                    <tr key={s.player.id} className="text-foreground">
                      <td className="max-w-24 truncate py-0.5 pr-2 font-sans text-[12px] font-semibold sm:max-w-28">
                        <span className="mr-1 font-mono text-[10px] text-muted-foreground">#{ids.indexOf(s.player.id) + 1}</span>
                        {s.player.name}
                      </td>
                      <td className="py-0.5 text-right">{s.kills}</td>
                      <td className="py-0.5 text-right">{s.assists}</td>
                      <td className="py-0.5 text-right">{s.deaths}</td>
                      <td className={cn('py-0.5 text-right', !porPuntaje && 'font-bold', !porPuntaje && s === arriba && !empatados && 'text-emerald-300')}>
                        {s.kda.toFixed(2)}
                      </td>
                      {porPuntaje && (
                        <>
                          <td className="py-0.5 text-right">
                            {s.matches}/{s.partidasTotales}
                          </td>
                          <td className={cn('py-0.5 text-right font-bold', s === arriba && !empatados && 'text-emerald-300')}>
                            {valorLadder(s).toFixed(2)}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {empatados ? (
                <p>
                  Están <span className="font-semibold text-foreground">empatados en {medida}</span>
                  {porPuntaje && arriba.matches !== abajo.matches ? ': queda arriba el que jugó más partidas.' : ': da lo mismo quién vaya primero.'}{' '}
                  Con {killsOAsistencias(faltanParaPasar(abajo, valorLadder(arriba)))} más sin morir, {abajo.player.name} queda arriba.
                </p>
              ) : (
                <p>
                  <span className="font-semibold text-foreground">{arriba.player.name}</span> está arriba porque{' '}
                  {porPuntaje ? motivoPuntaje(arriba, abajo) : motivoKda(arriba, abajo)} A {abajo.player.name} le faltan{' '}
                  <span className="font-semibold text-foreground">{killsOAsistencias(faltanParaPasar(abajo, valorLadder(arriba)))}</span> sin
                  morir para pasarlo
                  {jugando ? (
                    <>
                      , o, si los dos juegan todas las que vienen, <span className="font-semibold text-foreground">{partidas(jugando)}</span> con
                      el mismo KDA.
                    </>
                  ) : (
                    '.'
                  )}
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
