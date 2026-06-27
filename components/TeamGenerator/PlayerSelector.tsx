'use client'

import type { PlayerStats } from '@/lib/mockData'
import { PlayerAvatar, BadgePill } from '@/components/strike-ui'

export function PlayerSelector({
  players,
  selectedIds,
  onToggle,
}: {
  players: PlayerStats[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  const selectedCount = selectedIds.length
  
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between border-b border-border/50 pb-3">
        <h2 className="font-heading text-sm font-bold uppercase tracking-widest text-foreground">
          Selección de Jugadores
        </h2>
        <span className="font-mono text-xs text-muted-foreground">
          {selectedCount} seleccionados
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {players.map((p) => {
          const isSelected = selectedIds.includes(p.player.id)
          return (
            <button
              key={p.player.id}
              onClick={() => onToggle(p.player.id)}
              className={`flex items-center gap-3 rounded-lg border p-2.5 transition-all ${
                isSelected
                  ? 'border-primary/50 bg-primary/10 shadow-[0_0_10px_rgba(149,12,66,0.1)]'
                  : 'border-border/50 bg-background/50 opacity-60 hover:opacity-100 hover:border-border'
              }`}
            >
              <PlayerAvatar player={p.player} size={32} />
              <div className="flex min-w-0 flex-col items-start gap-0.5">
                <span
                  className={`truncate text-[13px] font-semibold leading-none ${
                    isSelected ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {p.player.name}
                </span>
                <BadgePill>{p.player.badge}</BadgePill>
              </div>
            </button>
          )
        })}
      </div>

      {selectedCount !== 10 && (
        <div className="mt-2 rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3 text-center text-sm font-medium text-yellow-500">
          {selectedCount < 10
            ? `Faltan seleccionar ${10 - selectedCount} jugadores`
            : `Deseleccioná ${selectedCount - 10} jugadores`}
        </div>
      )}
    </div>
  )
}
