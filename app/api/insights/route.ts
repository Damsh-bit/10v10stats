import { NextResponse } from 'next/server'
import { getLiveData } from '@/lib/api'
import { generateInsights } from '@/lib/insights'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await getLiveData()
    const insights = generateInsights(data)
    return NextResponse.json({ insights })
  } catch (error) {
    console.error('Error generating insights:', error)
    return NextResponse.json({ insights: [] }, { status: 500 })
  }
}
