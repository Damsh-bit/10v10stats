'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { Menu, Megaphone, X, Sparkles } from 'lucide-react'
import { useUnreadNovedades } from '@/components/novedades/novedades-state'
import { useDropdownTransition } from '@/components/ui/dropdown'
import { cn } from '@/lib/utils'
import { MotionToggle } from '@/components/motion/motion-toggle'

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/matches', label: 'Partidas' },
  { href: '/creacion-de-equipos', label: 'Equipos' },
  { href: '/estadisticas', label: 'Hall of Fame' },
  { href: '/faceit', label: 'FACEIT' },
]

const APUESTAS_LINK = { href: '/apuestas', label: 'Apuestas' }

const NOVEDADES_HREF = '/novedades'

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

/** Puntito que late cuando hay novedades sin leer. */
function UnreadDot({ className }: { className?: string }) {
  return (
    <span className={cn('pointer-events-none absolute flex h-2.5 w-2.5', className)} aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-background bg-brand" />
    </span>
  )
}

export function Navbar({ seasonNumber, apuestas = false }: { seasonNumber: number; apuestas?: boolean }) {
  const pathname = usePathname()
  const links = apuestas ? [...LINKS, APUESTAS_LINK] : LINKS
  const [isOpen, setIsOpen] = useState(false)
  const dropdownState = useDropdownTransition(isOpen)
  const headerRef = useRef<HTMLElement>(null)
  const seasonsActive = pathname.startsWith('/temporadas')
  const novedadesActive = isActive(pathname, NOVEDADES_HREF)
  const unread = useUnreadNovedades()
  const novedadesLabel = unread > 0 ? `Novedades (${unread} sin leer)` : 'Novedades'

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // El menú flota sobre la página: se cierra al tocar afuera o con Escape.
  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!headerRef.current?.contains(e.target as Node)) setIsOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  return (
    <header ref={headerRef} className="sticky top-0 z-50 border-b border-border bg-background/95">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2">
          <img
            src="/logo.png"
            alt="10v10 Stats"
            className="h-8 w-8 rounded-sm object-cover transition-transform duration-200 group-hover:-rotate-[8deg] group-hover:scale-[1.08]"
          />
          <span className="font-heading text-[15px] font-bold uppercase tracking-[0.25em] text-foreground">
            10v10 <span className="text-brand">STATS</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {links.map((link) => {
            const active = isActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative whitespace-nowrap rounded-md px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider transition-colors',
                  active ? 'text-white' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-md bg-primary/20 ring-1 ring-primary/40"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative">{link.label}</span>
              </Link>
            )
          })}
          <Link
            href={NOVEDADES_HREF}
            aria-current={novedadesActive ? 'page' : undefined}
            aria-label={novedadesLabel}
            title={novedadesLabel}
            className={cn(
              'relative flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12px] font-semibold uppercase tracking-wider transition-colors xl:px-3',
              novedadesActive ? 'text-white' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {novedadesActive && (
              <motion.span
                layoutId="nav-active"
                className="absolute inset-0 rounded-md bg-primary/20 ring-1 ring-primary/40"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative">
              <Megaphone className={cn('h-4 w-4', unread > 0 && !novedadesActive && 'text-brand')} aria-hidden="true" />
              {unread > 0 && <UnreadDot className="-right-1.5 -top-1.5" />}
            </span>
            <span className="relative hidden xl:inline">Novedades</span>
          </Link>
          <Link
            href="/temporadas"
            aria-current={seasonsActive ? 'page' : undefined}
            className={cn(
              'season-chip ml-2 flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-black transition-transform hover:scale-105',
              seasonsActive && 'ring-2 ring-amber-200/70 ring-offset-2 ring-offset-background',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Season {seasonNumber}
          </Link>
          <MotionToggle className="ml-2" />
        </nav>

        <div className="flex items-center gap-1 lg:hidden">
          <MotionToggle className="mr-1" />
          <Link
            href={NOVEDADES_HREF}
            aria-current={novedadesActive ? 'page' : undefined}
            aria-label={novedadesLabel}
            className={cn(
              'relative flex items-center justify-center rounded-md p-2 transition-colors',
              novedadesActive ? 'bg-primary/15 text-white' : unread > 0 ? 'text-brand' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Megaphone className="h-5 w-5" aria-hidden="true" />
            {unread > 0 && <UnreadDot className="right-1 top-1" />}
          </Link>
          <button
            className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground"
            onClick={() => setIsOpen((open) => !open)}
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      <div
        id="mobile-nav"
        data-origin="top-right"
        inert={!isOpen}
        className={cn(
          't-dropdown absolute inset-x-0 top-full border-y border-border bg-background shadow-xl shadow-black/40 lg:hidden',
          dropdownState,
        )}
      >
        <nav className="flex flex-col gap-1.5 p-4" aria-label="Principal">
          <Link
            href="/temporadas"
            className="season-chip mb-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-black"
          >
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Season {seasonNumber} · Temporadas
          </Link>
          {links.map((link) => {
            const active = isActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block rounded-md px-4 py-3 text-[14px] font-semibold uppercase tracking-wider transition-colors',
                  active ? 'bg-primary/15 text-white' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            )
          })}
          <Link
            href={NOVEDADES_HREF}
            aria-current={novedadesActive ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 rounded-md px-4 py-3 text-[14px] font-semibold uppercase tracking-wider transition-colors',
              novedadesActive ? 'bg-primary/15 text-white' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Megaphone className="h-4 w-4" aria-hidden="true" />
            Novedades
            {unread > 0 && (
              <span className="ml-auto rounded-full bg-brand px-2 py-0.5 text-[11px] font-extrabold normal-case tracking-normal text-black">
                {unread === 1 ? '1 nueva' : `${unread} nuevas`}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  )
}
