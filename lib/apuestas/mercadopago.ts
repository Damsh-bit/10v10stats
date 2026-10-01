import { createHmac, timingSafeEqual } from 'node:crypto'
import { getMercadoPagoToken, getMercadoPagoWebhookSecret } from './config'

/**
 * Cliente mínimo de la API REST de Mercado Pago (sin SDK: son 4 llamadas).
 *
 * - Cobro: Checkout Pro. Se crea una "preferencia" por cada posición y el
 *   jugador paga en la página de Mercado Pago (dinero en cuenta, débito,
 *   crédito). La plata entra a la cuenta dueña del access token: la banca.
 * - Confirmación: Mercado Pago avisa al webhook; nunca se confía en lo que
 *   trae el aviso, siempre se vuelve a consultar el pago con el token.
 * - Devoluciones: la API de reembolsos devuelve el pago completo al medio con
 *   el que se pagó (se usa para apuestas anuladas o empates).
 * - Premios: la API pública no permite mandarle plata a otra cuenta, así que
 *   los premios se transfieren a mano al alias de cada ganador y se marcan
 *   como pagados en el panel del admin.
 *
 * Docs: https://www.mercadopago.com.ar/developers/es/reference
 */

const API = 'https://api.mercadopago.com'

export class MercadoPagoError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
  ) {
    super(message)
  }
}

async function mp<T>(path: string, init: RequestInit & { idempotencyKey?: string } = {}): Promise<T> {
  const token = getMercadoPagoToken()
  if (!token) throw new MercadoPagoError('Falta MERCADOPAGO_ACCESS_TOKEN', 500, null)

  const { idempotencyKey, headers, ...rest } = init
  const response = await fetch(`${API}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {}),
      ...headers,
    },
    cache: 'no-store',
  })

  const text = await response.text()
  const body = text ? safeJson(text) : null
  if (!response.ok) {
    const message = (body as { message?: string } | null)?.message ?? `Mercado Pago respondió ${response.status}`
    throw new MercadoPagoError(message, response.status, body)
  }
  return body as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// ─── Checkout Pro ───────────────────────────────────────────────────────────

export type PreferenciaInput = {
  posicionId: string
  titulo: string
  descripcion: string
  /** Total a cobrar: monto + recargo. */
  total: number
  /** El checkout deja de aceptar pagos en este momento (cierre de las apuestas). */
  venceAt: string
  siteUrl: string
  /** A dónde vuelve el jugador después de pagar. */
  volverA: string
}

export type Preferencia = { id: string; init_point: string; sandbox_init_point?: string }

export function crearPreferencia(input: PreferenciaInput) {
  const volver = (estado: string) => `${input.siteUrl}${input.volverA}?pago=${estado}&posicion=${input.posicionId}`
  return mp<Preferencia>('/checkout/preferences', {
    method: 'POST',
    idempotencyKey: `pref-${input.posicionId}-${input.total}`,
    body: JSON.stringify({
      items: [
        {
          id: input.posicionId,
          title: input.titulo,
          description: input.descripcion,
          category_id: 'entertainment',
          quantity: 1,
          currency_id: 'ARS',
          unit_price: input.total,
        },
      ],
      external_reference: input.posicionId,
      notification_url: `${input.siteUrl}/api/apuestas/webhook`,
      back_urls: { success: volver('ok'), pending: volver('pendiente'), failure: volver('error') },
      auto_return: 'approved',
      // Se aprueba o se rechaza en el momento: nada de pagos "pendientes" que se acrediten después del cierre.
      binary_mode: true,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: input.venceAt,
      // Sin efectivo (Rapipago/Pago Fácil): tarda días en acreditarse.
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }], installments: 1 },
      statement_descriptor: '10V10STATS',
      metadata: { posicion_id: input.posicionId },
    }),
  })
}

// ─── Pagos ──────────────────────────────────────────────────────────────────

export type PagoMP = {
  id: number
  status: 'approved' | 'pending' | 'authorized' | 'in_process' | 'in_mediation' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'
  status_detail?: string
  external_reference: string | null
  transaction_amount: number
  currency_id: string
  date_approved: string | null
  transaction_details?: { net_received_amount?: number }
  payer?: { email?: string | null }
}

export function obtenerPago(pagoId: string | number) {
  return mp<PagoMP>(`/v1/payments/${encodeURIComponent(String(pagoId))}`)
}

/** Último pago asociado a una posición (por si el webhook no llegó: p. ej. corriendo en localhost). */
export async function buscarPagoDePosicion(posicionId: string) {
  const params = new URLSearchParams({ external_reference: posicionId, sort: 'date_created', criteria: 'desc' })
  const data = await mp<{ results: PagoMP[] }>(`/v1/payments/search?${params}`)
  const pagos = data.results ?? []
  return pagos.find((p) => p.status === 'approved') ?? pagos[0] ?? null
}

/** Devuelve el pago completo. La clave de idempotencia evita devolver dos veces lo mismo. */
export function reembolsarPago(pagoId: string | number) {
  return mp<{ id: number; status: string }>(`/v1/payments/${encodeURIComponent(String(pagoId))}/refunds`, {
    method: 'POST',
    idempotencyKey: `refund-${pagoId}`,
    body: JSON.stringify({}),
  })
}

// ─── Webhook ────────────────────────────────────────────────────────────────

/**
 * Valida la firma `x-signature` ("ts=…,v1=…") del webhook: HMAC-SHA256 del
 * manifiesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` con el secreto
 * que da Mercado Pago al configurar el webhook en "Tus integraciones".
 *
 * Devuelve null si no hay secreto configurado o el aviso no vino firmado (los
 * avisos de `notification_url` pueden llegar sin firma): igual es seguro,
 * porque el pago siempre se vuelve a consultar con el token.
 */
export function firmaWebhookValida(params: { xSignature: string | null; xRequestId: string | null; dataId: string | null }): boolean | null {
  const secret = getMercadoPagoWebhookSecret()
  if (!secret || !params.xSignature) return null

  const partes = Object.fromEntries(
    params.xSignature.split(',').map((parte) => {
      const [clave, ...valor] = parte.split('=')
      return [clave.trim(), valor.join('=').trim()]
    }),
  )
  const ts = partes.ts
  const v1 = partes.v1
  if (!ts || !v1) return false

  let manifiesto = ''
  if (params.dataId) manifiesto += `id:${/^[a-z0-9]+$/i.test(params.dataId) ? params.dataId.toLowerCase() : params.dataId};`
  if (params.xRequestId) manifiesto += `request-id:${params.xRequestId};`
  manifiesto += `ts:${ts};`

  const esperada = Buffer.from(createHmac('sha256', secret).update(manifiesto).digest('hex'))
  const recibida = Buffer.from(v1)
  return esperada.length === recibida.length && timingSafeEqual(esperada, recibida)
}
