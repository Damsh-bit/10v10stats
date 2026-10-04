import type { Metadata } from 'next'
import { Crown, Flame, HandCoins, History, ShieldCheck, Target } from 'lucide-react'
import { formatPesos } from '@/lib/apuestas/cuotas'
import { getCartelHistorial, listarJugadores } from '@/lib/cartel/servicio'
import { formatDuracion } from '@/lib/cartel/tipos'
import { CartelVivo } from '@/components/cartel/cartel-vivo'
import { HistorialCarteles } from '@/components/cartel/cartel-historial'
import { JugadorAvatar } from '@/components/apuestas/ui'
import { WhatsNewModal } from '@/components/novedades/whats-new-modal'
import { Reveal } from '@/components/motion/reveal'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'El Cartel — 10v10 STATS',
  description: 'Doná, poné tu cartel en la home y bancátela hasta que alguien ponga más.',
}

const PASOS = [
  { icon: HandCoins, color: 'text-amber-300', titulo: 'Donás', texto: 'Con Mercado Pago, desde lo que sale sacar el cartel que está.' },
  { icon: Target, color: 'text-rose-300', titulo: 'Ponés lo que quieras', texto: 'Un mensaje, una foto o GIF, a quién va dirigido y el estilo.' },
  { icon: Flame, color: 'text-orange-300', titulo: 'Queda arriba de todo', texto: 'En el inicio, hasta que alguien ponga más plata que vos.' },
  { icon: ShieldCheck, color: 'text-emerald-300', titulo: 'Blindalo', texto: 'Si ponés de más, el próximo tiene que superar eso para sacarte.' },
]

function Tarjeta({ titulo, icono, children }: { titulo: string; icono: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card/80 p-4 backdrop-blur-sm">
      <h2 className="flex items-center gap-2 font-heading text-[15px] font-bold uppercase tracking-[0.16em] text-foreground">
        {icono}
        {titulo}
      </h2>
      {children}
    </section>
  )
}

export default async function CartelPage() {
  const [historial, jugadores] = await Promise.all([getCartelHistorial(), listarJugadores()])

  if (!historial) {
    return (
      <main className="cs-grid min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">El cartel no está disponible por ahora.</div>
      </main>
    )
  }

  const { estado, entradas, donadores, objetivos, totalDonado } = historial
  const pagos = entradas.filter((entrada) => !entrada.esCasa)
  const record = pagos.reduce((max, entrada) => Math.max(max, entrada.monto), 0)

  const stats = [
    { label: 'Donado en total', valor: formatPesos(totalDonado) },
    { label: 'Carteles puestos', valor: String(pagos.length) },
    { label: 'Récord', valor: record > 0 ? formatPesos(record) : '—' },
    { label: 'Para sacarlo', valor: formatPesos(estado.precioMinimo) },
  ]

  return (
    <main className="cs-grid min-h-screen overflow-x-hidden">
      <WhatsNewModal autoOpen={false} />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-2 py-5 sm:px-4 sm:py-8">
        <header className="flex flex-col gap-2 px-1">
          <span className="w-fit rounded-full border border-orange-400/40 bg-orange-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-300">
            Donaciones
          </span>
          <h1 className="font-heading text-4xl font-black uppercase tracking-tight text-foreground sm:text-6xl">El Cartel</h1>
          <p className="max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
            El que dona se queda con el cartel de la home y pone lo que quiera, hasta que otro ponga más. La plata es para bancar la página.
          </p>
        </header>

        <CartelVivo inicial={estado} jugadores={jugadores} volverA="/cartel" />

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card/80 px-3 py-2.5 backdrop-blur-sm">
              <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{stat.label}</dt>
              <dd className="font-mono text-[20px] font-black tabular-nums text-foreground sm:text-[24px]">{stat.valor}</dd>
            </div>
          ))}
        </dl>

        <Reveal>
          <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PASOS.map((paso, i) => (
              <li key={paso.titulo} className="flex gap-3 rounded-xl border border-border bg-card/60 p-3 backdrop-blur-sm">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/10">
                  <paso.icon className={`h-4 w-4 ${paso.color}`} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-heading text-[14px] font-bold uppercase tracking-wide text-foreground">
                    <span className="mr-1 text-muted-foreground">{i + 1}.</span>
                    {paso.titulo}
                  </p>
                  <p className="text-[12px] leading-snug text-muted-foreground">{paso.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </Reveal>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex min-w-0 flex-col gap-3 lg:col-span-2">
            <h2 className="flex items-center gap-2 px-1 font-heading text-[15px] font-bold uppercase tracking-[0.16em] text-foreground">
              <History className="h-4 w-4 text-violet-300" aria-hidden="true" />
              Historial
            </h2>
            <HistorialCarteles entradas={entradas} actualId={estado.actual?.id ?? null} />
          </div>

          <aside className="flex min-w-0 flex-col gap-6">
            <Tarjeta titulo="Los que más pusieron" icono={<Crown className="h-4 w-4 text-yellow-400" aria-hidden="true" />}>
              {donadores.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">Nadie todavía. El primero queda acá arriba.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {donadores.slice(0, 10).map((donador, i) => (
                    <li key={`${donador.autor}-${i}`} className="flex items-center gap-2.5">
                      <span className="w-5 text-right font-mono text-[12px] font-bold text-muted-foreground">{i + 1}</span>
                      {donador.jugador ? (
                        <JugadorAvatar jugador={donador.jugador} size={28} />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-[13px]" aria-hidden="true">
                          {donador.autor === 'Anónimo' ? '🕵️' : '✍️'}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-foreground">{donador.autor}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {donador.carteles === 1 ? '1 cartel' : `${donador.carteles} carteles`} · {formatDuracion(donador.tiempoMs)} arriba
                        </p>
                      </div>
                      <span className="font-mono text-[13px] font-black text-amber-200">{formatPesos(donador.total)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </Tarjeta>

            <Tarjeta titulo="Los más bardeados" icono={<Target className="h-4 w-4 text-rose-300" aria-hidden="true" />}>
              {objetivos.length === 0 ? (
                <p className="text-[12px] text-muted-foreground">Todavía nadie le dedicó un cartel a nadie.</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {objetivos.slice(0, 5).map((objetivo, i) => (
                    <li key={objetivo.jugador.id} className="flex items-center gap-2.5">
                      <span className="w-5 text-right font-mono text-[12px] font-bold text-muted-foreground">{i + 1}</span>
                      <JugadorAvatar jugador={objetivo.jugador} size={28} />
                      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{objetivo.jugador.name}</p>
                      <span className="text-[11px] text-muted-foreground">
                        {objetivo.carteles === 1 ? '1 cartel' : `${objetivo.carteles} carteles`} · {formatPesos(objetivo.plata)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Tarjeta>
          </aside>
        </div>
      </div>
    </main>
  )
}
