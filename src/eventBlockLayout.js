// A class's block on the planning grid, laid out as the iOS app does
// (EventBlock): its height is the class's length, so it tries the title on
// two lines then one, with the room and the teacher stacked, on one row
// parted by a hairline, or the room alone, and keeps the first that fits.
// Pure arithmetic over measured text widths, see
// tests/eventBlockLayout.test.js.

// `regular`: a class of two hours or more in the day view; `compact`: a
// shorter one, and every class of a view of several days (two, the week).
export const BLOCK_VARIANTS = {
  regular: {
    padding: 13, barWidth: 6, barInset: 13, barToInfo: 14, titleToMeta: 3, metaToDivider: 5,
    symbolBox: 20, tightPadding: 4, radius: 21, titleSize: 17, titleLine: 20, metaSize: 14, symbolSize: 14, minHeight: 28,
  },
  compact: {
    padding: 8, barWidth: 4, barInset: 12, barToInfo: 8, titleToMeta: 2, metaToDivider: 4,
    symbolBox: 16, tightPadding: 3, radius: 14, titleSize: 15, titleLine: 18, metaSize: 13, symbolSize: 13, minHeight: 24,
  },
}

// A label keeps at least this much on a shared row before the row stacks.
const MIN_ROW_LABEL = 44
// A label shows when it keeps this much (or all of it, if shorter).
const MIN_LABEL = 30
const SYMBOL_GAP = 2
// Under this text width (a week's column on a small screen), a word or two
// a line: the title may take a third line where the block has the height.
const NARROW_INFO = 80

// A regular block's full height: the class's block at the top of its sheet.
export const FULL_BLOCK_HEIGHT = 89

// `dayCount`: the days side by side on the page.
export function chooseBlockVariant({ dayCount = 1, durationMs }) {
  return dayCount > 1 || durationMs < 2 * 60 * 60 * 1000 ? 'compact' : 'regular'
}

// `titleLines(width)`: how many lines the title takes at that width;
// `roomWidth` / `teacherWidth`: their labels' natural widths (0 when the
// class has none); `stackFirst`: try the room over the teacher before the
// shared row, as regular blocks do (a week's narrow columns, where the row
// would cut the room short).
export function layoutEventBlock({ width, height, variant = 'regular', titleLines, roomWidth = 0, teacherWidth = 0, stackFirst = false }) {
  const design = BLOCK_VARIANTS[variant]
  const infoX = design.padding + design.barWidth + design.barToInfo
  const infoWidth = Math.max(0, width - infoX - design.padding)
  const linesNeeded = Math.max(1, Math.min(infoWidth < NARROW_INFO ? 3 : 2, titleLines(infoWidth)))

  const labelRoom = infoWidth - design.symbolBox - SYMBOL_GAP
  const hasRoom = roomWidth > 0 && labelRoom >= Math.min(roomWidth, MIN_LABEL)
  const hasTeacher = teacherWidth > 0 && labelRoom >= Math.min(teacherWidth, MIN_LABEL)
  const rowGroup = design.symbolBox + SYMBOL_GAP + MIN_ROW_LABEL
  const dividerRoom = 2 * design.metaToDivider + 1

  let metas = [null]
  if (hasRoom && hasTeacher) {
    const rowFits = 2 * rowGroup + dividerRoom <= infoWidth
    metas = (variant === 'regular' || stackFirst ? ['stacked', 'row'] : ['row', 'stacked'])
      .filter((meta) => meta !== 'row' || rowFits)
      .concat('roomOnly')
  } else if (hasRoom || hasTeacher) {
    metas = ['row']
  }

  const contentHeight = (lines, meta) => lines * design.titleLine
    + (meta ? design.titleToMeta + (meta === 'stacked' ? 2 : 1) * design.symbolBox : 0)
  const candidates = []
  for (let lines = linesNeeded; lines >= 1; lines -= 1) {
    for (const meta of metas) {
      if (meta === 'roomOnly' && lines !== 1) continue
      candidates.push({ lines, meta })
    }
  }
  candidates.push({ lines: 1, meta: null })
  const room = height - 2 * design.tightPadding
  const chosen = candidates.find(({ lines, meta }) => contentHeight(lines, meta) <= room) ?? candidates.at(-1)
  const content = contentHeight(chosen.lines, chosen.meta)

  const paddingTop = Math.max(0, Math.min(design.padding, Math.floor((height - content) / 2)))
  const barY = Math.max(paddingTop, Math.min(design.barInset, Math.floor(height / 4)))
  const showRoom = chosen.meta === 'roomOnly' || (chosen.meta !== null && hasRoom)
  const showTeacher = chosen.meta !== null && chosen.meta !== 'roomOnly' && hasTeacher

  // On a shared row the room keeps its width unless the teacher would drop
  // under its minimum; the teacher takes what's left.
  let roomGroupWidth = null
  if (chosen.meta === 'row' && showRoom && showTeacher) {
    const roomGroup = design.symbolBox + SYMBOL_GAP + roomWidth
    const teacherGroup = design.symbolBox + SYMBOL_GAP + teacherWidth
    roomGroupWidth = Math.min(roomGroup, Math.max(rowGroup, infoWidth - dividerRoom - teacherGroup), infoWidth - dividerRoom - rowGroup)
  }

  return {
    design,
    infoX,
    infoWidth,
    paddingTop,
    titleLines: chosen.lines,
    meta: chosen.meta,
    showRoom,
    showTeacher,
    roomGroupWidth,
    bar: { x: design.padding, y: barY, width: design.barWidth, height: Math.max(0, height - 2 * barY) },
    radius: Math.min(design.radius, Math.floor(height / 3)),
  }
}
