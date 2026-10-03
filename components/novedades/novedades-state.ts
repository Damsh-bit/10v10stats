'use client'

import { useEffect, useState } from 'react'
import { NOVEDADES, NOVEDADES_MAX_AGE_DAYS } from '@/lib/novedades'

/** Abre el pop-up de una novedad puntual (tiene que haber un <WhatsNewModal /> en la página). */
export const OPEN_NOVEDAD_EVENT = 'novedades:abrir'

export function openNovedadPopup(id: string) {
  window.dispatchEvent(new CustomEvent<{ id: string }>(OPEN_NOVEDAD_EVENT, { detail: { id } }))
}

/** Novedades que el visitante ya leyó en /novedades (distinto de los pop-ups vistos). */
const READ_KEY = 'novedades-leidas'
const READ_EVENT = 'novedades:leidas'
const DAY_MS = 24 * 60 * 60 * 1000

/** null = el navegador no deja guardar: mejor no marcar nada como nuevo. */
function readRead(): string[] | null {
  try {
    const raw = localStorage.getItem(READ_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return null
  }
}

/** Sin leer: las que no leyó y no son tan viejas como para que ya no importen. */
export function getUnreadIds(now = Date.now()): string[] {
  const read = readRead()
  if (!read) return []
  return NOVEDADES.filter(
    (n) => !read.includes(n.id) && now - Date.parse(n.date) <= NOVEDADES_MAX_AGE_DAYS * DAY_MS,
  ).map((n) => n.id)
}

export function markAllNovedadesRead() {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(NOVEDADES.map((n) => n.id)))
  } catch {
    // sin storage: no se puede recordar
  }
  window.dispatchEvent(new Event(READ_EVENT))
}

/** Cuántas novedades sin leer hay. 0 hasta montar, para no romper la hidratación. */
export function useUnreadNovedades() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const update = () => setCount(getUnreadIds().length)
    update()
    const onStorage = (event: StorageEvent) => {
      if (event.key === READ_KEY) update()
    }
    window.addEventListener(READ_EVENT, update)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener(READ_EVENT, update)
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  return count
}
