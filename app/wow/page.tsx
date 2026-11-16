import type { Metadata } from 'next'
import { Cinzel, Cinzel_Decorative, Marcellus } from 'next/font/google'
import { PanelWow } from '@/components/wow/panel-wow'
import { getDiasWow } from '@/lib/wow'

const cinzel = Cinzel({ variable: '--font-wow-titulo', subsets: ['latin'], weight: ['500', '700', '900'] })
const cinzelDecorative = Cinzel_Decorative({ variable: '--font-wow-logo', subsets: ['latin'], weight: ['700'] })
const marcellus = Marcellus({ variable: '--font-wow-texto', subsets: ['latin'], weight: ['400'] })

export const metadata: Metadata = {
  title: 'Tiempo de Juego (WoW) — 10v10 STATS',
  description: 'Cuántas horas juega cada uno a WoW Forever por día, semana y mes, y qué nivel tiene.',
}

// Los datos llegan cuando cada uno cierra el juego: alcanza con refrescar cada 5 minutos.
export const revalidate = 300

export default async function WowPage() {
  const filas = await getDiasWow()
  return (
    <div className={`${cinzel.variable} ${cinzelDecorative.variable} ${marcellus.variable}`}>
      <PanelWow filas={filas} />
    </div>
  )
}
