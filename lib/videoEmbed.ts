export type VideoEmbedKind = 'iframe' | 'video'

export type VideoEmbed = {
  kind: VideoEmbedKind
  src: string
}

const DIRECT_VIDEO_PATTERN = /\.(mp4|webm|ogg|mov)(\?.*)?$/i

export function getYouTubeVideoIdFromUrl(rawUrl: string): string | null {
  try {
    return getYouTubeVideoId(new URL(rawUrl.trim()))
  } catch {
    return null
  }
}

function getYouTubeVideoId(url: URL): string | null {
  if (url.hostname === 'youtu.be') {
    return url.pathname.slice(1).split('/')[0] || null
  }

  if (!url.hostname.includes('youtube.com')) return null

  if (url.pathname.startsWith('/embed/')) {
    return url.pathname.split('/')[2] || null
  }

  if (url.pathname.startsWith('/shorts/')) {
    return url.pathname.split('/')[2] || null
  }

  return url.searchParams.get('v')
}

function getTwitchClipSlug(url: URL): string | null {
  if (url.hostname === 'clips.twitch.tv') {
    return url.pathname.slice(1).split('/')[0] || null
  }

  if (url.hostname.includes('twitch.tv') && url.pathname.includes('/clip/')) {
    return url.pathname.split('/clip/')[1]?.split('/')[0] || null
  }

  return null
}

function getMedalClipId(url: URL): string | null {
  if (!url.hostname.includes('medal.tv')) return null

  const parts = url.pathname.split('/').filter(Boolean)
  return parts.at(-1) || null
}

function getStreamableId(url: URL): string | null {
  if (!url.hostname.includes('streamable.com')) return null

  if (url.pathname.startsWith('/e/')) {
    return url.pathname.split('/')[2] || null
  }

  return url.pathname.slice(1).split('/')[0] || null
}

export function getVideoEmbed(
  rawUrl: string,
  options?: { parentHost?: string },
): VideoEmbed | null {
  const trimmed = rawUrl.trim()
  if (!trimmed) return null

  if (DIRECT_VIDEO_PATTERN.test(trimmed)) {
    return { kind: 'video', src: trimmed }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return null
  }

  const youtubeId = getYouTubeVideoId(url)
  if (youtubeId) {
    return {
      kind: 'iframe',
      src: `https://www.youtube.com/embed/${youtubeId}`,
    }
  }

  const twitchClip = getTwitchClipSlug(url)
  if (twitchClip) {
    const parent = options?.parentHost ?? 'localhost'
    return {
      kind: 'iframe',
      src: `https://clips.twitch.tv/embed?clip=${twitchClip}&parent=${parent}`,
    }
  }

  const medalClipId = getMedalClipId(url)
  if (medalClipId) {
    return {
      kind: 'iframe',
      src: `https://medal.tv/embed/${medalClipId}`,
    }
  }

  const streamableId = getStreamableId(url)
  if (streamableId) {
    return {
      kind: 'iframe',
      src: `https://streamable.com/e/${streamableId}`,
    }
  }

  if (url.pathname.includes('/embed/')) {
    return { kind: 'iframe', src: trimmed }
  }

  return { kind: 'video', src: trimmed }
}
