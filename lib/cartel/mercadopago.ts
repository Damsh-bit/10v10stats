import { mpRequest, type MpInit, type PagoMP, type Preferencia } from '@/lib/apuestas/mercadopago'
import { getCartelToken } from './config'
import { MINUTOS_CHECKOUT } from './tipos'

/**
 * Mercado Pago del cartel: mismo cliente que las apuestas, pero con la cuenta
 * que recibe las donaciones (CARTEL_MP_ACCESS_TOKEN).
 */

export const PREFIJO_REFERENCIA = 'cartel:'

function mp<T>(path: string, init?: MpInit) {
  return mpRequest<T>(getCartelToken(), 'CARTEL_MP_ACCESS_TOKEN', path, init)
}

export function crearPreferenciaCartel(input: { cartelId: string; monto: number; descripcion: string; siteUrl: string; volverA: string }) {
  const volver = (estado: string) => `${input.siteUrl}${input.volverA}?cartel=${input.cartelId}&pago=${estado}`
  // En localhost Mercado Pago no acepta auto_return ni puede avisar: al volver, la página consulta el pago.
  const publico = input.siteUrl.startsWith('https://')
  return mp<Preferencia>('/checkout/preferences', {
    method: 'POST',
    idempotencyKey: `cartel-pref-${input.cartelId}`,
    body: JSON.stringify({
      items: [
        {
          id: input.cartelId,
          title: 'Donación a 10v10 STATS · El Cartel',
          description: input.descripcion,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: input.monto,
        },
      ],
      external_reference: `${PREFIJO_REFERENCIA}${input.cartelId}`,
      ...(publico ? { notification_url: `${input.siteUrl}/api/cartel/webhook`, auto_return: 'approved' } : {}),
      back_urls: { success: volver('ok'), pending: volver('pendiente'), failure: volver('error') },
      // Aprobado o rechazado en el momento: nada que se acredite días después.
      binary_mode: true,
      expires: true,
      expiration_date_from: new Date().toISOString(),
      expiration_date_to: new Date(Date.now() + MINUTOS_CHECKOUT * 60_000).toISOString(),
      payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'atm' }], installments: 1 },
      statement_descriptor: '10V10STATS',
      metadata: { cartel_id: input.cartelId },
    }),
  })
}

export function obtenerPagoCartel(pagoId: string | number) {
  return mp<PagoMP>(`/v1/payments/${encodeURIComponent(String(pagoId))}`)
}

/** Por si el webhook no llegó (p. ej. en localhost): el último pago de ese cartel. */
export async function buscarPagoCartel(cartelId: string) {
  const params = new URLSearchParams({ external_reference: `${PREFIJO_REFERENCIA}${cartelId}`, sort: 'date_created', criteria: 'desc' })
  const data = await mp<{ results: PagoMP[] }>(`/v1/payments/search?${params}`)
  const pagos = data.results ?? []
  return pagos.find((p) => p.status === 'approved') ?? pagos[0] ?? null
}

export function reembolsarPagoCartel(pagoId: string | number) {
  return mp<{ id: number; status: string }>(`/v1/payments/${encodeURIComponent(String(pagoId))}/refunds`, {
    method: 'POST',
    idempotencyKey: `cartel-refund-${pagoId}`,
    body: JSON.stringify({}),
  })
}
