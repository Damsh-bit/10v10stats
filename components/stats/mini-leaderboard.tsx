'use client'

import { useRouter } from 'next/navigation'
import type { PlayerStats } from '@/types'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'
import { KDaBadges } from '@/components/players/kda-badges'
import type { PlayerRecordMap } from '@/lib/records'
import { RecordBadge } from '@/components/players/record-badges'
import AnimatedNumber from '@/components/ui/animated-number'

export function MiniLeaderboard({ stats, records, topFakadorId }: { stats: PlayerStats[], records?: PlayerRecordMap, topFakadorId?: string | null }) {
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
              className="flex w-full cursor-pointer items-center gap-2 sm:gap-3 border-b border-border px-2 sm:px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-accent/60"
            >
              <div className="flex w-12 shrink-0 items-center justify-center gap-0.5">
                <div className="flex w-4 items-center justify-end">
                  {i === 0 && <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-500" />}
                  {i === 1 && <Star className="h-3.5 w-3.5 fill-slate-300 text-slate-400" />}
                  {i === 2 && <Star className="h-3.5 w-3.5 fill-amber-700 text-amber-800" />}
                  {i >= stats.length - 3 && i !== stats.length - 1 && <span className="text-[12px]">💀</span>}
                  {i === stats.length - 1 && <span className="text-[12px]">💩</span>}
                </div>
                <span
                  className={cn(
                    'w-4 text-center font-mono text-[13px] font-bold',
                    i === 0 ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  {i + 1}
                </span>
                <div className="flex w-4 items-center justify-center">
                  {s.trend === 'up' && <span className="text-green-500 text-[10px]" title="Subió de puesto">▲</span>}
                  {s.trend === 'down' && <span className="text-red-500 text-[10px]" title="Bajó de puesto">▼</span>}
                  {s.trend === 'same' && <span className="text-muted-foreground/50 text-[12px] font-bold" title="Mantuvo puesto">=</span>}
                </div>
              </div>
              <PlayerAvatar player={s.player} size={32} />
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-[14px] font-semibold leading-tight text-foreground">
                    {s.player.name}
                  </span>
                  {s.mvps > 0 && (
                    <span 
                      title="Total de MVPs"
                      className="flex shrink-0 items-center gap-1 rounded border border-[#d4af37]/30 bg-[#101010] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-[#d4af37] shadow-sm cursor-help"
                    >
                      👑 <AnimatedNumber value={s.mvps} />
                    </span>
                  )}
                  {s.currentStreak >= 3 && (
                    <span 
                      title={`Racha de ${s.currentStreak} victorias`}
                      className="flex shrink-0 items-center gap-1 rounded border border-green-500/30 bg-[#101010] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-green-500 shadow-sm cursor-help"
                    >
                      🔥 <AnimatedNumber value={s.currentStreak} /> W
                    </span>
                  )}
                  {s.currentLossStreak >= 3 && (
                    <span 
                      title={`Racha de ${s.currentLossStreak} derrotas`}
                      className="flex shrink-0 items-center gap-1 rounded border border-cyan-500/30 bg-[#101010] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-cyan-500 shadow-sm cursor-help"
                    >
                      🧊 <AnimatedNumber value={s.currentLossStreak} /> L
                    </span>
                  )}
                  {i === stats.length - 1 && (
                    <span 
                      title="Último lugar del ladder"
                      className="flex shrink-0 items-center gap-1 rounded border border-amber-700/50 bg-[#101010] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-amber-600 shadow-sm cursor-help"
                    >
                      💩 MENUDA MIERDA
                    </span>
                  )}
                  {records?.[s.player.id]?.map((record) => (
                    <RecordBadge key={record} type={record} />
                  ))}
                  {s.player.nelsons > 0 && (
                    <span 
                      title="Total de Nelsons"
                      className="flex shrink-0 items-center gap-1 rounded border border-primary/30 bg-[#101010] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-primary shadow-sm cursor-help"
                    >
                      💀 <AnimatedNumber value={s.player.nelsons} />
                    </span>
                  )}
                  {topFakadorId === s.player.id && (
                    <span
                      title="Top 1 Fakasos"
                      className="flex shrink-0 items-center gap-1 rounded border border-purple-500/30 bg-[#101010] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest text-purple-400 shadow-sm cursor-help"
                    >
                      🎭 TOP FAKASO
                    </span>
                  )}
                  <KDaBadges positiveGames={s.positiveGames} negativeGames={s.negativeGames} size="sm" />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-0.5 font-mono text-[10px] sm:text-[11px] text-muted-foreground">
                  <span title="Kills/Deaths/Assists"><AnimatedNumber value={s.kills} />/<AnimatedNumber value={s.deaths} />/<AnimatedNumber value={s.assists} /></span>
                  <span className="opacity-40">·</span>
                  <span className="text-yellow-500/80" title="% de Headshots"><AnimatedNumber value={s.hsPct} decimals={0} suffix="%" /> HS</span>
                  <span className="opacity-40">·</span>
                  <span title="Average Damage per Match"><AnimatedNumber value={s.adm} suffix=" ADM" /></span>
                  <span className="opacity-40">·</span>
                  <span title="Winrate"><AnimatedNumber value={s.wins} />W-<AnimatedNumber value={s.draws} />D-<AnimatedNumber value={s.losses} />L ({s.matches > 0 ? <AnimatedNumber value={(s.wins / s.matches) * 100} decimals={0} suffix="%" /> : '0%'} WR)</span>
                </div>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 sm:hidden mb-0.5">KDA</span>
                <span
                  className={cn(
                    'font-mono text-[14px] sm:text-[15px] font-bold',
                    i < 3
                      ? 'text-emerald-500'
                      : i >= stats.length - 3 && i !== stats.length - 1
                        ? 'text-primary'
                        : i === stats.length - 1
                          ? 'text-amber-600'
                          : 'text-yellow-500',
                  )}
                  title="KDA"
                >
                  {s.kda.toFixed(2)}
                </span>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
