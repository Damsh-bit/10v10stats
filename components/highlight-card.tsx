import type { Highlight } from '@/lib/mockData'
import { highlightTypeColors } from '@/lib/mockData'
import { VideoEmbed } from '@/components/video-embed'

export function HighlightCard({
  highlight,
  className,
  matchLabel,
}: {
  highlight: Highlight
  className?: string
  matchLabel?: string
}) {
  const color = highlightTypeColors[highlight.type]
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border border-border bg-card p-3 ${className ?? ''}`}
    >
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-background"
          style={{ backgroundColor: color }}
        >
          {highlight.type}
        </span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {matchLabel || 'Sin info'} · R{highlight.round || 0}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-foreground">
        {highlight.description || 'Sin descripción'}
      </p>
      {highlight.clipUrl ? (
        <div className="overflow-hidden rounded-md border border-border/60">
          <VideoEmbed url={highlight.clipUrl} title={highlight.description || highlight.type} />
        </div>
      ) : null}
    </div>
  )
}
