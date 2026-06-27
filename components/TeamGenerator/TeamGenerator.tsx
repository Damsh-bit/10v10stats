'use client'

import { useState, useMemo } from 'react'
import type { PlayerStats } from '@/lib/mockData'
import { computePlayerRating, balanceTeams, regenerateTeams, sumRating, type RatedPlayer } from '@/lib/teamBalancer'
import { PlayerSelector } from './PlayerSelector'
import { TeamResultCard } from './TeamResultCard'
import { Copy, RefreshCw, Users } from 'lucide-react'

export function TeamGenerator({ players }: { players: PlayerStats[] }) {
  // Sort players alphabetically for the selector
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => a.player.name.localeCompare(b.player.name))
  }, [players])

  // Initially select all players, up to 10. If more, just first 10. Wait, the prompt says "Default state: ALL players selected (active)" 
  // Let's just select everyone by default, and user deselects.
  const [selectedIds, setSelectedIds] = useState<string[]>(sortedPlayers.map(p => p.player.id))
  
  const [teams, setTeams] = useState<[RatedPlayer[], RatedPlayer[]] | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  const togglePlayer = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleGenerate = () => {
    if (selectedIds.length !== 10) return
    const selectedStats = players.filter(p => selectedIds.includes(p.player.id))
    const rated = computePlayerRating(selectedStats)
    setTeams(balanceTeams(rated))
    setIsCopied(false)
  }

  const handleRegenerate = () => {
    if (selectedIds.length !== 10) return
    const selectedStats = players.filter(p => selectedIds.includes(p.player.id))
    const rated = computePlayerRating(selectedStats)
    setTeams(regenerateTeams(rated))
    setIsCopied(false)
  }

  const handleCopy = () => {
    if (!teams) return
    const [t1, t2] = teams
    const t1Names = t1.map(p => p.player.name).join(', ')
    const t2Names = t2.map(p => p.player.name).join(', ')
    const text = `Equipo 1: ${t1Names}\n\nEquipo 2: ${t2Names}`
    navigator.clipboard.writeText(text)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-8">
      <PlayerSelector 
        players={sortedPlayers} 
        selectedIds={selectedIds} 
        onToggle={togglePlayer} 
      />

      <div className="flex justify-center">
        <button
          onClick={teams ? handleRegenerate : handleGenerate}
          disabled={selectedIds.length !== 10}
          className={`flex items-center gap-2 rounded-full px-8 py-3 text-[14px] font-bold uppercase tracking-widest transition-all ${
            selectedIds.length === 10
              ? 'bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 hover:bg-primary/90'
              : 'cursor-not-allowed bg-muted text-muted-foreground opacity-50'
          }`}
        >
          {teams ? (
            <>
              <RefreshCw className="h-4 w-4" />
              Regenerar
            </>
          ) : (
            <>
              <Users className="h-4 w-4" />
              Generar Equipos
            </>
          )}
        </button>
      </div>

      {teams && (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TeamResultCard teamName="Equipo 1" players={teams[0]} />
            <TeamResultCard teamName="Equipo 2" players={teams[1]} />
          </div>
          
          <div className="flex flex-col items-center justify-center gap-4">
            {(() => {
              const diff = Math.abs(sumRating(teams[0]) - sumRating(teams[1]))
              let color = ''
              let label = ''
              if (diff < 5) {
                color = 'text-green-400 bg-green-400/10 border-green-400/30'
                label = 'Muy balanceado ✓'
              } else if (diff <= 15) {
                color = 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30'
                label = 'Aceptable'
              } else {
                color = 'text-red-400 bg-red-400/10 border-red-400/30'
                label = 'Desbalanceado'
              }
              
              return (
                <div className={`flex flex-col items-center justify-center p-3 rounded-lg border ${color}`}>
                  <span className="text-[11px] uppercase tracking-widest font-semibold opacity-80 mb-1">
                    Diferencia de rating
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-2xl font-black">{diff.toFixed(1)} pts</span>
                    <span className="text-[13px] font-bold tracking-wide">— {label}</span>
                  </div>
                </div>
              )
            })()}

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
