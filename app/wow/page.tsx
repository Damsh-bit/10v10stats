import type { Metadata } from 'next'
import { Cinzel, Cinzel_Decorative, Marcellus } from 'next/font/google'
import { PanelTdj } from '@/components/wow/panel-tdj'
import { getDiasWow } from '@/lib/wow'

const cinzel = Cinzel({ variable: '--tdj-titulo', subsets: ['latin'], weight: ['500', '700', '900'] })
const cinzelDecorative = Cinzel_Decorative({ variable: '--tdj-logo', subsets: ['latin'], weight: ['700'] })
const marcellus = Marcellus({ variable: '--tdj-texto', subsets: ['latin'], weight: ['400'] })

export const metadata: Metadata = {
  title: 'Tiempo de Juego (WoW) — 10v10 STATS',
  description: 'Horas, estadísticas y logros de WoW Forever de cada uno, por día, semana y mes.',
}

// Primer pintado con datos del servidor; después el panel se refresca solo cada minuto.
export const revalidate = 60

export default async function WowPage() {
  const filas = await getDiasWow()
  return (
    <div className={`${cinzel.variable} ${cinzelDecorative.variable} ${marcellus.variable}`}>
      <PanelTdj filas={filas} />
    </div>
  )
}
