'use client'

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Gauge, LayoutDashboard, Map as MapIcon, Medal, Swords, Users, type LucideIcon } from 'lucide-react'
import { SeasonTabs } from '@/components/season/season-tabs'
import { PlayerMatchHistory, type MatchEntry } from '@/components/players/player-match-history'
import { cn } from '@/lib/utils'
import type { AlcancePerfil } from './tipos'
import { Cifras } from './cifras'
import { FormaReciente } from './forma'
import { Curiosidades } from './curiosidades'
import { Posiciones } from './posiciones'
import { Mapas } from './mapas'
import { Companeros } from './companeros'
import { Marcas } from './marcas'
import { Recomendaciones, type Recomendacion } from './recomendaciones'

type TabKey = 'resumen' | 'partidas' | 'mapas' | 'companeros' | 'marcas' | 'faceit'

/** Las recomendaciones van al pie del resumen, como los comentarios del perfil. */
const ANCLA_RECOMENDACIONES = 'recomendaciones'

type Tab = { key: TabKey; label: string; icon: LucideIcon; porTemporada: boolean }

const TABS: Tab[] = [
  { key: 'resumen', label: 'Resumen', icon: LayoutDashboard, porTemporada: true },
  { key: 'partidas', label: 'Partidas', icon: Swords, porTemporada: true },
  { key: 'mapas', label: 'Mapas', icon: MapIcon, porTemporada: true },
  { key: 'companeros', label: 'Compañeros', icon: Users, porTemporada: true },
  { key: 'marcas', label: 'Marcas', icon: Medal, porTemporada: true },
  { key: 'faceit', label: 'FACEIT', icon: Gauge, porTemporada: false },
]

function rankLabel(alcance: AlcancePerfil) {
  if (alcance.seasonId === null) return null
  if (alcance.rank) return `#${alcance.rank} de ${alcance.rankedCount}`
  return alcance.isCurrent ? 'Sin debut' : 'No jugó'
}

/**
 * Cuerpo del perfil: pestañas (la elegida queda en la URL, ej. #mapas) y, para
 * las que dependen de la temporada, el selector de temporada o carrera. Al pie
 * del resumen, las recomendaciones (#recomendaciones lleva directo ahí).
 */
export function PerfilJugador({
  playerId,
  nombre,
  alcances,
  history,
  comparacion,
  faceit,
  recomendacionesIniciales,
}: {
  playerId: string
  nombre: string
  alcances: AlcancePerfil[]
  history: (MatchEntry & { seasonId: number })[]
  /** Temporada actual vs anterior (columna del resumen). */
  comparacion?: React.ReactNode
  /** Sección de FACEIT; sin ella no hay pestaña. */
  faceit?: React.ReactNode
  recomendacionesIniciales: Recomendacion[] | null
}) {
  const tabs = useMemo(() => TABS.filter((t) => t.key !== 'faceit' || faceit), [faceit])
  const [tab, setTab] = useState<TabKey>('resumen')
  // Arranca en la temporada más reciente donde jugó (al inicio de temporada la actual está vacía).
  const [alcanceKey, setAlcanceKey] = useState(() => (alcances.find((a) => (a.stats?.matches ?? 0) > 0) ?? alcances[0])?.key ?? '')
  const tablistRef = useRef<HTMLDivElement>(null)
  const baseId = useId()

  const alcance = alcances.find((a) => a.key === alcanceKey) ?? alcances[0]
  const actual = tabs.find((t) => t.key === tab) ?? tabs[0]

  const elegir = useCallback(
    (key: TabKey, { foco = false, desdeHash = false } = {}) => {
      setTab(key)
      if (!desdeHash) {
        const hash = key === 'resumen' ? '' : `#${key}`
        window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}${hash}`)
      }
      const boton = tablistRef.current?.querySelector<HTMLButtonElement>(`[data-tab="${key}"]`)
      boton?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      if (foco) boton?.focus()
    },
    [],
  )

  // La pestaña sale del hash: links compartidos y el chip de FACEIT del encabezado (#faceit).
  useEffect(() => {
    const irARecomendaciones = () => {
      elegir('resumen', { desdeHash: true })
      requestAnimationFrame(() => document.getElementById(ANCLA_RECOMENDACIONES)?.scrollIntoView({ block: 'start' }))
    }
    const leer = () => {
      const key = window.location.hash.slice(1)
      if (key === ANCLA_RECOMENDACIONES) irARecomendaciones()
      else if (tabs.some((t) => t.key === key)) {
        elegir(key as TabKey, { desdeHash: true })
        tablistRef.current?.scrollIntoView({ block: 'start' })
      }
    }
    const inicial = window.location.hash.slice(1)
    if (inicial === ANCLA_RECOMENDACIONES) irARecomendaciones()
    else if (tabs.some((t) => t.key === inicial)) elegir(inicial as TabKey, { desdeHash: true })
    window.addEventListener('hashchange', leer)
    return () => window.removeEventListener('hashchange', leer)
  }, [tabs, elegir])

  const scopedHistory = useMemo(
    () => (alcance?.seasonId === null ? history : history.filter((h) => h.seasonId === alcance?.seasonId)),
    [history, alcance?.seasonId],
  )

  const onTeclado = (event: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.key === tab)
    const destino =
      event.key === 'ArrowRight' ? (i + 1) % tabs.length
      : event.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? tabs.length - 1
      : null
    if (destino === null) return
    event.preventDefault()
    elegir(tabs[destino].key, { foco: true })
  }

  if (!alcance) return null
  const label = rankLabel(alcance)
  const panelId = `${baseId}-panel`

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={tablistRef}
        role="tablist"
        aria-label={`Secciones del perfil de ${nombre}`}
        onKeyDown={onTeclado}
        className="-mx-3 flex scroll-mt-16 gap-1 overflow-x-auto border-b border-border px-3 [scrollbar-width:none] sm:mx-0 sm:px-0"
      >
        {tabs.map((t) => {
          const activa = t.key === actual.key
          const Icono = t.icon
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`${baseId}-tab-${t.key}`}
              data-tab={t.key}
              aria-selected={activa}
              aria-controls={panelId}
              tabIndex={activa ? 0 : -1}
              onClick={() => elegir(t.key)}
              className={cn(
                '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12px] font-semibold uppercase tracking-wider transition-colors',
                activa ? 'border-brand text-white' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Icono className="h-4 w-4" aria-hidden="true" />
              {t.label}
            </button>
          )
        })}
      </div>

      {actual.porTemporada && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SeasonTabs
            options={alcances.map((a) => ({ value: a.key, label: a.label, hint: a.isCurrent ? 'actual' : undefined }))}
            value={alcance.key}
            onChange={setAlcanceKey}
            layoutId="player-scope-tab"
            ariaLabel="Temporada de las estadísticas"
          />
          {label && (
            <span
              className={cn(
                'rounded-full border px-3 py-1 font-mono text-[12px] font-semibold',
                alcance.rank === 1 ? 'border-amber-300/50 bg-amber-300/10 text-amber-200' : 'border-border bg-card text-muted-foreground',
              )}
            >
              {alcance.rank === 1 ? '👑 ' : ''}
              {label}
            </span>
          )}
        </div>
      )}

      <div id={panelId} role="tabpanel" aria-labelledby={`${baseId}-tab-${actual.key}`} className="flex min-w-0 flex-col gap-4">
        <div key={actual.porTemporada ? `${actual.key}-${alcance.key}` : actual.key} className="perfil-panel min-w-0">
          {actual.key === 'resumen' && (
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="flex min-w-0 flex-col gap-4">
                <Cifras alcance={alcance} />
                <FormaReciente forma={alcance.perfil.forma} />
                <Curiosidades curiosidades={alcance.perfil.curiosidades} nombre={nombre} />
              </div>
              <aside className="flex min-w-0 flex-col gap-4">
                {comparacion}
                <Posiciones posiciones={alcance.perfil.posiciones} estilo={alcance.perfil.estilo} />
              </aside>
            </div>
          )}

          {actual.key === 'partidas' && (
            <section>
              <h2 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">Historial · {alcance.label}</h2>
              <PlayerMatchHistory key={alcance.key} matches={scopedHistory} />
            </section>
          )}

          {actual.key === 'mapas' && <Mapas mapas={alcance.perfil.mapas} />}

          {actual.key === 'companeros' && <Companeros companeros={alcance.perfil.companeros} nombre={nombre} />}

          {actual.key === 'marcas' && <Marcas marcas={alcance.perfil.mejoresMarcas} records={alcance.records} />}

          {actual.key === 'faceit' && faceit}
        </div>

        {/* Fuera del bloque de arriba: cambiar de temporada no las vuelve a cargar. */}
        {actual.key === 'resumen' && (
          <div id={ANCLA_RECOMENDACIONES} className="perfil-panel min-w-0 scroll-mt-20">
            <Recomendaciones playerId={playerId} nombre={nombre} iniciales={recomendacionesIniciales} />
          </div>
        )}
      </div>
    </div>
  )
}
