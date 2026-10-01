'use client'

import { useEffect, useState } from 'react'
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react'

/** Capturas oficiales de CS2 (github.com/MurkyYT/cs2-map-icons), recortadas a 1600×900. */
const MAPS = [
  { slug: 'dust2', name: 'de_dust2' },
  { slug: 'nuke', name: 'de_nuke' },
  { slug: 'inferno', name: 'de_inferno' },
  { slug: 'train', name: 'de_train' },
  { slug: 'mirage', name: 'de_mirage' },
  { slug: 'vertigo', name: 'de_vertigo' },
  { slug: 'ancient', name: 'de_ancient' },
  { slug: 'overpass', name: 'de_overpass' },
  { slug: 'anubis', name: 'de_anubis' },
] as const

const SLIDE_MS = 9000
const FADE_S = 2.4
/** Recorrido Ken Burns: cuatro encuadres que se van alternando. */
const KEN_BURNS = ['kb-a', 'kb-b', 'kb-c', 'kb-d'] as const

const srcOf = (i: number) => `/backgrounds/${MAPS[i].slug}.webp`

/** Descarga y decodifica antes de mostrar, así el fundido no arranca con la imagen a medio cargar. */
function preload(src: string) {
  const img = new Image()
  img.src = src
  return img.decode().catch(() => undefined)
}

/** Polvo flotando, con posiciones fijas para que el HTML del servidor y el del cliente coincidan. */
const DUST = [
  { left: 6, size: 3, duration: 22, delay: -4 },
  { left: 14, size: 2, duration: 28, delay: -17 },
  { left: 23, size: 4, duration: 25, delay: -9 },
  { left: 31, size: 2, duration: 31, delay: -22 },
  { left: 42, size: 3, duration: 24, delay: -2 },
  { left: 51, size: 2, duration: 29, delay: -13 },
  { left: 60, size: 4, duration: 27, delay: -20 },
  { left: 68, size: 2, duration: 23, delay: -7 },
  { left: 77, size: 3, duration: 30, delay: -15 },
  { left: 85, size: 2, duration: 26, delay: -1 },
  { left: 93, size: 3, duration: 32, delay: -25 },
]

/**
 * Fondo fijo de toda la app: mapas de CS2 rotando con efecto Ken Burns,
 * parallax con el scroll (y con el mouse en desktop) y un tinte con los
 * colores de la marca para que el contenido se siga leyendo.
 */
export function MapBackdrop() {
  const reduceMotion = useReducedMotion()
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let cancelled = false
    let timer: number | undefined
    const queue = (current: number) => {
      const next = (current + 1) % MAPS.length
      void preload(srcOf(next))
      timer = window.setTimeout(async () => {
        await preload(srcOf(next))
        if (cancelled) return
        setIndex(next)
        queue(next)
      }, SLIDE_MS)
    }
    queue(0)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  // Scroll: el mapa baja más lento que la página.
  const { scrollY } = useScroll()
  const scrollShift = useSpring(
    useTransform(scrollY, (v) => -Math.min(v * 0.08, 180)),
    { stiffness: 120, damping: 28, mass: 0.6 },
  )

  // Mouse: el mapa y el polvo se mueven en sentidos opuestos para dar profundidad.
  const pointerX = useMotionValue(0)
  const pointerY = useMotionValue(0)
  const smoothX = useSpring(pointerX, { stiffness: 50, damping: 18 })
  const smoothY = useSpring(pointerY, { stiffness: 50, damping: 18 })

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const onMove = (event: PointerEvent) => {
      pointerX.set(event.clientX / window.innerWidth - 0.5)
      pointerY.set(event.clientY / window.innerHeight - 0.5)
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [pointerX, pointerY])

  const mapX = useTransform(smoothX, (v) => v * -28)
  const mapY = useTransform([smoothY, scrollShift], ([m, s]: number[]) => m * -18 + s)
  const dustX = useTransform(smoothX, (v) => v * 40)
  const dustY = useTransform([smoothY, scrollY], ([m, s]: number[]) => m * 26 - Math.min(s * 0.15, 300))

  const map = MAPS[index]

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh overflow-hidden bg-background"
    >
      <motion.div
        className="absolute -inset-x-10 -top-10 h-[calc(100%+240px)]"
        style={reduceMotion ? undefined : { x: mapX, y: mapY }}
      >
        <AnimatePresence initial={false}>
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: FADE_S, ease: 'easeInOut' }}
          >
            <img
              src={srcOf(index)}
              alt=""
              decoding="async"
              fetchPriority={index === 0 ? 'low' : undefined}
              className={`map-backdrop-img ${KEN_BURNS[index % KEN_BURNS.length]} h-full w-full object-cover`}
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="map-backdrop-tint absolute inset-0" />

      <motion.div
        className="absolute inset-x-0 top-0 h-[calc(100%+300px)]"
        style={reduceMotion ? undefined : { x: dustX, y: dustY }}
      >
        {DUST.map((p) => (
          <span
            key={p.left}
            className="map-dust absolute bottom-0 rounded-full"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
            }}
          />
        ))}
      </motion.div>

      <div className="map-backdrop-vignette absolute inset-0" />

      {/* Qué mapa se está viendo: sólo en pantallas con margen libre al costado. */}
      <div className="absolute bottom-8 right-5 hidden flex-col items-center gap-3 xl:flex">
        <div className="h-28 w-px overflow-hidden bg-white/10">
          <motion.div
            key={index}
            className="h-full w-full origin-top bg-brand"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: SLIDE_MS / 1000 + FADE_S / 2, ease: 'linear' }}
          />
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={map.slug}
            className="font-mono text-[10px] uppercase tracking-[0.35em] text-white/45 [writing-mode:vertical-rl]"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.4 }}
          >
            {map.name}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  )
}
