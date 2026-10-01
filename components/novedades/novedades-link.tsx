'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const NOVEDADES_HASH = '#novedades'
export const OPEN_NOVEDADES_EVENT = 'novedades:abrir'

/** Vuelve a abrir el pop-up de novedades: en la home lo abre ahí mismo, desde otra página lleva a la home. */
export function NovedadesLink({ className, children = 'Novedades' }: { className?: string; children?: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <Link
      href={`/${NOVEDADES_HASH}`}
      scroll={false}
      className={className}
      onClick={(event) => {
        if (pathname !== '/') return
        event.preventDefault()
        window.dispatchEvent(new Event(OPEN_NOVEDADES_EVENT))
      }}
    >
      {children}
    </Link>
  )
}
