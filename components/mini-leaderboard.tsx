'use client'

import { useRouter } from 'next/navigation'
import type { PlayerStats } from '@/lib/mockData'
import { PlayerAvatar } from '@/components/strike-ui'
import { cn } from '@/lib/utils'

export function MiniLeaderboard({ stats }: { stats: PlayerStats[] }) {
  const router = useRouter()
  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-heading text-base font-bold uppercase tracking-widest text-foreground">
          Leaderboard
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
              className="flex w-full items-center gap-3 border-b border-border px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/60"
            >
              <span
                className={cn(
                  'w-5 text-center font-mono text-[13px] font-bold',
                  i === 0 ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {i + 1}
              </span>
              <PlayerAvatar player={s.player} size={32} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[14px] font-semibold leading-tight text-foreground">
                  {s.player.name}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {s.kills}/{s.deaths}/{s.assists} · {s.wins}W-{s.losses}L
                </span>
              </div>
              <span className="font-mono text-[15px] font-bold text-primary">
                {s.kda.toFixed(2)}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
