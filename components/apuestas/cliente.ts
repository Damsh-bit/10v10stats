'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { JugadorMini, SesionJugador } from '@/lib/apuestas/tipos'

/** Llamadas del navegador a /api/apuestas: tira un Error con el mensaje del servidor. */

const ADMIN_STORAGE_KEY = 'apuestas-admin-key'
const HEADER_ADMIN = 'x-apuestas-admin'

export function leerClaveAdmin() {
  try {
    return sessionStorage.getItem(ADMIN_STORAGE_KEY)
  } catch {
    return null
  }
}

export function guardarClaveAdmin(clave: string | null) {
  try {
    if (clave) sessionStorage.setItem(ADMIN_STORAGE_KEY, clave)
    else sessionStorage.removeItem(ADMIN_STORAGE_KEY)
  } catch {
    // Sin sessionStorage (modo privado): se pide la clave cada vez.
  }
}

export async function llamar<T = { ok: true }>(
  url: string,
  body?: Record<string, unknown>,
  { method, admin }: { method?: string; admin?: boolean } = {},
): Promise<T> {
  const clave = admin ? leerClaveAdmin() : null
  const response = await fetch(url, {
    method: method ?? (body ? 'POST' : 'GET'),
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(clave ? { [HEADER_ADMIN]: clave } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error((data as { error?: string }).error ?? 'Algo salió mal')
  return data as T
}

/** Sesión de apuestas del navegador (cookie httpOnly: se pregunta al servidor). */
export function useSesionApuestas(habilitadas: boolean, inicial?: SesionJugador | null) {
  const [sesion, setSesion] = useState<SesionJugador | null>(inicial ?? null)
  const [jugadores, setJugadores] = useState<JugadorMini[]>([])
  const [cargando, setCargando] = useState(habilitadas)

  const refrescar = useCallback(async () => {
    if (!habilitadas) return
    try {
      const data = await llamar<{ sesion: SesionJugador | null; jugadores: JugadorMini[] }>('/api/apuestas/sesion')
      setSesion(data.sesion)
      setJugadores(data.jugadores)
    } catch {
      setSesion(null)
    } finally {
      setCargando(false)
    }
  }, [habilitadas])

  useEffect(() => {
    refrescar()
  }, [refrescar])

  return { sesion, jugadores, cargando, refrescar, setSesion }
}

/**
 * Corre una acción contra la API y refresca la página (los datos vienen del
 * servidor). `pendiente` dice qué botón está cargando.
 */
export function useAccion() {
  const router = useRouter()
  const [pendiente, setPendiente] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(
    async (clave: string, accion: () => Promise<unknown>) => {
      setPendiente(clave)
      setError(null)
      try {
        await accion()
        router.refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Algo salió mal')
        return false
      } finally {
        setPendiente(null)
      }
    },
    [router],
  )

  return { run, pendiente, error, setError }
}

/** Clave del admin guardada en la pestaña (sessionStorage). */
export function useClaveAdmin() {
  const [clave, setClave] = useState<string | null>(null)
  useEffect(() => setClave(leerClaveAdmin()), [])
  const guardar = useCallback((nueva: string | null) => {
    guardarClaveAdmin(nueva)
    setClave(nueva)
  }, [])
  return { clave, guardar, esAdmin: Boolean(clave) }
}
