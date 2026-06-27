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
  hs_pct: number
}

type OcrResponse = {
  players: OcrPlayer[]
}

function parseJson(text: string): OcrResponse {
  const clean = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean) as Partial<OcrResponse>

  return {
    players: Array.isArray(parsed.players)
      ? parsed.players.map((player) => ({
        raw_name: typeof player.raw_name === 'string' ? player.raw_name : '',
        team: player.team === 'T' ? 'T' : 'CT',
        kills: typeof player.kills === 'number' ? player.kills : 0,
        deaths: typeof player.deaths === 'number' ? player.deaths : 0,
        assists: typeof player.assists === 'number' ? player.assists : 0,
        damage: typeof player.damage === 'number' ? player.damage : 0,
        hs_pct: typeof player.hs_pct === 'number' ? player.hs_pct : 0,
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

    const prompt = `Analiza esta captura de pantalla del scoreboard de una partida de Counter-Strike 2 (CS2).

Extrae ÚNICAMENTE las estadísticas de cada jugador visible en la imagen. Devuelve SOLO un JSON válido, sin texto adicional.

Schema del JSON:
{
  "players": [
    {
      "raw_name": "nombre exacto del jugador tal como aparece",
      "team": "CT" o "T",
      "kills": número,
      "deaths": número,
      "assists": número,
      "damage": número (ADR o daño total),
      "hs_pct": número (porcentaje de headshots, sin el símbolo %. Si dice 45% ponés 45)
    }
  ]
}

Instrucciones importantes:
- Extrae hasta 10 jugadores (5 por equipo).
- El equipo CT suele aparecer arriba en el scoreboard. El equipo T abajo.
- El KDA (kills/deaths/assists) suele estar en columnas separadas.
- El HS% puede aparecer como "HS%" o un porcentaje con el símbolo %.
- El daño puede aparecer como "ADR" (Average Damage per Round) o "DMG".
- Si un valor no es legible, usa 0.
- NO incluyas texto fuera del JSON.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
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
      throw new Error(result?.error?.message || 'Anthropic devolvio un error')
    }

    const text = result?.content?.[0]?.text ?? ''
    const parsed = parseJson(text)

    return NextResponse.json(parsed)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'No se pudo procesar la imagen' }, { status: 500 })
  }
}
