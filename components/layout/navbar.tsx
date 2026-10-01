'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/matches', label: 'Partidas' },
  { href: '/creacion-de-equipos', label: 'Equipos' },
  { href: '/estadisticas', label: 'Hall of Fame' },
  { href: '/faceit', label: 'FACEIT' },
]

const APUESTAS_LINK = { href: '/apuestas', label: 'Apuestas' }

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function Navbar({ seasonNumber, apuestas = false }: { seasonNumber: number; apuestas?: boolean }) {
  const pathname = usePathname()
  const links = apuestas ? [...LINKS, APUESTAS_LINK] : LINKS
  const [isOpen, setIsOpen] = useState(false)
  const seasonsActive = pathname.startsWith('/temporadas')

  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="group flex items-center gap-2">
          <motion.img
            src="/logo.png"
            alt="10v10 Stats"
            className="h-8 w-8 rounded-sm object-cover"
            whileHover={{ rotate: -8, scale: 1.08 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          />
          <span className="font-heading text-[15px] font-bold uppercase tracking-[0.25em] text-foreground">
            10v10 <span className="text-brand">STATS</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {links.map((link) => {
            const active = isActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative rounded-md px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider transition-colors',
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
            href="/temporadas"
            aria-current={seasonsActive ? 'page' : undefined}
            className={cn(
              'season-chip ml-2 flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-black transition-transform hover:scale-105',
              seasonsActive && 'ring-2 ring-amber-200/70 ring-offset-2 ring-offset-background',
            )}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Season {seasonNumber}
          </Link>
        </nav>

        <button
          className="flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setIsOpen((open) => !open)}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id="mobile-nav"
            key="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-border bg-background md:hidden"
          >
            <nav className="flex flex-col gap-1.5 p-4" aria-label="Principal">
              <Link
                href="/temporadas"
                className="season-chip mb-1 flex items-center justify-center gap-2 rounded-lg px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-black"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Season {seasonNumber} · Temporadas
              </Link>
              {links.map((link, i) => {
                const active = isActive(pathname, link.href)
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i + 0.05 }}
                  >
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'block rounded-md px-4 py-3 text-[14px] font-semibold uppercase tracking-wider transition-colors',
                        active ? 'bg-primary/15 text-white' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                )
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
