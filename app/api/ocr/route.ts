import { NextResponse } from 'next/server'

type OcrRequestBody = {
  imageBase64: string
  mimeType?: string
}

type OcrPlayer = {
  raw_name: string
  team: 'CT' | 'T'
  kills: number
  deaths: number
  assists: number
  damage: number
}

type OcrResponse = {
  map: string
  score_ct: number
  score_t: number
  winner_team: 'CT' | 'T'
  players: OcrPlayer[]
}

function parseJson(text: string): OcrResponse {
  const clean = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean) as Partial<OcrResponse>

  return {
    map: typeof parsed.map === 'string' ? parsed.map : '',
    score_ct: typeof parsed.score_ct === 'number' ? parsed.score_ct : 0,
    score_t: typeof parsed.score_t === 'number' ? parsed.score_t : 0,
    winner_team: parsed.winner_team === 'T' ? 'T' : 'CT',
    players: Array.isArray(parsed.players)
      ? parsed.players.map((player) => ({
          raw_name: typeof player.raw_name === 'string' ? player.raw_name : '',
          team: player.team === 'T' ? 'T' : 'CT',
          kills: typeof player.kills === 'number' ? player.kills : 0,
          deaths: typeof player.deaths === 'number' ? player.deaths : 0,
          assists: typeof player.assists === 'number' ? player.assists : 0,
          damage: typeof player.damage === 'number' ? player.damage : 0,
        }))
      : [],
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OcrRequestBody
    const imageBase64 = body?.imageBase64
    const mimeType = body?.mimeType ?? 'image/png'

    if (!imageBase64) {
      return NextResponse.json({ error: 'Falta la imagen' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'No hay API key de Anthropic configurada' }, { status: 500 })
    }

    const prompt = `Extrae esta información de la captura de la partida de CS2 y devuelve SOLO JSON válido con este esquema:
{
  "map": "string",
  "score_ct": 0,
  "score_t": 0,
  "winner_team": "CT" | "T",
  "players": [{"raw_name": "string", "team": "CT" | "T", "kills": 0, "deaths": 0, "assists": 0, "damage": 0}]
}

Instrucciones:
- Usa el nombre del mapa si está visible.
- Determina el ganador a partir del score.
- Extrae la lista de jugadores visible en la imagen, hasta 10 jugadores. Si no está claro, usa texto plausible y vacío.
- No agregues texto fuera del JSON.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1200,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      }),
    })

    const result = await response.json()
    if (!response.ok) {
      throw new Error(result?.error?.message || 'Anthropic devolvió un error')
    }

    const text = result?.content?.[0]?.text ?? ''
    const parsed = parseJson(text)

    return NextResponse.json(parsed)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo procesar la imagen' }, { status: 500 })
  }
}
