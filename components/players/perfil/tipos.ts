import type { PlayerStats } from '@/types'
import type { RecordType } from '@/lib/records'
import type { PerfilAlcance } from '@/lib/perfil/datos'
import type { ResumenCifrasXplay, ResumenDuelos } from '@/lib/xplay/duelos'

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
  /** Fuera de la ladder: no tiene puesto aunque haya jugado. */
  inactivo: boolean
  /** Ya no juega más (homenaje QEPD): en la temporada en curso dice QEPD en vez de Inactivo. */
  qepd: boolean
  nelsons: number
  perfil: PerfilAlcance
  /** Duelos contra cada rival (sólo partidas de Xplay). */
  duelos: ResumenDuelos
  /** Cifras de Xplay sumadas en el período; null si no jugó partidas de Xplay. */
  xplay: ResumenCifrasXplay | null
}
