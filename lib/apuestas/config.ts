/**
 * Configuración de las apuestas, toda por variables de entorno (ver
 * docs/apuestas.md y .env.example). Sólo se lee en el servidor: al cliente
 * llega `ApuestasPublicConfig`, sin ningún secreto.
 */

export type ProveedorPago = 'mercadopago' | 'manual'

export type ApuestasPublicConfig = {
  /** Se puede apostar: está todo configurado y las apuestas están prendidas. */
  habilitadas: boolean
  /**
   * Se muestran las cuotas en el generador y la sección en la navbar. Con
   * APUESTAS_HABILITADAS=preview se ven sin poder apostar (y siempre en desarrollo).
   */
  visibles: boolean
  /** Cómo se paga: checkout de Mercado Pago o transferencia manual al alias de la banca. */
  proveedor: ProveedorPago | null
  /** Comisión de Mercado Pago que paga el apostador encima de lo que juega (0 a 1). */
  recargoPct: number
  montoMin: number
  montoMax: number
  /** Alias de la banca para el modo manual. */
  bancaAlias: string | null
  /** Qué falta para prenderlas (nombres de variables, nunca valores). */
  faltantes: string[]
}

const DEFAULT_MONTO_MIN = 500
const DEFAULT_MONTO_MAX = 50_000
/** Horas por defecto que quedan abiertas las apuestas de una partida. */
export const HORAS_CIERRE_DEFAULT = 3
export const HORAS_CIERRE_OPCIONES = [1, 2, 3, 6] as const

function env(name: string) {
  const value = process.env[name]?.trim()
  return value ? value : null
}

function envNumber(name: string, fallback: number) {
  const raw = env(name)
  const value = raw === null ? NaN : Number(raw.replace(',', '.'))
  return Number.isFinite(value) ? value : fallback
}

export function getMercadoPagoToken() {
  return env('MERCADOPAGO_ACCESS_TOKEN')
}

export function getMercadoPagoWebhookSecret() {
  return env('MERCADOPAGO_WEBHOOK_SECRET')
}

export function getSessionSecret() {
  const secret = env('APUESTAS_SESSION_SECRET')
  return secret && secret.length >= 32 ? secret : null
}

export function getAdminKey() {
  const key = env('APUESTAS_ADMIN_KEY')
  return key && key.length >= 12 ? key : null
}

/** URL pública del sitio: la usan Mercado Pago para el webhook y la vuelta del checkout. */
export function getSiteUrl(requestUrl?: string) {
  const configured = env('APUESTAS_SITE_URL') ?? env('NEXT_PUBLIC_SITE_URL')
  if (configured) return configured.replace(/\/+$/, '')
  const vercel = env('VERCEL_PROJECT_PRODUCTION_URL')
  if (vercel) return `https://${vercel}`
  if (requestUrl) return new URL(requestUrl).origin
  return 'http://localhost:3000'
}

export function getProveedor(): ProveedorPago | null {
  if (getMercadoPagoToken()) return 'mercadopago'
  if (env('APUESTAS_BANCA_ALIAS')) return 'manual'
  return null
}

/** Distingue una clave que no está de una que está pero es corta (sin decir cuánto mide). */
function faltaClave(name: string, minimo: number) {
  return env(name) ? `${name} es muy corta: necesita ${minimo}+ caracteres` : `${name} (${minimo}+ caracteres)`
}

export function getApuestasConfig(): ApuestasPublicConfig {
  const proveedor = getProveedor()
  const flag = env('APUESTAS_HABILITADAS')
  const faltantes: string[] = []
  if (flag !== 'true') faltantes.push('APUESTAS_HABILITADAS=true')
  if (!env('SUPABASE_SERVICE_ROLE_KEY')) faltantes.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!getSessionSecret()) faltantes.push(faltaClave('APUESTAS_SESSION_SECRET', 32))
  if (!getAdminKey()) faltantes.push(faltaClave('APUESTAS_ADMIN_KEY', 12))
  if (!proveedor) faltantes.push('MERCADOPAGO_ACCESS_TOKEN (o APUESTAS_BANCA_ALIAS para modo manual)')

  const montoMin = Math.max(1, Math.round(envNumber('APUESTAS_MONTO_MIN', DEFAULT_MONTO_MIN)))
  const montoMax = Math.max(montoMin, Math.round(envNumber('APUESTAS_MONTO_MAX', DEFAULT_MONTO_MAX)))
  // Sólo se cobra recargo con Mercado Pago: una transferencia entre cuentas no tiene comisión.
  const recargoPct = proveedor === 'mercadopago' ? Math.min(0.3, Math.max(0, envNumber('APUESTAS_RECARGO_PCT', 0) / 100)) : 0

  return {
    habilitadas: faltantes.length === 0,
    visibles: faltantes.length === 0 || flag === 'preview' || process.env.NODE_ENV === 'development',
    proveedor,
    recargoPct,
    montoMin,
    montoMax,
    bancaAlias: env('APUESTAS_BANCA_ALIAS'),
    faltantes,
  }
}
