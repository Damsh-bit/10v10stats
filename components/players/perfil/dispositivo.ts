'use client'

const CLAVE = 'dispositivo-id'

/**
 * Id anónimo y al azar de este navegador: con él se cuenta un me gusta (y un
 * reporte) por navegador sin pedir cuenta. Sin storage, vale para esta visita.
 */
let enMemoria: string | null = null

export function getDeviceId(): string {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado) return guardado
    const nuevo = crypto.randomUUID()
    localStorage.setItem(CLAVE, nuevo)
    return nuevo
  } catch {
    enMemoria ??= crypto.randomUUID()
    return enMemoria
  }
}
