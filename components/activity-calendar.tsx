'use client'

import { useMemo, useState } from 'react'
import {
  buildCalendarGrid,
  formatCalendarFilterLabel,
  formatCalendarTooltip,
  getLevelColor,
} from '@/lib/matches-calendar'

type Props = {
  matchesByDate: Record<string, number>
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
}

const DAY_LABELS = [
  { row: 0, label: 'Mon' },
  { row: 2, label: 'Wed' },
  { row: 4, label: 'Fri' },
]

const LEGEND_LEVELS = [0, 1, 2, 3, 5]

export function ActivityCalendar({ matchesByDate, selectedDate, onSelectDate }: Props) {
  const { grid, monthLabels } = useMemo(() => buildCalendarGrid(matchesByDate), [matchesByDate])
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const handleCellClick = (dateKey: string) => {
    onSelectDate(selectedDate === dateKey ? null : dateKey)
  }

  return (
    <section className="mb-6 rounded-lg border border-border bg-card p-4">
      <div className="mb-3">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
          Match activity
        </h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Last 52 weeks of matches played
        </p>
      </div>

      <div className="w-full overflow-x-auto pb-1">
        <div className="inline-flex min-w-max items-start gap-2">
          <div
            className="grid shrink-0 text-[10px] text-muted-foreground"
            style={{
              gridTemplateRows: 'repeat(7, 13px)',
              rowGap: '3px',
              paddingTop: '18px',
            }}
          >
            {Array.from({ length: 7 }, (_, row) => (
              <div
                key={row}
                className="flex items-center justify-end pr-1"
                style={{ height: '13px' }}
              >
                {DAY_LABELS.find((entry) => entry.row === row)?.label ?? ''}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-1">
            <div
              className="grid"
              style={{
                gridTemplateColumns: 'repeat(52, 13px)',
                gap: '3px',
                height: '15px',
              }}
            >
              {monthLabels.map((label, col) => (
                <div key={col} className="relative">
                  {label ? (
                    <span className="absolute left-0 top-0 whitespace-nowrap text-[10px] text-muted-foreground">
                      {label}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="relative">
              <div
                className="grid"
                style={{
                  gridTemplateColumns: 'repeat(52, 13px)',
                  gridTemplateRows: 'repeat(7, 13px)',
                  gap: '3px',
                }}
              >
                {grid.map((column, col) =>
                  column.map((cell, row) => {
                    if (!cell) {
                      return (
                        <div
                          key={`${col}-${row}`}
                          style={{ width: '13px', height: '13px' }}
                          aria-hidden="true"
                        />
                      )
                    }

                    const isSelected = selectedDate === cell.dateKey

                    return (
                      <button
                        key={`${col}-${row}`}
                        type="button"
                        aria-label={formatCalendarTooltip(cell.date, cell.count)}
                        onClick={() => handleCellClick(cell.dateKey)}
                        onMouseEnter={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect()
                          setTooltip({
                            text: formatCalendarTooltip(cell.date, cell.count),
                            x: rect.left + rect.width / 2,
                            y: rect.top,
                          })
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        className="cursor-pointer transition-[outline,transform] hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                        style={{
                          width: '13px',
                          height: '13px',
                          borderRadius: '2px',
                          backgroundColor: getLevelColor(cell.count),
                          outline: isSelected ? '2px solid #f0f6fc' : 'none',
                          outlineOffset: '1px',
                        }}
                      />
                    )
                  }),
                )}
              </div>

              {tooltip ? (
                <div
                  className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-md bg-[#24292f] px-2.5 py-1.5 text-[11px] font-medium text-white shadow-lg"
                  style={{ left: tooltip.x, top: tooltip.y }}
                >
                  {tooltip.text}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-[11px] text-muted-foreground">
        <span>Less</span>
        <div className="flex items-center gap-[3px]">
          {LEGEND_LEVELS.map((level) => (
            <span
              key={level}
              style={{
                width: '13px',
                height: '13px',
                borderRadius: '2px',
                backgroundColor: getLevelColor(level),
              }}
            />
          ))}
        </div>
        <span>More</span>
      </div>

      {selectedDate ? (
        <div className="mt-3 flex items-center gap-2 text-[12px] text-muted-foreground">
          <span>
            Filtering by:{' '}
            <span className="font-medium text-foreground">{formatCalendarFilterLabel(selectedDate)}</span>
          </span>
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className="rounded border border-border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-accent"
            aria-label="Clear date filter"
          >
            ✕
          </button>
        </div>
      ) : null}
    </section>
  )
}
