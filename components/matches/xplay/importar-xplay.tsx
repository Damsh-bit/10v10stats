'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, ExternalLink, Link2, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate, mapImageUrl } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Carga de una partida con el link de Xplay: se pega el link, se ve la partida
 * y quién es quién (los que ya jugaron vienen elegidos por su cuenta de Steam;
 * los nicks cambian, así que todo se puede corregir a mano) y se guarda.
 * Si la partida ya estaba cargada con la captura, se completa en vez de duplicarla.
 */

type JugadorPrevia = {
  accountId: number
  nombre: string
  avatar: string | null
  equipo: 1 | 2
  faceitElo: number | null
  faceitNivel: number | null
}

type Coincidencia = {
  matchId: string
  map: string
  date: string
  scoreA: number
  scoreB: number
  teamAName: string
  teamBName: string
  enComun?: number
}

type VistaPrevia = {
  resumen: {
    hash: string
    mapa: string
    inicio: string | null
    estadoProceso: string | null
    procesable: boolean
    terminada: boolean
    demoUrl: string | null
    marcador: [number, number]
    jugadores: JugadorPrevia[]
  }
  dia: string
  jugadores: { id: string; name: string; photoUrl: string | null }[]
  sugeridas: Record<string, { playerId: string | null; por: 'steam' | 'nombre' | null }>
  yaCargada: { matchId: string } | null
  coincidencias: Coincidencia[]
  completar: Coincidencia | null
}

type Asignacion = { playerId: string; invitado: boolean }

const NUEVA = 'nueva'
const NOMBRES_EQUIPO = ['Equipo Papi', 'Equipo Viejo']

function textoEstado(vista: VistaPrevia['resumen']) {
  if (vista.procesable) return { ok: true, texto: 'Procesada por SCOPE: trae cifras, rondas y duelos' }
  if (vista.estadoProceso === 'failed') return { ok: false, texto: 'SCOPE no pudo procesar la demo: no hay cifras ni rondas' }
  if (!vista.terminada) return { ok: false, texto: 'La partida todavía no terminó en Xplay' }
  return { ok: false, texto: 'SCOPE todavía está procesando la demo: probá en unos minutos' }
}

export function ImportarXplay({
  clave,
  matchId,
  onGuardada,
}: {
  clave: string
  /** Partida del sitio a completar (desde su página). Sin esto se elige o se crea. */
  matchId?: string
  onGuardada?: (matchId: string) => void
}) {
  const [link, setLink] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [vista, setVista] = useState<VistaPrevia | null>(null)
  const [asignaciones, setAsignaciones] = useState<Record<string, Asignacion>>({})
  const [destino, setDestino] = useState<string>(NUEVA)
  const [nombres, setNombres] = useState<{ 1: string; 2: string }>({ 1: NOMBRES_EQUIPO[0], 2: NOMBRES_EQUIPO[1] })
  const [guardada, setGuardada] = useState<{ matchId: string; creada: boolean; procesada: boolean } | null>(null)

  const buscar = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!link.trim()) return
    setBuscando(true)
    setError(null)
    setVista(null)
    setGuardada(null)
    try {
      const response = await fetch('/api/xplay/vista-previa', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ link: link.trim(), matchId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo leer la partida')
      const previa = data as VistaPrevia

      const iniciales: Record<string, Asignacion> = {}
      for (const j of previa.resumen.jugadores) {
        iniciales[j.accountId] = { playerId: previa.sugeridas[j.accountId]?.playerId ?? '', invitado: false }
      }
      setAsignaciones(iniciales)

      if (matchId) setDestino(matchId)
      else if (previa.yaCargada) setDestino(previa.yaCargada.matchId)
      else if (previa.coincidencias[0] && (previa.coincidencias[0].enComun ?? 0) >= 6) setDestino(previa.coincidencias[0].matchId)
      else setDestino(NUEVA)

      // El equipo donde está Papi es "Equipo Papi", como siempre.
      const papi = previa.jugadores.find((p) => p.name.toLowerCase() === 'papi')
      const equipoPapi = previa.resumen.jugadores.find((j) => papi && previa.sugeridas[j.accountId]?.playerId === papi.id)?.equipo ?? 1
      setNombres(equipoPapi === 1 ? { 1: NOMBRES_EQUIPO[0], 2: NOMBRES_EQUIPO[1] } : { 1: NOMBRES_EQUIPO[1], 2: NOMBRES_EQUIPO[0] })
      setVista(previa)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer la partida')
    } finally {
      setBuscando(false)
    }
  }

  const elegidos = Object.values(asignaciones).map((a) => a.playerId).filter(Boolean)
  const repetidos = new Set(elegidos.filter((id, i) => elegidos.indexOf(id) !== i))
  const faltan = vista ? vista.resumen.jugadores.filter((j) => !asignaciones[j.accountId]?.playerId).length : 0
  const esNueva = destino === NUEVA
  const bloqueada = Boolean(vista && esNueva && !vista.resumen.procesable)
  const puedeGuardar = Boolean(vista) && faltan === 0 && repetidos.size === 0 && !bloqueada && !guardando

  const guardar = async () => {
    if (!vista || !puedeGuardar) return
    setGuardando(true)
    setError(null)
    try {
      const response = await fetch('/api/xplay/importar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          password: clave,
          link: vista.resumen.hash,
          matchId: esNueva ? null : destino,
          nombres,
          asignaciones: vista.resumen.jugadores.map((j) => ({ accountId: j.accountId, ...asignaciones[j.accountId] })),
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar la partida')
      setGuardada({ matchId: data.matchId, creada: data.creada, procesada: data.procesada })
      onGuardada?.(data.matchId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la partida')
    } finally {
      setGuardando(false)
    }
  }

  const destinos = useMemo(() => {
    if (!vista) return []
    const lista: Coincidencia[] = []
    if (vista.completar) lista.push(vista.completar)
    for (const c of vista.coincidencias) if (!lista.some((l) => l.matchId === c.matchId)) lista.push(c)
    return lista
  }, [vista])

  if (guardada) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold">{guardada.creada ? 'Partida cargada' : 'Partida completada con Xplay'}</p>
            <p className="text-emerald-200/80">
              {guardada.procesada
                ? 'Quedaron las cifras de cada uno, las rondas y los duelos.'
                : 'Quedaron los equipos y la demo. Las cifras siguen como estaban porque SCOPE no procesó la demo.'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/matches/${guardada.matchId}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
            Ver partida
          </Link>
          <Button variant="outline" onClick={() => { setGuardada(null); setVista(null); setLink('') }}>
            Cargar otra
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <form onSubmit={buscar} className="space-y-2">
        <label htmlFor="xplay-link" className="text-sm text-muted-foreground">
          Link de la partida en Xplay
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="xplay-link"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://xplay.gg/es/matches/history/…"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary"
            />
          </div>
          <Button type="submit" disabled={buscando || !link.trim()} className="gap-1.5">
            {buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Leer partida
          </Button>
        </div>
        <p className="text-[12px] text-muted-foreground">
          En Xplay: Partidos personales → Historial de partidos → la partida. Copiá el link de arriba.
        </p>
      </form>

      {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p> : null}

      {vista ? (
        <div className="space-y-5">
          <PartidaCabecera vista={vista} />

          {vista.yaCargada && vista.yaCargada.matchId !== matchId ? (
            <p className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[13px] text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Esta partida ya está cargada.{' '}
                <Link href={`/matches/${vista.yaCargada.matchId}`} className="font-semibold underline">
                  Verla
                </Link>
                . Si la guardás de nuevo se actualiza con lo último de Xplay.
              </span>
            </p>
          ) : null}

          {!matchId ? (
            <fieldset className="space-y-2">
              <legend className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand">¿Dónde va?</legend>
              {destinos.map((c) => (
                <OpcionDestino key={c.matchId} checked={destino === c.matchId} onChange={() => setDestino(c.matchId)}>
                  <span className="font-semibold text-foreground">Completar la que ya está cargada</span>
                  <span className="block text-[12px] text-muted-foreground">
                    {c.map} {c.scoreA}-{c.scoreB} del {formatDate(c.date)}
                    {typeof c.enComun === 'number' ? ` · ${c.enComun} de 10 jugadores en común` : ''}
                  </span>
                </OpcionDestino>
              ))}
              <OpcionDestino checked={esNueva} onChange={() => setDestino(NUEVA)}>
                <span className="font-semibold text-foreground">Crear una partida nueva</span>
                <span className="block text-[12px] text-muted-foreground">Fecha: {formatDate(vista.dia)}</span>
              </OpcionDestino>
            </fieldset>
          ) : null}

          {bloqueada ? (
            <p className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[13px] text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Sin la demo procesada no hay números para crear la partida. Esperá a que SCOPE la procese o cargala con la captura.
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            {([1, 2] as const).map((equipo) => (
              <div key={equipo} className="overflow-hidden rounded-xl border border-border bg-card/60">
                <div className="flex items-center justify-between gap-2 border-b border-border bg-muted/40 px-3 py-2">
                  {esNueva ? (
                    <select
                      value={nombres[equipo]}
                      onChange={(event) => {
                        const nombre = event.target.value
                        const otro = NOMBRES_EQUIPO.find((n) => n !== nombre) ?? nombres[equipo === 1 ? 2 : 1]
                        setNombres(equipo === 1 ? { 1: nombre, 2: otro } : { 1: otro, 2: nombre })
                      }}
                      className="cursor-pointer bg-transparent text-[12px] font-semibold uppercase tracking-[0.2em] text-brand outline-none"
                      aria-label={`Nombre del equipo ${equipo}`}
                    >
                      {NOMBRES_EQUIPO.map((n) => (
                        <option key={n} value={n}>
                          {n.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[12px] font-semibold uppercase tracking-[0.2em] text-brand">Team {equipo}</span>
                  )}
                  <span className="font-mono text-lg font-bold text-foreground">{vista.resumen.marcador[equipo - 1]}</span>
                </div>
                <ul>
                  {vista.resumen.jugadores
                    .filter((j) => j.equipo === equipo)
                    .map((j) => {
                      const asignacion = asignaciones[j.accountId] ?? { playerId: '', invitado: false }
                      const sugerida = vista.sugeridas[j.accountId]
                      const repetido = repetidos.has(asignacion.playerId)
                      return (
                        <li key={j.accountId} className="flex flex-wrap items-center gap-2 border-t border-border/60 px-3 py-2 first:border-t-0">
                          {j.avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={j.avatar} alt="" width={28} height={28} loading="lazy" className="h-7 w-7 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="h-7 w-7 shrink-0 rounded-full bg-muted" aria-hidden="true" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-semibold text-foreground" title={j.nombre}>
                              {j.nombre}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {j.faceitNivel ? `FACEIT ${j.faceitNivel}` : 'Sin FACEIT'}
                              {sugerida?.por === 'steam' && asignacion.playerId === sugerida.playerId ? ' · reconocido por Steam' : ''}
                              {sugerida?.por === 'nombre' && asignacion.playerId === sugerida.playerId ? ' · adivinado por el nick, revisalo' : ''}
                            </p>
                          </div>
                          <select
                            value={asignacion.playerId}
                            onChange={(event) =>
                              setAsignaciones((prev) => ({ ...prev, [j.accountId]: { ...asignacion, playerId: event.target.value } }))
                            }
                            aria-label={`Quién es ${j.nombre}`}
                            className={cn(
                              'w-36 rounded-lg border bg-background px-2 py-1.5 text-[13px] text-foreground outline-none focus:border-primary',
                              !asignacion.playerId || repetido ? 'border-amber-400/60' : 'border-border',
                            )}
                          >
                            <option value="">— ¿quién es? —</option>
                            {vista.jugadores.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                          <label className="flex items-center gap-1 text-[11px] text-muted-foreground" title="Aparece en la tabla pero no suma estadísticas">
                            <input
                              type="checkbox"
                              checked={asignacion.invitado}
                              onChange={(event) =>
                                setAsignaciones((prev) => ({ ...prev, [j.accountId]: { ...asignacion, invitado: event.target.checked } }))
                              }
                            />
                            Invitado
                          </label>
                        </li>
                      )
                    })}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-[12px] text-muted-foreground">
              {faltan > 0
                ? `Falta elegir ${faltan} jugador${faltan === 1 ? '' : 'es'}.`
                : repetidos.size > 0
                  ? 'Hay un jugador elegido dos veces.'
                  : 'La próxima vez se reconocen solos por su cuenta de Steam.'}
            </p>
            <Button onClick={guardar} disabled={!puedeGuardar} className="gap-1.5">
              {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {guardando ? 'Trayendo rondas y kills…' : esNueva ? 'Cargar partida' : 'Completar partida'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PartidaCabecera({ vista }: { vista: VistaPrevia }) {
  const estado = textoEstado(vista.resumen)
  const [s1, s2] = vista.resumen.marcador
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card">
      <div className="absolute inset-0 bg-cover bg-center opacity-40" style={{ backgroundImage: `url('${mapImageUrl(vista.resumen.mapa)}')` }} aria-hidden="true" />
      <div className="absolute inset-0 bg-gradient-to-r from-card via-card/80 to-card/40" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="font-heading text-2xl font-bold uppercase tracking-wide text-foreground">{vista.resumen.mapa}</p>
          <p className="text-[12px] text-muted-foreground">
            {vista.resumen.inicio
              ? new Date(vista.resumen.inicio).toLocaleString('es-AR', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/Argentina/Buenos_Aires',
                })
              : 'Sin fecha'}
          </p>
        </div>
        <span className="font-mono text-3xl font-black text-foreground">
          {s1} <span className="text-muted-foreground">-</span> {s2}
        </span>
      </div>
      <div
        className={cn(
          'relative flex items-center gap-2 border-t border-border px-4 py-2 text-[12px]',
          estado.ok ? 'text-emerald-300' : 'text-amber-200',
        )}
      >
        {estado.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <span className="flex-1">{estado.texto}</span>
        <a
          href={`https://xplay.gg/es/matches/history/${vista.resumen.hash}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
        >
          Xplay <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  )
}

function OpcionDestino({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
        checked ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent/40',
      )}
    >
      <input type="radio" checked={checked} onChange={onChange} className="mt-1" />
      <span className="min-w-0">{children}</span>
    </label>
  )
}
