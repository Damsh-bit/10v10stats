'use client'

import { useEffect, useState } from 'react'
import { useMotionEnabled } from '@/components/motion/motion-provider'

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

const SLIDE_MS = 12000

const srcOf = (i: number) => `/backgrounds/${MAPS[i].slug}.webp`

/** Descarga y decodifica antes de mostrar, así el fundido no arranca con la imagen a medio cargar. */
function preload(src: string) {
  const img = new Image()
  img.src = src
  return img.decode().catch(() => undefined)
}

/**
 * Fondo fijo de toda la app: mapas de CS2 que se van turnando con un fundido y
 * un tinte con los colores de la marca para que el contenido se siga leyendo.
 *
 * Es quieto a propósito: sin parallax ni zoom continuo. Cualquier movimiento acá
 * obliga a recomponer toda la pantalla en cada frame y el scroll se traba.
 */
export function MapBackdrop() {
  // La anterior queda abajo mientras la nueva entra con el fundido (CSS).
  const [layers, setLayers] = useState<number[]>([0])
  const motionEnabled = useMotionEnabled()
  const index = layers[layers.length - 1]

  // En modo liviano el mapa queda fijo.
  useEffect(() => {
    if (!motionEnabled) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let cancelled = false
    let timer: number | undefined
    let current = index
    const queue = () => {
      const next = (current + 1) % MAPS.length
      timer = window.setTimeout(async () => {
        // Con la pestaña oculta no tiene sentido decodificar ni cambiar nada.
        if (document.hidden) return queue()
        await preload(srcOf(next))
        if (cancelled) return
        setLayers([current, next])
        current = next
        queue()
      }, SLIDE_MS)
    }
    queue()

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
    // `index` sólo se lee al arrancar: al volver a prender sigue desde el mapa actual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionEnabled])

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-lvh overflow-hidden bg-background"
    >
      {layers.map((i) => (
        <img
          key={i}
          src={srcOf(i)}
          alt=""
          decoding="async"
          fetchPriority={i === 0 ? 'low' : undefined}
          className={`absolute inset-0 h-full w-full object-cover ${layers.length > 1 && i === index ? 'map-backdrop-fade' : ''}`}
        />
      ))}

      <div className="map-backdrop-tint absolute inset-0" />
      <div className="map-backdrop-vignette absolute inset-0" />

      {/* Qué mapa se está viendo: sólo en pantallas con margen libre al costado. */}
      <span
        key={index}
        className="map-backdrop-label absolute bottom-8 right-5 hidden font-mono text-[10px] uppercase tracking-[0.35em] text-white/45 [writing-mode:vertical-rl] xl:block"
      >
        {MAPS[index].name}
      </span>
    </div>
  )
}
