'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'motion/react'
import { CalendarX, Flame, Info, Snowflake, Trophy, UserPlus } from 'lucide-react'
import type { Player, PlayerStats } from '@/types'
import type { PlayerRecordMap } from '@/lib/records'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { KDaBadges } from '@/components/players/kda-badges'
import { RecordBadge } from '@/components/players/record-badges'
import { LadderExplicacion } from '@/components/stats/ladder-explicacion'
import { STRIKES_PARA_DESCUENTO, valorLadder } from '@/lib/ladder'
import { cn } from '@/lib/utils'

type LadderView = 'season' | 'recent'

type Props = {
  seasonName: string
  ranked: PlayerStats[]
  recent?: { stats: PlayerStats[]; matchCount: number } | null
  unplayed?: Player[]
  records?: PlayerRecordMap
  topFakadorId?: string | null
  /** Tabla final de una temporada cerrada: sin toggles ni llamados a jugar. */
  archived?: boolean
  emptyAction?: React.ReactNode
}

/**
 * Zonas de la tabla de la temporada en curso, como en una liga: arriba los
 * que mandan, abajo los que tendrían que descender. Cada zona tiene su color
 * (borde, fondo, puesto, KDA y barra) y un título con su nombre.
 */
type ZonaId = 'top' | 'promo' | 'medio' | 'peligro' | 'verguenza'

type EstiloZona = {
  titulo: string
  emoji: string
  /** Título: texto, línea y fondo. */
  texto: string
  linea: string
  fondoTitulo: string
  /** Filas: fondo/aura, borde, puesto+KDA, barra y avatar. */
  fila: string
  borde: string
  puesto: string
  barra: string
  avatar?: string
}

type Zona = EstiloZona & { id: ZonaId; desde: number; hasta: number }

const ESTILOS: Record<ZonaId, EstiloZona> = {
  top: {
    titulo: 'Top globales',
    emoji: '👑',
    texto: 'text-amber-300 text-gold-glow',
    linea: 'from-amber-300/70 via-amber-300/20 to-transparent',
    fondoTitulo: 'bg-gradient-to-r from-amber-400/[0.16] to-transparent',
    fila: 'bg-gradient-to-r from-amber-400/[0.16] via-amber-300/[0.05] to-transparent shadow-[inset_0_0_28px_rgba(251,191,36,0.10)]',
    borde: 'border-l-amber-300',
    puesto: 'text-amber-300',
    barra: 'bg-amber-300',
    avatar: 'ring-2 ring-amber-300/70 shadow-[0_0_14px_rgba(251,191,36,0.45)]',
  },
  promo: {
    titulo: 'En promoción a top globales',
    emoji: '⏫',
    texto: 'text-emerald-300',
    linea: 'from-emerald-400/60 via-emerald-400/15 to-transparent',
    fondoTitulo: 'bg-gradient-to-r from-emerald-400/[0.10] to-transparent',
    fila: 'bg-gradient-to-r from-emerald-400/[0.09] to-transparent',
    borde: 'border-l-emerald-400',
    puesto: 'text-emerald-300',
    barra: 'bg-emerald-400',
    avatar: 'ring-2 ring-emerald-400/50',
  },
  medio: {
    titulo: 'Empujan pero la tienen corta',
    emoji: '🤏',
    texto: 'text-sky-300',
    linea: 'from-sky-400/50 via-sky-400/10 to-transparent',
    fondoTitulo: 'bg-gradient-to-r from-sky-400/[0.07] to-transparent',
    fila: 'bg-gradient-to-r from-sky-400/[0.03] to-transparent',
    borde: 'border-l-sky-400/50',
    puesto: 'text-sky-200',
    barra: 'bg-sky-400/80',
  },
  peligro: {
    titulo: 'En peligro de descenso',
    emoji: '⚠️',
    texto: 'text-orange-300',
    linea: 'from-orange-400/60 via-orange-400/15 to-transparent',
    fondoTitulo: 'bg-gradient-to-r from-orange-500/[0.12] to-transparent',
    fila: 'bg-gradient-to-r from-orange-500/[0.10] to-transparent',
    borde: 'border-l-orange-400',
    puesto: 'text-orange-300',
    barra: 'bg-orange-400',
    avatar: 'ring-2 ring-orange-400/50',
  },
  verguenza: {
    titulo: 'La vergüenza del servidor',
    emoji: '🤡',
    texto: 'text-rose-400',
    linea: 'from-rose-500/70 via-rose-500/15 to-transparent',
    fondoTitulo: 'bg-gradient-to-r from-rose-600/[0.16] to-transparent',
    fila: 'bg-gradient-to-r from-rose-600/[0.12] via-rose-900/[0.06] to-transparent shadow-[inset_0_0_24px_rgba(225,29,72,0.10)]',
    borde: 'border-l-rose-500',
    puesto: 'text-rose-400',
    barra: 'bg-rose-500',
    avatar: 'grayscale-[60%] ring-2 ring-rose-500/50',
  },
}

/**
 * Arma las zonas según cuántos hay en la tabla, para que el medio no quede
 * vacío ni la parte de abajo más grande que la de arriba. Con 10 jugadores:
 * 3 arriba, 4 en el medio, 2 en peligro y el último en la vergüenza; con 12-13,
 * dos en la vergüenza. La zona de promoción vuelve si la tabla crece a 15 o más.
 */
export function armarZonas(total: number): Zona[] {
  const cuota = (divisor: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.floor(total / divisor)))
  const verguenza = total >= 5 ? cuota(6, 1, 3) : 0
  const peligro = total >= 6 ? cuota(5, 1, 3) : 0
  const top = Math.min(3, total - verguenza - peligro)
  const promo = total >= 15 ? cuota(7, 2, 3) : 0
  const medio = total - top - promo - peligro - verguenza

  const tamanos: [ZonaId, number][] = [
    ['top', top],
    ['promo', promo],
    ['medio', medio],
    ['peligro', peligro],
    ['verguenza', verguenza],
  ]

  let desde = 1
  return tamanos
    .filter(([, cantidad]) => cantidad > 0)
    .map(([id, cantidad]) => {
      const zona = { ...ESTILOS[id], id, desde, hasta: desde + cantidad - 1 }
      desde += cantidad
      return zona
    })
}

function rangoZona(zona: Zona) {
  return zona.desde === zona.hasta ? `#${zona.desde}` : `#${zona.desde}–${zona.hasta}`
}

function rangoZonaLegible(zona: Zona) {
  return zona.desde === zona.hasta ? `puesto ${zona.desde}` : `puestos ${zona.desde} a ${zona.hasta}`
}

/** Oro, plata y bronce: el número del podio (y toda la fila en el archivo). */
const MEDALS = [
  { row: 'bg-gradient-to-r from-amber-400/[0.12] to-transparent', bar: 'border-l-amber-300', rank: 'text-amber-300' },
  { row: 'bg-gradient-to-r from-slate-300/[0.08] to-transparent', bar: 'border-l-slate-300', rank: 'text-slate-200' },
  { row: 'bg-gradient-to-r from-orange-500/[0.08] to-transparent', bar: 'border-l-orange-400', rank: 'text-orange-300' },
]

export function SeasonLadder({
  seasonName,
  ranked,
  recent,
  unplayed = [],
  records,
  topFakadorId,
  archived = false,
  emptyAction,
}: Props) {
  const [view, setView] = useState<LadderView>('season')
  const [infoOpen, setInfoOpen] = useState(false)
  const showingRecent = view === 'recent' && !!recent
  const stats = showingRecent ? recent.stats : ranked
  const maxKda = Math.max(...stats.map(valorLadder), 0.01)
  // Desde la Season 2 la ladder lleva strikes por faltar.
  const conStrikes = stats[0]?.strikes !== undefined
  const zonas = archived ? null : armarZonas(stats.length)

  const renderRow = (s: PlayerStats, i: number, zona: Zona | null) => (
    <LadderRow
      key={s.player.id}
      stats={s}
      index={i}
      total={stats.length}
      maxKda={maxKda}
      records={showingRecent ? undefined : records?.[s.player.id]}
      isTopFakador={topFakadorId === s.player.id}
      zona={zona}
    />
  )

  return (
    <section
      aria-labelledby="ladder-titulo"
      className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-brand">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h2 id="ladder-titulo" className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">
              {archived ? 'Clasificación final' : 'Ladder'}
            </h2>
            <span className="text-[12px] text-muted-foreground">
              {seasonName} ·{' '}
              <button
                type="button"
                onClick={() => setInfoOpen((open) => !open)}
                aria-expanded={infoOpen}
                aria-controls="ladder-explicacion"
                title={
                  conStrikes
                    ? '¿Cómo se calcula el KDA, qué son los strikes y por qué uno está arriba del otro?'
                    : '¿Cómo se calcula el KDA y por qué uno está arriba del otro?'
                }
                className={cn(
                  'inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 transition-colors hover:text-foreground',
                  infoOpen && 'text-foreground',
                )}
              >
                {conStrikes ? 'por KDA y strikes' : 'por KDA'}
                <Info className="h-3 w-3" aria-hidden="true" />
              </button>{' '}
              · {stats.length} {stats.length === 1 ? 'jugador' : 'jugadores'}
              {showingRecent && ` · últimas ${recent.matchCount} partidas`}
            </span>
          </div>
        </div>

        {recent && !archived && (
          <div className="relative flex items-center rounded-full bg-muted/40 p-0.5" role="group" aria-label="Qué partidas cuenta la tabla">
            {([
              ['season', 'Temporada'],
              ['recent', `Últimas ${recent.matchCount}`],
            ] as const).map(([key, label]) => {
              const active = view === key
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setView(key)}
                  className={cn(
                    'relative h-8 rounded-full px-3 text-[12px] font-semibold uppercase tracking-wider transition-colors',
                    active ? 'text-white' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="ladder-view-pill"
                      className="absolute inset-0 rounded-full bg-primary"
                      transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                    />
                  )}
                  <span className="relative">{label}</span>
                </button>
              )
            })}
          </div>
        )}
      </header>

      <LadderExplicacion
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        stats={stats}
        recentCount={showingRecent ? recent.matchCount : null}
      />

      {stats.length === 0 ? (
        <EmptyLadder archived={archived} action={emptyAction} />
      ) : (
        <div className="@container">
          {zonas ? (
            zonas.map((zona) => (
              <section key={zona.id} aria-labelledby={`zona-${zona.id}`}>
                <ZonaTitulo zona={zona} />
                <ol start={zona.desde} className="flex flex-col">
                  {stats.slice(zona.desde - 1, zona.hasta).map((s, j) => renderRow(s, zona.desde - 1 + j, zona))}
                </ol>
              </section>
            ))
          ) : (
            <ol className="flex flex-col">{stats.map((s, i) => renderRow(s, i, null))}</ol>
          )}
        </div>
      )}

      {unplayed.length > 0 && !archived && !showingRecent && (
        <div className="border-t border-border px-4 py-3">
          <h3 className="mb-2 flex items-center gap-1.5 font-sans text-[12px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Sin debut en la temporada
          </h3>
          <ul className="flex flex-wrap gap-1.5">
            {unplayed.map((player) => (
              <li key={player.id}>
                <Link
                  href={`/players/${player.id}`}
                  className="flex items-center gap-1.5 rounded-full bg-muted/30 py-0.5 pl-0.5 pr-2.5 text-[12px] text-muted-foreground transition hover:text-foreground"
                >
                  <PlayerAvatar player={player} size={20} />
                  {player.name}
                  {player.menudaMierda && <span title="Menuda mierda">💩</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function LadderRow({
  stats: s,
  index: i,
  total,
  maxKda,
  records,
  isTopFakador,
  zona,
}: {
  stats: PlayerStats
  index: number
  total: number
  maxKda: number
  records?: PlayerRecordMap[string]
  isTopFakador: boolean
  /** Temporada en curso: la zona manda los colores. Archivo: medallas y zona roja. */
  zona: Zona | null
}) {
  const medal = MEDALS[i]
  const enPodio = !zona || zona.id === 'top'
  const inDangerZone = !zona && total > 5 && i >= total - 3
  const puestoClase = (enPodio && medal?.rank) || zona?.puesto || (inDangerZone ? 'text-brand/80' : 'text-muted-foreground')
  const kdaClase = zona?.puesto ?? (medal ? medal.rank : inDangerZone ? 'text-brand' : 'text-foreground')
  const barraClase = zona?.barra ?? (medal ? 'bg-amber-300' : inDangerZone ? 'bg-primary' : 'bg-sky-400/80')
  const winrate = s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : 0
  const valor = valorLadder(s)
  const descuento = s.descuentoStrikes ?? 0
  const winrateClase = winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: Math.min(i * 0.035, 0.4), ease: [0.22, 1, 0.36, 1] }}
      className="border-b border-border last:border-b-0"
    >
      <Link
        href={`/players/${s.player.id}`}
        className={cn(
          'group flex items-center gap-2.5 border-l-2 border-l-transparent px-2.5 py-2.5 transition-colors hover:bg-accent/50 sm:gap-3 sm:px-4',
          zona ? cn(zona.fila, zona.borde) : cn(medal?.row, medal?.bar),
        )}
      >
        <div className="flex w-8 shrink-0 flex-col items-center leading-none">
          <span className="sr-only">Puesto </span>
          <span className={cn('font-heading text-lg font-black tabular-nums', puestoClase)}>{i + 1}</span>
          <TrendMark trend={s.trend} />
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <span className={cn('flex shrink-0 rounded-full', zona?.avatar)}>
            <PlayerAvatar player={s.player} size={36} />
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="truncate text-[14px] font-semibold leading-tight text-foreground group-hover:text-white">
                {s.player.name}
              </span>
              {s.trend === 'new' && (
                <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-sky-300">
                  Nuevo
                </span>
              )}
              {(!!s.strikes || descuento > 0) && <StrikesChip strikes={s.strikes ?? 0} descuento={descuento} />}
              {s.currentStreak >= 3 && (
                <Chip className="border-orange-500/40 text-orange-400" label={`Racha de ${s.currentStreak} victorias`}>
                  <Flame className="h-3 w-3" aria-hidden="true" /> {s.currentStreak}W
                </Chip>
              )}
              {s.currentLossStreak >= 3 && (
                <Chip className="border-cyan-500/40 text-cyan-400" label={`Racha de ${s.currentLossStreak} derrotas`}>
                  <Snowflake className="h-3 w-3" aria-hidden="true" /> {s.currentLossStreak}L
                </Chip>
              )}
              {s.mvps > 0 && (
                <Chip className="border-[#d4af37]/40 text-[#d4af37]" label={`${s.mvps} MVP en la temporada`}>
                  👑 {s.mvps}
                </Chip>
              )}
              {s.player.nelsons > 0 && (
                <Chip className="border-primary/40 text-brand" label={`${s.player.nelsons} Nelson`}>
                  💀 {s.player.nelsons}
                </Chip>
              )}
              {isTopFakador && (
                <Chip className="border-purple-500/40 text-purple-400" label="Top 1 Fakasos">
                  🎭 Fakaso
                </Chip>
              )}
              {s.player.menudaMierda && (
                <Chip className="border-amber-700/50 text-amber-600" label="Badge de honor: menuda mierda">
                  💩 Menuda mierda
                </Chip>
              )}
              {records?.map((record) => <RecordBadge key={record} type={record} compact />)}
            </div>

            {/* Los números van abajo del nombre; lo que no entra en tarjetas angostas se esconde. */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] text-muted-foreground">
              <span>
                <span className="sr-only">Kills, muertes y asistencias: </span>
                {s.kills}/{s.deaths}/{s.assists}
              </span>
              <span className="opacity-40" aria-hidden="true">·</span>
              <span>
                <span className="sr-only">Victorias, empates y derrotas: </span>
                {s.wins}W-{s.draws}D-{s.losses}L <span className={winrateClase}>{winrate}%</span>
              </span>
              <span className="hidden opacity-40 @md:inline" aria-hidden="true">·</span>
              <span className="hidden @md:inline">
                {s.adm} ADM
              </span>
              <span className="hidden opacity-40 @md:inline" aria-hidden="true">·</span>
              <span className="hidden text-yellow-500/90 @md:inline">{s.hsPct}% HS</span>
              <span className="hidden @xl:inline-flex">
                <KDaBadges positiveGames={s.positiveGames} negativeGames={s.negativeGames} size="sm" />
              </span>
            </div>
          </div>
        </div>

        <div className="flex w-16 shrink-0 flex-col items-end gap-1 sm:w-20">
          <span
            className={cn('font-mono text-[15px] font-black tabular-nums sm:text-base', kdaClase)}
            title={descuento > 0 ? `KDA ${s.kda.toFixed(2)} menos ${descuento.toFixed(2)} perdido por faltar` : 'KDA'}
          >
            <span className="sr-only">{descuento > 0 ? 'KDA en la ladder ' : 'KDA '}</span>
            {valor.toFixed(2)}
          </span>
          <span className="h-1 w-full overflow-hidden rounded-full bg-muted/60" aria-hidden="true">
            <span
              className={cn('block h-full rounded-full', barraClase)}
              style={{ width: `${Math.max(6, (valor / maxKda) * 100)}%` }}
            />
          </span>
          {descuento > 0 && (
            <span className="font-mono text-[10px] leading-none tabular-nums text-muted-foreground" title="KDA real, sin el descuento">
              <span className="sr-only">KDA real </span>
              <s>{s.kda.toFixed(2)}</s> <span className="text-rose-400">−{descuento.toFixed(2)}</span>
            </span>
          )}
        </div>
      </Link>
    </motion.li>
  )
}

function ZonaTitulo({ zona }: { zona: Zona }) {
  return (
    <div className={cn('flex items-center gap-2 border-b border-border px-3 py-1.5 sm:px-4', zona.fondoTitulo)}>
      <span aria-hidden="true" className="text-[13px] leading-none">
        {zona.emoji}
      </span>
      <h3
        id={`zona-${zona.id}`}
        className={cn('whitespace-nowrap font-heading text-[12px] font-bold uppercase tracking-[0.2em]', zona.texto)}
      >
        {zona.titulo}
        <span className="sr-only">, {rangoZonaLegible(zona)}</span>
      </h3>
      <span className={cn('h-px min-w-4 flex-1 bg-gradient-to-r', zona.linea)} aria-hidden="true" />
      <span className="font-mono text-[11px] text-muted-foreground" aria-hidden="true">
        {rangoZona(zona)}
      </span>
    </div>
  )
}

const TRENDS: Record<NonNullable<PlayerStats['trend']>, { simbolo: string; clase: string; texto: string }> = {
  up: { simbolo: '▲', clase: 'text-emerald-400', texto: 'Subió de puesto en la última partida' },
  down: { simbolo: '▼', clase: 'text-rose-400', texto: 'Bajó de puesto en la última partida' },
  new: { simbolo: '●', clase: 'text-sky-300', texto: 'Entró al ranking' },
  same: { simbolo: '=', clase: 'text-muted-foreground/60', texto: 'Mantuvo el puesto' },
}

function TrendMark({ trend = 'same' }: { trend?: PlayerStats['trend'] }) {
  const { simbolo, clase, texto } = TRENDS[trend]
  return (
    <span className={cn('mt-0.5 text-[10px]', clase)} title={texto}>
      <span aria-hidden="true">{simbolo}</span>
      <span className="sr-only">{texto}</span>
    </span>
  )
}

/**
 * Strikes (días de partidas seguidos que faltó) y KDA perdido por faltar. Con 1 y
 * 2 strikes es un aviso; desde el 3.º pierde KDA, y eso queda aunque vuelva.
 */
function StrikesChip({ strikes, descuento }: { strikes: number; descuento: number }) {
  const conteo = strikes >= STRIKES_PARA_DESCUENTO ? `${strikes} strikes` : strikes > 0 ? `Strike ${strikes}/${STRIKES_PARA_DESCUENTO}` : null
  const faltas = strikes === 1 ? 'Faltó al último día de partidas.' : strikes > 1 ? `Faltó a los últimos ${strikes} días de partidas.` : ''
  const perdido = descuento > 0 ? `Perdió ${descuento.toFixed(2)} de KDA por faltar: no se devuelve, lo tiene que volver a ganar jugando.` : ''
  const aviso = strikes < STRIKES_PARA_DESCUENTO ? `Con ${STRIKES_PARA_DESCUENTO} strikes ${descuento > 0 ? 'vuelve a perder' : 'empieza a perder'} KDA.` : ''

  return (
    <Chip
      className={descuento > 0 ? 'border-rose-500/50 text-rose-400' : 'border-amber-400/40 text-amber-300'}
      label={[faltas, perdido, strikes > 0 ? aviso : ''].filter(Boolean).join(' ')}
    >
      <CalendarX className="h-3 w-3" aria-hidden="true" />
      {conteo}
      {descuento > 0 && <span>{conteo ? `−${descuento.toFixed(2)}` : `−${descuento.toFixed(2)} por faltar`}</span>}
    </Chip>
  )
}

function Chip({ children, className, label }: { children: React.ReactNode; className?: string; label: string }) {
  return (
    <span
      title={label}
      className={cn(
        'flex shrink-0 cursor-help items-center gap-1 rounded border bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
        className,
      )}
    >
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="flex items-center gap-1">
        {children}
      </span>
    </span>
  )
}

function EmptyLadder({ archived, action }: { archived: boolean; action?: React.ReactNode }) {
  if (archived) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">No hay partidas registradas en esta temporada.</p>
  }

  return (
    <div className="relative flex flex-col items-center gap-3 overflow-hidden px-6 py-10 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(245,180,60,0.12),transparent_60%)]" aria-hidden="true" />
      <motion.span
        className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-300"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      >
        <Trophy className="h-7 w-7" />
      </motion.span>
      <h3 className="relative font-heading text-xl font-bold uppercase tracking-wide text-foreground">La tabla arranca de cero</h3>
      <p className="relative max-w-md text-[13px] leading-relaxed text-muted-foreground">
        Nadie tiene puntos todavía. Cada partida suma desde la primera: la próxima que se cargue define al primer líder
        de la temporada.
      </p>
      {action && <div className="relative mt-1">{action}</div>}
    </div>
  )
}
