'use client'

import { useRouter } from 'next/navigation'
import type { PlayerStats } from '@/lib/mockData'
import { PlayerAvatar } from '@/components/strike-ui'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'

export function MiniLeaderboard({ stats }: { stats: PlayerStats[] }) {
  const router = useRouter()
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-base font-bold uppercase tracking-widest text-foreground">
          Ladder histórico
        </h2>
        <span className="text-[11px] text-muted-foreground">
          {stats.length} jugadores · por KDA
        </span>
      </header>
      <ol className="flex flex-col">
        {stats.map((s, i) => (
          <li key={s.player.id}>
            <button
              onClick={() => router.push(`/players/${s.player.id}`)}
              className="flex w-full cursor-pointer items-center gap-3 border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/60"
            >
              <div className="flex w-12 shrink-0 items-center justify-center gap-0.5">
                <div className="flex w-4 items-center justify-end">
                  {i === 0 && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />}
                  {i === 1 && <Star className="h-3.5 w-3.5 fill-slate-300 text-slate-400" />}
                  {i === 2 && <Star className="h-3.5 w-3.5 fill-amber-700 text-amber-800" />}
                  {i >= stats.length - 3 && <span className="text-[12px]">💀</span>}
                </div>
                <span
                  className={cn(
                    'w-4 text-center font-mono text-[13px] font-bold',
                    i === 0 ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {i + 1}
                </span>
                <div className="w-4" />
              </div>
              <PlayerAvatar player={s.player} size={32} />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-semibold leading-tight text-foreground">
                    {s.player.name}
                  </span>
                  {s.mvps > 0 && (
                    <span 
                      title="Total de MVPs"
                      className="flex shrink-0 items-center gap-1 rounded border border-[#d4af37]/30 bg-[#101010] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-[#d4af37] shadow-sm cursor-help"
                    >
                      👑 {s.mvps}
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {s.kills}/{s.deaths}/{s.assists} · {s.wins}W-{s.losses}L
                </span>
              </div>
              <span
                className={cn(
                  'font-mono text-[15px] font-bold',
                  i < 3
                    ? 'text-emerald-500'
                    : i >= stats.length - 3
                      ? 'text-primary'
                      : 'text-yellow-500',
                )}
              >
                {s.kda.toFixed(2)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
