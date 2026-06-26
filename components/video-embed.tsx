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
