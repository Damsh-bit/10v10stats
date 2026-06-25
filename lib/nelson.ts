import { promises as fs } from 'fs'
import path from 'path'
import { getPlayersFromSupabase, getSupabaseClient } from '@/lib/supabase'
import type { NelsonEntry, NelsonTrend } from '@/lib/mockData'

type NelsonPlayer = {
  id: string
  name: string
  nelsonPoints: number
  badge?: string | null
}

type NelsonVoteState = {
  active: boolean
  startedAt: string | null
  startedBy: string | null
  voteId: string | null
  voters: Record<string, string>
  voteCounts: Record<string, number>
  winnerPlayerId: string | null
  winnerName: string | null
  closedAt: string | null
}

type NelsonStoreData = {
  players: Record<string, NelsonPlayer>
  state: NelsonVoteState
  lastUpdatedAt: string | null
}

const DATA_DIR = path.join(process.cwd(), 'data')
const DATA_FILE = path.join(DATA_DIR, 'nelson.json')
const ADMIN_PASSWORD = 'admin'

function createInitialState(): NelsonVoteState {
  return {
    active: false,
    startedAt: null,
    startedBy: null,
    voteId: null,
    voters: {},
    voteCounts: {},
    winnerPlayerId: null,
    winnerName: null,
    closedAt: null,
  }
}

function createEmptyStore(players: NelsonPlayer[]): NelsonStoreData {
  const playerMap = Object.fromEntries(players.map((player) => [player.id, player]))

  return {
    players: playerMap,
    state: createInitialState(),
    lastUpdatedAt: null,
  }
}

function normalizeName(value: unknown, fallback = 'Sin info') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function normalizeBadgePoints(value: unknown): number {
  if (typeof value !== 'string') return 0

  const trimmed = value.trim()
  if (!trimmed) return 0

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as { nelson_points?: unknown }
      if (typeof parsed.nelson_points === 'number' && Number.isFinite(parsed.nelson_points)) {
        return parsed.nelson_points
      }
    } catch {
      // ignore malformed badge payload
    }
  }

  const match = trimmed.match(/nelson\s*[:#-]?\s*(\d+)/i)
  if (match?.[1]) {
    return Number(match[1])
  }

  const digits = trimmed.replace(/\D/g, '')
  if (!digits) return 0

  const parsed = Number(digits)
  return Number.isFinite(parsed) ? parsed : 0
}

function buildBadgeValue(points: number) {
  return points > 0 ? `Nelson ${points}` : 'Nelson'
}

async function ensureStoreFile() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  try {
    await fs.access(DATA_FILE)
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(createEmptyStore([]), null, 2), 'utf8')
  }
}

async function readStore(players: NelsonPlayer[]): Promise<NelsonStoreData> {
  await ensureStoreFile()

  const content = await fs.readFile(DATA_FILE, 'utf8')
  const parsed = JSON.parse(content) as Partial<NelsonStoreData>

  const normalizedPlayers = players.reduce<Record<string, NelsonPlayer>>((acc, player) => {
    acc[player.id] = {
      ...player,
      nelsonPoints: parsed.players?.[player.id]?.nelsonPoints ?? player.nelsonPoints ?? 0,
    }
    return acc
  }, {})

  const existingState = parsed.state ?? createInitialState()
  const voteCounts = Object.fromEntries(players.map((player) => [player.id, existingState.voteCounts?.[player.id] ?? 0]))

  return {
    players: normalizedPlayers,
    state: {
      ...createInitialState(),
      ...existingState,
      voters: existingState.voters ?? {},
      voteCounts,
    },
    lastUpdatedAt: parsed.lastUpdatedAt ?? null,
  }
}

async function writeStore(store: NelsonStoreData) {
  await ensureStoreFile()
  await fs.writeFile(DATA_FILE, JSON.stringify({ ...store, lastUpdatedAt: new Date().toISOString() }, null, 2), 'utf8')
}

async function syncPlayerPoints(playerId: string, points: number) {
  const supabase = getSupabaseClient()
  if (!supabase) return

  try {
    await supabase.from('players').update({ badge: buildBadgeValue(points) }).eq('id', playerId)
  } catch {
    // ignore sync errors and keep local state
  }
}

function mapSupabasePlayers(rows: Awaited<ReturnType<typeof getPlayersFromSupabase>>): NelsonPlayer[] {
  return rows.map((player) => ({
    id: normalizeName(player.id, 'sin-id'),
    name: normalizeName(player.name, 'Sin info'),
    nelsonPoints: normalizeBadgePoints(player.badge),
    badge: player.badge ?? null,
  }))
}

export async function getNelsonPlayers() {
  const rows = await getPlayersFromSupabase()
  return mapSupabasePlayers(rows)
}

export async function getNelsonData() {
  const players = await getNelsonPlayers()
  const store = await readStore(players)

  const orderedPlayers = players.map((player) => ({
    ...player,
    nelsonPoints: store.players[player.id]?.nelsonPoints ?? 0,
  }))

  const league = orderedPlayers
    .map((player) => ({
      rank: 0,
      name: player.name,
      points: player.nelsonPoints,
      trend: 'same' as NelsonTrend,
    }))
    .sort((left, right) => right.points - left.points || left.name.localeCompare(right.name))
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  return {
    players: orderedPlayers,
    league,
    voteState: store.state,
    adminPasswordConfigured: true,
  }
}

export async function startNelsonVote(password: string) {
  const expectedPassword = ADMIN_PASSWORD
  if (password !== expectedPassword) {
    throw new Error('Contraseña incorrecta')
  }

  const players = await getNelsonPlayers()
  const store = await readStore(players)

  const voteId = crypto.randomUUID()
  store.state = {
    active: true,
    startedAt: new Date().toISOString(),
    startedBy: 'admin',
    voteId,
    voters: {},
    voteCounts: Object.fromEntries(players.map((player) => [player.id, 0])),
    winnerPlayerId: null,
    winnerName: null,
    closedAt: null,
  }

  await writeStore(store)

  return {
    success: true,
    voteState: store.state,
  }
}

export async function voteForNelson(options: { voterKey: string; voteForPlayerId: string }) {
  const { voterKey, voteForPlayerId } = options

  if (!voterKey || !voteForPlayerId) {
    throw new Error('Faltan datos para la votación')
  }

  const players = await getNelsonPlayers()
  const store = await readStore(players)

  if (!store.state.active) {
    throw new Error('La votación no está activa')
  }

  if (store.state.voters[voterKey]) {
    throw new Error('Ya participaste en esta votación')
  }

  const target = players.find((player) => player.id === voteForPlayerId)
  if (!target) {
    throw new Error('Jugador no encontrado')
  }

  store.state.voters[voterKey] = voteForPlayerId
  store.state.voteCounts[voteForPlayerId] = (store.state.voteCounts[voteForPlayerId] ?? 0) + 1
  await writeStore(store)

  return {
    success: true,
    voteState: store.state,
  }
}

export async function finishNelsonVote(password: string) {
  const expectedPassword = ADMIN_PASSWORD
  if (password !== expectedPassword) {
    throw new Error('Contraseña incorrecta')
  }

  const players = await getNelsonPlayers()
  const store = await readStore(players)

  if (!store.state.active) {
    throw new Error('No hay una votación activa')
  }

  const rankedPlayers = players
    .map((player) => ({
      ...player,
      votes: store.state.voteCounts[player.id] ?? 0,
      points: store.players[player.id]?.nelsonPoints ?? 0,
    }))
    .sort((left, right) => right.votes - left.votes || right.points - left.points || left.name.localeCompare(right.name))

  const winner = rankedPlayers[0]
  if (!winner) {
    throw new Error('No hay votos para procesar')
  }

  store.players[winner.id] = {
    ...store.players[winner.id],
    ...winner,
    nelsonPoints: (store.players[winner.id]?.nelsonPoints ?? 0) + 1,
  }

  store.state.active = false
  store.state.closedAt = new Date().toISOString()
  store.state.winnerPlayerId = winner.id
  store.state.winnerName = winner.name

  await syncPlayerPoints(winner.id, store.players[winner.id].nelsonPoints)
  await writeStore(store)

  return {
    success: true,
    winner: {
      id: winner.id,
      name: winner.name,
      nelsonPoints: store.players[winner.id].nelsonPoints,
    },
    voteState: store.state,
  }
}
