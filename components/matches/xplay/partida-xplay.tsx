'use client'

import { useMemo, useState } from 'react'
import { Download, ExternalLink, Film, ListOrdered, Swords, Table2, type LucideIcon } from 'lucide-react'
import type { Player } from '@/types'
import type { DetalleXplay } from '@/lib/xplay/leer'
import type { EquipoXplay } from '@/lib/xplay/tipos'
import { cn } from '@/lib/utils'
import { armarParticipantes } from './comun'
import { TablaXplay } from './tabla-xplay'
import { RondasXplay } from './rondas-xplay'
import { DuelosXplay } from './duelos-xplay'

type Pestana = 'tabla' | 'rondas' | 'duelos' | 'replay'

const PESTANAS: { key: Pestana; label: string; icono: LucideIcon }[] = [
  { key: 'tabla', label: 'Tabla', icono: Table2 },
  { key: 'rondas', label: 'Rondas', icono: ListOrdered },
  { key: 'duelos', label: 'Duelos', icono: Swords },
  { key: 'replay', label: 'Replay 2D', icono: Film },
]

/** Todo lo de Xplay de una partida: tabla completa, rondas, duelos y el replay de SCOPE. */
export function PartidaXplay({
  detalle,
  players,
  teamALabel,
  teamBLabel,
  mvpPlayerId,
}: {
  detalle: DetalleXplay
  players: Player[]
  teamALabel: string
  teamBLabel: string
  mvpPlayerId?: string
}) {
  const [pestana, setPestana] = useState<Pestana>('tabla')
  const participantes = useMemo(() => armarParticipantes(detalle, players), [detalle, players])
  const nombres: Record<EquipoXplay, string> =
    detalle.equipoA === 1 ? { 1: teamALabel, 2: teamBLabel } : { 1: teamBLabel, 2: teamALabel }
  const [s1, s2] = detalle.marcador
  const ganador: EquipoXplay | null = s1 === s2 ? null : s1 > s2 ? 1 : 2
  const replayUrl = detalle.scopeMatchId ? `https://app.scope.gg/es/embed/replay-2d?match_id=${detalle.scopeMatchId}` : null

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Datos de la partida" className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]">
          {PESTANAS.filter((p) => p.key !== 'replay' || replayUrl).map((p) => {
            const activa = p.key === pestana
            const Icono = p.icono
            return (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={activa}
                onClick={() => setPestana(p.key)}
                className={cn(
                  '-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12px] font-semibold uppercase tracking-wider transition-colors',
                  activa ? 'border-brand text-white' : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icono className="h-4 w-4" aria-hidden="true" />
                {p.label}
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[12px]">
          <a
            href={detalle.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            Ver en Xplay <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
          {detalle.demoUrl ? (
            <a
              href={detalle.demoUrl}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-muted-foreground transition-colors hover:text-foreground"
              title="La demo completa de CS2 (.dem.gz, pesa bastante)"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" /> Demo
            </a>
          ) : null}
        </div>
      </div>

      <div role="tabpanel" className="min-w-0">
        {pestana === 'tabla' && (
          <TablaXplay detalle={detalle} participantes={participantes} nombres={nombres} ganador={ganador} mvpPlayerId={mvpPlayerId} />
        )}
        {pestana === 'rondas' && <RondasXplay detalle={detalle} participantes={participantes} nombres={nombres} />}
        {pestana === 'duelos' && <DuelosXplay detalle={detalle} participantes={participantes} nombres={nombres} />}
        {pestana === 'replay' && replayUrl && (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <iframe
              src={replayUrl}
              title="Replay 2D de la partida"
              loading="lazy"
              allow="fullscreen"
              className="block h-[70vh] min-h-[420px] w-full bg-white"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-3 py-2 text-[12px] text-muted-foreground">
              <span>Replay de SCOPE.GG: elegí la ronda en la barra de arriba y dale play.</span>
              <a href={replayUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                Pantalla completa <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">Datos de Xplay, procesados por SCOPE.GG.</p>
    </section>
  )
}
