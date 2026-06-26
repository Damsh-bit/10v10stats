import { NextResponse } from 'next/server'
import { getSupabaseAdminClient, getSupabaseClient } from '@/lib/supabase'

const TABULADOR_BUCKET = process.env.SUPABASE_TABULADOR_BUCKET ?? 'tabulador'
const MAX_PHOTO_BYTES = 5 * 1024 * 1024
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])

function sanitizeFileName(name: string) {
  return name.replace(/[^\w.-]+/g, '_').slice(0, 120)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  try {
    const contentType = request.headers.get('content-type') ?? ''
    let name = ''
    let password = ''
    let photoUrl = ''
    let photoFile: File | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      name = formData.get('name') as string
      password = formData.get('password') as string
      photoUrl = formData.get('photoUrl') as string
      const file = formData.get('photoFile')
      if (file instanceof File && file.size > 0) {
        photoFile = file
      }
    } else {
      const body = await request.json()
      name = body.name
      password = body.password
      photoUrl = body.photoUrl
    }

    if (password !== 'alzhannah2026') {
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient() ?? getSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Database client not available' }, { status: 500 })
    }

    if (photoFile) {
      if (photoFile.size > MAX_PHOTO_BYTES) {
        return NextResponse.json({ error: 'La imagen no puede superar los 5 MB' }, { status: 400 })
      }
      if (!ALLOWED_IMAGE_TYPES.has(photoFile.type)) {
        return NextResponse.json({ error: 'Formato no soportado. Usa PNG, JPG, WEBP o GIF.' }, { status: 400 })
      }
      
      const storagePath = `players/${id}/${Date.now()}-${sanitizeFileName(photoFile.name || 'foto.png')}`
      const fileBuffer = Buffer.from(await photoFile.arrayBuffer())

      const { error: uploadError } = await supabase.storage.from(TABULADOR_BUCKET).upload(storagePath, fileBuffer, {
        contentType: photoFile.type,
        upsert: false,
      })

      if (uploadError) {
        console.error('Supabase upload error:', uploadError)
        return NextResponse.json({ error: `Error subiendo la imagen: ${uploadError.message}` }, { status: 500 })
      }

      const { data: publicUrlData } = supabase.storage.from(TABULADOR_BUCKET).getPublicUrl(storagePath)
      photoUrl = publicUrlData.publicUrl
    }

    const { error } = await supabase
      .from('players')
      .update({ 
        name: name, 
        photo_url: photoUrl || null 
      })
      .eq('id', id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true, photoUrl })
  } catch (err) {
    console.error('Error updating player:', err)
    return NextResponse.json({ error: 'Failed to update player' }, { status: 500 })
  }
}
