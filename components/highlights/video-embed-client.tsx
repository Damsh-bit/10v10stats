'use client'

import { getVideoEmbed } from '@/lib/videoEmbed'

/**
 * Client-safe version of VideoEmbed.
 * Uses window.location.hostname for Twitch's `parent` param instead of next/headers.
 * Suitable for use inside 'use client' components.
 */
export function VideoEmbedClient({
  url,
  title = 'Highlight clip',
}: {
  url: string
  title?: string
}) {
  // Resolve parent host client-side (needed for Twitch embed)
  const parentHost =
    typeof window !== 'undefined' ? window.location.hostname : 'localhost'

  const embed = getVideoEmbed(url, { parentHost })

  if (!embed) return null

  if (embed.kind === 'video') {
    return (
      <video
        src={embed.src}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full rounded-md bg-black object-contain"
      >
        <track kind="captions" />
      </video>
    )
  }

  return (
    <iframe
      src={embed.src}
      title={title}
      className="aspect-video w-full rounded-md bg-black"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowFullScreen
    />
  )
}
