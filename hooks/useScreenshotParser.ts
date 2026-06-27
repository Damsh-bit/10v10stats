import { useState } from 'react'

export type PlayerStats = {
  kills: number
  deaths: number
  assists: number
  hs_percent: number
  damage: number
}

export type ParsedMatch = {
  match: {
    score_team1: number
    score_team2: number
    total_rounds: number
  }
  team1: PlayerStats[]
  team2: PlayerStats[]
}

export function useScreenshotParser() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parseScreenshot = async (file: File): Promise<ParsedMatch | null> => {
    setLoading(true)
    setError(null)

    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const base64Data = (reader.result as string).split(',')[1]
          resolve(base64Data)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const response = await fetch('/api/parse-screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageBase64: base64String,
          mediaType: file.type,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al procesar la captura')
      }

      return data as ParsedMatch
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, parseScreenshot }
}
