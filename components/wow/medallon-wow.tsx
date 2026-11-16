'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import s from './wow.module.css'

/**
 * Medallón con el ícono de WoW que flota abajo a la derecha en todo el sitio y
 * lleva a /wow. En /wow no se muestra.
 */
export function MedallonWow() {
  const pathname = usePathname()
  if (pathname.startsWith('/wow')) return null
  return (
    <Link href="/wow" className={s.medallon} aria-label="Tiempo de Juego (WoW)" title="Tiempo de Juego (WoW)">
      <img src="/wow/icono-wow.png" alt="" width={56} height={56} />
    </Link>
  )
}
