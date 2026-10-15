import pkg from '../package.json'

/**
 * Qué versión del sitio está andando: la versión de package.json (se sube en
 * cada commit) y el commit desplegado con su hora, que completa next.config.mjs
 * al compilar.
 */

const REPO = 'https://github.com/Damsh-bit/10v10stats'

export type VersionSitio = {
  version: string
  commit: string | null
  commitCorto: string | null
  /** Hora del commit (ISO). */
  fecha: string | null
  /** Hora del commit en Argentina, ej. "15 oct 2026, 18:42". */
  fechaTexto: string | null
  url: string | null
}

export function versionSitio(): VersionSitio {
  const commit = process.env.NEXT_PUBLIC_COMMIT_SHA || null
  const fecha = process.env.NEXT_PUBLIC_COMMIT_FECHA || null
  const parsed = fecha ? new Date(fecha) : null
  const fechaTexto =
    parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleString('es-AR', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'America/Argentina/Buenos_Aires',
        })
      : null
  return {
    version: pkg.version,
    commit,
    commitCorto: commit ? commit.slice(0, 7) : null,
    fecha,
    fechaTexto,
    url: commit ? `${REPO}/commit/${commit}` : null,
  }
}
