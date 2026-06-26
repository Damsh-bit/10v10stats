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

/** Single-letter day headers Mon→Sun */
const DAY_HEADERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const LEGEND_LEVELS = [0, 1, 2, 3, 5]

const CELL = 12  // px
const GAP  = 3   // px

export function ActivityCalendar({ matchesByDate, selectedDate, onSelectDate }: Props) {
  const { grid, monthLabels } = useMemo(() => buildCalendarGrid(matchesByDate), [matchesByDate])
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const handleCellClick = (dateKey: string) => {
    onSelectDate(selectedDate === dateKey ? null : dateKey)
  }

  return (
    <section
      className="rounded-lg border border-border bg-card p-4 flex flex-col"
      aria-label="Actividad de partidas — últimos 6 meses"
    >
      {/* Header */}
      <div className="mb-3">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
          Actividad
        </h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug">
          Últimos 6 meses
        </p>
      </div>

      {/* Calendar — vertical layout:
           Column 0  → month label (or empty)
           Columns 1–7 → Mon…Sun cells
           Row 0     → day-letter headers
           Rows 1…N  → one row per week                              */}
      <div className="overflow-y-auto">
        {/* Day-of-week header row */}
        <div
          className="mb-[3px]"
          style={{
            display: 'grid',
            gridTemplateColumns: `22px repeat(7, ${CELL}px)`,
            gap: GAP,
          }}
        >
          <div /> {/* empty — month label column */}
          {DAY_HEADERS.map((d) => (
            <span
              key={d}
              className="text-center text-[9px] font-medium text-muted-foreground"
              style={{ lineHeight: `${CELL}px` }}
            >
              {d}
            </span>
          ))}
        </div>

        {/* One row per week */}
        {grid.map((week, weekIndex) => (
          <div
            key={weekIndex}
            style={{
              display: 'grid',
              gridTemplateColumns: `22px repeat(7, ${CELL}px)`,
              gap: GAP,
              marginBottom: GAP,
            }}
          >
            {/* Month label — only when the month changes */}
            <div
              className="flex items-center overflow-visible"
              style={{ height: CELL }}
            >
              {monthLabels[weekIndex] ? (
                <span className="whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {monthLabels[weekIndex]}
                </span>
              ) : null}
            </div>

            {/* 7 day cells for this week */}
            {week.map((cell, dayIndex) => {
              if (!cell) {
                return (
                  <div
                    key={dayIndex}
                    style={{ width: CELL, height: CELL }}
                    aria-hidden="true"
                  />
                )
              }

              const isSelected = selectedDate === cell.dateKey

              return (
                <button
                  key={dayIndex}
                  type="button"
                  aria-label={formatCalendarTooltip(cell.date, cell.count)}
                  aria-pressed={isSelected}
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
                  className="cursor-pointer transition-transform hover:scale-125 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: '2px',
                    backgroundColor: getLevelColor(cell.count),
                    outline: isSelected ? '2px solid #f7fafc' : 'none',
                    outlineOffset: '1px',
                  }}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      ) : null}

      {/* Legend */}
      <div className="mt-3 flex items-center justify-between gap-1 text-[10px] text-muted-foreground">
        <span>Menos</span>
        <div className="flex items-center gap-[3px]">
          {LEGEND_LEVELS.map((level) => (
            <span
              key={level}
              style={{
                display: 'inline-block',
                width: CELL,
                height: CELL,
                borderRadius: '2px',
                backgroundColor: getLevelColor(level),
              }}
            />
          ))}
        </div>
        <span>Más</span>
      </div>

      {/* Active filter pill */}
      {selectedDate ? (
        <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">
            Filtrando:{' '}
            <span className="font-medium text-foreground">
              {formatCalendarFilterLabel(selectedDate)}
            </span>
          </span>
          <button
            type="button"
            onClick={() => onSelectDate(null)}
            className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-accent"
            aria-label="Quitar filtro de fecha"
          >
            ✕
          </button>
        </div>
      ) : null}
    </section>
  )
}
