'use client'

import Script from 'next/script'
import { useCallback, useRef } from 'react'
import type { DiaWow } from '@/lib/wow'
import './tdj.css'

/**
 * Panel de Tiempo de Juego. Es el mismo panel (sin React) que usa
 * tiempo-de-juego.vercel.app: vive en public/wow/tdj.js y components/wow/tdj.css,
 * copiados del repo TDJ. Acá sólo se monta y se le pasan los datos iniciales;
 * después se refresca solo cada minuto desde /api/wow/datos.
 */

type TdjGlobal = { iniciar: (el: HTMLElement, opciones: { fuente?: string; datos?: DiaWow[] }) => void }
declare global {
  interface Window { TDJ?: TdjGlobal }
}

export function PanelTdj({ filas }: { filas: DiaWow[] }) {
  const ref = useRef<HTMLElement>(null)
  const iniciar = useCallback(() => {
    const el = ref.current
    if (!el || !window.TDJ || el.dataset.tdjListo) return
    el.dataset.tdjListo = '1'
    window.TDJ.iniciar(el, { fuente: '/api/wow/datos', datos: filas })
  }, [filas])
  return (
    <div className="tdj">
      <main ref={ref} className="app" />
      {/* onReady corre al cargar el script y también cada vez que se vuelve a entrar a /wow */}
      <Script src="/wow/tdj.js" strategy="afterInteractive" onReady={iniciar} />
    </div>
  )
}
