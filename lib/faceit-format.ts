/** Helpers de FACEIT sin dependencias de servidor: los usan también los componentes del cliente. */

/** Elo mínimo de cada nivel de CS2 (índice = nivel). */
export const LEVEL_MIN_ELO = [0, 100, 501, 751, 901, 1051, 1201, 1351, 1531, 1751, 2001]

/** Pisos de nivel que caen dentro de un rango de elo (para marcar en los gráficos). */
export function levelFloorsBetween(min: number, max: number) {
  return LEVEL_MIN_ELO.map((elo, level) => ({ level, elo })).filter((l) => l.level >= 2 && l.elo > min && l.elo < max)
}

/** Colores oficiales de los niveles de FACEIT. */
export function levelColor(level: number) {
  if (level >= 10) return '#fe1f00'
  if (level >= 8) return '#ff6309'
  if (level >= 4) return '#ffc800'
  if (level >= 2) return '#1ce400'
  return '#eeeeee'
}

export function faceitMatchUrl(matchId: string) {
  return `https://www.faceit.com/es/cs2/room/${matchId}`
}

export function formatEloDelta(delta: number) {
  if (delta > 0) return `+${delta}`
  if (delta < 0) return `−${Math.abs(delta)}`
  return '±0'
}
