import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase'

const HIGHLIGHTS_BUCKET = process.env.SUPABASE_HIGHLIGHTS_BUCKET ?? 'highlights'
const MAX_VIDEO_BYTES = 10 * 1024 * 1024 * 1024
const ALLOWED_TYPES = new Set(['ACE', 'QUAD_KILL', 'TRIPLE_KILL', 'CLUTCH', 'ENTRY_FRAG', 'KNIFE_KILL', 'OTHER'])
const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
])

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.-]+/g, '_').slice(0, 120)
}

function buildStoragePath(playerId: string, fileName: string) {
  const safeName = sanitizeFileName(fileName)
  return `${playerId}/${Date.now()}-${safeName}`
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const playerId = String(formData.get('player_id') ?? '').trim()
    const videoFile = formData.get('video')
    const typeRaw = String(formData.get('type') ?? 'OTHER').trim()
    const descriptionRaw = formData.get('description')
    const roundNumberRaw = formData.get('round_number')

    if (!playerId) {
      return NextResponse.json({ error: 'Debes seleccionar un jugador' }, { status: 400 })
    }

    if (!(videoFile instanceof File) || videoFile.size === 0) {
      return NextResponse.json({ error: 'Debes subir un archivo de video' }, { status: 400 })
    }

    if (videoFile.size > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: 'El video no puede superar los 10 GB' }, { status: 400 })
    }

    if (!ALLOWED_VIDEO_TYPES.has(videoFile.type)) {
      return NextResponse.json(
        { error: 'Formato no soportado. Usa MP4, WEBM o MOV.' },
        { status: 400 },
      )
    }

    const normalizedType = typeRaw.trim().toUpperCase()
    const type = ALLOWED_TYPES.has(normalizedType) ? normalizedType : 'OTHER'
    const description =
      typeof descriptionRaw === 'string' ? descriptionRaw.trim() || null : null
    const roundNumber =
      typeof roundNumberRaw === 'string' && roundNumberRaw.trim() !== ''
        ? Number(roundNumberRaw)
        : null

    if (roundNumber !== null && !Number.isFinite(roundNumber)) {
      return NextResponse.json({ error: 'La ronda debe ser un número válido' }, { status: 400 })
    }

    const supabase = getSupabaseAdminClient()
    if (!supabase) {
      return NextResponse.json(
        {
          error:
            'No se pudo inicializar el cliente de Supabase con permisos de servidor. Verifica SUPABASE_SERVICE_ROLE_KEY.',
        },
        { status: 500 },
      )
    }

    const storagePath = buildStoragePath(playerId, videoFile.name || 'clip.mp4')
    const fileBuffer = Buffer.from(await videoFile.arrayBuffer())

    const { error: uploadError } = await supabase.storage
      .from(HIGHLIGHTS_BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: videoFile.type,
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || 'No se pudo subir el video' },
        { status: 500 },
      )
    }

    const { data: publicUrlData } = supabase.storage.from(HIGHLIGHTS_BUCKET).getPublicUrl(storagePath)
    const clipUrl = publicUrlData.publicUrl

    const { data, error } = await supabase
      .from('highlights')
      .insert({
        player_id: playerId,
        clip_url: clipUrl,
        type,
        description,
        round_number: roundNumber,
      })
      .select('id')
      .single()

    if (error || !data?.id) {
      await supabase.storage.from(HIGHLIGHTS_BUCKET).remove([storagePath])
      return NextResponse.json({ error: error?.message || 'No se pudo guardar el highlight' }, { status: 500 })
    }

    return NextResponse.json({ success: true, highlightId: data.id, clipUrl })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'No se pudo guardar el highlight' },
      { status: 500 },
    )
  }
}
