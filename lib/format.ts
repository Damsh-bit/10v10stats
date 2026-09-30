export function formatDate(iso: string) {
  if (!iso) return 'Sin info'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return 'Sin info'

  return parsed.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatShortDate(iso: string) {
  if (!iso) return 'Sin info'
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return 'Sin info'

  return parsed.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', timeZone: 'UTC' })
}

export function formatKda(value: number) {
  return value.toFixed(2)
}

export function formatSigned(value: number, decimals = 0) {
  const fixed = Math.abs(value).toFixed(decimals)
  if (value > 0) return `+${fixed}`
  if (value < 0) return `−${fixed}`
  return fixed
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

export function mapImageUrl(map: string) {
  return `/maps/${map.toLowerCase().replace(/\s+/g, '')}.webp`
}
