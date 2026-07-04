export type Player = {
  id: string
  name: string
  badge: string
  avatarColor: string
  photoUrl?: string
  nelsons: number
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
}

export type HighlightType = 'ACE' | 'QUAD_KILL' | 'TRIPLE_KILL' | 'CLUTCH' | 'ENTRY_FRAG' | 'KNIFE_KILL' | 'OTHER'

export type Highlight = {
  id: string
  playerId: string
  matchId?: string
  type: HighlightType
  description: string
  round: number
  clipUrl?: string
}

export type CSMap = string

export type Match = {
  id: string
  map: CSMap
  date: string
  ctScore: number
  tScore: number
  durationMin: number
  players: MatchPlayer[]
  winnerTeam?: 'CT' | 'T' | 'EMPATE'
  totalRounds?: number
  videoUrl?: string
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
  trend?: 'up' | 'down' | 'same'
  currentStreak: number
  currentLossStreak: number
}

export type LiveData = {
  players: Player[]
  matches: Match[]
  highlights: Highlight[]
  nelsonLeague: NelsonEntry[]
}
