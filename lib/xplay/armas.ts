/**
 * Armas con la numeración que usa SCOPE.GG en las kills (la de los parsers de
 * demos de CS: 1–10 pistolas, 101 SMG, 201 pesadas, 301 rifles, 401 equipo,
 * 501 granadas).
 */

export type ClaseArma = 'pistola' | 'smg' | 'pesada' | 'rifle' | 'sniper' | 'granada' | 'cuchillo' | 'otra'

const NOMBRES: Record<number, string> = {
  1: 'P2000',
  2: 'Glock-18',
  3: 'P250',
  4: 'Desert Eagle',
  5: 'Five-SeveN',
  6: 'Dual Berettas',
  7: 'Tec-9',
  8: 'CZ75-Auto',
  9: 'USP-S',
  10: 'R8 Revolver',
  101: 'MP7',
  102: 'MP9',
  103: 'PP-Bizon',
  104: 'MAC-10',
  105: 'UMP-45',
  106: 'P90',
  107: 'MP5-SD',
  201: 'Sawed-Off',
  202: 'Nova',
  203: 'MAG-7',
  204: 'XM1014',
  205: 'M249',
  206: 'Negev',
  301: 'Galil AR',
  302: 'FAMAS',
  303: 'AK-47',
  304: 'M4A4',
  305: 'M4A1-S',
  306: 'SSG 08',
  307: 'SG 553',
  308: 'AUG',
  309: 'AWP',
  310: 'SCAR-20',
  311: 'G3SG1',
  401: 'Zeus',
  404: 'Bomba',
  405: 'Cuchillo',
  407: 'Mundo',
  501: 'Decoy',
  502: 'Molotov',
  503: 'Incendiaria',
  504: 'Flash',
  505: 'Smoke',
  506: 'HE',
}

const SNIPERS = new Set([306, 309, 310, 311])

export function nombreArma(arma: number) {
  return NOMBRES[arma] ?? 'Otra'
}

export function claseArma(arma: number): ClaseArma {
  if (arma >= 1 && arma <= 10) return 'pistola'
  if (arma >= 101 && arma < 200) return 'smg'
  if (arma >= 201 && arma < 300) return 'pesada'
  if (SNIPERS.has(arma)) return 'sniper'
  if (arma >= 301 && arma < 400) return 'rifle'
  if (arma >= 501 && arma < 600) return 'granada'
  if (arma === 405) return 'cuchillo'
  return 'otra'
}
