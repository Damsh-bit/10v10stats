import { NextResponse } from 'next/server'
import { confirmarTransferencia, marcarPremioPagado, resumenAdmin } from '@/lib/apuestas/admin'
import { guardarPin } from '@/lib/apuestas/cuentas'
import { ApuestaError } from '@/lib/apuestas/db'
import { leerJson, requerirAdmin, requerirHabilitadas, respuestaError } from '@/lib/apuestas/http'
import { anularApuestaAdmin, resolverEvento } from '@/lib/apuestas/servicio'

export const dynamic = 'force-dynamic'

/** Todo lo que tiene que hacer la banca. Header `x-apuestas-admin` con APUESTAS_ADMIN_KEY. */
export async function GET(request: Request) {
  try {
    requerirHabilitadas()
    requerirAdmin(request)
    return NextResponse.json(await resumenAdmin())
  } catch (error) {
    return respuestaError(error)
  }
}

/**
 * - `pin`: { playerId, pin?, habilitado } crea/cambia el PIN o (des)habilita.
 * - `premio_pagado`: { posicionId, referencia } ya se transfirió el premio.
 * - `transferencia`: { posicionId, aprobar } modo manual, llegó (o no) la plata.
 * - `resolver`: { eventoId, matchId } liquida el evento con una partida cargada.
 * - `anular`: { apuestaId, motivo } anula una apuesta y devuelve lo pagado.
 */
export async function POST(request: Request) {
  try {
    requerirHabilitadas()
    requerirAdmin(request)
    const body = await leerJson(request)

    switch (body.accion) {
      case 'pin':
        await guardarPin(body.playerId, body.pin, body.habilitado !== false)
        break
      case 'premio_pagado':
        await marcarPremioPagado(body.posicionId, body.referencia)
        break
      case 'transferencia':
        await confirmarTransferencia(body.posicionId, body.aprobar === true)
        break
      case 'resolver':
        if (typeof body.eventoId !== 'string' || typeof body.matchId !== 'string') throw new ApuestaError('Elegí la partida')
        await resolverEvento(body.eventoId, body.matchId, 'admin')
        break
      case 'anular':
        if (typeof body.apuestaId !== 'string') throw new ApuestaError('Apuesta inválida')
        await anularApuestaAdmin(body.apuestaId, typeof body.motivo === 'string' ? body.motivo : undefined)
        break
      default:
        throw new ApuestaError('Acción inválida')
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return respuestaError(error)
  }
}
