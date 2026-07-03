import { headers } from 'next/headers'
import { getVideoEmbed } from '@/lib/videoEmbed'

export async function VideoEmbed({
  url,
  title = 'Highlight clip',
}: {
  url: string
  title?: string
}) {
  const headersList = await headers()
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host') ?? 'localhost'
  const embed = getVideoEmbed(url, { parentHost: host })

  if (!embed) return null

  if (embed.kind === 'video') {
    // Hack to force first frame to show as poster in iOS/Safari/Chrome when preload="metadata"
    const srcWithTime = embed.src.includes('#t=') ? embed.src : `${embed.src}#t=0.001`

    return (
      <video
        src={srcWithTime}
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
