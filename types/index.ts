export type Player = {
  id: string
  name: string
  badge: string
  avatarColor: string
  photoUrl?: string
  nelsons: number
  fakes?: number
}

export type MatchPlayer = {
  playerId: string
  team: string
  kills: number
  deaths: number
  assists: number
  damage: number
  adr: number
  hsPct: number
  mvps: number
  won: boolean
  draw: boolean
  /** Participación de invitado: se muestra en el tabulador pero no suma estadísticas. */
  guest?: boolean
}

export type CSMap = string

export type Match = {
  id: string
  seasonId: number
  map: CSMap
  date: string
  ctScore: number
  tScore: number
  durationMin: number
  /** Participaciones que cuentan para las estadísticas. */
  players: MatchPlayer[]
  /** Invitados: solo para mostrar en el tabulador. */
  guests: MatchPlayer[]
  winnerTeam?: 'CT' | 'T' | 'EMPATE'
  totalRounds?: number
  fotoUrl?: string
  notes?: string
  teamAName?: string
  teamBName?: string
}

export type NelsonTrend = 'up' | 'down' | 'same'

export type NelsonEntry = {
  rank: number
  id: string
  name: string
  points: number
  trend: NelsonTrend
}

export type PlayerStats = {
  player: Player
  matches: number
  wins: number
  draws: number
  losses: number
  kills: number
  deaths: number
  assists: number
  damage: number
  adm: number
  kda: number
  mvps: number
  hsPct: number
  positiveGames: number
  negativeGames: number
  trend?: 'up' | 'down' | 'same' | 'new'
  currentStreak: number
  currentLossStreak: number
}

export type LiveData = {
  players: Player[]
  matches: Match[]
  nelsonLeague: NelsonEntry[]
}
