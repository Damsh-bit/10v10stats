'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import s from './wow.module.css'

/**
 * Medallón dorado que flota abajo a la derecha en todo el sitio y lleva a /wow.
 * Es un emblema propio (no el logo oficial de WoW, que es marca de Blizzard).
 * En /wow no se muestra.
 */
export function MedallonWow() {
  const pathname = usePathname()
  if (pathname.startsWith('/wow')) return null
  return (
    <Link href="/wow" className={s.medallon} aria-label="Tiempo de Juego (WoW)" title="Tiempo de Juego (WoW)">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <defs>
          <linearGradient id="medallon-oro" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff2a8" />
            <stop offset="0.5" stopColor="#ffd100" />
            <stop offset="1" stopColor="#b67d0d" />
          </linearGradient>
        </defs>
        {/* "W" con remates en punta, estilo fantasía */}
        <path
          fill="url(#medallon-oro)"
          stroke="#2a1a05"
          strokeWidth="0.8"
          strokeLinejoin="round"
          d="M2.5 6.5h7.2l-1.6 1.3 3.1 11.2 3.2-9.6-1-2.9h7.1l-1.5 1.3 3.2 11.2 3.4-10.5-2.2-2h5.6l-2.6 2.6-6.2 18.4h-1.6l-4.4-13.3-4.5 13.3h-1.6L5.2 8.9z"
        />
      </svg>
    </Link>
  )
}
