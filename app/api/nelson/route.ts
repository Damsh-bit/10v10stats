import { NextResponse } from 'next/server'
import { finishNelsonVote, getNelsonData, startNelsonVote, voteForNelson } from '@/lib/nelson'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getNelsonData()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo cargar la Nelson League' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { action?: string; password?: string; voterPlayerId?: string; voteForPlayerId?: string }

    if (body.action === 'start') {
      const result = await startNelsonVote(body.password ?? '')
      return NextResponse.json(result)
    }

    if (body.action === 'vote') {
      const result = await voteForNelson({ voterPlayerId: body.voterPlayerId ?? '', voteForPlayerId: body.voteForPlayerId ?? '' })
      return NextResponse.json(result)
    }

    if (body.action === 'finish') {
      const result = await finishNelsonVote(body.password ?? '')
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo procesar la votación' }, { status: 500 })
  }
}
