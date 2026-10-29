import { Flame, Snowflake } from 'lucide-react'
import type { MatchResult, PlayerForm } from '@/lib/team-history'
import type { PlayerProfile } from '@/lib/teamBalancer'
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

/** De dónde sale el rating de un jugador, para el tooltip. */
export function ratingBreakdown(profile: PlayerProfile, sourceLabel: string) {
  const { xplay } = profile
  const form = profile.power - profile.rating
  const formText = Math.abs(form) >= 0.005 ? ` · forma ${form > 0 ? '+' : ''}${form.toFixed(2)}` : ''
  const sample =
    xplay.crudo === null
      ? `sin partidas con Xplay en ${sourceLabel}`
      : `${xplay.crudo.toFixed(2)} en ${xplay.partidas} ${xplay.partidas === 1 ? 'partida' : 'partidas'} con Xplay (${sourceLabel})`
  const base = { promedio: 'el promedio del grupo', faceit: 'su FACEIT', carrera: 'su carrera' }[xplay.base]
  return `Rating ${profile.rating.toFixed(2)}: ${sample}, ajustado con ${base} por la muestra${formText}`
}

/** 6 → "6", 6.5 → "6,5". */
export function formatHalf(value: number) {
  return Number.isInteger(value) ? String(value) : value.toLocaleString('es-AR', { maximumFractionDigits: 1 })
}
