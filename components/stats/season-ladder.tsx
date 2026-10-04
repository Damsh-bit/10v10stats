'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { Flame, Snowflake, Trophy, UserPlus } from 'lucide-react'
import type { Player, PlayerStats } from '@/types'
import type { PlayerRecordMap } from '@/lib/records'
import { PlayerAvatar } from '@/components/shared/strike-ui'
import { KDaBadges } from '@/components/players/kda-badges'
import { RecordBadge } from '@/components/players/record-badges'
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
 * (borde, fondo, puesto, KDA y barra) y un separador con su nombre.
 */
type Zona = {
  id: string
  desde: number
  hasta: number
  titulo: string
  emoji: string
  /** Separador: texto, línea y fondo. */
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

const ZONAS: Zona[] = [
  {
    id: 'top',
    desde: 1,
    hasta: 3,
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
  {
    id: 'promo-top',
    desde: 4,
    hasta: 4,
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
  {
    id: 'medio',
    desde: 5,
    hasta: 9,
    titulo: 'Empujan pero la tienen corta',
    emoji: '🤏',
    texto: 'text-sky-300',
    linea: 'from-sky-400/50 via-sky-400/10 to-transparent',
    fondoTitulo: 'bg-gradient-to-r from-sky-400/[0.07] to-transparent',
    fila: 'bg-gradient-to-r from-sky-400/[0.03] to-transparent',
    borde: 'border-l-sky-400/50',
    puesto: 'text-sky-200/80',
    barra: 'bg-sky-400/80',
  },
  {
    id: 'promo-descenso',
    desde: 10,
    hasta: 10,
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
  {
    id: 'verguenza',
    desde: 11,
    hasta: Infinity,
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
]

function zonaDePuesto(puesto: number) {
  return ZONAS.find((zona) => puesto >= zona.desde && puesto <= zona.hasta) ?? ZONAS[ZONAS.length - 1]
}

function rangoZona(zona: Zona) {
  if (zona.hasta === Infinity) return `#${zona.desde}+`
  return zona.desde === zona.hasta ? `#${zona.desde}` : `#${zona.desde}–${zona.hasta}`
}

/** Tabla final de una temporada cerrada: oro, plata y bronce (sin zonas). */
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
  const showingRecent = view === 'recent' && !!recent
  const stats = showingRecent ? recent.stats : ranked
  const maxKda = Math.max(...stats.map((s) => s.kda), 0.01)

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-brand">
            <Trophy className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h2 className="font-heading text-base font-bold uppercase leading-tight tracking-widest text-foreground">
              {archived ? 'Clasificación final' : 'Ladder'}
            </h2>
            <span className="text-[11px] text-muted-foreground">
              {seasonName} · por KDA
              {showingRecent && ` · últimas ${recent.matchCount} partidas`}
            </span>
          </div>
        </div>

        {recent && !archived && (
          <div className="relative flex items-center rounded-full bg-muted/40 p-0.5" role="tablist" aria-label="Vista del ladder">
            {([
              ['season', 'Temporada'],
              ['recent', `Últimas ${recent.matchCount}`],
            ] as const).map(([key, label]) => {
              const active = view === key
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setView(key)}
                  className={cn(
                    'relative h-7 rounded-full px-3 text-[11px] font-semibold uppercase tracking-wider transition-colors',
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

      {stats.length === 0 ? (
        <EmptyLadder archived={archived} action={emptyAction} />
      ) : (
        <LayoutGroup>
          <ol className="flex flex-col">
            <AnimatePresence initial={false}>
              {stats.flatMap((s, i) => {
                const zona = archived ? null : zonaDePuesto(i + 1)
                const row = (
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
                // Separador con el nombre de la zona antes del primero de cada una.
                return zona && zona.desde === i + 1 ? [<ZonaSeparador key={`zona-${zona.id}`} zona={zona} />, row] : [row]
              })}
            </AnimatePresence>
          </ol>
        </LayoutGroup>
      )}

      {unplayed.length > 0 && !archived && !showingRecent && (
        <div className="border-t border-border px-4 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Sin debut en la temporada
          </p>
          <ul className="flex flex-wrap gap-1.5">
            {unplayed.map((player) => (
              <li key={player.id}>
                <Link
                  href={`/players/${player.id}`}
                  className="flex items-center gap-1.5 rounded-full bg-muted/30 py-0.5 pl-0.5 pr-2.5 text-[11px] text-muted-foreground opacity-70 transition hover:opacity-100"
                >
                  <PlayerAvatar player={player} size={18} />
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
  const medal = zona ? undefined : MEDALS[i]
  const inDangerZone = !zona && total > 5 && i >= total - 3
  const puestoClase = zona?.puesto ?? medal?.rank ?? (inDangerZone ? 'text-brand/80' : 'text-muted-foreground')
  const kdaClase = zona?.puesto ?? (medal ? medal.rank : inDangerZone ? 'text-brand' : 'text-foreground')
  const barraClase = zona?.barra ?? (medal ? 'bg-amber-300' : inDangerZone ? 'bg-primary' : 'bg-sky-400/80')
  const winrate = s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : 0

  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
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
          <span
            className={cn('font-heading text-lg font-black tabular-nums', puestoClase)}
          >
            {i + 1}
          </span>
          <TrendMark trend={s.trend} />
        </div>

        <span className={cn('flex shrink-0 rounded-full', zona?.avatar)}>
          <PlayerAvatar player={s.player} size={36} />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="truncate text-[14px] font-semibold leading-tight text-foreground group-hover:text-white">
              {s.player.name}
            </span>
            {s.trend === 'new' && (
              <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-sky-300">
                Nuevo
              </span>
            )}
            {s.currentStreak >= 3 && (
              <Chip className="border-orange-500/40 text-orange-400" title={`Racha de ${s.currentStreak} victorias`}>
                <Flame className="h-3 w-3" aria-hidden="true" /> {s.currentStreak}W
              </Chip>
            )}
            {s.currentLossStreak >= 3 && (
              <Chip className="border-cyan-500/40 text-cyan-400" title={`Racha de ${s.currentLossStreak} derrotas`}>
                <Snowflake className="h-3 w-3" aria-hidden="true" /> {s.currentLossStreak}L
              </Chip>
            )}
            {s.mvps > 0 && (
              <Chip className="border-[#d4af37]/40 text-[#d4af37]" title="MVPs en la temporada">
                👑 {s.mvps}
              </Chip>
            )}
            {s.player.nelsons > 0 && (
              <Chip className="border-primary/40 text-brand" title="Nelsons">
                💀 {s.player.nelsons}
              </Chip>
            )}
            {isTopFakador && (
              <Chip className="border-purple-500/40 text-purple-400" title="Top 1 Fakasos">
                🎭 Fakaso
              </Chip>
            )}
            {s.player.menudaMierda && (
              <Chip className="border-amber-700/50 text-amber-600" title="Badge de honor">
                💩 Menuda mierda
              </Chip>
            )}
            {records?.map((record) => <RecordBadge key={record} type={record} compact />)}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-muted-foreground sm:text-[11px]">
            <span title="Kills / Deaths / Assists">
              {s.kills}/{s.deaths}/{s.assists}
            </span>
            <span className="opacity-30">·</span>
            <span title="Victorias - Empates - Derrotas">
              {s.wins}W-{s.draws}D-{s.losses}L <span className={winrate >= 50 ? 'text-emerald-400' : 'text-rose-400/80'}>{winrate}%</span>
            </span>
            <span className="hidden opacity-30 sm:inline">·</span>
            <span className="hidden sm:inline" title="Daño promedio por partida">{s.adm} ADM</span>
            <span className="hidden opacity-30 sm:inline">·</span>
            <span className="hidden text-yellow-500/80 sm:inline" title="% de headshots">{s.hsPct}% HS</span>
            <span className="hidden md:inline-flex">
              <KDaBadges positiveGames={s.positiveGames} negativeGames={s.negativeGames} size="sm" />
            </span>
          </div>
        </div>

        <div className="flex w-16 shrink-0 flex-col items-end gap-1 sm:w-20">
          <span
            className={cn('font-mono text-[15px] font-black tabular-nums sm:text-base', kdaClase)}
            title="KDA"
          >
            {s.kda.toFixed(2)}
          </span>
          <span className="h-1 w-full overflow-hidden rounded-full bg-muted/60" aria-hidden="true">
            <motion.span
              className={cn('block h-full rounded-full', barraClase)}
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(6, (s.kda / maxKda) * 100)}%` }}
              transition={{ duration: 0.8, delay: 0.15 + Math.min(i * 0.035, 0.4), ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
        </div>
      </Link>
    </motion.li>
  )
}

function ZonaSeparador({ zona }: { zona: Zona }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('flex items-center gap-2 border-b border-border px-3 py-1.5 sm:px-4', zona.fondoTitulo)}
    >
      <span aria-hidden="true" className="text-[12px] leading-none">
        {zona.emoji}
      </span>
      <span className={cn('whitespace-nowrap font-heading text-[11px] font-bold uppercase tracking-[0.2em]', zona.texto)}>{zona.titulo}</span>
      <span className={cn('h-px min-w-4 flex-1 bg-gradient-to-r', zona.linea)} aria-hidden="true" />
      <span className="font-mono text-[10px] text-muted-foreground">{rangoZona(zona)}</span>
    </motion.li>
  )
}

function TrendMark({ trend }: { trend?: PlayerStats['trend'] }) {
  if (trend === 'up') return <span className="mt-0.5 text-[9px] text-emerald-400" title="Subió de puesto en la última partida">▲</span>
  if (trend === 'down') return <span className="mt-0.5 text-[9px] text-rose-400" title="Bajó de puesto en la última partida">▼</span>
  if (trend === 'new') return <span className="mt-0.5 text-[9px] text-sky-300" title="Entró al ranking">●</span>
  return <span className="mt-0.5 text-[9px] text-muted-foreground/40" title="Mantuvo el puesto">=</span>
}

function Chip({ children, className, title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        'flex shrink-0 cursor-help items-center gap-1 rounded border bg-black/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
        className,
      )}
    >
      {children}
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
