'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/matches', label: 'Partidas' },
  { href: '/highlights', label: 'Highlights' },
]

export function Navbar() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="10v10 Stats"
            className="h-8 w-8 rounded-sm object-cover"
          />
          <span className="font-heading text-[15px] font-bold uppercase tracking-[0.25em] text-foreground">
            10v10 <span className="text-[#950c42]">STATS</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
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
        </nav>
      </div>
    </header>
  )
}
