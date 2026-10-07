'use client'

import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { EloChartPoint, EloRaceDay, EloRaceSeries } from '@/lib/faceit'
import { formatEloDelta, levelFloorsBetween } from '@/lib/faceit-format'
import { cn } from '@/lib/utils'
import { useMotionEnabled } from '@/components/motion/motion-provider'

/** Línea destacada (dorado de la temporada) y líneas de contexto. Validados para daltonismo sobre la card. */
const FOCUS = '#f5b43c'
const CONTEXT = '#3f6584'
const GRID = 'rgba(255,255,255,0.06)'
const AXIS_TEXT = { fill: '#93b3c9', fontSize: 10, fontFamily: 'var(--font-geist-mono), monospace' }

function eloDomain(values: number[]): [number, number] {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const pad = Math.max(20, (max - min) * 0.15)
  return [Math.floor((min - pad) / 25) * 25, Math.ceil((max + pad) / 25) * 25]
}

function LevelLines({ domain }: { domain: [number, number] }) {
  return (
    <>
      {levelFloorsBetween(domain[0], domain[1]).map((floor) => (
        <ReferenceLine
          key={floor.level}
          y={floor.elo}
          stroke="rgba(255,255,255,0.22)"
          strokeDasharray="4 4"
          label={{ value: `Nv ${floor.level}`, position: 'insideTopLeft', fill: '#93b3c9', fontSize: 10 }}
        />
      ))}
    </>
  )
}

// ─── Elo de un jugador ────────────────────────────────────────────────────────

export function FaceitEloChart({ points, height = 220 }: { points: EloChartPoint[]; height?: number }) {
  const data = useMemo(() => points.map((p, i) => ({ ...p, n: i + 1 })), [points])
  const domain = useMemo(() => eloDomain(points.map((p) => p.elo)), [points])
  const motionEnabled = useMotionEnabled()

  if (points.length < 2) {
    return (
      <div className="flex items-center justify-center text-[12px] text-muted-foreground" style={{ height }}>
        Todavía no hay suficientes partidas con elo para graficar.
      </div>
    )
  }

  return (
    <div style={{ height }} role="img" aria-label={`Elo en las últimas ${points.length} partidas: de ${points[0].elo} a ${points[points.length - 1].elo}`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="faceit-elo-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={FOCUS} stopOpacity={0.28} />
              <stop offset="100%" stopColor={FOCUS} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="n"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TEXT}
            interval="preserveStartEnd"
            minTickGap={24}
            // Varias partidas el mismo día: la fecha va una sola vez.
            tickFormatter={(n: number) => (data[n - 1]?.label === data[n - 2]?.label ? '' : (data[n - 1]?.label ?? ''))}
          />
          <YAxis domain={domain} tickLine={false} axisLine={false} tick={AXIS_TEXT} width={44} allowDecimals={false} />
          <LevelLines domain={domain} />
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.35)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              const point = active ? (payload?.[0]?.payload as (EloChartPoint & { n: number }) | undefined) : undefined
              if (!point) return null
              return (
                <div className="rounded-lg border border-border bg-popover px-3 py-2 text-[11px] shadow-xl">
                  <p className="font-mono text-base font-black text-foreground">{point.elo}</p>
                  <p className="text-muted-foreground">
                    {point.label} ·{' '}
                    {point.won === null ? (
                      'Actualización de elo'
                    ) : (
                      <>
                        {point.map} ·{' '}
                        <span className={point.won ? 'text-emerald-300' : 'text-rose-300'}>{point.won ? 'Victoria' : 'Derrota'}</span>
                      </>
                    )}
                    {point.delta !== null && <> · {formatEloDelta(point.delta)}</>}
                  </p>
                </div>
              )
            }}
          />
          <Area
            type="monotone"
            dataKey="elo"
            stroke={FOCUS}
            strokeWidth={2}
            fill="url(#faceit-elo-fill)"
            activeDot={{ r: 5, stroke: '#022942', strokeWidth: 2, fill: FOCUS }}
            dot={false}
            isAnimationActive={motionEnabled}
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Carrera de elo del grupo ─────────────────────────────────────────────────

export function FaceitEloRace({
  series,
  rows,
  change,
  height = 320,
}: {
  series: EloRaceSeries[]
  rows: EloRaceDay[]
  change: Record<string, number>
  height?: number
}) {
  const ordered = useMemo(() => [...series].sort((a, b) => b.elo - a.elo), [series])
  const [focusId, setFocusId] = useState(ordered[0]?.id ?? '')
  const domain = useMemo(
    () => eloDomain(rows.flatMap((r) => series.map((s) => r[s.id])).filter((v): v is number => typeof v === 'number')),
    [rows, series],
  )
  const focus = series.find((s) => s.id === focusId)
  // El destacado se dibuja último para que quede arriba.
  const drawOrder = useMemo(() => [...series.filter((s) => s.id !== focusId), ...series.filter((s) => s.id === focusId)], [series, focusId])

  if (series.length === 0 || rows.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Jugador destacado en el gráfico">
        {ordered.map((s) => {
          const active = s.id === focusId
          const delta = change[s.id] ?? 0
          return (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setFocusId(s.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                active
                  ? 'border-amber-300/60 bg-amber-300/10 text-foreground'
                  : 'border-border bg-background/40 text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground',
              )}
            >
              <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: active ? FOCUS : CONTEXT }} aria-hidden="true" />
              {s.name}
              <span className={cn('font-mono text-[10px]', delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-muted-foreground')}>
                {formatEloDelta(delta)}
              </span>
            </button>
          )
        })}
      </div>

      <div style={{ height }} role="img" aria-label={`Elo de cada jugador por día en los últimos ${rows.length} días`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 56, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={AXIS_TEXT} interval="preserveStartEnd" minTickGap={28} />
            <YAxis domain={domain} tickLine={false} axisLine={false} tick={AXIS_TEXT} width={44} allowDecimals={false} />
            <LevelLines domain={domain} />
            <Tooltip
              cursor={{ stroke: 'rgba(255,255,255,0.35)', strokeWidth: 1 }}
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null
                const row = payload[0].payload as EloRaceDay
                const values = ordered
                  .map((s) => ({ s, elo: row[s.id] }))
                  .filter((v): v is { s: EloRaceSeries; elo: number } => typeof v.elo === 'number')
                  .sort((a, b) => b.elo - a.elo)
                return (
                  <div className="min-w-[150px] rounded-lg border border-border bg-popover px-3 py-2 text-[11px] shadow-xl">
                    <p className="mb-1 text-muted-foreground">{label}</p>
                    <ul className="flex flex-col gap-0.5">
                      {values.map(({ s, elo }) => (
                        <li key={s.id} className={cn('flex items-center gap-2', s.id === focusId ? 'text-foreground' : 'text-muted-foreground')}>
                          <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: s.id === focusId ? FOCUS : CONTEXT }} aria-hidden="true" />
                          <span className="font-mono font-bold tabular-nums text-foreground">{elo}</span>
                          <span className="truncate">{s.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              }}
            />
            {drawOrder.map((s) => {
              const isFocus = s.id === focusId
              return (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.id}
                  name={s.name}
                  stroke={isFocus ? FOCUS : CONTEXT}
                  strokeWidth={isFocus ? 2.5 : 1.25}
                  strokeOpacity={isFocus ? 1 : 0.7}
                  dot={false}
                  activeDot={isFocus ? { r: 5, stroke: '#022942', strokeWidth: 2, fill: FOCUS } : false}
                  connectNulls={false}
                  isAnimationActive={false}
                  label={
                    isFocus
                      ? (props: { x?: number | string; y?: number | string; index?: number }) =>
                          props.index === rows.length - 1 ? (
                            <text key="focus-label" x={Number(props.x) + 8} y={Number(props.y)} dy={4} fill="#f7fafc" fontSize={11} fontWeight={700}>
                              {s.name}
                            </text>
                          ) : (
                            <g key={`empty-${props.index}`} />
                          )
                      : undefined
                  }
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
      {focus && (
        <p className="text-[11px] text-muted-foreground">
          Tocá un nombre para destacarlo. Las líneas punteadas marcan dónde empieza cada nivel.
        </p>
      )}
    </div>
  )
}
