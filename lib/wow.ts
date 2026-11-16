import { neon } from '@neondatabase/serverless'

/**
 * Tiempo de Juego (WoW): horas y estadísticas por día de cada uno, que sube el
 * addon "Tiempo de Juego" de cada PC (repo Damsh-bit/TDJ). Los datos los recibe
 * tiempo-de-juego.vercel.app y quedan en una base Neon que también está
 * conectada a este proyecto (variable TDJ_DATABASE_URL). Acá sólo se leen.
 */

export type DiaWow = {
  persona: string
  /** Día del juego (YYYY-MM-DD). El día arranca a las 6 AM. */
  dia: string
  segundos: number
  nivel: number
  personaje: string | null
  /** Clase en inglés, como la da el juego (SHAMAN, MAGE...). */
  clase: string | null
  /** Límite diario en segundos (versión vieja del addon). */
  limite: number
  /** Límite semanal en segundos. */
  limite_semanal: number
  misiones: number
  muertes: number
  /** Oro en cobre (1 de oro = 10.000). */
  oro_ganado: number
  oro_gastado: number
  kills: number
  xp: number
  actualizado: string | null
  /** Último dato "en vivo" (mientras la persona juega). */
  en_vivo: string | null
}

/** Los últimos 120 días de todos. Si la base no está configurada, devuelve vacío. */
export async function getDiasWow(): Promise<DiaWow[]> {
  const url = process.env.TDJ_DATABASE_URL
  if (!url) return []
  try {
    const sql = neon(url)
    const filas = await sql.query(
      `select persona, to_char(dia, 'YYYY-MM-DD') as dia, segundos, nivel, personaje, clase, limite, limite_semanal,
              misiones, muertes, oro_ganado::float8 as oro_ganado, oro_gastado::float8 as oro_gastado, kills, xp,
              to_char(actualizado at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as actualizado,
              to_char(en_vivo at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as en_vivo
       from tdj_dias where dia >= current_date - 120 order by dia`,
    )
    return filas as DiaWow[]
  } catch (error) {
    console.error('[wow] no se pudieron leer los datos', error)
    return []
  }
}
