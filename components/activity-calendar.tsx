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

/** Day-of-week row labels (Mon = row 0 … Sun = row 6). */
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

/** Show label only for Mon / Wed / Fri to avoid crowding. */
const VISIBLE_ROWS = new Set([0, 2, 4])

const LEGEND_LEVELS = [0, 1, 2, 3, 5]

const CELL = 12   // px — cell size
const GAP  = 3    // px — gap between cells

export function ActivityCalendar({ matchesByDate, selectedDate, onSelectDate }: Props) {
  const { grid, monthLabels } = useMemo(() => buildCalendarGrid(matchesByDate), [matchesByDate])
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const handleCellClick = (dateKey: string) => {
    onSelectDate(selectedDate === dateKey ? null : dateKey)
  }

  const totalWeeks = grid.length

  return (
    <section
      className="rounded-lg border border-border bg-card p-4 flex flex-col h-full"
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

      {/* Calendar grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {/*
          Layout:
            • Column 0  → day labels (Mon/Wed/Fri)
            • Columns 1…N → one column per week
          Rows:
            • Row 0    → month label header
            • Rows 1–7 → Mon … Sun
        */}
        <div
          className="grid"
          style={{
            gridTemplateColumns: `28px repeat(${totalWeeks}, ${CELL}px)`,
            gridTemplateRows: `14px repeat(7, ${CELL}px)`,
            columnGap: `${GAP}px`,
            rowGap: `${GAP}px`,
          }}
        >
          {/* Top-left empty corner */}
          <div />

          {/* Month labels — row 0, cols 1…N */}
          {monthLabels.map((label, col) => (
            <div
              key={`month-${col}`}
              className="relative overflow-visible"
              style={{ gridColumn: col + 2, gridRow: 1 }}
            >
              {label ? (
                <span className="absolute left-0 top-0 whitespace-nowrap text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
              ) : null}
            </div>
          ))}

          {/* Day labels — col 0, rows 1–7 */}
          {DAY_LABELS.map((label, row) => (
            <div
              key={`day-${row}`}
              className="flex items-center justify-end pr-1"
              style={{
                gridColumn: 1,
                gridRow: row + 2,
                height: CELL,
              }}
            >
              {VISIBLE_ROWS.has(row) ? (
                <span className="text-[9px] text-muted-foreground font-medium">
                  {label}
                </span>
              ) : null}
            </div>
          ))}

          {/* Cells — col 1…N × row 1–7 */}
          {grid.map((column, col) =>
            column.map((cell, row) => {
              const gridCol = col + 2
              const gridRow = row + 2

              if (!cell) {
                return (
                  <div
                    key={`${col}-${row}`}
                    style={{
                      gridColumn: gridCol,
                      gridRow: gridRow,
                      width: CELL,
                      height: CELL,
                    }}
                    aria-hidden="true"
                  />
                )
              }

              const isSelected = selectedDate === cell.dateKey
              const bg = getLevelColor(cell.count)

              return (
                <button
                  key={`${col}-${row}`}
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
                    gridColumn: gridCol,
                    gridRow: gridRow,
                    width: CELL,
                    height: CELL,
                    borderRadius: '2px',
                    backgroundColor: bg,
                    outline: isSelected ? '2px solid #f7fafc' : 'none',
                    outlineOffset: '1px',
                  }}
                />
              )
            }),
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip ? (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-md bg-card border border-border px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-lg"
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
            <span className="font-medium text-foreground">{formatCalendarFilterLabel(selectedDate)}</span>
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
