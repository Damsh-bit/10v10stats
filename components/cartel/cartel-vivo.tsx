'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import confetti from 'canvas-confetti'
import { ArrowRight, CircleHelp, History, Loader2, X } from 'lucide-react'
import { formatPesos } from '@/lib/apuestas/cuotas'
import { NOVEDAD_CARTEL_ID, type CartelEstado, type JugadorMini, type VerificacionCartel, type VolverA } from '@/lib/cartel/tipos'
import { openNovedadPopup } from '@/components/novedades/novedades-state'
import { cn } from '@/lib/utils'
import { CartelBillboard, type CartelVista } from './cartel-billboard'
import { borrarBorradorCartel, CartelComposer } from './cartel-composer'
import { ESTILOS } from './estilos'

type Aviso =
  | { tipo: 'verificando' }
  | { tipo: 'esperando' }
  | { tipo: 'ganaste' }
  | { tipo: 'perdiste'; devuelto: boolean; motivo: string | null }
  | { tipo: 'pago-fallido' }
  | { tipo: 'error'; mensaje: string }

/** Cuántas veces se vuelve a preguntar si Mercado Pago todavía no confirmó. */
const REINTENTOS = 6
const ESPERA_MS = 2500

const VACIO: CartelVista = {
  autor: 'Nadie todavía',
  autorJugador: null,
  objetivo: null,
  mensaje: 'El cartel está libre. El primero que pone, lo tiene.',
  imagenUrl: null,
  estilo: 'oro',
  monto: 0,
  esCasa: true,
  oculto: false,
}

function festejar() {
  const base = { particleCount: 70, spread: 70, startVelocity: 48, ticks: 200, zIndex: 130, disableForReducedMotion: true, colors: ['#fbbf24', '#ff5c8d', '#38bdf8', '#ffffff'] }
  confetti({ ...base, angle: 60, origin: { x: 0.1, y: 0.6 } })
  confetti({ ...base, angle: 120, origin: { x: 0.9, y: 0.6 } })
}

function TextoAviso({ aviso }: { aviso: Aviso }) {
  switch (aviso.tipo) {
    case 'verificando':
      return <>Confirmando tu pago con Mercado Pago…</>
    case 'esperando':
      return <>Mercado Pago todavía no confirmó el pago. Si se aprueba, tu cartel aparece solo: actualizá en un rato.</>
    case 'ganaste':
      return (
        <>
          <strong className="text-white">¡El cartel es tuyo!</strong> Ya lo ve todo el que entra. Gracias por bancar la página.
        </>
      )
    case 'perdiste':
      return (
        <>
          {aviso.motivo === 'superado'
            ? 'Alguien puso lo mismo o más mientras pagabas, así que el cartel no quedó para vos. '
            : 'El pago no coincidió con el cartel, así que no cuenta. '}
          {aviso.devuelto
            ? 'Ya te devolvimos la plata (puede tardar unos días en verse).'
            : 'Te devolvemos la plata: si en unos días no la ves, avisale al que hizo la página.'}
        </>
      )
    case 'pago-fallido':
      return <>El pago no salió. Si querés, probá de nuevo: lo que escribiste quedó guardado.</>
    case 'error':
      return <>{aviso.mensaje}</>
  }
}

function TiraAviso({ aviso, onCerrar }: { aviso: Aviso; onCerrar: () => void }) {
  const tono =
    aviso.tipo === 'ganaste'
      ? 'border-emerald-400/50 bg-emerald-400/15 text-emerald-100'
      : aviso.tipo === 'verificando' || aviso.tipo === 'esperando'
        ? 'border-sky-400/40 bg-sky-400/10 text-sky-100'
        : 'border-rose-400/40 bg-rose-400/10 text-rose-100'
  const icono = aviso.tipo === 'ganaste' ? '🎉' : aviso.tipo === 'perdiste' ? '😬' : aviso.tipo === 'esperando' ? '⏳' : aviso.tipo === 'verificando' ? null : '⚠️'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden px-3 sm:px-5"
      role="status"
      aria-live="polite"
    >
      <div className={cn('mb-1 flex items-start gap-2 rounded-lg border px-3 py-2 text-[12px] leading-snug', tono)}>
        {icono ? (
          <span aria-hidden="true">{icono}</span>
        ) : (
          <Loader2 className="mt-px h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
        )}
        <span className="min-w-0 flex-1">
          <TextoAviso aviso={aviso} />
        </span>
        {aviso.tipo !== 'verificando' && (
          <button type="button" onClick={onCerrar} className="-m-1 rounded p-1 opacity-70 hover:opacity-100" aria-label="Cerrar aviso">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

/**
 * El cartel de la home (y de /cartel): el vigente, el botón para sacarlo y la
 * vuelta del checkout de Mercado Pago (verifica el pago y festeja o avisa).
 */
export function CartelVivo({
  inicial,
  jugadores,
  volverA = '/',
  className,
}: {
  inicial: CartelEstado
  jugadores: JugadorMini[]
  volverA?: VolverA
  className?: string
}) {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const [estado, setEstado] = useState(inicial)
  const [abierto, setAbierto] = useState(false)
  const [aviso, setAviso] = useState<Aviso | null>(null)
  const montado = useRef(true)

  useEffect(() => setEstado(inicial), [inicial])

  useEffect(() => {
    montado.current = true
    return () => {
      montado.current = false
    }
  }, [])

  // Vuelta de Mercado Pago: ?cartel=<id>&pago=ok|pendiente|error (más lo que agrega Mercado Pago).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const id = params.get('cartel')
    const pago = params.get('pago')
    if (!id || !pago) return
    // Con state null Next.js también actualiza su URL (si no, router.refresh() vuelve a poner los parámetros).
    window.history.replaceState(null, '', window.location.pathname)

    if (pago === 'error') {
      setAviso({ tipo: 'pago-fallido' })
      return
    }

    setAviso({ tipo: 'verificando' })
    const verificar = async (intento: number) => {
      try {
        const response = await fetch(`/api/cartel/${encodeURIComponent(id)}`, { method: 'POST', cache: 'no-store' })
        const data = (await response.json().catch(() => ({}))) as Partial<VerificacionCartel> & { error?: string }
        if (!response.ok || !data.estado) throw new Error(data.error ?? 'No pudimos confirmar el pago')
        if (!montado.current) return
        if (data.actual) setEstado(data.actual)

        if (data.estado === 'pagado') {
          setAviso({ tipo: 'ganaste' })
          borrarBorradorCartel()
          festejar()
          router.refresh()
        } else if (data.estado === 'pendiente') {
          if (intento < REINTENTOS) window.setTimeout(() => verificar(intento + 1), ESPERA_MS)
          else setAviso({ tipo: 'esperando' })
        } else {
          setAviso({ tipo: 'perdiste', devuelto: data.estado === 'devuelto', motivo: data.motivo ?? null })
        }
      } catch (error) {
        if (montado.current) setAviso({ tipo: 'error', mensaje: error instanceof Error ? error.message : 'No pudimos confirmar el pago' })
      }
    }
    verificar(0)
  }, [router])

  const cerrarComposer = useCallback(() => setAbierto(false), [])

  const actual = estado.actual
  const cartel = actual ?? VACIO
  const estilo = ESTILOS[cartel.estilo]

  const acciones = (
    <div className="flex flex-col items-stretch gap-1.5 sm:flex-row sm:items-center sm:gap-2 lg:w-[230px] lg:flex-col lg:items-stretch">
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={cn(
          'group flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2.5 text-[13px] font-extrabold uppercase tracking-wider shadow-lg transition-transform hover:scale-[1.03] active:scale-[0.98] lg:flex-none',
          estilo.boton,
        )}
      >
        {actual ? 'Sacalo' : 'Ponelo'} por {formatPesos(estado.precioMinimo)}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </button>
      <div className="flex shrink-0 items-center justify-center gap-1 whitespace-nowrap text-[11px] font-semibold text-white/60">
        <button
          type="button"
          onClick={() => openNovedadPopup(NOVEDAD_CARTEL_ID)}
          className="flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-white/5 hover:text-white"
        >
          <CircleHelp className="h-3.5 w-3.5" aria-hidden="true" />
          ¿Cómo funciona?
        </button>
        {volverA === '/' && (
          <Link href="/cartel" className="flex items-center gap-1 rounded-md px-1.5 py-1 transition-colors hover:bg-white/5 hover:text-white">
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            Historial
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <div className={className}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={actual?.id ?? 'vacio'}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, rotateX: -75 }}
          animate={{ opacity: 1, rotateX: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, rotateX: 75 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformPerspective: 1100, transformOrigin: 'center' }}
        >
          <CartelBillboard
            cartel={cartel}
            acciones={acciones}
            pie={<AnimatePresence>{aviso && <TiraAviso key="aviso" aviso={aviso} onCerrar={() => setAviso(null)} />}</AnimatePresence>}
          />
        </motion.div>
      </AnimatePresence>

      <CartelComposer abierto={abierto} onClose={cerrarComposer} estado={estado} jugadores={jugadores} volverA={volverA} />
    </div>
  )
}
