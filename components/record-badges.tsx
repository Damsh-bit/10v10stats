import { Award, Frown, Crosshair, Target, Skull, ShieldAlert, Handshake, Zap, ShieldQuestion } from 'lucide-react'
import type { RecordType } from '@/lib/records'

export const RECORD_BADGE_CONFIG: Record<RecordType, { label: string; icon: React.ElementType; colorClass: string }> = {
  most_wins: { label: 'MÁS GANADOR', icon: Award, colorClass: 'text-[#d4af37] border-[#d4af37]/30 bg-[#101010]' },
  most_losses: { label: 'MÁS PERDEDOR', icon: Frown, colorClass: 'text-rose-500 border-rose-500/30 bg-rose-500/10' },
  max_kills: { label: 'RÉCORD KILLS', icon: Crosshair, colorClass: 'text-green-400 border-green-400/30 bg-green-400/10' },
  min_kills: { label: 'MENOS KILLS', icon: Target, colorClass: 'text-red-300 border-red-300/30 bg-red-300/10' },
  max_deaths: { label: 'RÉCORD MUERTES', icon: Skull, colorClass: 'text-red-500 border-red-500/30 bg-red-500/10' },
  min_deaths: { label: 'MENOS MUERTES', icon: ShieldAlert, colorClass: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  max_assists: { label: 'RÉCORD ASISTENCIAS', icon: Handshake, colorClass: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
  max_damage: { label: 'MÁS DAÑO', icon: Zap, colorClass: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
  min_damage: { label: 'MENOR DAÑO', icon: ShieldQuestion, colorClass: 'text-slate-400 border-slate-400/30 bg-slate-400/10' },
}

export function RecordBadge({ type }: { type: RecordType }) {
  const config = RECORD_BADGE_CONFIG[type]
  if (!config) return null
  const Icon = config.icon

  return (
    <span
      title={config.label}
      className={`flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-widest shadow-sm cursor-help ${config.colorClass}`}
    >
      <Icon className="h-3 w-3" /> {config.label}
    </span>
  )
}
