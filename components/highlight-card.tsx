import type { Highlight } from '@/lib/mockData'
import { highlightTypeColors } from '@/lib/mockData'

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
          {matchLabel ?? '—'} · R{highlight.round}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-foreground">
        {highlight.description}
      </p>
      {highlight.clipUrl ? (
        <a
          href={highlight.clipUrl}
          target="_blank"
          rel="noreferrer"
          className="w-fit rounded border border-primary/40 px-2 py-1 text-[12px] font-medium text-primary transition-colors hover:bg-primary/10"
        >
          Ver clip
        </a>
      ) : null}
    </div>
  )
}
