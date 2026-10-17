import { KDaBadges } from '@/components/players/kda-badges'
import { RecordBadge } from '@/components/players/record-badges'
import AnimatedNumber from '@/components/ui/animated-number'
import { cn } from '@/lib/utils'
import type { AlcancePerfil } from './tipos'

const chipClass = 'flex items-center gap-1 rounded border bg-[#101010] px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest'

/** Las cifras principales de la temporada elegida y sus insignias. */
export function Cifras({ alcance }: { alcance: AlcancePerfil }) {
  const s = alcance.stats
  const matches = s?.matches ?? 0
  const winrate = matches > 0 && s ? Math.round((s.wins / matches) * 100) : 0
  const hasBadges =
    alcance.records.length > 0 || alcance.menudaMierda || (s?.mvps ?? 0) > 0 || (s?.currentStreak ?? 0) >= 3 || alcance.nelsons > 0 || matches > 0

  const cards = [
    { label: 'Partidas', value: matches },
    { label: 'G-E-P', text: s ? `${s.wins}-${s.draws}-${s.losses}` : '0-0-0', title: 'Ganadas, empatadas y perdidas' },
    { label: 'Winrate', value: winrate, suffix: '%' },
    { label: 'KDA', value: s?.kda ?? 0, decimals: 2, accent: true },
    { label: 'Kills', value: s?.kills ?? 0 },
    { label: 'Deaths', value: s?.deaths ?? 0 },
    { label: 'ADM', value: s?.adm ?? 0, title: 'Daño promedio por partida' },
    { label: 'HS', value: s?.hsPct ?? 0, suffix: '%' },
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
        {cards.map((card) => (
          <div
            key={card.label}
            className={cn(
              'flex min-w-0 flex-col gap-0.5 rounded-lg border px-2 py-2 sm:rounded-xl sm:px-3 sm:py-2.5',
              card.accent ? 'border-primary/40 bg-primary/10' : 'border-border/60 bg-card',
            )}
            title={card.title}
          >
            <span className="truncate text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[10px]">{card.label}</span>
            <span
              className={cn(
                'truncate font-mono font-bold tracking-tight',
                card.text ? 'text-[13px] sm:text-base' : 'text-[15px] sm:text-lg',
                card.accent ? 'text-brand' : 'text-foreground',
              )}
            >
              {card.text ?? <AnimatedNumber value={card.value ?? 0} decimals={card.decimals ?? 0} suffix={card.suffix ?? ''} />}
            </span>
          </div>
        ))}
      </div>

      {hasBadges && (
        <div className="flex flex-wrap items-center gap-1.5">
          {alcance.records.map((record) => (
            <RecordBadge key={record} type={record} />
          ))}
          {alcance.menudaMierda && (
            <span title="Badge de honor" className={cn(chipClass, 'cursor-help border-amber-700/50 text-amber-600')}>
              💩 Menuda mierda
            </span>
          )}
          {(s?.mvps ?? 0) > 0 && (
            <span className={cn(chipClass, 'border-[#d4af37]/30 text-[#d4af37]')}>
              👑 {s?.mvps} MVP{s?.mvps !== 1 ? 's' : ''}
            </span>
          )}
          {(s?.currentStreak ?? 0) >= 3 && alcance.isCurrent && (
            <span className={cn(chipClass, 'border-orange-500/30 text-orange-500')}>🔥 Racha de {s?.currentStreak}</span>
          )}
          {alcance.nelsons > 0 && (
            <span className={cn(chipClass, 'border-primary/40 text-brand')}>
              💀 {alcance.nelsons} Nelson{alcance.nelsons !== 1 ? 's' : ''}
            </span>
          )}
          {s && <KDaBadges positiveGames={s.positiveGames} negativeGames={s.negativeGames} size="sm" />}
        </div>
      )}
    </div>
  )
}
