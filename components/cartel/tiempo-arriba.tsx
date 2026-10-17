'use client'

import { formatDuracion, tiempoArribaFijo, type RankingDonador } from '@/lib/cartel/tipos'
import { useAhora } from './cartel-billboard'

/**
 * Cuánto estuvo arriba un donador. El servidor dibuja la parte fija (así la
 * página cacheada no cambia con la hora) y, si el cartel de arriba es suyo, el
 * navegador le suma el tiempo en vivo.
 */
export function TiempoArriba({ donador }: { donador: Pick<RankingDonador, 'tiempoMs' | 'arribaDesde'> }) {
  const ahora = useAhora(60_000)
  if (!donador.arribaDesde || ahora === null) return <>{tiempoArribaFijo(donador)}</>
  const enVivo = Math.max(0, ahora - Date.parse(donador.arribaDesde))
  return <>{formatDuracion(donador.tiempoMs + enVivo)} arriba</>
}
