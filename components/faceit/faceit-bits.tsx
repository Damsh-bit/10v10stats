import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { Player } from '@/types'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { formatEloDelta, levelColor } from '@/lib/faceit-format'
import { cn } from '@/lib/utils'

/** Ícono de nivel al estilo FACEIT: anillo de 270° que se llena según el nivel. */
export function FaceitLevel({ level, size = 28, className }: { level: number; size?: number; className?: string }) {
  const color = levelColor(level)
  const r = 13
  const circumference = 2 * Math.PI * r
  const track = circumference * 0.75
  const fill = track * Math.min(1, Math.max(0.1, level / 10))

  return (
    <svg
      viewBox="0 0 36 36"
      width={size}
      height={size}
      role="img"
      aria-label={`Nivel ${level} de FACEIT`}
      className={cn('shrink-0', className)}
    >
      <title>{`Nivel ${level}`}</title>
      <circle cx="18" cy="18" r="17" fill="#0b0f14" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${track} ${circumference}`}
        transform="rotate(135 18 18)"
      />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${fill} ${circumference}`}
        transform="rotate(135 18 18)"
      />
      <text
        x="18"
        y="18.5"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#f7fafc"
        fontSize={level >= 10 ? 12 : 14}
        fontWeight="800"
        fontFamily="var(--font-geist-mono), monospace"
      >
        {level}
      </text>
    </svg>
  )
}

/** Últimos resultados: de la más vieja (izquierda) a la última (derecha, resaltada). */
export function FaceitForm({ results, size = 'sm' }: { results: boolean[]; size?: 'sm' | 'md' }) {
  if (results.length === 0) {
    return <span className="whitespace-nowrap text-[10px] text-muted-foreground">Sin partidas</span>
  }

  const ordered = [...results].reverse()
  return (
    <span className="flex items-center gap-0.5" aria-label={`Últimas ${results.length}: ${ordered.map((w) => (w ? 'victoria' : 'derrota')).join(', ')}`}>
      {ordered.map((won, i) => {
        const isLast = i === ordered.length - 1
        return (
          <span
            key={i}
            title={isLast ? `Última partida: ${won ? 'victoria' : 'derrota'}` : won ? 'Victoria' : 'Derrota'}
            className={cn(
              'flex items-center justify-center rounded-[3px] font-mono font-black leading-none',
              size === 'sm' ? 'h-4 w-4 text-[9px]' : 'h-5 w-5 text-[10px]',
              won ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300',
              isLast && (won ? 'ring-1 ring-emerald-400/70' : 'ring-1 ring-rose-400/70'),
            )}
          >
            {won ? 'W' : 'L'}
          </span>
        )
      })}
    </span>
  )
}

/** Mini gráfico del elo: verde si viene subiendo, rojo si viene bajando. */
export function EloSparkline({
  id,
  values,
  trend,
  width = 96,
  height = 28,
  className,
}: {
  /** Único por página: el degradé se referencia por id. */
  id: string
  values: number[]
  /** Fuerza el color (por ejemplo con el mismo número que se muestra al lado). */
  trend?: number
  width?: number
  height?: number
  className?: string
}) {
  if (values.length < 2) return <span style={{ width, height }} className={cn('shrink-0', className)} aria-hidden="true" />

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 3
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - pad * 2) + pad
    const y = height - pad - ((v - min) / span) * (height - pad * 2)
    return [x, y] as const
  })
  const up = (trend ?? values[values.length - 1] - values[0]) >= 0
  const stroke = up ? '#34d399' : '#fb7185'
  const line = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${pad},${height} ${line} ${width - pad},${height}`
  const [lastX, lastY] = points[points.length - 1]
  const gradientId = `spark-${id}`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn('shrink-0 overflow-visible', className)} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradientId})`} />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={stroke} stroke="#022942" strokeWidth="1.5" />
    </svg>
  )
}

/** Cuánto elo ganó o perdió, con flecha además del color. */
export function EloDelta({ value, className }: { value: number; className?: string }) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-mono font-bold tabular-nums',
        value > 0 ? 'text-emerald-400' : value < 0 ? 'text-rose-400' : 'text-muted-foreground',
        className,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {formatEloDelta(value)}
    </span>
  )
}

/** Avatar de FACEIT; si no tiene, la foto del 10v10. */
export function FaceitAvatar({ player, avatar, size = 36 }: { player: Player; avatar: string | null; size?: number }) {
  if (!avatar) return <PlayerAvatar player={player} size={size} />
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatar}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className="shrink-0 rounded-full object-cover ring-1 ring-white/10"
      style={{ width: size, height: size }}
    />
  )
}
