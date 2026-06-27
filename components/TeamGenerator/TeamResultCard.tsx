'use client'

import type { RatedPlayer } from '@/lib/teamBalancer'
import { PlayerAvatar } from '@/components/strike-ui'

export function TeamResultCard({
  teamName,
  players,
}: {
  teamName: string
  players: RatedPlayer[]
}) {
  const totalRating = players.reduce((sum, p) => sum + p.rating, 0)
  const avgRating = totalRating / (players.length || 1)

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="bg-muted px-4 py-3 border-b border-border text-center">
        <h3 className="font-heading text-lg font-bold uppercase tracking-widest text-foreground">
          {teamName}
        </h3>
      </div>
      
      <div className="flex flex-col">
        {players.map((p, i) => {
          const wr = p.matches > 0 ? ((p.wins / p.matches) * 100).toFixed(0) : 0
          return (
            <div
              key={p.player.id}
              className={`flex items-center justify-between px-4 py-3 ${
                i > 0 ? 'border-t border-border/50' : ''
              } hover:bg-white/[0.02] transition-colors`}
            >
              <div className="flex items-center gap-3">
                <PlayerAvatar player={p.player} size={36} />
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-foreground">
                    {p.player.name}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
                    KDA {p.kda.toFixed(2)} · ADM {p.adm} · WR {wr}%
                  </span>
                </div>
              </div>
              <div className="text-right flex flex-col">
                <span className="font-mono text-[15px] font-bold text-primary">
                  {p.rating.toFixed(1)}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground">pts</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-black/20 p-4 border-t border-border/50 flex flex-col items-center justify-center gap-1 text-center">
        <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
          Rating Total
        </span>
        <span className="font-mono text-2xl font-black text-foreground">
          {totalRating.toFixed(1)}
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          Promedio: {avgRating.toFixed(1)}
        </span>
      </div>
    </div>
  )
}
