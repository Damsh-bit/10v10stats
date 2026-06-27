import type { LiveData, PlayerStats } from '@/lib/mockData'

export type RecordType = 
  | 'most_wins' 
  | 'most_losses'
  | 'max_kills' 
  | 'min_kills'
  | 'max_deaths' 
  | 'min_deaths'
  | 'max_assists'
  | 'max_damage'
  | 'min_damage'

export type PlayerRecordMap = Record<string, RecordType[]>

export function getPlayerRecords(data: LiveData, stats: PlayerStats[]): PlayerRecordMap {
  const map: PlayerRecordMap = {}

  // Helper to add a record to a player
  const addRecord = (playerId: string, record: RecordType) => {
    if (!playerId) return
    if (!map[playerId]) map[playerId] = []
    if (!map[playerId].includes(record)) {
      map[playerId].push(record)
    }
  }

  // 1. Historic records from stats
  if (stats.length > 0) {
    const mostWins = Math.max(...stats.map(s => s.wins))
    const mostLosses = Math.max(...stats.map(s => s.losses))
    
    stats.forEach(s => {
      if (s.wins === mostWins && mostWins > 0) addRecord(s.player.id, 'most_wins')
      if (s.losses === mostLosses && mostLosses > 0) addRecord(s.player.id, 'most_losses')
    })
  }

  // 2. Per-match records
  let maxKills = -1, minKills = Infinity
  let maxDeaths = -1, minDeaths = Infinity
  let maxAssists = -1
  let maxDamage = -1, minDamage = Infinity

  // Find the absolute min/max values
  const excludedPlayerNames = ['sergio vergara']
  const excludedPlayerIds = data.players.filter(p => excludedPlayerNames.includes(p.name.toLowerCase())).map(p => p.id)

  data.matches.forEach(m => {
    m.players.forEach(p => {
      if (excludedPlayerIds.includes(p.playerId)) return

      if (p.kills > maxKills) maxKills = p.kills
      if (p.kills < minKills) minKills = p.kills
      
      if (p.deaths > maxDeaths) maxDeaths = p.deaths
      if (p.deaths < minDeaths) minDeaths = p.deaths
      
      if (p.assists > maxAssists) maxAssists = p.assists
      
      if (p.damage > maxDamage) maxDamage = p.damage
      if (p.damage < minDamage) minDamage = p.damage
    })
  })

  // Assign the badges to whoever matches these records
  data.matches.forEach(m => {
    m.players.forEach(p => {
      if (excludedPlayerIds.includes(p.playerId)) return

      if (p.kills === maxKills && maxKills > -1) addRecord(p.playerId, 'max_kills')
      if (p.kills === minKills && minKills !== Infinity) addRecord(p.playerId, 'min_kills')
      
      if (p.deaths === maxDeaths && maxDeaths > -1) addRecord(p.playerId, 'max_deaths')
      if (p.deaths === minDeaths && minDeaths !== Infinity) addRecord(p.playerId, 'min_deaths')
      
      if (p.assists === maxAssists && maxAssists > -1) addRecord(p.playerId, 'max_assists')
      
      if (p.damage === maxDamage && maxDamage > -1) addRecord(p.playerId, 'max_damage')
      if (p.damage === minDamage && minDamage !== Infinity) addRecord(p.playerId, 'min_damage')
    })
  })

  return map
}
