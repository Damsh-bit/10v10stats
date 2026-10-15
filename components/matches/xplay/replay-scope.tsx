'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * El replay 2D de SCOPE.GG metido en la página sin que se corte.
 *
 * SCOPE tiene dos diseños fijos: el de celular (hasta ~600 px de ancho) mide
 * 580 px de alto, y el de escritorio mide siempre 924 px de alto y necesita
 * ~1000 px de ancho para que entre el panel de los equipos. En celular se le
 * da justo ese alto; en lo demás se dibuja en tamaño de escritorio y se achica
 * para que entre entero en el ancho de la página y en el alto de la pantalla.
 */

const ANCHO_CELULAR = 640
const ALTO_CELULAR = 580
const ANCHO_ESCRITORIO = 1000
const ALTO_ESCRITORIO = 924
/** Lo que se deja de la pantalla para la navbar y los controles de abajo. */
const MARGEN_PANTALLA = 140
const ALTO_MINIMO = 480

type Medidas = { ancho: number; alto: number; escala: number }

function medir(contenedor: number, pantalla: number): Medidas {
  if (contenedor < ANCHO_CELULAR) return { ancho: contenedor, alto: ALTO_CELULAR, escala: 1 }
  const altoDisponible = Math.max(ALTO_MINIMO, pantalla - MARGEN_PANTALLA)
  const escala = Math.min(1, altoDisponible / ALTO_ESCRITORIO, contenedor / ANCHO_ESCRITORIO)
  // A esa escala, el ancho que ocupa todo el contenedor.
  return { ancho: Math.round(contenedor / escala), alto: ALTO_ESCRITORIO, escala }
}

export function ReplayScope({ url }: { url: string }) {
  const contenedorRef = useRef<HTMLDivElement>(null)
  const [medidas, setMedidas] = useState<Medidas | null>(null)

  useEffect(() => {
    const contenedor = contenedorRef.current
    if (!contenedor) return
    const actualizar = () => setMedidas(medir(contenedor.clientWidth, window.innerHeight))
    actualizar()
    const observer = new ResizeObserver(actualizar)
    observer.observe(contenedor)
    window.addEventListener('resize', actualizar)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', actualizar)
    }
  }, [])

  return (
    <div
      ref={contenedorRef}
      className="relative w-full overflow-hidden bg-white"
      style={{ height: medidas ? Math.round(medidas.alto * medidas.escala) : ALTO_CELULAR }}
    >
      {medidas ? (
        <iframe
          src={url}
          title="Replay 2D de la partida"
          loading="lazy"
          allow="fullscreen"
          className="absolute left-0 top-0 block border-0"
          style={{
            width: medidas.ancho,
            height: medidas.alto,
            transform: medidas.escala === 1 ? undefined : `scale(${medidas.escala})`,
            transformOrigin: '0 0',
          }}
        />
      ) : null}
    </div>
  )
}
