import { Flame, Snowflake } from 'lucide-react'
import type { MatchResult, PlayerForm } from '@/lib/team-history'
import type { PlayerProfile } from '@/lib/teamBalancer'
import { FaceitLevel } from '@/components/faceit/faceit-bits'
import { cn } from '@/lib/utils'

/** Colores de cada equipo: Equipo 1 carmesí, Equipo 2 celeste. */
export const TEAM_TONES = [
  { text: 'text-brand', bar: 'bg-brand', soft: 'bg-brand/10', border: 'border-brand/30' },
  { text: 'text-sky-300', bar: 'bg-sky-400', soft: 'bg-sky-400/10', border: 'border-sky-400/30' },
] as const

/** Texto con **negritas** (lo arma el balanceador). */
export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g)
  return (
    <span className={className}>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </span>
  )
}

/** 🔥 3W o ❄️ 3L cuando viene con racha de 3 o más en el 10v10. */
export function StreakBadge({ form, className }: { form: PlayerForm; className?: string }) {
  if (form.streak >= 3) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center gap-0.5 rounded border border-orange-500/40 bg-black/30 px-1 py-px text-[9px] font-semibold uppercase text-orange-400',
          className,
        )}
        title={`Ganó las últimas ${form.streak} del 10v10`}
      >
        <Flame className="h-3 w-3" aria-hidden="true" />
        {form.streak}W
      </span>
    )
  }
  if (form.streak <= -3) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center gap-0.5 rounded border border-cyan-500/40 bg-black/30 px-1 py-px text-[9px] font-semibold uppercase text-cyan-400',
          className,
        )}
        title={`Perdió las últimas ${-form.streak} del 10v10`}
      >
        <Snowflake className="h-3 w-3" aria-hidden="true" />
        {-form.streak}L
      </span>
    )
  }
  return null
}

const RESULT_STYLES: Record<MatchResult, string> = {
  W: 'bg-emerald-400/80',
  L: 'bg-rose-400/80',
  D: 'bg-muted-foreground/50',
}

const RESULT_LABELS: Record<MatchResult, string> = { W: 'victoria', L: 'derrota', D: 'empate' }

/** Últimas partidas del 10v10 como puntitos: de la más vieja a la última. */
export function FormDots({ results, className }: { results: MatchResult[]; className?: string }) {
  if (results.length === 0) return null
  const ordered = [...results].reverse()
  return (
    <span
      className={cn('flex items-center gap-[3px]', className)}
      role="img"
      aria-label={`Últimas ${results.length} del 10v10: ${ordered.map((r) => RESULT_LABELS[r]).join(', ')}`}
      title={`Últimas ${results.length} del 10v10 (la última a la derecha)`}
    >
      {ordered.map((result, i) => (
        <span key={i} className={cn('h-1.5 w-1.5 rounded-[2px]', RESULT_STYLES[result])} />
      ))}
    </span>
  )
}

/** Nivel de FACEIT; si no tiene, un anillo vacío con "?". */
export function ProfileLevel({ profile, size = 22 }: { profile: PlayerProfile; size?: number }) {
  if (profile.faceit) return <FaceitLevel level={profile.faceit.level} size={size} />
  return <NoFaceitLevel size={size} />
}

export function NoFaceitLevel({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 font-mono text-[10px] font-bold text-muted-foreground',
        className,
      )}
      style={{ width: size, height: size }}
      title="Sin FACEIT: se estima con su 10v10"
    >
      ?
    </span>
  )
}

/** 6 → "6", 6.5 → "6,5". */
export function formatHalf(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('es-AR', { maximumFractionDigits: 1 })
}
