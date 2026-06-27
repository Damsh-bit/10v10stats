import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const apiKey = process.env.GEMINI_API_KEY

export async function POST(request: Request) {
  try {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no está configurada.')
    }

    const { imageBase64, mediaType } = await request.json()

    if (!imageBase64 || !mediaType) {
      return NextResponse.json(
        { error: 'Faltan datos de la imagen.' },
        { status: 400 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `Analizá este scoreboard de CS2 10v10 y extraé SOLO los datos numéricos.
Respondé ÚNICAMENTE con JSON válido, sin markdown, sin backticks, sin texto extra.

{
  "match": {
    "score_team1": <antiterroristas score, top team>,
    "score_team2": <terroristas score, bottom team>,
    "total_rounds": <sum of both>
  },
  "team1": [{ "kills": n, "deaths": n, "assists": n, "hs_percent": n, "damage": n }],
  "team2": [{ "kills": n, "deaths": n, "assists": n, "hs_percent": n, "damage": n }]
}

- team1 = antiterroristas (top of scoreboard)
- team2 = terroristas (bottom of scoreboard)  
- hs_percent = headshot % column, number only (no % sign)
- damage = total damage column
- Include all visible players
- If a value is unreadable, use -1`

    const image = {
      inlineData: {
        data: imageBase64,
        mimeType: mediaType,
      },
    }

    const result = await model.generateContent([prompt, image])
    const textResponse = result.response.text()

    // Clean up potential markdown formatting from response
    let cleanText = textResponse.trim()
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.substring(7)
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.substring(3)
    }
    if (cleanText.endsWith('```')) {
      cleanText = cleanText.substring(0, cleanText.length - 3)
    }
    cleanText = cleanText.trim()

    const parsedJson = JSON.parse(cleanText)

    return NextResponse.json(parsedJson)
  } catch (error) {
    console.error('Error in screenshot parser:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al procesar la imagen' },
      { status: 500 }
    )
  }
}
