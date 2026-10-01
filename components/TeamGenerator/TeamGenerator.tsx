'use client'

import { useMemo, useState } from 'react'
import type { PlayerStats } from '@/types'

import { FACEIT_WEIGHTS, generateTeams, type FaceitInfo, type FaceitWeightKey } from '@/lib/teamBalancer'
import type { PairStatsMap, PlayerForm } from '@/lib/team-history'
import { PlayerSelector } from './PlayerSelector'
import { MatchupHeader } from './MatchupHeader'
import { DuelBoard } from './DuelBoard'
import { TeamComparison } from './TeamComparison'
import { BalanceReasons } from './BalanceReasons'
import { Copy, RefreshCw, Users, Map as MapIcon } from 'lucide-react'
import { SeasonTabs } from '@/components/season/season-tabs'

const MAP_POOL = ['Mirage', 'Inferno', 'Nuke', 'Overpass', 'Vertigo', 'Ancient', 'Anubis', 'Dust II']
const TEAM_SIZE = 5

function getMapImageUrl(mapName: string) {
  const nameMap: Record<string, string> = {
    'Mirage': 'mirage.webp',
    'Inferno': 'inferno.webp',
    'Nuke': 'nuke.webp',
    'Overpass': 'overpass.webp',
    'Vertigo': '', // Sin imagen
    'Ancient': 'ancient.webp',
    'Anubis': 'anubis.webp',
    'Dust II': 'dust2.webp'
  }
  const file = nameMap[mapName]
  return file ? `/maps/${file}` : null
}

function randomMap(exclude?: string | null) {
  const pool = MAP_POOL.filter((map) => map !== exclude)
  return pool[Math.floor(Math.random() * pool.length)]
}

export type RatingSource = {
  key: string
  label: string
  hint?: string
  /** Toda la carrera: no hace falta completar con nada. */
  isCareer?: boolean
  stats: PlayerStats[]
  /** Duplas (juntos, rivales, quién rinde más) dentro de este contexto. */
  pairs: PairStatsMap
}

export function TeamGenerator({
  players,
  sources,
  faceit,
  form,
}: {
  /** Carrera de todos. */
  players: PlayerStats[]
  sources: RatingSource[]
  faceit: Record<string, FaceitInfo>
  form: Record<string, PlayerForm>
}) {
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.player.name.localeCompare(b.player.name))
  }, [players])

  // Arrancan todos seleccionados; se destilda a los que no juegan hoy.
  const [selectedIds, setSelectedIds] = useState<string[]>(sortedPlayers.map(p => p.player.id))
  const [sourceKey, setSourceKey] = useState(sources[0]?.key ?? '')
  const [weightKey, setWeightKey] = useState<FaceitWeightKey>('medio')
  const [generated, setGenerated] = useState(false)
  const [optionIndex, setOptionIndex] = useState(0)
  const [recommendedMap, setRecommendedMap] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const source = sources.find((s) => s.key === sourceKey) ?? sources[0]
  const sourceLabel = source?.label ?? 'Carrera'
  const faceitWeight = FACEIT_WEIGHTS.find((w) => w.key === weightKey)?.value ?? 0.5
  const ready = selectedIds.length === TEAM_SIZE * 2

  const result = useMemo(() => {
    if (!generated || !ready) return null
    return generateTeams(selectedIds, {
      sourceStats: source?.stats ?? players,
      sourceLabel,
      sourceIsCareer: source?.isCareer ?? true,
      careerStats: players,
      faceit,
      form,
      pairs: source?.pairs ?? {},
      faceitWeight,
    })
  }, [generated, ready, selectedIds, source, sourceLabel, players, faceit, form, faceitWeight])

  const optionCount = result?.options.length ?? 0
  const option = result && optionCount > 0 ? result.options[optionIndex % optionCount] : null

  const togglePlayer = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
    setGenerated(false)
    setOptionIndex(0)
  }

  const handleGenerate = () => {
    if (!ready) return
    setGenerated(true)
    setOptionIndex(0)
    setRecommendedMap(randomMap())
    setIsCopied(false)
  }

  const handleNextOption = () => {
    if (!ready) return
    setOptionIndex((i) => i + 1)
    setRecommendedMap((current) => randomMap(current))
    setIsCopied(false)
  }

  const handleCopy = () => {
    if (!option) return
    const lines = option.teams.map(
      (team) => `${team.name} (${Math.round(team.winProb * 100)}%): ${team.players.map((p) => p.stats.player.name).join(', ')}`,
    )
    const mapText = recommendedMap ? `\n\nMapa: ${recommendedMap}` : ''
    navigator.clipboard.writeText(`${lines.join('\n\n')}${mapText}`)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const mainAction = generated && ready ? handleNextOption : handleGenerate

  return (
    <div className="flex flex-col gap-8">
      <PlayerSelector
        players={sortedPlayers}
        selectedIds={selectedIds}
        onToggle={togglePlayer}
        faceit={faceit}
      />

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-center sm:gap-8">
        {sources.length > 1 && (
          <div className="flex max-w-full flex-col items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Rendimiento 10v10</span>
            <SeasonTabs
              options={sources.map((s) => ({ value: s.key, label: s.label, hint: s.hint }))}
              value={sourceKey}
              onChange={(key) => {
                setSourceKey(key)
                setOptionIndex(0)
              }}
              layoutId="team-source-tab"
              ariaLabel="Estadísticas del 10v10 para balancear"
            />
          </div>
        )}
        <div className="flex max-w-full flex-col items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Peso de FACEIT</span>
          <SeasonTabs
            options={FACEIT_WEIGHTS.map((w) => ({ value: w.key, label: w.label, hint: `${Math.round(w.value * 100)}%` }))}
            value={weightKey}
            onChange={(key) => {
              setWeightKey(key as FaceitWeightKey)
              setOptionIndex(0)
            }}
            layoutId="team-faceit-weight-tab"
            ariaLabel="Cuánto pesa el nivel de FACEIT"
          />
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={mainAction}
          disabled={!ready}
          className={`flex items-center gap-2 rounded-full px-8 py-3 text-[14px] font-bold uppercase tracking-widest transition-all ${
            ready
              ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 hover:bg-primary/90'
              : 'cursor-not-allowed bg-muted text-muted-foreground opacity-50'
          }`}
        >
          {generated && ready ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Otra opción
            </>
          ) : (
            <>
              <Users className="h-4 w-4" />
              Generar Equipos
            </>
          )}
        </button>
      </div>

      {option && result && (
        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

          {recommendedMap && (
            <div className="relative mx-auto flex w-full max-w-sm flex-col items-center justify-center overflow-hidden rounded-xl border border-border bg-card shadow-md">
              {(() => {
                const img = getMapImageUrl(recommendedMap)
                if (img) {
                  return (
                    <img src={img} alt={recommendedMap} className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-luminosity" />
                  )
                }
                return null
              })()}
              <div className="relative z-10 flex flex-col items-center p-5 text-center">
                <span className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  <MapIcon className="h-4 w-4" />
                  Mapa recomendado
                </span>
                <span className="font-heading text-3xl font-black uppercase tracking-widest text-brand drop-shadow-md">
                  {recommendedMap}
                </span>
              </div>
            </div>
          )}

          <MatchupHeader option={option} optionIndex={optionIndex % optionCount} optionCount={optionCount} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <DuelBoard option={option} sourceLabel={sourceLabel} />
            <TeamComparison option={option} sourceLabel={sourceLabel} />
          </div>

          <BalanceReasons option={option} sourceLabel={sourceLabel} faceitPct={Math.round(faceitWeight * 100)} total={result.total} />

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleNextOption}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <RefreshCw className="h-4 w-4" />
              Otra opción
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Copy className="h-4 w-4" />
              {isCopied ? 'Copiado!' : 'Copiar equipos'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
