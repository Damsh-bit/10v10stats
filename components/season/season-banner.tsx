'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Sparkles, X } from 'lucide-react'

type Props = {
  seasonSlug: string
  seasonNumber: number
  previousSeasonSlug: string | null
  previousSeasonName: string | null
}

/** Barra de bienvenida a la temporada, arriba de todo el sitio. Se puede cerrar. */
export function SeasonBanner({ seasonSlug, seasonNumber, previousSeasonSlug, previousSeasonName }: Props) {
  const storageKey = `season-banner-dismissed:${seasonSlug}`
  // Visible desde el servidor para no mover el layout al hidratar; se oculta si ya lo cerraron.
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey) === '1') setVisible(false)
    } catch {
      // sin storage: queda visible
    }
  }, [storageKey])

  const dismiss = () => {
    setVisible(false)
    try {
      localStorage.setItem(storageKey, '1')
    } catch {
      // sin storage: se vuelve a mostrar en la próxima visita
    }
  }

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="season-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden border-b border-amber-400/20 bg-[#1a0712]"
          role="region"
          aria-label={`Bienvenida a la Season ${seasonNumber}`}
        >
          <div className="season-banner-bg pointer-events-none absolute inset-0" aria-hidden="true" />
          <motion.div
            className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{ x: ['0%', '400%'] }}
            transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
            aria-hidden="true"
          />

          <div className="relative mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
            <span className="season-chip flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 font-heading text-[11px] font-bold uppercase tracking-[0.2em] text-black">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Season {seasonNumber}
            </span>

            <p className="min-w-0 flex-1 truncate text-[12px] text-amber-50/90 sm:text-[13px]">
              <span className="font-semibold text-white">¡Bienvenidos a la nueva temporada!</span>
              <span className="hidden sm:inline"> La tabla arrancó de cero: cada partida cuenta para llegar al #1.</span>
            </p>

            {previousSeasonSlug && (
              <Link
                href={`/temporadas/${previousSeasonSlug}`}
                className="group hidden shrink-0 items-center gap-1 rounded-full border border-amber-300/30 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-amber-200 transition-colors hover:border-amber-300/60 hover:bg-amber-300/10 sm:flex"
              >
                Ver {previousSeasonName}
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            )}

            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded-full p-1 text-amber-100/60 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Cerrar aviso de temporada"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
