import { getApuestasConfig } from '@/lib/apuestas/config'
import { sesionActual } from '@/lib/apuestas/http'
import { listarEventos, ranking } from '@/lib/apuestas/servicio'
import { AdminApuestas } from '@/components/apuestas/admin-apuestas'
import { ApuestasHub } from '@/components/apuestas/apuestas-hub'
import { ApuestasInactivas } from '@/components/apuestas/apuestas-inactivas'
import { Aviso } from '@/components/apuestas/ui'
import { Reveal } from '@/components/motion/reveal'

export const dynamic = 'force-dynamic'

export default async function ApuestasPage() {
  const config = getApuestasConfig()

  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <div className="mx-auto max-w-4xl px-3 py-6 sm:px-4 sm:py-8">
        <Reveal immediate className="mb-6">
          <span className="font-heading text-[11px] font-semibold uppercase tracking-[0.3em] text-brand">10v10 Stats</span>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">Apuestas</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">
            Pozo por equipos y duelos 1v1 entre nosotros, con las chances del generador. Se paga con Mercado Pago y se liquida solo
            cuando se carga la partida.
          </p>
        </Reveal>
        {config.habilitadas ? <Contenido config={config} /> : <ApuestasInactivas config={config} />}
      </div>
    </main>
  )
}

async function Contenido({ config }: { config: ReturnType<typeof getApuestasConfig> }) {
  try {
    const [sesion, eventos, tabla] = await Promise.all([sesionActual(), listarEventos(), ranking()])
    return (
      <div className="flex flex-col gap-6">
        <ApuestasHub sesion={sesion} eventos={eventos} ranking={tabla} config={config} />
        <AdminApuestas />
      </div>
    )
  } catch (error) {
    return <Aviso tipo="error">{error instanceof Error ? error.message : 'No se pudieron cargar las apuestas'}</Aviso>
  }
}
