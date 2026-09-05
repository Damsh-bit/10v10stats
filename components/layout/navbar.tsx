'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Menu, X, Trophy } from 'lucide-react'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/matches', label: 'Partidas' },
  { href: '/creacion-de-equipos', label: 'Equipos' },
  { href: '/estadisticas', label: 'Estadísticas' },
]

export function Navbar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
          <img
            src="/logo.png"
            alt="10v10 Stats"
            className="h-8 w-8 rounded-sm object-cover"
          />
          <span className="font-heading text-[15px] font-bold uppercase tracking-[0.25em] text-foreground">
            10v10 <span className="text-[#950c42]">STATS</span>
          </span>
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((link) => {
            const active =
              link.href === '/'
                ? pathname === '/'
                : pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-[12px] font-semibold uppercase tracking-wider transition-colors',
                  active
                    ? 'bg-[#950c42]/15 text-[#950c42]'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            )
          })}
          <Link
            href="/final-del-mundo"
            onClick={() => setIsOpen(false)}
            className="btn-gold-glow ml-1 flex cursor-pointer items-center gap-1.5 rounded-full border border-yellow-300/60 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-black transition-transform hover:scale-105"
          >
            <Trophy className="h-3.5 w-3.5" />
            Super Final del Mundo
          </Link>
        </nav>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden flex items-center justify-center p-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden border-t border-border bg-background">
          <nav className="flex flex-col p-4 gap-2">
            <Link
              href="/final-del-mundo"
              onClick={() => setIsOpen(false)}
              className="btn-gold-glow mb-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-yellow-300/60 bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 px-4 py-3 text-[13px] font-extrabold uppercase tracking-wider text-black"
            >
              <Trophy className="h-4 w-4" />
              Super Final del Mundo
            </Link>
            {links.map((link) => {
              const active =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'rounded-sm px-4 py-3 text-[14px] font-semibold uppercase tracking-wider transition-colors',
                    active
                      ? 'bg-[#950c42]/15 text-[#950c42]'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
