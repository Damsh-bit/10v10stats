'use client'

import type { RatedPlayer } from '@/lib/teamBalancer'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { Dices } from 'lucide-react'
import { motion } from 'motion/react'

export function TeamResultCard({
  teamName,
  players,
  onRerollPlayer,
}: {
  teamName: string
  players: RatedPlayer[]
  onRerollPlayer?: (playerId: string) => void
}) {
  const totalRating = players.reduce((sum, p) => sum + p.rating, 0)
  const avgRating = totalRating / (players.length || 1)

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/20">
      <div className="bg-muted px-4 py-3 border-b border-border text-center">
        <h3 className="font-heading text-lg font-bold uppercase tracking-widest text-foreground">
          {teamName}
        </h3>
      </div>
      
      <div className="flex flex-col">
        {players.map((p, i) => {
          const wr = p.matches > 0 ? ((p.wins / p.matches) * 100).toFixed(0) : 0
          return (
            <motion.div
              key={p.player.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
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
              <div className="flex items-center gap-3">
                <div className="text-right flex flex-col">
                  <span className="font-mono text-[15px] font-bold text-brand">
                    {p.rating.toFixed(1)}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-muted-foreground">pts</span>
                </div>
                {onRerollPlayer && (
                  <button
                    onClick={() => onRerollPlayer(p.player.id)}
                    className="p-1.5 text-muted-foreground hover:text-brand hover:bg-primary/10 rounded-full transition-colors"
                    title="Cambiar jugador por otro al azar"
                  >
                    <Dices className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
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
