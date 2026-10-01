import { notFound } from 'next/navigation'
import { getApuestasConfig } from '@/lib/apuestas/config'
import { ApuestaError } from '@/lib/apuestas/db'
import { sesionActual } from '@/lib/apuestas/http'
import { obtenerEvento } from '@/lib/apuestas/servicio'
import { EventoApuestas } from '@/components/apuestas/evento-apuestas'
import { ApuestasInactivas } from '@/components/apuestas/apuestas-inactivas'
import { Aviso } from '@/components/apuestas/ui'

export const dynamic = 'force-dynamic'

export default async function EventoApuestasPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  const query = await searchParams
  const config = getApuestasConfig()

  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4 sm:py-8">
        {config.habilitadas ? <Contenido id={id} query={query} config={config} /> : <ApuestasInactivas config={config} />}
      </div>
    </main>
  )
}

async function Contenido({
  id,
  query,
  config,
}: {
  id: string
  query: Record<string, string | string[] | undefined>
  config: ReturnType<typeof getApuestasConfig>
}) {
  const sesion = await sesionActual()
  let detalle
  try {
    detalle = await obtenerEvento(id, sesion?.playerId)
  } catch (error) {
    if (error instanceof ApuestaError && error.status === 404) notFound()
    return <Aviso tipo="error">{error instanceof Error ? error.message : 'No se pudo cargar la partida'}</Aviso>
  }

  const pago = typeof query.pago === 'string' ? query.pago : null
  const posicion = typeof query.posicion === 'string' ? query.posicion : null

  return (
    <EventoApuestas
      detalle={detalle}
      sesion={sesion}
      config={config}
      retornoPago={pago && posicion ? { estado: pago, posicionId: posicion } : null}
    />
  )
}
