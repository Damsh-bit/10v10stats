'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ImagePlus, Loader2, Lock, ShieldCheck, Trash2, X } from 'lucide-react'
import { formatPesos } from '@/lib/apuestas/cuotas'
import {
  AUTOR_MAX,
  ESTILOS_CARTEL,
  IMAGEN_MAX_BYTES,
  MENSAJE_MAX,
  type CartelEstado,
  type EstiloCartel,
  type JugadorMini,
  type VolverA,
} from '@/lib/cartel/tipos'
import { JugadorAvatar } from '@/components/apuestas/ui'
import { Portal, useBodyScrollLock } from '@/components/ui/portal'
import { cn } from '@/lib/utils'
import { CartelBillboard, type CartelVista } from './cartel-billboard'
import { ESTILOS } from './estilos'

const BORRADOR_KEY = 'cartel-borrador'
/** Lado más largo de las fotos: alcanza para el cartel y pesa poco. */
const LADO_MAX = 1200

type Firma = { modo: 'anonimo' } | { modo: 'jugador'; id: string } | { modo: 'otro'; nombre: string }

type Borrador = { mensaje: string; firma: Firma; objetivoId: string | null; estilo: EstiloCartel }

type Imagen = { blob: Blob; url: string; ext: string }

function leerBorrador(): Partial<Borrador> {
  try {
    const raw = localStorage.getItem(BORRADOR_KEY)
    return raw ? (JSON.parse(raw) as Partial<Borrador>) : {}
  } catch {
    return {}
  }
}

export function borrarBorradorCartel() {
  try {
    localStorage.removeItem(BORRADOR_KEY)
  } catch {
    // sin storage: no había borrador
  }
}

const largo = (texto: string) => Array.from(texto).length

const toBlob = (canvas: HTMLCanvasElement, tipo: string) => new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, tipo, 0.85))

/** Las fotos se achican y pasan a WEBP en el celu antes de subir; los GIF van tal cual (si no, pierden la animación). */
async function prepararImagen(file: File): Promise<Imagen> {
  if (file.type === 'image/gif') {
    if (file.size > IMAGEN_MAX_BYTES) throw new Error('El GIF no puede pasar los 3 MB')
    return { blob: file, url: URL.createObjectURL(file), ext: 'gif' }
  }
  if (!file.type.startsWith('image/')) throw new Error('Tiene que ser una imagen (JPG, PNG, WEBP o GIF)')

  const bitmap = await createImageBitmap(file).catch(() => null)
  if (!bitmap) throw new Error('No pudimos leer esa imagen. Probá con un JPG o PNG.')
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  let blob = await toBlob(canvas, 'image/webp')
  // Safari viejo no sabe hacer WEBP y devuelve PNG: mejor JPG.
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg')
  if (!blob) throw new Error('No pudimos procesar esa imagen')
  if (blob.size > IMAGEN_MAX_BYTES) throw new Error('La imagen es muy pesada (máximo 3 MB)')
  return { blob, url: URL.createObjectURL(blob), ext: blob.type === 'image/webp' ? 'webp' : 'jpg' }
}

const redondearArriba = (valor: number, paso: number) => Math.ceil(valor / paso) * paso

function Seccion({ titulo, ayuda, children }: { titulo: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-heading text-[13px] font-bold uppercase tracking-[0.18em] text-foreground">{titulo}</h3>
        {ayuda && <span className="text-[11px] text-muted-foreground">{ayuda}</span>}
      </div>
      {children}
    </section>
  )
}

function Pildora({ activa, onClick, children }: { activa: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activa}
      className={cn(
        'flex min-w-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[12px] font-semibold transition-colors',
        activa ? 'border-brand bg-brand/15 text-white' : 'border-border bg-background/50 text-muted-foreground hover:border-white/30 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function IconoPildora({ children }: { children: React.ReactNode }) {
  return <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px]">{children}</span>
}

/**
 * Armar un cartel y pagarlo. Arriba se ve cómo va a quedar; al pagar se va al
 * checkout de Mercado Pago (o, en `next dev` sin token, se simula el pago).
 */
export function CartelComposer({
  abierto,
  onClose,
  estado,
  jugadores,
  volverA,
}: {
  abierto: boolean
  onClose: () => void
  estado: CartelEstado
  jugadores: JugadorMini[]
  volverA: VolverA
}) {
  useBodyScrollLock(abierto)
  const { precioMinimo: precio, config } = estado

  const [mensaje, setMensaje] = useState('')
  const [firma, setFirma] = useState<Firma>({ modo: 'anonimo' })
  const [objetivoId, setObjetivoId] = useState<string | null>(null)
  const [estilo, setEstilo] = useState<EstiloCartel>('fuego')
  const [monto, setMonto] = useState(String(precio))
  const [imagen, setImagen] = useState<Imagen | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const archivoRef = useRef<HTMLInputElement>(null)
  const cargado = useRef(false)

  // Lo que había escrito (si el pago no salió, no tiene que escribir todo de nuevo).
  useEffect(() => {
    if (!abierto) return
    if (!cargado.current) {
      cargado.current = true
      const borrador = leerBorrador()
      if (typeof borrador.mensaje === 'string') setMensaje(borrador.mensaje)
      if (borrador.firma) setFirma(borrador.firma)
      if (borrador.objetivoId !== undefined) setObjetivoId(borrador.objetivoId)
      if (borrador.estilo && (ESTILOS_CARTEL as readonly string[]).includes(borrador.estilo)) setEstilo(borrador.estilo)
    }
    setMonto((actual) => (Number(actual) >= precio ? actual : String(precio)))
    setError(null)
    const timer = window.setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 250)
    return () => window.clearTimeout(timer)
  }, [abierto, precio])

  useEffect(() => {
    if (!abierto) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && !enviando && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abierto, enviando, onClose])

  useEffect(() => {
    if (!cargado.current) return
    try {
      localStorage.setItem(BORRADOR_KEY, JSON.stringify({ mensaje, firma, objetivoId, estilo } satisfies Borrador))
    } catch {
      // sin storage: no se guarda el borrador
    }
  }, [mensaje, firma, objetivoId, estilo])

  useEffect(() => () => {
    if (imagen) URL.revokeObjectURL(imagen.url)
  }, [imagen])

  const porId = useMemo(() => new Map(jugadores.map((j) => [j.id, j])), [jugadores])
  const autorJugador = firma.modo === 'jugador' ? (porId.get(firma.id) ?? null) : null
  const autor = autorJugador?.name ?? (firma.modo === 'otro' ? firma.nombre.trim() || 'Alguien' : 'Anónimo')
  const objetivo = objetivoId ? (porId.get(objetivoId) ?? null) : null
  const montoNum = Number(monto)
  const montoValido = Number.isInteger(montoNum) && montoNum >= precio && montoNum <= config.montoMax

  const borrador: CartelVista = {
    autor,
    autorJugador,
    objetivo,
    mensaje: mensaje.replace(/\s+/g, ' ').trim(),
    imagenUrl: imagen?.url ?? null,
    estilo,
    monto: montoValido ? montoNum : precio,
    esCasa: false,
    oculto: false,
  }

  const opciones = [...new Set([precio, redondearArriba(precio + 50, 100), redondearArriba(precio + 400, 500), redondearArriba(precio + 1500, 1000)])].filter(
    (valor) => valor <= config.montoMax,
  )

  const elegirImagen = async (file: File | undefined) => {
    if (!file) return
    setProcesando(true)
    setError(null)
    try {
      setImagen(await prepararImagen(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo usar esa imagen')
    } finally {
      setProcesando(false)
      if (archivoRef.current) archivoRef.current.value = ''
    }
  }

  const faltante = !borrador.mensaje
    ? 'Escribí el mensaje del cartel'
    : firma.modo === 'otro' && !firma.nombre.trim()
      ? 'Poné cómo querés firmar'
      : !montoValido
        ? montoNum > config.montoMax
          ? `El máximo es ${formatPesos(config.montoMax)}`
          : `Tenés que poner al menos ${formatPesos(precio)} (en pesos enteros)`
        : null

  const pagar = async () => {
    if (faltante || !config.habilitado) return
    setEnviando(true)
    setError(null)
    try {
      const form = new FormData()
      form.set('mensaje', borrador.mensaje)
      form.set('estilo', estilo)
      form.set('monto', String(montoNum))
      form.set('volverA', volverA)
      if (firma.modo === 'jugador') form.set('autorPlayerId', firma.id)
      else form.set('autor', firma.modo === 'otro' ? firma.nombre.trim() : 'Anónimo')
      if (objetivoId) form.set('objetivoPlayerId', objetivoId)
      if (imagen) form.set('imagen', imagen.blob, `cartel.${imagen.ext}`)

      const response = await fetch('/api/cartel', { method: 'POST', body: form })
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string }
      if (!response.ok || !data.url) throw new Error(data.error ?? 'No se pudo arrancar el pago')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo arrancar el pago')
      setEnviando(false)
    }
  }

  return (
    <Portal>
      <AnimatePresence>
        {abierto && (
          <motion.div
            key="cartel-composer"
            className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => !enviando && onClose()} aria-hidden="true" />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cartel-composer-titulo"
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.98, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="relative flex max-h-[calc(100dvh-0.5rem)] w-full max-w-[580px] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-card shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl"
            >
              <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
                <div className="min-w-0">
                  <h2 id="cartel-composer-titulo" className="font-heading text-[20px] font-bold uppercase tracking-wide text-foreground">
                    Tu cartel
                  </h2>
                  <p className="text-[12px] text-muted-foreground">
                    Para sacar el que está tenés que poner al menos <strong className="font-mono text-foreground">{formatPesos(precio)}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={enviando}
                  className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground disabled:opacity-40"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="flex min-h-0 flex-col gap-5 overflow-y-auto px-4 py-4 sm:px-5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Así va a quedar</span>
                  <CartelBillboard cartel={borrador} variante="preview" />
                </div>

                {config.modoPrueba && (
                  <p className="rounded-lg border border-sky-400/40 bg-sky-400/10 px-3 py-2 text-[12px] text-sky-200">
                    Modo prueba (sólo en la compu, sin Mercado Pago): el pago se simula y no se cobra nada.
                  </p>
                )}
                {!config.habilitado && (
                  <p className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200">
                    Todavía no está conectado Mercado Pago, así que por ahora no se puede pagar. Ya casi.
                  </p>
                )}

                <Seccion titulo="Mensaje" ayuda={`${largo(mensaje)}/${MENSAJE_MAX}`}>
                  <textarea
                    ref={textareaRef}
                    value={mensaje}
                    onChange={(event) => setMensaje(Array.from(event.target.value).slice(0, MENSAJE_MAX).join(''))}
                    rows={3}
                    placeholder="Lo que quieras: un bardeo, una dedicatoria, una confesión…"
                    className="w-full resize-none rounded-lg border border-border bg-background/60 px-3 py-2 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-brand"
                  />
                </Seccion>

                <Seccion titulo="Imagen" ayuda="Opcional · foto o GIF">
                  <input ref={archivoRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => elegirImagen(event.target.files?.[0])} />
                  {imagen ? (
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagen.url} alt="Imagen elegida" className="h-16 w-16 rounded-lg border border-border object-cover" />
                      <button type="button" onClick={() => archivoRef.current?.click()} className="rounded-md border border-border px-2.5 py-1.5 text-[12px] font-semibold text-muted-foreground hover:text-foreground">
                        Cambiar
                      </button>
                      <button type="button" onClick={() => setImagen(null)} className="flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] font-semibold text-rose-300 hover:bg-rose-400/10">
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Sacar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => archivoRef.current?.click()}
                      disabled={procesando}
                      className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/40 px-3 py-3 text-[13px] font-semibold text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground disabled:opacity-60"
                    >
                      {procesando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
                      {procesando ? 'Preparando la imagen…' : 'Subir una imagen'}
                    </button>
                  )}
                </Seccion>

                <Seccion titulo="¿Para quién?" ayuda="Opcional · sale su foto">
                  <div className="flex flex-wrap gap-1.5">
                    <Pildora activa={objetivoId === null} onClick={() => setObjetivoId(null)}>
                      <IconoPildora>—</IconoPildora>
                      Para nadie
                    </Pildora>
                    {jugadores.map((jugador) => (
                      <Pildora key={jugador.id} activa={objetivoId === jugador.id} onClick={() => setObjetivoId(jugador.id)}>
                        <JugadorAvatar jugador={jugador} size={20} />
                        <span className="truncate">{jugador.name}</span>
                      </Pildora>
                    ))}
                  </div>
                </Seccion>

                <Seccion titulo="¿Quién firma?">
                  <div className="flex flex-wrap gap-1.5">
                    <Pildora activa={firma.modo === 'anonimo'} onClick={() => setFirma({ modo: 'anonimo' })}>
                      <IconoPildora>🕵️</IconoPildora>
                      Anónimo
                    </Pildora>
                    {jugadores.map((jugador) => (
                      <Pildora key={jugador.id} activa={firma.modo === 'jugador' && firma.id === jugador.id} onClick={() => setFirma({ modo: 'jugador', id: jugador.id })}>
                        <JugadorAvatar jugador={jugador} size={20} />
                        <span className="truncate">{jugador.name}</span>
                      </Pildora>
                    ))}
                    <Pildora activa={firma.modo === 'otro'} onClick={() => setFirma({ modo: 'otro', nombre: firma.modo === 'otro' ? firma.nombre : '' })}>
                      <IconoPildora>✍️</IconoPildora>
                      Otro nombre
                    </Pildora>
                  </div>
                  {firma.modo === 'otro' && (
                    <input
                      value={firma.nombre}
                      onChange={(event) => setFirma({ modo: 'otro', nombre: Array.from(event.target.value).slice(0, AUTOR_MAX).join('') })}
                      placeholder="Cómo querés firmar"
                      autoFocus
                      className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-brand"
                    />
                  )}
                </Seccion>

                <Seccion titulo="Estilo">
                  <div className="grid grid-cols-4 gap-2">
                    {ESTILOS_CARTEL.map((clave) => (
                      <button
                        key={clave}
                        type="button"
                        onClick={() => setEstilo(clave)}
                        aria-pressed={estilo === clave}
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-[11px] font-semibold transition-colors',
                          estilo === clave ? 'border-white/60 bg-white/10 text-white' : 'border-border text-muted-foreground hover:border-white/30',
                        )}
                      >
                        <span className={cn('flex h-7 w-full max-w-[56px] items-center justify-center rounded-md bg-gradient-to-br text-[15px]', ESTILOS[clave].muestra)} aria-hidden="true">
                          {ESTILOS[clave].emoji}
                        </span>
                        {ESTILOS[clave].nombre}
                      </button>
                    ))}
                  </div>
                </Seccion>

                <Seccion titulo="¿Cuánto ponés?" ayuda={`Mínimo ${formatPesos(precio)}`}>
                  <div className="flex flex-wrap gap-1.5">
                    {opciones.map((valor, i) => (
                      <button
                        key={valor}
                        type="button"
                        onClick={() => setMonto(String(valor))}
                        aria-pressed={montoNum === valor}
                        className={cn(
                          'rounded-full border px-3 py-1.5 font-mono text-[12px] font-bold transition-colors',
                          montoNum === valor ? 'border-brand bg-brand/15 text-white' : 'border-border text-muted-foreground hover:text-foreground',
                        )}
                      >
                        {i === 0 ? `Mínimo · ${formatPesos(valor)}` : formatPesos(valor)}
                      </button>
                    ))}
                  </div>
                  <label className="flex items-center gap-2 rounded-lg border border-border bg-background/60 px-3 focus-within:border-brand">
                    <span className="font-mono text-[16px] font-bold text-muted-foreground">$</span>
                    <input
                      value={monto}
                      onChange={(event) => setMonto(event.target.value.replace(/\D/g, '').slice(0, 9))}
                      inputMode="numeric"
                      aria-label="Monto en pesos"
                      className="w-full bg-transparent py-2 font-mono text-[18px] font-bold text-foreground outline-none"
                    />
                  </label>
                  {montoValido && (
                    <p className="flex items-start gap-1.5 text-[12px] text-muted-foreground">
                      <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden="true" />
                      <span>
                        Para sacarte, el próximo va a tener que poner <strong className="font-mono text-foreground">{formatPesos(montoNum + config.subaMinima)}</strong>
                        {montoNum > precio ? '. Cuanto más ponés, más blindado queda.' : '. Si ponés más, más caro le sale.'}
                      </span>
                    </p>
                  )}
                </Seccion>

                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Es una donación para bancar la página: no se devuelve. La única excepción: si mientras pagás alguien pone lo mismo o más
                  antes que vos, el cartel no es tuyo y la plata vuelve sola. Si un cartel se pasa de rosca, lo pueden bajar.
                </p>
              </div>

              <footer className="flex flex-col gap-2 border-t border-border/60 bg-black/10 px-4 py-3 sm:px-5">
                {(error || faltante) && <p className={cn('text-[12px]', error ? 'text-rose-300' : 'text-muted-foreground')}>{error ?? faltante}</p>}
                <button
                  type="button"
                  onClick={pagar}
                  disabled={Boolean(faltante) || enviando || procesando || !config.habilitado}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[14px] font-extrabold uppercase tracking-wider shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50',
                    ESTILOS[estilo].boton,
                  )}
                >
                  {enviando ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Lock className="h-4 w-4" aria-hidden="true" />}
                  {enviando ? 'Yendo a Mercado Pago…' : `Pagar ${formatPesos(montoValido ? montoNum : precio)}${config.modoPrueba ? ' (prueba)' : ' con Mercado Pago'}`}
                </button>
              </footer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  )
}
