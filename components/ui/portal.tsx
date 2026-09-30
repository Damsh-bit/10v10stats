'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Renderiza en <body>. Los modales tienen que salir del árbol de la página:
 * cualquier ancestro con transform, filter o `isolation` (las animaciones de
 * Motion, el hero) crea su propio contexto de apilamiento y el z-index del
 * modal deja de competir con la navbar y el resto del sitio.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  return mounted ? createPortal(children, document.body) : null
}

/** Evita que la página de fondo scrollee mientras hay un modal abierto. */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [locked])
}
