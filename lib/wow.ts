import { neon } from '@neondatabase/serverless'

/**
 * Tiempo de Juego (WoW): horas jugadas por día de cada uno, que sube el addon
 * "Tiempo de Juego" de cada PC. Los datos los recibe el proyecto
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
  /** Límite diario en segundos. */
  limite: number
  actualizado: string | null
}

/** Los últimos 120 días de todos. Si la base no está configurada, devuelve vacío. */
export async function getDiasWow(): Promise<DiaWow[]> {
  const url = process.env.TDJ_DATABASE_URL
  if (!url) return []
  try {
    const sql = neon(url)
    const filas = await sql.query(
      `select persona, to_char(dia, 'YYYY-MM-DD') as dia, segundos, nivel, personaje, clase, limite,
              to_char(actualizado at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as actualizado
       from tdj_dias where dia >= current_date - 120 order by dia`,
    )
    return filas as DiaWow[]
  } catch (error) {
    console.error('[wow] no se pudieron leer los datos', error)
    return []
  }
}
