'use client'

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AnimatePresence, motion, type Variants } from 'motion/react'
import confetti from 'canvas-confetti'
import { ArrowRight, Sparkles, X } from 'lucide-react'
import { NOVEDADES, NOVEDADES_MAX_AGE_DAYS, NOVEDADES_POPUP, type Novedad, type NovedadDemo } from '@/lib/novedades'
import { Portal, useBodyScrollLock } from '@/components/ui/portal'
import { cn } from '@/lib/utils'
import { ApuestasDemo } from './apuestas-demo'
import { CartelDemo } from './cartel-demo'
import { MvpDemo } from './mvp-demo'
import { TeamGeneratorDemo } from './team-generator-demo'
import { HighlightIcon } from './novedad-icons'
import { OPEN_NOVEDAD_EVENT } from './novedades-state'

const DEMOS: Record<NovedadDemo, ComponentType> = {
  'team-generator': TeamGeneratorDemo,
  apuestas: ApuestasDemo,
  mvp: MvpDemo,
  cartel: CartelDemo,
}

const STORAGE_KEY = 'novedades-vistas'
/** Para que la home termine de aparecer antes del pop-up. */
const OPEN_DELAY_MS = 900
const MAX_SHOWN = 3
const DAY_MS = 24 * 60 * 60 * 1000
const EASE = [0.22, 1, 0.36, 1] as const
const CONFETTI_COLORS = ['#ff5c8d', '#38bdf8', '#fbbf24', '#ffffff']

/** null = el navegador no deja guardar: mejor no mostrar nada que mostrarlo en cada visita. */
function readSeen(): string[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return null
  }
}

function markSeen(ids: string[]) {
  try {
    const seen = new Set(readSeen() ?? [])
    ids.forEach((id) => seen.add(id))
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]))
  } catch {
    // sin storage: no se puede recordar
  }
}

function pendingNovedades(seen: string[], now = Date.now()) {
  return NOVEDADES_POPUP.filter(
    (n) => !seen.includes(n.id) && now - Date.parse(n.date) <= NOVEDADES_MAX_AGE_DAYS * DAY_MS,
  ).slice(0, MAX_SHOWN)
}

function formatDate(iso: string) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', timeZone: 'UTC' })
}

/**
 * Pop-up de novedades: en la home aparece solo, una vez por novedad marcada
 * como `popup` (ver lib/novedades.ts). Si hay varias, van de a una: al cerrar
 * una se abre la siguiente. En /novedades se abre a mano para ver la demo de
 * una puntual.
 */
export function WhatsNewModal({ autoOpen = true }: { autoOpen?: boolean }) {
  const [queue, setQueue] = useState<{ items: Novedad[]; index: number } | null>(null)
  const open = queue !== null

  useBodyScrollLock(open)

  const show = useCallback((list: Novedad[]) => {
    if (list.length > 0) setQueue({ items: list, index: 0 })
  }, [])

  useEffect(() => {
    const timer = autoOpen
      ? window.setTimeout(() => {
          const seen = readSeen()
          if (seen) show(pendingNovedades(seen))
        }, OPEN_DELAY_MS)
      : undefined

    const openOne = (event: Event) => {
      const id = (event as CustomEvent<{ id?: string }>).detail?.id
      const item = NOVEDADES.find((n) => n.id === id)
      if (item) show([item])
    }
    window.addEventListener(OPEN_NOVEDAD_EVENT, openOne)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener(OPEN_NOVEDAD_EVENT, openOne)
    }
  }, [autoOpen, show])

  /** Cierra la novedad que se ve; si queda otra, se abre esa. */
  const close = useCallback(() => {
    setQueue((q) => (q && q.index < q.items.length - 1 ? { ...q, index: q.index + 1 } : null))
  }, [])

  /** Se va por el botón principal: las que faltaban aparecen en la próxima visita. */
  const dismiss = useCallback(() => setQueue(null), [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const item = queue?.items[queue.index]

  return (
    <Portal>
      <AnimatePresence>
        {queue && item && (
          <motion.div
            key="novedades"
            className="fixed inset-0 z-[120] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25, delay: 0.05 } }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={close} aria-hidden="true" />

            {/* mode="wait": la siguiente entra recién cuando terminó de irse la anterior. */}
            <AnimatePresence mode="wait">
              <NovedadDialog
                key={item.id}
                item={item}
                position={queue.index}
                total={queue.items.length}
                onClose={close}
                onCta={dismiss}
              />
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  )
}

function NovedadDialog({
  item,
  position,
  total,
  onClose,
  onCta,
}: {
  item: Novedad
  position: number
  total: number
  onClose: () => void
  onCta: () => void
}) {
  const ctaRef = useRef<HTMLAnchorElement>(null)
  const hasNext = position < total - 1
  const cta = item.cta ?? { label: 'Ver novedades', href: '/novedades' }

  // Se marca al mostrarla: aunque se vaya por el link sin cerrar, no vuelve a
  // aparecer. Festejo y foco en el botón principal apenas entra la tarjeta.
  useEffect(() => {
    markSeen([item.id])
    const timer = window.setTimeout(() => {
      ctaRef.current?.focus({ preventScroll: true })
      const base = { particleCount: 45, spread: 60, startVelocity: 42, ticks: 160, zIndex: 130, colors: CONFETTI_COLORS, disableForReducedMotion: true, scalar: 0.9 }
      confetti({ ...base, angle: 60, origin: { x: 0.18, y: 0.7 } })
      confetti({ ...base, angle: 120, origin: { x: 0.82, y: 0.7 } })
    }, 380)
    return () => window.clearTimeout(timer)
  }, [item.id])

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="novedades-title"
      initial={{ opacity: 0, y: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.96, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className="relative flex max-h-[calc(100dvh-2rem)] w-full max-w-[480px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-card shadow-[0_30px_90px_-20px_rgba(0,0,0,0.85),0_0_60px_-25px_rgba(255,92,141,0.6)]"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-3 top-3 z-20 rounded-full bg-black/40 p-1.5 text-white/70 backdrop-blur transition-colors hover:bg-black/60 hover:text-white"
        aria-label={hasNext ? 'Cerrar y ver la siguiente novedad' : 'Cerrar novedades'}
      >
        <X className="h-4 w-4" />
      </button>

      <div className="min-h-0 overflow-y-auto overflow-x-hidden">
        <NovedadVisual item={item} />
        <NovedadBody item={item} />
      </div>

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border/60 bg-black/10 px-5 py-3.5 sm:px-6">
        {total > 1 && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: total }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    i === position ? 'w-5 bg-brand' : i < position ? 'w-1.5 bg-brand/50' : 'w-1.5 bg-muted-foreground/40',
                  )}
                />
              ))}
            </div>
            <span className="sr-only">
              Novedad {position + 1} de {total}
            </span>
            <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline" aria-hidden="true">
              {position + 1}/{total}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="whitespace-nowrap rounded-full px-2.5 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground sm:px-3"
          >
            {hasNext ? 'Siguiente' : 'Después'}
          </button>
          <Link
            ref={ctaRef}
            href={cta.href}
            onClick={onCta}
            className="group relative flex items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-full bg-primary px-4 py-2 text-[12px] font-bold uppercase tracking-wider text-white shadow-lg shadow-primary/40 outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-card active:scale-[0.98]"
          >
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{ x: ['0%', '320%'] }}
              transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.2, ease: 'easeInOut' }}
            />
            <span className="relative">{cta.label}</span>
            <ArrowRight className="relative h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </footer>
    </motion.div>
  )
}

const ORBS = [
  { className: 'left-[8%] top-[10%] h-28 w-28 bg-primary/50', x: [0, 18, 0], y: [0, 12, 0], duration: 7 },
  { className: 'right-[6%] bottom-[8%] h-32 w-32 bg-sky-500/30', x: [0, -16, 0], y: [0, -10, 0], duration: 8 },
  { className: 'right-[30%] top-[4%] h-16 w-16 bg-amber-400/25', x: [0, 10, 0], y: [0, 14, 0], duration: 6 },
]

const SPARKS = [
  { left: '12%', top: '70%', delay: 0 },
  { left: '86%', top: '22%', delay: 0.8 },
  { left: '70%', top: '80%', delay: 1.6 },
  { left: '24%', top: '18%', delay: 2.2 },
]

function NovedadVisual({ item }: { item: Novedad }) {
  const visual = item.visual
  const Demo = visual?.kind === 'demo' ? DEMOS[visual.name] : null

  return (
    <div className="relative flex h-[262px] items-center justify-center overflow-hidden px-4 pb-3 pt-6 sm:h-[280px]">
      <div className="absolute inset-0 bg-[radial-gradient(120%_95%_at_10%_0%,rgba(149,12,66,0.6),transparent_62%),radial-gradient(110%_90%_at_100%_100%,rgba(56,189,248,0.25),transparent_58%)]" />
      <div className="cs-grid absolute inset-0 opacity-60" aria-hidden="true" />
      {ORBS.map((orb, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className={cn('pointer-events-none absolute rounded-full blur-2xl', orb.className)}
          animate={{ x: orb.x, y: orb.y }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      {SPARKS.map((spark, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-white"
          style={{ left: spark.left, top: spark.top }}
          animate={{ opacity: [0, 1, 0], scale: [0.4, 1.4, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: spark.delay, ease: 'easeInOut' }}
        />
      ))}

      {visual?.kind === 'image' ? (
        <Image src={visual.src} alt={visual.alt} fill sizes="480px" className="object-cover" />
      ) : Demo ? (
        <motion.div
          className="relative flex w-full justify-center"
          initial={{ opacity: 0, y: 18, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: EASE }}
          style={{ transformPerspective: 900 }}
        >
          <Demo />
        </motion.div>
      ) : (
        <Sparkles className="relative h-14 w-14 text-amber-300" aria-hidden="true" />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-card to-transparent" />
    </div>
  )
}

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.12 } },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
}

function NovedadBody({ item }: { item: Novedad }) {
  return (
    <motion.div variants={listVariants} initial="hidden" animate="show" className="flex flex-col gap-3 px-5 pb-5 pt-1 sm:px-6">
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-2">
        <span className="season-chip flex items-center gap-1 rounded-full px-2.5 py-0.5 font-heading text-[10px] font-bold uppercase tracking-[0.2em] text-black">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Novedad
        </span>
        <span className="text-[11px] text-muted-foreground">
          {item.tag} · {formatDate(item.date)}
        </span>
      </motion.div>

      <motion.h2
        id="novedades-title"
        variants={itemVariants}
        className="font-heading text-[26px] font-bold uppercase leading-[1.05] tracking-wide text-foreground sm:text-[30px]"
      >
        {item.title}
      </motion.h2>

      <motion.p variants={itemVariants} className="text-[13px] leading-relaxed text-muted-foreground">
        {item.summary}
      </motion.p>

      <ul className="mt-1 flex flex-col gap-2">
        {item.highlights?.map((highlight) => (
          <motion.li key={highlight.text} variants={itemVariants} className="flex items-center gap-3 text-[13px] leading-snug text-foreground/90">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/10">
              <HighlightIcon icon={highlight.icon} />
            </span>
            {highlight.text}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  )
}
