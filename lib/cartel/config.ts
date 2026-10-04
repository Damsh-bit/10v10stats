import type { CartelConfig } from './tipos'

/**
 * Configuración del cartel, por variables de entorno (ver docs/cartel.md).
 * La plata entra a la cuenta de Mercado Pago dueña de CARTEL_MP_ACCESS_TOKEN,
 * que puede ser otra que la banca de las apuestas.
 */

function env(name: string) {
  const value = process.env[name]?.trim()
  return value ? value : null
}

function envEntero(name: string, fallback: number, min: number) {
  const raw = env(name)
  const value = raw === null ? NaN : Math.round(Number(raw.replace(',', '.')))
  return Number.isFinite(value) && value >= min ? value : fallback
}

export function getCartelToken() {
  return env('CARTEL_MP_ACCESS_TOKEN')
}

export function getCartelWebhookSecret() {
  return env('CARTEL_MP_WEBHOOK_SECRET')
}

/** Para bajar carteles. Si no hay una propia, sirve la del panel de la banca. */
export function getCartelAdminKey() {
  const key = env('CARTEL_ADMIN_KEY') ?? env('APUESTAS_ADMIN_KEY')
  return key && key.length >= 12 ? key : null
}

/** Sin token sólo se puede "pagar" en `next dev`: el pago se simula. Nunca en producción. */
export function getCartelProveedor(): 'mercadopago' | 'prueba' | null {
  if (getCartelToken()) return 'mercadopago'
  if (process.env.NODE_ENV === 'development') return 'prueba'
  return null
}

export function getCartelConfig(): CartelConfig {
  const proveedor = getCartelProveedor()
  const precioInicial = envEntero('CARTEL_PRECIO_INICIAL', 10, 1)
  return {
    habilitado: proveedor !== null && Boolean(env('SUPABASE_SERVICE_ROLE_KEY')),
    modoPrueba: proveedor === 'prueba',
    precioInicial,
    subaMinima: envEntero('CARTEL_SUBA_MINIMA', 1, 1),
    montoMax: Math.max(precioInicial, envEntero('CARTEL_MONTO_MAX', 1_000_000, 1)),
  }
}
