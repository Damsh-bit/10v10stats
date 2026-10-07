import type { PlayerStats } from '@/types'
import type { RecordType } from '@/lib/records'
import type { PerfilAlcance } from '@/lib/perfil/datos'

/** Una temporada (o la carrera) del perfil: cifras, puesto y todo lo de las pestañas. */
export type AlcancePerfil = {
  key: string
  label: string
  /** Temporada a la que corresponde; null para "Carrera". */
  seasonId: number | null
  isCurrent: boolean
  stats: PlayerStats | null
  rank: number | null
  rankedCount: number
  records: RecordType[]
  menudaMierda: boolean
  nelsons: number
  perfil: PerfilAlcance
}
