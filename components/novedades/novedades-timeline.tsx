'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, CheckCircle2, CirclePlay, Star } from 'lucide-react'
import { NOVEDADES, type Novedad } from '@/lib/novedades'
import { Reveal } from '@/components/motion/reveal'
import { cn } from '@/lib/utils'
import { HighlightIcon, TAG_STYLES } from './novedad-icons'
import { getUnreadIds, markAllNovedadesRead, openNovedadPopup } from './novedades-state'

const DAY_MS = 24 * 60 * 60 * 1000
const WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const LATEST_YEAR = NOVEDADES[0]?.date.slice(0, 4)

/** A mano y en UTC: igual en el servidor y en el navegador, sin saltos al hidratar. */
function formatDay(iso: string) {
  const date = new Date(`${iso}T12:00:00Z`)
  const year = iso.slice(0, 4)
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} de ${MONTHS[date.getUTCMonth()]}${year !== LATEST_YEAR ? ` de ${year}` : ''}`
}

function localToday() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function relativeDay(iso: string, today: string) {
  const days = Math.round((Date.parse(today) - Date.parse(iso)) / DAY_MS)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 30) return `Hace ${days} días`
  return null
}

function groupByDay(items: Novedad[]) {
  const groups: { date: string; items: Novedad[] }[] = []
  for (const item of items) {
    const last = groups[groups.length - 1]
    if (last?.date === item.date) last.items.push(item)
    else groups.push({ date: item.date, items: [item] })
  }
  return groups
}

/**
 * Todas las novedades, de la más nueva a la más vieja y agrupadas por día.
 * Las que el visitante todavía no había leído llevan "Nuevo" durante esta
 * visita; al entrar quedan todas como leídas (se apaga el puntito de la navbar).
 */
export function NovedadesTimeline() {
  const [unread, setUnread] = useState<Set<string> | null>(null)
  const [today, setToday] = useState<string | null>(null)

  useEffect(() => {
    setUnread(new Set(getUnreadIds()))
    setToday(localToday())
    markAllNovedadesRead()
  }, [])

  const groups = groupByDay(NOVEDADES)
  let index = 0

  return (
    <>
      <div className="mb-8 min-h-[34px]">
        <AnimatePresence>
          {unread && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-semibold',
                unread.size > 0 ? 'border-brand/40 bg-brand/10 text-brand' : 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
              )}
            >
              {unread.size > 0 ? (
                <>
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
                  </span>
                  {unread.size === 1 ? 'Hay 1 novedad que no habías leído' : `Hay ${unread.size} novedades que no habías leído`}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  Estás al día
                </>
              )}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <ol className="relative flex flex-col gap-9">
        {/* Línea de tiempo: pasa por el centro de los íconos. */}
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-[17.5px] top-2 w-px bg-gradient-to-b from-brand/60 via-white/15 to-transparent sm:left-[21.5px]"
        />

        {groups.map((group) => {
          const relative = today ? relativeDay(group.date, today) : null
          return (
            <li key={group.date} className="relative flex flex-col gap-4">
              <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[44px_minmax(0,1fr)] sm:gap-4">
                <span className="flex justify-center" aria-hidden="true">
                  <span className="h-3 w-3 rounded-full border-2 border-brand bg-background shadow-[0_0_12px_rgba(255,92,141,0.6)]" />
                </span>
                <h2 className="flex flex-wrap items-baseline gap-x-2 font-heading text-[15px] font-bold uppercase tracking-[0.14em] text-foreground sm:text-base">
                  {formatDay(group.date)}
                  {relative && (
                    <span className="font-sans text-[11px] font-semibold normal-case tracking-normal text-muted-foreground">
                      · {relative}
                    </span>
                  )}
                </h2>
              </div>

              <ol className="flex flex-col gap-4">
                {group.items.map((item) => {
                  const position = index++
                  return (
                    <li key={item.id}>
                      <NovedadCard item={item} isNew={unread?.has(item.id) ?? false} immediate={position < 2} />
                    </li>
                  )
                })}
              </ol>
            </li>
          )
        })}
      </ol>
    </>
  )
}

function NovedadCard({ item, isNew, immediate }: { item: Novedad; isNew: boolean; immediate: boolean }) {
  const style = TAG_STYLES[item.tag]
  const TagIcon = style.icon
  const hasDemo = item.visual !== undefined

  return (
    <Reveal immediate={immediate} className="grid grid-cols-[36px_minmax(0,1fr)] gap-3 sm:grid-cols-[44px_minmax(0,1fr)] sm:gap-4">
      {/* Fondo opaco abajo del color de la sección: tapa la línea de tiempo sin usar blur. */}
      <span className="relative z-10 h-fit rounded-xl bg-card" aria-hidden="true">
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl ring-1 sm:h-11 sm:w-11', style.node)}>
          <TagIcon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
      </span>

      <article
        className={cn(
          'min-w-0 rounded-2xl border bg-card/95 p-4 shadow-lg shadow-black/20 sm:p-5',
          item.popup ? 'border-amber-300/25 shadow-[0_0_45px_-22px_rgba(245,180,60,0.55)]' : 'border-border',
          isNew && 'border-brand/40',
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]', style.chip)}>
            {item.tag}
          </span>
          {item.popup && (
            <span className="flex items-center gap-1 rounded-full border border-amber-300/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-200">
              <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
              Destacada
            </span>
          )}
          <AnimatePresence>
            {isNew && (
              <motion.span
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-black"
              >
                Nuevo
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <h3 className="mt-2.5 font-heading text-[19px] font-bold uppercase leading-tight tracking-wide text-foreground sm:text-[22px]">
          {item.title}
        </h3>
        <p className="mt-1.5 text-[14px] leading-relaxed text-foreground/75">{item.summary}</p>

        {item.highlights && item.highlights.length > 0 && (
          <ul className="mt-3.5 flex flex-col gap-2">
            {item.highlights.map((highlight) => (
              <li key={highlight.text} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-foreground/90">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/10">
                  <HighlightIcon icon={highlight.icon} />
                </span>
                <span className="pt-1">{highlight.text}</span>
              </li>
            ))}
          </ul>
        )}

        {(hasDemo || item.cta) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {hasDemo && (
              <button
                type="button"
                onClick={() => openNovedadPopup(item.id)}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-2 text-[12px] font-bold uppercase tracking-wider text-foreground transition-colors hover:border-white/30 hover:bg-white/[0.08]"
              >
                <CirclePlay className="h-4 w-4 text-brand" aria-hidden="true" />
                Ver cómo funciona
              </button>
            )}
            {item.cta && (
              <Link
                href={item.cta.href}
                className="group flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-[12px] font-bold uppercase tracking-wider text-white shadow-lg shadow-primary/30 transition-transform hover:scale-[1.03] active:scale-[0.98]"
              >
                {item.cta.label}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            )}
          </div>
        )}
      </article>
    </Reveal>
  )
}
