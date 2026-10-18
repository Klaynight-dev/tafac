// The planning page's ruler, as the iOS app draws it (HourGridView,
// DayPage): fixed hours from 06:00 to 22:00, 58px an hour, a 50px column
// of hour labels, and the classes laid in their day's column, overlapping
// ones side by side. Pure, see tests/planningGrid.test.js.
import { placeEventColumns } from './eventColumns.js'
import { BLOCK_VARIANTS, chooseBlockVariant } from './eventBlockLayout.js'
import { parseDayKey } from './planningDates.js'

export const FIRST_HOUR = 6
export const LAST_HOUR = 22
export const HOUR_PITCH = 58
// The labels' line box, centred on their line: 06:00 sits 5px down.
const LABEL_BOX = 10
export const GRID_HEIGHT = (LAST_HOUR - FIRST_HOUR) * HOUR_PITCH + LABEL_BOX
export const LABEL_COLUMN = 50
export const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, index) => FIRST_HOUR + index)
// Between classes sharing a row; the trailing edge keeps the paper's hairline.
const COLUMN_GAP = 4
const EDGE_INSET = 1
const HOUR_MS = 60 * 60 * 1000

// The y of an hour of the day (fractional for minutes).
export function yForHour(hour) {
  return LABEL_BOX / 2 + (hour - FIRST_HOUR) * HOUR_PITCH
}

export function yForTime(ms, dayKey) {
  return yForHour((ms - parseDayKey(dayKey).getTime()) / HOUR_MS)
}

// A day column's place: the width right of the labels, shared equally.
export function dayColumn(width, dayIndex, dayCount) {
  const share = Math.max(0, width - LABEL_COLUMN) / dayCount
  return { x: LABEL_COLUMN + share * dayIndex, width: share }
}

// The blocks of one day's classes: each one cut to the grid's hours (left
// out when it falls outside), its variant, and its frame in the page.
// `weekBlocks`: drawn as the week's whatever the days shown (a wide
// screen's day view, so a class looks the same in its day and its week).
export function layoutDayBlocks(events, { dayKey, dayIndex, dayCount, width, weekBlocks = false }) {
  const dayStart = parseDayKey(dayKey).getTime()
  const gridStart = dayStart + FIRST_HOUR * HOUR_MS
  const gridEnd = dayStart + LAST_HOUR * HOUR_MS
  const visible = events
    .filter((event) => event.end > gridStart && event.start < gridEnd)
    .map((event) => ({ event, start: Math.max(event.start, gridStart), end: Math.min(Math.max(event.end, event.start), gridEnd) }))
  const columns = placeEventColumns(visible)
  const column = dayColumn(width, dayIndex, dayCount)
  const laneX = column.x + (dayIndex >= 1 ? EDGE_INSET : 0)
  const laneWidth = column.width - EDGE_INSET - (dayIndex >= 1 ? EDGE_INSET : 0)

  return visible.map((slot) => {
    const { column: index, count } = columns.get(slot)
    const variant = weekBlocks ? 'compact' : chooseBlockVariant({ dayCount, durationMs: slot.event.end - slot.event.start })
    const blockWidth = (laneWidth - COLUMN_GAP * (count - 1)) / count
    const top = yForTime(slot.start, dayKey)
    const bottom = yForTime(slot.end, dayKey)
    return {
      event: slot.event,
      variant,
      // A week's narrow columns: the room over the teacher when it fits.
      stackFirst: weekBlocks || dayCount > 2,
      x: Math.round(laneX + (blockWidth + COLUMN_GAP) * index),
      y: Math.round(top),
      width: Math.floor(blockWidth),
      height: Math.round(Math.max(bottom - top, BLOCK_VARIANTS[variant].minHeight)),
    }
  })
}
