'use client'

import { useEffect, useState } from 'react'

type Phase = 'open' | 'closing' | 'closed'

/** Lee una duración CSS en ms. Tailwind minifica `150ms` a `.15s`, así que hay que mirar la unidad. */
function cssDurationMs(name: string, fallback: number) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const amount = parseFloat(value)
  if (Number.isNaN(amount)) return fallback
  return value.endsWith('ms') ? amount : amount * 1000
}

/**
 * Estado de la transición `.t-dropdown` (globals.css). Devuelve la clase a
 * aplicar: `is-open` mientras está abierto e `is-closing` durante
 * `--dropdown-close-dur` al cerrarse. Sin limpiar `is-closing`, la próxima
 * apertura arrancaría desde la escala de cierre en vez de la de reposo.
 */
export function useDropdownTransition(open: boolean) {
  const [phase, setPhase] = useState<Phase>(open ? 'open' : 'closed')

  // Se ajusta en el render (no en un efecto) para que nunca se pinte un frame
  // sin `is-open` ni `is-closing` entre medio.
  if (open && phase !== 'open') setPhase('open')
  if (!open && phase === 'open') setPhase('closing')

  useEffect(() => {
    if (phase !== 'closing') return
    const timer = setTimeout(() => setPhase('closed'), cssDurationMs('--dropdown-close-dur', 150))
    return () => clearTimeout(timer)
  }, [phase])

  return phase === 'open' ? 'is-open' : phase === 'closing' ? 'is-closing' : ''
}
